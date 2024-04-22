<template>
  <div class="trackPage" v-if="$trackIsSpoiler(track)">
    <div class="nameSection">
      <h2 class="trackTitle">Spoiler!</h2>
    </div>
    <div class="info">
      Keep reading to unlock.
    </div>
  </div>
  <div class="trackPage" v-else>
    <div class="nameSection">
      <h2 class="trackTitle">{{track.name}}</h2>
      <h3 class="byArtist" >
        from
        <a :href="track.album.uhcLink" v-text="track.album.name"/>
      </h3>
      <h3 class="byArtist">
        by
        <ol class="nameList">
          <li v-for="c, i in track.artist_contribs" :key="i"
            :set="artist = $musicker.getArtistByName(c.who)">
            <a :href="artist.uhcLink" v-text="artist.name"/>
          </li>
        </ol>
      </h3>
      <h3 class="byArtist"
        v-if="track.coverArtists && track.coverArtists[0].who != 'homestuck'"
      >
        cover art by <span v-html="coverArtistListHtml" />
      </h3>
    </div>

    <div class="middleColumn">
      <a :href="track.artpath">
        <Media v-if="track.artpath" :url="track.artpath" width="350" />
      </a>
    </div>

    <div class="info">
      <iframe v-if="$localData.settings.bandcampEmbed && track.bandcampId" class="bandcamp" :key="track.directory" :src="`https://bandcamp.com/EmbeddedPlayer/size=small/bgcol=333333/linkcol=0f91ff/artwork=none/track=${track.bandcampId}/transparent=true/`" seamless></iframe>

      <p class="links" v-if="track.external_links">
        Listen at
        <ol class="linkList">
          <li v-for="href, i in track.external_links" :key="i" >
            <a :href="href" v-text="getHostname(href)"/>
          </li>
        </ol>
      </p>

      <p>
        <span class="duration" v-if="track.duration">Duration: {{track.duration}}<br></span>
        <span class="release" v-if="track.date">Released {{ track.date.toLocaleDateString([], {month: 'long', day: 'numeric', year: 'numeric'}) }}</span>
      </p>

      <div class="featuredIn" v-if="track.contributors">Contributors:
        <ul>
          <li v-for="contribution, i in track.contributors" :key="i">
            <a
              v-if="$musicker.getArtistByName(contribution.who)"
              :href="$musicker.getArtistByName(contribution.who).uhcLink"
              v-text="contribution.who"/>
            <span v-else v-text="contribution.who" />
            <span v-if="contribution.what"> ({{contribution.what}})</span>
          </li>
        </ul>
      </div>

      <!--
        TODO featuredin
      <div class="featuredIn" v-if="linkPages">Pages that feature <i>{{track.name}}</i>:
        <ul>
          <li v-for="page in linkPages" v-html="page"/>
        </ul>
      </div>
      -->

      <div class="references" v-if="track.referenced_track_names">
        Tracks that <i>{{track.name}}</i> references:
        <ul>
          <li v-for="name, i in track.referenced_track_names" :key="i">
            <a
              v-if="$musicker.thingFromReference(name)"
              :href="$musicker.thingFromReference(name).uhcLink"
              v-text="name"/>
            <span v-else v-text="name" />
          </li>
        </ul>
      </div>

      <!--
        TODO referencedBy
      <div class="referencedBy" v-if="track.referencedBy && track.referencedBy.length > 0">Tracks that reference <i>{{track.name}}</i>:
        <ul>
          <li v-for="reference in track.referencedBy" v-html="linkReference(reference)"/>
        </ul>
      </div> -->
    </div>

    <!-- TODO features -->

    <div v-if="track.commentary" class="commentaryContainer">
      <p class="commentaryHeader">Track Commentary:</p>
      <p class="commentary" ref="commentary" v-if="!$isNewReader" v-html="track.commentary" />
      <p class="commentary lock" ref="commentary" v-else>
        <span class="lock">Finish Homestuck to unlock inline commentary!</span>
      </p>
    </div>

    <pre v-html="track" />
  </div>
</template>

<script>
import Media from '@/components/UIElements/MediaEmbed.vue'
import Resources from '@/resources.js'

export default {
  name: 'MusicTrack',
  mixins: [ Resources.UrlFilterMixin ],
  props: [
    'track'
  ],
  components: {
    Media
  },
  data: function() {
    return {
    }
  },
  computed: {
  },
  methods: {
    getHostname(href) {
      return (new URL(href)).hostname
    },
    filterCommentaryLinksAndImages(){
      return this.filterLinksAndImages(this.$refs.commentary)
    }
  },
  mounted(){
    if (this.track.commentary && this.$refs.commentary) this.filterCommentaryLinksAndImages()
  }
}
</script>

<style scoped lang="scss">

</style>

