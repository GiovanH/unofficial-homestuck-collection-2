import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

const {ipcMain, ipcRenderer, dialog, app} = require('electron')
const sass = require('sass')

const Store = require('electron-store')
const store = new Store()

const log = require('electron-log')
const logger = log.scope('Mods')

const assetDir = store.has('localData.assetDir') ? store.get('localData.assetDir') : undefined
const modsDir = (assetDir ? path.join(assetDir, "mods") : undefined)
const modsAssetsRoot = "assets://mods/"

const imodsDir = (assetDir ? path.join(assetDir, "archive", "imods") : undefined)
const imodsAssetsRoot = "assets://archive/imods/"

var modChoices
var routes = undefined

const store_modlist_key = 'localData.settings.modListEnabled'
const store_devmode_key = 'localData.settings.devMode'

let win = null

function giveWindow(new_win) {
  win = new_win
  logger.info("Got window")
}

// Function exposed for SubSettingsModal, which directly writes to store
function getModStoreKey(mod_id, k){
  if (k) {return `mod.${mod_id}.${k}`}
  return `mod.${mod_id}`
}

function getAssetRoute(url) {
  // If the asset url `url` should be replaced by a mod file,
  // returns the path of the mod file. 
  // Otherwise, returns undefined.

  // Lazily bake routes as needed instead of a init hook
  if (routes == undefined) {
    logger.info("Baking routes lazily, triggered by", url)
    bakeRoutes()
  }

  console.assert(url.startsWith("assets://"), "mods", url)

  const file_route = routes[url]
  if (file_route) logger.debug(url, "to", file_route)
  return file_route
}

function getTreeRoutes(tree, parent=""){
  let routes = []
  for (const name in tree) {
    const dirent = tree[name]
    const subpath = (parent ? parent + "/" + name : name)
    if (dirent == true) {
      // Path points to a file of some sort
      routes.push(subpath)
    } else {
      // Recurse through subpaths
      routes = routes.concat(getTreeRoutes(dirent, subpath))
    }
  }
  return routes
}

var onModLoadFail;

function removeModsFromEnabledList(responsible_mods) {
  // Clear enabled mods
  const old_enabled_mods = getEnabledMods()
  const new_enabled_mods = old_enabled_mods.filter(x => !responsible_mods.includes(x)).filter(x => !x.startsWith("_"))
  logger.info("Changing modlist", old_enabled_mods, new_enabled_mods)

  // Fully reactive settings clobber
  if (ipcMain) {
    logger.info("Trying to change modlist from main")
    store.set(store_modlist_key, new_enabled_mods)
    if (win) {
      win.webContents.send('RELOAD_LOCALDATA')
    } else {
      logger.error("Don't have win!")
    }
  } else {
    logger.info("Changing modlist from vm")
    window.vm.$localData.settings["modListEnabled"] = new_enabled_mods
    logger.info(window.vm.$localData.settings["modListEnabled"])
    window.vm.$localData.VM.saveLocalStorage()
  }
}

if (ipcMain) {
  onModLoadFail = function (responsible_mods, e) {
    if (modsDir == undefined)
      return // Pre-setup, we're probably fine ignoring this.

    if (win) {
      win.webContents.send('MOD_LOAD_FAIL', responsible_mods, e)
    } else {
      logger.info("MAIN: Mod load failure with issues in", responsible_mods)
      logger.error(e)
      logger.error("Don't have win!")
      // This only happens if we can't even display the pretty traceback. Absolute fallback.
      dialog.showMessageBoxSync({
        type: 'error',
        title: 'Mod load error',
        message: `Something went wrong while loading mods ${responsible_mods}! These have been disabled for safety; you should remove them from the Active list and you may need to restart the application.\nCheck the console log for details`
      })
      removeModsFromEnabledList(responsible_mods)
    }
  }
} else {
  // We are in the renderer process.
  onModLoadFail = function (responsible_mods, e) {
    if (modsDir == undefined)
      return // Pre-setup, we're probably fine ignoring this.

    logger.info("RENDER: Mod load failure with modlist", responsible_mods)
    logger.error(e)

    window.doErrorRecover = () => {
      removeModsFromEnabledList(responsible_mods)
      // Have to invoke reload because we probably don't even have the VM at this point
      ipcRenderer.invoke('reload')
    }

    function sanitizeHTML(str) {
      var temp = document.createElement('div')
      temp.textContent = str
      return temp.innerHTML
    };

    document.body.innerHTML = `
    <style>
    div {
      background: #fff;
      color: #000;
    }
    div > * { max-width: 100% }
    div > div { padding: 1em; }
    p { font-family: sans-serif; }
    pre { white-space: pre-wrap; }
    </style>
    <div>
      <p style="-webkit-app-region: drag; background: #aaa;">Error</p>
      <div>
        <p>Something went wrong while loading mods <em>${responsible_mods}</em>! 
        These have been disabled for safety.</p>
        <pre>${sanitizeHTML(e)}</pre>
        <input type="button" value="Disable bad mods and Reload" onclick="doErrorRecover()" /><br />
        <p>For troubleshooting, save this error message or the <a href="${log.transports.file.getFile()}">log file</a></p><br />
        <p>Stacktrace:</p>
        <pre>${sanitizeHTML(e.stack)}</pre>
      </div>
    </div>`
  }
  ipcRenderer.on('MOD_LOAD_FAIL', (event, responsible_mods, e) => {
    onModLoadFail(responsible_mods, e)
  })
}

function bakeRoutes() {
  const enabled_mods = getEnabledMods()
  logger.info("Baking routes for", enabled_mods)
  let all_mod_routes = {}
  // Start with least-priority so they're overwritten
  getEnabledModsJs().reverse().forEach(js => {
    try {
      // Lower priority: Auto routes
      if (js.trees) {
        console.assert(!js._singlefile, js.title, "Single file mods cannot use treeroute!")
        
        for (const mod_tree in js.trees) {
          const asset_tree = js.trees[mod_tree] 

          console.assert(mod_tree.endsWith("/"), mod_tree, "Tree paths must be directories! (end with /)")
          console.assert(asset_tree.endsWith("/"), asset_tree, "Tree paths must be directories! (end with /)")
          console.assert(asset_tree.startsWith("assets://"), asset_tree, "Asset paths must be on the assets:// protocol!")

          const treeroutes = getTreeRoutes(crawlFileTree(path.join(js._mod_root_dir, mod_tree), true))
          treeroutes.forEach(route => {
            all_mod_routes[asset_tree + route] =
              new URL(path.posix.join(mod_tree, route), js._mod_root_url).href
          })
        }
      }
      
      // Higher priority: manual routes
      for (const key in js.routes || {}) {
        const local = new URL(js.routes[key], js._mod_root_url).href
        console.assert(!(js._singlefile && local.includes(js._mod_root_url)), js.title, "Single file mods cannot use local route!")
                
        all_mod_routes[key] = local
      }
    } catch (e) {
      logger.error(e)
    }
  })

  logger.debug(all_mod_routes)
  
  // Modify script-global `routes`
  routes = all_mod_routes
}

function doFullRouteCheck(){
  logger.debug("Doing full resources check (devMode on)")
  const enabled_mods = getEnabledMods()
  const Resources = require("@/resources.js")
  if (Resources.isReady()) {
    Object.keys(routes).forEach(url => {
      try {
        Resources.resolveURL(url)
      } catch (e) {
        logger.warn("Testing routes failed")
        logger.error(url, e)
        onModLoadFail(enabled_mods, e)
      }
    })
  } else {
    logger.warn("Resources uninitialized, can't check.")
  }
}

function getEnabledMods() {
  // Get modListEnabled from settings, even if vue is not loaded yet.
  const list = store.has(store_modlist_key) ? store.get(store_modlist_key) : []

  if (store.get('localData.settings.unpeachy'))
    list.push("_unpeachy")
  if (store.get('localData.settings.pxsTavros'))
    list.push("_pxsTavros")
  if (store.get('localData.settings.jsFlashes'))
    list.push("_replaybound")

  // Bolin must come before hqaudio in the stack so it loads after it.
  if (store.get('localData.settings.bolin'))
    list.push("_bolin")

  if (store.get('localData.settings.hqAudio'))
    list.push("_hqAudio")

  return list
}

function getEnabledModsJs() {
  try {
    return getEnabledMods().map((dir) => getModJs(dir))
  } catch (e) {
    logger.error("Couldn't load enabled mod js'", e)
    return []
  }
}

function crawlFileTree(root, recursive=false) {
  // Gives a object that represents the file tree, starting at root
  // Values are objects for directories or true for files that exist
  const dir = fs.opendirSync(root)
  let ret = {}
  let dirent
  // eslint-disable-next-line no-cond-assign
  while (dirent = dir.readSync()) {
    if (dirent.isDirectory()) {
      if (recursive) {
        const subpath = path.join(root, dirent.name)
        ret[dirent.name] = crawlFileTree(subpath, true)
      } else ret[dirent.name] = undefined // Is directory, but not doing a recursive scan
    } else {
      ret[dirent.name] = true
    }
  }
  dir.close()
  return ret
}

function buildApi(mod) {
  function readFileSyncLocal(local_path, method_name) {
    console.assert(!mod._singlefile, `Singlefile mods cannot use api.${method_name}`)
    console.assert(local_path.startsWith("./"), local_path, `${method_name} paths must be mod relative (./)`)
    console.assert(!local_path.includes("/.."), local_path, "You know what you did")

    // TODO probably unsafe
    return fs.readFileSync(path.join(mod._mod_root_dir, local_path), 'utf8')
  }

  let api = {
    store: {
      set: (k, v) => store.set(getModStoreKey(mod._id, k), v),
      get: (k, default_) => store.get(getModStoreKey(mod._id, k), default_),
      has: (k) => store.has(getModStoreKey(mod._id, k)),
      delete: (k) => store.delete(getModStoreKey(mod._id, k)),
      onDidChange: (k, cb) => store.onDidChange(getModStoreKey(mod._id, k), cb),
      clear: () => store.clear(getModStoreKey(mod._id, null))
    }, 
    readFile(asset_path) {
      let data = readFileSyncLocal(asset_path, "readJson")
      return data
    },
    readJson(asset_path) {
      return JSON.parse(readFileSyncLocal(asset_path, "readJson"))
    },
    readYaml(asset_path) {
      return yaml.safeLoad(readFileSyncLocal(asset_path, "readYaml"))
    } 
  }
  var logger
  Object.defineProperty(api, 'logger', {
    get: function() {
      if (logger) return logger
      logger = log.scope(mod._id)
      return logger
    }
  })
  return api
}

function getModJs(mod_dir, options={}) {
  // Tries to load a mod from a directory
  // If mod_dir/mod.js is not found, tries to load mod_dir.js as a single file
  // Errors passed to onModLoadFail and raised
  try {
    let modjs_path
    var mod

    // Global, but let us overwrite it for some cases
    let thisModsDir = modsDir
    let thisModsAssetRoot = modsAssetsRoot

    let use_webpack_require = false

    if (mod_dir.startsWith("_")) {
      // use_webpack_require = true
      thisModsDir = imodsDir
      thisModsAssetRoot = imodsAssetsRoot
    } 

    if (options.singlefile) {
      modjs_path = path.join(thisModsDir, mod_dir)
    } else {
      modjs_path = path.join(thisModsDir, mod_dir, "mod.js")
    }

    if (use_webpack_require) {
      console.log(modjs_path)
      mod = require(modjs_path)
    } else {
      if (__non_webpack_require__.cache[modjs_path])
        delete __non_webpack_require__.cache[modjs_path]
      mod = __non_webpack_require__(modjs_path)
    }

    mod._id = mod_dir
    mod._singlefile = options.singlefile
    mod._internal = mod_dir.startsWith("_")

    if (!options.singlefile) {
      mod._mod_root_dir = path.join(thisModsDir, mod._id)
      mod._mod_root_url = new URL(mod._id, thisModsAssetRoot).href + "/"
    }

    if (!options.liteload && (mod.computed != undefined)) {
      const api = buildApi(mod)
      Object.assign(mod, mod.computed(api))
    }

    // TODO: Do computed properties automatically require a reload?
    // eslint-disable-next-line no-prototype-builtins
    mod._needsreload = ['styles', 'vueHooks', 'themes',
     'browserPages', 'browserActions', 'browserToolbars'
    ].some(k => mod.hasOwnProperty(k))

    return mod
  } catch (e1) {
    // elaborate error checking w/ afllback
    const e1_is_notfound = (e1.code && e1.code == "MODULE_NOT_FOUND")
    if (options.singlefile) {
      if (e1_is_notfound) {
        // Tried singlefile, missing
        throw e1
      } else {
        // Singlefile found, other error
        logger.error("Singlefile found, other error 1")
        onModLoadFail([mod_dir], e1)
        throw e1
      }
    } else if (e1_is_notfound) {
      // Tried dir/mod.js, missing
      try {
        // Try to find singlefile
        options.singlefile = true
        return getModJs(mod_dir, options)
      } catch (e2) {
        const e2_is_notfound = (e2.code && e2.code == "MODULE_NOT_FOUND")
        if (e2_is_notfound) {
          // Singlefile not found either
          onModLoadFail([mod_dir], e1)
        } else {
          logger.error("Singlefile found, other error 2")
          onModLoadFail([mod_dir], e2)
        } 
        // finally
        throw e2
      }
    } else {
      // dir/mod.js found, other error
      onModLoadFail([mod_dir], e1)
      throw e1
    }
  }
}

const footnote_categories = ['story']

// Interface

function editArchive(archive) {
  const enabledModsJs = getEnabledModsJs()
  enabledModsJs.reverse().forEach((js) => {
    try {
      const editfn = js.edit
      if (editfn) {        
        logger.info(js._id, "editing archive")
        editfn(archive)
        console.assert(archive, js.title, "You blew it up! You nuked the archive!")
      
        // Sanity checks
        // let required_keys = ['mspa', 'social', 'news', 'music', 'comics', 'extras']
        // required_keys.forEach(key => {
        //   if (!archive[key]) throw new Error("Archive object missing required key", key)
        // })
      }
    } catch (e) {
      onModLoadFail([js._id], e)
    }
  })

  // Footnotes
  archive.footnotes = {}

  footnote_categories.forEach(category => {
    archive.footnotes[category] = []
  })

  enabledModsJs.reverse().forEach((js) => {
    try {
      if (js.footnotes) {
        if (typeof js.footnotes == "string") {
          console.assert(!js._singlefile, js.title, "Single file mods cannot use footnote files!")
          
          const json_path = path.join(
            js._mod_root_dir, 
            js.footnotes
          )

          logger.info(js.title, "Loading footnotes from file", json_path)
          const footObj = JSON.parse(
            fs.readFileSync(json_path, 'utf8')
          )
          mergeFootnotes(archive, footObj)
        } else if (Array.isArray(js.footnotes)) {
          logger.info(js.title, "Loading footnotes from object")
          mergeFootnotes(archive, js.footnotes)
        } else {
          throw new Error(js.title, `Incorrectly formatted mod. Expected string or array, got '${typeof jsfootnotes}'`)
        }
      }
    } catch (e) {
      onModLoadFail([js._id], e)
    }
  })
}

function mergeFootnotes(archive, footObj) {
  if (!Array.isArray(footObj)) {
    throw new Error(`Incorrectly formatted mod. Expected string or array, got '${typeof jsfootnotes}'`)
  }

  footObj.forEach(footnoteList => {
    const default_author = (footnoteList.author === undefined) ? "Undefined Author" : footnoteList.author 
    const default_class = footnoteList.class || undefined
    const default_ispreface = footnoteList.preface

    footnote_categories.forEach(category => {
      for (var page_num in footnoteList[category]) {
        if (!archive.footnotes[category][page_num]) archive.footnotes[category][page_num] = []

        footnoteList[category][page_num].forEach(note => {
          const new_note = {
            author: (note.author === null) ? null : (note.author || default_author),
            class: (note.class === null) ? null : (note.class || default_class),
            preface: note.preface || default_ispreface,
            content: note.content
          }

          archive.footnotes[category][page_num].push(new_note)
        })
      }
    })
  })
}

function getMainMixin(){
  // A mixin that injects on the main vue process.
  // Currently this just injects custom css

  return {
    mounted() {
      getEnabledModsJs().forEach(js => {
        const modstyles = js.styles || []
        if (!Array.isArray(modstyles)) {
          throw Error(`${js._id} styles object is not a list`)
        }
        modstyles.forEach((customstyle, i) => {
          const style_id = `style-${js._id}-${i}`
          
          var body
          if (customstyle.source) {
            console.assert(!customstyle.body, style_id, "Styles cannot set both source and body. Use multiple style objects.")
            body = sass.renderSync({
              file: path.resolve(js._mod_root_dir, customstyle.source),
              sourceComments: true
            }).css.toString()
          } else if (customstyle.body) {
            console.assert(!customstyle.source, style_id, "Styles cannot set both source and body. Use multiple style objects.")
            body = sass.renderSync({
              data: customstyle.body,
              sourceComments: true
            }).css.toString() || customstyle.body
          } else {
            console.assert(false, customstyle, "Styles must define some sort of body!")
          }

          this.stylesheets.push({
            id: style_id, body
          })
        })

        const modThemes = js.themes || []
        modThemes.forEach((theme, i) => {
          const theme_class = `theme-${js._id}-${i}`

          let body = fs.readFileSync(path.resolve(js._mod_root_dir, theme.source))
          body = sass.renderSync({
            data: `#app.${theme_class} {\n${body}\n}`,
            sourceComments: true
          }).css.toString()

          this.stylesheets.push({
            id: theme_class, body
          })
        })
      })
    }
  }
}

function getMixins(){
  // This is absolutely black magic

  const nop = () => undefined

  const enabledModsJs = getEnabledModsJs()

  var mixables = enabledModsJs.reverse()

  // Custom themes
  var newThemes = enabledModsJs.reverse().reduce((themes, js) => {
    if (!js.themes) return themes
    return themes.concat(js.themes.map((theme, i) => 
        ({text: theme.label, value: `theme-${js._id}-${i}`})
      ))
  }, [])
  if (newThemes) {
    mixables.push({
      vueHooks: [{
        matchName: "settings",
        data: {themes($super) {return $super.concat(newThemes)}}
      }]
    })
  }

  var newPages = enabledModsJs.reverse().reduce((pages, js) => {
    if (!js.browserPages) return pages
    return {...js.browserPages, ...pages}
  }, {})
  if (newPages) {
    var pageComponents = {}
    for (let k in newPages)
      pageComponents[k] = newPages[k].component

    mixables.push({
      vueHooks: [{
        matchName: "TabFrame",
        data: {modBrowserPages($super) {return {...newPages, ...$super}}},
        created(){
          this.$options.components = Object.assign(this.$options.components, pageComponents)
        }
      }]
    })
  }

  var newBrowserActions = enabledModsJs.reverse().reduce((actions, js) => {
    if (js.browserActions) {
      for (let k in js.browserActions) {
        const componentkey = `${js._id}-${k}`
        actions[componentkey] = js.browserActions[k]
      }
    }
    return actions
  }, {})
  if (newBrowserActions) {
    var actionComponents = {}
    for (let ck in newBrowserActions)
      actionComponents[ck] = newBrowserActions[ck].component

    mixables.push({
      vueHooks: [{
        matchName: "addressBar",
        // browserActions are raw components
        data: {browserActions($super) {return {...actionComponents, ...$super}}}
      }]
    })
  }

  var newBrowserToolbars = enabledModsJs.reverse().reduce((toolbars, js) => {
    if (js.browserToolbars) {
      for (let k in js.browserToolbars) {
        const componentkey = `${js._id}-${k}`
        toolbars[componentkey] = js.browserToolbars[k]
      }
    }
    return toolbars
  }, {})
  if (newBrowserToolbars) {
    var toolbarComponents = {}
    for (let ck in newBrowserToolbars)
      toolbarComponents[ck] = newBrowserToolbars[ck].component

    mixables.push({
      vueHooks: [{
        matchName: "tabBar",
        // browserToolbars are raw components
        data: {browserToolbars($super) {return {...toolbarComponents, ...$super}}}
      }]
    })
  }

  var mixins = mixables.map((js) => {
    const vueHooks = js.vueHooks || []
    if (vueHooks.length == 0) {
      return null
    }

    // Precompute as much as possible since mixins run everywhere
    vueHooks.forEach((hook) => {
      // Shorthand
      if (hook.matchName)
        hook.match = (c) => (c.$options.name == hook.matchName)
    })

    const mixin =  {
      created() {
        const vueComponent = this

        // Normally mixins are ignored on name collision
        // We need to do the opposite of that, so we hook `created`
        vueHooks.forEach((hook) => {          
          if (hook.match(this)) {
            // Literal created hook
            if (hook.created)
              hook.created.bind(this)()

            for (const dname in (hook.data || {})) {
              const value = hook.data[dname]
              this[dname] = (typeof value == "function" ? value.bind(this)(this[dname]) : value)
            }
            // Computed
            for (const cname in (hook.computed || {})) {
              // Precomputed super function
              const sup = (() => this._computedWatchers[cname].getter.call(this) || nop)
              Object.defineProperty(this, cname, {
                get: hook.computed[cname].bind(vueComponent, sup),
                configurable: true
              })
            }
            // Methods w/ optional super argument
            for (const mname in (hook.methods || {})) {
              const sup = this[mname] || nop
              const bound = hook.methods[mname].bind(vueComponent)
              this[mname] = function(){return bound(...arguments, sup)}
            }
          }
        })
      },
      updated() {
        vueHooks.forEach((hook) => {
          if (hook.updated && hook.match(this)) {
            hook.updated.bind(this)()
          }
        })
      },
      mounted() {
        vueHooks.forEach((hook) => {
          if (hook.mounted && hook.match(this)) {
            hook.mounted.bind(this)()
          }
        })
      }
    }

    return mixin
  }).filter(Boolean)

  return mixins
}

// Runtime
// Grey magic. This file can be run from either process, but only the main process will do file handling.
function jsToChoice(js, dir){
  return {
    label: js.title,
    summary: js.summary,
    description: js.description,
    author: js.author,
    modVersion: js.modVersion,
    locked: js.locked,

    hasmeta: Boolean(js.author || js.modVersion || js.settings || js.description),
    needsreload: js._needsreload,
    settingsmodel: js.settings,
    key: dir,

    includes: {
      routes: Boolean(js.routes || js.treeroute || js.trees),
      edits: Boolean(js.edit),
      hooks: (js.vueHooks ? js.vueHooks.map(h => (h.matchName || "[complex]")) : false),
      browserPages: js.browserPages ? Object.keys(js.browserPages) : false,
      toolbars: Boolean(js.browserToolbars),
      browserActions: Boolean(js.browserActions),
      styles: Boolean(js.styles),
      footnotes: Boolean(js.footnotes),
      themes: Boolean(js.themes)
    }
  }
}

if (ipcMain) {
  // We are in the main process.
  function loadModChoices(){
    // Get the list of mods players can choose to enable/disable
    var mod_folders
    try {
      const tree = crawlFileTree(modsDir, false)
      // .js file or folder of some sort
      mod_folders = Object.keys(tree).filter(p => /\.js$/.test(p) || tree[p] === undefined || logger.warn("Not a mod:", p))
    } catch (e) {
      // No mod folder at all. That's okay.
      logger.error(e)
      return []
    }

    var items = mod_folders.reduce((acc, dir) => {
      try {
        const js = getModJs(dir, {liteload: true})
        if (js.hidden === true)
          return acc // continue

        acc[dir] = jsToChoice(js, dir)
      } catch (e) {
        // Catch import-time mod-level errors
        logger.error("Couldn't load mod choice", e)
        // Can't fail here: haven't loaded enough main to even show a dialog.
        // onModLoadFail([dir], e)
      }
      return acc
    }, {})

    logger.info("Mod choices loaded")
    logger.debug(Object.keys(items))
    return items
  }

  if (modsDir) {
    modChoices = loadModChoices()
  } else {
    logger.warn("modsDir is not defined! First run?")
  }

  ipcMain.on('GET_AVAILABLE_MODS', (e) => {e.returnValue = modChoices})
  ipcMain.on('MODS_FORCE_RELOAD', (e) => {
    modChoices = loadModChoices()
    e.returnValue = true
  })
} else {
  // We are in the renderer process.
  logger.info("Requesting modlist from main")
  modChoices = ipcRenderer.sendSync('GET_AVAILABLE_MODS')
}

function getModChoices() {
  if (ipcMain) {
    return modChoices
  } else {
    return ipcRenderer.sendSync('GET_AVAILABLE_MODS')
  }
}

export default {
  getEnabledModsJs,  // probably shouldn't use
  getEnabledMods,
  getModChoices,
  getMixins,
  getMainMixin,
  editArchive,
  bakeRoutes,
  getAssetRoute,
  getModStoreKey,
  giveWindow,
  modChoices,

  doFullRouteCheck
}
