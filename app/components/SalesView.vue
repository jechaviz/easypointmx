<template>
  <div class="min-h-screen bg-slate-950 flex font-sans selection:bg-brand-500/30">
    <!-- Sidebar (Shared Premium Design) -->
    <aside class="w-72 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col sticky top-0 h-screen z-50">
      <div class="p-8">
        <div class="flex items-center gap-3 mb-10 group overflow-hidden">
           <div class="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform">
              <i class="bi bi-rocket-takeoff-fill text-slate-900 text-xl"></i>
           </div>
           <div>
              <h1 class="text-white font-black text-lg tracking-tighter leading-none">Sales<span class="text-brand-500">Hub</span></h1>
              <p class="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Acquisition Pro</p>
           </div>
        </div>

        <nav class="space-y-1">
          <button v-for="n in nav" :key="n.id" @click="section = n.id" 
            class="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group relative overflow-hidden"
            :class="section === n.id ? 'bg-brand-500 text-slate-900 shadow-lg shadow-brand-500/10' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'">
            <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" v-if="section === n.id"></div>
            <i :class="'bi bi-' + n.icon" class="text-xl"></i>
            <span class="text-xs font-black uppercase tracking-widest">{{ n.label }}</span>
            <div v-if="n.badge" class="ml-auto bg-slate-900 text-brand-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-700">{{ n.badge }}</div>
          </button>
        </nav>
      </div>

      <!-- User Profile (Bottom) -->
      <div class="mt-auto p-6 border-t border-slate-800">
         <div class="bg-slate-950/50 rounded-[2rem] p-4 border border-slate-800 flex items-center gap-4 group cursor-pointer hover:border-brand-500/30 transition-all">
            <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-brand-400 font-black border border-slate-700 shadow-inner group-hover:scale-105 transition-transform">
               {{ (appState.user?.full_name || 'S').charAt(0) }}
            </div>
            <div class="flex-1 min-w-0">
               <p class="text-[11px] font-black text-white truncate">{{ appState.user?.full_name || 'Vendedor' }}</p>
               <p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Ejecutivo de Ventas</p>
            </div>
            <button @click="logout" class="text-slate-600 hover:text-red-400 transition-colors p-1"><i class="bi bi-power"></i></button>
         </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(132,204,22,0.03),transparent_40%)]">
      <div class="p-12 max-w-6xl mx-auto">
        <header class="flex items-center justify-between mb-12">
           <div>
              <h2 class="text-white text-3xl font-black tracking-tight mb-2">{{ currentNav.label }}</h2>
              <p class="text-slate-500 text-xs font-medium">{{ currentNav.desc }}</p>
           </div>
           <button @click="showNewApp = true" class="bg-brand-500 hover:bg-brand-400 text-slate-900 font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-3">
              <i class="bi bi-plus-lg text-lg"></i> Nuevo Prospecto
           </button>
        </header>

        <!-- Stats Overview -->
        <div v-if="section === 'dashboard'" class="grid grid-cols-4 gap-6 mb-12 animate-fade-in">
           <div v-for="stat in stats" :key="stat.label" class="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:border-brand-500/30 transition-all">
              <div class="absolute -top-12 -right-12 w-24 h-24 bg-brand-500/5 blur-[40px] rounded-full group-hover:bg-brand-500/10 transition-all"></div>
              <div class="flex items-center gap-4 mb-4">
                 <div class="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-brand-400 border border-slate-800 shadow-inner">
                    <i :class="'bi bi-' + stat.icon" class="text-xl"></i>
                 </div>
                 <p class="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] leading-tight">{{ stat.label }}</p>
              </div>
              <p class="text-white text-3xl font-black mb-1 group-hover:text-brand-500 transition-colors">{{ stat.value }}</p>
              <div class="flex items-center gap-1.5 text-[10px] font-bold" :class="stat.trend > 0 ? 'text-green-400' : 'text-slate-500'">
                 <i :class="stat.trend > 0 ? 'bi bi-graph-up-arrow' : 'bi bi-dash-lg'"></i>
                 <span>{{ stat.trend > 0 ? '+' : '' }}{{ stat.trend }}% vs mes ant.</span>
              </div>
           </div>
        </div>

        <!-- Section Logic -->
        <div v-if="section === 'dashboard'">
           <DataView :items="myProspects" :columns="prospectCols" label="Prospectos Recientes" storageKey="ep_sales_prospects">
              <template #row="{ item }">
                 <td class="px-6 py-4">
                    <div class="flex flex-col">
                       <span class="text-white font-bold text-xs">{{ item.business_name }}</span>
                       <span class="text-[10px] text-slate-500 font-medium">{{ item.contact_name }}</span>
                    </div>
                 </td>
                 <td class="px-6 py-4">
                    <span class="text-[10px] text-slate-400 flex items-center gap-2"><i class="bi bi-geo-alt"></i> {{ item.address }}</span>
                 </td>
                 <td class="px-6 py-4">
                    <span class="text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider"
                      :class="statusBadge(item.status)">
                      {{ item.status }}
                    </span>
                 </td>
                 <td class="px-6 py-4 text-right">
                    <span class="text-[10px] font-mono text-slate-500">{{ formatDate(item.created) }}</span>
                 </td>
              </template>
           </DataView>
        </div>
        
        <div v-else-if="section === 'prospects'">
           <DataView :items="allProspects" :columns="prospectCols" label="Mi Cartera" storageKey="ep_sales_all">
              <!-- Same template or specialized -->
           </DataView>
        </div>

      </div>
    </main>

    <!-- New Prospect Modal (Simplified) -->
    <Transition name="fade">
      <div v-if="showNewApp" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
        <div class="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 max-w-xl w-full shadow-2xl relative animate-scale-in">
           <button @click="showNewApp = false" class="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl"><i class="bi bi-x-lg"></i></button>
           
           <div class="mb-10 text-center">
              <div class="w-16 h-16 bg-brand-500/10 text-brand-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-brand-500/20 shadow-lg shadow-brand-500/5">
                 <i class="bi bi-plus-circle-dotted"></i>
              </div>
              <h3 class="text-2xl font-black text-white mb-2 uppercase tracking-tight">Nuevo Prospecto</h3>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Información Básica del Aliado</p>
           </div>

           <div class="space-y-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div class="flex flex-col">
                  <label class="label-sm">Nombre del Negocio</label>
                  <input v-model="form.biz" type="text" class="input-dark" placeholder="Ej: Minisuper Centro">
                </div>
                <div class="flex flex-col">
                  <label class="label-sm">Contacto</label>
                  <input v-model="form.contact" type="text" class="input-dark" placeholder="Nombre completo">
                </div>
              </div>
              <div class="flex flex-col">
                <label class="label-sm">Dirección Sugerida</label>
                <AddressInput v-model="form.addr" placeholder="Escribe para buscar..." />
              </div>
              <div class="flex flex-col">
                <label class="label-sm">WhatsApp / Teléfono</label>
                <input v-model="form.wa" type="email" class="input-dark" placeholder="55 1234 5678">
              </div>
           </div>

           <div class="flex gap-4 mt-10">
              <button @click="saveProspect" class="flex-1 bg-brand-500 text-slate-900 font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-brand-400 transition-all shadow-xl shadow-brand-500/20 active:scale-95">Registar Interés</button>
              <button @click="showNewApp = false" class="flex-1 bg-slate-800 text-slate-400 font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-750 transition-all border border-slate-700">Cancelar</button>
           </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
export default {
  inject: ['appState', 'pb_url', 'logout', 'showModal', 'saveDemoData'],
  components: {
    DataView: Vue.defineAsyncComponent(() => loadModule('./components/DataView.vue', options)),
    AddressInput: Vue.defineAsyncComponent(() => loadModule('./components/AddressInput.vue', options))
  },
  data() {
    return {
      section: 'dashboard',
      nav: [
        { id: 'dashboard',   icon: 'grid-1x2-fill', label: 'Dashboard',   desc: 'Resultados y prospección mensual' },
        { id: 'prospects',   icon: 'person-lines-fill', label: 'Prospectos', desc: 'Control de aliados y aplicaciones' },
        { id: 'commissions', icon: 'wallet2',          label: 'Incentivos',  desc: 'Bonos por puntos activados' },
        { id: 'marketing',   icon: 'megaphone',        label: 'Material',    desc: 'Recursos para ventas field' },
      ],
      prospectCols: [
         { key: 'biz', label: 'Negocio' },
         { key: 'loc', label: 'Ubicación' },
         { key: 'st',  label: 'Estado' },
         { key: 'dt',  label: 'Fecha', align: 'right' }
      ],
      showNewApp: false,
      form: { biz: '', contact: '', addr: '', wa: '' },
      stats: [
        { label: 'Puntos Activos', value: '12', icon: 'shop', trend: 15 },
        { label: 'Prospectos / Mes', value: '45', icon: 'person-plus', trend: 8 },
        { label: 'Conversión', value: '26%', icon: 'pie-chart-fill', trend: 2 },
        { label: 'Bonos $', value: '$8,400', icon: 'stars', trend: 12 },
      ],
      prospects: []
    }
  },
  computed: {
    currentNav() { return this.nav.find(n => n.id === this.section); },
    myProspects() { return this.prospects.slice(0, 5); },
    allProspects() { return this.prospects; }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    async refresh() {
       if (this.appState.demoMode) {
          this.prospects = this.appState.demoData.partner_applications || [];
          return;
       }
       
       try {
          const res = await fetch(`${this.pb_url}/api/collections/partner_applications/records?sort=-created&perPage=100`, {
             headers: { 'Authorization': localStorage.getItem('ep_token') }
          });
          const data = await res.json();
          this.prospects = data.items || [];
       } catch (e) {
          console.error('Fetch error:', e);
          this.prospects = [];
       }
    },
    formatDate(d) { return new Date(d).toLocaleDateString(); },
    statusBadge(s) {
       return { 
         new: 'bg-amber-900/30 text-amber-400 border-amber-900/50', 
         pending: 'bg-blue-900/30 text-blue-400 border-blue-900/50', 
         approved: 'bg-green-900/30 text-green-400 border-green-900/50' 
       }[s] || 'bg-slate-800 text-slate-400 border-slate-700';
    },
    async saveProspect() {
       if(!this.form.biz || !this.form.addr) return this.showModal({ title: 'Datos faltantes', message: 'Nombre y dirección son obligatorios.', type: 'warning' });
       
       const newP = { 
         business_name: this.form.biz, 
         contact_name: this.form.contact, 
         address: this.form.addr, 
         status: 'new'
       };

       if(this.appState.demoMode) {
          newP.id = 'mock_'+Date.now();
          newP.created = new Date().toISOString(); 
          if(!this.appState.demoData.partner_applications) this.appState.demoData.partner_applications = [];
          this.appState.demoData.partner_applications.unshift(newP);
          this.saveDemoData({ ...this.appState.demoData });
          this.refresh();
          this.showNewApp = false;
          this.form = { biz: '', contact: '', addr: '', wa: '' };
          return this.showModal({ title: '¡Éxito!', message: 'Prospecto registrado en el sistema demo.', type: 'success' });
       }

       try {
          const token = localStorage.getItem('ep_token');
          const res = await fetch(`${this.pb_url}/api/collections/partner_applications/records`, {
             method: 'POST',
             headers: {
                'Content-Type': 'application/json',
                'Authorization': token
             },
             body: JSON.stringify(newP)
          });
          if (res.ok) {
             this.refresh();
             this.showNewApp = false;
             this.form = { biz: '', contact: '', addr: '', wa: '' };
             this.showModal({ title: '¡Éxito!', message: 'Prospecto registrado exitosamente.', type: 'success' });
          } else {
             throw new Error('Database Error');
          }
       } catch (e) {
          this.showModal({ title: 'Error', message: 'No se pudo registrar el prospecto en la base de datos.', type: 'error' });
       }
    }
  }
}
</script>

<style scoped>
.label-sm { 
  display: block !important;
  font-size: 10px !important;
  font-weight: 900 !important;
  color: #64748b !important; /* slate-500 */
  text-transform: uppercase !important;
  letter-spacing: 0.2em !important;
  margin-bottom: 0.5rem !important;
  padding-left: 0.25rem !important;
}
.input-dark { 
  width: 100% !important;
  background-color: #020617 !important; /* slate-950 */
  border: 1px solid #1e293b !important; /* slate-800 */
  color: #ffffff !important;
  border-radius: 1rem !important; /* 2xl */
  padding: 1rem 1.25rem !important;
  font-size: 0.75rem !important; /* text-xs */
  transition: all 0.2s !important;
  outline: none !important;
}
.input-dark::placeholder { color: #475569 !important; }
.input-dark:focus { 
  border-color: #f59e0b !important; /* brand-500/amber-500 */
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2) !important;
}

.animate-scale-in { animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
