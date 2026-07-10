<template>
  <div class="pt-32 pb-16 min-h-screen bg-slate-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <!-- Hero -->
      <div class="text-center max-w-3xl mx-auto mb-14">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-black uppercase tracking-widest mb-6">Red de puntos de servicio</div>
        <h1 class="text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">Un solo lugar para <span class="text-brand-500">todos tus trámites</span>.</h1>
        <p class="text-xl text-slate-600 leading-relaxed">En tu tienda de barrio afiliada a Easypoint puedes pagar servicios, enviar y recibir paquetes, recargar, contratar seguros, imprimir y mucho más — con la misma ruta diaria que ya pasa por tu colonia.</p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex justify-center py-20"><div class="w-10 h-10 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin"></div></div>

      <!-- Catálogo por categoría -->
      <div v-else class="space-y-12">
        <div v-for="grp in grouped" :key="grp.category">
          <h2 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{{ catLabel(grp.category) }}</h2>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div v-for="s in grp.items" :key="s.id" class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
              <div class="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-xl shrink-0"><i :class="'bi bi-' + (s.icon || 'grid')"></i></div>
              <div>
                <h3 class="font-black text-slate-900 text-sm mb-1">{{ s.name }}</h3>
                <p class="text-slate-500 text-xs">{{ s.description }}</p>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!services.length" class="text-center py-16 text-slate-400"><i class="bi bi-grid-3x3-gap text-5xl mb-4 opacity-30"></i><p class="font-bold">Pronto publicaremos el catálogo de servicios.</p></div>
      </div>

      <!-- CTA afiliación -->
      <div class="mt-16 bg-slate-900 rounded-[3rem] p-10 md:p-16 text-center">
        <h2 class="text-3xl md:text-4xl font-black text-white mb-4">¿Tienes una tienda, papelería o ferretería?</h2>
        <p class="text-slate-400 max-w-2xl mx-auto mb-8">Conviértela en un punto Easypoint y gana una comisión por cada servicio: pagos, paquetería, recargas, seguros, boletos, impresión y más. Nosotros ponemos la plataforma, la capacitación y la ruta diaria.</p>
        <button @click="$emit('open-modal', 'partner')" class="bg-brand-500 text-slate-900 font-black px-10 py-4 rounded-2xl text-lg hover:bg-brand-400 transition-all inline-flex items-center gap-3 shadow-xl"><i class="bi bi-shop"></i> Ser Punto Easypoint</button>
      </div>

    </div>
  </div>
</template>

<script>
const PB = window.EASYPOINT_RUNTIME_CONFIG?.pocketBaseUrl || window.location.origin;
const CATEGORIES = {
  pagos: 'Pagos de servicios', recargas: 'Recargas', seguros: 'Seguros', boletos: 'Boletos y eventos',
  impresion: 'Impresión', sim: 'Tarjetas SIM', devoluciones: 'Devoluciones e-commerce', remesas: 'Remesas',
  certificados: 'Certificados digitales', publicidad: 'Publicidad local', marketplace: 'Marketplace de insumos',
  farmacia: 'Farmacia', locker: 'Locker', reciclaje: 'Reciclaje', productos_locales: 'Productos locales',
  b2b: 'Servicios para negocios (B2B)', otros: 'Otros'
};
const DEMO_SERVICES = [
  { id: 'd1', name: 'Pago de servicios (CFE, Telmex)', category: 'pagos', description: 'Luz, agua, teléfono e internet.', icon: 'receipt' },
  { id: 'd2', name: 'Recargas telefónicas', category: 'recargas', description: 'Tiempo aire de todas las compañías.', icon: 'phone' },
  { id: 'd3', name: 'Seguros económicos', category: 'seguros', description: 'Moto, celular, mascota, accidentes.', icon: 'shield-check' },
  { id: 'd4', name: 'Boletos y turismo', category: 'boletos', description: 'Autobús, eventos y excursiones.', icon: 'ticket-perforated' },
  { id: 'd5', name: 'Impresión de documentos', category: 'impresion', description: 'Envía por WhatsApp, recibe al día siguiente.', icon: 'printer' },
  { id: 'd6', name: 'Recepción y envío de paquetes', category: 'devoluciones', description: 'Recibe, envía y devuelve e-commerce.', icon: 'box-seam' }
];

export default {
  emits: ['open-modal', 'navigate'],
  data() { return { services: [], isLoading: true }; },
  computed: {
    grouped() {
      const map = {};
      for (const s of this.services) { const c = s.category || 'otros'; (map[c] = map[c] || []).push(s); }
      return Object.keys(map).map(category => ({ category, items: map[category] }));
    }
  },
  mounted() { this.fetchServices(); },
  methods: {
    catLabel(c) { return CATEGORIES[c] || c; },
    async fetchServices() {
      this.isLoading = true;
      try {
        const res = await fetch(`${PB}/api/collections/services/records?perPage=200&filter=${encodeURIComponent('(active=true)')}&sort=category`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const items = data.items || [];
        this.services = items.length ? items : DEMO_SERVICES;
      } catch (_) { this.services = DEMO_SERVICES; }
      finally { this.isLoading = false; }
    }
  }
}
</script>
