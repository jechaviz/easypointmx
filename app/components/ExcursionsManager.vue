<template>
  <div>
    <!-- Sub-tabs -->
    <div class="inline-flex bg-slate-900 border border-slate-800 p-1 rounded-2xl mb-6">
      <button @click="tab = 'bookings'" :class="tab === 'bookings' ? 'bg-brand-500 text-slate-900' : 'text-slate-400 hover:text-white'" class="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Reservas <span v-if="bookings.length" class="ml-1 opacity-70">{{ bookings.length }}</span></button>
      <button @click="tab = 'catalog'" :class="tab === 'catalog' ? 'bg-brand-500 text-slate-900' : 'text-slate-400 hover:text-white'" class="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Catálogo</button>
    </div>

    <!-- RESERVAS -->
    <div v-if="tab === 'bookings'">
      <DataView :items="bookings" :columns="bookingCols" label="reservas" storageKey="ep_bookings_view">
        <template #row="{ item }">
          <td class="px-6 py-4">
            <div class="flex flex-col">
              <span class="text-white font-bold text-xs">{{ item.customer_name }}</span>
              <span class="text-[10px] text-slate-500 font-mono">{{ item.customer_phone }}</span>
            </div>
          </td>
          <td class="px-6 py-4">
            <div class="flex flex-col">
              <span class="text-slate-200 text-xs font-bold">{{ item.excursion_name || '—' }}</span>
              <span class="text-[10px] text-slate-500 flex items-center gap-1"><i class="bi bi-geo-alt"></i> {{ item.destination || '' }}</span>
            </div>
          </td>
          <td class="px-6 py-4 text-[10px] text-slate-400 font-mono">{{ formatDate(item.created) }}</td>
          <td class="px-6 py-4 text-[10px] text-brand-400 font-bold">{{ item.excursion_date || '—' }}</td>
          <td class="px-6 py-4 text-right">
            <div class="flex flex-col items-end">
              <span class="text-white font-black text-xs">{{ formatMoney(item.total) }}</span>
              <span class="text-[9px] text-slate-500">{{ item.people || 1 }} pers.</span>
            </div>
          </td>
          <td class="px-6 py-4">
            <span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider" :class="statusBadge(item.status)">{{ statusLabel(item.status) }}</span>
            <span class="block mt-1 text-[9px] font-black uppercase tracking-wider" :class="item.payment_status === 'paid' ? 'text-emerald-400' : 'text-slate-500'">{{ item.payment_status === 'paid' ? '● Pagado' : '○ Sin pago' }}</span>
          </td>
        </template>

        <template #actions="{ item }">
          <a :href="waClient(item)" target="_blank" rel="noopener noreferrer" title="Confirmar al cliente por WhatsApp" class="text-green-400 hover:text-green-300 p-1.5"><i class="bi bi-whatsapp"></i></a>
          <a v-if="providerWaFor(item)" :href="waProvider(item)" target="_blank" rel="noopener noreferrer" title="Avisar al proveedor" class="text-blue-400 hover:text-blue-300 p-1.5"><i class="bi bi-person-badge"></i></a>
          <a v-if="adminWa" :href="waAdmin(item)" target="_blank" rel="noopener noreferrer" title="Avisar al administrador" class="text-purple-400 hover:text-purple-300 p-1.5"><i class="bi bi-shield-check"></i></a>
          <button v-if="item.payment_status !== 'paid'" @click="markPaid(item)" title="Marcar pagada (efectivo)" class="text-emerald-400 hover:text-emerald-300 p-1.5"><i class="bi bi-cash-coin"></i></button>
          <button v-if="item.status !== 'confirmed'" @click="confirm(item)" title="Marcar confirmada" class="text-brand-400 hover:text-brand-300 p-1.5"><i class="bi bi-check-circle"></i></button>
          <button @click="remove('excursion_bookings', item)" title="Eliminar" class="text-slate-600 hover:text-red-400 p-1.5"><i class="bi bi-trash3"></i></button>
        </template>

        <template #card="{ item }">
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
            <div class="flex items-center justify-between mb-2">
              <span class="text-white font-black text-sm">{{ item.customer_name }}</span>
              <span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider" :class="statusBadge(item.status)">{{ statusLabel(item.status) }}</span>
            </div>
            <p class="text-[10px] text-slate-500 font-mono mb-2">{{ item.customer_phone }}</p>
            <p class="text-slate-300 text-xs font-bold">{{ item.excursion_name }}</p>
            <p class="text-[10px] text-slate-500 mb-3"><i class="bi bi-geo-alt"></i> {{ item.destination }} · {{ item.excursion_date }}</p>
            <div class="flex gap-2 mt-auto">
              <a :href="waClient(item)" target="_blank" rel="noopener noreferrer" class="flex-1 bg-green-500/10 text-green-400 text-[10px] font-black py-2 rounded-lg text-center"><i class="bi bi-whatsapp"></i> Cliente</a>
              <a v-if="providerWaFor(item)" :href="waProvider(item)" target="_blank" rel="noopener noreferrer" class="flex-1 bg-blue-500/10 text-blue-400 text-[10px] font-black py-2 rounded-lg text-center"><i class="bi bi-person-badge"></i> Proveedor</a>
            </div>
          </div>
        </template>
      </DataView>
    </div>

    <!-- CATALOGO -->
    <div v-else>
      <DataView :items="excursions" :columns="catalogCols" label="excursiones" storageKey="ep_excursions_view">
        <template #header-actions>
          <button @click="openNew" class="bg-brand-500 hover:bg-brand-400 text-slate-900 font-black px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"><i class="bi bi-plus-lg"></i> Nueva excursión</button>
        </template>
        <template #row="{ item }">
          <td class="px-6 py-4">
            <div class="flex flex-col"><span class="text-white font-bold text-xs">{{ item.name }}</span><span class="text-[10px] text-slate-500"><i class="bi bi-geo-alt"></i> {{ item.destination }}</span></div>
          </td>
          <td class="px-6 py-4 text-[10px] text-slate-400">{{ item.provider_name || '—' }}</td>
          <td class="px-6 py-4 text-right text-white font-black text-xs">{{ formatMoney(item.price) }}</td>
          <td class="px-6 py-4">
            <span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider" :class="item.active !== false ? 'bg-green-900/30 text-green-400 border-green-900/50' : 'bg-slate-800 text-slate-500 border-slate-700'">{{ item.active !== false ? 'Activa' : 'Oculta' }}</span>
          </td>
        </template>
        <template #actions="{ item }">
          <button @click="toggleActive(item)" :title="item.active !== false ? 'Ocultar' : 'Activar'" class="text-amber-400 hover:text-amber-300 p-1.5"><i :class="item.active !== false ? 'bi bi-eye-slash' : 'bi bi-eye'"></i></button>
          <button @click="edit(item)" title="Editar" class="text-blue-400 hover:text-blue-300 p-1.5"><i class="bi bi-pencil"></i></button>
          <button @click="remove('excursions', item)" title="Eliminar" class="text-slate-600 hover:text-red-400 p-1.5"><i class="bi bi-trash3"></i></button>
        </template>
        <template #card="{ item }">
          <div class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div class="h-28 bg-slate-800"><img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover"></div>
            <div class="p-5">
              <p class="text-white font-black text-sm">{{ item.name }}</p>
              <p class="text-[10px] text-slate-500 mb-2">{{ item.destination }}</p>
              <p class="text-white font-black">{{ formatMoney(item.price) }}</p>
            </div>
          </div>
        </template>
      </DataView>
    </div>

    <!-- Modal excursión -->
    <Transition name="fade">
      <div v-if="showForm" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
        <div class="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
          <button @click="showForm = false" class="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl"><i class="bi bi-x-lg"></i></button>
          <h3 class="text-2xl font-black text-white mb-8 uppercase tracking-tight">{{ form.id ? 'Editar' : 'Nueva' }} excursión</h3>
          <div class="space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col"><label class="label-sm">Nombre</label><input v-model="form.name" class="input-dark" placeholder="Teotihuacán en globo"></div>
              <div class="flex flex-col"><label class="label-sm">Destino</label><input v-model="form.destination" class="input-dark" placeholder="Estado de México"></div>
            </div>
            <div class="flex flex-col"><label class="label-sm">Descripción</label><textarea v-model="form.description" rows="2" class="input-dark"></textarea></div>
            <div class="grid grid-cols-3 gap-4">
              <div class="flex flex-col"><label class="label-sm">Precio /persona</label><input v-model.number="form.price" type="number" min="0" class="input-dark"></div>
              <div class="flex flex-col"><label class="label-sm">Duración</label><input v-model="form.duration" class="input-dark" placeholder="Día completo"></div>
              <div class="flex flex-col"><label class="label-sm">Cupo/fecha</label><input v-model.number="form.max_capacity" type="number" min="0" class="input-dark" placeholder="0 = sin límite"></div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col"><label class="label-sm">Proveedor</label><input v-model="form.provider_name" class="input-dark"></div>
              <div class="flex flex-col"><label class="label-sm">WhatsApp proveedor</label><input v-model="form.provider_whatsapp" class="input-dark" placeholder="5215511112222"></div>
            </div>
            <div class="flex flex-col"><label class="label-sm">Imagen (URL)</label><input v-model="form.image_url" class="input-dark" placeholder="https://..."></div>
            <div class="flex flex-col">
              <label class="label-sm">Fechas disponibles (una por línea, AAAA-MM-DD)</label>
              <textarea v-model="form.available_dates" rows="3" class="input-dark" placeholder="2026-07-12&#10;2026-07-19&#10;2026-08-02"></textarea>
              <span class="text-[10px] text-slate-600 mt-1 px-1">El cliente elegirá una de estas fechas al reservar. Vacío = fecha libre.</span>
            </div>
            <label class="flex items-center gap-3 text-slate-300 text-xs font-bold"><input v-model="form.active" type="checkbox" class="w-4 h-4"> Visible en el sitio</label>
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
const ADMIN_WA = String(window.EASYPOINT_RUNTIME_CONFIG?.contactWhatsapp || '').replace(/\D/g, '');

export default {
  inject: ['appState', 'pb_url', 'showModal', 'saveDemoData', 'emitBusinessEvent'],
  components: {
    DataView: Vue.defineAsyncComponent(() => loadModule('./components/DataView.vue', options))
  },
  data() {
    return {
      tab: 'bookings',
      bookings: [],
      excursions: [],
      showForm: false,
      saving: false,
      form: this.blankForm(),
      bookingCols: [
        { key: 'cust', label: 'Cliente' },
        { key: 'exc', label: 'Excursión' },
        { key: 'res', label: 'Reservado' },
        { key: 'date', label: 'Fecha excursión' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'status', label: 'Estado' }
      ],
      catalogCols: [
        { key: 'name', label: 'Excursión' },
        { key: 'prov', label: 'Proveedor' },
        { key: 'price', label: 'Precio', align: 'right' },
        { key: 'active', label: 'Estado' }
      ]
    };
  },
  computed: {
    adminWa() { return ADMIN_WA; }
  },
  mounted() { this.loadAll(); },
  methods: {
    blankForm() {
      return { id: null, name: '', destination: '', description: '', price: 0, duration: '', provider_name: '', provider_whatsapp: '', image_url: '', max_capacity: 0, active: true, available_dates: '' };
    },
    token() { return localStorage.getItem('ep_token'); },
    formatMoney(a) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(a) || 0); },
    formatDate(d) { return d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'; },
    statusLabel(s) { return ({ new: 'Nueva', confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Completada' })[s] || s || 'Nueva'; },
    statusBadge(s) {
      return ({
        new: 'bg-amber-900/30 text-amber-400 border-amber-900/50',
        confirmed: 'bg-green-900/30 text-green-400 border-green-900/50',
        cancelled: 'bg-red-900/30 text-red-400 border-red-900/50',
        completed: 'bg-blue-900/30 text-blue-400 border-blue-900/50'
      })[s] || 'bg-slate-800 text-slate-400 border-slate-700';
    },
    providerWaFor(item) {
      const exc = this.excursions.find(e => e.id === item.excursion_ref);
      return String(exc?.provider_whatsapp || '').replace(/\D/g, '');
    },
    bookingLines(item) {
      return [
        `Reserva Easypoint: ${item.excursion_name || ''}`,
        `Destino: ${item.destination || ''}`,
        `Cliente: ${item.customer_name} (${item.customer_phone})`,
        `Personas: ${item.people || 1}`,
        `Fecha excursión: ${item.excursion_date || ''}`,
        `Total: ${this.formatMoney(item.total)}`
      ];
    },
    waClient(item) {
      const phone = String(item.customer_phone || '').replace(/\D/g, '');
      const msg = [`Hola ${item.customer_name || ''}, tu reserva para ${item.excursion_name || 'la excursión'} el ${item.excursion_date || ''} está confirmada. ¡Te esperamos!`];
      return `https://wa.me/${phone}?text=${encodeURIComponent(msg.join('\n'))}`;
    },
    waProvider(item) { return `https://wa.me/${this.providerWaFor(item)}?text=${encodeURIComponent(this.bookingLines(item).join('\n'))}`; },
    waAdmin(item) { return `https://wa.me/${this.adminWa}?text=${encodeURIComponent(this.bookingLines(item).join('\n'))}`; },
    async apiGet(coll) {
      if (this.appState.demoMode) return { items: this.appState.demoData[coll] || [] };
      const res = await fetch(`${this.pb_url}/api/collections/${coll}/records?sort=-created&perPage=200`, { headers: { Authorization: this.token() } });
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
    async loadAll() {
      try { const b = await this.apiGet('excursion_bookings'); this.bookings = b.items || []; } catch (_) { this.bookings = []; }
      try { const e = await this.apiGet('excursions'); this.excursions = e.items || []; } catch (_) { this.excursions = []; }
    },
    openNew() { this.form = this.blankForm(); this.showForm = true; },
    edit(item) { this.form = { ...this.blankForm(), ...item }; this.showForm = true; },
    async save() {
      if (!this.form.name || !this.form.destination) return this.showModal({ title: 'Datos faltantes', message: 'Nombre y destino son obligatorios.', type: 'warning' });
      this.saving = true;
      const { id, ...payload } = this.form;
      // Normaliza las fechas: una por línea, solo AAAA-MM-DD, ordenadas.
      payload.available_dates = String(payload.available_dates || '')
        .split(/[\n,;]+/).map(s => s.trim())
        .filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s))
        .sort().join('\n');
      try {
        if (id) await this.apiPatch('excursions', id, payload);
        else await this.apiPost('excursions', payload);
        this.showForm = false;
        await this.loadAll();
      } catch (e) {
        this.showModal({ title: 'Error', message: e.message, type: 'error' });
      } finally { this.saving = false; }
    },
    async toggleActive(item) {
      try { await this.apiPatch('excursions', item.id, { active: item.active === false }); await this.loadAll(); }
      catch (e) { this.showModal({ title: 'Error', message: e.message, type: 'error' }); }
    },
    async markPaid(item) {
      try {
        await this.apiPatch('excursion_bookings', item.id, { payment_status: 'paid', payment_method: 'cash', paid_at: new Date().toISOString() });
        this.emitBusinessEvent({ audience: ['admin'], severity: 'success', icon: 'cash-coin', title: 'Reserva pagada', message: `${item.customer_name} pagó ${this.formatMoney(item.total)} (${item.excursion_name || item.destination}).` });
        await this.loadAll();
      } catch (e) { this.showModal({ title: 'Error', message: e.message, type: 'error' }); }
    },
    async confirm(item) {
      try {
        await this.apiPatch('excursion_bookings', item.id, { status: 'confirmed', confirmed_channel: 'admin' });
        this.emitBusinessEvent({ audience: ['admin'], severity: 'success', icon: 'patch-check-fill', title: 'Reserva confirmada', message: `${item.customer_name} confirmado para ${item.excursion_name || item.destination}.` });
        await this.loadAll();
      } catch (e) { this.showModal({ title: 'Error', message: e.message, type: 'error' }); }
    },
    async remove(coll, item) {
      const ok = await this.showModal({ title: 'Eliminar', message: '¿Eliminar este registro?', type: 'confirm', confirmText: 'Eliminar' });
      if (!ok) return;
      try { await this.apiDelete(coll, item.id); await this.loadAll(); }
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
