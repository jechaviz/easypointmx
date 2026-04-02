<template>
  <div class="min-h-screen bg-slate-950 flex text-sm selection:bg-brand-500/30 selection:text-brand-200">

    <!-- SIDEBAR -->
    <aside class="w-72 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col sticky top-0 h-screen z-50">
      <div class="p-8">
        <div class="flex items-center gap-3 mb-10 group">
           <div @click="fetchRoute" class="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform cursor-pointer">
              <i class="bi bi-truck-flatbed text-slate-900 text-xl"></i>
           </div>
           <div>
              <h1 class="text-white font-black text-lg tracking-tighter leading-none">Ruta de <span class="text-brand-400">Hoy</span></h1>
              <p class="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Easypoint Ops</p>
           </div>
        </div>

        <nav class="space-y-1">
          <button @click="activeTab = 'pending'"
            class="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all"
            :class="activeTab === 'pending' ? 'bg-brand-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'">
            <i class="bi bi-box-arrow-in-down text-xl"></i>
            <span class="text-xs font-black uppercase tracking-widest">Recolección</span>
            <div class="ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-black/20" v-if="pendingPackages.length">{{ pendingPackages.length }}</div>
          </button>
          <button @click="activeTab = 'transit'"
            class="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all"
            :class="activeTab === 'transit' ? 'bg-brand-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'">
            <i class="bi bi-truck text-xl"></i>
            <span class="text-xs font-black uppercase tracking-widest">En Ruta</span>
            <div class="ml-auto text-[9px] font-black px-2 py-0.5 rounded-full bg-black/20" v-if="transitPackages.length">{{ transitPackages.length }}</div>
          </button>
          <button @click="scanning = true"
            class="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all text-slate-400 hover:bg-slate-800/50 hover:text-brand-400">
            <i class="bi bi-qr-code-scan text-xl"></i>
            <span class="text-xs font-black uppercase tracking-widest">Escanear QR</span>
          </button>
        </nav>
      </div>

      <!-- Bottom Profile Card -->
      <div class="mt-auto p-6 border-t border-slate-800/50">
         <div v-if="appState.demoMode" class="mb-4 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-2xl flex items-center gap-2 animate-pulse">
            <span class="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
            <span class="text-amber-500 text-[10px] font-black uppercase tracking-widest">Modo Demo</span>
         </div>
            <div class="bg-slate-950/50 rounded-[2rem] p-4 border border-slate-800 flex items-center gap-4 hover:border-brand-500/30 transition-all group">
               <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-brand-400 font-black border border-slate-700 shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform">
                  {{ (appState.user?.full_name || 'D').charAt(0) }}
               </div>
               <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-black text-white truncate">{{ appState.user?.full_name || 'Driver' }}</p>
                  <p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Repartidor</p>
               </div>
               <button @click="logout" class="text-slate-600 hover:text-red-400 transition-colors p-1 flex-shrink-0" title="Cerrar Sesión">
                  <i class="bi bi-power text-lg"></i>
               </button>
            </div>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_right,rgba(132,204,22,0.03),transparent_40%)] flex flex-col">
      <div class="px-10 pt-10 pb-4">
        <h2 class="text-white text-3xl font-black tracking-tight mb-1">{{ activeTab === 'pending' ? 'Recolección' : 'En Ruta' }}</h2>
        <p class="text-slate-500 text-xs font-medium uppercase tracking-widest">{{ packages.length }} paquete{{ packages.length !== 1 ? 's' : '' }} activos</p>
      </div>

      <Transition name="fade">
        <Scanner v-if="scanning" :mode="activeTab === 'pending' ? 'pickup' : 'dropoff'" @scan="handleScan" @close="scanning = false" />
      </Transition>

      <div class="flex-1 w-full p-6">
        <div v-if="loading" class="flex flex-col items-center justify-center h-40 text-slate-400">
          <i class="bi bi-arrow-repeat animate-spin text-3xl mb-2"></i>
          <p class="text-xs font-bold uppercase tracking-widest">Sincronizando ruta...</p>
        </div>

      <!-- PENDING LIST -->
      <div v-if="activeTab === 'pending'" class="animate-fade-in-up">
        <DataView :items="pendingPackages" :columns="routeCols" label="Recolección" storageKey="ep_driver_rev">
          <template #row="{ item }">
            <td class="px-6 py-5">
              <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/50 border border-slate-800 font-mono text-brand-500 text-xs font-black shadow-inner">
                <i class="bi bi-qr-code opacity-40"></i>{{ item.tracking_id }}
              </span>
            </td>
            <td class="px-6 py-5">
               <div class="flex flex-col">
                  <span class="text-sm font-bold text-white">{{ item.recipient_name || '—' }}</span>
                  <span class="text-[10px] text-slate-500 uppercase font-black"><i class="bi bi-shop mr-1"></i> {{ item.expand?.point_id?.name || 'Local no asignado' }}</span>
               </div>
            </td>
            <td class="px-6 py-5 text-right">
              <button @click="updateStatus(item.id, 'in_transit')" class="w-10 h-10 rounded-xl bg-brand-500 text-slate-900 hover:bg-brand-400 transition-all flex items-center justify-center text-xl shadow-lg shadow-brand-500/10 active:scale-90">
                <i class="bi bi-box-seam-fill"></i>
              </button>
            </td>
          </template>
          <template #card="{ item }">
            <div class="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 shadow-2xl hover:border-brand-500/30 transition-all group relative overflow-hidden">
               <div class="absolute -top-12 -right-12 w-24 h-24 bg-brand-500/5 blur-[40px] rounded-full group-hover:bg-brand-500/10 transition-all"></div>
               
               <div class="flex items-center justify-between gap-6 relative z-10">
                  <div class="flex-1 min-w-0">
                     <div class="flex items-center gap-3 mb-4">
                        <span class="px-3 py-1 bg-brand-500/10 text-brand-500 border border-brand-500/20 rounded-xl text-[10px] font-black font-mono tracking-tighter shadow-inner">{{ item.tracking_id }}</span>
                        <span v-if="item.recipient_name" class="text-sm font-black text-white truncate">{{ item.recipient_name }}</span>
                     </div>
                     
                     <div class="space-y-2">
                        <p class="text-xs font-bold text-slate-300 flex items-center gap-2">
                           <div class="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                           {{ item.expand?.point_id?.name || 'Local no asignado' }}
                        </p>
                        <a :href="getMapsUrl(item.expand?.point_id?.address)" target="_blank" class="text-[10px] text-slate-500 hover:text-brand-400 transition-colors flex items-start gap-2 leading-relaxed">
                           <i class="bi bi-geo-alt-fill shrink-0 mt-0.5 opacity-50"></i> {{ item.expand?.point_id?.address || 'Sin dirección' }}
                        </a>
                     </div>
                  </div>

                  <button @click="updateStatus(item.id, 'in_transit')" class="w-14 h-14 shrink-0 bg-brand-500 text-slate-900 rounded-[1.5rem] hover:bg-brand-400 transition-all flex items-center justify-center text-2xl shadow-xl shadow-brand-500/30 active:scale-90 border-4 border-slate-950">
                    <i class="bi bi-box-seam-fill"></i>
                  </button>
               </div>
            </div>
          </template>
          <template #empty>
             <div class="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-[2rem] shadow-inner w-full">
                <div class="w-16 h-16 bg-brand-500/10 text-brand-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-brand-500/20"><i class="bi bi-check-all"></i></div>
                <h3 class="text-lg font-black text-white px-6">Ruta de Recolección Completa</h3>
                <p class="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">No hay paquetes pendientes en bodega.</p>
             </div>
          </template>
        </DataView>
      </div>

      <!-- TRANSIT LIST -->
      <div v-else-if="activeTab === 'transit'" class="animate-fade-in-up">
        <DataView :items="transitPackages" :columns="routeCols" label="En Ruta" storageKey="ep_driver_transit">
          <template #row="{ item }">
            <td class="px-6 py-5 font-mono text-brand-500 text-xs font-black">{{ item.tracking_id }}</td>
            <td class="px-6 py-5">
               <div class="flex flex-col">
                  <span class="text-sm font-bold text-white">{{ item.recipient_name || '—' }}</span>
                  <span class="text-[10px] text-slate-500 uppercase font-black"><i class="bi bi-geo-alt mr-1"></i> {{ item.expand?.point_id?.name }}</span>
               </div>
            </td>
            <td class="px-6 py-5 text-right">
              <button @click="updateStatus(item.id, 'at_point')" class="w-10 h-10 rounded-full bg-green-500 text-slate-900 hover:bg-green-400 transition-all flex items-center justify-center text-xl shadow-lg shadow-green-500/10 active:scale-90 border-2 border-slate-900">
                <i class="bi bi-check-lg"></i>
              </button>
            </td>
          </template>
          <template #card="{ item }">
            <div class="bg-slate-900/40 backdrop-blur-sm border border-brand-500/20 rounded-[2rem] p-5 shadow-2xl group relative overflow-hidden hover:border-brand-500/50 transition-all">
              <div class="absolute top-0 right-0 p-3 opacity-5 pointer-events-none transition-opacity group-hover:opacity-10"><i class="bi bi-truck text-5xl rotate-12"></i></div>
              
              <div class="flex items-center justify-between gap-4 relative z-10">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-2">
                     <span class="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-[9px] font-black uppercase tracking-widest">En Ruta</span>
                     <span class="text-[10px] font-mono font-bold text-slate-500">{{ item.tracking_id }}</span>
                  </div>
                  
                  <h4 class="font-black text-white text-sm mb-3 truncate">{{ item.recipient_name || '—' }}</h4>
                  
                  <div class="space-y-1.5">
                     <p class="text-[11px] text-slate-300 font-black flex items-center gap-1.5"><i class="bi bi-geo-alt-fill text-brand-500"></i> {{ item.expand?.point_id?.name }}</p>
                     <a :href="getMapsUrl(item.expand?.point_id?.address)" target="_blank" class="text-[9px] text-slate-500 hover:text-brand-400 transition-colors line-clamp-2 leading-tight flex items-start gap-1.5">
                        {{ item.expand?.point_id?.address }}
                     </a>
                  </div>
                </div>

                <button @click="updateStatus(item.id, 'at_point')" class="w-14 h-14 shrink-0 bg-green-500 text-slate-900 rounded-full hover:bg-green-400 transition-all flex items-center justify-center text-3xl shadow-lg shadow-green-500/20 active:scale-90 border-4 border-slate-900 relative z-10">
                  <i class="bi bi-check-lg"></i>
                </button>
              </div>
            </div>
          </template>
          <template #empty>
             <div class="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-[2rem] shadow-inner w-full">
                <div class="w-16 h-16 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"><i class="bi bi-truck"></i></div>
                <h3 class="text-lg font-black text-white">Van de Entrega Vacía</h3>
                <p class="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Sin paquetes en tránsito actualmente.</p>
             </div>
          </template>
        </DataView>
      </div>
    </div>
  </main>
  </div>
</template>

<script>
export default {
  inject: ['appState', 'pb_url', 'logout', 'showModal', 'getMapsUrl', 'syncBusinessEvents', 'emitBusinessEvent'],
  components: {
    DataView: Vue.defineAsyncComponent(() => loadModule('./components/DataView.vue', options)),
    Scanner: Vue.defineAsyncComponent(() => loadModule('./components/Scanner.vue', options))
  },
  data() {
    return {
      activeTab: 'pending',
      packages: [],
      routeCols: [
         { key: 'pkg', label: 'Paquete' },
         { key: 'info', label: 'Detalles/Destino' },
         { key: 'action', label: 'Acción', align: 'right' }
      ],
      loading: false,
      scanning: false
    }
  },
  computed: {
    pendingPackages() { return this.packages.filter(p => p.status === 'pending'); },
    transitPackages() { return this.packages.filter(p => p.status === 'in_transit'); }
  },
  mounted() {
    this.fetchRoute();
  },
  methods: {
    async fetchRoute() {
      this.loading = true;
      try {
        if (this.appState.demoMode) {
           const d = this.appState.demoData || {};
           this.packages = d.shipments?.filter(s => s.status === 'pending' || s.status === 'in_transit') || [];
           this.syncBusinessEvents({ shipments: this.packages });
           return;
        }

        const res = await fetch(`${this.pb_url}/api/collections/shipments/records?filter=(status='pending'||status='in_transit')&expand=point_id&perPage=500`, {
          headers: { 'Authorization': this.appState.token }
        });
        const data = await res.json();
        this.packages = data.items || [];
        this.syncBusinessEvents({ shipments: this.packages });
      } catch (e) {
        console.error('Fetch error:', e);
      } finally {
        this.loading = false;
      }
    },
    async updateStatus(id, newStatus) {
      const ok = await this.showModal({
        title: 'Confirmar Acción',
        message: `¿Marcar este paquete como ${newStatus === 'in_transit' ? 'Recolectado' : 'Entregado en Local'}?`,
        type: 'confirm',
        confirmText: 'Confirmar'
      });
      if (!ok) return;
      await this.applyStatus(id, newStatus);
    },
    async applyStatus(id, newStatus) {
      const shipment = this.packages.find(item => item.id === id);
      if (this.appState.demoMode) {
        const d = this.appState.demoData;
        const shp = d.shipments.find(s => s.id === id);
        if (shp) {
           shp.status = newStatus;
           shp.updated = new Date().toISOString();
           localStorage.setItem('ep_demo_data', JSON.stringify(d));
           this.emitBusinessEvent({
             audience: ['driver', 'admin', 'operator'],
             severity: newStatus === 'at_point' ? 'success' : 'info',
             icon: newStatus === 'at_point' ? 'building-check' : 'truck-flatbed',
             title: newStatus === 'at_point' ? 'Entrega al local confirmada' : 'Paquete recolectado por ruta',
             message: `${shp.tracking_id} ya cambio a ${newStatus === 'at_point' ? 'en local' : 'en transito'}.`
           });
           this.fetchRoute();
        }
        return;
      }
      try {
        const res = await fetch(`${this.pb_url}/api/collections/shipments/records/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.appState.token
          },
          body: JSON.stringify({ status: newStatus })
        });
        if(res.ok) {
           if (shipment) {
             this.emitBusinessEvent({
               audience: ['driver', 'admin', 'operator'],
               severity: newStatus === 'at_point' ? 'success' : 'info',
               icon: newStatus === 'at_point' ? 'building-check' : 'truck-flatbed',
               title: newStatus === 'at_point' ? 'Entrega al local confirmada' : 'Paquete recolectado por ruta',
               message: `${shipment.tracking_id} ya cambio a ${newStatus === 'at_point' ? 'en local' : 'en transito'}.`
             });
           }
           this.fetchRoute(); // Reload array
        }
      } catch (e) {
        this.showModal({ title: 'Error', message: 'No se pudo actualizar el estado de la ruta.', type: 'error' });
      }
    },
    async handleScan(code) {
      const pkg = this.packages.find(p => p.tracking_id === code);
      if(!pkg) return this.showModal({ title: 'No Encontrado', message: 'Paquete no encontrado en tu ruta actual.', type: 'warning' });
      
      const targetStatus = this.activeTab === 'pending' ? 'in_transit' : 'at_point';
      await this.applyStatus(pkg.id, targetStatus);
      this.scanning = false;
    }
  }
}
</script>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
