var logger
if (!window.isWebApp) {
  const log = require('electron-log')
  logger = log.scope('hsmusic')
}

import {marked} from 'marked';


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

const contribstring_regex = /(?<who>.+) \((?<what>.+)\)/
function decomposeContribString(contribstring, default_role) {
  const split_contrib = contribstring_regex.exec(contribstring)
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
  if (!set) return set
  return set.map(cs => decomposeContribString(cs, default_role))
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

function defineLazyPrototypeProperty(constructor, key, fn) {
  const cache = new WeakMap()

  Object.defineProperty(constructor.prototype, key, {
    get() {
      if (!cache.has(this)) {
        cache.set(this, fn.call(this))
      }
      return cache.get(this)
    }
  })
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

  get reference() { return `${this.index_name}:${this.directory}` }
  get directory() { return this.def['Directory'] || getKebabCase(this.name) }

  equals(other) {
    return other && other.reference && (this.reference == other.reference)
  }
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

  // get artist_contribs() { return mapContribString(this.def['Artists']) }
  // get cover_artist_contribs() { return mapContribString(this.def['Cover Artists'], 'cover art') }
  // get contributor_contribs() { return mapContribString(this.def['Contributors'], 'contributions') }

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

defineLazyPrototypeProperty(Album, 'date', function() { return dateOrUndef(this.def['Date']) })

defineLazyPrototypeProperty(Album, 'artist_contribs', function() { return mapContribString(this.def['Artists']) })
defineLazyPrototypeProperty(Album, 'cover_artist_contribs', function() { return mapContribString(this.def['Cover Artists'], 'cover art') })
defineLazyPrototypeProperty(Album, 'contributor_contribs', function() { return mapContribString(this.def['Contributors'], 'contributions') })

class Track extends Thing {
  constructor(def, album) {
    super(def)
    this.album = album

    this.name = def['Track']
    this.duration = def['Duration']
    this.external_links = def['URLs']
    this.referenced_track_names = def['Referenced Tracks']
  }

  // get artist_contribs() {
  //   return mapContribString(this.def['Artists']) ||
  //   this.album.artist_contribs
  // }

  // get cover_artist_contribs() {
  //   return mapContribString(this.def['Cover Artists'], 'cover art') ||
  //     this.album.cover_artist_contribs
  // }

  // get contributor_contribs() {
  //   return mapContribString(this.def['Contributors']) ||
  //     this.album.contributor_contribs
  // }

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

defineLazyPrototypeProperty(Track, 'date', function() {
  return (this.def['Date'] ? dateOrUndef(this.def['Date']) : this.album.date)
})

defineLazyPrototypeProperty(Track, 'artist_contribs', function() {
  return mapContribString(this.def['Artists']) ||
    this.album.artist_contribs
})
defineLazyPrototypeProperty(Track, 'cover_artist_contribs', function() {
  return mapContribString(this.def['Cover Artists'], 'cover art') ||
    this.album.cover_artist_contribs
})
defineLazyPrototypeProperty(Track, 'contributor_contribs', function() {
  return mapContribString(this.def['Contributors'], 'contributions') ||
    this.album.contributor_contribs
})

class Flash extends Thing {
  constructor(def) {
    super(def)

    this.name = def['Flash']
    this.viz_page = def['Page']
    this.track_names = def['Featured Tracks']
  }

  get artpath() {
    if (this.viz_page) {
      return `assets://archive/music/flash/${this.viz_page}.png`
    } else {
      return undefined
    }
  }
}
Flash.prototype.index_name = 'flash'
defineLazyPrototypeProperty(Flash, 'date', function() {
  return dateOrUndef(this.def['Date'])
})

class Musicker {
  constructor(hsmusic, archive_music) {
    logger.info("Creating new musicker")

    this.hsmusic = hsmusic
    this.archive_music = archive_music

    const musicker = this

    class RichTrack extends Track {
      // constructor(def, album) {
      //   super(def, album)
      // }
      //
      get referenced_by() { return musicker.referenced_by[this.name] }

      get commentary() { return musicker.parseCommentary(this.def['Commentary']) }

      get bandcamp_id() { return musicker.archive_music.tracks[this.directory]?.bandcampId }
    }

    class RichAlbum extends Album {
      // constructor(def) {
      //   super(def)
      // }

      get commentary() { return musicker.parseCommentary(this.def['Commentary']) }

      // get tracks() { return this.trackdefs.map(trackdef => new RichTrack(trackdef, this)) }
      get tracks() {
        // TODO: Pull existing objects from track_sections
        return Object.values(this.track_sections).flat()
        // throw Error("Not implemented")
      }

      get artpath() {
        // Broken for albums like mobius trip with old jpg art
        const archive_dir = this.directory?.toLowerCase() // Needed for colours
        if (Object.keys(archive_music.albums).includes(archive_dir)) {
          return `assets://archive/music/${archive_dir}/cover.jpg`
        } else if (['more-homestuck-fandom'].includes(this.directory)) {
          return 'assets://archive/music/unreleased-tracks/cover.jpg'
        } else {
          return super.artpath
        }
      }

      // get track_sections() {
      //   return Object.fromEntries(
      //     Object.entries(this.sections)
      //     .filter(([section_name, trackdef_list]) => (
      //       !(section_name == "Unsorted" && trackdef_list.length == 0))
      //     )
      //     .map(([section_name, trackdef_list]) => [
      //       section_name,
      //       trackdef_list.map(trackdef => new RichTrack(trackdef, this))
      //     ])
      //   )
      // }
    }
    defineLazyPrototypeProperty(RichAlbum, 'track_sections', function() {
      return Object.fromEntries(
        Object.entries(this.sections)
        // Filter out empty sections
        .filter(([section_name, trackdef_list]) => (
          !(section_name == "Unsorted" && trackdef_list.length == 0))
        )
        .map(([section_name, trackdef_list]) => [
          section_name,
          trackdef_list.map(trackdef => new RichTrack(trackdef, this))
        ])
      )
    })

    // Construct objects

    this.reg_artists = Object.fromEntries(
      this.hsmusic.artists
      .map(artistdef => new Artist(artistdef))
      .map(thing => [thing.directory, thing])
    )

    this.reg_albums = Object.fromEntries(
      this.hsmusic.albums
      .map(albumdef => new RichAlbum(albumdef))
      .map(thing => [thing.directory, thing])
    )

    this.reg_tracks = Object.fromEntries(
      Object.values(this.reg_albums)
      .map(album => album.tracks)
      // .map(album => album.trackdefs
      //   .map(trackdef => new RichTrack(trackdef, album))
      // )
      .flat()
      .map(thing => [thing.directory, thing])
    )

    this.reg_flashes = Object.fromEntries(
      Object.values(this.hsmusic.flashes).flat()
      .map(flashdef => new Flash(flashdef))
      .map(thing => [thing.directory, thing])
    )

    // Postprocessing

    this.referenced_by = this.buildReferenceTable()

    this.all_albums_sorted = Object.values(this.reg_albums)
    this.all_albums_sorted.sort((a, b) => a.date - b.date)

    this.all_flashes_sorted = Object.values(this.reg_flashes)
    this.all_flashes_sorted.sort((a, b) => a.date - b.date)

    this.all_flashdefs = this.hsmusic.flashes

    // this.test()
  }

  buildReferenceTable() {
    const referenced_by = {}

    for (const [directory, track] of Object.entries(this.reg_tracks)) {
      if (!track.referenced_track_names) continue
      for (const r_track_name of track.referenced_track_names) {
        if (!referenced_by[r_track_name]) referenced_by[r_track_name] = []
        referenced_by[r_track_name].push(track.reference)
      }
    }

    return referenced_by
  }

  // Contextful processing
  processText(raw_text) {
    if (raw_text == undefined) return undefined

    // Process links
    raw_text = raw_text
      .replace(
        /\[\[(?<reference>(?:[^|\]]|](?!]))+?)\|(?<label>(?:[^|\]]|](?!]))+?)\]\]/g,
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
          // console.log("Unescaped", p1)
          return p1
        }
      )
      .replace(
        'src="media/misc/thanksforplaying.jpg"',
        'src="assets://archive/social/news/thanksforplaying.jpg"'
      )

    // nebula really does this
    const markedInput = raw_text
      .replace(/(?<!  .*)\n{2,}(?!^  )/gm, '\n') /* eslint-disable-line no-regex-spaces */
      .replace(/(?<!^ *-.*|^>.*|^  .*\n*|  $|<br>$)\n+(?!  |\n)/gm, '\n\n') /* eslint-disable-line no-regex-spaces */
      .replace(/(?<=^ *-.*)\n+(?!^ *-)/gm, '\n\n')
      .replace(/(?<=^>.*)\n+(?!^>)/gm, '\n\n')

    return marked.parse(markedInput)
  }

  parseCommentary(raw_text) {
    if (raw_text == undefined) return undefined

    // Strip "original art" junk
    raw_text = raw_text
      .replace(/<i>Homestuck:<\/i> \(original track art\)(.|\n)+?>/g, '<!-- $1 -->')

    const commentaryRegexRaw =
      String.raw`^<i>(?<artistReferences>.+?)(?:\|(?<artistDisplayText>.+))?:<\/i>(?: \((?<annotation>(?:.*?(?=,|\)[^)]*$))*?)(?:,? ?(?<date>[a-zA-Z]+ [0-9]{1,2}, [0-9]{4,4}|[0-9]{1,2} [^,]*[0-9]{4,4}|[0-9]{1,4}[-/][0-9]{1,4}[-/][0-9]{1,4}))?\))?`;
    // const commentaryRegexCaseInsensitive = new RegExp(commentaryRegexRaw, 'gmi')
    const commentaryRegexCaseSensitive = new RegExp(commentaryRegexRaw, 'gm')
    // const commentaryRegexCaseSensitiveOneShot = new RegExp(commentaryRegexRaw)

    const raw_section_matches = [...raw_text.matchAll(commentaryRegexCaseSensitive)]

    return {
      sections: raw_section_matches.map((match, i) => {
        const next_match_index = raw_section_matches[i + 1]?.index || -1
        const artistReferences = match.groups.artistReferences
          .split(',')
          .map(ref => ref.trim())

        return {
          header: match.groups,
          artistReferences,
          annotation: this.processText(match.groups.annotation),
          body: this.processText(
            raw_text.slice(
              match.index + match[0].length,
              next_match_index
            ).trim()
          )
        }
      })
      .filter(section => !section.body.includes("Alternia/Bound"))
    }
  }

  // Complex lookup

  tracksInPage(viz_page) {
    // FIXME: Optimize
    const all_flashdefs = Object.values(this.hsmusic.flashes).flat()

    const flashes_matching_page = all_flashdefs
      .filter(flashdef => flashdef['Page'] == viz_page)

    const featured_track_names = flashes_matching_page
      .map(flashdef => flashdef['Featured Tracks'])
      .flat()

    const track_list = Object.values(this.reg_tracks)
      .filter(track => featured_track_names.includes(track.name))

    return track_list
  }

  creditGroupsForArtistInAlbums(albumlist, artist) {
    // Return a list of credit groups, grouped by album
    // [{album: album, credits: [{what, track}...], }...]
    var creditGroups = []

    for (const album of albumlist) {
      const credits = []
      for (const track of album.tracks) {
        // Main artist contributions
        for (const {who, what} of track.all_contributors) {
          if (artist.name == who) {
            credits.push({
              what: what, // (what ? `${track.name} (${what})` : track.name),
              track: track
            })
          }
        }
      }
      if (credits.length > 0) {
        creditGroups.push({
          credits,
          album
        })
      }
    }

    return creditGroups
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
      'artist': (ref => this.reg_artists[ref]),
      'track': (ref => this.reg_tracks[ref]),
      'album': (ref => this.reg_albums[ref]),
      'group': (ref => this.reg_artists[ref]), // HACK: Try to find solo artist
      'flash': (ref => ({uhcLink: `/homestuck/${ref}`})), // HACK: link to flash
    }

    const match_kind = /(?<kind>.+):(?<ref_name>.+)(?<label>\|.+)?/.exec(reference)
    if (match_kind != undefined) {
      const {kind, ref_name} = match_kind.groups
      const matcher = matchers[kind]
      if (!matcher) {
        logger.error("No matcher defined for kind:", kind, matcher)
        return undefined
      }
      const result = matcher(ref_name)
      if (result != undefined) {
        return result
      } else {
        throw Error(`Could not resolve reference ${reference}`)
      }
    } else {
      // logger.debug(`Couldn't lookup ${reference} from registry, trying tracks...`)
      return thingByName(this.reg_tracks, reference)
    }
  }

  getArtistByName(name) {
    const result = thingByName(this.reg_artists, name)
    if (result == undefined) {
      logger.error("Failed to lookup artist by name", name)
    }
    return result
  }

  // Simple Lookup

  getArtistBySlug(artist_slug) { return this.reg_artists[artist_slug] }

  getAlbumBySlug(album_slug) { return this.reg_albums[album_slug] }

  getTrackBySlug(track_slug) { return this.reg_tracks[track_slug] }

  // Tests

  async test() {
    logger.info("Running tests")

    let tests_passed = 0
    let tests_failed = 0

    const expectEqual = async (a, b) => {
      if (JSON.stringify(a) != JSON.stringify(b)) {
        logger.error(
          `test failed: `,
          `expected`, a,
          `got`, b
        )
        tests_failed += 1
      } else {
        tests_passed += 1
      }
    }

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

    // decomposeContribString
    await expectMap({
      "Robert J! Lake (production, arrangement)": {who: "Robert J! Lake", what: "production, arrangement"},
      "Robert J! Lake ": {who: "Robert J! Lake ", what: null},
      "(production, arrangement)": {who: "(production, arrangement)", what: null}
    }, decomposeContribString)

    // thingByName
    await expectMap({
      "Sunslammer": 'track:sunslammer',
      // Always Reference by Directory
      "Cats": undefined,
      "Jane Dargason (5/11)": undefined,
      "Jane Dargason": 'track:jane-dargason',
      "Calliope": undefined,
      // Originally Released As
      "Shell Game": 'track:shell-game',
      "SERVICE CAR": 'track:service-car',
      "Black": 'track:black',
      "black-vol-1-4": undefined
    }, (name) => thingByName(this.reg_tracks, name)?.reference)

    // dateOrUndef
    await expectMap({
      "Apr 13, 2009": "2009-04-13T05:00:00.000Z",
      "Apr 13 2010": "2010-04-13T05:00:00.000Z",
      "": undefined,
      [undefined]: undefined
    }, dateOrUndef)

    // Album artist_contribs
    await expectMap({
      // Standard
      "act-7": [
        {"who": "Clark Powell", "what": null},
        {"who": "Toby Fox", "what": null}
      ],
      // Compilation:
      "the-felt": undefined,
      // Solo
      "alternia": [{"who": "Toby Fox", "what": null}]
    }, (ref) => this.reg_albums[ref].artist_contribs)

    // Album cover_artist_contribs
    await expectMap({
      // Default
      "act-7": [{"who": "Homestuck", "what": "cover art"}],
      // Artist
      "the-felt": [{"who": "Molly Gur", "what": "cover art"}],
      // Multi
      "alternia": [
        {"who": "Cindy Dominguez", "what": "cover art"},
        {"who": "Andrew Hussie", "what": "cover art"}
      ]
      // Hi Cindy Dominguez!!!
    }, (ref) => this.reg_albums[ref].cover_artist_contribs)

    // Album all_contributors: just artist_contribs again
    await expectMap({
      "act-7": [
        {"who": "Clark Powell", "what": null},
        {"who": "Toby Fox", "what": null},
        {"who": "Homestuck", "what": "cover art"}
      ],
      "the-felt": [{"who": "Molly Gur", "what": "cover art"}],
      "alternia": [
        {"who": "Toby Fox", "what": null},
        {"who": "Cindy Dominguez", "what": "cover art"},
        {"who": "Andrew Hussie", "what": "cover art"}
      ]
    }, (ref) => this.reg_albums[ref].all_contributors)

    // Album uses_sections
    await expectMap({
      "act-7": false,
      "alternia": true
    }, (ref) => this.reg_albums[ref].uses_sections)

    // RichAlbum artpath
    await expectMap({
      "alternia": "assets://archive/music/alternia/cover.jpg",
      "homestuck-vol-1-4": "assets://archive/music/homestuck-vol-1-4/cover.jpg",
      // Expect old jpg art
      "mobius-trip-and-hadron-kaleido": "assets://archive/music/mobius-trip-and-hadron-kaleido/cover.jpg",
      // Case sensitive workaround (also, these would be pngs)
      "coloUrs-and-mayhem-universe-a": "assets://archive/music/colours-and-mayhem-universe-a/cover.jpg",
      "coloUrs-and-mayhem-universe-b": "assets://archive/music/colours-and-mayhem-universe-b/cover.jpg",
      // Overrides
      "more-homestuck-fandom": "assets://archive/music/unreleased-tracks/cover.jpg",
      "unreleased-tracks": "assets://archive/music/unreleased-tracks/cover.jpg",
    }, (ref) => this.reg_albums[ref].artpath)

    // Album date
    await expectMap({
      // Date
      "act-7": "2016-04-13T05:00:00.000Z",
      "alternia": "2010-07-18T05:00:00.000Z",
      // Awkward format
      "the-felt": "2010-12-02T06:00:00.000Z",
      // No date
      "more-homestuck-fandom": undefined,
      "unreleased-tracks": undefined,
    }, (ref) => this.reg_albums[ref].date)

    // Album commentary exists
    await expectMap({
      "showdown": true,
      "overture-canon-edit": false
    }, (slug) => Boolean(this.getTrackBySlug.bind(this)(slug).commentary))

    // Track artist_contribs
    await expectMap({
      // Explicit
      "arisen-anew": [{"who": "Tensei", "what": null}],
      // Fallthrough
      "overture-canon-edit": [{"who": "Clark Powell", "what": null}, {"who": "Toby Fox", "what": null}]
    }, (ref) => this.reg_tracks[ref].artist_contribs)

    // Track cover_artist_contribs
    await expectMap({
      // Explicit
      "crustacean": [{"who": "Kirvia", "what": "cover art"}],
      // Fallthrough
      "overture-canon-edit": [{"who": "Homestuck", "what": "cover art"}]
    }, (ref) => this.reg_tracks[ref].cover_artist_contribs)

    // Track contributors
    await expectMap({
      // Explicit
      "fiduspawn-go": [
        {"who": "David Ko", "what": null},
        {"who": "Toby Fox", "what": "arrangement"},
        {"who": "Phil Gibson", "what": "cover art"},
        {"who": "The_Eighth_Bit", "what": "soundfont"}
      ],
      // Fallthrough
      "overture-canon-edit": [
        {"who": "Clark Powell", "what": null},
        {"who": "Toby Fox", "what": null},
        {"who": "Homestuck", "what": "cover art"}
      ]
    }, (ref) => this.reg_tracks[ref].all_contributors)

    // Track artpath
    await expectMap({
      // Album fallback, extension fallback
      "overture-canon-edit": "assets://archive/music/act-7/cover.jpg",
      // Track with png extension
      "null-vol8": "assets://archive/music/homestuck-vol-8/null-vol8.png",
      "the-thirteenth-hour": "assets://archive/music/alternia/the-thirteenth-hour.jpg"
    }, (ref) => this.reg_tracks[ref].artpath)

    // Track date
    await expectMap({
      "overture-canon-edit": new Date("April 13, 2016"), // Album fallback
    }, (ref) => this.reg_tracks[ref].date)

    // Track duration
    await expectMap({
      "overture-canon-edit": "9:00"
    }, (ref) => this.reg_tracks[ref].duration)

    // RichTrack commentary exists
    await expectMap({
      "showdown": true,
      "overture-canon-edit": false
    }, (ref) => Boolean(this.reg_tracks[ref].commentary))

    // RichTrack referenced_by
    await expectMap({
      "crustacean": ["track:death-of-the-lusii","track:karkats-theme","track:shes-a-sp8der","track:rex-duodecim-angelus","track:some-kind-of-alien","track:ascend","track:frustracean","track:a-knights-reflection","track:youre-so-rad","track:crustacean-pesterquest","track:oppa-toby-style","track:crab-waltz"],
      "overture-canon-edit": undefined
    }, (ref) => this.reg_tracks[ref].referenced_by)

    // RichTrack bandcamp_id
    await expectMap({
      "horschestra-STRONG-version": undefined,
      "overture-canon-edit": 2310956970
    }, (ref) => this.reg_tracks[ref].bandcamp_id)

    // RichAlbum commentary exists
    await expectMap({
      "act-7": true,
      "the-grubbles": false
    }, (ref) => Boolean(this.reg_albums[ref].commentary))

    // RichAlbum track_sections
    //
    //
    //
    // Check text processing
    // TODO: run later
    //

    await expectMap({
      "alternia": 2,
      "coloUrs-and-mayhem-universe-a": 2,
      "coloUrs-and-mayhem-universe-b": 2,
    }, (ref) => this.reg_albums[ref].commentary.sections.length)

    Object.values(this.reg_albums).map(album => album.commentary)
    Object.values(this.reg_tracks).map(track => track.commentary)

    // Music-in-flash count
    await expectMap({
      "1": 0, // No flash
      "980": 3, // Retrieve package
      "8127": 1 // Act 7
    }, (viz_num) => this.tracksInPage.bind(this)(viz_num).length)

    logger.info(`${tests_failed} failed, ${tests_passed} passed`)
  }
}

export default {
  Musicker
}
