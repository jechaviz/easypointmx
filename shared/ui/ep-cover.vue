<template>
  <div class="cover" :style="{ aspectRatio: ratio }">
    <img v-if="image" :src="image" :alt="name" loading="lazy" />
    <canvas v-else ref="cv" role="img" :aria-label="name"></canvas>
    <slot />
  </div>
</template>
<script>
export default {
  props: { seed: [String, Number], tags: String, name: String, image: String, ratio: { type: String, default: '16 / 10' } },
  mounted() { this.paint(); if (window.ResizeObserver && this.$refs.cv) { this._ro = new ResizeObserver(() => this.paint()); this._ro.observe(this.$refs.cv); } },
  beforeUnmount() { if (this._ro) this._ro.disconnect(); },
  watch: { seed() { this.paint(); }, tags() { this.paint(); } },
  methods: { paint() { if (this.$refs.cv && window.EPArt) EPArt.paint(this.$refs.cv, this.seed, this.tags, this.name); } }
};
</script>
<style scoped>
.cover { position: relative; overflow: hidden; border-radius: inherit; background: var(--bg-2); }
.cover canvas, .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
</style>
