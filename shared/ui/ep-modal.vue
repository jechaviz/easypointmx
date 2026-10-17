<template>
  <teleport to="body">
    <div v-if="open" class="overlay" @mousedown.self="$emit('close')" role="dialog" aria-modal="true" :aria-label="title">
      <div class="modal" :class="{ wide }" ref="box">
        <div class="modal-h">
          <h3 class="h3">{{ title }}</h3>
          <button class="x" @click="$emit('close')" aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-b"><slot /></div>
        <div class="modal-f" v-if="$slots.footer"><slot name="footer" /></div>
      </div>
    </div>
  </teleport>
</template>
<script>
export default {
  props: { open: Boolean, title: { type: String, default: '' }, wide: Boolean },
  emits: ['close'],
  watch: {
    open(v) {
      document.body.style.overflow = v ? 'hidden' : '';
      if (v) this.$nextTick(() => { const f = this.$refs.box && this.$refs.box.querySelector('input,select,textarea,button:not(.x)'); if (f) f.focus(); });
    }
  },
  mounted() { this._k = (e) => { if (e.key === 'Escape' && this.open) this.$emit('close'); }; window.addEventListener('keydown', this._k); },
  beforeUnmount() { window.removeEventListener('keydown', this._k); document.body.style.overflow = ''; }
};
</script>
