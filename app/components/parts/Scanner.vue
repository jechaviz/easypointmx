<template>
  <ep-modal :open="open" title="Escanear código QR" @close="stop">
    <div class="stack" style="--gap:12px">
      <div class="cam"><video ref="v" playsinline muted></video><div class="frame"></div></div>
      <p class="small muted" v-if="!supported">Tu navegador no puede leer QR con la cámara. Escribe el folio a mano.</p>
      <p class="small error" v-if="err">{{ err }}</p>
    </div>
  </ep-modal>
</template>
<script>
export default {
  props: { open: Boolean },
  emits: ['close', 'code'],
  data() { return { supported: 'BarcodeDetector' in window && !!navigator.mediaDevices, err: '' }; },
  watch: { open(v) { if (v) this.start(); else this.halt(); } },
  beforeUnmount() { this.halt(); },
  methods: {
    async start() {
      this.err = '';
      if (!this.supported) return;
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        await this.$nextTick(); const v = this.$refs.v; v.srcObject = this.stream; await v.play();
        const det = new BarcodeDetector({ formats: ['qr_code'] });
        this._t = setInterval(async () => {
          try { const r = await det.detect(v); if (r.length) { const m = String(r[0].rawValue).match(/EP-[A-Z]{2}-[A-Z0-9]{4,8}|vtok_[a-z0-9_]+/i); this.$emit('code', m ? m[0] : r[0].rawValue); this.stop(); } } catch (_) {}
        }, 350);
      } catch (e) { this.err = 'No pudimos abrir la cámara. Revisa el permiso.'; }
    },
    halt() { clearInterval(this._t); if (this.stream) this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; },
    stop() { this.halt(); this.$emit('close'); }
  }
};
</script>
<style scoped>
.cam { position: relative; border-radius: var(--r); overflow: hidden; background: #000; aspect-ratio: 4 / 3; } .cam video { width: 100%; height: 100%; object-fit: cover; }
.frame { position: absolute; inset: 18%; border: 3px solid var(--brand); border-radius: 18px; box-shadow: 0 0 0 999px rgba(0,0,0,.35); }
</style>
