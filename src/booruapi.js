import AsyncComputed from 'vue-async-computed'

function pageIdSlug(pageId) {
  return pageId.replace('/', '-')
}

const options = {
  data: function() {
    return {
      taghost: "http://127.0.0.1:5000",
    }
  },
  plugins: [ AsyncComputed ],
  computed: {
    github_token() {
      return this.$localData.settings['githubToken']
    },
    is_authenticated() {
      return Boolean(this.booru_token)
    }
  },
  asyncComputed: {
    booru_token: {
      default: undefined,
      async get () {
        const gh_token = this.$localData.settings['githubToken']
        if (gh_token) {
          const resp = await fetch(`${this.taghost}/auth`, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({'gh_token': gh_token})
          })
          // this.$logger.info(await resp.text())
          return (await resp.json()).value
        } else {
          this.$logger.error("Can't attempt to get a booru_token without a gh_token")
          return undefined
        }
      }
    },
    is_admin: {
      default: false,
      async get () {
        if (!this.is_authenticated) return false

        const resp = await this.doAuthenticated(`${this.taghost}/admin/isadmin`)
        try {
          return (resp['status'] == "OK")
        } catch {
          return false
        }
      }
    }
  },
  methods: {
    tagify(tag) {
      tag = tag.trim().toLowerCase()
      tag = tag.replace(/ /g, '_')
      return tag
    },
    rangeStrToIds(rangeStr) {
      let ret = []
      rangeStr = rangeStr.replace(/[^0-9,-]/g, '')
      // ####-####, ####
      rangeStr.split(',').forEach(rangeGroup => {
          // ####-####
        let [start, end] = rangeGroup.split('-')
        if (!end) {
          // ####
          ret.push('6/' + start)
        } else {
          // [####, ####]
          for (let i = start; i <= end; i++) {
            ret.push('6/' + String(i).padStart(6, 0))
          }
        }
      })
      return ret
    },
    // Unauthenticated
    async getAllTags() {
      return await fetch(`${this.taghost}/tags/all`)
        .then(r => r.json())
    },
    async getPageTags(pageId) {
      return await fetch(`${this.taghost}/page/${pageIdSlug(pageId)}/tags`)
        .then(r => r.json())
    },
    async getPagesWithTag(tag) {
      return await fetch(`${this.taghost}/tags/${tag}/pages`)
        .then(r => r.json())
    },
    async getTagInfo(tag) {
      return await fetch(`${this.taghost}/tags/${tag}/info`)
        .then(r => r.json())
    },

    // Authenticated
    async doAuthenticated(endpoint) {
      if (!this.booru_token && this.github_token) {
        await this.$asyncComputed.booru_token.update()
      }
      const resp = await fetch(endpoint, {credentials: "include"})
      if (resp.status == 401) {
        // Try fast reauth
        await this.$asyncComputed.booru_token.update()
        const resp2 = await fetch(endpoint, {credentials: "include"})
        if (resp.status == 200)
          return await resp.json()
        else
          this.$logger.error(resp)
          this.$logger.error(await resp.json())
      } else if (resp.status == 200) {
        return await resp.json()
      } else if (resp.json) {
        this.$logger.error(resp)
        this.$logger.error(await resp.json())
      } else {
        this.$logger.error(resp)
      }
    },

    async doVoteForRange(pageRangeStr, tag) {
      const ours = await this.getOurTagsAll()
      await Promise.all(this.rangeStrToIds(pageRangeStr).map(pageId => {
        // this.$logger.info(`this.doVoteFor(${pageId}, ${tag})`)
        const pageslug = pageIdSlug(pageId)
        if (ours[pageslug] && ours[pageslug].includes(tag)) return null
        else return this.doVoteFor(pageId, tag)
      }))
    },
    async doVoteFor(pageId, tag) {
      return await this.doAuthenticated(`${this.taghost}/page/${pageIdSlug(pageId)}/vote/${tag}`)
    },
    async doRemoveVoteFor(pageId, tag) {
      return await this.doAuthenticated(`${this.taghost}/page/${pageIdSlug(pageId)}/unvote/${tag}`)
    },
    async getOurTagsOfPage(pageId) {
      return await this.doAuthenticated(`${this.taghost}/page/${pageIdSlug(pageId)}/own`)
    },
    async getOurTagsAll() {
      return await this.doAuthenticated(`${this.taghost}/tags/own`)
    },
    async doMakeSynonym(inferior, canonical) {
      return await this.doAuthenticated(`${this.taghost}/admin/add_synonym/${inferior}/of/${canonical}`)
    }
  }
}

export default {
  // name: 'BooruApi',
  getApi() {
    // Singleton
    const booru = window.booru || new Vue(options)
    window.booru = booru
    return booru
  }
}

/*

// Semantic

semantic = $vm0

Object.values(vm.$archive.mspa.story)
.filter(p => p.sem_participants?.length)
.forEach(p => {
  p.sem_participants.map(semantic.personToTag)
  .forEach(async tag => {
    console.log(tag, '6/'+p.pageId)
    await metadata.booru.doVoteFor('6/'+p.pageId, tag)
  })
})


// todo POVcam

ours = await window.booru.getOurTagsAll()

timelines = await (fetch('https://raw.githubusercontent.com/FlaringK/UHC-POV-Cam/master/timelines.json').then(r => r.json()))

tuples =
Object.keys(timelines.timelines).map(p => {
  const page = '6/' + p.padStart(6, '0')
  return timelines.timelines[p].map(t => {
    var person = timelines.peoplenames[t[0]]
    var group = timelines.groups[t[3]]
    return [
      {page, tag: booru.tagify(person.replace("'", ""))},
      // {page, tag: group.replace("'", "")}
    ]
  }).flat()
}).flat()

for (let i of tuples) {
  const pageslug = i.page.replace('/', '-')
  if (ours[pageslug] && ours[pageslug].includes(i.tag)) continue
  else await window.booru.doVoteFor(i.page, i.tag)
}

// TODO tag project

booru.doVoteForRange("003571-003582", "andrew_hussie")

*/