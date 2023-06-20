<template>
  <GenericPage noPageContent="true">
    <section class="pageContent">
      <h2 class="pageTitle">Booru Settings</h2>
    </section>
    <section class="pageContent">
      <h2 class="pageTitle">Log In</h2>
      <GithubLogin class="login sans"/>
    </section>
    <section class="pageContent">
      <h2>All Tags</h2>
      <table>
        <tr><th>Tag</th><th>#</th></tr>
        <tr v-for="entry in tags">
          <td><a class="link" v-text="entry.tag" @click="query_tag = entry.tag" /></td>
          <td v-text="entry.count" />
        </tr>
      </table>
    </section>
    <section v-if="query_tag" class="pageContent">
      <h2 class="pageTitle">Pages tagged {{ query_tag }}</h2>
      <table>
        <tr><th>Tag</th><th>#</th></tr>
        <tr v-for="page_count, tag in tag_query_results">
          <td><a class="link" v-text="tag" @click="query_tag = tag" /></td>
          <td v-text="page_count" />
        </tr>
      </table>
    </section>
  </GenericPage>
</template>

<script>

import GenericPage from '@/components/UIElements/GenericPage.vue'
import GithubLogin from '@/components/UIElements/GithubLogin.vue'

export default {
  name: 'Booru',
  props: [
    'tab', 'routeParams'
  ],
  components: {
    GenericPage, GithubLogin
  },
  title: function(ctx) {
    return "Booru Settings"
  },
  data: function() {
    return {
      taghost: "http://127.0.0.1:5000",
      query_tag: undefined
    }
  },
  asyncComputed: {
    tags: {
      default: {},
      async get () {
        return await fetch(`${this.taghost}/tags/all`)
          .then(r => r.json())
      }
    },
    tag_query_results: {
      default: {},
      async get () {
        return await fetch(`${this.taghost}/tags/${this.query_tag}`)
          .then(r => r.json())
      }

    }
  },
  computed: {
  },
  methods: {
  },
  updated() {
  },
  mounted() {
  }
}
</script>

<style scoped lang="scss">
  section.pageContent {
    & + & {
      margin-top: 2em;
    }
  }

  a {
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

