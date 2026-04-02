<template>
  <div class="relative w-full">
    
    <!-- Hero Section -->
    <section class="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden bg-slate-900 border-b border-slate-800">
      <div class="absolute inset-0 pointer-events-none -z-10">
        <div class="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-brand-500 rounded-full mix-blend-screen filter blur-[150px] opacity-20 animate-pulse"></div>
        <div class="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full mix-blend-screen filter blur-[130px] opacity-20"></div>
        <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNCkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div class="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          
          <!-- Hero Text -->
          <div class="max-w-2xl animate-fade-in-up mt-4 lg:mt-0">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-brand-400 text-xs font-bold mb-6 backdrop-blur-sm tracking-wider">
              <span class="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
              ADIÓS A LAS ENTREGAS FALLIDAS
            </div>
            
            <h1 class="text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
              Tus compras online,
              <span class="block text-brand-400 mt-2">cerca de ti siempre.</span>
            </h1>
            
            <p class="text-lg text-slate-300 mb-8 leading-relaxed max-w-lg font-medium">
              Elige enviar tus paquetes a <strong class="text-white">+1,000 locales Easypoint</strong> y recógelos en tus propios horarios. Sin dolor de cabeza.
            </p>
            
            <div class="flex flex-col sm:flex-row gap-3 mb-8">
               <button @click="$emit('open-modal', 'map')" class="bg-brand-500 text-slate-900 px-8 py-4 rounded-xl font-bold hover:bg-brand-400 hover:shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all flex items-center justify-center gap-2 text-lg">
                 Encuentra tu Punto <i class="bi bi-geo-alt-fill"></i>
               </button>
            </div>

            <div class="flex items-center gap-4 text-sm text-slate-400">
               <div class="flex -space-x-2">
                  <div class="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-white text-xs"><i class="bi bi-person-fill"></i></div>
                  <div class="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-600 flex items-center justify-center text-white text-xs"><i class="bi bi-person-fill"></i></div>
                  <div class="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-500 flex items-center justify-center text-white text-xs"><i class="bi bi-person-fill"></i></div>
               </div>
               <p><strong>+500,000</strong> usuarios ya confían en Easypoint.</p>
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
                        <p class="text-slate-400 text-sm mb-5">Ingresa tu MXL ID para saber cuándo recogerlo.</p>
                        
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
                                    class="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-12 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 uppercase font-mono transition-colors text-sm"
                                >
                            </div>
                            <button :disabled="isTracking" class="w-full bg-white text-slate-900 font-bold py-3.5 rounded-xl hover:bg-slate-100 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                                <i v-if="isTracking" class="bi bi-arrow-repeat animate-spin"></i>
                                {{ isTracking ? 'Buscando...' : 'Rastrear ahora' }}
                            </button>
                            <p v-if="trackingError" class="text-red-400 text-xs mt-2 text-center">{{ trackingError }}</p>
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
                              <p class="text-slate-300 text-xs mb-4">Muestra este código M-ID al operador del local.</p>
                              <div class="w-32 h-32 bg-white rounded-xl mx-auto p-2 flex items-center justify-center border-4 border-brand-500/50 mb-4">
                                <!-- Fake QR block -->
                                <div class="w-full h-full bg-slate-900 grid grid-cols-4 grid-rows-4 gap-1 p-1">
                                  <div v-for="i in 16" :key="i" class="bg-white" :class="Math.random() > 0.3 ? 'opacity-100' : 'opacity-0'"></div>
                                </div>
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

    <!-- Brands Marquee -->
    <section class="py-12 border-b border-slate-200 bg-white overflow-hidden flex flex-col items-center">
      <div class="container mx-auto px-4 mb-6 text-center">
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Las mejores tiendas online confían sus paquetes a Easypoint</p>
      </div>
      <div class="w-full relative flex overflow-hidden">
         <div class="flex space-x-16 animate-marquee whitespace-nowrap items-center min-w-max px-8">
            <span class="text-3xl font-extrabold text-slate-300">ZARA</span>
            <span class="text-3xl font-bold text-slate-300 font-serif">Massimo Dutti</span>
            <span class="text-3xl font-extrabold text-slate-300 italic">GoTrendier</span>
            <span class="text-3xl font-extrabold text-slate-300">Platanomelón</span>
            <span class="text-3xl font-bold text-slate-300">OYSHO</span>
            <span class="text-3xl font-extrabold text-slate-300 tracking-tighter">LEFTIES</span>
            <span class="text-3xl font-bold text-slate-300">Prixz</span>
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

    <!-- B2B section -->
    <section class="py-32 bg-slate-900 border-t border-slate-800 relative overflow-hidden">
       <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
         <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl">
            <div class="grid lg:grid-cols-2">
               <div class="p-10 lg:p-20">
                  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-widest mb-6">Socio Comercial</div>
                  <h2 class="text-4xl lg:text-5xl font-black text-white mb-6">Haz que tu negocio <span class="text-brand-400">crezca</span>.</h2>
                  <p class="text-lg text-slate-400 mb-10">Atrae nuevos clientes a tu puerta sin invertir un solo peso en publicidad.</p>
                  <button @click="$emit('open-modal', 'partner')" class="group bg-brand-500 text-slate-900 px-10 py-5 rounded-2xl font-black text-lg hover:bg-brand-400 transition-all flex items-center gap-3 shadow-xl">
                     Quiero ser Punto Easypoint <i class="bi bi-arrow-right-circle-fill group-hover:translate-x-1 transition-transform"></i>
                  </button>
               </div>
               <div class="relative min-h-[400px]">
                  <img src="/easypoint/img/store-premium.png" class="absolute inset-0 w-full h-full object-cover">
               </div>
            </div>
         </div>
       </div>
    </section>

  </div>
</template>

<script>
export default {
    emits: ['open-modal'],
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
        currentStepIdx() {
            if (!this.trackingResult) return -1;
            return this.timelineSteps.findIndex(s => s.key === this.trackingResult.status);
        },
        progressWidth() {
            if (this.currentStepIdx < 0) return '0%';
            const p = (this.currentStepIdx / (this.timelineSteps.length - 1)) * 100;
            return `calc(${p}% - 32px)`; // padding adjustment
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
             const url = `http://127.0.0.1:8090/api/collections/shipments/records?filter=(tracking_id='${this.trackingQuery}')&expand=point_id`;
             const res = await fetch(url);
             const data = await res.json();
             if (data.items && data.items.length > 0) {
                this.trackingResult = data.items[0];
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
</style>
