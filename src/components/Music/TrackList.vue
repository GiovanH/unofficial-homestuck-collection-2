<template>
  <component :is="(ordered || ordered === '') ? 'ol' : 'ul'">
    <li v-for="thing, i in _thing_or_string_list" :key="thing.directory || i"
      :class="{'teaser': $trackIsSpoiler(thing)}">
      <span v-if="typeof thing == 'string'" v-text="thing" />
      <span v-else-if="$trackIsSpoiler(thing)">??????</span>
      <span v-else-if="(iscompilation || iscompilation === '')">
        <a :href="thing.uhcLink" v-text="thing.name"/>
        (<a v-if="thing.artist_contribs && thing.artist_contribs.length == 1"
          class="compilationArtist"
          :set="artist = $musicker.getArtistByName(thing.artist_contribs[0].who) || {}"
          :href="artist.uhcLink"
          v-text="artist.name" />
        <span v-else-if="thing.artist_contribs && thing.artist_contribs.length == 2">
          <a class="compilationArtist"
          :set="artist = $musicker.getArtistByName(thing.artist_contribs[0].who) || {}"
          :href="artist.uhcLink"
          v-text="artist.name" /> and
          <a class="compilationArtist"
          :set="artist = $musicker.getArtistByName(thing.artist_contribs[1].who) || {}"
          :href="artist.uhcLink"
          v-text="artist.name" />
        </span>
        <span v-else>...</span>)
      </span>
      <a v-else :href="thing.uhcLink" v-text="thing.name"/>
    </li>
  </component>
  <!-- <ol class="groupList">
    <li v-for="track in track_list" :key="track.directory">
      <span v-if="$trackIsSpoiler(track)">
        ??????
      </span>
      <span v-else-if='isCompilationAlbum'>
        <a :href="track.uhcLink" v-text="track.name" />
        (<a v-if="track.artist_contribs && track.artist_contribs.length == 1"
          class="compilationArtist"
          :set="artist = $musicker.getArtistByName(track.artist_contribs[0].who) || {}"
          :href="artist.uhcLink"
          v-text="artist.name" />
        <span v-else>...</span>)

      </span>
      <a v-else :href="track.uhcLink" v-text="track.name" />
    </li>
  </ol> -->
</template>

<script>

export default {
  name: 'TrackList',
  props: [
    'reflist',
    'thinglist',
    'ordered',
    'iscompilation'
  ],
  computed: {
    _thing_or_string_list() {
      if (this['thinglist']) {
        return this['thinglist']
      } else if (this['reflist']) {
        return this['reflist']
          .map(name => (this.$musicker.thingFromReference(name) || name))
      } else {
        this.$logger.error("TrackList not passed any input")
        return []
      }
    }
  }
}
</script>

<style scoped lang="scss">
.compilationArtist {
  filter: saturate(.4);
}
// ul {
  .teaser + .teaser {
    display: none;
  }
// }
</style>
