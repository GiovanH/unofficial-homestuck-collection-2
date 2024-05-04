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
            <a v-if="artist" :href="artist.uhcLink" v-text="artist.name"/>
            <span v-else v-text="c.who" />
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
      <iframe v-if="$localData.settings.bandcampEmbed && track.bandcamp_id" class="bandcamp" :key="track.directory" :src="`https://bandcamp.com/EmbeddedPlayer/size=small/bgcol=333333/linkcol=0f91ff/artwork=none/track=${track.bandcamp_id}/transparent=true/`" seamless></iframe>

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
        <TrackList :reflist="track.referenced_track_names" />
      </div>

      <div class="referencedBy"
        v-if="track.referenced_by">
        Tracks that reference <i>{{track.name}}</i>:
        <!-- <TrackList :reflist="$musicker.referenced_by[track.name]" /> -->
        <TrackList :reflist="track.referenced_by" />
      </div>

    </div>

    <!-- TODO features -->

    <!-- TODO lyrics -->
    <div v-if="track.lyrics" class="commentaryContainer lyrics">
      <p class="commentary-entry-heading">
        Lyrics
      </p>
      <p class="commentary" v-html="track.lyrics" />
    </div>

    <div v-if="track.commentary" ref="commentary">
      <!-- <p class="commentaryHeader">Track Commentary:</p> -->
      <div v-if="$isNewReader" class="commentaryContainer">
        <p class="commentary lock">
          <span class="lock">Finish Homestuck to unlock music commentary!</span>
        </p>
      </div>
      <div v-else class="commentaryContainer"
        v-for="section, i in track.commentary.sections" :key="i">
        <p class="commentary-entry-heading">
          <span class="commentary-entry-artists">
            <ol class="nameList">
              <li v-for="name, i in section.artistReferences" :key="i"
                :set="artist = $musicker.getArtistByName(name)">>
                <a v-if="artist" :href="artist.uhcLink" v-text="name"/>
                <span v-else v-text="name" />
              </li>
            </ol>
          </span>:
          <span v-if="section.annotation" class="commentary-entry-accent">(<span v-html="section.annotation" />)</span>
        </p>
        <p class="commentary" v-html="section.body" />
      </div>
    </div>
  </div>
</template>

<script>
import Media from '@/components/UIElements/MediaEmbed.vue'
import TrackList from '@/components/Music/TrackList.vue'
import Resources from '@/resources.js'

export default {
  name: 'MusicTrack',
  mixins: [ Resources.UrlFilterMixin ],
  props: [
    'track'
  ],
  components: {
    Media, TrackList
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

