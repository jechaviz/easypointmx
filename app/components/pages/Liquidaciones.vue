<template>
  <div class="stack" style="--gap:18px">
    <div class="grid auto-grid" style="--min:200px;--gap:14px" v-if="sum"><ep-kpi label="Pendiente de pago" :value="sum.pending" kind="money" tone="warn" :hint="sum.pn + ' liquidaciones'" /><ep-kpi label="Pagado" :value="sum.paid" kind="money" tone="ok" /><ep-kpi label="Fee de Easypoint" :value="sum.fee" kind="money" hint="sobre lo liquidado" /></div>
    <div class="row between wrap" v-if="isAdmin"><p class="small muted">Las liquidaciones a proveedores se generan solas al completar cada salida. Aquí también corres las de comisiones por punto.</p>
      <div class="row" style="gap:8px"><input class="input" type="date" v-model="period" style="width:auto" aria-label="Periodo" /><button class="btn btn-dark" :class="{ 'is-loading': busy }" @click="run"><ep-ico name="refresh" :size="18" /> Liquidar comisiones de puntos</button></div></div>
    <ep-table ref="t" resource="settlements" :columns="cols" :filters="filters" export-name="liquidaciones" search-placeholder="Buscar folio o nombre…">
      <template #cell-kind="{ row }"><span class="chip">{{ { provider: 'Proveedor', point: 'Punto', driver_corte: 'Corte chofer' }[row.kind] || row.kind }}</span></template>
      <template #cell-status="{ row }"><ep-badge :status="row.status === 'paid' ? 'done' : 'pending'" :text="row.status === 'paid' ? 'Pagada' : 'Pendiente'" /></template>
      <template #actions="{ row }"><button class="btn btn-primary btn-sm" v-if="isAdmin && row.status === 'pending' && row.kind !== 'driver_corte'" @click="pay(row)">Marcar pagada</button></template>
    </ep-table>
  </div>
</template>
<script>
export default {
  data() { return { EP, busy: false, period: EP.today(), sum: null, cols: [{ key: 'folio', label: 'Folio' }, { key: 'kind', label: 'Tipo' }, { key: 'ref_name', label: 'Beneficiario' }, { key: 'period', label: 'Periodo' }, { key: 'gross', label: 'Bruto', fmt: 'money', align: 'right' }, { key: 'fee', label: 'Fee / comisión', fmt: 'money', align: 'right' }, { key: 'net', label: 'Neto', fmt: 'money', align: 'right' }, { key: 'status', label: 'Estado' }],
    filters: [{ key: 'status', label: 'Estado', options: [{ value: 'pending', label: 'Pendientes' }, { value: 'paid', label: 'Pagadas' }] }, ...(EP.session.user.role === 'admin' ? [{ key: 'kind', label: 'Tipo', options: [{ value: 'provider', label: 'Proveedores' }, { value: 'point', label: 'Puntos' }, { value: 'driver_corte', label: 'Cortes' }] }] : [])] }; },
  computed: { isAdmin() { return EP.session.user.role === 'admin'; } },
  mounted() { this.stats(); },
  methods: {
    async stats() { try { const all = (await EP.get('/r/settlements?limit=500')).items.filter((s) => s.kind !== 'driver_corte'); const f = (st) => all.filter((s) => s.status === st); this.sum = { pending: f('pending').reduce((a, s) => a + Number(s.net), 0), pn: f('pending').length, paid: f('paid').reduce((a, s) => a + Number(s.net), 0), fee: all.reduce((a, s) => a + Number(s.fee), 0) }; } catch (_) {} },
    async run() { this.busy = true; try { const r = await EP.post('/admin/settlements/run', { period: this.period }); EP.toast(r.created ? r.created + ' liquidaciones creadas' : 'No hay pagos nuevos por liquidar', 'ok'); this.$refs.t.reload(); this.stats(); } catch (e) { EP.err(e); } finally { this.busy = false; } },
    async pay(r) { if (!(await EP.confirm(`¿Confirmas que pagaste ${EP.fmt.money(r.net)} a ${r.ref_name}?`, { ok: 'Sí, pagada' }))) return; try { await EP.post(`/admin/settlements/${r.id}/pay`); EP.toast('Marcada como pagada', 'ok'); this.$refs.t.reload(); this.stats(); } catch (e) { EP.err(e); } }
  }
};
</script>
