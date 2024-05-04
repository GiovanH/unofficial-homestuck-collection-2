<template>
  <div class="pageBody customStyles">
    <div class="pageFrame">
      <NavBanner useCustomStyles="true" />
      <a href="/music" class="banner"><Media url="/archive/music/bannerCrop.png" /></a>
      <div class="pageContent">
        <div class="leftColumn">
          <Album v-if="thisAlbum" :album="thisAlbum"/>

          <Track v-else-if="thisTrack" :track="thisTrack" />
          
          <Artist v-else-if="thisArtist" :artist="thisArtist" />

          <Discography v-else :mode="routeParams.mode" />
        </div>
        <div class="rightColumn">
          <div class="sidebarItem">
            <a class="discogButton" href="/music">all albums</a><br>
            <a class="discogButton" href="/music/tracks">all tracks</a><br>
            <a class="discogButton" href="/music/artists">all artists</a><br>
            <a class="discogButton" href="/music/features">all features</a>
          </div>
          <div class="sidebarItem" v-if="$isNewReader">
            <p><strong>SPOILER WARNING:</strong> Expect all external links within this database to contain direct spoilers for the end of Homestuck. Click with care!</p>
          </div>
          <div class="sidebarItem">
            <p>This information is current as of the <br><strong>14th February, 2022</strong>.<br> For more recent info, deeper categorization, and unofficial albums, visit the <a href="https://hsmusic.wiki/">Homestuck Music Wiki.</a></p>
            <br>
            <p>If you're enjoying the tunes, how about dropping some money on the albums at the <a href="https://homestuck.bandcamp.com/">Official Homestuck Bandcamp?</a></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

import NavBanner from '@/components/UIElements/NavBanner.vue'
import Media from '@/components/UIElements/MediaEmbed.vue'

import Album from '@/components/Music/Album.vue'
import Artist from '@/components/Music/Artist.vue'
import Discography from '@/components/Music/Discography.vue'
import Track from '@/components/Music/Track.vue'

export default {
  name: 'Music',
  props: [
    'tab', 'routeParams'
  ],
  components: {
    NavBanner, 
    Media,
    Album,
    Artist, 
    Discography, 
    Track
  },
  title: function(ctx) {
    var title = 'Homestuck Music'
    if (ctx.routeParams.mode == 'tracks') title = `All tracks - Homestuck Music`
    else if (ctx.routeParams.mode == 'artists') title = `All artists - Homestuck Music`
    else if (ctx.routeParams.mode == 'features') title = `All features - Homestuck Music`
    else if (ctx.routeParams.mode == 'album') title = `${ctx.$musicker.getAlbumBySlug(ctx.routeParams.id).name} - Homestuck Music`
    else if (ctx.routeParams.mode == 'track') title = `${ctx.$musicker.getTrackBySlug(ctx.routeParams.id).name} - Homestuck Music`
    else if (ctx.routeParams.mode == 'artist') title = `${ctx.$musicker.getArtistBySlug(ctx.routeParams.id).name} - Homestuck Music`
    return title
  },
  data: function() {
    return {
    }
  },
  computed: {
    thisAlbum() {
      // let mode // unused?
      const key = this.routeParams.id || undefined

      if (this.routeParams.mode == 'album') {
        return this.$musicker.getAlbumBySlug(key)
      } else {
        return undefined
      }
      // return (this.routeParams.mode == 'album' && key in this.$archive.music.albums) ? this.$archive.music.albums[key] : undefined
    },
    thisTrack() {
      const key = this.routeParams.id || undefined
      if (this.routeParams.mode == 'track') {
        return this.$musicker.getTrackBySlug(key)
      } else {
        return undefined
      }
      // return (this.routeParams.mode == 'track' && key in this.$archive.music.tracks) ? this.$archive.music.tracks[key] : undefined
    },
    thisArtist() {
      let key = this.routeParams.id || undefined
      if (this.routeParams.mode == 'artist') {
        return this.$musicker.getArtistBySlug(key)
      } else {
        return undefined
      }
      // return (this.routeParams.mode == 'artist' && key in this.$archive.music.artists) ? this.$archive.music.artists[key] : undefined
    }
  },
  methods: {
  }
}
</script>

<style scoped lang="scss">
  .pageBody {
    margin: 0;
    padding: 0;
    display: flex;
    flex-flow: column;
    flex: 1 0 auto;
    align-items: center;
    background: var(--page-pageBody);
    font: 13px/1.231 'Helvetica Neue', Helvetica, Arial, sans-serif;

    ::v-deep {
      color: var(--font-default);
      a {
        color: var(--page-links);
      }
    }

    .navBanner {
      width: 975px;
      border-bottom: none !important;
    }
    .banner img {
      display: block;
      background: var(--page-pageContent);
      border-bottom: solid 7px var(--page-pageBorder, var(--page-pageFrame));
    }
    .pageFrame {
      margin: 0 auto;
      border: solid 7px var(--page-pageBorder, var(--page-pageFrame));
      margin-bottom: 30px;
      border-top: none;
      box-sizing: content-box;

      flex: 0 1 auto;
      display: flex;
      flex-flow: column nowrap;
      justify-content: center;
      align-items: center;
      align-content: center;
      .pageContent{
        background: var(--page-pageContent);
        padding: 30px;

        .leftColumn {
          width: 756px;
          float: left;
        }
        .rightColumn {
          max-width: 129px;
          margin-left: 30px;
          float: right;

          .sidebarItem {
            margin-bottom: 20px;

            .title {
              font-size: 16px;
              font-weight: normal;
              margin-bottom: 10px;
              a {
                color: #000000;
              }
            }

            .discogButton {
              display: inline-block;
              margin-bottom: 5px;
              background: #619aa9;
              border: none;
              border-radius: 3px;
              text-align: center;
              font-weight: bold;
              padding: 5px 0;
              color: #fff;
              width: 100%;

              &:hover {
                text-decoration: underline;
                cursor: pointer;
              }
            }

          }
        }
    
        ::v-deep {
          a {
            text-decoration: none;
            &:hover {
              text-decoration: underline;
            }
          }
        } 
      }
    }

  }

</style>

<style scoped lang="scss">
::v-deep .leftColumn {
  // Common styles for bandcamp
  font: 13px/1.231 'Helvetica Neue', Helvetica, Arial, sans-serif;

  h2.trackTitle {
    font: normal 28px/1em 'Helvetica Neue', Helvetica, Arial, sans-serif;
    margin: -4px 30px 8px 0; /* right margin equal to space between columns */
    word-wrap: break-word;
    max-width: 726px;
  }

  .nameSection {
    float: left;
    .byArtist {
      width: 385px;
      font: normal 14px/1.25 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
  }

  .nameList, .linkList {
    display: inline;
    li { display: inline; }
    li + li {
      &:before { content: ", "; }
    }
  }

  .nameList {
    li + li {
      &:last-of-type:before { content: ", and "; }
    }
    li:first-of-type + li {
      &:last-of-type:before { content: " and "; }
    }
  }
  .linkList {
    li + li {
      &:last-of-type:before { content: ", or "; }
    }
    li:first-of-type + li {
      // Odd spacing here with the external link icon
      &:last-of-type:before { content: " or "; }
    }
  }

  .middleColumn {
    float: right;
    padding-bottom: 20px;
    width: 350px;
    img {
      outline: 1px solid rgba(0,0,0,0.25);
      width: 350px;
    }
    a::after {
      content: none;
    }
  }

  .info {
    float: left;
    width: 376px;

    .bandcamp {
      width: 100%;
      height: 42px;
      background: #303030;
    }

    > ol, > ul, > div, > p, > iframe {
      margin-top: 16px;
    }

    ol, ul {
      list-style-position: inside;
      // color: var(--page-links-visited);;
      &.groupList {
        margin-left: 20px;
      }
    }
    li {
      padding: 3px 0;
      // ::v-deep {
      //   a {
      //     padding-right: 6px;
      //   }
      // }
    }

    .bonusItems ul {
      list-style-position: inherit;
      padding-left: 1em;
    }

    .references, .referencedBy {
      ul {
        margin-left: 24px;
      }
    }
  }

  .commentaryHeader {
    clear: both;
    padding-top: 1em;
  }

  .commentaryContainer {
    padding-top: 24px;
    clear: both;

    .commentary-entry-heading {
      span { display: inline-block; }
      p {
        display: inline;
      }
    }

    .commentary {
      // white-space: pre-wrap;
      background-color: white;
      color: black;
      padding: 10px;
      border: solid 3px grey;
      p { margin: 1em 0; }
      p:first-child { margin-top: 0; }
      p:last-child { margin-bottom: 0; }
      // ::v-deep {
        a {
          color: #0000EE
        }
        img {
          max-width: 100%;
        }
        li, ul {
          // list-style-position: inside;
          margin-left: 1em;
        }
      // }
      &.lock {
        text-align: center;
        font-weight: bold;
      }
    }
  }

  .trackography {
    margin-top: 20px;
    .album {
      &:not(:last-child) {
        margin-bottom: 30px;
      }
      display: flex;
      flex-flow: row;

      &:first-child {
        margin-top: 0;
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
      .credits {
        >:not(:last-child) {
          margin-bottom: 10px;
        }
        .credit-what {
          font-style: italic;
        }
        ul {
          list-style-position: inside;
          ::v-deep {
            li {
              padding: 3px 0;
              .spoiler {
                color: var(--font-default);
              }
            }
          }
        }
      }
    }
  }
}
</style>