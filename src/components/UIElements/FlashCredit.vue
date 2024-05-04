<template>
  <div class="creditWrapper" v-if="(forceShow || $localData.settings.credits) && hasCredit">
    <a
      class="frame" target="_blank"
      ref="credit"
      v-for="(track, i) in trackList" :key="i"
      :href="track.uhcLink || false"
      @mouseenter="startScroll(i)"
      @mouseleave="endScroll(i)" >
      <span class="icon">
        <fa-icon icon="music"></fa-icon>
      </span>
      <div class="credit">
        <span class="marquee" v-text="musicText(track)" />
      </div>
    </a>
  </div>
</template>

<script>

export default {
  name: 'FlashCredit',
  props: [
    'pageId', 'trackIds', 'forceShow'
  ],
  components: {
  },
  data: function() {
    return {
      marqueeInterval: undefined,
      marqueeText: undefined
    }
  },
  computed: {
    trackList() {
      // List of Tracks on the page
      if (this.trackIds) {
        return this.trackIds.map(this.$musicker.getTrackBySlug)
      } else if (this.pageId) {
        const viz_num = this.$mspaToViz(this.pageId).p
        const track_list = this.$musicker.tracksInPage(viz_num)

        // TODO: Bolin
        // TODO: 008143 (???)

        return track_list
      } else {
        this.$logger.error("Tried to invoke flashcredit without a page or explicit ids")
        return []
      }
    },
    hasCredit() {
      return (this.trackList.length > 0)
    }
  },
  methods: {
    musicText(track){
      return track.name + ' - ' + track.artist_contribs.map(c => c.who).join(', ')
    },
    startScroll(i) {
      let marquee = this.$refs.credit[i].querySelector('.marquee')
      let overflow = marquee.clientWidth - this.$refs.credit[i].querySelector('.credit').clientWidth + 5
      if (overflow > 0) {
        let distance = marquee.clientWidth + 25

        this.marqueeText = marquee.innerText
        marquee.innerText = `${this.marqueeText} • ${this.marqueeText}`

        let time = distance/80

        marquee.style.transition = `margin ${time}s linear`
        marquee.style.marginLeft = `-${distance}px`
        this.marqueeInterval = setInterval(() => {
          marquee.style.transition = ''
          marquee.style.marginLeft = 0

          window.getComputedStyle(marquee).marginLeft

          marquee.style.transition = `margin ${time}s linear`
          marquee.style.marginLeft = `-${distance}px`
        }, time * 1000)
      }
    },
    endScroll(i) {
      let marquee = this.$refs.credit[i].querySelector('.marquee')
      if (this.marqueeText) {
        marquee.style.transition = ''
        marquee.style.marginLeft = 0

        clearInterval(this.marqueeInterval)

        marquee.innerText = this.marqueeText
        this.marqueeText = ''
      }
    }
  },
  beforeDestroy() {
    clearInterval(this.marqueeInterval)
  }
}
</script>

<style scoped lang="scss">

.creditWrapper {
  width: min-content;
  max-width: 100%;
  margin: 0 auto 30px;
  padding: 2px;
  background-color: #ff9000;
  border: solid 2px #ff9000;
  transition: opacity 1s;
}

.modalContainer .creditWrapper {
  margin: 1em;
}

.frame {
  display: flex;
  text-decoration: none;
  color: white;
  &:not(:last-child) {
    margin-bottom: 4px;
  }
  &:hover {
    text-decoration: underline;

    &[href] .marquee {
      text-decoration: underline;
    }
    &:not([href]) {
      cursor: default;
    }
  }
  &:after {
    content: none !important;
  }
}
a.frame {
  color: white !important; // Don't colorize links
}
.icon {
  font-size: 14px;
  background: black;
  border: 2px solid #ffff00;
  margin-right: 4px;
  padding: 4px;
  line-height: 0;
  &:after {
    content: none !important;
  }
}
.credit {
  font-size: 14px;
  line-height: 1.6;
  overflow: hidden;
  white-space: nowrap;

  width: 100%;
  padding: 0 5px;

  background: black;
  border: 2px solid #ffff00;
  box-shadow: 0 0 0 2px #ff9000;

  &:after {
    content: none !important;
  }
  .marquee {
    display: inline-block;
    &:after {
      content: none !important;
    }
  }
}

</style>

