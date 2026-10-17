<template>
  <div class="stack" style="--gap:16px">
    <div class="row between wrap"><p class="muted small" style="max-width:60ch">Tus experiencias visibles en el sitio. El precio es por persona; el apartado es lo que el cliente paga para reservar su lugar.</p><button class="btn btn-primary" @click="edit()"><ep-ico name="plus" :size="18" /> Nueva excursión</button></div>
    <ep-table ref="t" resource="excursions" :columns="cols" clickable @row-click="edit" export-name="excursiones" search-placeholder="Buscar excursión…">
      <template #cell-name="{ row }"><div class="row" style="gap:12px"><ep-cover :seed="row.id" :tags="row.tags" :name="row.name" ratio="1" style="width:44px;border-radius:12px;flex:none" /><div><b>{{ row.name }}</b><div class="tiny muted">{{ row.destination }}</div></div></div></template>
      <template #cell-active="{ row }"><ep-badge :status="row.active ? 'active' : 'dismissed'" :text="row.active ? 'Publicada' : 'Oculta'" /></template>
      <template #actions="{ row }"><a class="btn btn-ghost btn-sm" :href="EP.root + 'website/#/excursion/' + row.id" target="_blank" rel="noopener">Ver en sitio</a></template>
    </ep-table>
    <ep-modal :open="open" :title="form.id ? 'Editar excursión' : 'Nueva excursión'" wide @close="open = false">
      <ep-form :fields="fields" v-model="form" :busy="busy" submit-label="Guardar" @submit="save" />
    </ep-modal>
  </div>
</template>
<script>
export default {
  data() {
    return { EP, open: false, busy: false, form: {}, provs: [],
      cols: [{ key: 'name', label: 'Excursión' }, { key: 'price', label: 'Precio', fmt: 'money', align: 'right' }, { key: 'deposit_amount', label: 'Apartado', fmt: 'money', align: 'right' }, { key: 'max_capacity', label: 'Cupo', fmt: 'num', align: 'right' }, { key: 'rating_avg', label: '★', fmt: 'num' }, { key: 'active', label: 'Estado' }] };
  },
  computed: {
    fields() {
      const f = [
        { key: 'name', label: 'Nombre', required: true, wide: true }, { key: 'destination', label: 'Destino', required: true },
        { key: 'duration', label: 'Duración', placeholder: '1 día · 10 h' }, { key: 'price', label: 'Precio por persona (MXN)', type: 'number', required: true, min: 0 },
        { key: 'deposit_amount', label: 'Apartado por persona (MXN)', type: 'number', help: '0 = exige pago completo', min: 0 }, { key: 'max_capacity', label: 'Cupo por salida', type: 'number', help: '0 = sin límite', min: 0 },
        { key: 'min_people', label: 'Mínimo para operar', type: 'number', help: 'Si no se alcanza, te avisamos y puedes cancelar con crédito', min: 0 }, { key: 'cutoff_days', label: 'Días límite de pago', type: 'number', help: 'Antes de la salida; vacío usa el estándar (3)', min: 0 },
        { key: 'departure_time', label: 'Hora de salida', placeholder: '06:00' }, { key: 'meeting_point', label: 'Punto de encuentro', wide: true },
        { key: 'tags', label: 'Etiquetas (separadas por coma)', placeholder: 'sierra,naturaleza', wide: true }, { key: 'description', label: 'Descripción', type: 'textarea' }, { key: 'policy', label: 'Política mostrada al cliente', type: 'textarea' },
        { key: 'image_url', label: 'Imagen (URL, opcional)', wide: true, help: 'Si lo dejas vacío generamos una portada automática.' }, { key: 'featured', label: 'Destacar como favorita', type: 'checkbox' }, { key: 'active', label: 'Publicada en el sitio', type: 'checkbox' }
      ];
      if (EP.session.user.role === 'admin') f.splice(1, 0, { key: 'provider_id', label: 'Proveedor', type: 'select', options: this.provs.map((p) => ({ value: p.id, label: p.name })), required: true });
      return f;
    }
  },
  async mounted() { if (EP.session.user.role === 'admin') { try { this.provs = (await EP.get('/r/providers?limit=200')).items; } catch (_) {} } },
  methods: {
    edit(r) { this.form = r && r.id ? { ...r } : { active: true, price: 0, deposit_amount: 0, max_capacity: 0, min_people: 0, cutoff_days: 0 }; this.open = true; },
    async save(f) {
      this.busy = true;
      try {
        const body = { ...f }; ['price', 'deposit_amount', 'max_capacity', 'min_people', 'cutoff_days'].forEach((k) => { body[k] = Number(body[k]) || 0; });
        body.featured = body.featured ? 1 : 0; body.active = body.active ? 1 : 0;
        if (f.id) await EP.put('/r/excursions/' + f.id, body); else await EP.post('/r/excursions', body);
        EP.toast('Guardado', 'ok'); this.open = false; this.$refs.t.reload();
      } catch (e) { EP.err(e); } finally { this.busy = false; }
    }
  }
};
</script>
