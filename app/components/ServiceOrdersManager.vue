<template>
  <div>
    <!-- Registrar venta (operador / admin) -->
    <div v-if="canRegister" class="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 mb-6">
      <h3 class="text-white font-black text-sm uppercase tracking-tight mb-4"><i class="bi bi-bag-plus text-brand-400"></i> Registrar venta de servicio</h3>
      <div class="grid sm:grid-cols-4 gap-3">
        <select v-model="form.service_ref" class="input-dark sm:col-span-2">
          <option value="">Elige un servicio…</option>
          <option v-for="s in activeServices" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <input v-model.number="form.amount" type="number" min="0" class="input-dark" placeholder="Monto $">
        <button @click="registrar" :disabled="saving" class="bg-brand-500 text-slate-900 font-black rounded-xl py-3 text-xs uppercase tracking-widest hover:bg-brand-400 disabled:opacity-50">{{ saving ? '...' : 'Registrar' }}</button>
      </div>
      <div class="grid sm:grid-cols-2 gap-3 mt-3">
        <input v-model="form.customer_name" class="input-dark" placeholder="Cliente (opcional)">
        <input v-model="form.customer_phone" class="input-dark" placeholder="Teléfono (opcional)">
      </div>
      <p v-if="commissionPreview > 0" class="text-[10px] text-brand-400 font-bold mt-2">Comisión del punto: {{ formatMoney(commissionPreview) }} · queda retenida hasta que pase el chofer.</p>
    </div>

    <DataView :items="filtered" :columns="cols" label="ventas" storageKey="ep_service_orders_view">
      <template #row="{ item }">
        <td class="px-6 py-4"><div class="flex flex-col"><span class="text-white font-bold text-xs">{{ item.service_name || 'Servicio' }}</span><span class="text-[10px] text-slate-500">{{ item.category }}</span></div></td>
        <td class="px-6 py-4 text-[10px] text-slate-400"><i class="bi bi-shop"></i> {{ item.point_name || item.point_id || '—' }}</td>
        <td class="px-6 py-4 text-[10px] text-slate-400">{{ item.customer_name || '—' }}</td>
        <td class="px-6 py-4 text-right text-white font-black text-xs">{{ formatMoney(item.amount) }}</td>
        <td class="px-6 py-4 text-right text-purple-400 text-xs">{{ formatMoney(item.commission) }}</td>
        <td class="px-6 py-4 text-[10px] text-slate-400 font-mono">{{ formatDate(item.created) }}</td>
      </template>
      <template #card="{ item }">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5">
          <p class="text-white font-black text-sm">{{ item.service_name }}</p>
          <p class="text-[10px] text-slate-500 mb-2"><i class="bi bi-shop"></i> {{ item.point_name }}</p>
          <p class="text-white font-black">{{ formatMoney(item.amount) }} <span class="text-[10px] text-purple-400">com {{ formatMoney(item.commission) }}</span></p>
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
      orders: [], services: [], saving: false,
      form: { service_ref: '', amount: null, customer_name: '', customer_phone: '' },
      cols: [
        { key: 'service', label: 'Servicio' },
        { key: 'point', label: 'Punto' },
        { key: 'cust', label: 'Cliente' },
        { key: 'amount', label: 'Monto', align: 'right' },
        { key: 'comm', label: 'Comisión', align: 'right' },
        { key: 'date', label: 'Fecha' }
      ]
    };
  },
  computed: {
    role() { return this.appState.user?.role || 'guest'; },
    canRegister() { return this.role === 'operator' || this.role === 'admin'; },
    myPointId() { return this.appState.user?.point_ref || ''; },
    activeServices() { return this.services.filter(s => s.active !== false); },
    filtered() {
      let list = this.orders;
      if (this.role === 'operator' && this.myPointId) list = list.filter(o => o.point_id === this.myPointId);
      return list;
    },
    selectedService() { return this.services.find(s => s.id === this.form.service_ref); },
    commissionPreview() {
      const s = this.selectedService; const amt = Number(this.form.amount) || 0;
      if (!s) return 0;
      if (s.commission_type === 'fixed') return Number(s.commission_amount) || 0;
      return Math.round(amt * (Number(s.commission_rate) || 0)) / 100;
    }
  },
  mounted() { this.load(); },
  methods: {
    token() { return localStorage.getItem('ep_token'); },
    formatMoney(a) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(a) || 0); },
    formatDate(d) { return d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; },
    async apiGet(coll, query) {
      if (this.appState.demoMode) return { items: this.appState.demoData[coll] || [] };
      const r = await fetch(`${this.pb_url}/api/collections/${coll}/records?${query || 'perPage=300&sort=-created'}`, { headers: { Authorization: this.token() } });
      return r.json();
    },
    async load() {
      try { const s = await this.apiGet('services', 'perPage=300&sort=name'); this.services = s.items || []; } catch (_) { this.services = []; }
      try { const o = await this.apiGet('service_orders'); this.orders = o.items || []; } catch (_) { this.orders = []; }
    },
    async registrar() {
      const s = this.selectedService;
      if (!s || !(Number(this.form.amount) > 0)) return this.showModal({ title: 'Datos faltantes', message: 'Elige un servicio y captura el monto.', type: 'warning' });
      this.saving = true;
      const payload = {
        service_ref: s.id, service_name: s.name, category: s.category,
        point_id: this.myPointId, point_name: this.appState.point?.name || '',
        customer_name: this.form.customer_name, customer_phone: this.form.customer_phone,
        amount: Number(this.form.amount), status: 'completed'
      };
      try {
        if (this.appState.demoMode) {
          const commission = this.commissionPreview;
          const it = { id: 'mock_' + Date.now(), ...payload, commission, created: new Date().toISOString() };
          if (!this.appState.demoData.service_orders) this.appState.demoData.service_orders = [];
          this.appState.demoData.service_orders.unshift(it);
          // reflejar en el libro (demo)
          if (!this.appState.demoData.payments) this.appState.demoData.payments = [];
          this.appState.demoData.payments.unshift({ id: 'mock_p_' + Date.now(), kind: 'service', ref: it.id, label: s.name, point_id: this.myPointId, point_name: payload.point_name, amount: it.amount, commission, net: Math.max(0, it.amount - commission), method: 'cash', status: 'held_at_point', created: new Date().toISOString() });
          this.saveDemoData({ ...this.appState.demoData });
        } else {
          const r = await fetch(`${this.pb_url}/api/collections/service_orders/records`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: this.token() }, body: JSON.stringify(payload) });
          if (!r.ok) throw new Error('No se pudo registrar la venta.');
        }
        this.emitBusinessEvent({ audience: ['admin'], severity: 'info', icon: 'bag-check-fill', title: 'Venta de servicio', message: `${s.name} por ${this.formatMoney(this.form.amount)}.` });
        this.form = { service_ref: '', amount: null, customer_name: '', customer_phone: '' };
        await this.load();
        this.showModal({ title: 'Venta registrada', message: 'La comisión queda retenida en tu punto hasta que pase el chofer.', type: 'success' });
      } catch (e) { this.showModal({ title: 'Error', message: e.message, type: 'error' }); }
      finally { this.saving = false; }
    }
  }
}
</script>

<style scoped>
.input-dark { width:100%; background-color:#020617; border:1px solid #1e293b; color:#fff; border-radius:0.75rem; padding:0.75rem 1rem; font-size:0.8rem; outline:none; }
.input-dark::placeholder { color:#475569; }
.input-dark:focus { border-color:#84cc16; box-shadow:0 0 0 2px rgba(132,204,22,0.2); }
</style>
