<template>
  <div class="stack" style="--gap:16px">
    <div class="callout small"><ep-ico name="shield" :size="18" /><div>Banderas que levantó el motor sin bloquear a nadie: efectivo grande o estancado, choferes con demasiado efectivo, reservas sospechosas, SLA vencido y topes de premios. Revísalas y márcalas.</div></div>
    <div class="seg"><button v-for="t in tabs" :key="t.k" :class="{ on: st === t.k }" @click="st = t.k">{{ t.l }}</button></div>
    <ep-table ref="t" resource="risk_flags" :params="{ status: st }" :columns="cols" :filters="[{ key: 'severity', label: 'Severidad', options: ['high', 'medium', 'low'] }]" export-name="riesgo">
      <template #cell-severity="{ row }"><ep-badge :status="row.severity" /></template>
      <template #cell-kind="{ row }"><span class="chip">{{ EP.fmt.snake(row.kind) }}</span></template>
      <template #actions="{ row }"><div class="row" style="gap:6px;justify-content:flex-end" v-if="row.status === 'open'"><button class="btn btn-primary btn-sm" @click="set(row, 'reviewed')">Revisada</button><button class="btn btn-ghost btn-sm" @click="set(row, 'dismissed')">Descartar</button></div></template>
    </ep-table>
  </div>
</template>
<script>
export default {
  data() { return { EP, st: 'open', tabs: [{ k: 'open', l: 'Abiertas' }, { k: 'reviewed', l: 'Revisadas' }, { k: 'dismissed', l: 'Descartadas' }], cols: [{ key: 'created_at', label: 'Fecha', fmt: 'ago' }, { key: 'severity', label: 'Severidad' }, { key: 'kind', label: 'Tipo' }, { key: 'detail', label: 'Detalle' }] }; },
  methods: { async set(r, s) { try { await EP.put('/r/risk_flags/' + r.id, { status: s }); this.$refs.t.reload(); } catch (e) { EP.err(e); } } }
};
</script>
<style scoped>.callout { display: flex; gap: 12px; padding: 12px 14px; border-radius: var(--r-sm); background: var(--warn-soft); }</style>
