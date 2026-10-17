<template><canvas ref="cv" class="hero-net" aria-hidden="true"></canvas></template>
<script>
export default {
  props: { points: { type: Array, default: () => [] } },
  data() { return { nodes: [], edges: [], packets: [], w: 0, h: 0, t0: 0, mx: 0.5, my: 0.5, vis: true }; },
  mounted() {
    this.ctx = this.$refs.cv.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize(); this.build();
    this._ro = new ResizeObserver(() => { this.resize(); this.build(); }); this._ro.observe(this.$refs.cv);
    this._io = new IntersectionObserver((e) => { this.vis = e[0].isIntersecting; if (this.vis) this.loop(); }); this._io.observe(this.$refs.cv);
    this._mv = (e) => { const r = this.$refs.cv.getBoundingClientRect(); this.mx = (e.clientX - r.left) / r.width; this.my = (e.clientY - r.top) / r.height; };
    window.addEventListener('pointermove', this._mv, { passive: true });
    this.t0 = performance.now(); this.loop();
  },
  beforeUnmount() { cancelAnimationFrame(this._raf); this._ro && this._ro.disconnect(); this._io && this._io.disconnect(); window.removeEventListener('pointermove', this._mv); },
  watch: { points() { this.build(); } },
  methods: {
    resize() { const c = this.$refs.cv; this.w = c.clientWidth; this.h = c.clientHeight; c.width = this.w * this.dpr; c.height = this.h * this.dpr; this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); },
    build() {
      const w = this.w, h = this.h; if (!w) return;
      let pts = this.points.filter((p) => p.lat && p.lng);
      let nodes;
      if (pts.length >= 3) {
        const la = pts.map((p) => p.lat), ln = pts.map((p) => p.lng);
        const a = Math.min(...la), b = Math.max(...la), c = Math.min(...ln), d = Math.max(...ln);
        const mw = w * (w > 760 ? 0.52 : 0.9), ox = w > 760 ? w * 0.44 : w * 0.05;
        nodes = pts.map((p) => ({ x: ox + ((p.lng - c) / (d - c || 1)) * mw, y: h * 0.16 + (1 - (p.lat - a) / (b - a || 1)) * h * 0.64, r: 4.5, ph: Math.random() * 6.28, name: p.name }));
      } else {
        nodes = Array.from({ length: 9 }, (_, i) => ({ x: w * (0.5 + Math.random() * 0.46), y: h * (0.15 + Math.random() * 0.7), r: 4.5, ph: Math.random() * 6.28 }));
      }
      // centro de acopio (hub): el nodo más cercano al centro del grupo
      const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length, cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
      let hub = 0, bd = 1e9; nodes.forEach((n, i) => { const dd = (n.x - cx) ** 2 + (n.y - cy) ** 2; if (dd < bd) { bd = dd; hub = i; } });
      nodes[hub].hub = true; nodes[hub].r = 9;
      const edges = new Set();
      nodes.forEach((n, i) => {
        nodes.map((m, j) => [j, (m.x - n.x) ** 2 + (m.y - n.y) ** 2]).filter(([j]) => j !== i).sort((p, q) => p[1] - q[1]).slice(0, 2).forEach(([j]) => edges.add(i < j ? i + '-' + j : j + '-' + i));
      });
      this.nodes = nodes; this.edges = [...edges].map((e) => e.split('-').map(Number)); this.hub = hub; this.packets = [];
    },
    spawn() {
      const n = this.nodes; if (n.length < 2) return;
      let from = Math.floor(Math.random() * n.length); if (from === this.hub) from = (from + 1) % n.length;
      this.packets.push({ from, to: this.hub, p: 0, v: 0.0035 + Math.random() * 0.003, coin: Math.random() < 0.45 });
    },
    loop() {
      if (!this.vis) return;
      cancelAnimationFrame(this._raf);
      const t = (performance.now() - this.t0) / 1000;
      this.draw(t);
      if (!this.reduce) this._raf = requestAnimationFrame(() => this.loop());
    },
    draw(t) {
      const { ctx, w, h, nodes } = this; if (!w || !nodes.length) return;
      ctx.clearRect(0, 0, w, h);
      const px = (this.mx - 0.5) * 14, py = (this.my - 0.5) * 10;
      const P = (n) => [n.x + px * (n.hub ? 0.4 : 1), n.y + py * (n.hub ? 0.4 : 1) + Math.sin(t * 0.8 + n.ph) * 2];
      // rejilla de puntos
      ctx.fillStyle = 'rgba(163,230,53,.07)';
      for (let x = 20; x < w; x += 34) for (let y = 20; y < h; y += 34) ctx.fillRect(x, y, 1.5, 1.5);
      // aristas
      ctx.lineWidth = 1;
      this.edges.forEach(([a, b]) => { const A = P(nodes[a]), B = P(nodes[b]); const g = ctx.createLinearGradient(A[0], A[1], B[0], B[1]); g.addColorStop(0, 'rgba(163,230,53,.22)'); g.addColorStop(1, 'rgba(14,165,164,.22)'); ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); });
      // paquetes y monedas hacia el centro de acopio
      if (!this.reduce && Math.random() < 0.035 && this.packets.length < 14) this.spawn();
      this.packets = this.packets.filter((k) => k.p < 1);
      this.packets.forEach((k) => {
        k.p += k.v; const A = P(nodes[k.from]), B = P(nodes[k.to]); const e = k.p * k.p * (3 - 2 * k.p);
        const x = A[0] + (B[0] - A[0]) * e, y = A[1] + (B[1] - A[1]) * e;
        const gl = ctx.createRadialGradient(x, y, 0, x, y, 16); gl.addColorStop(0, k.coin ? 'rgba(251,191,36,.9)' : 'rgba(163,230,53,.9)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gl; ctx.fillRect(x - 16, y - 16, 32, 32);
        ctx.beginPath(); ctx.arc(x, y, k.coin ? 4 : 3, 0, 6.283); ctx.fillStyle = k.coin ? '#fbbf24' : '#d9f99d'; ctx.fill();
        if (k.coin) { ctx.fillStyle = '#422006'; ctx.font = 'bold 6px Outfit, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$', x, y + 2.2); }
      });
      // nodos
      nodes.forEach((n) => {
        const [x, y] = P(n), pulse = 1 + 0.18 * Math.sin(t * 2 + n.ph);
        const R = n.r * pulse;
        const gl = ctx.createRadialGradient(x, y, 0, x, y, R * 5); gl.addColorStop(0, n.hub ? 'rgba(163,230,53,.55)' : 'rgba(163,230,53,.3)'); gl.addColorStop(1, 'rgba(163,230,53,0)');
        ctx.fillStyle = gl; ctx.fillRect(x - R * 5, y - R * 5, R * 10, R * 10);
        ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.fillStyle = n.hub ? '#bef264' : '#a3e635'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, R + 3 + (Math.sin(t * 1.5 + n.ph) + 1) * 2, 0, 6.283); ctx.strokeStyle = 'rgba(190,242,100,.35)'; ctx.stroke();
      });
    }
  }
};
</script>
<style scoped>
.hero-net { position: absolute; inset: 0; width: 100%; height: 100%; }
</style>
