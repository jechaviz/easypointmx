<template>
  <div>
    <DataView :items="settlements" :columns="cols" label="liquidaciones" storageKey="ep_settlements_view">
      <template #header-actions>
        <button @click="runSettlements" :disabled="saving" class="bg-brand-500 hover:bg-brand-400 text-slate-900 font-black px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"><i class="bi bi-cash-stack"></i> {{ saving ? 'Generando...' : 'Generar liquidaciones' }}</button>
      </template>
      <template #row="{ item }">
        <td class="px-6 py-4">
          <span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider" :class="kindBadge(item.kind)">{{ kindLabel(item.kind) }}</span>
        </td>
        <td class="px-6 py-4">
          <div class="flex flex-col"><span class="text-white font-bold text-xs">{{ item.ref_name || item.ref || '—' }}</span><span v-if="item.folio" class="text-[10px] text-slate-500 font-mono">{{ item.folio }}</span></div>
        </td>
        <td class="px-6 py-4 text-[10px] text-slate-400 font-mono">{{ item.period || '—' }}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex flex-col items-end">
            <span class="text-white font-black text-xs">{{ formatMoney(item.gross) }}</span>
            <span class="text-[10px] text-purple-400">fee {{ formatMoney(item.fee) }}</span>
            <span class="text-[10px] text-emerald-400">neto {{ formatMoney(item.net) }}</span>
          </div>
        </td>
        <td class="px-6 py-4"><span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider" :class="statusBadge(item.status)">{{ statusLabel(item.status) }}</span></td>
      </template>
      <template #actions="{ item }">
        <button v-if="item.status !== 'paid'" @click="markPaid(item)" title="Marcar pagado" class="text-emerald-400 hover:text-emerald-300 p-1.5"><i class="bi bi-check2-circle"></i></button>
        <button @click="remove(item)" title="Eliminar" class="text-slate-600 hover:text-red-400 p-1.5"><i class="bi bi-trash3"></i></button>
      </template>
      <template #card="{ item }">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5">
          <div class="flex items-center justify-between mb-2"><span class="text-[9px] font-black px-2 py-1 rounded-lg border uppercase" :class="kindBadge(item.kind)">{{ kindLabel(item.kind) }}</span><span class="text-[9px] font-black px-2 py-1 rounded-lg border uppercase" :class="statusBadge(item.status)">{{ statusLabel(item.status) }}</span></div>
          <p class="text-white font-black text-sm">{{ item.ref_name || item.ref }}</p>
          <p class="text-[10px] text-slate-500 font-mono mb-2">{{ item.period }} <span v-if="item.folio">· {{ item.folio }}</span></p>
          <p class="text-white font-black">{{ formatMoney(item.net) }} <span class="text-[10px] text-slate-500 font-bold">neto</span></p>
        </div>
      </template>
    </DataView>
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
      settlements: [],
      saving: false,
      cols: [
        { key: 'kind', label: 'Tipo' },
        { key: 'ref', label: 'Beneficiario' },
        { key: 'period', label: 'Periodo' },
        { key: 'amounts', label: 'Bruto / Fee / Neto', align: 'right' },
        { key: 'status', label: 'Estado' }
      ]
    };
  },
  mounted() { this.load(); },
  methods: {
    token() { return localStorage.getItem('ep_token'); },
    formatMoney(a) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(a) || 0); },
    kindLabel(k) { return ({ provider: 'Proveedor', point: 'Punto', driver_corte: 'Corte chofer' })[k] || k || '—'; },
    kindBadge(k) {
      return ({
        provider: 'bg-blue-900/30 text-blue-400 border-blue-900/50',
        point: 'bg-purple-900/30 text-purple-400 border-purple-900/50',
        driver_corte: 'bg-amber-900/30 text-amber-400 border-amber-900/50'
      })[k] || 'bg-slate-800 text-slate-400 border-slate-700';
    },
    statusLabel(s) { return ({ pending: 'Pendiente', paid: 'Pagado' })[s] || 'Pendiente'; },
    statusBadge(s) { return ({ pending: 'bg-slate-800 text-slate-400 border-slate-700', paid: 'bg-green-900/30 text-green-400 border-green-900/50' })[s] || 'bg-slate-800 text-slate-400 border-slate-700'; },
    async apiGet(coll) {
      if (this.appState.demoMode) return { items: this.appState.demoData[coll] || [] };
      const res = await fetch(`${this.pb_url}/api/collections/${coll}/records?perPage=300&sort=-created`, { headers: { Authorization: this.token() } });
      return res.json();
    },
    async apiPatch(coll, id, body) {
      if (this.appState.demoMode) {
        const arr = this.appState.demoData[coll] || [];
        const idx = arr.findIndex(i => i.id === id);
        if (idx !== -1) { arr[idx] = { ...arr[idx], ...body, updated: new Date().toISOString() }; this.saveDemoData({ ...this.appState.demoData }); return arr[idx]; }
        return null;
      }
      const res = await fetch(`${this.pb_url}/api/collections/${coll}/records/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: this.token() }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('No se pudo actualizar.');
      return res.json();
    },
    async apiDelete(coll, id) {
      if (this.appState.demoMode) {
        this.appState.demoData[coll] = (this.appState.demoData[coll] || []).filter(i => i.id !== id);
        this.saveDemoData({ ...this.appState.demoData });
        return;
      }
      await fetch(`${this.pb_url}/api/collections/${coll}/records/${id}`, { method: 'DELETE', headers: { Authorization: this.token() } });
    },
    async load() { try { const d = await this.apiGet('settlements'); this.settlements = d.items || []; } catch (_) { this.settlements = []; } },
    async runSettlements() {
      const period = window.prompt('Periodo a liquidar (ej. 2026-07 o "Julio 2026"):', new Date().toISOString().slice(0, 7));
      if (period == null) return;
      const p = String(period).trim();
      if (!p) return this.showModal({ title: 'Periodo requerido', message: 'Captura el periodo a liquidar.', type: 'warning' });
      this.saving = true;
      try {
        if (this.appState.demoMode) {
          this.showModal({ title: 'Liquidaciones', message: 'En modo demo no se generan liquidaciones reales.', type: 'info' });
          return;
        }
        const res = await fetch(`${this.pb_url}/api/settlements/run`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: this.token() }, body: JSON.stringify({ period: p }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.message || 'No se pudieron generar las liquidaciones.');
        this.emitBusinessEvent({ audience: ['admin'], severity: 'success', icon: 'cash-stack', title: 'Liquidaciones generadas', message: `${data.created || 0} liquidación(es) para el periodo ${p}.` });
        this.showModal({ title: 'Liquidaciones generadas', message: `Se generaron ${data.created || 0} liquidación(es) para el periodo ${p}.`, type: 'success' });
        await this.load();
      } catch (e) {
        this.showModal({ title: 'Error', message: e.message, type: 'error' });
      } finally { this.saving = false; }
    },
    async markPaid(item) {
      try { await this.apiPatch('settlements', item.id, { status: 'paid' }); await this.load(); }
      catch (e) { this.showModal({ title: 'Error', message: e.message, type: 'error' }); }
    },
    async remove(item) {
      const ok = await this.showModal({ title: 'Eliminar liquidación', message: '¿Eliminar este registro?', type: 'confirm', confirmText: 'Eliminar' });
      if (!ok) return;
      try { await this.apiDelete('settlements', item.id); await this.load(); }
      catch (e) { this.showModal({ title: 'Error', message: e.message, type: 'error' }); }
    }
  }
}
</script>

<style scoped>
.label-sm { display:block; font-size:10px; font-weight:900; color:#64748b; text-transform:uppercase; letter-spacing:0.2em; margin-bottom:0.5rem; padding-left:0.25rem; }
.input-dark { width:100%; background-color:#020617; border:1px solid #1e293b; color:#fff; border-radius:1rem; padding:0.85rem 1.1rem; font-size:0.8rem; transition:all 0.2s; outline:none; }
.input-dark::placeholder { color:#475569; }
.input-dark:focus { border-color:#84cc16; box-shadow:0 0 0 2px rgba(132,204,22,0.2); }
</style>
