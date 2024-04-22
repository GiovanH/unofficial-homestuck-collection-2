<template>
  <div class="discographyPage">
    <div class="trackography" v-if="mode == 'tracks'">
      <div class="album" v-for="album in filteredSortedAlbums" :key="album.directory">
        <div class="thumbnail">
          <div v-if="album.directory == 'TEASER'" class="coverArt">
            <Media url="/archive/music/spoiler.png" />
          </div>
          <a v-else :href="album.artpath" class="coverArt">
            <Media :url="album.artpath || 'assets://archive/music/spoiler.png'" />
          </a>
          <p v-if="album.date" class="date" v-text="album.date.toLocaleDateString([], {month: 'long', day: 'numeric', year: 'numeric'})" />
        </div>
        <div>
          <h2 class="trackTitle" v-if="album.directory == 'TEASER'">??????</h2>
          <a :href="album.uhcLink" v-else>
            <h2 class="trackTitle">{{album.name}}</h2>
          </a>
          <ol v-if="album.directory != 'TEASER'">
            <li v-for="track in album.tracks" :key="track.directory">
              <a :href="track.uhcLink" v-text="track.name" />
              <span v-if="track.artist_contribs && track.artist_contribs.length == 1"> - <a
                  class="compilationArtist"
                  :set="artist = $musicker.getArtistByName(track.artist_contribs[0].who) || {}"
                  :href="artist.uhcLink"
                  v-text="artist.name" />
                </span>
            </li>
          </ol>
          <span v-else>Keep reading to unlock!</span>
        </div>
      </div>
    </div>
    <div class="artistography" v-else-if="mode == 'artists'">
      <h2 class="trackTitle">Artists:</h2>
      <ul class="artists">
        <li v-for="artist in artistographySorted" :key="artist.directory">
          <a :href="artist.uhcLink" v-text="artist.name" />
        </li>
      </ul>
    </div>
    <div class="flashography" v-else-if="mode == 'features'">
      <div class="album" v-for="flash in flashographySorted" :key="flash.url">
        <div class="thumbnail">
          <a :href="flash.url"  target="_blank" class="coverArt">
            <Media :url="`/archive/music/flash/${flash.thumbnail}.png`" v-if="flash.thumbnail"/>
            <Media url="/archive/music/spoiler.png" v-else/>
          </a>
          <p v-if="flash.pageNum" class="date" v-text="flash.pageNum" />
        </div>
        <div>
          <a :href="flash.url" v-if="flash.url" target="_blank"><h2 class="trackTitle flashTitle" v-text="flash.title"/></a>
          <h2 class="trackTitle flashTitle" v-text="flash.title" v-else />
          <ul>
            <li v-for="track in flash.tracks" v-html="track"/>
          </ul>
        </div>
      </div>
    </div>
    <div class="discography" v-else>
      <button class="reverseButton" @click="reverseDiscography = !reverseDiscography">Reverse Order</button><br>
      <div class="albums">
        <div class="album" v-for="album in filteredSortedAlbums" :key="album.directory">
          <div v-if="album.directory == 'TEASER'">
            <Media class="art" url="/archive/music/spoiler.png" width="350" />
            <p class="title">Keep reading to unlock!</p>
          </div>
          <a v-else :href="album.uhcLink">
            <img class="art" :src="album.artpath || 'assets://archive/music/spoiler.png'" width="350" />
            <p class="title" v-text="album.name" />
            <p class="date" v-if="album.date" v-text="album.date.toLocaleDateString([], {month: 'long', day: 'numeric', year: 'numeric'})" />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Media from '@/components/UIElements/MediaEmbed.vue'

export default {
  name: 'MusicDiscography',
  props: [
    'mode'
  ],
  components: {
    Media
  },
  data: function() {
    return {
      reverseDiscography: false
    }
  },
  computed: {
    artistographySorted() {
      let artist_list = [...Object.values(this.$musicker.all_artists)]
      // TODO: Filter artists who are only in external references
      return artist_list
    },
    flashographySorted() {
      // Sort in chronological order of release
      let keys = Object.keys(this.$archive.music.flashes).sort((key1, key2) => {
        let timestamp1 = key1 in this.$archive.mspa.story && this.$archive.mspa.story[key1].timestamp ? this.$archive.mspa.story[key1].timestamp : new Date(this.$archive.music.flashes[key1].date).getTime()/1000
        let timestamp2 = key2 in this.$archive.mspa.story && this.$archive.mspa.story[key2].timestamp ? this.$archive.mspa.story[key2].timestamp : new Date(this.$archive.music.flashes[key2].date).getTime()/1000
        
        return timestamp1 - timestamp2
      })
      let result =  keys.filter(page => !this.$pageIsSpoiler(page) && page != '007326').map(page => {
        let flash = this.$archive.music.flashes[page]
        let tracks = []

        flash.tracks.forEach(track => tracks.push(this.linkReference(track)))
        
        if ('bolin' in flash) {
          flash.bolin.forEach(track => {
            if (!flash.tracks.includes(track)) tracks.push(this.linkReference(track) + ' (Removed 11/Jun/2010)')
          })
        }

        let pageData = this.getPage(page)
        return {
          title: pageData.title, 
          pageNum: pageData.pageNum,
          thumbnail: pageData.thumbnail,
          url: pageData.url,
          tracks
        }
      })
      if (this.$isNewReader) {
        result.push({
          title: '??????',
          tracks: ['Keep reading to unlock!']
        })
      }
      return result
    },
    filteredAlbums() {
      const all_albums = Object.values(this.$musicker.all_albums)
      const filtered_albums = all_albums
        .filter(a => !this.$albumIsSpoiler(a))
        .filter(a => a.directory != 'references-beyond-homestuck')

      filtered_albums.sort((a, b) => a.date - b.date)
      if (filtered_albums.length < all_albums.length) {
        filtered_albums.push({directory: 'TEASER'})
      }

      return filtered_albums
    },
    filteredSortedAlbums() {
      return this.reverseDiscography
       ? this.filteredAlbums.toReversed()
       : this.filteredAlbums
    }
  },
  methods: {
    // thnks florrie 👍
    joinNoOxford(array, plural = 'and') {
      if (array.length === 0) {
          return ''
      }

      if (array.length === 1) {
          return array[0]
      }

      if (array.length === 2) {
          return `${array[0]} ${plural} ${array[1]}`
      }

      return `${array.slice(0, -1).join(', ')} ${plural} ${array[array.length - 1]}`
    },
    linkArtists(array) {
      return array.map(artist => {
        if (typeof artist == 'string') return `<a href="/music/artist/${artist}">${this.$archive.music.artists[artist].name}</a>`
        else return `<a href="/music/artist/${artist.who}">${this.$archive.music.artists[artist.who].name}</a>${!!artist.what ? ` (${artist.what})` : ''}`
      })
    },
    linkReference(reference) {
      const track = this.$musicker.getTrackBySlug(reference)
      if (!track || this.$trackIsSpoiler(track)) {
        return '??????'
      }
      else if (reference in this.$archive.music.tracks) {
        return `<a href="/music/track/${this.$archive.music.tracks[reference].directory}">${this.$archive.music.tracks[reference].name}</a> <i>by ${this.joinNoOxford(this.linkArtists(this.$archive.music.tracks[reference].artists))}</i>`
      }
      else return reference
    },
    getPage(page){
      if (page in this.$archive.mspa.story) {
        let title = this.$archive.mspa.story[page].title
        let thumbnail = this.$mspaToViz(page).p
        let pageNum = (!/\D/.test(page) ? 'Page ' : '') + (this.$localData.settings.mspaMode ? page : thumbnail)
        let url = `/mspa/${page}`
        return {
          title, 
          pageNum,
          thumbnail,
          url
        }
      }
      else if (page == 'ps_titlescreen') return ({
        title: 'Problem Sleuth Titlescreen',
        pageNum: 'ps_titlescreen',
        thumbnail: 'ps_titlescreen',
        url: '/unlock/PS_titlescreen'
      })
      else if (page == 'assets://sweetbroandhellajeff/movies/SBAHJthemovie1.swf') return ({
        title: 'SBAHJthemovie1',
        pageNum: 'SBAHJthemovie1',
        thumbnail: 'SBAHJthemovie1',
        url: 'assets://sweetbroandhellajeff/movies/SBAHJthemovie1.swf'
      })
      else return ({
        title: page,
        pageNum: page,
        url: undefined,
        thumbnail: undefined,
      })
    }
  }
}
</script>

<style scoped lang="scss">
.discographyPage {
  h2.trackTitle {
    font: normal 28px/1em 'Helvetica Neue', Helvetica, Arial, sans-serif;
    margin: -4px 30px 8px 0; /* right margin equal to space between columns */
    word-wrap: break-word;
    max-width: 726px;
  }
  .discography {
    .reverseButton {
      display: inline-block;
      background: #619aa9;
      border: none;
      border-radius: 3px;
      text-align: center;
      font-weight: bold;
      padding: 5px;
      margin-bottom: 15px;
      color: #fff;
      width: 150px;

      &:hover {
        text-decoration: underline;
        cursor: pointer;
      }
    }
    .albums {
      display: flex;
      flex-flow: row wrap;
    }
    .album {
      margin-bottom: 30px;
      margin-right: 30px;
      width: 232px;
      &:nth-child(3n) {
        margin-right: 0;
      }
      .art {
        width: 232px;
        display: block;
      }
      .title {
        width: 100%;
        font-weight: bold;
        font-size: 108%;
        margin: 0.7em 0 0.3em 0;
        .artistOverride {
          font-weight: normal;
          font-size: 95%;
        }
      }
    }
  }

  .trackography {
    .album {
      margin-bottom: 30px;
      display: flex;
      flex-flow: row;

      &:last-child {
        margin-bottom: 0;
      }
      
      .thumbnail {
        margin-right: 15px;

        .coverArt {
          display: block;
          width: 150px;
          height: 150px;
          margin: 0 auto;

          img {
            width: 100%;
            height: 100%;
            outline: 1px solid rgba(0,0,0,0.25);
          }

          &:after {
            display: none;
          }
        }
        .date {
          padding-top: 5px;
          text-align: center;
          font-style: italic;
        }
      }

      h2 {
        font-size: 20px;
        margin-top: 0;
      }

      ul, ol {
        list-style-position: inside;
        ::v-deep {
          li {
            padding: 3px 0;
            color: var(--page-links-visited);
            .spoiler {
              color: var(--font-default);
            }
            a {
              padding-right: 6px;
            }
          }
        }
      }
    }
  }

  .flashography {
    .album {
      margin-bottom: 30px;
      display: flex;
      flex-flow: row;

      &:last-child {
        margin-bottom: 0;
      }
      
      .thumbnail {
        margin-right: 15px;

        .coverArt {
          display: block;
          width: 90px;
          height: 90px;

          img {
            width: 100%;
            height: 100%;
            outline: 1px solid rgba(0,0,0,0.25);
          }

          &:after {
            display: none;
          }
        }
        .date {
          padding-top: 5px;
          text-align: center;
          font-style: italic;
        }
      }
      h2 {
        font-size: 20px;
        margin-top: 0;
      }
      ul, ol {
        list-style-position: inside;
        ::v-deep {
          li {
            padding: 3px 0;
            // color: var(--page-links-visited);
          }
        }
      }
    }
  }

  .artistography {
    .artists {
      column-count: 3;
      font-size: 15px;
      list-style-position: inside;
    }
  }
}
</style>

