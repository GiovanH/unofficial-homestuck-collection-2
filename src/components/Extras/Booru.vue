<template>
  <GenericPage noPageContent="true">
    <section class="pageContent bigtable">
      <!-- <h2 class="pageTitle">Search results for {{query_tag}}</h2> -->
      <div class="row">
        <div class="col" style="width: 270px;">
          <h2>All Tags</h2>

          <table>
            <tr><th>Tag</th><th>#</th></tr>
            <tr v-for="entry in all_tags">
              <td>
                <a class="link"
                  :class="{'selected': (entry.tag == query_tag)}"
                  v-text="entry.tag"
                  @click="query_tag = entry.tag" />
              </td>
              <td v-text="entry.count" />
            </tr>
          </table>
        </div>
        <div class="col" style="width: 680px;">
          <h2 v-if="query_tag">Pages tagged "{{ query_tag }}"</h2>
          <h2 v-else>Pages</h2>

          <span v-if="cur_tag_info.canonical">aka {{ cur_tag_info.canonical }}</span>
          <span v-if="cur_tag_info.synonyms && cur_tag_info.synonyms.length > 0">aka {{ cur_tag_info.synonyms }}</span>

          <table style="width: 100%;">
            <colgroup>
               <col span="1" style="width: 80px;">
               <col span="1" style="">
               <col span="1" style="width: 50px;">
            </colgroup>
            <tr>
              <th class="link" @click="tag_sort_key = 0">ID</th>
              <th>Page</th>
              <th class="link" @click="tag_sort_key = 1">Score</th>
            </tr>
            <tr v-for="page_count, tag in tag_query_results">
              <td v-text="tag" />
              <td>
                <StoryPageLink long :mspaId='tag.replace(/^\d-/, "")'></StoryPageLink>
              </td>
              <td v-text="page_count" />
            </tr>
          </table>
        </div>
      </div>
    </section>
    <section class="pageContent" v-if="booru.is_admin">
      <h2 class="pageTitle">Tag details</h2>
      <pre v-text="cur_tag_info" />
    </section>
    <section class="pageContent" v-if="booru.is_admin">
      <h2 class="pageTitle">Synonyms</h2>
      <span class="row">
        Make inferior tag
        <div class="col">
          <select v-model="syno_inferior" >
            <option v-for="entry in all_tags" :value="entry.tag" :key="entry.tag">
              {{ entry.tag }}
            </option>
          </select>
          <!-- <input v-model="syno_inferior"> -->
          <span v-if="lookupTagCount(syno_inferior)">tag with <span v-text="lookupTagCount(syno_inferior)"/> votes</span>
          <span v-else>new tag</span>
        </div>

      </span>
      <span class="row">
        a synonym of canonical
        <div class="col">
          <select v-model="syno_canonical" >
            <option v-for="entry in all_tags" :value="entry.tag" :key="entry.tag">
              {{ entry.tag }}
            </option>
          </select>
          <input v-model="syno_canonical" @keydown.enter="makeSynonym">
          <span v-if="lookupTagCount(syno_canonical)">tag with <span v-text="lookupTagCount(syno_canonical)"/> votes</span>
          <span v-else>new tag</span>
        </div>
      </span>
      <button @click="makeSynonym">Go!</button>
    </section>
    <section class="pageContent">
      <h2 class="pageTitle">Booru Settings</h2>
    </section>
    <section class="pageContent">
      <!-- <h2 class="pageTitle">Log In</h2> -->
      <GithubLogin class="login sans"/>
    </section>
  </GenericPage>
</template>

<script>

import GenericPage from '@/components/UIElements/GenericPage.vue'
import GithubLogin from '@/components/UIElements/GithubLogin.vue'
import StoryPageLink from '@/components/UIElements/StoryPageLink.vue'
import BooruApi from '@/booruapi.js'

const getApi = BooruApi.getApi


export default {
  name: 'Booru',
  props: [
    'tab', 'routeParams'
  ],
  components: {
    GenericPage, GithubLogin, StoryPageLink
  },
  title: function(ctx) {
    return "Booru Settings"
  },
  data: function() {
    return {
      taghost: "http://127.0.0.1:5000",
      query_tag: undefined,
      tag_sort_key: 0,
      syno_inferior: "",
      syno_canonical: "",
      booru: getApi(),
      tag_query_results_cache: {}
    }
  },
  asyncComputed: {
    all_tags: {
      default: [],
      async get () {
        this.$logger.info("rerunning asyncComputed function for all_tags")
        return await this.booru.getAllTags()
      }
    },
    tag_query_results_raw: {
      default: {},
      async get () {
        this.$logger.info("rerunning asyncComputed function for tag_query_results_raw")
        if (!this.query_tag) return {}
        this.tag_query_results_raw = this.tag_query_results_cache[this.query_tag] || {} // Blank or cached while waiting
        return await this.booru.getPagesWithTag(this.query_tag)
      }
    },
    cur_tag_info: {
      default: {},
      async get () {
        this.$logger.info("rerunning asyncComputed function for cur_tag_info")
        if (!this.query_tag) return {}
        this.cur_tag_info = {} // Blank while waiting
        return await this.booru.getTagInfo(this.query_tag)
      }
    },
  },
  computed: {
    query_tag_href: {
      get() {
        return this.routeParams.query_tag ? decodeURIComponent(this.routeParams.query_tag) || '' : ''
      },
      set(newQuery) {
        this.$root.app.$pushURL(`/${this.routeParams.base}/tag/${encodeURIComponent(newQuery)}`)
      }
    },
    tag_query_results() {
      return Object.fromEntries(Object.entries(this.tag_query_results_raw).sort((a, b) => {
        if (a[this.tag_sort_key] < b[this.tag_sort_key]) return -1
        if (a[this.tag_sort_key] > b[this.tag_sort_key]) return 1
        return 0
      }))
    },
    tag_count(){
      return Object.fromEntries(this.all_tags.map(t => [t.tag, t.count]))
    }
  },
  methods: {
    lookupTagCount(query) {
      return this.tag_count[query]
      // const match = this.all_tags.filter(t => t.tag == query)
      // if (match) {
      //   return match[0]
      // }
      // return false
    },
    makeSynonym(){
      if (this.syno_inferior && this.syno_canonical) {
        this.booru.doMakeSynonym(this.syno_inferior, this.syno_canonical).then(r => {
          this.$asyncComputed.all_tags.update()
        })
        this.syno_inferior = ""
      }

    }
  },
  watch: {
    // Not reading/writing directly from href saves recomputes
    'query_tag_href'(to, from){
      if (this.query_tag != to) this.query_tag = to
    },
    'query_tag'(to, from){
      if (this.query_tag_href != to) this.query_tag_href = to
    },
    'tag_query_results_raw'(to, from){
      this.tag_query_results_cache[this.query_tag] = to
    },
  }
}
</script>

<style scoped lang="scss">
  section.pageContent {
    & + & {
      margin-top: 2em;
    }
    position: relative;
    table {
      margin-bottom: 1em;
      td {
        vertical-align: top;
      }
    }
  }

  .row {
    display: flex;
    flex-direction: row;
  }
  .col, .captioned {
    display: flex;
    flex-direction: column;
  }

  .bigtable {
    h2 {
      text-align: center;
    }
    .col {
      // max-height: calc(100vh - var(--address-bar-height));
      max-height: 80vh;
      overflow-y: scroll;
    }
  }

  // table.bigview {
  //   > tr {
  //     max-height: 100vh;
  //     > td {
  //       overflow: scroll;
  //       max-height: 100vh;
  //     }
  //   }
  //   td {
  //   }
  // }

  a, .link {
    text-decoration: underline;
    cursor: pointer;
  }

  .sans {
    font-size: 16px;
    font-weight: normal;
    font-family: Verdana, Arial, Helvetica, sans-serif;
  }

  .login {
    &.container {
      padding: 25px 50px;
      margin: 25px 50px;

      border: solid 5px var(--page-pageBorder, var(--page-pageFrame));
      box-sizing: border-box;
      background: var(--page-pageContent);

      display: flex;
      flex: 0 1 auto;
      flex-flow: column nowrap;
      align-items: center;
      align-content: center;

    }
    ::v-deep {
      *:last-child {
        margin-bottom: 0;
      }
      button {
        margin: 1em;
      }
      .token, .footnote {
        font-size: 10px;
      }
      .oauth-code {
        display: block;
        font-family: monospace;
        font-size: 52px;
        font-weight: bold;
        user-select: all;
        cursor: pointer;
      }
    }
  }
</style>

