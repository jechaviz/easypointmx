<template>
  <div>
    <div v-if="role === 'admin'" class="flex justify-end mb-4">
      <button @click="enviarRecordatorios" :disabled="saving" class="bg-slate-900 border border-slate-700 text-brand-400 font-black px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest hover:border-brand-500/50 disabled:opacity-50"><i class="bi bi-bell"></i> Enviar recordatorios pendientes</button>
    </div>

    <!-- Totales (admin) -->
    <div v-if="role === 'admin'" class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p class="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Retenido en puntos</p>
        <p class="text-white text-xl font-black">{{ formatMoney(totals.held) }}</p>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p class="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Recolectado (en ruta)</p>
        <p class="text-amber-400 text-xl font-black">{{ formatMoney(totals.collectedNet) }}</p>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p class="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Entregado al admin</p>
        <p class="text-emerald-400 text-xl font-black">{{ formatMoney(totals.deliveredNet) }}</p>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p class="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Comisión a puntos</p>
        <p class="text-purple-400 text-xl font-black">{{ formatMoney(totals.commission) }}</p>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p class="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Redondeo neto (déb/créd)</p>
        <p class="text-xl font-black" :class="totals.rounding >= 0 ? 'text-blue-400' : 'text-amber-400'">{{ formatMoney(totals.rounding) }}</p>
      </div>
    </div>

    <!-- Registrar abono (operador / admin) -->
    <div v-if="canRegister" class="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 mb-6">
      <h3 class="text-white font-black text-sm uppercase tracking-tight mb-4"><i class="bi bi-cash-coin text-brand-400"></i> Registrar abono</h3>
      <div class="grid sm:grid-cols-4 gap-3">
        <input v-model="form.ref" class="input-dark sm:col-span-2" placeholder="Código de reserva del cliente">
        <input v-model.number="form.amount" type="number" min="1" class="input-dark" placeholder="Monto $">
        <button @click="registrarAbono" :disabled="saving" class="bg-brand-500 text-slate-900 font-black rounded-xl py-3 text-xs uppercase tracking-widest hover:bg-brand-400 disabled:opacity-50">{{ saving ? '...' : 'Registrar' }}</button>
      </div>
      <div class="flex items-center gap-3 mt-3">
        <p class="text-[10px] text-slate-600 flex-1">El cliente abona en efectivo; queda retenido en tu punto hasta que pase el chofer.</p>
        <button @click="aplicarCredito" :disabled="saving" class="shrink-0 bg-purple-600/20 text-purple-300 border border-purple-700/50 font-black rounded-xl px-4 py-2 text-[10px] uppercase tracking-widest hover:bg-purple-600/30 disabled:opacity-50"><i class="bi bi-wallet2"></i> Aplicar crédito</button>
      </div>
    </div>

    <!-- Filtro -->
    <div class="inline-flex bg-slate-900 border border-slate-800 p-1 rounded-2xl mb-5">
      <button v-for="f in filters" :key="f.id" @click="filter = f.id" :class="filter === f.id ? 'bg-brand-500 text-slate-900' : 'text-slate-400 hover:text-white'" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">{{ f.label }}</button>
    </div>

    <DataView :items="filtered" :columns="cols" label="abonos" storageKey="ep_cobranza_view">
      <template #row="{ item }">
        <td class="px-6 py-4">
          <div class="flex flex-col"><span class="text-white font-bold text-xs">{{ item.label || item.ref || '—' }}</span><span class="text-[10px] text-slate-500 font-mono">{{ (item.kind || 'excursion') }}</span></div>
        </td>
        <td class="px-6 py-4 text-[10px] text-slate-400"><i class="bi bi-shop"></i> {{ item.point_name || item.point_id || '—' }}</td>
        <td class="px-6 py-4 text-right text-white font-black text-xs">{{ formatMoney(item.amount) }}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex flex-col items-end">
            <span class="text-[10px] text-purple-400">com {{ formatMoney(item.commission) }}</span>
            <span class="text-[10px] text-emerald-400">neto {{ formatMoney(item.net || (item.status === 'held_at_point' ? 0 : item.amount)) }}</span>
            <span v-if="item.collected_amount" class="text-[10px] text-white">cobró {{ formatMoney(item.collected_amount) }}</span>
            <span v-if="item.rounding" class="text-[9px] font-black" :class="item.rounding > 0 ? 'text-blue-400' : 'text-amber-400'">{{ item.rounding > 0 ? 'débito' : 'crédito' }} {{ formatMoney(Math.abs(item.rounding)) }}</span>
          </div>
        </td>
        <td class="px-6 py-4"><span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider" :class="statusBadge(item.status)">{{ statusLabel(item.status) }}</span></td>
      </template>
      <template #actions="{ item }">
        <button v-if="role !== 'operator' && item.status === 'held_at_point'" @click="collect(item)" title="Recolectar (chofer)" class="text-amber-400 hover:text-amber-300 p-1.5"><i class="bi bi-cash-stack"></i></button>
        <button v-if="role !== 'operator' && item.status === 'collected'" @click="deliver(item)" title="Entregar al administrador" class="text-emerald-400 hover:text-emerald-300 p-1.5"><i class="bi bi-box-arrow-up"></i></button>
        <button v-if="role === 'admin'" @click="remove(item)" title="Eliminar" class="text-slate-600 hover:text-red-400 p-1.5"><i class="bi bi-trash3"></i></button>
      </template>
      <template #card="{ item }">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5">
          <div class="flex items-center justify-between mb-2"><span class="text-white font-black text-sm">{{ formatMoney(item.amount) }}</span><span class="text-[9px] font-black px-2 py-1 rounded-lg border uppercase" :class="statusBadge(item.status)">{{ statusLabel(item.status) }}</span></div>
          <p class="text-[11px] text-slate-400">{{ item.label || item.ref }}</p>
          <p class="text-[10px] text-slate-500"><i class="bi bi-shop"></i> {{ item.point_name || item.point_id }}</p>
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
      payments: [],
      saving: false,
      filter: 'held_at_point',
      form: { ref: '', amount: null },
      filters: [
        { id: 'held_at_point', label: 'Retenidos' },
        { id: 'collected', label: 'Recolectados' },
        { id: 'delivered', label: 'Entregados' },
        { id: 'all', label: 'Todos' }
      ],
      cols: [
        { key: 'concept', label: 'Concepto' },
        { key: 'point', label: 'Punto' },
        { key: 'amount', label: 'Monto', align: 'right' },
        { key: 'net', label: 'Comisión / Neto', align: 'right' },
        { key: 'status', label: 'Estado' }
      ]
    };
  },
  computed: {
    role() { return this.appState.user?.role || 'guest'; },
    canRegister() { return this.role === 'operator' || this.role === 'admin'; },
    myPointId() { return this.appState.user?.point_ref || ''; },
    filtered() {
      let list = this.payments;
      if (this.role === 'operator' && this.myPointId) list = list.filter(p => p.point_id === this.myPointId);
      if (this.filter !== 'all') list = list.filter(p => (p.status || 'held_at_point') === this.filter);
      return list;
    },
    totals() {
      const t = { held: 0, collectedNet: 0, deliveredNet: 0, commission: 0, rounding: 0 };
      for (const p of this.payments) {
        if (p.method === 'credit') continue; // los asientos de crédito no son efectivo
        const amt = Number(p.amount) || 0, net = Number(p.net) || 0, com = Number(p.commission) || 0, rnd = Number(p.rounding) || 0;
        if (p.status === 'held_at_point') t.held += amt;
        else if (p.status === 'collected') { t.collectedNet += net; t.commission += com; t.rounding += rnd; }
        else if (p.status === 'delivered') { t.deliveredNet += net; t.commission += com; t.rounding += rnd; }
      }
      return t;
    }
  },
  mounted() { this.load(); },
  methods: {
    token() { return localStorage.getItem('ep_token'); },
    formatMoney(a) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(a) || 0); },
    statusLabel(s) { return ({ held_at_point: 'En punto', collected: 'Recolectado', delivered: 'Entregado' })[s] || 'En punto'; },
    statusBadge(s) { return ({ held_at_point: 'bg-slate-800 text-slate-400 border-slate-700', collected: 'bg-amber-900/30 text-amber-400 border-amber-900/50', delivered: 'bg-green-900/30 text-green-400 border-green-900/50' })[s] || 'bg-slate-800 text-slate-400 border-slate-700'; },
    pointCommissionRate() {
      const pts = this.appState.demoData?.points || [];
      const p = pts.find(x => x.id === this.myPointId);
      return Number(p?.commission_rate) || 0;
    },
    async apiGet() {
      if (this.appState.demoMode) return { items: this.appState.demoData.payments || [] };
      const res = await fetch(`${this.pb_url}/api/collections/payments/records?sort=-created&perPage=300`, { headers: { Authorization: this.token() } });
      return res.json();
    },
    async apiPost(body) {
      if (this.appState.demoMode) {
        const item = { id: 'mock_' + Date.now(), status: 'held_at_point', ...body, created: new Date().toISOString() };
        if (!this.appState.demoData.payments) this.appState.demoData.payments = [];
        this.appState.demoData.payments.unshift(item);
        // demo: reflejar el abono en la reserva
        const bk = (this.appState.demoData.excursion_bookings || []).find(b => b.id === body.ref);
        if (bk) { bk.amount_paid = (Number(bk.amount_paid) || 0) + Number(body.amount || 0); bk.balance = Math.max(0, (Number(bk.total) || 0) - bk.amount_paid); bk.payment_status = bk.amount_paid >= bk.total ? 'paid' : 'partial'; }
        this.saveDemoData({ ...this.appState.demoData });
        return item;
      }
      const res = await fetch(`${this.pb_url}/api/collections/payments/records`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: this.token() }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('No se pudo registrar el abono.');
      return res.json();
    },
    async apiPatch(id, body) {
      if (this.appState.demoMode) {
        const arr = this.appState.demoData.payments || [];
        const i = arr.findIndex(p => p.id === id);
        if (i !== -1) { arr[i] = { ...arr[i], ...body }; this.saveDemoData({ ...this.appState.demoData }); return arr[i]; }
        return null;
      }
      const res = await fetch(`${this.pb_url}/api/collections/payments/records/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: this.token() }, body: JSON.stringify(body) });
      return res.json();
    },
    async apiDelete(id) {
      if (this.appState.demoMode) { this.appState.demoData.payments = (this.appState.demoData.payments || []).filter(p => p.id !== id); this.saveDemoData({ ...this.appState.demoData }); return; }
      await fetch(`${this.pb_url}/api/collections/payments/records/${id}`, { method: 'DELETE', headers: { Authorization: this.token() } });
    },
    async load() { try { const d = await this.apiGet(); this.payments = d.items || []; } catch (_) { this.payments = []; } },
    async registrarAbono() {
      if (!this.form.ref || !(this.form.amount > 0)) return this.showModal({ title: 'Datos faltantes', message: 'Captura el código de reserva y el monto.', type: 'warning' });
      this.saving = true;
      try {
        await this.apiPost({ kind: 'excursion', ref: this.form.ref.trim(), label: 'Abono ' + this.form.ref.trim(), amount: Number(this.form.amount), point_id: this.myPointId, point_name: this.appState.point?.name || '', method: 'cash' });
        this.emitBusinessEvent({ audience: ['admin'], severity: 'info', icon: 'cash-coin', title: 'Abono recibido', message: `Abono de ${this.formatMoney(this.form.amount)} en el punto.` });
        this.form = { ref: '', amount: null };
        await this.load();
        this.showModal({ title: 'Abono registrado', message: 'Quedó retenido en tu punto hasta la visita del chofer.', type: 'success' });
      } catch (e) { this.showModal({ title: 'Error', message: e.message, type: 'error' }); }
      finally { this.saving = false; }
    },
    async enviarRecordatorios() {
      if (this.appState.demoMode) return this.showModal({ title: 'Recordatorios', message: 'En modo demo no se envían recordatorios reales.', type: 'info' });
      this.saving = true;
      try {
        const res = await fetch(`${this.pb_url}/api/reminders/run`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: this.token() } });
        const data = await res.json();
        this.showModal({ title: 'Recordatorios procesados', message: `${data.processed || 0} reserva(s) con abono pendiente, ${data.sent || 0} aviso(s) enviados.`, type: 'success' });
      } catch (e) {
        this.showModal({ title: 'Error', message: 'No se pudieron procesar los recordatorios.', type: 'error' });
      } finally { this.saving = false; }
    },
    async aplicarCredito() {
      const ref = (this.form.ref || '').trim();
      if (!ref) return this.showModal({ title: 'Falta el código', message: 'Captura el código de reserva para aplicar su crédito.', type: 'warning' });
      this.saving = true;
      try {
        if (this.appState.demoMode) {
          const bk = (this.appState.demoData.excursion_bookings || []).find(b => b.id === ref);
          if (!bk) throw new Error('Reserva no encontrada (demo).');
          const wallet = (this.appState.demoData.wallets || []).find(w => w.customer_phone === bk.customer_phone);
          const avail = Number(wallet?.balance) || 0;
          const owed = Math.max(0, (Number(bk.total) || 0) - (Number(bk.amount_paid) || 0));
          const applied = Math.min(avail, owed);
          if (applied <= 0) { this.showModal({ title: 'Sin crédito', message: 'Este cliente no tiene crédito disponible o ya está liquidado.', type: 'info' }); return; }
          bk.amount_paid = (Number(bk.amount_paid) || 0) + applied;
          bk.balance = Math.max(0, (Number(bk.total) || 0) - bk.amount_paid);
          bk.payment_status = bk.amount_paid >= bk.total ? 'paid' : 'partial';
          wallet.balance = avail - applied;
          this.saveDemoData({ ...this.appState.demoData });
          this.showModal({ title: 'Crédito aplicado', message: `Se aplicaron ${this.formatMoney(applied)}. Saldo de crédito: ${this.formatMoney(wallet.balance)}.`, type: 'success' });
        } else {
          const res = await fetch(`${this.pb_url}/api/wallet/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: this.token() }, body: JSON.stringify({ ref }) });
          const data = await res.json();
          if (data && data.applied > 0) this.showModal({ title: 'Crédito aplicado', message: `Se aplicaron ${this.formatMoney(data.applied)}. Saldo de crédito: ${this.formatMoney(data.balance)}.`, type: 'success' });
          else this.showModal({ title: 'Sin crédito', message: 'Este cliente no tiene crédito disponible o ya está liquidado.', type: 'info' });
        }
        await this.load();
      } catch (e) {
        this.showModal({ title: 'Error', message: e.message || 'No se pudo aplicar el crédito.', type: 'error' });
      } finally { this.saving = false; }
    },
    async collect(item) {
      // En demo calculamos comisión/neto/redondeo en el cliente (en vivo lo recalcula el hook).
      const rate = this.pointCommissionRateFor(item);
      const amount = Number(item.amount) || 0;
      const commission = Math.round(amount * rate) / 100;
      const net = Math.max(0, amount - commission);
      const suggested = Math.round(net);
      const input = window.prompt(
        `Neto a recolectar: ${this.formatMoney(net)} (comisión punto ${this.formatMoney(commission)}).\n` +
        `Sin cambio: puedes redondear ±$10 (arriba = débito, abajo = crédito).\n¿Cuánto recolectaste en efectivo?`,
        String(suggested)
      );
      if (input == null) return;
      const collected = Number(input);
      if (!(collected > 0)) return;
      const rounding = Math.round((collected - net) * 100) / 100;
      if (Math.abs(rounding) > 10) {
        return this.showModal({ title: 'Redondeo excedido', message: 'El redondeo no puede pasar de $10 (una decena).', type: 'warning' });
      }
      await this.apiPatch(item.id, { status: 'collected', collected_by: this.appState.user?.id || '', commission, net, collected_amount: collected, rounding, collected_at: new Date().toISOString() });
      await this.load();
    },
    pointCommissionRateFor(item) {
      const pts = this.appState.demoData?.points || [];
      const p = pts.find(x => x.id === item.point_id);
      return Number(p?.commission_rate) || 0;
    },
    async deliver(item) {
      await this.apiPatch(item.id, { status: 'delivered', delivered_at: new Date().toISOString() });
      await this.load();
    },
    async remove(item) {
      const ok = await this.showModal({ title: 'Eliminar abono', message: '¿Eliminar este registro?', type: 'confirm', confirmText: 'Eliminar' });
      if (!ok) return;
      await this.apiDelete(item.id);
      await this.load();
    }
  }
}
</script>

<style scoped>
.input-dark { width:100%; background-color:#020617; border:1px solid #1e293b; color:#fff; border-radius:0.75rem; padding:0.75rem 1rem; font-size:0.8rem; outline:none; }
.input-dark::placeholder { color:#475569; }
.input-dark:focus { border-color:#84cc16; box-shadow:0 0 0 2px rgba(132,204,22,0.2); }
</style>
