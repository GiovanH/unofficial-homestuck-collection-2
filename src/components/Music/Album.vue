<template>
  <div class="albumPage" v-if="$albumIsSpoiler(album)">
    <div class="nameSection">
      <h2 class="trackTitle">Spoiler!</h2>
    </div>
    <div class="info">
      Keep reading to unlock.
    </div>
  </div>
  <div class="albumPage" v-else>
    <div class="nameSection">
      <h2 class="trackTitle">{{album.name}}</h2>

      <h3 class="byArtist" v-if="!isCompilationAlbum">
        by
        <ol class="nameList">
          <li v-for="c, i in album.artist_contribs" :key="i"
            :set="artist = $musicker.getArtistByName(c.who)">
            <a :href="artist.uhcLink" v-text="artist.name"/>
          </li>
        </ol>
      </h3>
      <h3 class="byArtist" v-else-if="compilationArtists.length < 20">
        compilation by
        <ol class="nameList">
          <li v-for="artist, i in compilationArtists" :key="i" >
            <a :href="artist.uhcLink" v-text="artist.name"/>
          </li>
        </ol>
      </h3>

      <h3 class="byArtist" v-if="album.cover_artist_names">
        cover art by
        <ol class="nameList">
          <li v-for="name, i in album.cover_artist_names" :key="i"
            :set="artist = $musicker.getArtistByName(name)">
            <a v-if="artist" :href="artist.uhcLink" v-text="name"/>
            <span v-else v-text="name" />
          </li>
        </ol>
      </h3>
    </div>

    <div class="middleColumn">
      <a :href="album.artpath">
        <Media :url="album.artpath || 'assets://archive/music/spoiler.png'" />
      </a>
    </div>

    <div class="info">    
      <p class="links" v-if="album.external_links">
        Listen at
        <ol class="linkList">
          <li v-for="href, i in album.external_links" :key="i" >
            <a :href="href" v-text="getHostname(href)"/>
          </li>
        </ol>
      </p>

      <p class="date" v-if="album.date">Released {{ album.date.toLocaleDateString([], {month: 'long', day: 'numeric', year: 'numeric'}) }}</p>

      <div class="albumGroup">
        <div class="albumGroup" v-for="[section_name, track_list] in Object.entries(album.track_sections)" :key="section_name">
          <p v-if="section_name != 'Unsorted'">
            <em>{{section_name}}:</em>
          </p>
          <TrackList :ordered="album.use_numbers" :thinglist="track_list" :iscompilation="isCompilationAlbum" />
          <br>
        </div>
      </div>

      <div class="bonusItems" v-if="album.bonus && album.bonus.length > 0">Bonus items included with <i>{{album.name}}</i>:
        <ul>
          <li v-for="bonus, j in album.bonus" :key="j">
            {{bonus['Title']}}:
            <ol class="nameList">
              <li v-for="file, i in bonus['Files']" :key="i">
                <a :href="`/archive/music/${album.directory}/${file}`" v-text="file"/>
              </li>
            </ol>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="album.commentary" ref="commentary">
      <!-- <p class="commentaryHeader">Album Commentary:</p> -->
      <div v-if="$isNewReader" class="commentaryContainer">
        <p class="commentary lock">
          <span class="lock">Finish Homestuck to unlock music commentary!</span>
        </p>
      </div>
      <div v-else class="commentaryContainer"
        v-for="section, i in album.commentary.sections" :key="i">
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
        <p class="commentary"  v-html="section.body" />
      </div>
    </div>
  </div>
</template>

<script>
import Media from '@/components/UIElements/MediaEmbed.vue'
import TrackList from '@/components/Music/TrackList.vue'
import Resources from '@/resources.js'

export default {
  name: 'MusicAlbum',
  mixins: [ Resources.UrlFilterMixin ],
  props: [
    'album'
  ],
  components: {
    Media, TrackList
  },
  data: function() {
    return {
    }
  },
  computed: {
    isCompilationAlbum() {
      return !this.album.artist_contribs
    },
    compilationArtists() {
      const names = [...new Set(
        this.album.tracks
        .map(track => track.artist_contribs?.map(c => c.who))
        .flat()
        .filter(Boolean)
      )]
      names.sort()
      return names.map(name => this.$musicker.getArtistByName(name))
        .filter(Boolean)
    }
  },
  methods: {
    getHostname(href) {
      return (new URL(href)).hostname
    },
    // groupIsSpoiler(group) {
    //   return this.$isNewReader && !group.find(track => !(track).includes('>??????<'))
    // },
    filterCommentaryLinksAndImages(){
      return this.filterLinksAndImages(this.$refs.commentary)
    }
  },
  mounted(){
    if (this.album.commentary && this.$refs.commentary)
      this.filterCommentaryLinksAndImages()
  }
}
</script>

