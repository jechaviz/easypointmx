<template>
  <div>
    <!-- KPIs financieros -->
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-12 animate-fade-in">
      <div v-for="stat in kpis" :key="stat.label" class="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:border-brand-500/30 transition-all">
        <div class="absolute -top-12 -right-12 w-24 h-24 bg-brand-500/5 blur-[40px] rounded-full group-hover:bg-brand-500/10 transition-all"></div>
        <div class="flex items-center gap-4 mb-6">
          <div class="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center border border-slate-800 shadow-inner group-hover:scale-110 transition-transform" :class="stat.color || 'text-brand-400'">
            <i :class="'bi bi-' + stat.icon" class="text-xl"></i>
          </div>
          <p class="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] leading-tight">{{ stat.label }}</p>
        </div>
        <p class="text-white text-4xl font-black mb-1 group-hover:text-brand-500 transition-colors">{{ formatMoney(stat.value) }}</p>
        <p class="text-[11px] text-slate-600 font-bold">{{ stat.hint }}</p>
      </div>
    </div>

    <!-- Pendientes por atender -->
    <div class="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8">
      <h3 class="text-white font-black text-sm uppercase tracking-tight mb-6 flex items-center gap-2"><i class="bi bi-inbox text-brand-400"></i> Pendientes por atender</h3>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="p in pendientes" :key="p.label" class="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 shrink-0" :class="p.count > 0 ? p.color : 'text-slate-600'">
            <i :class="'bi bi-' + p.icon" class="text-lg"></i>
          </div>
          <div class="min-w-0">
            <p class="text-2xl font-black leading-none" :class="p.count > 0 ? 'text-white' : 'text-slate-600'">{{ p.count }}</p>
            <p class="text-[10px] text-slate-500 font-black uppercase tracking-wider mt-1 leading-tight">{{ p.label }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  inject: ['appState', 'pb_url'],
  data() {
    return {
      summary: {
        receivable: 0, cash_held: 0, cash_collected: 0, cash_delivered: 0,
        credit_circulation: 0, revenue_guides: 0, revenue_excursions: 0,
        pending: { tickets_open: 0, bookings_new: 0, guides_to_generate: 0, payments_held: 0 }
      }
    };
  },
  computed: {
    kpis() {
      const s = this.summary;
      return [
        { label: 'Cuentas por cobrar', value: s.receivable, icon: 'hourglass-split', color: 'text-amber-400', hint: 'Saldos pendientes de reservas' },
        { label: 'Efectivo retenido', value: s.cash_held, icon: 'shop', color: 'text-blue-400', hint: 'Abonos en puntos' },
        { label: 'En ruta', value: s.cash_collected, icon: 'truck', color: 'text-purple-400', hint: 'Recolectado por choferes' },
        { label: 'Crédito en circulación', value: s.credit_circulation, icon: 'wallet2', color: 'text-pink-400', hint: 'Saldo en monederos' },
        { label: 'Ingreso guías', value: s.revenue_guides, icon: 'box-seam', color: 'text-emerald-400', hint: 'Guías de envío pagadas' },
        { label: 'Ingreso excursiones', value: s.revenue_excursions, icon: 'compass', color: 'text-brand-400', hint: 'Reservas cobradas' }
      ];
    },
    pendientes() {
      const p = this.summary.pending || {};
      return [
        { label: 'Tickets abiertos', count: Number(p.tickets_open) || 0, icon: 'life-preserver', color: 'text-amber-400' },
        { label: 'Reservas sin confirmar', count: Number(p.bookings_new) || 0, icon: 'calendar-check', color: 'text-brand-400' },
        { label: 'Guías por generar', count: Number(p.guides_to_generate) || 0, icon: 'printer', color: 'text-blue-400' },
        { label: 'Abonos retenidos', count: Number(p.payments_held) || 0, icon: 'cash-stack', color: 'text-purple-400' }
      ];
    }
  },
  mounted() { this.load(); },
  methods: {
    token() { return localStorage.getItem('ep_token'); },
    formatMoney(a) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(a) || 0); },
    computeDemoSummary() {
      const d = this.appState.demoData || {};
      const bookings = d.excursion_bookings || [];
      const payments = d.payments || [];
      const wallets = d.wallets || [];
      const guides = d.shipping_guides || [];
      const tickets = d.support_tickets || [];

      const s = {
        receivable: 0, cash_held: 0, cash_collected: 0, cash_delivered: 0,
        credit_circulation: 0, revenue_guides: 0, revenue_excursions: 0,
        pending: { tickets_open: 0, bookings_new: 0, guides_to_generate: 0, payments_held: 0 }
      };

      for (const b of bookings) {
        const bal = Number(b.balance) || 0;
        if (b.payment_status !== 'paid' && b.payment_status !== 'credit') s.receivable += bal;
        s.revenue_excursions += Number(b.amount_paid) || 0;
        if ((b.status || 'new') === 'new') s.pending.bookings_new += 1;
      }

      for (const p of payments) {
        if (p.method === 'credit') continue;
        const amt = Number(p.amount) || 0;
        const net = Number(p.net) || 0;
        if (p.status === 'held_at_point') { s.cash_held += amt; s.pending.payments_held += 1; }
        else if (p.status === 'collected') s.cash_collected += net;
        else if (p.status === 'delivered') s.cash_delivered += net;
      }

      for (const w of wallets) s.credit_circulation += Number(w.balance) || 0;

      for (const g of guides) {
        const st = g.status || 'quoted';
        if (st !== 'quoted' && st !== 'cancelled') s.revenue_guides += Number(g.price) || 0;
        if (st === 'paid') s.pending.guides_to_generate += 1;
      }

      for (const t of tickets) {
        const st = t.status || 'open';
        if (st === 'open' || st === 'in_progress' || st === 'escalated') s.pending.tickets_open += 1;
      }

      return s;
    },
    async load() {
      if (this.appState.demoMode) { this.summary = this.computeDemoSummary(); return; }
      try {
        const res = await fetch(`${this.pb_url}/api/finance/summary`, { headers: { Authorization: this.token() } });
        const data = await res.json();
        if (data && typeof data === 'object' && !data.error) {
          this.summary = Object.assign({ pending: {} }, data, { pending: Object.assign({}, this.summary.pending, data.pending || {}) });
        }
      } catch (_) { /* mantiene ceros */ }
    }
  }
}
</script>

<style scoped>
.animate-fade-in { animation: fade-in 0.4s ease; }
@keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
</style>
