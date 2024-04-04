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
          <li v-for="name, i in track.artist_names" :key="i" >
            <a :href="$musicker.getArtistByName(name).uhcLink" v-text="name"/>
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
        <span class="release" v-if="track.date">Released {{track.date}}</span>
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
      <div class="referencedBy" v-if="track.referencedBy && track.referencedBy.length > 0">Tracks that reference <i>{{track.name}}</i>:
        <ul>
          <li v-for="reference in track.referencedBy" v-html="linkReference(reference)"/>
        </ul>
      </div> -->
    </div>

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
.trackPage {
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
    

    ol {
      list-style-position: inside;
      color: var(--page-links-visited);;
    }
    li {
      padding: 3px 0;
      // a, span {
      //   padding-right: 6px;
      // }
    }

    .references, .referencedBy, .featuredIn {
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

