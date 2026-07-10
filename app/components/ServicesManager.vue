<template>
  <div>
    <DataView :items="services" :columns="cols" label="servicios" storageKey="ep_services_view">
      <template #header-actions>
        <button @click="openNew" class="bg-brand-500 hover:bg-brand-400 text-slate-900 font-black px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"><i class="bi bi-plus-lg"></i> Nuevo servicio</button>
      </template>
      <template #row="{ item }">
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <i :class="'bi bi-' + (item.icon || 'grid')" class="text-brand-400 text-lg"></i>
            <div class="flex flex-col"><span class="text-white font-bold text-xs">{{ item.name }}</span><span class="text-[10px] text-slate-500">{{ catLabel(item.category) }}</span></div>
          </div>
        </td>
        <td class="px-6 py-4 text-[10px] text-slate-400">{{ item.unit || '—' }}</td>
        <td class="px-6 py-4 text-right text-white font-black text-xs">{{ commissionLabel(item) }}</td>
        <td class="px-6 py-4"><span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider" :class="item.active !== false ? 'bg-green-900/30 text-green-400 border-green-900/50' : 'bg-slate-800 text-slate-500 border-slate-700'">{{ item.active !== false ? 'Activo' : 'Oculto' }}</span></td>
      </template>
      <template #actions="{ item }">
        <button @click="toggleActive(item)" :title="item.active !== false ? 'Ocultar' : 'Activar'" class="text-amber-400 hover:text-amber-300 p-1.5"><i :class="item.active !== false ? 'bi bi-eye-slash' : 'bi bi-eye'"></i></button>
        <button @click="edit(item)" title="Editar" class="text-blue-400 hover:text-blue-300 p-1.5"><i class="bi bi-pencil"></i></button>
        <button @click="remove(item)" title="Eliminar" class="text-slate-600 hover:text-red-400 p-1.5"><i class="bi bi-trash3"></i></button>
      </template>
      <template #card="{ item }">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
          <div class="flex items-center gap-3 mb-2"><i :class="'bi bi-' + (item.icon || 'grid')" class="text-brand-400 text-2xl"></i><span class="text-white font-black text-sm">{{ item.name }}</span></div>
          <p class="text-[11px] text-slate-400 mb-3">{{ item.description }}</p>
          <p class="text-white font-black mt-auto">{{ commissionLabel(item) }} <span class="text-[10px] text-slate-500 font-bold">{{ item.unit }}</span></p>
        </div>
      </template>
    </DataView>

    <Transition name="fade">
      <div v-if="showForm" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
        <div class="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
          <button @click="showForm = false" class="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl"><i class="bi bi-x-lg"></i></button>
          <h3 class="text-2xl font-black text-white mb-8 uppercase tracking-tight">{{ form.id ? 'Editar' : 'Nuevo' }} servicio</h3>
          <div class="space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col"><label class="label-sm">Nombre</label><input v-model="form.name" class="input-dark" placeholder="Pago de servicios"></div>
              <div class="flex flex-col"><label class="label-sm">Categoría</label>
                <select v-model="form.category" class="input-dark"><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label }}</option></select>
              </div>
            </div>
            <div class="flex flex-col"><label class="label-sm">Descripción</label><textarea v-model="form.description" rows="2" class="input-dark"></textarea></div>
            <div class="grid grid-cols-3 gap-4">
              <div class="flex flex-col"><label class="label-sm">Unidad</label><input v-model="form.unit" class="input-dark" placeholder="por cobro"></div>
              <div class="flex flex-col"><label class="label-sm">Ícono (bootstrap)</label><input v-model="form.icon" class="input-dark" placeholder="receipt"></div>
              <div class="flex flex-col"><label class="label-sm">Proveedor</label><input v-model="form.provider_name" class="input-dark"></div>
            </div>
            <div class="flex flex-col">
              <label class="label-sm">Comisión al punto</label>
              <div class="flex gap-2">
                <select v-model="form.commission_type" class="input-dark" style="max-width:140px"><option value="percent">Porcentaje</option><option value="fixed">Monto fijo</option></select>
                <input v-if="(form.commission_type || 'percent') === 'fixed'" v-model.number="form.commission_amount" type="number" min="0" class="input-dark" placeholder="$ por unidad">
                <input v-else v-model.number="form.commission_rate" type="number" min="0" max="100" class="input-dark" placeholder="10 %">
              </div>
            </div>
            <label class="flex items-center gap-3 text-slate-300 text-xs font-bold"><input v-model="form.active" type="checkbox" class="w-4 h-4"> Disponible en la red</label>
          </div>
          <div class="flex gap-4 mt-8">
            <button @click="save" :disabled="saving" class="flex-1 bg-brand-500 text-slate-900 font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-brand-400 disabled:opacity-50">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
            <button @click="showForm = false" class="flex-1 bg-slate-800 text-slate-400 font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-700 border border-slate-700">Cancelar</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
const { loadModule } = window['vue3-sfc-loader'];
const options = window.options;
const CATEGORIES = [
  { id: 'pagos', label: 'Pagos de servicios' }, { id: 'recargas', label: 'Recargas' }, { id: 'seguros', label: 'Seguros' },
  { id: 'boletos', label: 'Boletos' }, { id: 'impresion', label: 'Impresión' }, { id: 'sim', label: 'Tarjetas SIM' },
  { id: 'devoluciones', label: 'Devoluciones' }, { id: 'remesas', label: 'Remesas' }, { id: 'certificados', label: 'Certificados digitales' },
  { id: 'publicidad', label: 'Publicidad local' }, { id: 'marketplace', label: 'Marketplace insumos' }, { id: 'farmacia', label: 'Farmacia' },
  { id: 'locker', label: 'Locker' }, { id: 'reciclaje', label: 'Reciclaje' }, { id: 'productos_locales', label: 'Productos locales' },
  { id: 'b2b', label: 'Servicios B2B' }, { id: 'otros', label: 'Otros' }
];

export default {
  inject: ['appState', 'pb_url', 'showModal', 'saveDemoData'],
  components: { DataView: Vue.defineAsyncComponent(() => loadModule('./components/DataView.vue', options)) },
  data() {
    return {
      services: [], showForm: false, saving: false, form: this.blankForm(),
      categories: CATEGORIES,
      cols: [
        { key: 'name', label: 'Servicio' },
        { key: 'unit', label: 'Unidad' },
        { key: 'comm', label: 'Comisión', align: 'right' },
        { key: 'active', label: 'Estado' }
      ]
    };
  },
  mounted() { this.load(); },
  methods: {
    token() { return localStorage.getItem('ep_token'); },
    blankForm() { return { id: null, name: '', category: 'pagos', description: '', commission_type: 'percent', commission_rate: 5, commission_amount: 0, unit: 'por venta', provider_name: '', icon: 'grid', active: true }; },
    catLabel(c) { const f = CATEGORIES.find(x => x.id === c); return f ? f.label : (c || '—'); },
    commissionLabel(item) {
      if (item && item.commission_type === 'fixed') {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(item.commission_amount) || 0);
      }
      return (Number(item && item.commission_rate) || 0) + '%';
    },
    async apiGet() {
      if (this.appState.demoMode) return { items: this.appState.demoData.services || [] };
      const r = await fetch(`${this.pb_url}/api/collections/services/records?perPage=300&sort=name`, { headers: { Authorization: this.token() } });
      return r.json();
    },
    async apiPost(body) {
      if (this.appState.demoMode) { const it = { id: 'mock_' + Date.now(), ...body }; if (!this.appState.demoData.services) this.appState.demoData.services = []; this.appState.demoData.services.unshift(it); this.saveDemoData({ ...this.appState.demoData }); return it; }
      const r = await fetch(`${this.pb_url}/api/collections/services/records`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: this.token() }, body: JSON.stringify(body) }); if (!r.ok) throw new Error('No se pudo guardar.'); return r.json();
    },
    async apiPatch(id, body) {
      if (this.appState.demoMode) { const a = this.appState.demoData.services || []; const i = a.findIndex(x => x.id === id); if (i !== -1) { a[i] = { ...a[i], ...body }; this.saveDemoData({ ...this.appState.demoData }); } return; }
      await fetch(`${this.pb_url}/api/collections/services/records/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: this.token() }, body: JSON.stringify(body) });
    },
    async apiDelete(id) {
      if (this.appState.demoMode) { this.appState.demoData.services = (this.appState.demoData.services || []).filter(x => x.id !== id); this.saveDemoData({ ...this.appState.demoData }); return; }
      await fetch(`${this.pb_url}/api/collections/services/records/${id}`, { method: 'DELETE', headers: { Authorization: this.token() } });
    },
    async load() { try { const d = await this.apiGet(); this.services = d.items || []; } catch (_) { this.services = []; } },
    openNew() { this.form = this.blankForm(); this.showForm = true; },
    edit(item) { this.form = { ...this.blankForm(), ...item }; this.showForm = true; },
    async save() {
      if (!this.form.name) return this.showModal({ title: 'Falta nombre', message: 'Captura el nombre del servicio.', type: 'warning' });
      this.saving = true; const { id, ...payload } = this.form;
      try { if (id) await this.apiPatch(id, payload); else await this.apiPost(payload); this.showForm = false; await this.load(); }
      catch (e) { this.showModal({ title: 'Error', message: e.message, type: 'error' }); } finally { this.saving = false; }
    },
    async toggleActive(item) { try { await this.apiPatch(item.id, { active: item.active === false }); await this.load(); } catch (e) { this.showModal({ title: 'Error', message: e.message, type: 'error' }); } },
    async remove(item) { const ok = await this.showModal({ title: 'Eliminar', message: '¿Eliminar este servicio?', type: 'confirm', confirmText: 'Eliminar' }); if (!ok) return; await this.apiDelete(item.id); await this.load(); }
  }
}
</script>

<style scoped>
.label-sm { display:block; font-size:10px; font-weight:900; color:#64748b; text-transform:uppercase; letter-spacing:0.2em; margin-bottom:0.5rem; padding-left:0.25rem; }
.input-dark { width:100%; background-color:#020617; border:1px solid #1e293b; color:#fff; border-radius:1rem; padding:0.85rem 1.1rem; font-size:0.8rem; outline:none; }
.input-dark::placeholder { color:#475569; }
.input-dark:focus { border-color:#84cc16; box-shadow:0 0 0 2px rgba(132,204,22,0.2); }
.fade-enter-active,.fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
</style>
