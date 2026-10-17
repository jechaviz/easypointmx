<template>
  <div class="stack" style="--gap:18px">
    <div class="grid auto-grid" style="--min:200px;--gap:14px"><ep-kpi label="En puntos" :value="tot.held" kind="money" tone="warn" hint="neto retenido, por recolectar" /><ep-kpi label="Con choferes" :value="tot.route" kind="money" tone="info" hint="recolectado, por entregar" /><ep-kpi label="Entregado (30 d)" :value="tot.delivered" kind="money" tone="ok" hint="ya está con Easypoint" /><ep-kpi label="Transferencias por confirmar" :value="pending.length" :tone="pending.length ? 'bad' : 'ok'" hint="verifica el depósito" /></div>

    <section class="card card-pad stack" style="--gap:10px" v-if="pending.length"><h3 class="h3">Transferencias por confirmar</h3>
      <div v-for="p in pending" :key="p.id" class="row between wrap pend"><div><b>{{ p.label }}</b><div class="tiny muted">Ref {{ p.gateway_ref }} · {{ EP.fmt.ago(p.created_at) }}</div></div><div class="row" style="gap:10px"><b class="num">{{ EP.fmt.money(p.amount) }}</b><button class="btn btn-primary btn-sm" @click="confirm(p)">Confirmar depósito</button></div></div></section>

    <div class="grid g3" style="--gap:16px" id="ef">
      <section class="col"><header><b>En puntos</b><span class="chip">{{ byPoint.length }}</span></header>
        <article v-for="g in byPoint" :key="g.k" class="card c"><div class="row between"><b>{{ g.k }}</b><b class="num">{{ EP.fmt.money(g.net) }}</b></div><div class="tiny muted">{{ g.n }} abonos · hace {{ g.days }} d · comisión {{ EP.fmt.money(g.com) }}</div><div class="progress mt-1"><i :style="{ width: Math.min(100, g.net / limit * 100) + '%', background: g.net >= limit ? 'var(--bad)' : '' }"></i></div></article>
        <div v-if="!byPoint.length" class="tiny muted center" style="padding:20px">Sin efectivo retenido 🎉</div></section>
      <section class="col"><header><b>Con choferes</b><span class="chip">{{ byDriver.length }}</span></header>
        <article v-for="g in byDriver" :key="g.k" class="card c"><div class="row between"><b>{{ g.k }}</b><b class="num">{{ EP.fmt.money(g.net) }}</b></div><div class="tiny muted">{{ g.n }} pagos · desde hace {{ g.days }} d</div><div class="progress mt-1"><i :style="{ width: Math.min(100, g.net / dlimit * 100) + '%', background: g.net >= dlimit ? 'var(--bad)' : '' }"></i></div></article>
        <div v-if="!byDriver.length" class="tiny muted center" style="padding:20px">Nadie trae efectivo</div></section>
      <section class="col"><header><b>Cortes recientes</b></header>
        <article v-for="c in cortes" :key="c.id" class="card c"><div class="row between"><b class="small">{{ c.folio }}</b><b class="num">{{ EP.fmt.money(c.net) }}</b></div><div class="tiny muted">{{ c.ref_name }} · {{ EP.fmt.ago(c.created_at) }}</div></article>
        <div v-if="!cortes.length" class="tiny muted center" style="padding:20px">Sin cortes aún</div></section>
    </div>
    <section class="stack" style="--gap:10px"><h3 class="h3">Libro de pagos</h3><ep-table resource="payments" :columns="cols" :filters="[{ key: 'status', label: 'Estado', options: ['held_at_point', 'collected', 'delivered', 'pending_confirm'] }, { key: 'kind', label: 'Tipo', options: ['excursion', 'guide', 'service', 'club'] }]" export-name="libro-pagos"><template #cell-status="{ row }"><ep-badge :status="row.status" /></template></ep-table></section>
  </div>
</template>
<script>
export default {
  data() { return { EP, rows: [], cortes: [], limit: 3000, dlimit: 5000, cols: [{ key: 'created_at', label: 'Fecha', fmt: 'dt' }, { key: 'kind', label: 'Tipo' }, { key: 'label', label: 'Detalle' }, { key: 'point_name', label: 'Punto' }, { key: 'amount', label: 'Monto', fmt: 'money', align: 'right' }, { key: 'commission', label: 'Comisión', fmt: 'money2', align: 'right' }, { key: 'status', label: 'Estado' }] }; },
  computed: {
    pending() { return this.rows.filter((r) => r.status === 'pending_confirm'); },
    tot() { const s = (st, f) => this.rows.filter((r) => r.status === st && r.method !== 'credit').reduce((a, r) => a + Number(r[f] || 0), 0); return { held: s('held_at_point', 'net'), route: s('collected', 'collected_amount'), delivered: s('delivered', 'net') }; },
    byPoint() { return this.group(this.rows.filter((r) => r.status === 'held_at_point' && r.method !== 'credit'), (r) => r.point_name || 'Sin punto', 'net', 'created_at'); },
    byDriver() { return this.group(this.rows.filter((r) => r.status === 'collected'), (r) => r.collected_by_name || 'Chofer', 'collected_amount', 'collected_at'); }
  },
  mounted() { this.load(); },
  methods: {
    async load() { try { this.rows = (await EP.get('/r/payments?limit=500&sort=-id')).items; this.cortes = (await EP.get('/r/settlements?kind=driver_corte&limit=6&sort=-id')).items; const c = await EP.get('/admin/config'); const g = (k, d) => Number((c.items.find((x) => x.ckey === k) || {}).cvalue) || d; this.limit = g('cash.point_limit', 3000); this.dlimit = g('cash.driver_limit', 5000); } catch (e) { EP.err(e); } },
    group(rows, key, f, ts) { const m = {}; rows.forEach((r) => { const k = key(r); const o = (m[k] ||= { k, net: 0, n: 0, com: 0, t: Date.now() }); o.net += Number(r[f] || 0); o.n++; o.com += Number(r.commission || 0); const t = Date.parse(String(r[ts] || '').replace(' ', 'T') + 'Z'); if (t && t < o.t) o.t = t; }); return Object.values(m).map((o) => ({ ...o, days: Math.max(0, Math.floor((Date.now() - o.t) / 864e5)) })).sort((a, b) => b.net - a.net); },
    async confirm(p) { if (!(await EP.confirm(`¿Ya viste el depósito de ${EP.fmt.money(p.amount)} (ref ${p.gateway_ref})?`, { ok: 'Sí, confirmar' }))) return; try { await EP.post(`/admin/payments/${p.id}/confirm`); EP.toast('Pago aplicado', 'ok'); this.load(); } catch (e) { EP.err(e); } }
  }
};
</script>
<style scoped>
.col { background: var(--bg-2); border-radius: var(--r); padding: 12px; display: grid; gap: 10px; align-content: start; min-height: 160px; } .col header { display: flex; gap: 8px; align-items: center; } .c { padding: 12px 14px; }
.pend { padding: 10px 0; border-bottom: 1px dashed var(--line-2); }
@media (max-width: 960px) { #ef { grid-template-columns: 1fr !important; } }
</style>
