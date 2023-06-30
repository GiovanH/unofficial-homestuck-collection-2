<template>
  <div class="container">
    <div class="metadata">
      <div :title="$getChapter(thisPage.pageId)">
        <p v-text="pageId"/>
        <p v-html="vizLink"/>
      </div>
      <time
        :datetime="datetime.toFormat('yyyy-MM-dd ttt')"
        :data-timestamp="thisPage.timestamp">
        <span v-text="datetime.toFormat('LLL dd yyyy')"/>
        <span v-text="datetime.toFormat('t ZZZZ')"/>
      </time>
    </div>
    <div class="metadata tagbox" style="margin-top: 1em;">
      <!-- <button @click="booru.$asyncComputed.booru_token.update">{{booru.booru_token || 'None'}}</button> -->
      <table>
        <tr><th v-if="booru.is_authenticated" /><th>Tag</th><th>#</th></tr>
        <tr v-for="vote_count, tag in tags">
          <td class="link" :title="our_tags" v-if="booru.is_authenticated && our_tags && our_tags.includes(tag)" @click="removeVoteFor(tag)">-</td>
          <td class="link" :title="our_tags"  v-else-if="booru.is_authenticated" @click="doVoteFor(tag)">+</td>
          <td v-text="tag" />
          <td v-text="vote_count" />
        </tr>
      </table>
      <hr />
      <template v-if="booru.is_authenticated">
        <label>New tag</label>
        <vue-simple-suggest
            v-model="new_tag_input_value"
            :list="tagSuggestions"
            display-attribute="value"
            value-attribute="value"
            @select="onSuggestSelect"
            :filter-by-query="true"
            :max-suggestions="15"
            ref="suggest"
          >
          <input
            class="jumpBoxInput"
            ref="input"
            type="text"
            spellcheck="false"
            v-model="new_tag_input_value"
            @keydown.enter="submitNewTag"
          />
        </vue-simple-suggest>
        <!-- <input @keydown.enter="submitNewTag" /> -->
        <hr />
      </template>
      <a href="/booru" target="_blank">Settings</a>
    </div>
  </div>
</template>

<script>

import VueSimpleSuggest from 'vue-simple-suggest'
import BooruApi from '@/booruapi.js'

const getApi = BooruApi.getApi

export default {
  name: 'Metadata',
  // mixins: [ BooruApi ],
  props: [
    'thisPage'
  ],
  components: {
    VueSimpleSuggest
  },
  data: function() {
    return {
      DateTime: require('luxon').DateTime,
      // taghost: "http://127.0.0.1:5000",
      new_tag_input_value: "",
      ad_hoc_suggestions: [],
      booru: getApi()
    }
  },
  asyncComputed: {
    all_tags: {
      default: [],
      async get () {
        return await this.booru.getAllTags()
      }
    },
    tags: {
      default: {},
      async get () {
        return await this.booru.getPageTags(this.pageId)
      }
    },
    our_tags: {
      default: [],
      async get () {
        if (this.booru.booru_token) {

          try {
            return await this.booru.getOurTagsOfPage(this.pageId)
          } catch (e) {
            this.$logger.error(e)
            return []
          }
        }
        return [] // Not logged in
      }
    }
  },
  methods: {
    updateTags() {
      this.$asyncComputed.tags.update()
      this.$asyncComputed.our_tags.update()
    },
    onSuggestSelect(event){
      this.new_tag_input_value = event.value
      this.$refs.suggest.hideList()
      this.$nextTick(() => this.$refs.input.select())
    },
    submitNewTag(event) {
      if (!this.$refs.suggest.hovered) {
        const value = event.target.value
        event.target.value = ""
        this.new_tag_input_value = ""
        this.doVoteFor(value)
      }
    },
    doVoteFor(value) {
      if (this.our_tags.includes(value)) {
        this.$logger.error("Can't vote twice for", value)
        return
      }

      this.$logger.info("Voting", value)
      this.booru.doVoteFor(this.pageId, value).then(_ => {
        this.updateTags()
      })

      this.ad_hoc_suggestions.push(value)
    },
    removeVoteFor(value) {
      if (!this.our_tags.includes(value)) {
        this.$logger.error("No vote to delete for", value)
        return
      }

      this.$logger.info("UnVoting", value)
      this.booru.doRemoveVoteFor(this.pageId, value).then(_ => {
        this.updateTags()
      })
    }
  },
  watch: {
    'thisPage'(to, from) {
      this.updateTags()
    },
  },
  // mounted() {
  //   this.updateTags()
  // },
  computed: {
    pageId() {
      return `${this.thisPage.storyId}/${this.thisPage.pageId}`
    },
    tagSuggestions() {
      return [...new Set([
        ...this.all_tags.map(t => {return {value: t.tag}}),
        ...this.ad_hoc_suggestions
      ])]
    },
    datetime() {
      if (!this.thisPage.timestamp) {
        return undefined
      } else {
        try {
          return this.DateTime.fromSeconds(Number(this.thisPage.timestamp)).setZone("America/New_York")
        } catch {
          return NaN
        }
      }
    },
    vizLink() {
      const viz = this.$mspaToViz(this.thisPage.pageId)
      return `${viz.s}/&ZeroWidthSpace;${viz.p}` 
    }
  }
}
</script>

<style scoped lang="scss">
.container {
  position: absolute;
  left: 7px;

  input {
    max-width: 100%;
    width: calc(100% - 10px);
  }
}


.pageBody {
  .metadata {
    font-size: 117%;
    max-width: 135px;
    background-color: rgba(255, 255, 255, 0.5);
    border: 1px solid black;
    border-top-color: white;
    border-left-color: white;
  }
  .tagbox {
    table {
      width: 100%;
    }
    td {
      font-size: 14px;
      font-family: sans-serif;
    }
    .link {
      // text-decoration: underline;
      // &:hover {
        cursor: pointer;
      // }
    }
  }
  // WIP: Nudge box out of supercartridge panels
  // &.supercartridge .metadata {
  //   left: calc(-135px - 7px);
  // }
}
.x2 .pageBody.two .container {
  left: 630px; width: 135px; 
}

.pageBody .metadata { 
  color: black; 
  text-align: center; 
  font-weight: normal; 
  text-shadow: 1px 1px white; 
}
.pageBody .metadata span, 
.pageBody .metadata p { 
  display: block; margin: 0.5em 0.35em; 
}

::v-deep .suggestions {
  background-color: var(--ctx-bg);
  border: solid 1px var(--ctx-frame);
  color: var(--font-ctx);

  font-size: 14px;
  font-family: sans-serif;
  font-weight: normal;

  li {
    padding: .25em;
  }
  list-style: none;

  li[aria-selected="true"] {
    background: var(--ctx-select);
  }

  z-index: 5;
  padding: 5px;
  outline: none;
  cursor: default;
  position: fixed;
  user-select: none;
  white-space: nowrap;
}
</style>
