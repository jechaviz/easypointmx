<template>
  <div>
    <section class="top"><div class="container stack" style="--gap:12px"><span class="kicker">Puntos Easypoint</span><h1 class="h1" style="font-size:clamp(2.2rem,5vw,3.6rem)">El más cercano, a la vuelta</h1>
      <p class="lead">Recibe y envía paquetes, abona tus reservas en efectivo y paga servicios. Encuentra tu punto y cómo llegar.</p>
      <div class="row wrap" style="gap:10px"><button class="btn btn-primary" @click="locate" :class="{ 'is-loading': locating }"><ep-ico name="nav" :size="18" /> Cerca de mí</button><input class="input" style="max-width:300px" type="search" v-model.trim="q" placeholder="Buscar por colonia o nombre…" aria-label="Buscar punto" /></div></div></section>
    <section class="container layout">
      <div class="list stack" style="--gap:10px">
        <article v-for="(p, i) in list" :key="p.id" class="card card-hover pt" :class="{ on: sel === p.id }" @click="sel = p.id" tabindex="0" @keyup.enter="sel = p.id">
          <span class="num-badge num">{{ i + 1 }}</span>
          <div class="grow"><b>{{ p.name }}</b><div class="small muted">{{ p.address }}</div><div class="tiny muted" v-if="p.hours"><ep-ico name="clock" :size="12" /> {{ p.hours }}</div></div>
          <div class="stack right" style="--gap:6px"><span class="chip" v-if="p.km != null">{{ p.km.toFixed(1) }} km</span>
            <div class="row" style="gap:6px"><a v-if="p.maps_url || (p.lat && p.lng)" class="btn btn-ghost btn-sm" target="_blank" rel="noopener" :href="p.maps_url || ('https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lng)" @click.stop>Ir</a>
              <a v-if="p.whatsapp" class="btn btn-soft btn-sm" target="_blank" rel="noopener" :href="EP.wa(p.whatsapp, 'Hola, ¿me confirman su horario?')" @click.stop>WhatsApp</a></div></div>
        </article>
        <ep-empty v-if="!list.length && !loading" icon="📍" title="Sin resultados">Prueba con otra búsqueda.</ep-empty>
      </div>
      <div class="mapcol"><ep-map :points="mapPts" :selected="sel" height="min(70vh, 640px)" @select="(p) => (sel = p.id)" /></div>
    </section>
    <section class="section"><div class="container"><div class="card card-pad row between wrap" style="gap:18px;background:linear-gradient(120deg,var(--brand-soft),var(--surface))"><div class="stack" style="--gap:4px"><b class="h3">¿Tu local puede ser el siguiente?</b><span class="muted">Gana comisión por cada paquete, guía y servicio. Alta en minutos.</span></div><a :href="EP.href('/afiliate')" class="btn btn-dark">Afiliar mi local</a></div></div></section>
  </div>
</template>
<script>
export default {
  data() { return { EP, points: [], loading: true, q: '', sel: null, pos: null, locating: false }; },
  computed: {
    list() {
      const q = this.q.toLowerCase();
      let r = this.points.filter((p) => !q || (p.name + ' ' + p.address).toLowerCase().includes(q)).map((p) => ({ ...p, km: this.pos ? this.dist(p) : null }));
      if (this.pos) r.sort((a, b) => a.km - b.km);
      return r;
    },
    mapPts() { return this.list.map((p, i) => ({ id: p.id, lat: p.lat, lng: p.lng, title: p.name, html: p.address, num: i + 1 })); }
  },
  async mounted() { try { this.points = await EP.get('/public/points'); } catch (e) { EP.err(e); } this.loading = false; },
  methods: {
    dist(p) { const R = 6371, t = Math.PI / 180, dl = (p.lat - this.pos.lat) * t, dn = (p.lng - this.pos.lng) * t; const a = Math.sin(dl / 2) ** 2 + Math.cos(this.pos.lat * t) * Math.cos(p.lat * t) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(a)); },
    locate() {
      if (!navigator.geolocation) { EP.toast('Tu navegador no permite ubicación', 'bad'); return; }
      this.locating = true;
      navigator.geolocation.getCurrentPosition((g) => { this.pos = { lat: g.coords.latitude, lng: g.coords.longitude }; this.locating = false; if (this.list[0]) this.sel = this.list[0].id; }, () => { this.locating = false; EP.toast('No pudimos obtener tu ubicación', 'bad'); }, { timeout: 8000 });
    }
  }
};
</script>
<style scoped>
.top { padding: 56px 0 24px; background: radial-gradient(800px 260px at 85% 0%, color-mix(in srgb, var(--brand) 22%, transparent), transparent 65%); }
.layout { display: grid; grid-template-columns: 440px 1fr; gap: 24px; align-items: start; padding: 20px 0 20px; }
.list { max-height: 70vh; overflow: auto; padding: 4px; }
.pt { padding: 14px 16px; display: flex; gap: 14px; align-items: center; cursor: pointer; } .pt.on { border-color: var(--brand-2); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 30%, transparent); }
.num-badge { width: 34px; height: 34px; border-radius: 50%; background: var(--brand); color: var(--on-brand); display: grid; place-items: center; font-weight: 900; flex: none; }
.mapcol { position: sticky; top: 84px; }
@media (max-width: 960px) { .layout { grid-template-columns: 1fr; } .mapcol { position: static; order: -1; } .list { max-height: none; } }
</style>
