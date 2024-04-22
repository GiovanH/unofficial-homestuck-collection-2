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
    <div class="trackography" >
      <div class="album" v-for="group in creditGroups" :key="group.album.directory">
        <!-- <div class="thumbnail" v-if="group.album.artpath"> -->
        <div class="thumbnail">
          <a v-if="group.album.directory && !$albumIsSpoiler(group.album.directory)" :href="`/music/album/${group.album.directory}`" class="coverArt">
            <img :src="group.album.artpath || 'assets://archive/music/spoiler.png'" />
          </a>
          <div v-else class="coverArt">
            <img src="assets://archive/music/spoiler.png" />
          </div>
          <p class="date" v-if="group.album.date" v-text="group.album.date.toLocaleDateString([], {month: 'long', day: 'numeric', year: 'numeric'})" />
        </div>
        <div>
          <a :href="group.album.uhcLink" v-if="group.album.directory && !$albumIsSpoiler(group.album.directory)">
            <h2 class="trackTitle" v-text="group.album.name" />
          </a>
          <h2 class="trackTitle" v-else>??????</h2>

          <div class="credits">
            <div class="musicList">
              <li v-for="credit, i in group.credits" :key="i">
                <a :href="credit.whatlink" v-text="credit.what" />
              </li>
            </div>
            <!--
            TODO: teasers for spoiler tracks
            <div class="spoiler" v-if="!group.album.directory">
              <p>Keep reading to unlock!</p>
            </div> -->
          </div>
        </div>
      </div>
    </div>
    <pre v-html="artist" />
  </div>
</template>

<script>
import Media from '@/components/UIElements/MediaEmbed.vue'

export default {
  name: 'MusicArtist',
  props: [
    'artist'
  ],
  components: {
    Media
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
      var creditGroups = []

      var all_albums = Object.values(this.$musicker.all_albums)
      all_albums.sort((a, b) => a.date - b.date)

      for (const album of all_albums) {
        const creditGroup = {
          credits: [],
          album
        }
        for (const track of album.tracks) {
          // Main artist contributions
          for (const {who, what} of track.all_contributors) {
            // if (this.artist.equals(this.$musicker.getArtistByName(who))) {
            if (this.artist.name == who) {
              creditGroup.credits.push({
                what: (what ? `${track.name} (${what})` : track.name),
                whatlink: track.uhcLink
              })
            }
          }
        }
        if (creditGroup.credits.length > 0) {
          creditGroups.push(creditGroup)
        }
      }

      // let filteredAlbums = Object.values(this.$musicker.all_albums)
      //   .filter(album => {
      //     if (this.$albumIsSpoiler(album.directory)) {
      //       let isValidAlbum = false
      //       album.tracks.forEach(track => {
      //         if (!this.$trackIsSpoiler(track.directory)) isValidAlbum = true
      //       })
      //       // album.art.forEach(track => {
      //       //   if (!this.$trackIsSpoiler(track.track)) isValidAlbum = true
      //       // })
      //       return isValidAlbum
      //     } else {
      //       return true
      //     }
      //   })
      // if (filteredAlbums.length < this.artist.credits.length) {
      //   filteredAlbums.push({})
      // }
      // filteredAlbums.sort((a, b) => a.timestamp - b.timestamp)
      return creditGroups
      // return filteredAlbums
    },
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

</style>

