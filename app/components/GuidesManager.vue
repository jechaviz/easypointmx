<template>
  <div>
    <DataView :items="guides" :columns="cols" label="guías" storageKey="ep_guides_view">
      <template #header-actions>
        <button @click="openNew" class="bg-brand-500 hover:bg-brand-400 text-slate-900 font-black px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all flex items-center gap-2">
          <i class="bi bi-plus-lg"></i> Vender guía
        </button>
      </template>

      <template #row="{ item }">
        <td class="px-6 py-4">
          <div class="flex flex-col">
            <span class="text-white font-black text-xs uppercase">{{ (item.carrier || '').toUpperCase() }} <span class="text-slate-500 font-bold">· {{ item.service === 'express' ? 'Express' : 'Estándar' }}</span></span>
            <span class="text-[10px] text-slate-500 font-mono">{{ item.tracking_number || 'sin guía' }}</span>
          </div>
        </td>
        <td class="px-6 py-4">
          <div class="flex flex-col">
            <span class="text-slate-200 text-xs font-bold">{{ item.recipient_name || '—' }}</span>
            <span class="text-[10px] text-slate-500">{{ item.dest_cp || item.dest_address || '' }}</span>
          </div>
        </td>
        <td class="px-6 py-4 text-right text-white font-black text-xs">{{ formatMoney(item.price) }}</td>
        <td class="px-6 py-4">
          <span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider" :class="statusBadge(item.status)">{{ statusLabel(item.status) }}</span>
        </td>
      </template>

      <template #actions="{ item }">
        <a v-if="recipientWa(item)" :href="waTrackUrl(item)" target="_blank" rel="noopener noreferrer" title="Avisar al destinatario" class="text-green-400 hover:text-green-300 p-1.5"><i class="bi bi-whatsapp"></i></a>
        <button @click="checkoutGuide(item)" title="Cobro en línea" class="text-emerald-400 hover:text-emerald-300 p-1.5"><i class="bi bi-credit-card"></i></button>
        <button v-if="item.status === 'quoted'" @click="setStatus(item, 'paid')" title="Marcar pagada" class="text-blue-400 hover:text-blue-300 p-1.5"><i class="bi bi-cash-coin"></i></button>
        <button v-if="item.status === 'paid'" @click="generate(item)" title="Generar guía" class="text-brand-400 hover:text-brand-300 p-1.5"><i class="bi bi-upc-scan"></i></button>
        <button v-if="['generated','in_transit'].includes(item.status)" @click="setStatus(item, item.status === 'generated' ? 'in_transit' : 'delivered')" title="Avanzar estado" class="text-amber-400 hover:text-amber-300 p-1.5"><i class="bi bi-arrow-right-circle"></i></button>
        <button @click="remove(item)" title="Eliminar" class="text-slate-600 hover:text-red-400 p-1.5"><i class="bi bi-trash3"></i></button>
      </template>

      <template #card="{ item }">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <span class="text-white font-black text-sm uppercase">{{ (item.carrier || '').toUpperCase() }}</span>
            <span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider" :class="statusBadge(item.status)">{{ statusLabel(item.status) }}</span>
          </div>
          <p class="text-slate-300 text-xs font-bold">{{ item.recipient_name || '—' }}</p>
          <p class="text-[10px] text-slate-500 mb-3">{{ item.dest_address || item.dest_cp || '' }}</p>
          <p class="text-white font-black text-lg mt-auto">{{ formatMoney(item.price) }}</p>
        </div>
      </template>
    </DataView>

    <!-- Modal nueva guía -->
    <Transition name="fade">
      <div v-if="showForm" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
        <div class="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
          <button @click="showForm = false" class="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl"><i class="bi bi-x-lg"></i></button>
          <h3 class="text-2xl font-black text-white mb-1 uppercase tracking-tight">Vender guía</h3>
          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8">Convenio DHL / Estafeta</p>

          <div class="space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col">
                <label class="label-sm">Paquetería</label>
                <select v-model="form.carrier" class="input-dark"><option value="estafeta">Estafeta</option><option value="dhl">DHL</option></select>
              </div>
              <div class="flex flex-col">
                <label class="label-sm">Servicio</label>
                <select v-model="form.service" class="input-dark"><option value="standard">Estándar</option><option value="express">Express</option></select>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div class="flex flex-col"><label class="label-sm">CP Origen</label><input v-model="form.origin_cp" class="input-dark" placeholder="06700"></div>
              <div class="flex flex-col"><label class="label-sm">CP Destino</label><input v-model="form.dest_cp" class="input-dark" placeholder="44100"></div>
              <div class="flex flex-col"><label class="label-sm">Peso (kg)</label><input v-model.number="form.weight_kg" type="number" min="0.5" step="0.5" class="input-dark"></div>
            </div>
            <div>
              <div class="grid grid-cols-3 gap-4">
                <div class="flex flex-col"><label class="label-sm">Largo (cm)</label><input v-model.number="form.length_cm" type="number" min="0" class="input-dark"></div>
                <div class="flex flex-col"><label class="label-sm">Ancho (cm)</label><input v-model.number="form.width_cm" type="number" min="0" class="input-dark"></div>
                <div class="flex flex-col"><label class="label-sm">Alto (cm)</label><input v-model.number="form.height_cm" type="number" min="0" class="input-dark"></div>
              </div>
              <p v-if="volWeight > 0" class="text-[10px] text-slate-500 mt-2 px-1">Peso volumétrico: {{ volWeight.toFixed(1) }} kg · cobrable {{ Math.max(Math.max(0.5, Number(form.weight_kg)||0.5), volWeight).toFixed(1) }} kg</p>
              <p class="text-[10px] text-brand-400 font-bold mt-1 px-1">Comisión del punto (por tramo de peso): {{ formatMoney(commissionPreview) }}</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col"><label class="label-sm">Remitente</label><input v-model="form.sender_name" class="input-dark" placeholder="Nombre"></div>
              <div class="flex flex-col"><label class="label-sm">Destinatario</label><input v-model="form.recipient_name" class="input-dark" placeholder="Nombre"></div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col"><label class="label-sm">Tel. destinatario</label><input v-model="form.recipient_phone" class="input-dark" placeholder="55..."></div>
              <div class="flex flex-col"><label class="label-sm">Valor declarado</label><input v-model.number="form.declared_value" type="number" min="0" class="input-dark" placeholder="0"></div>
            </div>
            <div class="flex flex-col"><label class="label-sm">Dirección destino</label><input v-model="form.dest_address" class="input-dark" placeholder="Calle, número, colonia, ciudad"></div>
            <div class="flex flex-col"><label class="label-sm">Punto / vendedor</label><input v-model="form.point_name" class="input-dark" placeholder="Punto Easypoint"></div>

            <div class="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p class="text-[10px] text-slate-500 font-black uppercase tracking-widest">Precio (tarifa de convenio)</p>
                <p class="text-[10px] text-slate-600">{{ zoneLabel }} · editable</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-slate-500 font-black">$</span>
                <input v-model.number="form.price" type="number" min="0" class="input-dark !w-28 text-right !py-2">
              </div>
            </div>
          </div>

          <div class="flex gap-4 mt-8">
            <button @click="save" :disabled="saving" class="flex-1 bg-brand-500 text-slate-900 font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-brand-400 transition-all disabled:opacity-50">{{ saving ? 'Guardando...' : 'Registrar guía' }}</button>
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

function volumetricWeight(l, w, h) {
  const v = (Number(l) || 0) * (Number(w) || 0) * (Number(h) || 0);
  return v > 0 ? v / 5000 : 0;
}
function quoteGuide({ carrier, service, weightKg, sameZone, length, width, height }) {
  const actual = Math.max(0.5, Number(weightKg) || 0.5);
  const w = Math.max(actual, volumetricWeight(length, width, height));
  const table = { dhl: { base: 139, perKg: 38 }, estafeta: { base: 109, perKg: 30 } };
  const t = table[carrier] || table.estafeta;
  let price = t.base + Math.max(0, Math.ceil(w) - 1) * t.perKg;
  if (service === 'express') price *= 1.6;
  price *= sameZone ? 1.0 : 1.4;
  return Math.round(price);
}

function randomTracking(carrier) {
  const prefix = carrier === 'dhl' ? 'DHL' : 'EST';
  const n = String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
  return `${prefix}${n}`;
}

export default {
  inject: ['appState', 'pb_url', 'showModal', 'saveDemoData', 'emitBusinessEvent'],
  components: {
    DataView: Vue.defineAsyncComponent(() => loadModule('./components/DataView.vue', options))
  },
  data() {
    return {
      guides: [],
      showForm: false,
      saving: false,
      cols: [
        { key: 'carrier', label: 'Servicio' },
        { key: 'recipient', label: 'Destino' },
        { key: 'price', label: 'Precio', align: 'right' },
        { key: 'status', label: 'Estado' }
      ],
      form: this.blankForm()
    };
  },
  computed: {
    sameZone() {
      const a = String(this.form.origin_cp || '').slice(0, 2);
      const b = String(this.form.dest_cp || '').slice(0, 2);
      return Boolean(a && b && a === b);
    },
    zoneLabel() {
      if (!this.form.origin_cp || !this.form.dest_cp) return 'Tarifa nacional';
      return this.sameZone ? 'Zona local' : 'Zona nacional';
    },
    volWeight() {
      return volumetricWeight(this.form.length_cm, this.form.width_cm, this.form.height_cm);
    },
    chargeableKg() {
      return Math.max(Number(this.form.weight_kg) || 0, this.volWeight);
    },
    commissionPreview() {
      const kg = this.chargeableKg;
      return kg <= 1 ? 10 : (kg <= 5 ? 20 : (kg <= 20 ? 35 : 50));
    },
    autoQuote() {
      return quoteGuide({ carrier: this.form.carrier, service: this.form.service, weightKg: this.form.weight_kg, sameZone: this.sameZone, length: this.form.length_cm, width: this.form.width_cm, height: this.form.height_cm });
    }
  },
  watch: {
    autoQuote(val) {
      // Refleja la tarifa de convenio mientras el operador no la edite a mano.
      if (this.showForm && !this.form._priceTouched) this.form.price = val;
    },
    'form.price'() {
      if (this.showForm && this.form.price !== this.autoQuote) this.form._priceTouched = true;
    }
  },
  mounted() { this.load(); },
  methods: {
    blankForm() {
      return { carrier: 'estafeta', service: 'standard', origin_cp: '', dest_cp: '', origin_address: '', dest_address: '', sender_name: '', recipient_name: '', recipient_phone: '', weight_kg: 1, length_cm: 0, width_cm: 0, height_cm: 0, declared_value: 0, price: 0, status: 'quoted', point_name: '', notes: '', tracking_number: '', _priceTouched: false };
    },
    token() { return localStorage.getItem('ep_token'); },
    formatMoney(a) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(a) || 0); },
    statusLabel(s) { return ({ quoted: 'Cotizada', paid: 'Pagada', generated: 'Generada', in_transit: 'En tránsito', delivered: 'Entregada', cancelled: 'Cancelada' })[s] || s || '—'; },
    statusBadge(s) {
      return ({
        quoted: 'bg-slate-800 text-slate-400 border-slate-700',
        paid: 'bg-blue-900/30 text-blue-400 border-blue-900/50',
        generated: 'bg-brand-900/30 text-brand-400 border-brand-900/50',
        in_transit: 'bg-amber-900/30 text-amber-400 border-amber-900/50',
        delivered: 'bg-green-900/30 text-green-400 border-green-900/50',
        cancelled: 'bg-red-900/30 text-red-400 border-red-900/50'
      })[s] || 'bg-slate-800 text-slate-400 border-slate-700';
    },
    recipientWa(item) { return String(item.recipient_phone || '').replace(/\D/g, ''); },
    waTrackUrl(item) {
      const lines = [
        `Hola ${item.recipient_name || ''}, tu envío Easypoint va en camino.`,
        `Paquetería: ${(item.carrier || '').toUpperCase()}`,
        item.tracking_number ? `Guía: ${item.tracking_number}` : ''
      ].filter(Boolean);
      return `https://wa.me/${this.recipientWa(item)}?text=${encodeURIComponent(lines.join('\n'))}`;
    },
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
    async load() {
      try {
        const data = await this.apiGet('shipping_guides');
        this.guides = data.items || [];
      } catch (_) { this.guides = []; }
    },
    openNew() {
      this.form = this.blankForm();
      this.form.price = this.autoQuote;
      this.showForm = true;
    },
    async save() {
      if (!this.form.recipient_name) return this.showModal({ title: 'Falta destinatario', message: 'Captura el nombre del destinatario.', type: 'warning' });
      this.saving = true;
      try {
        const { _priceTouched, ...payload } = this.form;
        payload.point_id = this.appState.user?.point_ref || '';
        payload.commission = this.commissionPreview; // tramo por peso/medidas (lo confirma el hook)
        await this.apiPost('shipping_guides', payload);
        this.emitBusinessEvent({ audience: ['admin'], severity: 'success', icon: 'box-seam-fill', title: 'Guía vendida', message: `${(payload.carrier || '').toUpperCase()} para ${payload.recipient_name} (${this.formatMoney(payload.price)}).` });
        this.showForm = false;
        await this.load();
        this.showModal({ title: '¡Guía registrada!', message: 'La guía quedó en estado cotizada/pagada.', type: 'success' });
      } catch (e) {
        this.showModal({ title: 'Error', message: e.message || 'No se pudo registrar la guía.', type: 'error' });
      } finally {
        this.saving = false;
      }
    },
    async checkoutGuide(item) {
      try {
        const res = await fetch(`${this.pb_url}/api/pay/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: this.token() },
          body: JSON.stringify({ collection: 'shipping_guides', id: item.id })
        });
        const data = await res.json();
        if (data && data.url) {
          window.open(data.url, '_blank', 'noopener');
        } else {
          this.showModal({ title: 'Cobro manual', message: (data && data.instructions) || 'Cobra en efectivo o transferencia y marca la guía como pagada.', type: 'info' });
        }
      } catch (e) {
        this.showModal({ title: 'Error', message: 'No se pudo iniciar el cobro en línea.', type: 'error' });
      }
    },
    async setStatus(item, status) {
      try { await this.apiPatch('shipping_guides', item.id, { status }); await this.load(); }
      catch (e) { this.showModal({ title: 'Error', message: e.message, type: 'error' }); }
    },
    async generate(item) {
      const tracking = item.tracking_number || randomTracking(item.carrier);
      try {
        await this.apiPatch('shipping_guides', item.id, { status: 'generated', tracking_number: tracking });
        await this.load();
        this.showModal({ title: 'Guía generada', message: `Número de guía: ${tracking}`, type: 'success' });
      } catch (e) { this.showModal({ title: 'Error', message: e.message, type: 'error' }); }
    },
    async remove(item) {
      const ok = await this.showModal({ title: 'Eliminar guía', message: '¿Eliminar esta guía?', type: 'confirm', confirmText: 'Eliminar' });
      if (!ok) return;
      try { await this.apiDelete('shipping_guides', item.id); await this.load(); }
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
