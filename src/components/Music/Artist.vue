<template>
  <div class="artistPage">
    <h2 class="trackTitle" v-text="artist.name"/>
    <p class="links" v-if="artist.external_links">
      Visit on
      <ol class="linkList">
        <li v-for="href, i in artist.external_links" :key="i" >
          <a :href="href" v-text="getHostname(href)"/>
        </li>
      </ol>
    </p>
    <div class="trackography">
      <div class="album" v-for="group in creditGroups" :key="group.album.directory"
          :class="{'teaser': $albumIsSpoiler(group.album)}">
        <div class="thumbnail">
          <a v-if="!$albumIsSpoiler(group.album)" :href="group.album.uhcLink" class="coverArt">
            <img :src="group.album.artpath || 'assets://archive/music/spoiler.png'" />
          </a>
          <div v-else class="coverArt">
            <img src="assets://archive/music/spoiler.png" />
          </div>
          <p class="date" v-if="group.album.date" v-text="group.album.date.toLocaleDateString([], {month: 'long', day: 'numeric', year: 'numeric'})" />
        </div>
        <div>
          <a :href="group.album.uhcLink" v-if="!$albumIsSpoiler(group.album)">
            <h2 class="trackTitle" v-text="group.album.name" />
            <span v-for="credit, i in group.credits.album" :key="i">
              <i class="credit-what" v-if="credit.what"> ({{ credit.what }})</i>
            </span>
          </a>
          <h2 class="trackTitle" v-else>??????</h2>

          <div class="credits">
            <ul class="musicList">
              <li v-for="credit, i in group.credits.track" :key="i"
                :class="{'teaser': $trackIsSpoiler(credit.track)}">
                <span v-if="!$trackIsSpoiler(credit.track)">
                  <a :href="credit.track.uhcLink" v-text="credit.track.name" />
                  <span class="credit-what" v-if="credit.what"> ({{ credit.what }})</span>
                </span>
                <span v-else>??????</span>
              </li>
            </ul>
          </div>
        </div>
        <!-- End foreach album -->
      </div>
    </div>
  </div>
</template>

<script>
// import Media from '@/components/UIElements/MediaEmbed.vue'

export default {
  name: 'MusicArtist',
  props: [
    'artist'
  ],
  components: {
    // Media
  },
  data: function() {
    return {
    }
  },
  computed: {
    // artistName(){
    //   return this.artist.alias ? `${this.artist.name} (a.k.a ${this.artist.alias})` : this.artist.name
    // },
    creditGroups() {
      // Return a list of credit groups, grouped by album
      // [{credits: [{what, whatlink}...], album: album}...]
      return this.$musicker.creditGroupsForArtistInAlbums(
        this.$musicker.all_albums_sorted,
        this.artist,
        {include_commentary: true}
      )
    },
    // TODO: Consider list reversing feature

    // linkAndJoinExternalMusic() {
    //   let sources = this.artist.urls.map(url =>`<a href="${url}">${
    //     url.includes('bandcamp.com') ? 'Bandcamp' :
    //     url.includes('youtu') ?  'YouTube' :
    //     url.includes('soundcloud') ? 'SoundCloud' :
    //     url.includes('tumblr.com') ? 'Tumblr' :
    //     url.includes('twitter.com') ? 'Twitter' :
    //     url.includes('deviantart.com') ? 'DeviantArt' :
    //     url.includes('wikipedia.org') ? 'Wikipedia' : url}</a>`)
    //   return (new Intl.ListFormat('en', { style: 'long', type: 'disjunction' }).format(sources))
    // },
  },
  methods: {
    getHostname(href) {
      return (new URL(href)).hostname
    },
    // linkAlbum(album) {
    //   return this.$albumIsSpoiler(album) ? '??????' : `<a href="/music/album/${album}">${this.$archive.music.albums[album].name}</a>`
    // },
    // linkTrackCredit(trackCredit){
    //   return this.$trackIsSpoiler(trackCredit.track) ? '??????' : `<a href="/music/track/${trackCredit.track}">${this.$archive.music.tracks[trackCredit.track].name}</a>${trackCredit.what ? ` (${trackCredit.what})` : ''}`
    // },
    // linkReference(reference) {
    //   if (this.$trackIsSpoiler(reference)) {
    //     return '??????'
    //   }
    //   else if (reference in this.$archive.music.tracks) {
    //     return `<a href="/music/track/${this.$archive.music.tracks[reference].directory}">${this.$archive.music.tracks[reference].name}</a>`
    //   }
    //   else return reference
    // },
    // getUTCDate(date){
    //   let d = new Date(date)
    //   let month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][d.getUTCMonth()]
    //   return `${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
    // }
  }
}
</script>

<style scoped lang="scss">
ul {
  .teaser + .teaser {
    display: none;
  }
}
.trackography {
  .album.teaser + .album.teaser {
    display: none;
  }
}
</style>
