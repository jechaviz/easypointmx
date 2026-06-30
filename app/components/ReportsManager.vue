<template>
  <div>
    <div class="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 mb-6">
      <h3 class="text-white font-black text-sm uppercase tracking-tight mb-4"><i class="bi bi-file-earmark-spreadsheet text-brand-400"></i> Exportar reporte</h3>
      <div class="grid sm:grid-cols-4 gap-3">
        <div>
          <label class="label-sm">Colección</label>
          <select v-model="coll" class="input-dark">
            <option v-for="c in collections" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </div>
        <div>
          <label class="label-sm">Desde</label>
          <input v-model="from" type="date" class="input-dark">
        </div>
        <div>
          <label class="label-sm">Hasta</label>
          <input v-model="to" type="date" class="input-dark">
        </div>
        <div class="flex items-end">
          <button @click="exportar" :disabled="saving" class="w-full bg-brand-500 text-slate-900 font-black rounded-xl py-3 text-xs uppercase tracking-widest hover:bg-brand-400 disabled:opacity-50"><i class="bi bi-download"></i> {{ saving ? '...' : 'Exportar CSV' }}</button>
        </div>
      </div>
      <p class="text-[10px] text-slate-600 mt-3">Genera un CSV (descarga directa) con los registros cuya fecha de creación cae dentro del rango. Deja las fechas vacías para incluir todo.</p>
    </div>

    <div v-if="result" class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p class="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Registros exportados</p>
        <p class="text-white text-xl font-black">{{ result.count }}</p>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p class="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Total ({{ result.totalField }})</p>
        <p class="text-brand-400 text-xl font-black">{{ formatMoney(result.total) }}</p>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p class="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Archivo</p>
        <p class="text-slate-300 text-xs font-mono break-all">{{ result.file }}</p>
      </div>
    </div>
  </div>
</template>

<script>
const { loadModule } = window['vue3-sfc-loader'];
const options = window.options;

export default {
  inject: ['appState', 'pb_url', 'showModal', 'saveDemoData', 'emitBusinessEvent'],
  components: { DataView: Vue.defineAsyncComponent(() => loadModule('./components/DataView.vue', options)) },
  data() {
    return {
      saving: false,
      coll: 'excursion_bookings',
      from: '',
      to: '',
      result: null,
      collections: [
        { id: 'excursion_bookings', label: 'Reservas de excursión', total: 'total' },
        { id: 'shipping_guides', label: 'Guías de envío', total: 'price' },
        { id: 'payments', label: 'Pagos / cobranza', total: 'amount' },
        { id: 'settlements', label: 'Liquidaciones', total: 'net' }
      ]
    };
  },
  methods: {
    token() { return localStorage.getItem('ep_token'); },
    formatMoney(a) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(a) || 0); },
    async apiGet(coll) {
      if (this.appState.demoMode) return { items: this.appState.demoData[coll] || [] };
      const res = await fetch(`${this.pb_url}/api/collections/${coll}/records?perPage=300&sort=-created`, { headers: { Authorization: this.token() } });
      return res.json();
    },
    csvCell(v) {
      if (v == null) return '';
      let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    },
    async exportar() {
      this.saving = true;
      this.result = null;
      try {
        const def = this.collections.find(c => c.id === this.coll);
        const totalField = def ? def.total : 'amount';
        const d = await this.apiGet(this.coll);
        let items = d.items || [];
        const fromTs = this.from ? new Date(this.from + 'T00:00:00').getTime() : null;
        const toTs = this.to ? new Date(this.to + 'T23:59:59.999').getTime() : null;
        if (fromTs != null || toTs != null) {
          items = items.filter(it => {
            const t = new Date(it.created || 0).getTime();
            if (isNaN(t)) return false;
            if (fromTs != null && t < fromTs) return false;
            if (toTs != null && t > toTs) return false;
            return true;
          });
        }
        if (!items.length) {
          this.showModal({ title: 'Sin registros', message: 'No hay registros en el rango seleccionado.', type: 'info' });
          return;
        }
        const headerSet = [];
        for (const it of items) for (const k of Object.keys(it)) if (!headerSet.includes(k)) headerSet.push(k);
        const lines = [headerSet.map(h => this.csvCell(h)).join(',')];
        let total = 0;
        for (const it of items) {
          lines.push(headerSet.map(h => this.csvCell(it[h])).join(','));
          total += Number(it[totalField]) || 0;
        }
        const csv = '﻿' + lines.join('\r\n');
        const file = `${this.coll}_${this.from || 'inicio'}_${this.to || 'hoy'}.csv`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.result = { count: items.length, total, totalField, file };
        this.showModal({ title: 'Reporte exportado', message: `${items.length} registro(s) exportados. Total ${this.formatMoney(total)}.`, type: 'success' });
      } catch (e) {
        this.showModal({ title: 'Error', message: e.message || 'No se pudo generar el reporte.', type: 'error' });
      } finally {
        this.saving = false;
      }
    }
  }
}
</script>

<style scoped>
.input-dark { width:100%; background-color:#020617; border:1px solid #1e293b; color:#fff; border-radius:0.75rem; padding:0.75rem 1rem; font-size:0.8rem; outline:none; }
.input-dark::placeholder { color:#475569; }
.input-dark:focus { border-color:#84cc16; box-shadow:0 0 0 2px rgba(132,204,22,0.2); }
.label-sm { display:block; font-size:0.6rem; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:#64748b; margin-bottom:0.35rem; }
</style>
