<template>
  <div class="relative w-full">
    
    <!-- Hero Section -->
    <section class="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden bg-slate-900 border-b border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div class="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          
          <!-- Hero Text -->
          <div class="max-w-2xl animate-fade-in-up mt-4 lg:mt-0">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-brand-400 text-xs font-bold mb-6 backdrop-blur-sm tracking-wider">
              <span class="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
              RECOGE CUANDO TE CONVENGA
            </div>
            
            <h1 class="text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
              Tus compras online,
              <span class="block text-brand-400 mt-2">cerca de ti siempre.</span>
            </h1>
            
            <p class="text-lg text-slate-300 mb-8 leading-relaxed max-w-lg font-medium">
              Consulta puntos disponibles, rastrea tu paquete y recoge en un local autorizado cuando te quede de paso.
            </p>
            
            <div class="flex flex-col sm:flex-row gap-3 mb-8">
               <button @click="$emit('open-modal', 'map')" class="bg-brand-500 text-slate-900 px-8 py-4 rounded-xl font-bold hover:bg-brand-400 hover:shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all flex items-center justify-center gap-2 text-lg">
                 Ver puntos disponibles <i class="bi bi-geo-alt-fill"></i>
               </button>
            </div>

            <div class="flex items-center gap-4 text-sm text-slate-400">
               <i class="bi bi-shield-check text-brand-400 text-lg"></i>
               <p>La información del punto y del paquete se confirma antes de mostrar instrucciones de retiro.</p>
            </div>
          </div>

          <!-- Hero Widget / Tracking -->
          <div id="tracking" class="relative lg:h-auto flex items-center justify-center animate-fade-in-up" style="animation-delay: 0.2s;">
             <div class="w-full max-w-sm xl:max-w-md">
                <div class="glass-panel-dark rounded-[1.5rem] p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden transform hover:-translate-y-1 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50 pointer-events-none"></div>
                    
                    <div class="relative z-10">
                        <div class="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-slate-900 mb-5 shadow-lg shadow-brand-500/30">
                            <i class="bi bi-search text-xl font-bold"></i>
                        </div>
                        <h2 class="text-xl font-bold text-white mb-2">Localiza tu paquete</h2>
                        <p id="tracking-help" class="text-slate-400 text-sm mb-5">Ingresa tu ID de rastreo para saber cuándo recogerlo.</p>
                        
                        <form v-if="!trackingResult" @submit.prevent="trackPackage" class="space-y-3">
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                                    <i class="bi bi-box-seam"></i>
                                </div>
                                <input 
                                    id="tracking-input"
                                    v-model="trackingQuery"
                                    type="text" 
                                    placeholder="Ej: MXL90210" 
                                    required
                                    autocomplete="off"
                                    autocapitalize="characters"
                                    aria-describedby="tracking-help tracking-error"
                                    class="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-12 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 uppercase font-mono transition-colors text-sm"
                                >
                            </div>
                            <button :disabled="isTracking" class="w-full bg-white text-slate-900 font-bold py-3.5 rounded-xl hover:bg-slate-100 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                <i v-if="isTracking" class="bi bi-arrow-repeat animate-spin"></i>
                                {{ isTracking ? 'Buscando...' : 'Rastrear ahora' }}
                            </button>
                            <p v-if="trackingError" id="tracking-error" role="alert" class="text-red-400 text-xs mt-2 text-center">{{ trackingError }}</p>
                        </form>

                        <div v-else class="space-y-4 animate-fade-in-up">
                           <!-- Tracker Header -->
                           <div class="flex items-center justify-between border-b border-slate-700 pb-3">
                              <div>
                                <p class="text-[10px] text-brand-400 font-bold tracking-widest uppercase">ID de Envío</p>
                                <p class="text-white font-mono font-bold text-lg">{{ trackingResult.tracking_id }}</p>
                              </div>
                              <span class="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-[10px] font-bold text-slate-300">
                                {{ formatDate(trackingResult.updated) }}
                              </span>
                           </div>

                           <!-- Visual Timeline -->
                           <div class="py-2">
                             <div class="relative flex justify-between">
                               <!-- Background Line -->
                               <div class="absolute top-[14px] left-4 right-4 h-1 bg-slate-800 rounded-full -z-10"></div>
                               <!-- Active Line -->
                               <div class="absolute top-[14px] left-4 h-1 bg-brand-500 rounded-full -z-10 transition-all duration-700"
                                    :style="{ width: progressWidth }"></div>
                               
                               <!-- Steps -->
                               <div v-for="(step, idx) in timelineSteps" :key="step.key" class="flex flex-col items-center">
                                 <div class="w-8 h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black transition-colors duration-500"
                                      :class="idx <= currentStepIdx ? 'bg-brand-500 text-slate-900 shadow-[0_0_15px_rgba(163,230,53,0.4)]' : 'bg-slate-800 text-slate-500 border border-slate-700'">
                                   <i :class="'bi bi-' + step.icon"></i>
                                 </div>
                                 <p class="text-[9px] font-bold mt-2 uppercase tracking-wide text-center w-16"
                                    :class="idx <= currentStepIdx ? 'text-white' : 'text-slate-500'">
                                   {{ step.label }}
                                 </p>
                                </div>
                             </div>
                           </div>

                           <!-- Action Block (Ready for Pickup) -->
                           <div v-if="trackingResult.status === 'at_point'" class="bg-brand-500/10 border border-brand-500/30 rounded-xl p-5 text-center shadow-lg shadow-brand-500/10">
                              <h3 class="text-brand-400 font-black text-lg mb-1">¡Listo para recoger!</h3>
                              <p class="text-slate-300 text-xs mb-4">Muestra este ID al operador del local. No necesitas un código adicional.</p>
                              <div class="bg-white rounded-xl mx-auto p-4 border-4 border-brand-500/50 mb-4 text-left">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Código de retiro</p>
                                <p class="text-slate-900 font-mono font-black text-xl break-all">{{ trackingResult.tracking_id }}</p>
                                <p v-if="trackingPointName" class="text-slate-500 text-xs mt-3">
                                  {{ trackingPointName }}<span v-if="trackingPointAddress"> · {{ trackingPointAddress }}</span>
                                </p>
                              </div>
                           </div>

                           <button @click="trackingResult = null; trackingQuery = ''" class="w-full text-slate-500 font-bold py-3 text-xs hover:text-white transition-all underline decoration-slate-700 underline-offset-4">
                             Rastrear otro paquete
                           </button>
                        </div>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Capabilities -->
    <section class="py-12 border-b border-slate-200 bg-white overflow-hidden flex flex-col items-center">
      <div class="container mx-auto px-4 mb-6 text-center">
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Flujos operativos soportados por la plataforma</p>
      </div>
      <div class="w-full relative flex overflow-hidden">
         <div class="flex space-x-16 animate-marquee whitespace-nowrap items-center min-w-max px-8">
            <span class="text-2xl font-extrabold text-slate-300">Checkout</span>
            <span class="text-2xl font-bold text-slate-300">Mapa de puntos</span>
            <span class="text-2xl font-extrabold text-slate-300">Rastreo</span>
            <span class="text-2xl font-extrabold text-slate-300">Inventario</span>
            <span class="text-2xl font-bold text-slate-300">Notificaciones</span>
            <span class="text-2xl font-extrabold text-slate-300">API</span>
            <span class="text-2xl font-bold text-slate-300">Comisiones</span>
         </div>
      </div>
    </section>

    <!-- How it Works section -->
    <section class="py-24 bg-slate-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-16">
          <h2 class="text-base text-brand-600 font-bold uppercase tracking-wider mb-2">Cómo Funciona</h2>
          <h3 class="text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">El ecommerce necesita evolucionar.</h3>
          <p class="text-lg text-slate-600">Easypoint te devuelve el control: envía tus compras a un punto autorizado y pasa por ellos cuando quieras.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow flex flex-col">
            <div class="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center text-2xl font-bold mb-6">1</div>
            <h4 class="text-2xl font-bold text-slate-900 mb-3">Compra Online</h4>
            <p class="text-slate-600">Selecciona "Recoger en Easypoint" en tu tienda favorita.</p>
          </div>
          <div class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow flex flex-col">
            <div class="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center text-2xl font-bold mb-6">2</div>
            <h4 class="text-2xl font-bold text-slate-900 mb-3">Elige tu Punto</h4>
            <p class="text-slate-600">Selecciona el local que te quede de paso: farmacia, café o locker.</p>
          </div>
          <div class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-shadow flex flex-col">
            <div class="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center text-2xl font-bold mb-6">3</div>
            <h4 class="text-2xl font-bold text-slate-900 mb-3">Recoge al pasar</h4>
            <p class="text-slate-600">Te avisamos por SMS/Email cuando el paquete llegue.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Servicios Easypoint -->
    <section class="py-24 bg-white border-t border-slate-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-14">
          <h2 class="text-base text-brand-600 font-bold uppercase tracking-wider mb-2">Más servicios</h2>
          <h3 class="text-4xl font-extrabold text-slate-900 tracking-tight">Tu punto Easypoint hace más.</h3>
          <p class="text-lg text-slate-600 mt-4">Además de recibir paquetes, envía con paqueterías de convenio y reserva experiencias turísticas.</p>
        </div>
        <div class="grid md:grid-cols-2 gap-8">
          <button @click="$emit('navigate', '/guias')" class="text-left bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 hover:border-brand-500/50 hover:shadow-xl transition-all group">
            <div class="w-14 h-14 bg-brand-500 text-slate-900 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-105 transition-transform"><i class="bi bi-truck"></i></div>
            <h4 class="text-2xl font-black text-slate-900 mb-3">Guías DHL &amp; Estafeta</h4>
            <p class="text-slate-600 mb-6">Cotiza al instante con tarifas de convenio y compra tu guía en el punto más cercano.</p>
            <span class="text-brand-600 font-black text-sm inline-flex items-center gap-2">Cotizar envío <i class="bi bi-arrow-right group-hover:translate-x-1 transition-transform"></i></span>
          </button>
          <button @click="$emit('navigate', '/excursiones')" class="text-left bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 hover:border-brand-500/50 hover:shadow-xl transition-all group">
            <div class="w-14 h-14 bg-brand-500 text-slate-900 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-105 transition-transform"><i class="bi bi-compass"></i></div>
            <h4 class="text-2xl font-black text-slate-900 mb-3">Excursiones turísticas</h4>
            <p class="text-slate-600 mb-6">Reserva destinos seleccionados en línea y recibe tu confirmación por WhatsApp.</p>
            <span class="text-brand-600 font-black text-sm inline-flex items-center gap-2">Ver excursiones <i class="bi bi-arrow-right group-hover:translate-x-1 transition-transform"></i></span>
          </button>
        </div>
      </div>
    </section>

    <!-- B2B section -->
    <section class="py-32 bg-slate-900 border-t border-slate-800 relative overflow-hidden">
       <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
         <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl">
            <div class="grid lg:grid-cols-2">
               <div class="p-10 lg:p-20">
                  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-widest mb-6">Socio Comercial</div>
                  <h2 class="text-4xl lg:text-5xl font-black text-white mb-6">Haz que tu negocio <span class="text-brand-400">crezca</span>.</h2>
                  <p class="text-lg text-slate-400 mb-10">Recibe solicitudes, valida requisitos y opera paquetes con evidencia de cada movimiento.</p>
                  <button @click="$emit('open-modal', 'partner')" class="group bg-brand-500 text-slate-900 px-10 py-5 rounded-2xl font-black text-lg hover:bg-brand-400 transition-all flex items-center gap-3 shadow-xl">
                     Quiero ser Punto Easypoint <i class="bi bi-arrow-right-circle-fill group-hover:translate-x-1 transition-transform"></i>
                  </button>
               </div>
               <div class="relative min-h-[400px]">
                  <img :src="storeImageSrc" alt="Mostrador de un local preparado para recibir paquetes" class="absolute inset-0 w-full h-full object-cover">
               </div>
            </div>
         </div>
       </div>
    </section>

  </div>
</template>

<script>
const WEBSITE_BASE_SEGMENT = '/website';
const PB = window.EASYPOINT_RUNTIME_CONFIG?.pocketBaseUrl || window.location.origin;

function pbFilterString(value) {
    return `'${String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function pbUrl(path, params = {}) {
    const url = new URL(path, PB);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    }
    return url.toString();
}

function getRepoBasePath(pathname = window.location.pathname) {
    const idx = pathname.indexOf(WEBSITE_BASE_SEGMENT);
    return idx >= 0 ? pathname.slice(0, idx) : '';
}

export default {
    emits: ['open-modal', 'navigate'],
    data() {
       return {
          trackingQuery: '',
          isTracking: false,
          trackingError: '',
          trackingResult: null,
          timelineSteps: [
             { key: 'pending',    label: 'Preparando', icon: 'box-seam' },
             { key: 'in_transit', label: 'En camino',  icon: 'truck' },
             { key: 'at_point',   label: 'En Local',   icon: 'building-check' },
             { key: 'delivered',  label: 'Entregado',  icon: 'check-circle-fill' }
           ]
       }
    },
    computed: {
        storeImageSrc() {
            return `${getRepoBasePath()}/img/store-premium.png`;
        },
        currentStepIdx() {
            if (!this.trackingResult) return -1;
            return this.timelineSteps.findIndex(s => s.key === this.trackingResult.status);
        },
        progressWidth() {
            if (this.currentStepIdx < 0) return '0%';
            const p = (this.currentStepIdx / (this.timelineSteps.length - 1)) * 100;
            return `calc(${p}% - 32px)`; // padding adjustment
        },
        trackingPointName() {
            const point = this.trackingResult?.expand?.point_id;
            return point?.name || '';
        },
        trackingPointAddress() {
            const point = this.trackingResult?.expand?.point_id;
            return point?.address || '';
        }
    },
    methods: {
       formatDate(ds) {
          if(!ds) return '';
          return new Date(ds).toLocaleDateString('es-MX', { day:'2-digit', month:'short' });
       },
       async trackPackage() {
          if (!this.trackingQuery) return;
          this.isTracking = true;
          this.trackingError = '';
          this.trackingResult = null;
          try {
             const trackingId = this.trackingQuery.trim().toUpperCase();
             // shipments esta cerrada a staff; el rastreo publico usa el endpoint
             // seguro /api/track/:code que solo expone estado y punto (sin PII).
             const url = pbUrl(`/api/track/${encodeURIComponent(trackingId)}`);
             const res = await fetch(url);
             if (res.status === 404) {
                this.trackingError = 'Envío no encontrado.';
                return;
             }
             if (!res.ok) throw new Error('Tracking request failed');
             const data = await res.json();
             if (data && data.tracking_id) {
                this.trackingResult = data;
             } else {
                this.trackingError = 'Envío no encontrado.';
             }
          } catch (e) {
             this.trackingError = 'Error de conexión.';
          } finally {
             this.isTracking = false;
          }
       }
    }
}
</script>

<style scoped>
.glass-panel-dark {
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}
.animate-marquee {
  animation: marquee 30s linear infinite;
}
.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .animate-marquee,
  .animate-fade-in-up {
    animation: none;
  }
}
</style>
