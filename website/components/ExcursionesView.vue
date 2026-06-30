<template>
  <div class="pt-32 pb-16 min-h-screen bg-slate-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <!-- Hero -->
      <div class="text-center max-w-3xl mx-auto mb-14">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-black uppercase tracking-widest mb-6">Excursiones turísticas</div>
        <h1 class="text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">Reserva tu próxima <span class="text-brand-500">aventura</span>.</h1>
        <p class="text-xl text-slate-600 leading-relaxed">Destinos seleccionados con proveedores aliados. Reserva en línea y recibe tu confirmación por WhatsApp.</p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>

      <!-- Catálogo -->
      <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="exc in excursions" :key="exc.id" class="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm flex flex-col group hover:shadow-xl transition-all">
          <div class="h-48 bg-slate-200 relative overflow-hidden">
            <img v-if="exc.image_url" :src="exc.image_url" :alt="exc.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-slate-900"><i class="bi bi-compass text-5xl"></i></div>
            <div class="absolute top-4 left-4 bg-slate-900/80 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5"><i class="bi bi-geo-alt-fill text-brand-400"></i> {{ exc.destination }}</div>
          </div>
          <div class="p-6 flex flex-col flex-grow">
            <h3 class="text-lg font-black text-slate-900 mb-2 tracking-tight">{{ exc.name }}</h3>
            <p class="text-slate-500 text-sm mb-4 flex-grow">{{ exc.description }}</p>
            <div class="flex items-center justify-between mb-3 text-xs">
              <span class="text-slate-400 font-bold flex items-center gap-1.5"><i class="bi bi-clock"></i> {{ exc.duration || 'Consultar' }}</span>
              <span class="text-slate-900 font-black text-lg">{{ formatMoney(exc.price) }}<span class="text-[10px] text-slate-400 font-bold"> /persona</span></span>
            </div>
            <div v-if="datesOf(exc).length" class="mb-4 flex flex-wrap gap-1.5">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest w-full">Próximas salidas</span>
              <span v-for="d in datesOf(exc).slice(0, 3)" :key="d" class="bg-brand-50 text-brand-700 text-[10px] font-bold px-2 py-1 rounded-lg">{{ formatDateLong(d) }}</span>
              <span v-if="datesOf(exc).length > 3" class="text-[10px] text-slate-400 font-bold px-1 py-1">+{{ datesOf(exc).length - 3 }}</span>
            </div>
            <button @click="openBooking(exc)" class="w-full bg-slate-900 text-white font-black py-3 rounded-xl hover:bg-brand-500 hover:text-slate-900 transition-all text-sm">Reservar</button>
          </div>
        </div>

        <div v-if="!excursions.length" class="col-span-full text-center py-20 text-slate-400">
          <i class="bi bi-compass text-5xl mb-4 opacity-30"></i>
          <p class="font-bold">Aún no hay excursiones publicadas.</p>
        </div>
      </div>
    </div>

    <!-- Modal de reservación -->
    <div v-if="selected" class="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4">
      <div class="absolute inset-0 bg-slate-900/90 backdrop-blur-md cursor-pointer" @click="closeBooking"></div>
      <div role="dialog" aria-modal="true" class="relative bg-white w-full h-full md:h-auto md:max-w-lg md:rounded-[2.5rem] shadow-2xl overflow-y-auto p-8 md:p-10 animate-fade-in-up">
        <button @click="closeBooking" aria-label="Cerrar" class="absolute top-6 right-6 w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all"><i class="bi bi-x-lg"></i></button>

        <template v-if="!success">
          <div class="mb-6">
            <div class="inline-flex items-center gap-2 text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2"><i class="bi bi-geo-alt-fill"></i> {{ selected.destination }}</div>
            <h2 class="text-2xl font-black text-slate-900 tracking-tight">{{ selected.name }}</h2>
            <p class="text-slate-500 text-sm mt-1">{{ formatMoney(selected.price) }} por persona · {{ selected.duration || 'Duración a confirmar' }}</p>
          </div>

          <p v-if="formError" role="alert" class="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ formError }}</p>

          <form @submit.prevent="submitBooking" class="space-y-4">
            <div>
              <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nombre completo</label>
              <input v-model="form.customer_name" required type="text" autocomplete="name" placeholder="Tu nombre" class="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-4 py-3 focus:ring-brand-500 outline-none transition-all">
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">WhatsApp</label>
                <input v-model="form.customer_phone" required type="tel" autocomplete="tel" placeholder="55..." class="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-4 py-3 focus:ring-brand-500 outline-none transition-all">
              </div>
              <div>
                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Personas</label>
                <input v-model.number="form.people" min="1" type="number" class="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-4 py-3 focus:ring-brand-500 outline-none transition-all">
              </div>
            </div>
            <div>
              <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Correo (opcional)</label>
              <input v-model="form.customer_email" type="email" autocomplete="email" placeholder="tu@correo.com" class="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-4 py-3 focus:ring-brand-500 outline-none transition-all">
            </div>
            <div>
              <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Fecha de la excursión</label>
              <!-- Si el proveedor publicó fechas, el cliente elige una de ellas -->
              <div v-if="selectedDates.length" class="flex flex-wrap gap-2">
                <button
                  v-for="d in selectedDates" :key="d"
                  type="button"
                  :disabled="isSoldOut(d)"
                  @click="form.excursion_date = d"
                  :class="[
                    form.excursion_date === d ? 'bg-brand-500 text-slate-900 ring-2 ring-brand-500' : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:ring-brand-400',
                    isSoldOut(d) ? 'opacity-40 cursor-not-allowed line-through' : ''
                  ]"
                  class="px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                >
                  {{ formatDateLong(d) }}
                  <span v-if="isSoldOut(d)" class="text-[10px] font-black"> · Agotado</span>
                  <span v-else-if="remainingFor(d) != null" class="text-[10px] opacity-70"> · {{ remainingFor(d) }} lug.</span>
                </button>
              </div>
              <!-- Sin fechas publicadas: fecha libre (compatibilidad) -->
              <input v-else v-model="form.excursion_date" required type="date" :min="todayStr" class="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-4 py-3 focus:ring-brand-500 outline-none transition-all">
            </div>

            <div class="bg-slate-900 rounded-2xl p-5">
              <div class="flex items-center justify-between">
                <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total estimado</span>
                <span class="text-white text-2xl font-black">{{ formatMoney(total) }}</span>
              </div>
              <div v-if="depositAmount > 0" class="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                <span class="text-[10px] text-brand-400 font-black uppercase tracking-widest">Aparta con</span>
                <span class="text-brand-400 text-lg font-black">{{ formatMoney(depositAmount) }}</span>
              </div>
            </div>

            <label class="flex items-start gap-3 text-xs text-slate-600">
              <input v-model="acceptedPolicy" type="checkbox" class="mt-0.5 w-4 h-4 shrink-0">
              <span>{{ policyText }}</span>
            </label>

            <button :disabled="isSubmitting || !acceptedPolicy" class="w-full bg-brand-500 text-slate-900 font-black py-4 rounded-xl hover:bg-brand-400 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              <i v-if="isSubmitting" class="bi bi-arrow-repeat animate-spin"></i>
              {{ isSubmitting ? 'Enviando...' : (depositAmount > 0 ? 'Apartar y reservar' : 'Confirmar reserva') }}
            </button>
          </form>
        </template>

        <!-- Éxito + confirmación WhatsApp -->
        <div v-else class="text-center py-6">
          <div class="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"><i class="bi bi-check-lg"></i></div>
          <h3 class="text-2xl font-black text-slate-900 mb-2 tracking-tight">¡Reserva recibida!</h3>
          <p class="text-slate-500 mb-4">Tu lugar para <strong>{{ selected.name }}</strong> el <strong>{{ form.excursion_date }}</strong> quedó registrado. Confirma por WhatsApp para asegurar tu cupo.</p>
          <div v-if="lastBookingId" class="mb-6 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
            <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest">Código de reserva</p>
            <p class="text-slate-900 font-mono font-black text-lg">{{ lastBookingId }}</p>
            <p class="text-[11px] text-slate-500 mt-1">Muéstralo en tu punto Easypoint para abonar en efectivo.</p>
          </div>

          <div class="space-y-3">
            <button @click="payNow" :disabled="paying" class="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              <i v-if="paying" class="bi bi-arrow-repeat animate-spin"></i><i v-else class="bi bi-credit-card"></i>
              {{ paying ? 'Abriendo pago...' : (depositAmount > 0 ? ('Apartar ' + formatMoney(depositAmount)) : 'Pagar en línea') }}
            </button>
            <a v-if="canConfirmWa" :href="confirmWaUrl" target="_blank" rel="noopener noreferrer" class="w-full bg-brand-500 text-slate-900 font-black py-4 rounded-xl hover:bg-brand-400 transition-all flex items-center justify-center gap-3"><i class="bi bi-whatsapp"></i> Confirmar mi reserva</a>
            <a v-if="providerWa && hasContact" :href="waProviderUrl" target="_blank" rel="noopener noreferrer" class="w-full bg-slate-100 text-slate-700 font-black py-3 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm"><i class="bi bi-person-badge"></i> Escribir al proveedor</a>
          </div>
          <div v-if="manualPay" class="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left">
            <p class="text-xs font-black text-slate-700 uppercase tracking-widest mb-1">Pago</p>
            <p class="text-sm text-slate-600">{{ manualPay.instructions }}</p>
            <p v-if="manualPay.reference" class="text-[11px] text-slate-400 font-mono mt-2">Ref: {{ manualPay.reference }}</p>
          </div>
          <div class="mt-5 border-t border-slate-100 pt-4 text-left">
            <button v-if="!showReport && !reportSent" @click="showReport = true" class="text-[11px] text-slate-400 font-bold hover:text-slate-600">¿Algún problema con tu experiencia?</button>
            <div v-if="showReport && !reportSent" class="space-y-2">
              <textarea v-model="reportMsg" rows="2" placeholder="Cuéntanos qué pasó y lo resolvemos en privado..." class="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-brand-500 outline-none"></textarea>
              <button @click="sendReport" :disabled="reporting" class="w-full bg-slate-900 text-white font-black py-2.5 rounded-xl text-sm hover:bg-slate-800 disabled:opacity-50">{{ reporting ? 'Enviando...' : 'Enviar a Easypoint' }}</button>
            </div>
            <p v-if="reportSent" class="text-green-600 text-xs font-bold flex items-center gap-2"><i class="bi bi-check-circle-fill"></i> Recibido. Te contactaremos para resolverlo.</p>
          </div>
          <button @click="closeBooking" class="mt-6 text-slate-400 font-bold text-sm hover:text-slate-600">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const PB = window.EASYPOINT_RUNTIME_CONFIG?.pocketBaseUrl || window.location.origin;
const CONTACT_WA = String(window.EASYPOINT_RUNTIME_CONFIG?.contactWhatsapp || '').replace(/\D/g, '');
const HAS_CONTACT = CONTACT_WA.length >= 10;

const DEMO_EXCURSIONS = [
  { id: 'ex_demo1', name: 'Teotihuacán en globo', destination: 'Estado de México', description: 'Vuelo en globo al amanecer sobre las pirámides + desayuno en cueva.', price: 2850, duration: 'Día completo', provider_name: 'SkyMex Tours', provider_whatsapp: '5215511112222', image_url: 'https://images.unsplash.com/photo-1507272931001-fc06c17e4f43?auto=format&fit=crop&q=80&w=800', available_dates: '2026-07-12\n2026-07-19\n2026-08-02\n2026-08-16' },
  { id: 'ex_demo2', name: 'Xochimilco cultural', destination: 'CDMX', description: 'Trajinera privada, comida tradicional y música en vivo.', price: 750, duration: '5 horas', provider_name: 'Raíces MX', provider_whatsapp: '5215533334444', image_url: 'https://images.unsplash.com/photo-1597211833712-5e41faa202ea?auto=format&fit=crop&q=80&w=800', available_dates: '2026-07-05\n2026-07-12\n2026-07-26' },
  { id: 'ex_demo3', name: 'Grutas de Tolantongo', destination: 'Hidalgo', description: 'Pozas termales, río turquesa y tirolesa. Transporte redondo incluido.', price: 1290, duration: 'Día completo', provider_name: 'Aventura Hidalgo', provider_whatsapp: '5215555556666', image_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&q=80&w=800', available_dates: '2026-07-20\n2026-08-10' }
];

export default {
  emits: ['open-modal', 'navigate'],
  data() {
    return {
      excursions: [],
      isLoading: true,
      selected: null,
      availability: {},
      form: { customer_name: '', customer_phone: '', customer_email: '', people: 1, excursion_date: '' },
      isSubmitting: false,
      success: false,
      formError: '',
      lastBookingId: '',
      paying: false,
      manualPay: null,
      acceptedPolicy: false,
      showReport: false,
      reportMsg: '',
      reportSent: false,
      reporting: false
    };
  },
  computed: {
    todayStr() {
      return new Date().toISOString().slice(0, 10);
    },
    selectedDates() {
      return this.datesOf(this.selected);
    },
    depositAmount() {
      return Number(this.selected?.deposit_amount) || 0;
    },
    policyText() {
      return this.selected?.policy || 'Acepto que no hay reembolsos ni cancelaciones; mi pago aplica como crédito para otra experiencia Easypoint.';
    },
    total() {
      return (Number(this.form.people) || 1) * (Number(this.selected?.price) || 0);
    },
    providerWa() {
      return String(this.selected?.provider_whatsapp || '').replace(/\D/g, '');
    },
    bookingLines() {
      return [
        `Reserva Easypoint: ${this.selected?.name || ''}`,
        `Destino: ${this.selected?.destination || ''}`,
        `Nombre: ${this.form.customer_name}`,
        `Tel: ${this.form.customer_phone}`,
        `Personas: ${this.form.people}`,
        `Fecha excursión: ${this.form.excursion_date}`,
        `Total estimado: ${this.formatMoney(this.total)}`
      ];
    },
    waUserUrl() {
      return `https://wa.me/${CONTACT_WA}?text=${encodeURIComponent(this.bookingLines.join('\n'))}`;
    },
    waProviderUrl() {
      return `https://wa.me/${this.providerWa}?text=${encodeURIComponent(this.bookingLines.join('\n'))}`;
    },
    hasContact() { return HAS_CONTACT; },
    canConfirmWa() { return HAS_CONTACT || Boolean(this.providerWa); },
    confirmWaUrl() { return HAS_CONTACT ? this.waUserUrl : this.waProviderUrl; }
  },
  mounted() {
    this.fetchExcursions();
  },
  methods: {
    formatMoney(amount) {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(amount) || 0);
    },
    datesOf(exc) {
      const today = this.todayStr;
      return String(exc?.available_dates || '')
        .split(/[\n,;]+/)
        .map(s => s.trim())
        .filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s) && s >= today)
        .sort();
    },
    formatDateLong(d) {
      const dt = new Date(`${d}T00:00:00`);
      return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' });
    },
    async fetchExcursions() {
      this.isLoading = true;
      try {
        const res = await fetch(`${PB}/api/collections/excursions/records?perPage=100&filter=${encodeURIComponent('(active=true)')}`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const items = (data.items || []).map(it => ({ ...it }));
        this.excursions = items.length ? items : DEMO_EXCURSIONS;
      } catch (_) {
        this.excursions = DEMO_EXCURSIONS;
      } finally {
        this.isLoading = false;
      }
    },
    remainingFor(d) {
      const a = this.availability[d];
      return a && a.remaining != null ? a.remaining : null;
    },
    isSoldOut(d) {
      const a = this.availability[d];
      return Boolean(a && a.soldOut);
    },
    async openBooking(exc) {
      this.selected = exc;
      this.success = false;
      this.formError = '';
      this.form = { customer_name: '', customer_phone: '', customer_email: '', people: 1, excursion_date: '' };
      this.acceptedPolicy = false;
      this.showReport = false; this.reportSent = false; this.reportMsg = '';
      this.availability = {};
      // Disponibilidad por fecha (cupos), sin exponer reservas. Las demo no tienen id real.
      if (exc && exc.id && !String(exc.id).startsWith('ex_demo')) {
        try {
          const res = await fetch(`${PB}/api/excursion-availability/${encodeURIComponent(exc.id)}`);
          if (res.ok) {
            const data = await res.json();
            const map = {};
            (data.dates || []).forEach((x) => { map[x.date] = { remaining: x.remaining, soldOut: x.soldOut }; });
            this.availability = map;
          }
        } catch (_) {}
      }
    },
    closeBooking() {
      this.selected = null;
      this.success = false;
      this.manualPay = null;
      this.lastBookingId = '';
    },
    async sendReport() {
      if (!this.reportMsg.trim()) return;
      this.reporting = true;
      try {
        await fetch(`${PB}/api/collections/support_tickets/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'complaint', subject_ref: this.lastBookingId,
            customer_name: this.form.customer_name, customer_phone: this.form.customer_phone,
            customer_email: this.form.customer_email, message: this.reportMsg.trim(), status: 'open'
          })
        });
      } catch (_) {}
      this.reportSent = true;
      this.showReport = false;
      this.reporting = false;
    },
    async payNow() {
      if (!this.lastBookingId) { this.manualPay = { instructions: 'Confirma tu reserva por WhatsApp para coordinar el pago.' }; return; }
      this.paying = true;
      try {
        const res = await fetch(`${PB}/api/pay/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection: 'excursion_bookings', id: this.lastBookingId })
        });
        const data = await res.json();
        if (data && data.url) {
          window.location.href = data.url; // redirige a la pasarela
        } else {
          this.manualPay = data || { instructions: 'Pago manual disponible en tu punto.' };
        }
      } catch (_) {
        this.manualPay = { instructions: 'No pudimos iniciar el pago en línea. Confirma por WhatsApp.' };
      } finally {
        this.paying = false;
      }
    },
    async submitBooking() {
      if (!this.form.customer_name || !this.form.customer_phone || !this.form.excursion_date) {
        this.formError = 'Completa nombre, WhatsApp y fecha.';
        return;
      }
      if (this.isSoldOut(this.form.excursion_date)) {
        this.formError = 'Esa fecha está agotada, elige otra.';
        return;
      }
      this.isSubmitting = true;
      this.formError = '';
      const payload = {
        excursion_ref: this.selected.id,
        excursion_name: this.selected.name,
        destination: this.selected.destination,
        customer_name: this.form.customer_name,
        customer_phone: this.form.customer_phone,
        customer_email: this.form.customer_email,
        people: Number(this.form.people) || 1,
        excursion_date: this.form.excursion_date,
        total: this.total,
        status: 'new'
      };
      try {
        const res = await fetch(`${PB}/api/collections/excursion_bookings/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          try { const created = await res.json(); this.lastBookingId = created && created.id ? created.id : ''; } catch (_) {}
          this.success = true;
        } else if (res.status >= 500 || res.status === 404 || res.status === 0) {
          // Backend no disponible (sitio demo): no bloquear, confirmar por WhatsApp.
          this.success = true;
        } else {
          // Rechazo de validacion (p.ej. fecha agotada): mostrar el motivo.
          let msg = 'No pudimos registrar la reserva.';
          try { const b = await res.json(); if (b && b.message) msg = b.message; } catch (_) {}
          this.formError = msg;
        }
      } catch (e) {
        // Fallback: si es error de red, igual permitimos confirmar por WhatsApp.
        if (/failed to fetch|networkerror|load failed/i.test(e.message || '')) {
          this.success = true;
        } else {
          this.formError = 'No pudimos registrar la reserva. Intenta por WhatsApp.';
        }
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
</script>

<style scoped>
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
</style>
