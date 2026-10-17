<template>
  <div>
    <section class="top"><div class="container stack" style="--gap:14px">
      <span class="kicker">Excursiones</span><h1 class="h1" style="font-size:clamp(2.2rem,5vw,3.6rem)">Elige tu próxima salida</h1>
      <p class="lead">Aparta con un abono pequeño, paga a tu ritmo y recibe tu voucher con QR. Sin reembolsos que perder: tu abono siempre se vuelve crédito.</p>
    </div></section>
    <section class="container">
      <div class="bar card">
        <div class="field grow"><label class="sr" for="s">Buscar</label><input id="s" class="input" type="search" v-model.trim="q" placeholder="Buscar destino o experiencia…" /></div>
        <div class="pill-tabs"><button class="chip" :class="{ on: !tag }" @click="tag = ''">Todas</button><button v-for="t in allTags" :key="t" class="chip" :class="{ on: tag === t }" @click="tag = tag === t ? '' : t">#{{ t }}</button></div>
        <div class="row" style="gap:10px"><label class="small muted" for="o">Ordenar</label><select id="o" class="select" style="width:auto" v-model="sort"><option value="feat">Favoritas</option><option value="date">Próxima salida</option><option value="low">Precio ↑</option><option value="high">Precio ↓</option></select></div>
      </div>
      <div class="grid auto-grid mt-3" style="--min:310px;--gap:22px" v-if="!loading">
        <exc-card v-for="e in list" :key="e.id" :e="e" />
      </div>
      <div class="grid auto-grid mt-3" style="--min:310px;--gap:22px" v-else><div class="skeleton" style="height:340px" v-for="n in 6" :key="n"></div></div>
      <ep-empty v-if="!loading && !list.length" icon="🔎" title="Sin resultados">Prueba con otra palabra o quita los filtros.</ep-empty>
    </section>
    <section class="section"><div class="container"><div class="card card-pad row between wrap" style="gap:18px;background:linear-gradient(120deg,var(--brand-soft),var(--surface))">
      <div class="stack" style="--gap:4px"><b class="h3">¿Organizas excursiones?</b><span class="muted">Llena tus salidas con apartado, manifiesto digital y pago en 2 días al completar.</span></div>
      <a :href="EP.href('/afiliate?t=proveedor')" class="btn btn-dark">Publicar mis experiencias</a></div></div></section>
  </div>
</template>
<script>
export default {
  components: { ExcCard: EP.comp('./components/parts/ExcCard.vue') },
  data() { return { EP, loading: true, all: [], q: EP.route.query.q || '', tag: EP.route.query.tag || '', sort: 'feat' }; },
  computed: {
    allTags() { const s = new Set(); this.all.forEach((e) => String(e.tags || '').split(',').forEach((t) => { t = t.trim(); if (t) s.add(t); })); return [...s].slice(0, 14); },
    list() {
      const q = this.q.toLowerCase();
      let r = this.all.filter((e) => (!q || (e.name + ' ' + e.destination + ' ' + e.tags).toLowerCase().includes(q)) && (!this.tag || String(e.tags).split(',').map((x) => x.trim()).includes(this.tag)));
      const nd = (e) => (e.departures[0] ? e.departures[0].date : '9999');
      if (this.sort === 'low') r = r.sort((a, b) => a.price - b.price); else if (this.sort === 'high') r = r.sort((a, b) => b.price - a.price); else if (this.sort === 'date') r = r.sort((a, b) => nd(a).localeCompare(nd(b)));
      return r;
    }
  },
  async mounted() { try { this.all = await EP.get('/public/excursions'); } catch (e) { EP.err(e); } this.loading = false; }
};
</script>
<style scoped>
.top { padding: 56px 0 28px; background: radial-gradient(900px 300px at 85% 0%, color-mix(in srgb, var(--brand) 22%, transparent), transparent 65%); }
.bar { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; padding: 14px 16px; position: sticky; top: 76px; z-index: 5; }
.bar .field { min-width: 220px; }
</style>
