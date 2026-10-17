<template>
  <div class="chart" :style="{ height: kind === 'donut' ? 'auto' : height + 'px' }">
    <svg v-if="kind === 'bar'" :viewBox="`0 0 ${W} ${height}`" preserveAspectRatio="none" class="svg" role="img" :aria-label="label">
      <g v-for="(d, i) in bars" :key="i">
        <rect :x="d.x" :y="d.y" :width="d.w" :height="d.h" :rx="Math.min(6, d.w / 2)" :fill="d.color" class="bar">
          <title>{{ d.label }}: {{ fmtV(d.value) }}</title>
        </rect>
      </g>
      <line x1="0" :x2="W" :y1="height - 22" :y2="height - 22" stroke="var(--line)" />
      <text v-for="(d, i) in bars" :key="'t' + i" :x="d.x + d.w / 2" :y="height - 6" text-anchor="middle" class="tx">{{ short(d.label) }}</text>
    </svg>
    <svg v-else-if="kind === 'line' || kind === 'spark'" :viewBox="`0 0 ${W} ${height}`" preserveAspectRatio="none" class="svg" role="img" :aria-label="label">
      <defs>
        <linearGradient :id="gid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" :stop-color="color" stop-opacity=".35" /><stop offset="1" :stop-color="color" stop-opacity="0" /></linearGradient>
      </defs>
      <path :d="area" :fill="`url(#${gid})`" />
      <path :d="line" fill="none" :stroke="color" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
      <circle v-for="(p, i) in pts" :key="i" v-show="kind === 'line'" :cx="p[0]" :cy="p[1]" r="3.5" :fill="color"><title>{{ data[i].label }}: {{ fmtV(data[i].value) }}</title></circle>
    </svg>
    <div v-else class="donut-wrap">
      <svg viewBox="0 0 120 120" class="donut" role="img" :aria-label="label">
        <circle cx="60" cy="60" r="44" fill="none" stroke="var(--bg-2)" stroke-width="16" />
        <circle v-for="(s, i) in arcs" :key="i" cx="60" cy="60" r="44" fill="none" :stroke="s.color" stroke-width="16" :stroke-dasharray="s.dash" :stroke-dashoffset="s.off" transform="rotate(-90 60 60)" stroke-linecap="butt" />
        <text x="60" y="58" text-anchor="middle" class="dv">{{ fmtV(total) }}</text>
        <text x="60" y="74" text-anchor="middle" class="dl">{{ centerLabel }}</text>
      </svg>
      <ul class="legend">
        <li v-for="(d, i) in data" :key="i"><i :style="{ background: colorOf(i) }"></i><span>{{ d.label }}</span><b class="num">{{ fmtV(d.value) }}</b></li>
      </ul>
    </div>
  </div>
</template>
<script>
let seq = 0;
export default {
  props: { kind: { type: String, default: 'bar' }, data: { type: Array, default: () => [] }, height: { type: Number, default: 180 }, format: { type: String, default: 'num' }, color: { type: String, default: 'var(--brand-2)' }, label: String, centerLabel: String },
  data() { return { W: 600, gid: 'g' + (++seq) }; },
  computed: {
    max() { return Math.max(1, ...this.data.map((d) => Number(d.value) || 0)); },
    total() { return this.data.reduce((a, d) => a + (Number(d.value) || 0), 0); },
    bars() {
      const n = this.data.length || 1, gap = 10, w = Math.max(8, (this.W - gap * (n + 1)) / n), ph = this.height - 30;
      return this.data.map((d, i) => { const h = Math.max(2, ((Number(d.value) || 0) / this.max) * (ph - 8)); return { x: gap + i * (w + gap), y: ph - h, w, h, label: d.label, value: d.value, color: d.color || this.color }; });
    },
    pts() {
      const n = this.data.length, h = this.height - 8;
      return this.data.map((d, i) => [n === 1 ? this.W / 2 : (i / (n - 1)) * (this.W - 16) + 8, h - ((Number(d.value) || 0) / this.max) * (h - 12) - 2]);
    },
    line() { return this.pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '); },
    area() { if (!this.pts.length) return ''; const l = this.pts; return this.line + ` L${l[l.length - 1][0]},${this.height} L${l[0][0]},${this.height} Z`; },
    arcs() {
      const C = 2 * Math.PI * 44; let acc = 0;
      return this.data.map((d, i) => { const f = this.total ? (Number(d.value) || 0) / this.total : 0; const s = { color: this.colorOf(i), dash: `${f * C} ${C}`, off: -acc * C }; acc += f; return s; });
    }
  },
  methods: {
    colorOf(i) { return this.data[i].color || ['#84cc16', '#0ea5a4', '#f59e0b', '#2563eb', '#e11d48', '#8b5cf6', '#64748b'][i % 7]; },
    fmtV(v) { return this.format === 'money' ? EP.fmt.money(v) : this.format === 'pct' ? EP.fmt.pct(v) : EP.fmt.num(v); },
    short(s) { s = String(s); return s.length > 9 ? s.slice(0, 8) + '…' : s; }
  }
};
</script>
<style scoped>
.chart { width: 100%; }
.svg { width: 100%; height: 100%; overflow: visible; }
.bar { transition: opacity .15s; } .bar:hover { opacity: .75; }
.tx { font-size: 11px; fill: var(--muted); font-family: inherit; }
.donut-wrap { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
.donut { width: 150px; flex: none; }
.dv { font-size: 14px; font-weight: 800; fill: var(--ink); } .dl { font-size: 7px; fill: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
.legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; flex: 1; min-width: 160px; }
.legend li { display: flex; align-items: center; gap: 8px; font-size: .88rem; } .legend i { width: 10px; height: 10px; border-radius: 3px; flex: none; } .legend span { flex: 1; color: var(--ink-2); }
</style>
