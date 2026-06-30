<template>
  <div>
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p class="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Monederos activos</p>
        <p class="text-white text-xl font-black">{{ wallets.filter(w => (Number(w.balance) || 0) > 0).length }}</p>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p class="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Crédito total en circulación</p>
        <p class="text-purple-400 text-xl font-black">{{ formatMoney(totalBalance) }}</p>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p class="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Clientes con crédito</p>
        <p class="text-white text-xl font-black">{{ wallets.length }}</p>
      </div>
    </div>

    <DataView :items="wallets" :columns="cols" label="monederos" storageKey="ep_wallets_view">
      <template #row="{ item }">
        <td class="px-6 py-4">
          <div class="flex flex-col"><span class="text-white font-bold text-xs">{{ item.customer_name || 'Cliente' }}</span><span class="text-[10px] text-slate-500 font-mono">{{ item.customer_phone }}</span></div>
        </td>
        <td class="px-6 py-4 text-right"><span class="font-black text-sm" :class="(Number(item.balance) || 0) > 0 ? 'text-purple-400' : 'text-slate-500'">{{ formatMoney(item.balance) }}</span></td>
      </template>
      <template #actions="{ item }">
        <a :href="waUrl(item)" target="_blank" rel="noopener noreferrer" title="Avisar crédito por WhatsApp" class="text-green-400 hover:text-green-300 p-1.5"><i class="bi bi-whatsapp"></i></a>
      </template>
      <template #card="{ item }">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5">
          <p class="text-white font-black text-sm">{{ item.customer_name || 'Cliente' }}</p>
          <p class="text-[10px] text-slate-500 font-mono mb-3">{{ item.customer_phone }}</p>
          <p class="text-purple-400 font-black text-lg">{{ formatMoney(item.balance) }}</p>
        </div>
      </template>
    </DataView>
  </div>
</template>

<script>
const { loadModule } = window['vue3-sfc-loader'];
const options = window.options;

export default {
  inject: ['appState', 'pb_url'],
  components: { DataView: Vue.defineAsyncComponent(() => loadModule('./components/DataView.vue', options)) },
  data() {
    return {
      wallets: [],
      cols: [
        { key: 'cust', label: 'Cliente' },
        { key: 'balance', label: 'Crédito', align: 'right' }
      ]
    };
  },
  computed: {
    totalBalance() { return this.wallets.reduce((s, w) => s + (Number(w.balance) || 0), 0); }
  },
  mounted() { this.load(); },
  methods: {
    token() { return localStorage.getItem('ep_token'); },
    formatMoney(a) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(a) || 0); },
    waUrl(item) {
      const phone = String(item.customer_phone || '').replace(/\D/g, '');
      const msg = `Hola ${item.customer_name || ''}, tienes ${this.formatMoney(item.balance)} de crédito Easypoint para tu próxima experiencia.`;
      return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    },
    async load() {
      if (this.appState.demoMode) { this.wallets = this.appState.demoData.wallets || []; return; }
      try {
        const res = await fetch(`${this.pb_url}/api/collections/wallets/records?sort=-balance&perPage=300`, { headers: { Authorization: this.token() } });
        const d = await res.json();
        this.wallets = d.items || [];
      } catch (_) { this.wallets = []; }
    }
  }
}
</script>
