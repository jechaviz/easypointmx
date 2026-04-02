<template>
  <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 overflow-y-auto">
    <!-- Main Modal -->
    <div class="bg-slate-900/90 border border-slate-700/50 rounded-[3rem] w-full max-w-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden relative animate-scale-in">
      
      <!-- Decorative Background Glow -->
      <div class="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/10 blur-[100px] rounded-full"></div>
      <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full"></div>

      <!-- Header / Progress -->
      <div class="p-10 pb-0 relative">
        <button @click="$emit('close')" class="absolute top-8 right-8 w-10 h-10 rounded-full bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all z-10 border border-slate-700/30">
          <i class="bi bi-x-lg text-lg"></i>
        </button>
        <div class="flex items-center justify-between mb-8">
           <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-slate-900 font-black">E</div>
              <span class="text-white font-black tracking-tight text-sm uppercase">Configuración de Red</span>
           </div>
           <div class="flex gap-1.5 pr-12">
              <div v-for="i in 4" :key="i" class="w-8 h-1 rounded-full transition-all duration-500"
                :class="i < step ? 'bg-brand-500' : i === step ? 'bg-slate-500' : 'bg-slate-800'"></div>
           </div>
        </div>
      </div>

      <div class="p-10 pt-4 relative">
        <!-- Step 1: Welcome -->
        <div v-if="step === 1" class="text-center py-6 animate-fade-in">
          <div class="relative inline-block mb-10">
            <div class="w-24 h-24 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-[2rem] flex items-center justify-center text-slate-950 text-4xl shadow-2xl shadow-brand-500/40 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
              <i class="bi bi-rocket-takeoff-fill"></i>
            </div>
            <div class="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-800 rounded-full border-4 border-slate-900 flex items-center justify-center text-brand-400 text-sm">
               <i class="bi bi-stars"></i>
            </div>
          </div>
          <h1 class="text-4xl font-black text-white mb-4 tracking-tight">Potencia tu Logística</h1>
          <p class="text-slate-400 text-lg mb-12 max-w-sm mx-auto leading-relaxed">Estás a pocos pasos de activar una red de puntos de entrega premium.</p>
          <button @click="step++" class="w-full sm:w-auto bg-brand-500 text-slate-900 font-black px-16 py-5 rounded-[1.5rem] hover:bg-brand-400 transition-all shadow-xl shadow-brand-500/20 active:scale-95 text-lg">
            Empezar <i class="bi bi-chevron-right ml-2 font-black"></i>
          </button>
        </div>

        <!-- Step 2: Identity -->
        <div v-if="step === 2" class="animate-fade-in py-4">
          <div class="mb-10 text-center sm:text-left">
            <h2 class="text-2xl font-black text-white mb-2">Nombre de la Red</h2>
            <p class="text-slate-500 text-sm">Define cómo aparecerá tu marca en el panel de control.</p>
          </div>
          
          <div class="space-y-8">
            <div class="group">
              <label class="label-sm group-focus-within:text-brand-400 transition-colors">Nombre de tu App</label>
              <div class="relative">
                <i class="bi bi-building-gear absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 text-xl group-focus-within:text-brand-400 transition-colors"></i>
                <input v-model="form.appName" class="input-premium pl-14" placeholder="Ej: Easypoint Monterrey">
              </div>
            </div>

            <div class="bg-slate-800/20 p-6 rounded-3xl border border-slate-800 flex items-center gap-5 group hover:border-slate-700 transition-all cursor-not-allowed">
               <div class="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-700 text-2xl border border-slate-700/50 shadow-inner group-hover:scale-105 transition-transform"><i class="bi bi-patch-check"></i></div>
               <div>
                  <p class="text-white font-black text-sm mb-1 uppercase tracking-tight">Branding Corporativo</p>
                  <p class="text-slate-500 text-xs leading-tight">El logo y paleta de colores se aplicarán automáticamente a todos los sub-sitios.</p>
               </div>
            </div>
          </div>

          <div class="flex gap-4 mt-16">
            <button @click="step--" class="flex-1 bg-slate-800 text-slate-400 font-black py-5 rounded-[1.5rem] hover:bg-slate-700 transition-all">Atrás</button>
            <button @click="step++" class="flex-[2] bg-brand-500 text-slate-900 font-black py-5 rounded-[1.5rem] hover:bg-brand-400 transition-all shadow-lg shadow-brand-500/10">Continuar</button>
          </div>
        </div>

        <!-- Step 3: Team -->
        <div v-if="step === 3" class="animate-fade-in py-4">
          <div class="mb-10 text-center sm:text-left">
            <h2 class="text-2xl font-black text-white mb-2">Equipo de Operación</h2>
            <p class="text-slate-500 text-sm">Crea el primer usuario con rol de Operador de Punto.</p>
          </div>

          <div class="space-y-6">
            <div class="group">
              <label class="label-sm group-focus-within:text-brand-400 transition-colors">Correo del Operador</label>
              <div class="relative">
                <i class="bi bi-envelope-at absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 text-xl group-focus-within:text-brand-400 transition-colors"></i>
                <input v-model="form.userEmail" type="email" class="input-premium pl-14" placeholder="admin@mi-punto.mx">
              </div>
            </div>
            
            <div class="group">
              <label class="label-sm group-focus-within:text-brand-400 transition-colors">Contraseña Segura</label>
              <div class="relative">
                <i class="bi bi-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 text-xl group-focus-within:text-brand-400 transition-colors"></i>
                <input v-model="form.userPass" type="password" class="input-premium pl-14" placeholder="••••••••">
              </div>
            </div>

            <div class="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-4 text-blue-300 text-[11px] leading-relaxed">
               <i class="bi bi-info-circle-fill text-blue-400 text-base"></i>
               <p>Esta cuenta tendrá permisos para escanear QR, registrar llegadas de transportistas y confirmar entregas al cliente final.</p>
            </div>
          </div>

          <div class="flex gap-4 mt-12">
            <button @click="step--" class="flex-1 bg-slate-800 text-slate-400 font-black py-5 rounded-[1.5rem] hover:bg-slate-700 transition-all">Atrás</button>
            <button @click="step++" class="flex-[2] bg-brand-500 text-slate-900 font-black py-5 rounded-[1.5rem] hover:bg-brand-400 transition-all">Siguiente</button>
          </div>
        </div>

        <!-- Step 4: First Point -->
        <div v-if="step === 4" class="animate-fade-in py-4">
          <div class="mb-10 text-center sm:text-left">
            <h2 class="text-2xl font-black text-white mb-2">Activar Primer Local</h2>
            <p class="text-slate-500 text-sm">Registra la ubicación física donde se recibirán los paquetes.</p>
          </div>

          <div class="space-y-6">
            <div class="group">
              <label class="label-sm group-focus-within:text-brand-400 transition-colors">Nombre del Local</label>
              <div class="relative">
                <i class="bi bi-shop-window absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 text-xl group-focus-within:text-brand-400 transition-colors"></i>
                <input v-model="form.pointName" class="input-premium pl-14" placeholder="Ej: Hub Logístico San Pedro">
              </div>
            </div>
            
            <div class="group">
              <label class="label-sm group-focus-within:text-brand-400 transition-colors">Dirección de Operación</label>
              <div class="relative">
                <AddressInput v-model="form.pointAddress" placeholder="Busca la ubicación del punto..." />
              </div>
            </div>
          </div>

          <div class="flex gap-4 mt-12">
            <button @click="step--" class="flex-1 bg-slate-800 text-slate-400 font-black py-5 rounded-[1.5rem] hover:bg-slate-700 transition-all">Atrás</button>
            <button @click="finish" class="flex-[2] bg-brand-500 text-slate-900 font-black py-5 rounded-[1.5rem] hover:bg-brand-400 transition-all disabled:opacity-50" :disabled="loading">
              <span v-if="loading"><i class="bi bi-arrow-repeat animate-spin mr-2"></i> Procesando...</span>
              <span v-else>Completar Configuración <i class="bi bi-check-lg ml-1 font-black"></i></span>
            </button>
          </div>
        </div>

        <!-- Step 5: Success -->
        <div v-if="step === 5" class="text-center py-10 animate-fade-in">
           <div class="relative inline-block mb-10">
              <div class="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center text-green-400 text-5xl shadow-inner animate-bounce-slow">
                <i class="bi bi-check-all"></i>
              </div>
           </div>
          <h2 class="text-3xl font-black text-white mb-4 tracking-tight">¡Activación Exitosa!</h2>
          <p class="text-slate-400 text-lg mb-12 max-w-sm mx-auto leading-relaxed">Tu red Easypoint está lista para operar. El servidor se ha sincronizado correctamente.</p>
          <button @click="$emit('close')" class="w-full bg-brand-500 text-slate-900 font-black px-16 py-5 rounded-[1.5rem] hover:bg-brand-400 shadow-xl shadow-brand-500/20 active:scale-95 text-lg">
            Finalizar Asistente
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
const { loadModule } = window['vue3-sfc-loader'];
export default {
  inject: ['showModal'],
  components: {
    AddressInput: Vue.defineAsyncComponent(() => loadModule('./components/AddressInput.vue', options))
  },
  data() {
    return {
      step: 1,
      loading: false,
      form: {
        appName: 'Easypoint Mx',
        userEmail: '',
        userPass: '',
        pointName: '',
        pointAddress: ''
      }
    }
  },
  methods: {
    async finish() {
      if (!this.form.userEmail || !this.form.pointName) {
        return this.showModal({ title: 'Campos Incompletos', message: 'Favor de completar el correo del operador y el nombre del local.', type: 'warning' });
      }
      this.loading = true;
      try {
        this.$emit('finish', this.form);
        // Artificial delay for premium feel
        await new Promise(r => setTimeout(r, 1500));
        this.step = 5;
      } catch (e) {
        this.showModal({ title: 'Error de Configuración', message: e.message, type: 'error' });
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>

<style scoped>
.label-sm { 
  display: block;
  font-size: 10px;
  font-weight: 900;
  color: #64748b; /* slate-500 */
  text-transform: uppercase;
  letter-spacing: 0.2em;
  margin-bottom: 0.75rem;
  margin-left: 0.5rem;
}

.input-premium { 
  width: 100%;
  background-color: rgba(2, 6, 23, 0.6) !important; /* slate-950/60 */
  border: 1px solid rgba(30, 41, 59, 0.8) !important; /* slate-800 */
  color: white !important;
  border-radius: 1.2rem;
  padding: 1rem 1.25rem 1rem 3.5rem !important; /* top, right, bottom, left (3.5rem = pl-14) */
  font-size: 0.875rem;
  outline: none;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
  appearance: none;
}

.input-premium:focus {
  border-color: rgba(245, 158, 11, 0.5) !important; /* brand-500/50 */
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1) !important;
  background-color: rgba(2, 6, 23, 0.8) !important;
}

.input-premium::placeholder {
  color: #334155; /* slate-700 */
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-scale-in { animation: scale-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.animate-bounce-slow { animation: bounce-slow 3s infinite ease-in-out; }
</style>

