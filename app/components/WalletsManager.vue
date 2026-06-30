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
        <button @click="verMovimientos(item)" title="Ver movimientos" class="text-purple-400 hover:text-purple-300 p-1.5"><i class="bi bi-clock-history"></i></button>
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

    <!-- Modal movimientos del monedero -->
    <Transition name="fade">
      <div v-if="showEntries" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
        <div class="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
          <button @click="showEntries = false" class="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl"><i class="bi bi-x-lg"></i></button>
          <h3 class="text-2xl font-black text-white mb-1 uppercase tracking-tight">Movimientos</h3>
          <p class="text-[10px] text-slate-500 font-mono mb-6">{{ entriesWallet.customer_name || 'Cliente' }} · {{ entriesWallet.customer_phone }}</p>
          <div v-if="entriesLoading" class="text-slate-500 text-xs font-bold py-8 text-center">Cargando movimientos...</div>
          <div v-else-if="!entries.length" class="text-slate-500 text-xs font-bold py-8 text-center">Sin movimientos registrados.</div>
          <div v-else class="space-y-2">
            <div v-for="e in entries" :key="e.id" class="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3">
              <div class="flex flex-col">
                <span class="text-white text-xs font-bold">{{ e.reason || 'Movimiento' }}</span>
                <span class="text-[10px] text-slate-500 font-mono">{{ formatDate(e.created) }}<span v-if="e.ref"> · {{ e.ref }}</span></span>
              </div>
              <div class="flex flex-col items-end">
                <span class="font-black text-sm" :class="(Number(e.amount) || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'">{{ signedMoney(e.amount) }}</span>
                <span class="text-[10px] text-slate-500">Saldo: {{ formatMoney(e.balance_after) }}</span>
              </div>
            </div>
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
  inject: ['appState', 'pb_url'],
  components: { DataView: Vue.defineAsyncComponent(() => loadModule('./components/DataView.vue', options)) },
  data() {
    return {
      wallets: [],
      showEntries: false,
      entriesLoading: false,
      entries: [],
      entriesWallet: {},
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
    signedMoney(a) { const n = Number(a) || 0; return (n > 0 ? '+' : '') + this.formatMoney(n); },
    formatDate(d) { return d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'; },
    async verMovimientos(item) {
      this.entriesWallet = item;
      this.entries = [];
      this.entriesLoading = true;
      this.showEntries = true;
      try {
        const phone = item.customer_phone || '';
        let items = [];
        if (this.appState.demoMode) {
          items = (this.appState.demoData.wallet_entries || []).filter(e => e.customer_phone === phone);
        } else {
          const filter = encodeURIComponent(`customer_phone = "${phone}"`);
          const res = await fetch(`${this.pb_url}/api/collections/wallet_entries/records?filter=${filter}&sort=-created&perPage=300`, { headers: { Authorization: this.token() } });
          const d = await res.json();
          items = d.items || [];
        }
        this.entries = items;
      } catch (_) { this.entries = []; }
      finally { this.entriesLoading = false; }
    },
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

<style scoped>
.fade-enter-active,.fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from,.fade-leave-to { opacity: 0; }
</style>
