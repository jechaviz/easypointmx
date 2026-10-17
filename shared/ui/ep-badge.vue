<template><span class="badge" :class="'b-' + tone_">{{ text_ }}</span></template>
<script>
export default {
  props: { status: String, text: String, tone: String },
  computed: {
    s() { return this.status ? EP.status(this.status) : { text: this.text, tone: this.tone }; },
    text_() { return this.text || this.s.text; },
    tone_() { return this.tone || this.s.tone || 'mute'; }
  }
};
</script>
