<template>
  <div>
    <div class="inline-login">
      <span v-if="token">Logged in as {{token}}</span>
      <span v-else>Not authenticated</span>

      <div v-if="!token && !oauth_code">
        <button @click="login_mock">Login with GitHub</button>
      </div>
      <div v-else-if="!token && oauth_code">
        Copy code <pre>{{ oauth_code }}</pre> and paste <a :href="verification_uri">here</a>
      </div>
      <button v-else-if="token" @click="logout">Log Out</button>
    </div>
  </div>
</template>

<script>

import { ipcRenderer } from 'electron'

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

        poll(fetchReport, validate, interval * 1000).then((resp) => {
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
