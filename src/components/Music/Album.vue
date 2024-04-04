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
      <h3 class="byArtist">
        by
        <ol class="nameList">
          <li v-for="name, i in album.artist_names" :key="i" >
            <a :href="$musicker.getArtistByName(name).uhcLink" v-text="name"/>
          </li>
        </ol>
      </h3>
      <h3 class="byArtist" v-if="album.cover_artist_names">
        cover art by
        <ol class="nameList">
          <li v-for="name, i in album.cover_artist_names" :key="i">
            <a :href="$musicker.getArtistByName(name).uhcLink" v-text="name"/>
          </li>
        </ol>
      </h3>
    </div>

    <div class="middleColumn">
      <a :href="album.artpath">
        <Media :url="album.artpath" />
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

      <p class="date" v-if="album.date">Released {{album.date}}</p>

      <!-- v-if="album.uses_sections" -->
      <div class="albumGroup">
        <div class="albumGroup" v-for="[section_name, track_list] in Object.entries(album.track_sections)" :key="section_name">
          <p v-if="section_name != 'Unsorted'">
            <em>{{section_name}}:</em>
          </p>
          <ol class="groupList">
            <li v-for="track in track_list" :key="track.directory">
              <a :href="track.uhcLink" v-text="track.name" />
            </li>
          </ol>
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

    <div v-if="album.commentary" class="commentaryContainer">
      <p class="commentaryHeader">Album Commentary:</p>
      <p class="commentary" ref="commentary" v-if="!$isNewReader" v-html="album.commentary.replace(/\n/g, '<br>')" />
      <p class="commentary lock" ref="commentary" v-else>
        <span class="lock">Finish Homestuck to unlock inline commentary!</span>
      </p>
    </div>

    <pre v-html="album" />
  </div>
</template>

<script>
import Media from '@/components/UIElements/MediaEmbed.vue'
import Resources from '@/resources.js'

export default {
  name: 'MusicAlbum',
  mixins: [ Resources.UrlFilterMixin ],
  props: [
    'album'
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
    groupIsSpoiler(group) {
      return this.$isNewReader && !group.find(track => !(track).includes('>??????<'))
    },
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

<style scoped lang="scss">
.albumPage {
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
      &:last-of-type:before { content: "or "; }
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
      ::v-deep {
        a {
          padding-right: 6px;
        }
      }
    }

    .references, .referencedBy {
      ul {
        margin-left: 24px;
      }
    }
  }
  
  .commentaryContainer {
    padding-top: 24px;
    clear: both;

    .commentary {
      white-space: pre-wrap;
      background-color: white;
      color: black;
      padding: 10px;
      border: solid 3px grey;
      ::v-deep {
        a {
          color: #0000EE
        }
        img {
          max-width: 100%;
        }
        li, ul {
          list-style-position: inside;
        }
      }
      &.lock {
        text-align: center;
        font-weight: bold;
      }
    }
  }
}
</style>

