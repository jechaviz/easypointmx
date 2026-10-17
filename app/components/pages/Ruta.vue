<template>
  <div class="stack" style="--gap:18px">
    <section class="card card-pad row between wrap" style="gap:14px">
      <div class="grow" style="min-width:240px"><div class="row between small"><span class="muted">Efectivo en tu poder</span><b class="num">{{ EP.fmt.money(data ? data.on_hand : 0) }} <span class="muted">/ {{ EP.fmt.money(data ? data.driver_limit : 0) }}</span></b></div>
        <div class="progress mt-1"><i :style="{ width: Math.min(100, data && data.driver_limit ? data.on_hand / data.driver_limit * 100 : 0) + '%', background: over ? 'var(--bad)' : '' }"></i></div>
        <div class="tiny muted mt-1" v-if="over">⚠ Superas tu límite: entrega al administrador y cierra tu corte.</div></div>
      <div class="row wrap" style="gap:8px"><button class="btn btn-ghost" @click="locate" :class="{ 'is-loading': locating }"><ep-ico name="nav" :size="18" /> Ordenar desde mi ubicación</button>
        <button class="btn btn-dark" :disabled="!data || !data.on_hand" :class="{ 'is-loading': busy }" @click="corte"><ep-ico name="check" :size="18" /> Cerrar corte</button></div>
    </section>

    <div class="grid" style="grid-template-columns:1fr 1.15fr;gap:20px;align-items:start" id="rt">
      <section class="stack" style="--gap:10px"><div class="row between"><h2 class="h3">Paradas ({{ stops.length }})</h2><span class="small muted">{{ EP.fmt.money(total) }} por recolectar</span></div>
        <ep-empty v-if="!stops.length && !loading" icon="🌿" title="Sin efectivo por recolectar">Ningún punto tiene efectivo retenido ahora.</ep-empty>
        <article v-for="s in stops" :key="s.id" class="card stop" :class="{ on: sel === s.id }" @click="sel = s.id">
          <span class="num-badge num">{{ s.stop }}</span>
          <div class="grow"><b>{{ s.name }}</b><div class="small muted">{{ s.address }}</div><div class="row wrap tiny" style="gap:10px;margin-top:4px"><span class="chip">{{ s.count }} {{ s.count == 1 ? 'abono' : 'abonos' }}</span><span class="chip" :class="{ 'b-warn': s.days >= 5 }">{{ s.days }} d</span><span v-if="s.hours" class="muted">{{ s.hours }}</span></div></div>
          <div class="stack right" style="--gap:6px"><b class="num" style="font-size:1.2rem">{{ EP.fmt.money(s.net) }}</b>
            <div class="row" style="gap:6px;justify-content:flex-end"><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" :href="dir(s)" @click.stop>Ir</a><button class="btn btn-primary btn-sm" @click.stop="open(s)">Recolectar</button></div></div>
        </article>
      </section>
      <div style="position:sticky;top:90px"><ep-map :points="pts" route :selected="sel" height="min(70vh,600px)" @select="(p) => (sel = p.id)" /></div>
    </div>

    <section class="stack" style="--gap:10px" v-if="data && data.on_hand > 0"><h2 class="h3">Lo que traes</h2>
      <ep-table ref="onhand" resource="payments" :params="{ status: 'collected' }" :columns="cols" :search="false" :page-size="10" /></section>

    <ep-modal :open="!!cur" :title="cur ? 'Recolectar en ' + cur.name : ''" @close="cur = null">
      <div class="stack" v-if="cur"><div class="grid g3" style="--gap:10px"><div class="mini"><span>Abonos</span><b>{{ cur.count }}</b></div><div class="mini"><span>Bruto</span><b class="num">{{ EP.fmt.money(cur.gross) }}</b></div><div class="mini hi"><span>Neto a recoger</span><b class="num">{{ EP.fmt.money(cur.net) }}</b></div></div>
        <p class="small muted">Recibes el neto (monto − comisión del punto). Puedes redondear hasta $10 hacia arriba o abajo si no hay cambio.</p>
        <div class="field"><label>Monto que recibes</label><input class="input" type="number" step="1" v-model.number="got" style="font-size:1.6rem;font-weight:800;height:58px" /><div class="help" :class="{ error: Math.abs(diff) > 10 }">{{ diff === 0 ? 'Monto exacto' : (diff > 0 ? 'Redondeo a favor +' : 'Redondeo −') + EP.fmt.money(Math.abs(diff)) }}{{ Math.abs(diff) > 10 ? ' · excede $10' : '' }}</div></div></div>
      <template #footer><button class="btn btn-ghost" @click="cur = null">Cancelar</button><button class="btn btn-primary" :disabled="Math.abs(diff) > 10" :class="{ 'is-loading': busy }" @click="collect">Confirmar recolección</button></template>
    </ep-modal>
  </div>
</template>
<script>
export default {
  data() { return { EP, data: null, loading: true, sel: null, cur: null, got: 0, busy: false, locating: false, pos: null, cols: [{ key: 'collected_at', label: 'Recolectado', fmt: 'dt' }, { key: 'point_name', label: 'Punto' }, { key: 'collected_amount', label: 'Monto', fmt: 'money', align: 'right' }] }; },
  computed: {
    stops() { return this.data ? this.data.stops : []; }, total() { return this.stops.reduce((a, s) => a + Number(s.net), 0); },
    pts() { return this.stops.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, title: s.name, html: EP.fmt.money(s.net), num: s.stop })); },
    over() { return this.data && this.data.on_hand >= this.data.driver_limit; },
    diff() { return this.cur ? Math.round((Number(this.got) - this.cur.net) * 100) / 100 : 0; }
  },
  mounted() { this.load(); },
  methods: {
    dir(s) { return s.maps_url || `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`; },
    async load() { try { this.data = await EP.get('/driver/route' + (this.pos ? EP.qs(this.pos) : '')); } catch (e) { EP.err(e); } this.loading = false; },
    locate() { if (!navigator.geolocation) return; this.locating = true; navigator.geolocation.getCurrentPosition((g) => { this.pos = { lat: g.coords.latitude, lng: g.coords.longitude }; this.locating = false; this.load(); }, () => { this.locating = false; EP.toast('No pudimos ubicarte', 'bad'); }, { timeout: 8000 }); },
    open(s) { this.cur = s; this.got = Math.round(Number(s.net)); },
    async collect() { this.busy = true; try { const r = await EP.post('/driver/collect', { point_id: this.cur.id, collected_amount: this.got }); EP.toast('Recolectado ' + EP.fmt.money(r.collected), 'ok'); this.cur = null; await this.load(); if (this.$refs.onhand) this.$refs.onhand.reload(); } catch (e) { EP.err(e); } finally { this.busy = false; } },
    async corte() { if (!(await EP.confirm('Entregarás ' + EP.fmt.money(this.data.on_hand) + ' al administrador y se generará tu folio de corte.', { title: 'Cerrar corte', ok: 'Cerrar corte' }))) return; this.busy = true; try { const r = await EP.post('/driver/corte'); EP.toast('Corte ' + r.folio + ' · ' + EP.fmt.money(r.total), 'ok', 7000); await this.load(); } catch (e) { EP.err(e); } finally { this.busy = false; } }
  }
};
</script>
<style scoped>
.stop { padding: 14px 16px; display: flex; gap: 14px; align-items: center; cursor: pointer; transition: border-color .15s, box-shadow .15s; } .stop.on { border-color: var(--brand-2); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 30%, transparent); }
.num-badge { width: 38px; height: 38px; border-radius: 50%; background: var(--brand); color: var(--on-brand); display: grid; place-items: center; font-weight: 900; flex: none; }
.mini { padding: 10px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line); display: grid; } .mini span { font-size: .7rem; color: var(--muted); text-transform: uppercase; } .mini b { font-size: 1.15rem; } .mini.hi { background: var(--brand-soft); border-color: transparent; }
@media (max-width: 960px) { #rt { grid-template-columns: 1fr !important; } #rt > div { position: static !important; order: -1; } }
</style>
