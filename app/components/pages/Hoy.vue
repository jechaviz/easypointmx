<template>
  <div class="stack" style="--gap:22px">
    <section class="hello card card-pad row between wrap">
      <div class="stack" style="--gap:4px"><span class="kicker">{{ EP.fmt.date(today, { weekday: 'long', day: 'numeric', month: 'long' }) }}</span><h2 class="h2">{{ greet }}, {{ first }}</h2><p class="muted small">{{ blurb }}</p></div>
      <div class="row wrap" style="gap:8px"><a v-for="q in quick" :key="q.to" :href="EP.href(q.to)" class="btn" :class="q.p ? 'btn-primary' : 'btn-ghost'"><ep-ico :name="q.i" :size="18" /> {{ q.t }}</a>
        <button v-if="role === 'admin'" class="btn btn-dark" :class="{ 'is-loading': ticking }" @click="tick"><ep-ico name="zap" :size="18" /> Ejecutar motor</button></div>
    </section>

    <div class="grid auto-grid" style="--min:200px;--gap:14px" v-if="home"><ep-kpi v-for="k in home.kpis" :key="k.key" :label="k.label" :value="kval(k)" :kind="kkind(k)" :hint="k.hint" :tone="k.tone" /></div>
    <div class="grid auto-grid" style="--min:200px" v-else><div class="skeleton" style="height:104px" v-for="n in 4" :key="n"></div></div>

    <div class="grid" :style="role === 'admin' ? 'grid-template-columns:1.4fr 1fr;gap:20px' : ''" id="hoy-grid">
      <section class="stack" style="--gap:12px">
        <div class="row between"><h3 class="h3">Qué hacer ahora</h3><span class="small muted" v-if="home">{{ home.tasks.length }} pendientes</span></div>
        <ep-tasks :tasks="home ? home.tasks : []" @action="act" @changed="load" />
      </section>
      <section class="stack" style="--gap:12px" v-if="role === 'admin'">
        <h3 class="h3">Últimos 14 días</h3>
        <div class="card card-pad stack" style="--gap:14px"><div><div class="small muted">Ventas reservadas</div><ep-chart kind="bar" :data="gmv" format="money" :height="150" label="Ventas por día" /></div>
          <div><div class="small muted">Abonos recibidos</div><ep-chart kind="line" :data="pays" format="money" :height="110" label="Abonos por día" /></div></div>
      </section>
    </div>
  </div>
</template>
<script>
export default {
  data() { return { EP, home: null, series: [], ticking: false, today: EP.today() }; },
  computed: {
    role() { return EP.session.user.role; },
    first() { return String(EP.session.user.name || EP.session.user.email).split(' ')[0]; },
    greet() { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; },
    blurb() { return { admin: 'Esto es lo que el motor detectó y necesita tu decisión.', operator: 'Tus abonos, ventas y paquetes de hoy.', driver: 'Tu ruta del día y el efectivo que traes.', provider: 'Tus salidas, pasajeros y liquidaciones.', sales: 'Aspirantes y leads por contactar.', support: 'Casos por atender, ordenados por SLA.' }[this.role]; },
    quick() {
      return ({ operator: [{ t: 'Cobrar abono', i: 'cash', to: '/cobrar', p: 1 }, { t: 'Vender', i: 'tag', to: '/vender' }, { t: 'Paquetes', i: 'package', to: '/paquetes' }], driver: [{ t: 'Abrir ruta', i: 'route', to: '/ruta', p: 1 }], provider: [{ t: 'Mis salidas', i: 'calendar', to: '/salidas', p: 1 }, { t: 'Liquidaciones', i: 'wallet', to: '/liquidaciones' }], sales: [{ t: 'Aspirantes', i: 'store', to: '/aspirantes', p: 1 }, { t: 'Campañas', i: 'sparkles', to: '/campanas' }], support: [{ t: 'Tickets', i: 'message', to: '/tickets', p: 1 }], admin: [{ t: 'Economía', i: 'chart', to: '/economia', p: 1 }, { t: 'Efectivo', i: 'cash', to: '/efectivo' }] })[this.role] || [];
    },
    gmv() { return this.series.map((d) => ({ label: d.date.slice(5), value: d.gmv })); },
    pays() { return this.series.map((d) => ({ label: d.date.slice(5), value: d.payments })); }
  },
  mounted() { this.load(); this._i = setInterval(() => !document.hidden && this.load(), 45000); },
  beforeUnmount() { clearInterval(this._i); },
  methods: {
    kkind(k) { return /^(held|route|receivable|credit|commission|on_hand|pending)$/.test(k.key) ? 'money' : (k.key === 'rating' ? 'dec' : 'num'); },
    kval(k) { return typeof k.value === 'number' ? k.value : Number(k.value); },
    async load() {
      try { this.home = await EP.get('/ops/home'); if (this.role === 'admin' && !this.series.length) this.series = (await EP.get('/ops/series?days=14')).days; } catch (e) { EP.err(e); }
    },
    async tick() {
      this.ticking = true;
      try { const r = await EP.post('/admin/tick'); const n = Object.entries(r.counts).map(([k, v]) => k + ': ' + v).join(' · '); EP.toast('Motor ejecutado' + (n ? ' — ' + n : ' — sin novedades'), 'ok', 6000); await this.load(); } catch (e) { EP.err(e); } finally { this.ticking = false; }
    },
    act(t) {
      const [a, b] = String(t.payload || '').split('|');
      const go = {
        collect_cash: '/ruta', close_corte: '/ruta', open_manifest: `/salidas?exc=${a}&date=${b}`, complete_departure: `/salidas?exc=${a}&date=${b}`,
        departure_risk: `/salidas?exc=${a}&date=${b}`, open_ticket: `/tickets?id=${t.entity_id}`, pay_settlement: '/liquidaciones', generate_guide: '/paquetes',
        flash_promo: '/admin/pricing_rules', confirm_transfer: '/efectivo', confirm_club: '/efectivo'
      }[t.action];
      if (go) EP.go(go);
    }
  }
};
</script>
<style scoped>
.hello { background: radial-gradient(600px 160px at 100% 0%, color-mix(in srgb, var(--brand) 22%, transparent), transparent 70%), var(--surface); }
@media (max-width: 960px) { #hoy-grid { grid-template-columns: 1fr !important; } }
</style>
