<template>
  <div class="pt-28 pb-16 min-h-screen bg-slate-900 text-slate-100 font-sans">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      
      <!-- Top Title & Search Bar -->
      <div class="text-center max-w-2xl mx-auto">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-400 text-xs font-black uppercase tracking-widest mb-4 border border-brand-500/20">
          <i class="bi bi-ticket-perforated-fill"></i> Portal de Autoservicio
        </div>
        <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
          Mi Reserva & <span class="text-brand-400">Pase de Abordar</span>
        </h1>
        <p class="text-slate-400 text-sm mt-2">
          Consulta tu voucher digital, realiza abonos a tu saldo pendiente o presenta tu código QR al abordar.
        </p>

        <!-- Search Input -->
        <form @submit.prevent="searchVoucher" class="mt-6 flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
          <div class="relative flex-grow">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
              <i class="bi bi-search"></i>
            </div>
            <input
              v-model="searchInput"
              type="text"
              required
              placeholder="Ingresa tu folio (EP-BK-...) o teléfono (10 dígitos)"
              class="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
            >
          </div>
          <button
            type="submit"
            :disabled="searching || !searchInput.trim()"
            class="bg-brand-500 hover:bg-brand-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
          >
            <i v-if="searching" class="bi bi-arrow-repeat animate-spin"></i>
            <span>{{ searching ? 'Buscando...' : 'Consultar' }}</span>
          </button>
        </form>

        <p v-if="errorMessage" class="mt-3 text-red-400 text-xs font-bold bg-red-950/40 border border-red-800/50 py-2 px-4 rounded-xl inline-block">
          {{ errorMessage }}
        </p>
      </div>

      <!-- Multiple Bookings Selector (if searched by phone) -->
      <div v-if="vouchersList.length > 1" class="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
        <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Reservaciones encontradas ({{ vouchersList.length }})</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="v in vouchersList"
            :key="v.id"
            @click="activeVoucher = v"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            :class="activeVoucher?.id === v.id ? 'bg-brand-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'"
          >
            {{ v.voucher_code }} · {{ v.excursion_name }} ({{ v.excursion_date }})
          </button>
        </div>
      </div>

      <!-- DIGITAL VOUCHER / BOARDING PASS -->
      <div v-if="activeVoucher" class="bg-slate-950 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative print:border-none print:shadow-none animate-fade-in">
        
        <!-- Voucher Header / Airline Ticket Style -->
        <div class="bg-gradient-to-r from-slate-900 to-slate-800/80 p-6 sm:p-8 border-b border-slate-800 relative">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-brand-500/20">
                <i class="bi bi-compass"></i>
              </div>
              <div>
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400 block">Pase de Abordar Digital</span>
                <h2 class="text-xl sm:text-2xl font-black text-white tracking-tight">{{ activeVoucher.excursion_name }}</h2>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider" :class="paymentBadgeClass(activeVoucher.payment_status)">
                {{ paymentLabel(activeVoucher.payment_status) }}
              </span>
              <span v-if="activeVoucher.checked_in" class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <i class="bi bi-check-circle-fill"></i> Abordó
              </span>
              <span v-else class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/30">
                Confirmada
              </span>
            </div>
          </div>
        </div>

        <!-- Voucher Body Grid -->
        <div class="p-6 sm:p-8 grid md:grid-cols-3 gap-8 items-center">
          
          <!-- Column 1 & 2: Trip & Passenger Details -->
          <div class="md:col-span-2 space-y-6">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Pasajero Titular</span>
                <span class="text-sm font-black text-white block">{{ activeVoucher.customer_name }}</span>
                <span class="text-xs text-slate-400 font-mono">{{ activeVoucher.customer_phone }}</span>
              </div>
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Fecha de la Excursión</span>
                <span class="text-sm font-black text-brand-400 block">{{ formatDate(activeVoucher.excursion_date) }}</span>
                <span class="text-xs text-slate-500 font-medium">{{ activeVoucher.duration || 'Día completo' }}</span>
              </div>
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Destino</span>
                <span class="text-sm font-bold text-slate-200 block">{{ activeVoucher.destination }}</span>
              </div>
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Plazas Reservadas</span>
                <span class="text-sm font-black text-white block">{{ activeVoucher.people }} {{ activeVoucher.people === 1 ? 'persona' : 'personas' }}</span>
              </div>
            </div>

            <!-- Financial Breakdown Card -->
            <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400 font-bold uppercase tracking-wider">Total de la Experiencia</span>
                <span class="text-white font-black text-sm">{{ formatMoney(activeVoucher.total) }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-emerald-400 font-bold uppercase tracking-wider">Monto Abonado a la Fecha</span>
                <span class="text-emerald-400 font-black text-sm">{{ formatMoney(activeVoucher.amount_paid) }}</span>
              </div>
              <div class="h-px bg-slate-800"></div>
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Saldo Restante</span>
                  <span class="text-[10px] text-slate-500">Liquida antes del día de salida</span>
                </div>
                <div class="text-right">
                  <span class="text-xl sm:text-2xl font-black" :class="activeVoucher.balance > 0 ? 'text-amber-400' : 'text-emerald-400'">
                    {{ formatMoney(activeVoucher.balance) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Action Buttons: Abonar / Imprimir / Soporte -->
            <div class="flex flex-wrap gap-3 pt-2 print:hidden">
              <button
                v-if="activeVoucher.balance > 0"
                @click="showPayModal = true"
                class="bg-brand-500 hover:bg-brand-400 text-slate-950 font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-brand-500/20"
              >
                <i class="bi bi-credit-card-fill"></i>
                <span>Abonar o Liquidar Saldo Online</span>
              </button>
              <div v-else class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                <i class="bi bi-check2-circle text-base"></i>
                <span>¡Tu reservación está 100% liquidada!</span>
              </div>

              <button
                @click="printVoucher"
                class="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-3 rounded-xl text-xs transition-colors flex items-center gap-2"
              >
                <i class="bi bi-printer"></i>
                <span>Imprimir / Guardar</span>
              </button>
            </div>
          </div>

          <!-- Column 3: Digital QR Code Boarding Stamp -->
          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center relative">
            <span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Presenta al Abordar</span>
            
            <!-- SVG QR Code Representation -->
            <div class="w-44 h-44 bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center mb-3">
              <svg viewBox="0 0 100 100" class="w-full h-full">
                <!-- QR Code Pattern Simulation with crisp contrast -->
                <path d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M20,20 h10 v10 h-10 z" fill="#0f172a" />
                <path d="M60,10 h30 v30 h-30 z M65,15 v20 h20 v-20 z M70,20 h10 v10 h-10 z" fill="#0f172a" />
                <path d="M10,60 h30 v30 h-30 z M15,65 v20 h20 v-20 z M20,70 h10 v10 h-10 z" fill="#0f172a" />
                <path d="M50,15 h5 v15 h-5 z M45,35 h10 v5 h-10 z M60,50 h15 v5 h-15 z M75,60 h15 v5 h-15 z M50,60 h5 v25 h-5 z M60,70 h10 v15 h-10 z M75,80 h15 v5 h-15 z M35,45 h10 v10 h-10 z" fill="#0f172a" />
                <rect x="42" y="42" width="16" height="16" rx="4" fill="#84cc16" />
                <path d="M47,50 l3,3 l6,-6" stroke="#0f172a" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>

            <span class="text-xs font-mono font-black text-white tracking-widest">{{ activeVoucher.voucher_code }}</span>
            <p class="text-[10px] text-slate-500 mt-1">Token: {{ (activeVoucher.voucher_token || '').slice(0, 16) }}...</p>
          </div>

        </div>

        <!-- Policy Footer -->
        <div class="bg-slate-950 p-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p class="max-w-xl text-[11px] leading-relaxed">
            <strong>Garantía de Crédito EasyPoint:</strong> No hay reembolsos en efectivo; en caso de imprevisto, tus pagos se conservan como saldo a favor (crédito) para cualquier experiencia en la red.
          </p>
          <button @click="showSupport = !showSupport" class="text-slate-400 hover:text-white font-bold text-xs underline whitespace-nowrap print:hidden">
            ¿Algún problema con tu reserva?
          </button>
        </div>

        <!-- Inline Support Ticket Form -->
        <div v-if="showSupport" class="p-6 bg-slate-900 border-t border-slate-800 animate-fade-in print:hidden">
          <h4 class="text-sm font-black text-white mb-2">Canal de Soporte Privado</h4>
          <p class="text-xs text-slate-400 mb-4">Envíanos un mensaje y un supervisor atenderá tu caso directamente.</p>
          <div class="space-y-3 max-w-xl">
            <textarea v-model="supportMsg" rows="3" placeholder="Describe tu duda o situación..." class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500"></textarea>
            <button @click="sendSupportTicket" :disabled="sendingSupport || !supportMsg.trim()" class="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-5 rounded-xl text-xs uppercase tracking-wider transition-colors">
              {{ sendingSupport ? 'Enviando...' : 'Enviar Reporte' }}
            </button>
            <p v-if="supportSent" class="text-emerald-400 text-xs font-bold mt-2">¡Reporte recibido! Te contactaremos a la brevedad.</p>
          </div>
        </div>

      </div>

      <!-- MODAL DE PAGO / ABONO ONLINE -->
      <div v-if="showPayModal && activeVoucher" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-fade-in">
          <button @click="showPayModal = false" class="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors text-xl">
            <i class="bi bi-x-lg"></i>
          </button>

          <div class="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center text-2xl mb-4">
            <i class="bi bi-wallet2"></i>
          </div>

          <h3 class="text-xl font-black text-white mb-1">Abonar a Reservación</h3>
          <p class="text-xs text-slate-400 mb-5">Folio: <strong class="font-mono text-white">{{ activeVoucher.voucher_code }}</strong> · Saldo actual: <strong class="text-amber-400">{{ formatMoney(activeVoucher.balance) }}</strong></p>

          <div class="space-y-4">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Selecciona o ingresa monto a pagar</label>
              <div class="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  @click="payAmount = activeVoucher.balance"
                  class="p-3 rounded-xl border text-xs font-bold transition-all text-left"
                  :class="payAmount === activeVoucher.balance ? 'border-brand-500 bg-brand-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-300'"
                >
                  <span class="block text-[9px] uppercase tracking-wider text-brand-400 font-black">Liquidar Todo</span>
                  {{ formatMoney(activeVoucher.balance) }}
                </button>
                <button
                  type="button"
                  @click="payAmount = Math.min(activeVoucher.balance, 500)"
                  class="p-3 rounded-xl border text-xs font-bold transition-all text-left"
                  :class="payAmount === Math.min(activeVoucher.balance, 500) ? 'border-brand-500 bg-brand-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-300'"
                >
                  <span class="block text-[9px] uppercase tracking-wider text-slate-400 font-black">Abono Sugerido</span>
                  {{ formatMoney(Math.min(activeVoucher.balance, 500)) }}
                </button>
              </div>

              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 text-sm font-bold">$</span>
                <input
                  v-model.number="payAmount"
                  type="number"
                  min="1"
                  :max="activeVoucher.balance"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-xs text-white font-bold focus:outline-none focus:border-brand-500"
                >
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Método de Pago</label>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  @click="payMethod = 'card_online'"
                  class="p-3 rounded-xl border font-bold flex items-center gap-2 transition-all"
                  :class="payMethod === 'card_online' ? 'border-brand-500 bg-brand-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'"
                >
                  <i class="bi bi-credit-card text-brand-400"></i> Tarjeta Online
                </button>
                <button
                  type="button"
                  @click="payMethod = 'spei_instant'"
                  class="p-3 rounded-xl border font-bold flex items-center gap-2 transition-all"
                  :class="payMethod === 'spei_instant' ? 'border-brand-500 bg-brand-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'"
                >
                  <i class="bi bi-bank text-brand-400"></i> SPEI Inmediato
                </button>
              </div>
            </div>

            <button
              @click="submitAbono"
              :disabled="paying || !payAmount || payAmount <= 0"
              class="w-full bg-brand-500 hover:bg-brand-400 text-slate-950 font-black py-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              <i v-if="paying" class="bi bi-arrow-repeat animate-spin"></i>
              <span v-else>Pagar {{ formatMoney(payAmount) }}</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
const PB = window.EASYPOINT_RUNTIME_CONFIG?.pocketBaseUrl || window.location.origin;

export default {
  emits: ['navigate'],
  data() {
    return {
      searchInput: '',
      searching: false,
      errorMessage: '',
      vouchersList: [],
      activeVoucher: null,
      showPayModal: false,
      payAmount: 500,
      payMethod: 'card_online',
      paying: false,
      showSupport: false,
      supportMsg: '',
      sendingSupport: false,
      supportSent: false
    };
  },
  mounted() {
    // Check if URL contains query parameter `code` in search or hash
    let code = new URLSearchParams(window.location.search).get('code');
    if (!code && window.location.hash && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      code = new URLSearchParams(hashQuery).get('code');
    }
    if (code) {
      this.searchInput = code.trim();
      this.searchVoucher();
    }
  },
  methods: {
    formatMoney(val) {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(val) || 0);
    },
    formatDate(d) {
      if (!d) return '—';
      const dt = new Date(`${d}T00:00:00`);
      return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
    },
    paymentBadgeClass(status) {
      switch (status) {
        case 'paid': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        case 'partial': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
        case 'credit': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
        default: return 'bg-slate-800 text-slate-400 border border-slate-700';
      }
    },
    paymentLabel(status) {
      switch (status) {
        case 'paid': return 'Liquidado (100%)';
        case 'partial': return 'Apartado Parcial';
        case 'credit': return 'Crédito Easypoint';
        default: return 'Pendiente de Pago';
      }
    },
    async searchVoucher() {
      if (!this.searchInput.trim()) return;
      this.searching = true;
      this.errorMessage = '';
      this.vouchersList = [];
      this.activeVoucher = null;

      try {
        const isPhone = /^\d{10}$/.test(this.searchInput.replace(/\D/g, ''));
        const query = isPhone ? `phone=${encodeURIComponent(this.searchInput)}` : `code=${encodeURIComponent(this.searchInput.trim())}`;
        const res = await fetch(`${PB}/api/voucher/lookup?${query}`);
        const data = await res.json();

        if (res.ok && data.items && data.items.length) {
          this.vouchersList = data.items;
          this.activeVoucher = data.items[0];
          this.payAmount = this.activeVoucher.balance || 0;
        } else {
          this.errorMessage = data.message || 'No se encontró ninguna reservación con esos datos.';
        }
      } catch (err) {
        this.errorMessage = 'No se pudo conectar con el servidor. Revisa tu conexión.';
      } finally {
        this.searching = false;
      }
    },
    async submitAbono() {
      if (!this.activeVoucher || this.payAmount <= 0) return;
      this.paying = true;
      try {
        const res = await fetch(`${PB}/api/voucher/pay-abono`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: this.activeVoucher.voucher_code || this.activeVoucher.id,
            amount: this.payAmount,
            method: this.payMethod
          })
        });
        const data = await res.json();
        if (res.ok) {
          this.activeVoucher.amount_paid = data.amount_paid;
          this.activeVoucher.balance = data.balance;
          this.activeVoucher.payment_status = data.payment_status;
          this.activeVoucher.status = data.status;
          this.showPayModal = false;
        } else {
          alert(data.message || 'No se pudo procesar el pago.');
        }
      } catch (err) {
        alert('Error al procesar: ' + err.message);
      } finally {
        this.paying = false;
      }
    },
    async sendSupportTicket() {
      if (!this.supportMsg.trim() || !this.activeVoucher) return;
      this.sendingSupport = true;
      try {
        await fetch(`${PB}/api/collections/support_tickets/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'complaint',
            subject_ref: this.activeVoucher.id,
            customer_name: this.activeVoucher.customer_name,
            customer_phone: this.activeVoucher.customer_phone,
            message: this.supportMsg.trim(),
            status: 'open'
          })
        });
        this.supportSent = true;
        this.supportMsg = '';
      } catch (_) {}
      this.sendingSupport = false;
    },
    printVoucher() {
      window.print();
    }
  }
};
</script>

<style scoped>
@media print {
  body { background: white !important; color: black !important; }
}
</style>
