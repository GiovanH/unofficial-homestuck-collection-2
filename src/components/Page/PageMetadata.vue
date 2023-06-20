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
      <button @click="$asyncComputed.booru_token.update">{{booru_token || 'None'}}</button>
      <table>
        <tr><th v-if="booru_token" /><th>Tag</th><th>#</th></tr>
        <tr v-for="vote_count, tag in tags">
          <td class="link" :title="ourtags" v-if="booru_token && ourtags.includes(tag)" @click="removeVoteFor(tag)">-</td>
          <td class="link" :title="ourtags"  v-else-if="booru_token" @click="doVoteFor(tag)">+</td>
          <td v-text="tag" />
          <td v-text="vote_count" />
        </tr>
      </table>
      <hr />
      <template v-if="booru_token">
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
export default {
  name: 'Metadata',
  props: [
    'thisPage'
  ],
  components: {
    VueSimpleSuggest
  },
  data: function() {
    return {
      DateTime: require('luxon').DateTime,
      taghost: "http://127.0.0.1:5000",
      new_tag_input_value: "",
      ad_hoc_suggestions: []
    }
  },
  asyncComputed: {
    booru_token: {
      default: undefined,
      async get () {
        const gh_token = this.$localData.settings['githubToken']
        if (gh_token) {
          const resp = await fetch(`${this.taghost}/auth`, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({'gh_token': gh_token})
          })
          // this.$logger.info(await resp.text())
          return (await resp.json()).value
        } else {
          this.$logger.error("Can't attempt to get a booru_token without a gh_token")
          return undefined
        }
      }
    },
    all_tags: {
      default: [],
      async get () {
        return await fetch(`${this.taghost}/tags/all`)
          .then(r => r.json())
      }
    },
    tags: {
      default: {},
      async get () {
        return await fetch(`${this.taghost}/page/${this.pageIdSlug}/tags`)
          .then(r => r.json())
      }
    },
    ourtags: {
      default: [],
      async get () {
        if (this.$localData.settings['githubToken'] && this.booru_token) {
          const resp = await fetch(`${this.taghost}/page/${this.pageIdSlug}/own`,
              {credentials: "include",}
            )
          if (resp.status == 401) {
            this.$nextTick(() => {
              this.$asyncComputed.booru_token.update()
            })
          } else if (resp.status == 200) {
            return await resp.json()
          } else {
            this.$logger.error(await resp.json())
          }
          return [] // Error
        }
        return [] // Not logged in
      }
    }
  },
  methods: {
    updateTags() {
      this.$asyncComputed.tags.update()
      this.$asyncComputed.ourtags.update()
    },
    onSuggestSelect(event){
      this.new_tag_input_value = event.value
      this.$refs.suggest.hideList()
      document.activeElement.blur()
      // this.submitNewTag(event)
    },
    submitNewTag(event) {
      const value = event.target.value
      event.target.value = ""
      this.new_tag_input_value = ""
      this.doVoteFor(value)
    },
    doVoteFor(value) {
      if (this.ourtags.includes(value)) {
        this.$logger.error("Can't vote twice for", value)
        return
      }

      this.$logger.info("Voting", value)
      this.ad_hoc_suggestions.push(value)

      fetch(`${this.taghost}/page/${this.pageIdSlug}/vote/${value}`,
          {credentials: "include",}
        ).then(r => {
          this.updateTags()
        })
    },
    removeVoteFor(value) {
      if (!this.ourtags.includes(value)) {
        this.$logger.error("No vote to delete for", value)
        return
      }

      this.$logger.info("UnVoting", value)

      fetch(`${this.taghost}/page/${this.pageIdSlug}/unvote/${value}`,
          {credentials: "include",}
        ).then(r => {
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
      return [
        ...this.all_tags.map(t => {return {value: t.tag}}),
        ...this.ad_hoc_suggestions
      ]
    },
    pageIdSlug() {
      return this.pageId.replace('/', '-')
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
