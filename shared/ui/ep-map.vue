<template>
  <div class="map-box" :style="{ height: height }">
    <div ref="el" class="map"></div>
    <div v-if="failed" class="empty map-fallback">El mapa no pudo cargarse. <span class="small">Mostramos la lista de puntos.</span></div>
  </div>
</template>
<script>
let leafletReady = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletReady) return leafletReady;
  leafletReady = new Promise((resolve, reject) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
    const js = document.createElement('script'); js.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    js.onload = () => resolve(window.L); js.onerror = reject; document.head.appendChild(js);
  });
  return leafletReady;
}
export default {
  props: { points: { type: Array, default: () => [] }, route: Boolean, height: { type: String, default: '420px' }, selected: [Number, String] },
  emits: ['select'],
  data() { return { failed: false }; },
  async mounted() {
    try { this.L = await loadLeaflet(); } catch (_) { this.failed = true; return; }
    const L = this.L;
    this.map = L.map(this.$refs.el, { zoomControl: true, scrollWheelZoom: false }).setView([20.5888, -100.3899], 12);
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'rastertiles/voyager'}/{z}/{x}/{y}{r}.png`, { maxZoom: 19, attribution: '© OpenStreetMap · © CARTO' }).addTo(this.map);
    this.layer = L.layerGroup().addTo(this.map);
    this.draw();
    setTimeout(() => this.map.invalidateSize(), 250);
  },
  watch: { points: { deep: true, handler() { this.draw(); } }, selected() { this.draw(); } },
  beforeUnmount() { if (this.map) this.map.remove(); },
  methods: {
    draw() {
      if (!this.map) return;
      const L = this.L; this.layer.clearLayers();
      const pts = this.points.filter((p) => p.lat && p.lng);
      pts.forEach((p, i) => {
        const on = String(p.id) === String(this.selected);
        const icon = L.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 17], html: `<div style="width:34px;height:34px;border-radius:50%;background:${p.color || '#84cc16'};color:#0b1d03;display:grid;place-items:center;font-weight:900;font-family:Outfit,sans-serif;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.35);${on ? 'transform:scale(1.25);' : ''}">${p.num ?? (i + 1)}</div>` });
        const m = L.marker([p.lat, p.lng], { icon }).addTo(this.layer);
        if (p.title) m.bindPopup(`<b>${p.title}</b><br>${p.html || ''}`);
        m.on('click', () => this.$emit('select', p));
      });
      if (this.route && pts.length > 1) L.polyline(pts.map((p) => [p.lat, p.lng]), { color: '#65a30d', weight: 4, opacity: .8, dashArray: '8 8' }).addTo(this.layer);
      if (pts.length) this.map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 });
    }
  }
};
</script>
<style scoped>
.map-box { position: relative; border-radius: var(--r); overflow: hidden; border: 1px solid var(--line); background: var(--bg-2); }
.map { position: absolute; inset: 0; }
.map-fallback { position: absolute; inset: 0; display: grid; place-content: center; }
</style>
