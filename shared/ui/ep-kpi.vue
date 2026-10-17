<template>
  <div class="kpi" :data-tone="tone">
    <div class="l">{{ label }}</div>
    <div class="v num">{{ shown }}</div>
    <div class="h" v-if="hint">{{ hint }}</div>
  </div>
</template>
<script>
export default {
  props: { label: String, value: [Number, String], hint: String, tone: { type: String, default: '' }, kind: { type: String, default: 'num' } },
  data() { return { cur: 0 }; },
  computed: {
    shown() {
      if (typeof this.value === 'string' && isNaN(Number(this.value))) return this.value;
      const n = this.cur;
      if (this.kind === 'money') return EP.fmt.money(n);
      if (this.kind === 'pct') return EP.fmt.pct(n);
      if (this.kind === 'dec') return (Math.round(n * 100) / 100).toFixed(2);
      return EP.fmt.num(Math.round(n));
    }
  },
  watch: { value: { immediate: true, handler(v) { this.tween(Number(v) || 0); } } },
  methods: {
    tween(to) {
      cancelAnimationFrame(this._r);
      const from = this.cur, t0 = performance.now(), dur = 650;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { this.cur = to; return; }
      const step = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); this.cur = from + (to - from) * e; if (p < 1) this._r = requestAnimationFrame(step); };
      this._r = requestAnimationFrame(step);
    }
  },
  beforeUnmount() { cancelAnimationFrame(this._r); }
};
</script>
