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
    <div class="metadata tagbox">
      <table>
        <tr><th></th><th>Tag</th><th>#</th></tr>
        <tr v-for="count, tag in tags">
          <td class="link" v-if="ourtags.includes(tag)">-</td>
          <td class="link" v-else @click="doVoteFor(tag)">+</td>
          <td v-text="tag" />
          <td v-text="count" />
        </tr>
      </table>
      <input @keydown.enter="submitNewTag"></input>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Metadata',
  props: [
    'thisPage'
  ],
  components: {
  },
  data: function() {
    return {
      DateTime: require('luxon').DateTime,
      taghost: "http://127.0.0.1:5000",
      tags: {},
      ourtags: [],
    }
  },
  methods: {
    updateTags() {
      this.tags = {}
      this.ourtags = []

      fetch(`${this.taghost}/${this.pageIdSlug}/tags`)
        .then(r => r.json())
        .then(json => this.tags = json)

      fetch(`${this.taghost}/${this.pageIdSlug}/own`)
        .then(r => r.json())
        .then(json => this.ourtags = json)
    },
    submitNewTag(event) {
      const value = event.target.value
      event.target.value = ""
      this.doVoteFor(value)
    },
    doVoteFor(value) {
      this.$logger.info("Voting", value)

      fetch(`${this.taghost}/${this.pageIdSlug}/vote/${value}`)
        .then(r => {
          this.updateTags()
        })
    }
  },
  watch: {
    'thisPage'(to, from) {
      this.updateTags()
    },
  },
  mounted() {
    this.updateTags()
  },
  computed: {
    pageId() {
      return `${this.thisPage.storyId}/${this.thisPage.pageId}`
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
</style>
