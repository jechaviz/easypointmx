<template>
  <div>
    <DataView :items="tickets" :columns="cols" label="tickets" storageKey="ep_tickets_view">
      <template #row="{ item }">
        <td class="px-6 py-4">
          <div class="flex flex-col">
            <span class="text-white font-bold text-xs">{{ item.customer_name || 'Anónimo' }}</span>
            <span class="text-[10px] text-slate-500 font-mono">{{ item.customer_phone }}</span>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider" :class="kindBadge(item.kind)">{{ kindLabel(item.kind) }}</span>
        </td>
        <td class="px-6 py-4">
          <span class="text-[11px] text-slate-300 line-clamp-2">{{ item.message }}</span>
        </td>
        <td class="px-6 py-4 text-[10px] text-slate-400 font-mono">{{ formatDate(item.created) }}</td>
        <td class="px-6 py-4">
          <span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider" :class="statusBadge(item.status)">{{ statusLabel(item.status) }}</span>
        </td>
      </template>

      <template #actions="{ item }">
        <a v-if="waOf(item)" :href="waUrl(item)" target="_blank" rel="noopener noreferrer" title="Responder por WhatsApp" class="text-green-400 hover:text-green-300 p-1.5"><i class="bi bi-whatsapp"></i></a>
        <button v-if="item.status !== 'resolved'" @click="resolve(item)" title="Resolver" class="text-emerald-400 hover:text-emerald-300 p-1.5"><i class="bi bi-check-circle"></i></button>
        <button v-if="item.status !== 'escalated'" @click="escalate(item)" title="Escalar" class="text-amber-400 hover:text-amber-300 p-1.5"><i class="bi bi-exclamation-triangle"></i></button>
        <button @click="remove(item)" title="Eliminar" class="text-slate-600 hover:text-red-400 p-1.5"><i class="bi bi-trash3"></i></button>
      </template>

      <template #card="{ item }">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
          <div class="flex items-center justify-between mb-2">
            <span class="text-white font-black text-sm">{{ item.customer_name || 'Anónimo' }}</span>
            <span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider" :class="kindBadge(item.kind)">{{ kindLabel(item.kind) }}</span>
          </div>
          <p class="text-[11px] text-slate-400 mb-3">{{ item.message }}</p>
          <span class="text-[9px] font-black uppercase tracking-wider mt-auto" :class="statusBadge(item.status)">{{ statusLabel(item.status) }}</span>
        </div>
      </template>
    </DataView>
  </div>
</template>

<script>
const { loadModule } = window['vue3-sfc-loader'];
const options = window.options;

export default {
  inject: ['appState', 'pb_url', 'showModal', 'saveDemoData'],
  components: {
    DataView: Vue.defineAsyncComponent(() => loadModule('./components/DataView.vue', options))
  },
  data() {
    return {
      tickets: [],
      cols: [
        { key: 'cust', label: 'Cliente' },
        { key: 'kind', label: 'Tipo' },
        { key: 'msg', label: 'Mensaje' },
        { key: 'date', label: 'Recibido' },
        { key: 'status', label: 'Estado' }
      ]
    };
  },
  mounted() { this.load(); },
  methods: {
    token() { return localStorage.getItem('ep_token'); },
    formatDate(d) { return d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; },
    kindLabel(k) { return ({ complaint: 'Queja', question: 'Pregunta', refund_request: 'Reembolso', other: 'Otro' })[k] || 'Mensaje'; },
    kindBadge(k) { return ({ complaint: 'bg-red-900/30 text-red-400 border-red-900/50', refund_request: 'bg-amber-900/30 text-amber-400 border-amber-900/50' })[k] || 'bg-slate-800 text-slate-400 border-slate-700'; },
    statusLabel(s) { return ({ open: 'Abierto', in_progress: 'En proceso', resolved: 'Resuelto', escalated: 'Escalado' })[s] || 'Abierto'; },
    statusBadge(s) { return ({ open: 'bg-amber-900/30 text-amber-400 border-amber-900/50', in_progress: 'bg-blue-900/30 text-blue-400 border-blue-900/50', resolved: 'bg-green-900/30 text-green-400 border-green-900/50', escalated: 'bg-red-900/30 text-red-400 border-red-900/50' })[s] || 'bg-slate-800 text-slate-400 border-slate-700'; },
    waOf(item) { return String(item.customer_phone || '').replace(/\D/g, ''); },
    waUrl(item) {
      const msg = `Hola ${item.customer_name || ''}, somos Easypoint. Vimos tu mensaje y queremos resolverlo.`;
      return `https://wa.me/${this.waOf(item)}?text=${encodeURIComponent(msg)}`;
    },
    async apiGet() {
      if (this.appState.demoMode) return { items: this.appState.demoData.support_tickets || [] };
      const res = await fetch(`${this.pb_url}/api/collections/support_tickets/records?sort=-created&perPage=200`, { headers: { Authorization: this.token() } });
      return res.json();
    },
    async apiPatch(id, body) {
      if (this.appState.demoMode) {
        const arr = this.appState.demoData.support_tickets || [];
        const i = arr.findIndex(t => t.id === id);
        if (i !== -1) { arr[i] = { ...arr[i], ...body }; this.saveDemoData({ ...this.appState.demoData }); }
        return;
      }
      await fetch(`${this.pb_url}/api/collections/support_tickets/records/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: this.token() }, body: JSON.stringify(body) });
    },
    async apiDelete(id) {
      if (this.appState.demoMode) {
        this.appState.demoData.support_tickets = (this.appState.demoData.support_tickets || []).filter(t => t.id !== id);
        this.saveDemoData({ ...this.appState.demoData });
        return;
      }
      await fetch(`${this.pb_url}/api/collections/support_tickets/records/${id}`, { method: 'DELETE', headers: { Authorization: this.token() } });
    },
    async load() {
      try { const d = await this.apiGet(); this.tickets = d.items || []; } catch (_) { this.tickets = []; }
    },
    async resolve(item) {
      const note = window.prompt('Nota de resolución (cómo se atendió):', item.resolution || '');
      if (note == null) return;
      await this.apiPatch(item.id, { status: 'resolved', resolution: note });
      await this.load();
    },
    async escalate(item) {
      await this.apiPatch(item.id, { status: 'escalated' });
      await this.load();
    },
    async remove(item) {
      const ok = await this.showModal({ title: 'Eliminar ticket', message: '¿Eliminar este ticket?', type: 'confirm', confirmText: 'Eliminar' });
      if (!ok) return;
      await this.apiDelete(item.id);
      await this.load();
    }
  }
}
</script>
