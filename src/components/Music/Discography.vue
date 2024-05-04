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

          <p v-if="album.artist_contribs" class="date">
            by
            <ol class="nameList">
              <li v-for="c, i in album.artist_contribs" :key="i"
                :set="artist = $musicker.getArtistByName(c.who)">
                <a :href="artist.uhcLink" v-text="artist.name"/>
              </li>
            </ol>
          </p>
        </div>
        <div>
          <h2 class="trackTitle" v-if="album.directory == 'TEASER'">??????</h2>
          <a :href="album.uhcLink" v-else>
            <h2 class="trackTitle">{{album.name}}</h2>
          </a>
          <TrackList v-if="album.directory != 'TEASER'" :thinglist="album.tracks" :iscompilation="!album.artist_contribs" />
          <span v-else>Keep reading to unlock!</span>
        </div>
      </div>
    </div>
    <div class="artistography" v-else-if="mode == 'artists'">
      <h2 class="trackTitle">Artists:</h2>
      <ul class="artists">
        <li v-for="artist in artistographyFilteredSorted" :key="artist.directory">
          <a :href="artist.uhcLink" v-text="artist.name" />
        </li>
      </ul>
      <span v-if="$isNewReader"><br />Continue reading to unlock more info!</span>
    </div>
    <div class="flashography" v-else-if="mode == 'features'">
      <div v-for="section in flashGroupsFiltered" class="flashGroup">
        <h1 v-html="section.name" />
        <template v-for="flash in section.flash_list">
          <!-- <div class="album teaser" v-if="($isNewReader && !flash.viz_page) || $pageIsSpoiler($vizToMspa('homestuck', flash.viz_page))">
            <div class="thumbnail">
              <a class="coverArt">
                <Media url="/archive/music/spoiler.png" />
              </a>
            </div>
            <div >
              <h2 class="trackTitle flashTitle">Continue reading to unlock</h2>
            </div>
          </div> -->
          <div class="album" >
            <div class="thumbnail">
              <a :href="flash.uhcLink"  target="_blank" class="coverArt">
                <Media :url="flash.artpath || 'assets://archive/music/spoiler.png'" />
              </a>
              <p v-if="flash.date" class="date" v-text="flash.date.toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'})" />
            </div>
            <div>
              <StoryPageLink v-if="flash.viz_page" :mspaId="$vizToMspa('homestuck', flash.viz_page).p" long titleOnly class="trackTitle flashTitle" />
              <a :href="flash.uhcLink" v-else-if="flash.uhcLink" target="_blank"><h2 class="trackTitle flashTitle" v-text="flash.name"/></a>
              <h2 class="trackTitle flashTitle" v-text="flash.name" v-else />
              <TrackList :reflist="flash.track_names" :iscompilation="true" />
            </div>
          </div>
        </template>

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
            <Media class="art" :url="album.artpath || 'assets://archive/music/spoiler.png'" width="350" />
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
import TrackList from '@/components/Music/TrackList.vue'
import StoryPageLink from '@/components/UIElements/StoryPageLink.vue'

export default {
  name: 'MusicDiscography',
  props: [
    'mode'
  ],
  components: {
    Media, TrackList, StoryPageLink
  },
  data: function() {
    return {
      reverseDiscography: false
    }
  },
  computed: {
    nonSpoilerArtistAlbums() {
      return this.$musicker.all_albums_sorted
        .filter(a => !this.$albumIsSpoiler(a))
        .filter(a => a.directory != 'references-beyond-homestuck')
    },
    artistographyFiltered() {
      const artist_list = Object.values(this.$musicker.reg_artists)
        .filter(artist => artist.directory != 'homestuck')
        .filter(artist => {
          const all_credits = this.$musicker.creditGroupsForArtistInAlbums(
              this.nonSpoilerArtistAlbums,
              artist
            )
            .map(albumcredit => albumcredit.credits)
            .flat()

          if (all_credits.length > 0 && !this.$isNewReader) return true

          // If any track isn't a spoiler, artist isn't a spoiler
          // if (all_credits.length > 0) {
          //   return true
          // }
          for (const {track} of all_credits) {
            if (!this.$trackIsSpoiler(track)) {
              return true
            }
          }

          return false
        })

        return artist_list
    },
    artistographyFilteredSorted() {
      const artist_list = this.artistographyFiltered
      artist_list.sort((a, b) => a.name - b.name)
      return artist_list
    },
    flashGroupsFiltered() {
      const flashIsNotSpoiler = (flash) => {
        if (!this.$isNewReader) return true
        // Flashes without page info are spoilers
        if (!flash.viz_page) return false

        return (!this.$pageIsSpoiler(
          this.$vizToMspa('homestuck', flash.viz_page).p
        ))
      }
      return this.$musicker.flash_groups_sorted
        .map(({name, flash_list}) => {
          return {
            name,
            flash_list: flash_list
              .filter(flashIsNotSpoiler)

          }
        })
        .filter(({name, flash_list}) => flash_list.length > 0)
    },
    // flashographySorted() {
    //   return this.$musicker.all_flashes_sorted.map(flash => {
    //     if (flash.viz_page) {
    //       const pageNum = this.$vizToMspa('homestuck', flash.viz_page)
    //       let pageData = this.getPage(pageNum.p)

    //       return {
    //         title: flash.name,
    //         pageNum: pageNum.p,
    //         thumbnail: `/archive/music/flash/${pageData.thumbnail}.png`,
    //         url: pageData.url,
    //         track_names: flash.track_names,
    //         date: flash.date
    //       }
    //     } else {
    //       const ref_track = this.$musicker.thingFromReference(flash.track_names[0])
    //       return {
    //         title: flash.name,
    //         pageNum: undefined,
    //         thumbnail: (ref_track || {}).artpath,
    //         url: '/skaianet',
    //         track_names: flash.track_names,
    //         date: flash.date
    //       }
    //     }
    //   })

    //   // Sort in chronological order of release
    //   // let keys = Object.keys(this.$archive.music.flashes).sort((key1, key2) => {
    //   //   let timestamp1 = key1 in this.$archive.mspa.story && this.$archive.mspa.story[key1].timestamp ? this.$archive.mspa.story[key1].timestamp : new Date(this.$archive.music.flashes[key1].date).getTime()/1000
    //   //   let timestamp2 = key2 in this.$archive.mspa.story && this.$archive.mspa.story[key2].timestamp ? this.$archive.mspa.story[key2].timestamp : new Date(this.$archive.music.flashes[key2].date).getTime()/1000

    //   //   return timestamp1 - timestamp2
    //   // })
    //   // let result =  keys.filter(page => !this.$pageIsSpoiler(page) && page != '007326').map(page => {
    //   //   let flash = this.$archive.music.flashes[page]
    //   //   let tracks = []

    //   //   flash.tracks.forEach(track => tracks.push(this.linkReference(track)))

    //   //   if ('bolin' in flash) {
    //   //     flash.bolin.forEach(track => {
    //   //       if (!flash.tracks.includes(track)) tracks.push(this.linkReference(track) + ' (Removed 11/Jun/2010)')
    //   //     })
    //   //   }

    //   //   let pageData = this.getPage(page)
    //   //   return {
    //   //     title: pageData.title,
    //   //     pageNum: pageData.pageNum,
    //   //     thumbnail: pageData.thumbnail,
    //   //     url: pageData.url,
    //   //     tracks
    //   //   }
    //   // })
    //   // if (this.$isNewReader) {
    //   //   result.push({
    //   //     title: '??????',
    //   //     tracks: ['Keep reading to unlock!']
    //   //   })
    //   // }
    //   // return result
    // },
    filteredAlbums() {
      let filtered_albums = this.$musicker.all_albums_sorted
        .filter(a => !this.$albumIsSpoiler(a))

      if (filtered_albums.length < this.$musicker.all_albums_sorted.length) {
        filtered_albums.push({directory: 'TEASER'})
      }

      filtered_albums = filtered_albums
        .filter(a => a.directory != 'references-beyond-homestuck')

      return filtered_albums
    },
    filteredSortedAlbums() {
      return this.reverseDiscography
       ? this.filteredAlbums.toReversed()
       : this.filteredAlbums
    }
  },
  methods: {
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
    },
    // Legacy flashography:
    // joinNoOxford(array, plural = 'and') {
    //   if (array.length === 0) {
    //       return ''
    //   }

    //   if (array.length === 1) {
    //       return array[0]
    //   }

    //   if (array.length === 2) {
    //       return `${array[0]} ${plural} ${array[1]}`
    //   }

    //   return `${array.slice(0, -1).join(', ')} ${plural} ${array[array.length - 1]}`
    // },
    // linkArtists(array) {
    //   return array.map(artist => {
    //     if (typeof artist == 'string') return `<a href="/music/artist/${artist}">${this.$archive.music.artists[artist].name}</a>`
    //     else return `<a href="/music/artist/${artist.who}">${this.$archive.music.artists[artist.who].name}</a>${!!artist.what ? ` (${artist.what})` : ''}`
    //   })
    // },
    // linkReference(reference) {
    //   const track = this.$musicker.getTrackBySlug(reference)
    //   if (!track || this.$trackIsSpoiler(track)) {
    //     return '??????'
    //   }
    //   else if (reference in this.$archive.music.tracks) {
    //     return `<a href="/music/track/${this.$archive.music.tracks[reference].directory}">${this.$archive.music.tracks[reference].name}</a> <i>by ${this.joinNoOxford(this.linkArtists(this.$archive.music.tracks[reference].artists))}</i>`
    //   }
    //   else return reference
    // },
  }
}
</script>

<style scoped lang="scss">
.discographyPage {
  h2.trackTitle, .flashTitle {
    font: normal 28px/1em 'Helvetica Neue', Helvetica, Arial, sans-serif;
    margin: -4px 30px 8px 0; /* right margin equal to space between columns */
    word-wrap: break-word;
    max-width: 726px;
  }
  span.flashTitle {
    font: normal 24px/1em 'Helvetica Neue', Helvetica, Arial, sans-serif;
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
            // a {
            //   padding-right: 6px;
            // }
          }
        }
      }
    }
  }

  .flashography {
    div.teaser + div.teaser {
      display: none;
    }
    .flashGroup {
      padding-bottom: 1em;
      h1 {
        font-family: Courier New;
        font-size: 24px;
        font-weight: bold;
        padding-bottom: 1em;
      }
    }
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
        margin-top: .5em;
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

