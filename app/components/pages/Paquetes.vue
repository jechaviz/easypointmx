<template>
  <div class="stack" style="--gap:18px">
    <div class="seg"><button :class="{ on: tab === 'paquetes' }" @click="tab = 'paquetes'">Paquetes</button><button :class="{ on: tab === 'guias' }" @click="tab = 'guias'">Guías</button></div>

    <ep-table v-if="tab === 'paquetes'" ref="t1" resource="shipments" :columns="c1" :filters="[{ key: 'status', label: 'Estado', options: [{ value: 'at_point', label: 'En el punto' }, { value: 'in_transit', label: 'En camino' }, { value: 'pending', label: 'Registrado' }, { value: 'delivered', label: 'Entregado' }] }]" search-placeholder="Buscar por rastreo o nombre…" export-name="paquetes">
      <template #cell-tracking_id="{ row }"><b class="tag-mono">{{ row.tracking_id }}</b></template>
      <template #cell-status="{ row }"><ep-badge :status="row.status" /></template>
      <template #actions="{ row }"><div class="row" style="gap:6px;justify-content:flex-end">
        <a v-if="row.recipient_phone" class="btn btn-soft btn-sm" target="_blank" rel="noopener" :href="EP.wa(row.recipient_phone, 'Hola, tu paquete ' + row.tracking_id + ' ya está en tu punto Easypoint.')">WhatsApp</a>
        <button class="btn btn-ghost btn-sm" v-if="row.status !== 'at_point' && row.status !== 'delivered'" @click="setSt(row, 'at_point')">Llegó</button>
        <button class="btn btn-primary btn-sm" v-if="row.status === 'at_point'" @click="setSt(row, 'delivered')">Entregar</button></div></template>
    </ep-table>

    <ep-table v-else ref="t2" resource="guides" :columns="c2" :filters="[{ key: 'status', label: 'Estado', options: [{ value: 'paid', label: 'Por generar' }, { value: 'generated', label: 'Generada' }, { value: 'quoted', label: 'Cotizada' }] }]" export-name="guias">
      <template #cell-carrier="{ row }"><b>{{ row.carrier.toUpperCase() }}</b> <span class="tiny muted">{{ row.service }}</span></template>
      <template #cell-status="{ row }"><ep-badge :status="row.status" /></template>
      <template #actions="{ row }"><button class="btn btn-primary btn-sm" v-if="row.status === 'paid'" @click="gen(row)">Capturar guía</button><span class="small" v-else-if="row.tracking_number">{{ row.tracking_number }}</span></template>
    </ep-table>
  </div>
</template>
<script>
export default {
  data() { return { EP, tab: EP.route.query.tab === 'guias' ? 'guias' : 'paquetes', c1: [{ key: 'tracking_id', label: 'Rastreo' }, { key: 'recipient_name', label: 'Destinatario' }, { key: 'status', label: 'Estado' }, { key: 'updated_at', label: 'Actualizado', fmt: 'ago' }],
    c2: [{ key: 'created_at', label: 'Fecha', fmt: 'dt' }, { key: 'carrier', label: 'Paquetería' }, { key: 'recipient_name', label: 'Destinatario' }, { key: 'price', label: 'Precio', fmt: 'money', align: 'right' }, { key: 'status', label: 'Estado' }] }; },
  methods: {
    async setSt(r, st) { try { await EP.post(`/ops/shipment/${r.id}/status`, { status: st }); EP.toast('Actualizado', 'ok'); this.$refs.t1.reload(); } catch (e) { EP.err(e); } },
    async gen(r) { const n = await EP.prompt('Número de guía del transportista (' + r.carrier.toUpperCase() + ')', { title: 'Generar guía', placeholder: 'Ej. 1234567890' }); if (!n) return; try { await EP.post(`/ops/guide/${r.id}/generate`, { tracking_number: n }); EP.toast('Guía generada', 'ok'); this.$refs.t2.reload(); } catch (e) { EP.err(e); } }
  }
};
</script>
