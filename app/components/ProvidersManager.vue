<template>
  <div>
    <!-- PROVEEDORES -->
    <DataView :items="providers" :columns="cols" label="proveedores" storageKey="ep_providers_view">
      <template #header-actions>
        <button @click="openNew" class="bg-brand-500 hover:bg-brand-400 text-slate-900 font-black px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"><i class="bi bi-plus-lg"></i> Nuevo proveedor</button>
      </template>
      <template #row="{ item }">
        <td class="px-6 py-4">
          <div class="flex flex-col"><span class="text-white font-bold text-xs">{{ item.name }}</span><span v-if="item.email" class="text-[10px] text-slate-500">{{ item.email }}</span></div>
        </td>
        <td class="px-6 py-4 text-[10px] text-slate-400 font-mono">{{ item.whatsapp || '—' }}</td>
        <td class="px-6 py-4 text-right text-white font-black text-xs">{{ feeLabel(item) }}</td>
        <td class="px-6 py-4">
          <span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider" :class="item.active !== false ? 'bg-green-900/30 text-green-400 border-green-900/50' : 'bg-slate-800 text-slate-500 border-slate-700'">{{ item.active !== false ? 'Activo' : 'Oculto' }}</span>
        </td>
      </template>
      <template #actions="{ item }">
        <a v-if="waFor(item)" :href="waFor(item)" target="_blank" rel="noopener noreferrer" title="WhatsApp" class="text-green-400 hover:text-green-300 p-1.5"><i class="bi bi-whatsapp"></i></a>
        <button @click="toggleActive(item)" :title="item.active !== false ? 'Ocultar' : 'Activar'" class="text-amber-400 hover:text-amber-300 p-1.5"><i :class="item.active !== false ? 'bi bi-eye-slash' : 'bi bi-eye'"></i></button>
        <button @click="edit(item)" title="Editar" class="text-blue-400 hover:text-blue-300 p-1.5"><i class="bi bi-pencil"></i></button>
        <button @click="remove('providers', item)" title="Eliminar" class="text-slate-600 hover:text-red-400 p-1.5"><i class="bi bi-trash3"></i></button>
      </template>
      <template #card="{ item }">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
          <div class="flex items-center justify-between mb-2">
            <span class="text-white font-black text-sm">{{ item.name }}</span>
            <span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider" :class="item.active !== false ? 'bg-green-900/30 text-green-400 border-green-900/50' : 'bg-slate-800 text-slate-500 border-slate-700'">{{ item.active !== false ? 'Activo' : 'Oculto' }}</span>
          </div>
          <p v-if="item.email" class="text-[10px] text-slate-500 mb-1">{{ item.email }}</p>
          <p class="text-[10px] text-slate-500 font-mono mb-3">{{ item.whatsapp || '—' }}</p>
          <p class="text-white font-black mt-auto">Fee Easypoint: {{ feeLabel(item) }}</p>
        </div>
      </template>
    </DataView>

    <!-- Modal proveedor -->
    <Transition name="fade">
      <div v-if="showForm" class="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md">
        <div class="bg-slate-900 border border-slate-800 rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-10 max-w-xl w-full shadow-2xl relative max-h-[calc(100vh-1.5rem)] overflow-y-auto">
          <button @click="showForm = false" aria-label="Cerrar formulario" class="absolute top-5 right-5 md:top-8 md:right-8 text-slate-500 hover:text-white transition-colors text-2xl"><i class="bi bi-x-lg"></i></button>
          <h3 class="text-2xl font-black text-white mb-8 uppercase tracking-tight">{{ form.id ? 'Editar' : 'Nuevo' }} proveedor</h3>
          <div class="space-y-5">
            <div class="flex flex-col"><label class="label-sm">Nombre</label><input v-model="form.name" class="input-dark" placeholder="Tours del Centro"></div>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col"><label class="label-sm">WhatsApp</label><input v-model="form.whatsapp" class="input-dark" placeholder="5215511112222"></div>
              <div class="flex flex-col"><label class="label-sm">Email</label><input v-model="form.email" type="email" class="input-dark" placeholder="contacto@proveedor.mx"></div>
            </div>
            <div class="flex flex-col">
              <label class="label-sm">Fee Easypoint</label>
              <div class="flex gap-2">
                <select v-model="form.fee_type" class="input-dark" style="max-width:140px">
                  <option value="percent">Porcentaje</option>
                  <option value="fixed">Monto fijo</option>
                </select>
                <input v-if="(form.fee_type || 'percent') === 'fixed'" v-model.number="form.fee_amount" type="number" min="0" class="input-dark" placeholder="$ por reserva">
                <input v-else v-model.number="form.fee_rate" type="number" min="0" max="100" step="0.5" class="input-dark" placeholder="15 %">
              </div>
            </div>
            <label class="flex items-center gap-3 text-slate-300 text-xs font-bold"><input v-model="form.active" type="checkbox" class="w-4 h-4"> Activo</label>
          </div>
          <div class="flex gap-4 mt-8">
            <button @click="save" :disabled="saving" class="flex-1 bg-brand-500 text-slate-900 font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-brand-400 transition-all disabled:opacity-50">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
            <button @click="showForm = false" class="flex-1 bg-slate-800 text-slate-400 font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700">Cancelar</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
const { loadModule } = window['vue3-sfc-loader'];
const options = window.options;

export default {
  inject: ['appState', 'pb_url', 'showModal', 'saveDemoData', 'emitBusinessEvent'],
  components: {
    DataView: Vue.defineAsyncComponent(() => loadModule('./components/DataView.vue', options))
  },
  data() {
    return {
      providers: [],
      showForm: false,
      saving: false,
      form: this.blankForm(),
      cols: [
        { key: 'name', label: 'Proveedor' },
        { key: 'wa', label: 'WhatsApp' },
        { key: 'fee', label: 'Fee', align: 'right' },
        { key: 'active', label: 'Estado' }
      ]
    };
  },
  mounted() { this.load(); },
  methods: {
    feeLabel(item) {
      if (item && item.fee_type === 'fixed') {
        const n = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(item.fee_amount) || 0);
        return n + ' /reserva';
      }
      return (Number(item && item.fee_rate) || 0) + '%';
    },
    blankForm() {
      return { id: null, name: '', whatsapp: '', email: '', fee_type: 'percent', fee_rate: 15, fee_amount: 0, active: true };
    },
    token() { return localStorage.getItem('ep_token'); },
    formatMoney(a) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(a) || 0); },
    waFor(item) {
      const phone = String(item.whatsapp || '').replace(/\D/g, '');
      return phone ? `https://wa.me/${phone}` : '';
    },
    async apiGet(coll) {
      if (this.appState.demoMode) return { items: this.appState.demoData[coll] || [] };
      const res = await fetch(`${this.pb_url}/api/collections/${coll}/records?sort=-created&perPage=300`, { headers: { Authorization: this.token() } });
      return res.json();
    },
    async apiPost(coll, body) {
      if (this.appState.demoMode) {
        const item = { id: 'mock_' + Date.now(), ...body, created: new Date().toISOString(), updated: new Date().toISOString() };
        if (!this.appState.demoData[coll]) this.appState.demoData[coll] = [];
        this.appState.demoData[coll].unshift(item);
        this.saveDemoData({ ...this.appState.demoData });
        return item;
      }
      const res = await fetch(`${this.pb_url}/api/collections/${coll}/records`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: this.token() }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('No se pudo guardar.');
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
    async load() {
      try { const r = await this.apiGet('providers'); this.providers = r.items || []; } catch (_) { this.providers = []; }
    },
    openNew() { this.form = this.blankForm(); this.showForm = true; },
    edit(item) { this.form = { ...this.blankForm(), ...item }; this.showForm = true; },
    async save() {
      if (!this.form.name) return this.showModal({ title: 'Datos faltantes', message: 'El nombre es obligatorio.', type: 'warning' });
      this.saving = true;
      const { id, ...payload } = this.form;
      payload.fee_rate = Number(payload.fee_rate) || 0;
      try {
        if (id) await this.apiPatch('providers', id, payload);
        else await this.apiPost('providers', payload);
        this.showForm = false;
        await this.load();
      } catch (e) {
        this.showModal({ title: 'Error', message: e.message, type: 'error' });
      } finally { this.saving = false; }
    },
    async toggleActive(item) {
      try { await this.apiPatch('providers', item.id, { active: item.active === false }); await this.load(); }
      catch (e) { this.showModal({ title: 'Error', message: e.message, type: 'error' }); }
    },
    async remove(coll, item) {
      const ok = await this.showModal({ title: 'Eliminar', message: '¿Eliminar este proveedor?', type: 'confirm', confirmText: 'Eliminar' });
      if (!ok) return;
      try { await this.apiDelete(coll, item.id); await this.load(); }
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
.fade-enter-active,.fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
</style>
