<template>
  <div class="stack" style="--gap:20px">
    <div class="grid auto-grid" style="--min:200px;--gap:14px" v-if="s"><ep-kpi label="Efectivo en tu punto" :value="s.held" kind="money" hint="neto de tu comisión · esperando chofer" tone="warn" /><ep-kpi label="Con el chofer" :value="s.collected" kind="money" hint="recolectado, por entregar" tone="info" /><ep-kpi label="Tu comisión (30 días)" :value="s.commission" kind="money" hint="ganancia del punto" tone="ok" /><ep-kpi label="Operaciones (30 días)" :value="s.count" hint="abonos, guías y servicios" /></div>
    <div class="card card-pad"><ol class="flow"><li v-for="(x, i) in steps" :key="x.t"><span class="n">{{ i + 1 }}</span><div><b>{{ x.t }}</b><div class="tiny muted">{{ x.d }}</div></div></li></ol></div>
    <ep-table resource="payments" :columns="cols" :filters="[{ key: 'status', label: 'Estado', options: [{ value: 'held_at_point', label: 'En tu punto' }, { value: 'collected', label: 'Con el chofer' }, { value: 'delivered', label: 'Entregado' }] }, { key: 'kind', label: 'Tipo', options: [{ value: 'excursion', label: 'Excursiones' }, { value: 'guide', label: 'Guías' }, { value: 'service', label: 'Servicios' }] }]" export-name="mi-caja" search-placeholder="Buscar…">
      <template #cell-kind="{ row }"><span class="chip">{{ { excursion: 'Excursión', guide: 'Guía', service: 'Servicio' }[row.kind] || row.kind }}</span></template>
      <template #cell-status="{ row }"><ep-badge :status="row.status" /></template>
    </ep-table>
  </div>
</template>
<script>
export default {
  data() { return { EP, s: null, cols: [{ key: 'created_at', label: 'Fecha', fmt: 'dt' }, { key: 'kind', label: 'Tipo' }, { key: 'label', label: 'Detalle' }, { key: 'amount', label: 'Monto', fmt: 'money', align: 'right' }, { key: 'commission', label: 'Tu comisión', fmt: 'money2', align: 'right' }, { key: 'status', label: 'Estado' }],
    steps: [{ t: 'Recibes el efectivo', d: 'Lo registras en tu panel al instante.' }, { t: 'Pasa el chofer', d: 'Recolecta el neto (monto − tu comisión).' }, { t: 'Entrega al administrador', d: 'El chofer cierra su corte con folio.' }, { t: 'Liquidamos tu comisión', d: 'Se acumula y se paga en la liquidación.' }] }; },
  async mounted() {
    try {
      const all = (await EP.get('/r/payments?limit=500&from=' + new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10))).items;
      const sum = (f) => all.filter(f).reduce((a, p) => a + Number(p.net || 0), 0);
      this.s = { held: sum((p) => p.status === 'held_at_point' && p.method !== 'credit'), collected: sum((p) => p.status === 'collected'), commission: all.reduce((a, p) => a + Number(p.commission || 0), 0), count: all.length };
    } catch (e) { EP.err(e); }
  }
};
</script>
<style scoped>
.flow { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; } .flow li { display: flex; gap: 12px; align-items: flex-start; } .n { width: 30px; height: 30px; border-radius: 50%; background: var(--brand); color: var(--on-brand); display: grid; place-items: center; font-weight: 900; flex: none; }
@media (max-width: 860px) { .flow { grid-template-columns: 1fr 1fr; } }
</style>
