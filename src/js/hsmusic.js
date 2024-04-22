var logger
if (!window.isWebApp) {
  const log = require('electron-log')
  logger = log.scope('hsmusic')
}

function getKebabCase(name) {
  return name

    // Spaces to dashes
    .split(' ')
    .join('-')

    // Punctuation as words
    .replace(/&/g, '-and-')
    .replace(/\+/g, '-plus-')
    .replace(/%/g, '-percent-')

    // Punctuation which only divides words, not single characters
    .replace(/(\b[^\s-.]{2,})\./g, '$1-')
    .replace(/\.([^\s-.]{2,})\b/g, '-$1')

    // Punctuation which doesn't divide a number following a non-number
    .replace(/(?<=[0-9])\^/g, '-')
    .replace(/\^(?![0-9])/g, '-')

    // General punctuation which always separates surrounding words
    .replace(/[/@#$%*()_=,[\]{}|\\;:<>?`~]/g, '-')

    // Accented characters
    .replace(/[áâäàå]/gi, 'a')
    .replace(/[çč]/gi, 'c')
    .replace(/[éêëè]/gi, 'e')
    .replace(/[íîïì]/gi, 'i')
    .replace(/[óôöò]/gi, 'o')
    .replace(/[úûüù]/gi, 'u')

    // Strip other characters
    .replace(/[^a-z0-9-]/gi, '')

    // Combine consecutive dashes
    .replace(/-{2,}/g, '-')

    // Trim dashes on boundaries
    .replace(/^-+|-+$/g, '')

    // Always lowercase
    .toLowerCase();
}

function decomposeContribString(contribstring, default_role) {
  const split_contrib = /(?<who>.+) \((?<what>.+)\)/.exec(contribstring)
  if (split_contrib) {
    const {who, what} = split_contrib.groups
    return {
      who,
      what
    }
  } else {
    return {
      who: contribstring,
      what: (default_role || null)
    }
  }
}

function mapContribString(set, default_role) {
  return set?.map(cs => decomposeContribString(cs, default_role))
}

function thingByName(thing_reg, name) {
  const matches = Object.values(thing_reg)
    .filter(thing => thing.def["Always Reference By Directory"] !== true)
    .filter(thing => thing.name == name)

  if (matches.length == 1) return matches[0]
  else if (matches.length > 1) {
    // logger.warn("Multiple matches for reference", name, matches)
    return matches.filter(t => !t.def["Originally Released As"])[0]
  }
  else return undefined
}

function dateOrUndef(input) {
  const result = new Date(input)
  if (result instanceof Date && !isNaN(result)) {
    return result
  } else {
    return undefined
  }
}

class Thing {
  constructor(def) {
    this.def = def
  }

  get uhcLink() {
    if (this.index_name)
      return `/music/${this.index_name}/${this.directory}`
    else {
      throw Error("index_name not defined on object", this)
      // return undefined
    }
  }

  get directory() { return this.def['Directory'] || getKebabCase(this.name) }

  equals(other) {
    return (other) && (this.directory == other.directory)
  }

  // get timestamp() {
  //   if (this.date == undefined) {
  //     logger.warn("Can't get timestamp on dateless object", this)
  //     return Infinity
  //   }
  //   let datetime
  //   for (const fmtstr of ["MMMM d, yyyy", "MMMM d, yyyy TT", "MMMM d yyyy"]) {
  //     datetime = DateTime.fromFormat(this.date, fmtstr)
  //     if (datetime.invalid) continue
  //     else break
  //   }
  //   if (datetime.invalid) {
  //     logger.error(datetime.invalid)
  //   }
  //   return datetime.ts
  // }
}

class Artist extends Thing {
  constructor(def) {
    super(def)

    this.name = def['Artist']
    this.external_links = def['URLs']
  }
}
Artist.prototype.index_name = 'artist'

class Album extends Thing {
  constructor(def) {
    super(def.header)

    // this.header = def.header
    this.sections = def.sections

    this.name = def.header['Album']
    this.external_links = def.header['URLs']
    this.bonus = def.header['Additional Files']
  }

  get date() { return dateOrUndef(this.def['Date']) }

  get artist_contribs() { return mapContribString(this.def['Artists']) }
  get cover_artist_contribs() { return mapContribString(this.def['Cover Artists'], 'cover art') }
  get contributor_contribs() { return mapContribString(this.def['Contributors']) }

  get all_contributors() {
    return [
      ...(this.artist_contribs || []),
      ...(this.cover_artist_contribs || []),
      ...(this.contributor_contribs || [])
    ]
  }

  get trackdefs() { return Object.values(this.sections).flat() }

  get uses_sections() { return (Object.keys(this.sections).length > 1) }

  get artpath() {
    if (this.def['Cover Artists']) {
      // Track has art
      const extension = this.def['Cover Art File Extension'] || 'jpg'
      return `assets://archive/music/${this.directory}/cover.${extension}`
    } else {
      return undefined
    }
  }
}
Album.prototype.index_name = 'album'

class Track extends Thing {
  constructor(def, album) {
    super(def)
    this.album = album

    this.name = def['Track']
    this.duration = def['Duration']
    this.external_links = def['URLs']
    this.referenced_track_names = def['Referenced Tracks']
  }

  get date() { return (this.def['Date'] ? dateOrUndef(this.def['Date']) : this.album.date) }

  get artist_contribs() {
    return mapContribString(this.def['Artists']) ||
    this.album.artist_contribs
  }

  get cover_artist_contribs() {
    return mapContribString(this.def['Cover Artists'], 'cover art') ||
      this.album.cover_artist_contribs
  }

  get contributor_contribs() {
    return mapContribString(this.def['Contributors']) ||
      this.album.contributor_contribs
  }

  get all_contributors() {
    return [
      ...(this.artist_contribs || []),
      ...(this.cover_artist_contribs || []),
      ...(this.contributor_contribs || [])
    ]
  }
  // get artist_names() {
  //   return this.def['Artists'] || this.album.artist_names
  // }

  // get contributors() {
  //   if (this.def['Contributors'] == undefined) return undefined
  //   return this.def['Contributors']
  //     .map(decomposeContribString)
  // }

  get artpath() {
    if (this.def['Cover Artists']) {
      // Track has art
      // tracks call their own art cover art but albums call track art track art
      const extension = this.def['Cover Art File Extension'] || this.album['Track Art File Extension'] || 'jpg'
      return `assets://archive/music/${this.album.directory}/${this.directory}.${extension}`
    // } else if (this.album.def['Default Track Cover Artists']) {
    //   return `asset://archive/music/${this.album.directory}/${this.directory}.${this.album['Track Art File Extension']}`
    } else {
      return this.album.artpath
    }
  }
}
Track.prototype.index_name = 'track'

class Musicker {
  constructor(hsmusic, archive_music) {
    logger.info("Creating new musicker")

    this.hsmusic = hsmusic
    this.archive_music = archive_music

    this.all_artists = Object.fromEntries(
      this.hsmusic.artists
      .map(artistdef => new Artist(artistdef))
      .map(thing => [thing.directory, thing])
    )

    this.all_flashdefs = this.hsmusic.flashes

    const musicker = this

    class RichTrack extends Track {
      // constructor(def, album) {
      //   super(def, album)
      // }

      get commentary() { return musicker.processText(this.def['Commentary']) }

      get bandcampId() { return musicker.archive_music.tracks[this.directory]?.bandcampId }

      // get artists() {
      //   return this.artist_names?.map(name => thingByName(musicker.all_artists, name)) || []
      // }

    }

    class RichAlbum extends Album {
      // constructor(def) {
      //   super(def)
      // }

      get commentary() { return musicker.processText(this.def['Commentary']) }

      get tracks() { return this.trackdefs.map(trackdef => new RichTrack(trackdef, this)) }

      // get artists() {
      //   // if (this.artist_names?.length > 0) {
      //     return this.artist_names?.map(name => thingByName(musicker.all_artists, name))
      //   // } else {
      //   //   return [...new Set(this.tracks.map(track => track.artists).flat())]
      //   // }
      // }

      get artpath() {
        // Broken for albums like mobius trip with old jpg art
        const archive_dir = this.directory?.toLowerCase() // Needed for colours
        if (Object.keys(archive_music.albums).includes(archive_dir)) {
          return `assets://archive/music/${archive_dir}/cover.jpg`
        } else {
          return super.artpath
        }
      }

      get track_sections() {
        return Object.fromEntries(
          Object.entries(this.sections)
          .filter(([section_name, trackdef_list]) => (
            !(section_name == "Unsorted" && trackdef_list.length == 0))
          )
          .map(([section_name, trackdef_list]) => [
            section_name,
            trackdef_list.map(trackdef => new RichTrack(trackdef, this))
          ])
        )
      }
    }

    this.all_albums = Object.fromEntries(
      this.hsmusic.albums
      .map(albumdef => new RichAlbum(albumdef))
      .map(thing => [thing.directory, thing])
    )

    this.all_tracks = Object.fromEntries(
      Object.values(this.all_albums)
      .map(album => album.trackdefs
        .map(trackdef => new RichTrack(trackdef, album))
      )
      .flat()
      .map(thing => [thing.directory, thing])
    )

    this.test()
  }

  getArtistByName(name) {
    const result = thingByName(this.all_artists, name)
    if (result == undefined) {
      logger.error("Failed to lookup artist by name", name)
    }
    return result
  }

  thingFromReference(reference) {
    // FIXME: Implement properly
    // [
    //   'artist', 'flash-act',
    //   'album',  'flash',
    //   'track',  null,
    //   'media',  'group',
    //   'static'
    // ]

    const matchers = {
      'artist': (ref => this.all_artists[ref]),
      'track': (ref => this.all_tracks[ref]),
      'album': (ref => this.all_albums[ref])
    }

    const match_kind = /(?<kind>.+):(?<ref_name>.+)/.exec(reference)
    if (match_kind != undefined) {
      const {kind, ref_name} = match_kind.groups
      const matcher = matchers[kind]
      if (matcher == undefined) {
        logger.error("No matcher defined for kind:", kind)
      }
      const result = matcher(ref_name)
      if (result != undefined) { return result }
    } else {
      return thingByName(this.all_tracks, reference)
    }

    throw Error(`Could not resolve reference ${reference}`)
  }

  processText(raw_text) {
    if (raw_text == undefined) return undefined

    // Process links
    raw_text = raw_text
      .replace(
        /\[\[(?<reference>[^|\]]+?)\|(?<label>[^\]]+?)\]\]/g,
        (match, p1, p2, groups) => {
          const [reference, label] = [p1, p2]
          try {
            const thing = this.thingFromReference(reference)
            return `<a href='${thing.uhcLink}'>${label}</a>`
          } catch (e) {
            logger.warn("Could not resolve thingFromReference", reference, e)
            return label
          }
        }
      )
      .replace(
        /\[\[(?<track>[^|\]]+?)\]\]/g,
        (match, p1, groups) => {
          const [track] = [p1]
          try {
            const thing = this.thingFromReference(track)
            return `<a href='${thing.uhcLink}'>${thing.name}</a>`
          } catch (e) {
            logger.warn("Could not resolve thingFromReference", track, e)
            return track
          }
        }
      )
      .replace(
        /\[(?<label>[^\]]+?)\]\((?<href>[^)]+?)\)/g,
        (match, p1, p2, groups) => {
          const [label, href] = [p1, p2]
          return `<a href='${href}'>${label}</a>`
        }
      )
      .replace(
        /\\(.)/g,
        (match, p1, groups) => {
          console.log("Unescaped", p1)
          return p1
        }
      )
      .replace(
        'src="media/misc/thanksforplaying.jpg"',
        'src="assets://archive/social/news/thanksforplaying.jpg"'
      )

    // Strip "original art" junk
    raw_text = raw_text
      .replace(/<i>Homestuck:<\/i> \(original track art\)(.|\n)+?>/g, '<!-- $1 -->')

    return raw_text
  }

  getAlbumBySlug(album_slug) {
    return this.all_albums[album_slug]
  }

  getTrackBySlug(track_slug) {
    return this.all_tracks[track_slug]
  }

  getArtistBySlug(artist_slug) {
    return this.all_artists[artist_slug]
  }

  tracksInPage(viz_page) {
    // FIXME: Optimize
    const all_flashdefs = Object.values(this.hsmusic.flashes).flat()

    const flashes_matching_page = all_flashdefs
      .filter(flashdef => flashdef['Page'] == viz_page)

    const featured_track_names = flashes_matching_page
      .map(flashdef => flashdef['Featured Tracks'])
      .flat()

    const track_list = Object.values(this.all_tracks)
      .filter(track => featured_track_names.includes(track.name))

    return track_list
  }

  async test() {
    logger.info("Running tests")

    let tests_passed = 0
    let tests_failed = 0

    const expectMap = async (lib, fn) => {
      for (const query in lib) {
        const expected = lib[query]
        const result = await Promise.resolve(fn(query))
        if (JSON.stringify(result) != JSON.stringify(expected)) {
          logger.error(
            fn, `test failed: for input`, query,
            `expected`, expected,
            `got`, result
          )
          tests_failed += 1
        } else {
          tests_passed += 1
        }
      }
    }

    // Art paths
    await expectMap({
      "overture-canon-edit": "assets://archive/music/act-7/cover.jpg", // Album fallback, extension fallback
      "null-vol8": "assets://archive/music/homestuck-vol-8/null-vol8.png", // Track with png extension
      "the-thirteenth-hour": "assets://archive/music/alternia/the-thirteenth-hour.jpg"
    }, (slug) => this.getTrackBySlug.bind(this)(slug).artpath)

    // Date
    await expectMap({
      "overture-canon-edit": new Date("April 13, 2016"), // Album fallback
    }, (slug) => this.getTrackBySlug.bind(this)(slug).date)

    // Duration
    await expectMap({
      "overture-canon-edit": "9:00"
    }, (slug) => this.getTrackBySlug.bind(this)(slug).duration)

    // Commentary exists
    await expectMap({
      "showdown": true,
      "overture-canon-edit": false
    }, (slug) => Boolean(this.getTrackBySlug.bind(this)(slug).commentary))

    // Check text processing
    // TODO: run later
    // Object.values(this.all_albums).map(album => album.commentary)
    // Object.values(this.all_tracks).map(track => track.commentary)

    // Music-in-flash count
    await expectMap({
      "1": 0, // No flash
      "980": 3, // Retrieve package
      "8127": 1 // Act 7
    }, (viz_num) => this.tracksInPage.bind(this)(viz_num).length)

    logger.info(`${tests_failed} failed, ${tests_passed} passed`)
  }
}

module.exports = {
  Musicker
}
