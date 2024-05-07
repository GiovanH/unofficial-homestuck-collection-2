// run me in hsmusic --repl
Replacer = await import('#replacer')

fs = await import('fs');

group_whitelist = ['group:official']

groups = group_whitelist.map(find.group);

// HACK: arbitrary ordering
flash_acts = wikiData.flashActData.slice(0, 27)

official_albums = groups.flatMap(g => g.albums)

official_albums.push(wikiData.albumData.filter(a => a.directory == 'the-baby-is-you')[0])

function linksFromText(body) {
  nodes = Replacer.parseInput(body)
  tags = nodes.filter(n => n.type === 'tag');
  links = tags.map(({data}) => [data.replacerKey?.data ?? null, data.replacerValue[0].data]);
  return links.map(([k, v]) => k ? `${k}:${v}` : v)
}

function linkAnythingMan(ref) {
  referenceType = ref.split(':')[0];
  spec = Replacer.replacerSpec[referenceType];
  try {
    return find[spec.find](ref);
  } catch {
    return undefined
  }
}

album_tracks = official_albums.flatMap(a => a.tracks)

// Extend tracks list
all_tracks = [
  ...album_tracks,
  ...album_tracks.flatMap(t => t.referencedTracks),
  ...album_tracks.flatMap(t => t.originalReleaseTrack || []),
  ...album_tracks.flatMap(t => t.sampledTracks),
  ...flash_acts.flatMap(a => a.flashes).flatMap(f => f.featuredTracks)
]

// For each track, we need its whole album
all_albums = all_tracks.map(t => t.album)

// Get artists from contrib list
all_artists = [
  // Music and cover artists
  ...all_albums.flatMap(t => [
      ...t.artistContribs,
      ...t.coverArtistContribs,

      ...t.trackCoverArtistContribs
    ]).
    map(c => c.who),

  ...all_tracks.flatMap(t => [
      ...t.artistContribs,
      ...t.coverArtistContribs,

      ...t.contributorContribs
    ]).
    map(c => c.who),

  // Commentators
  ...[...all_albums, ...all_tracks].
    flatMap(t => t.commentary ?? []).
    flatMap(c => c.artists)
]

all_things = {
  // All things are sorted into buckets based on referenceType
  [Album[Thing.referenceType]]: new Set(all_albums),
  [Artist[Thing.referenceType]]: new Set(all_artists),
  [FlashAct[Thing.referenceType]]: new Set(flash_acts),

  // Postprocess these into their parents
  [Flash[Thing.referenceType]]: new Set(),
  [Track[Thing.referenceType]]: new Set(),

  // Ignore
  ['static']: new Set(),
  [Group[Thing.referenceType]]: new Set(),
}

unsorted_links = [
  // Commentary text
  ...[...all_albums, ...all_tracks].
    flatMap(t => t.commentary?.map(c => c.annotation) ?? []).
    filter(Boolean).
    flatMap(linksFromText),
  // Commentary body
  ...[...all_albums, ...all_tracks].
    flatMap(t => t.commentary?.map(c => c.body) ?? []).
    filter(Boolean).
    flatMap(linksFromText),
  // Lyric text
  ...all_tracks.map(t => t.lyrics).
    filter(Boolean).
    flatMap(linksFromText)
]

// Add link things to all_things
unsorted_links.forEach(ref => {
  thing = linkAnythingMan(ref)
  if (thing) {
    // console.log(thing.constructor[Thing.referenceType])
    all_things[thing.constructor[Thing.referenceType]].add(thing)
  }
})

// Convert flashes, tracks into flashacts, albums
all_things[Flash[Thing.referenceType]].
  forEach(f => all_things[FlashAct[Thing.referenceType]].add(f.act))
all_things[Track[Thing.referenceType]].
  forEach(f => all_things[Album[Thing.referenceType]].add(f.album))

// mapping of referenceTypes OR keys to a list of subkeys to expand
expand_fields = {
  'album': ['trackSections'],
  'flash-act': ['flashes'],
  // 'track-section': ['tracks'],
  'trackSections': ['tracks'], // track-sections aren't things
}

function buildSourceDocument(thingset, key) {
  // Reconstruct the "source yaml" for a Thing.
  // Optionally, pass a non-Thing object and a key used to determine its "type".
  if (thingset == undefined) return []
  return [...thingset].
    map(thing => {
      // Use an explicit source document, or the thing (danger!) if missing.
      // If you use a thing with references, expand_fields must replace those keys!
      const doc = {...(thing.yamlSourceDocument || thing)}
      const kind_field = thing.constructor[Thing.referenceType] || key

      for (const key of (expand_fields[kind_field] || [])) {
        if (!thing[key]) continue;

        subset = buildSourceDocument(thing[key], key)
        doc[key] = subset
      }
      return doc
    })
}

fs.writeFile("hsmusic_out.json", JSON.stringify({
  'albums': buildSourceDocument(all_things[Album[Thing.referenceType]]),
  'artists': buildSourceDocument(all_things[Artist[Thing.referenceType]]),
  'flashes': buildSourceDocument(all_things[FlashAct[Thing.referenceType]]),
}, null, null), () => null)
