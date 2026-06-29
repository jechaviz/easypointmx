<template>
  <div class="pt-32 pb-16 min-h-screen bg-slate-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <!-- Hero -->
      <div class="flex flex-col lg:flex-row items-center gap-16 mb-16">
        <div class="lg:w-1/2">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-black uppercase tracking-widest mb-6">Guías de paquetería</div>
          <h1 class="text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">Envía con <span class="text-brand-500">DHL y Estafeta</span> desde tu punto Easypoint.</h1>
          <p class="text-xl text-slate-600 mb-8 leading-relaxed">Cotiza tu envío en segundos con nuestras tarifas de convenio y compra tu guía en el punto Easypoint más cercano.</p>
          <div class="flex flex-wrap gap-3">
            <div class="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <i class="bi bi-truck text-brand-500"></i><span class="text-sm font-bold text-slate-700">Cobertura nacional</span>
            </div>
            <div class="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <i class="bi bi-shield-check text-brand-500"></i><span class="text-sm font-bold text-slate-700">Rastreo incluido</span>
            </div>
          </div>
        </div>

        <!-- Cotizador -->
        <div class="lg:w-1/2 w-full">
          <div class="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8">
            <h2 class="text-2xl font-black text-slate-900 mb-6 tracking-tight flex items-center gap-3">
              <i class="bi bi-calculator-fill text-brand-500"></i> Cotizador
            </h2>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Paquetería</label>
                <div class="grid grid-cols-2 gap-3">
                  <button type="button" @click="form.carrier = 'estafeta'" :class="form.carrier === 'estafeta' ? 'ring-2 ring-brand-500 bg-brand-50' : 'ring-1 ring-slate-200 bg-slate-50'" class="rounded-xl px-4 py-3 font-black text-sm text-slate-800 transition-all">Estafeta</button>
                  <button type="button" @click="form.carrier = 'dhl'" :class="form.carrier === 'dhl' ? 'ring-2 ring-brand-500 bg-brand-50' : 'ring-1 ring-slate-200 bg-slate-50'" class="rounded-xl px-4 py-3 font-black text-sm text-slate-800 transition-all">DHL</button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Servicio</label>
                <div class="grid grid-cols-2 gap-3">
                  <button type="button" @click="form.service = 'standard'" :class="form.service === 'standard' ? 'ring-2 ring-brand-500 bg-brand-50' : 'ring-1 ring-slate-200 bg-slate-50'" class="rounded-xl px-4 py-3 font-bold text-sm text-slate-800 transition-all">Estándar</button>
                  <button type="button" @click="form.service = 'express'" :class="form.service === 'express' ? 'ring-2 ring-brand-500 bg-brand-50' : 'ring-1 ring-slate-200 bg-slate-50'" class="rounded-xl px-4 py-3 font-bold text-sm text-slate-800 transition-all">Express</button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">CP Origen</label>
                  <input v-model="form.originCp" inputmode="numeric" maxlength="5" type="text" placeholder="06700" class="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-4 py-3 focus:ring-brand-500 outline-none transition-all">
                </div>
                <div>
                  <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">CP Destino</label>
                  <input v-model="form.destCp" inputmode="numeric" maxlength="5" type="text" placeholder="44100" class="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-4 py-3 focus:ring-brand-500 outline-none transition-all">
                </div>
              </div>

              <div>
                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Peso (kg)</label>
                <input v-model.number="form.weight" min="0.5" step="0.5" type="number" placeholder="1" class="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-4 py-3 focus:ring-brand-500 outline-none transition-all">
              </div>

              <div>
                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Dimensiones (cm)</label>
                <div class="grid grid-cols-3 gap-3">
                  <input v-model.number="form.length" min="0" type="number" placeholder="Largo" class="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-3 py-3 focus:ring-brand-500 outline-none transition-all">
                  <input v-model.number="form.width" min="0" type="number" placeholder="Ancho" class="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-3 py-3 focus:ring-brand-500 outline-none transition-all">
                  <input v-model.number="form.height" min="0" type="number" placeholder="Alto" class="w-full bg-slate-50 ring-1 ring-slate-200 rounded-xl px-3 py-3 focus:ring-brand-500 outline-none transition-all">
                </div>
                <p v-if="volWeight > 0" class="text-[10px] text-slate-500 font-medium mt-2">
                  Peso volumétrico: {{ volWeight.toFixed(1) }} kg ·
                  <span class="font-black text-slate-700">cobrable: {{ chargeableWeight.toFixed(1) }} kg</span>
                </p>
              </div>

              <!-- Resultado -->
              <div class="bg-slate-900 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest">Precio estimado</p>
                  <p class="text-white text-3xl font-black">{{ formatMoney(quote) }}</p>
                  <p class="text-[10px] text-slate-500 font-medium mt-1">{{ zoneLabel }} · {{ form.carrier.toUpperCase() }} {{ form.service === 'express' ? 'Express' : 'Estándar' }}</p>
                </div>
                <i class="bi bi-box-seam-fill text-brand-500 text-4xl"></i>
              </div>

              <a v-if="hasContact" :href="whatsappQuoteUrl" target="_blank" rel="noopener noreferrer" class="w-full bg-brand-500 text-slate-900 font-black py-4 rounded-xl hover:bg-brand-400 transition-all flex items-center justify-center gap-3">
                <i class="bi bi-whatsapp"></i> Comprar guía por WhatsApp
              </a>
              <button @click="$emit('open-modal', 'map')" :class="hasContact ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-brand-500 text-slate-900 hover:bg-brand-400'" class="w-full font-black py-3 rounded-xl transition-all text-sm">{{ hasContact ? 'Ver puntos cercanos' : 'Comprar en tu punto Easypoint' }}</button>
              <p class="text-[10px] text-slate-400 text-center font-medium">Tarifas de convenio estimadas. El precio final se confirma en el punto Easypoint.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Pasos -->
      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div class="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-slate-900 mb-6 font-black text-xl">1</div>
          <h3 class="text-xl font-bold mb-3 text-slate-900">Cotiza</h3>
          <p class="text-slate-500 text-sm">Elige paquetería, servicio y peso. Te mostramos la tarifa de convenio al instante.</p>
        </div>
        <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div class="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-slate-900 mb-6 font-black text-xl">2</div>
          <h3 class="text-xl font-bold mb-3 text-slate-900">Compra en tu punto</h3>
          <p class="text-slate-500 text-sm">Lleva tu paquete al punto Easypoint más cercano y compra tu guía DHL o Estafeta.</p>
        </div>
        <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div class="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-slate-900 mb-6 font-black text-xl">3</div>
          <h3 class="text-xl font-bold mb-3 text-slate-900">Rastrea</h3>
          <p class="text-slate-500 text-sm">Recibe tu número de guía y sigue tu envío hasta su destino.</p>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
// Tarifas de convenio (estimadas, configurables). El mismo calculo vive en
// app/components/GuidesManager.vue para la venta en punto.
function volumetricWeight(length, width, height) {
  const v = (Number(length) || 0) * (Number(width) || 0) * (Number(height) || 0);
  return v > 0 ? v / 5000 : 0; // factor estándar paquetería 5000
}
function quoteGuide({ carrier, service, weightKg, sameZone, length, width, height }) {
  const actual = Math.max(0.5, Number(weightKg) || 0.5);
  const w = Math.max(actual, volumetricWeight(length, width, height));
  const table = {
    dhl: { base: 139, perKg: 38 },
    estafeta: { base: 109, perKg: 30 }
  };
  const t = table[carrier] || table.estafeta;
  let price = t.base + Math.max(0, Math.ceil(w) - 1) * t.perKg;
  if (service === 'express') price *= 1.6;
  price *= sameZone ? 1.0 : 1.4;
  return Math.round(price);
}

const CONTACT_WA = String(window.EASYPOINT_RUNTIME_CONFIG?.contactWhatsapp || '').replace(/\D/g, '');
const HAS_CONTACT = CONTACT_WA.length >= 10;

export default {
  emits: ['open-modal', 'navigate'],
  data() {
    return {
      hasContact: HAS_CONTACT,
      form: { carrier: 'estafeta', service: 'standard', originCp: '', destCp: '', weight: 1, length: 0, width: 0, height: 0 }
    };
  },
  computed: {
    sameZone() {
      const a = String(this.form.originCp || '').slice(0, 2);
      const b = String(this.form.destCp || '').slice(0, 2);
      return Boolean(a && b && a === b);
    },
    zoneLabel() {
      if (!this.form.originCp || !this.form.destCp) return 'Tarifa nacional';
      return this.sameZone ? 'Zona local' : 'Zona nacional';
    },
    volWeight() {
      return volumetricWeight(this.form.length, this.form.width, this.form.height);
    },
    chargeableWeight() {
      return Math.max(Math.max(0.5, Number(this.form.weight) || 0.5), this.volWeight);
    },
    quote() {
      return quoteGuide({
        carrier: this.form.carrier,
        service: this.form.service,
        weightKg: this.form.weight,
        sameZone: this.sameZone,
        length: this.form.length,
        width: this.form.width,
        height: this.form.height
      });
    },
    whatsappQuoteUrl() {
      const lines = [
        'Hola Easypoint, quiero comprar una guía:',
        `Paquetería: ${this.form.carrier.toUpperCase()} (${this.form.service === 'express' ? 'Express' : 'Estándar'})`,
        `CP origen: ${this.form.originCp || '-'} | CP destino: ${this.form.destCp || '-'}`,
        `Peso: ${this.form.weight || 1} kg`,
        (this.volWeight > 0 ? `Dimensiones: ${this.form.length}x${this.form.width}x${this.form.height} cm (cobrable ${this.chargeableWeight.toFixed(1)} kg)` : ''),
        `Cotización estimada: ${this.formatMoney(this.quote)}`
      ].filter(Boolean);
      return `https://wa.me/${CONTACT_WA}?text=${encodeURIComponent(lines.join('\n'))}`;
    }
  },
  methods: {
    formatMoney(amount) {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(amount) || 0);
    }
  }
}
</script>
