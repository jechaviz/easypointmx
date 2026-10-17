<template>
  <div class="stack" style="--gap:22px">
    <div class="row between wrap"><div class="seg"><button v-for="d in [7, 30, 90]" :key="d" :class="{ on: days === d }" @click="days = d; load()">{{ d }} días</button></div><span class="small muted" v-if="e">Desde {{ EP.fmt.date(e.since, { day: 'numeric', month: 'short' }) }} · supuestos en Automatización → <i>econ.*</i></span></div>

    <template v-if="e">
      <div class="grid auto-grid" style="--min:200px;--gap:14px">
        <ep-kpi label="Ventas reservadas (GMV)" :value="e.excursions.gmv_booked" kind="money" :hint="e.excursions.active + ' reservas vivas · ticket ' + EP.fmt.money(e.excursions.avg_ticket)" />
        <ep-kpi label="Ingreso de Easypoint" :value="e.contribution.revenue" kind="money" tone="ok" hint="reconocido en el periodo" />
        <ep-kpi label="Margen de contribución" :value="e.contribution.margin" kind="money" :tone="e.contribution.margin >= 0 ? 'ok' : 'bad'" :hint="e.contribution.margin_pct + '% del ingreso'" />
        <ep-kpi label="Dinero en custodia" :value="e.custody.float_total" kind="money" tone="info" hint="float: efectivo + anticipos + crédito" />
      </div>

      <div class="grid g2" style="--gap:18px" id="eg">
        <section class="card card-pad stack" style="--gap:12px"><h3 class="h3">¿De dónde sale el ingreso?</h3><ep-chart kind="donut" :data="rev" format="money" center-label="ingreso" /></section>
        <section class="card card-pad stack" style="--gap:12px"><h3 class="h3">Costo de crecer</h3><ep-chart kind="bar" :data="cost" format="money" :height="190" label="Costo variable" />
          <div class="small muted">Comisión a puntos {{ EP.fmt.money(e.contribution.point_commission_paid) }} · descuentos {{ EP.fmt.money(e.growth_cost.discounts) }} · referidos y cashback {{ EP.fmt.money(e.growth_cost.referral_and_cashback) }}.</div></section>
        <section class="card card-pad stack" style="--gap:12px"><h3 class="h3">Embudo de reservas</h3><ep-chart kind="bar" :data="funnel" :height="190" label="Etapas" />
          <div class="row between small"><span>Conversión a abono <b>{{ e.health.deposit_conversion_pct }}%</b></span><span>Cancelación <b>{{ e.health.cancel_rate_pct }}%</b></span></div></section>
        <section class="card card-pad stack" style="--gap:12px"><h3 class="h3">Ventas por día</h3><ep-chart kind="line" :data="series" format="money" :height="190" label="Ventas" /></section>
        <section class="card card-pad stack" style="--gap:12px"><h3 class="h3">Dónde está el dinero</h3><ep-chart kind="donut" :data="custody" format="money" center-label="en custodia" /></section>
        <section class="card card-pad stack" style="--gap:12px"><h3 class="h3">Clientes</h3>
          <div class="grid g3" style="--gap:10px"><div class="mini"><span>Compradores</span><b>{{ e.customers.buyers }}</b></div><div class="mini"><span>Recompra</span><b>{{ e.customers.repeat_rate_pct }}%</b></div><div class="mini"><span>LTV prom.</span><b class="num">{{ EP.fmt.money(e.customers.avg_ltv) }}</b></div></div>
          <ep-chart kind="donut" :data="segs" center-label="clientes" /></section>
      </div>

      <section class="stack" style="--gap:12px"><h3 class="h3">Palancas de negocio (simulación con tus datos)</h3>
        <div class="grid auto-grid" style="--min:260px;--gap:14px"><article class="card card-pad stack" style="--gap:6px" v-for="l in levers" :key="l.t"><b>{{ l.t }}</b><div class="h2 num grad">{{ l.v }}</div><span class="small muted">{{ l.d }}</span></article></div></section>

      <section class="card card-pad stack" style="--gap:10px"><h3 class="h3">Lo que cada línea deja</h3>
        <div class="table-wrap"><table class="table"><thead><tr><th>Línea</th><th class="right">Volumen</th><th class="right">Ingreso Easypoint</th><th class="right">Costo a puntos</th><th>Cómo gana</th></tr></thead><tbody>
          <tr><td><b>Excursiones</b></td><td class="right num">{{ EP.fmt.money(e.excursions.gmv_booked) }}</td><td class="right num">{{ EP.fmt.money(e.excursions.take_booked + e.excursions.protect_revenue) }}</td><td class="right num">—</td><td class="small muted">Fee del proveedor ({{ e.excursions.take_rate_pct }}% efectivo) + Protege</td></tr>
          <tr><td><b>Guías</b></td><td class="right num">{{ EP.fmt.money(e.guides.gmv) }}</td><td class="right num">{{ EP.fmt.money(e.guides.take) }}</td><td class="right num">{{ EP.fmt.money(e.guides.point_commission) }}</td><td class="small muted">Margen de convenio + seguro de envío</td></tr>
          <tr><td><b>Servicios</b></td><td class="right num">{{ EP.fmt.money(e.services.gmv) }}</td><td class="right num">{{ EP.fmt.money(e.services.take) }}</td><td class="right num">{{ EP.fmt.money(e.services.point_commission) }}</td><td class="small muted">Take sobre ventas del catálogo</td></tr>
          <tr><td><b>Club y breakage</b></td><td class="right num">—</td><td class="right num">{{ EP.fmt.money(e.club.revenue + e.growth_cost.breakage_revenue) }}</td><td class="right num">—</td><td class="small muted">Membresías + crédito vencido</td></tr></tbody></table></div></section>
    </template>
    <div v-else class="grid g2" style="--gap:14px"><div class="skeleton" style="height:240px" v-for="n in 4" :key="n"></div></div>
  </div>
</template>
<script>
export default {
  data() { return { EP, days: 30, e: null, ser: [] }; },
  computed: {
    rev() { const e = this.e; return [{ label: 'Fee de proveedores', value: e.excursions.take_recognized }, { label: 'Protege', value: e.excursions.protect_revenue }, { label: 'Guías', value: e.guides.take }, { label: 'Servicios', value: e.services.take }, { label: 'Breakage', value: e.growth_cost.breakage_revenue }, { label: 'Club', value: e.club.revenue }].filter((x) => x.value > 0); },
    cost() { const e = this.e; return [{ label: 'Comisión puntos', value: e.contribution.point_commission_paid, color: '#f59e0b' }, { label: 'Descuentos', value: e.growth_cost.discounts, color: '#e11d48' }, { label: 'Referidos/cashback', value: e.growth_cost.referral_and_cashback, color: '#8b5cf6' }, { label: 'Bono cancelación', value: e.growth_cost.cancellation_bonus, color: '#64748b' }]; },
    funnel() { const o = ['reservado', 'abonado', 'pagado', 'abordado', 'completado', 'credito', 'cancelado']; return o.map((k) => ({ label: EP.status(k).text, value: this.e.funnel[k] || 0 })); },
    custody() { const c = this.e.custody; return [{ label: 'Efectivo en puntos', value: c.cash_at_points }, { label: 'Efectivo en ruta', value: c.cash_in_route }, { label: 'Anticipos de clientes', value: c.customer_deposits_on_active_trips }].filter((x) => x.value > 0); },
    segs() { return Object.entries(this.e.customers.segments).map(([k, v]) => ({ label: EP.fmt.cap(EP.fmt.snake(k)), value: v })); },
    series() { return this.ser.map((d) => ({ label: d.date.slice(5), value: d.gmv })); },
    levers() {
      const e = this.e, g = e.excursions.gmv_booked, pp = Number(EP.config['pricing.protect_pct'] || 6);
      return [
        { t: '+10 pts de adopción de Protege', v: EP.fmt.money(g * 0.10 * pp / 100), d: 'Ingreso adicional si 1 de cada 10 clientes más lo contrata (sobre tu GMV del periodo).' },
        { t: '+1 pt de take rate al proveedor', v: EP.fmt.money(g * 0.01), d: 'Cada punto porcentual de fee, sin cambiar el volumen.' },
        { t: 'Reducir cancelaciones 5 pts', v: EP.fmt.money(g * 0.05 * (e.excursions.take_rate_pct || 15) / 100), d: 'Ingreso que hoy se pierde en reservas que no se completan.' },
        { t: '+20 socios Club', v: EP.fmt.money(20 * Number(EP.config['club.price_month'] || 99) * 12), d: 'Ingreso anual recurrente (antes del costo de cashback).' }
      ];
    }
  },
  mounted() { this.load(); },
  methods: { async load() { this.e = null; try { const [e, s] = await Promise.all([EP.get('/ops/economics?days=' + this.days), EP.get('/ops/series?days=' + Math.min(this.days, 30))]); this.e = e; this.ser = s.days; } catch (x) { EP.err(x); } } }
};
</script>
<style scoped>
.mini { padding: 10px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line); display: grid; } .mini span { font-size: .7rem; color: var(--muted); text-transform: uppercase; } .mini b { font-size: 1.15rem; }
@media (max-width: 960px) { #eg { grid-template-columns: 1fr !important; } }
</style>
