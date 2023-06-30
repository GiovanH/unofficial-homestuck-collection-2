<template>
  <div class="container">
    <!-- <span>
      <a @click="oauth_code = 'FISH-0413'; token = undefined">1</a>
      <a @click="token = 'fish'">2</a>
      <a @click="token = oauth_code = undefined">3</a>
    </span> -->

    <div v-if="token">
      <p>Logged in as <b :alt="token">{{ user_name_friendly }}</b></p>
      <p style="text-align: center" class="token">{{ user_info.id }}</p>
    </div>
    <p v-else>Not authenticated</p>

    <div v-if="!token && !oauth_code">
      <button @click="login">Login with GitHub</button>
    </div>
    <template v-else-if="!token && oauth_code">
      <span class="oauth-code">{{ oauth_code }}</span>
      <span class="instructions">
        Copy the above code and paste it <a :href="verification_uri">here</a>
      </span>
    </template>
    <button v-else-if="token" @click="logout">Log Out</button>
    <!-- <a class="footnote" :href="`https://github.com/settings/connections/applications/${client_id}`">Review or Revoke on Github.com</a> -->
  </div>
</template>

<script>

const ipcRenderer = (require('electron').ipcRenderer)

const wait = function (ms = 1000) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};
const poll = async function (fn, fnCondition, ms) {
  let result = await fn();
  while (!fnCondition(result)) {
    await wait(ms);
    result = await fn();
  }
  return result;
};

function paramsToDict(paramstring) {
  return Object.fromEntries(new URL('phony://?' + paramstring).searchParams)
}

export default {
  name: 'GithubLogin',
  // props: ['token'],
  data: function() {
    return {
      token: undefined,
      login_step: 'anonymous',
      oauth_code: undefined,
      client_id: "03bd54ba3ccc10845031",
      verification_uri: undefined
    }
  },
  mounted() {
    this.token = this.$localData.settings['githubToken']
  },
  computed: {
    user_name_friendly() {
      return this.user_info && this.user_info.login
    }
  },
  asyncComputed: {
    user_info: {
      default: {},
      async get () {
        if (!this.token) return {}

        return await fetch('https://api.github.com/user', {
            headers: {Authorization: `Bearer ${this.token}`}}
          ).then(r => r.json())
      }
    }
  },
  watch: {
    'token'(to, from) {
      this.$localData.settings['githubToken'] = to
    }
  },
  methods: {
    logout() {
      this.token = undefined;
    },
    login_mock() {
      this.oauth_code = "cheese"
      setTimeout(() => {
        this.token = "fish"
      }, 5000)
    },
    login() {
      ipcRenderer.invoke('request', {
        url: "https://github.com/login/device/code",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        data: {client_id: this.client_id}
      }).then((resp) => {
        this.$logger.info(resp)
        if (resp.status != 200) throw new Error(resp)

        const params = paramsToDict(resp['data'])
        this.$logger.info(params)

        this.oauth_code = params.user_code
        this.verification_uri = params.verification_uri

        const device_code = params.device_code
        const interval = params.interval

        let fetchReport = () => ipcRenderer.invoke('request', {
          url: "https://github.com/login/oauth/access_token",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          data: {
            client_id: this.client_id,
            device_code: device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          }
        });
        let validate = resp => paramsToDict(resp['data']).access_token;

        poll(fetchReport, validate, interval * 2000).then((resp) => {
          this.$logger.info(resp)
          const tokeninfo = Object.fromEntries(new URL('phony://?' + resp['data']).searchParams)
          this.$logger.info(tokeninfo)
          this.token = tokeninfo.access_token
        }).catch((resp) => console.error(resp));
      }).catch((resp) => console.error(resp))
    }
  }
}
</script>

<style scoped lang="scss">

</style>
