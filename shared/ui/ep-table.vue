<template>
  <div class="stack" style="--gap:12px">
    <div class="row wrap" v-if="search || filters.length || $slots.toolbar">
      <input v-if="search" class="input" style="max-width:280px" type="search" v-model="q" :placeholder="searchPlaceholder" @input="debounced" aria-label="Buscar" />
      <select v-for="f in filters" :key="f.key" class="select" style="max-width:200px" v-model="fv[f.key]" @change="page = 0; load()" :aria-label="f.label">
        <option value="">{{ f.label }}</option>
        <option v-for="o in f.options" :key="o.value ?? o" :value="o.value ?? o">{{ o.label ?? o }}</option>
      </select>
      <div class="grow"></div>
      <slot name="toolbar" />
      <button v-if="exportName" class="btn btn-ghost btn-sm" @click="exportCsv">⬇ CSV</button>
      <button class="btn btn-ghost btn-sm" @click="load" aria-label="Actualizar">↻</button>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th v-for="c in columns" :key="c.key" :class="{ right: c.align === 'right' }" :style="c.width ? { width: c.width } : null">{{ c.label }}</th><th v-if="$slots.actions"></th></tr></thead>
        <tbody>
          <tr v-if="loading"><td :colspan="columns.length + 1"><div class="skeleton" style="height:18px"></div></td></tr>
          <tr v-else-if="!view.length"><td :colspan="columns.length + 1"><ep-empty icon="🗂️">{{ emptyText }}</ep-empty></td></tr>
          <tr v-for="(r, i) in view" :key="r.id ?? i" :class="{ click: clickable }" @click="$emit('row-click', r)">
            <td v-for="c in columns" :key="c.key" :class="{ right: c.align === 'right', num: c.fmt === 'money' || c.fmt === 'num' }">
              <slot :name="'cell-' + c.key" :row="r" :value="r[c.key]">{{ cell(r, c) }}</slot>
            </td>
            <td v-if="$slots.actions" class="right" @click.stop><slot name="actions" :row="r" /></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="row between small muted" v-if="resource && total > pageSize">
      <span>{{ page * pageSize + 1 }}–{{ Math.min(total, (page + 1) * pageSize) }} de {{ total }}</span>
      <span class="row"><button class="btn btn-ghost btn-sm" :disabled="page === 0" @click="page--; load()">←</button><button class="btn btn-ghost btn-sm" :disabled="(page + 1) * pageSize >= total" @click="page++; load()">→</button></span>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    columns: { type: Array, required: true }, resource: String, params: { type: Object, default: () => ({}) },
    rows: Array, search: { type: Boolean, default: true }, searchPlaceholder: { type: String, default: 'Buscar…' },
    filters: { type: Array, default: () => [] }, pageSize: { type: Number, default: 25 }, clickable: Boolean,
    emptyText: { type: String, default: 'Sin registros todavía.' }, exportName: String
  },
  emits: ['row-click', 'loaded'],
  data() { return { items: [], total: 0, loading: false, q: '', page: 0, fv: {} }; },
  computed: {
    view() {
      if (this.resource) return this.items;
      const src = this.rows || [];
      const q = this.q.trim().toLowerCase();
      return q ? src.filter((r) => JSON.stringify(r).toLowerCase().includes(q)) : src;
    }
  },
  watch: { params: { deep: true, handler() { this.page = 0; this.load(); } }, rows() { this.items = this.rows || []; } },
  created() { this.filters.forEach((f) => { this.fv[f.key] = f.value || ''; }); },
  mounted() { this.load(); },
  methods: {
    debounced() { clearTimeout(this._t); this._t = setTimeout(() => { this.page = 0; this.load(); }, 280); },
    async load() {
      if (!this.resource) { this.items = this.rows || []; return; }
      this.loading = true;
      try {
        const p = Object.assign({}, this.params, this.fv, { limit: this.pageSize, offset: this.page * this.pageSize, q: this.q });
        const r = await EP.get('/r/' + this.resource + EP.qs(p));
        this.items = r.items; this.total = r.total; this.$emit('loaded', r);
      } catch (e) { EP.err(e); } finally { this.loading = false; }
    },
    cell(r, c) {
      const v = r[c.key];
      switch (c.fmt) {
        case 'money': return EP.fmt.money(v);
        case 'money2': return EP.fmt.money2(v);
        case 'num': return EP.fmt.num(v);
        case 'date': return EP.fmt.date(v);
        case 'dt': return EP.fmt.dt(v);
        case 'ago': return EP.fmt.ago(v);
        case 'phone': return EP.fmt.phone(v);
        case 'bool': return v ? 'Sí' : '—';
        case 'status': return EP.status(v).text;
        case 'pct': return EP.fmt.pct(v);
        default: return v == null || v === '' ? '—' : v;
      }
    },
    async exportCsv() {
      try {
        const r = this.resource ? (await EP.get('/r/' + this.resource + EP.qs(Object.assign({}, this.params, this.fv, { limit: 500, q: this.q })))).items : this.view;
        EP.csv(r, (this.exportName || 'export') + '.csv');
      } catch (e) { EP.err(e); }
    },
    reload() { return this.load(); }
  }
};
</script>
