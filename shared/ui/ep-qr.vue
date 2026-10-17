<template><img v-if="src" :src="src" :width="size" :height="size" :alt="alt" style="image-rendering:pixelated;background:#fff;border-radius:12px;padding:6px" /></template>
<script>
export default {
  props: { text: String, size: { type: Number, default: 180 }, alt: { type: String, default: 'Código QR' } },
  computed: { src() { return this.text ? EP.qr(this.text, 6) : ''; } }
};
</script>
