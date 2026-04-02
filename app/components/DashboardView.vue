<template>
  <div class="min-h-screen bg-slate-950 flex text-sm selection:bg-brand-500/30 selection:text-brand-200">
    
    <!-- SIDEBAR (Premium Glass Design) -->
    <aside class="w-72 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col sticky top-0 h-screen z-50 hidden md:flex shrink-0">
      <div class="p-8">
        <div class="flex items-center gap-3 mb-10 group overflow-hidden">
           <div class="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform">
              <i class="bi bi-box-seam-fill text-slate-900 text-xl"></i>
           </div>
           <div>
              <h1 class="text-white font-black text-lg tracking-tighter leading-none">Punto<span class="text-brand-400">Hub</span></h1>
              <p class="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Easypoint Ops</p>
           </div>
        </div>

        <nav class="space-y-1">
          <button @click="section = 'dashboard'; currentMode = null"
            class="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all"
            :class="section === 'dashboard' ? 'bg-brand-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'">
            <i class="bi bi-grid-1x2-fill text-xl"></i>
            <span class="text-xs font-black uppercase tracking-widest">Dashboard</span>
          </button>
          <button @click="section = 'inventory'; currentMode = null"
            class="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all"
            :class="section === 'inventory' ? 'bg-brand-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'">
            <i class="bi bi-archive-fill text-xl"></i>
            <span class="text-xs font-black uppercase tracking-widest">Inventario</span>
          </button>
        </nav>
      </div>

      <!-- Bottom Profile Card -->
      <div class="mt-auto p-6 border-t border-slate-800/50">
         <!-- Demo badge -->
         <div v-if="appState.demoMode" class="mb-4 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-2xl flex items-center gap-2 animate-pulse">
            <span class="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
            <span class="text-amber-500 text-[10px] font-black uppercase tracking-widest">Modo Demo</span>
         </div>
            <div class="bg-slate-950/50 rounded-[2rem] p-4 border border-slate-800 flex items-center gap-4 hover:border-brand-500/30 transition-all group">
               <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-brand-400 font-black border border-slate-700 shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform">
                  {{ (user.name || 'O').charAt(0) }}
               </div>
               <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-black text-white truncate">{{ user.name || 'Operador' }}</p>
                  <p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Punto de Entrega</p>
               </div>
               <button @click="logout" class="text-slate-600 hover:text-red-400 transition-colors p-1 flex-shrink-0" title="Cerrar Sesión">
                  <i class="bi bi-power text-lg"></i>
               </button>
            </div>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_right,rgba(132,204,22,0.03),transparent_40%)]">

      <!-- Slim page title -->
      <div class="px-8 md:px-12 pt-8 pb-4">
        <h2 class="text-white text-2xl md:text-3xl font-black tracking-tight mb-1">
          {{ section === 'inventory' ? 'Inventario del Local' : (currentMode ? formatMode(currentMode) : 'Dashboard') }}
        </h2>
        <p class="text-slate-500 text-[10px] font-medium uppercase tracking-widest">{{ point?.name || 'Panel de Operador' }}</p>
      </div>
      <div class="p-4 md:p-12 pt-4 space-y-8">
      
        <!-- DASHBOARD SECTION -->
        <div v-if="section === 'dashboard'">
          
          <!-- Premium Point Info Header -->
          <div v-if="point" class="animate-fade-in bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl mb-8 relative overflow-hidden group">
            <div class="absolute -top-12 -right-12 w-32 h-32 bg-brand-500/5 blur-[50px] rounded-full group-hover:bg-brand-500/10 transition-all"></div>
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
              <div class="flex items-center gap-6 relative z-10">
                <div class="w-16 h-16 rounded-[1.5rem] bg-slate-950 flex items-center justify-center text-brand-500 text-3xl border border-slate-800 shadow-inner group-hover:scale-110 transition-transform">
                  <i class="bi bi-shop"></i>
                </div>
                <div>
                   <p class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Terminal Activa</p>
                   <h1 class="text-3xl font-black text-white leading-tight tracking-tight">{{ point.name }}</h1>
                   <div class="flex items-center gap-4 mt-2">
                     <a :href="getMapsUrl(point.address)" target="_blank" class="text-slate-400 text-xs font-medium hover:text-brand-400 transition-colors flex items-center gap-2">
                        <i class="bi bi-pin-map-fill opacity-50"></i> {{ point.address }}
                     </a>
                   </div>
                </div>
              </div>
              
              <!-- Unified KPI Stats -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 max-w-3xl relative z-10">
                <div class="bg-slate-950/50 rounded-2xl px-5 py-4 border border-slate-800 hover:border-brand-500/30 transition-all">
                  <span class="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-2">Por Recibir</span>
                  <span class="text-2xl font-black text-white">{{ inTransitCount }}</span>
                </div>
                <div class="bg-brand-500 rounded-2xl px-5 py-4 shadow-xl shadow-brand-500/20 group-hover:scale-[1.03] transition-transform">
                  <span class="text-[9px] font-black text-brand-900 uppercase tracking-widest block mb-2">En Local</span>
                  <span class="text-2xl font-black text-slate-950">{{ atPointCount }}</span>
                </div>
                <div class="bg-slate-950/50 rounded-2xl px-5 py-4 border border-slate-800 hover:border-brand-500/30 transition-all">
                  <span class="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-2">Entregados</span>
                  <span class="text-2xl font-black text-white">{{ deliveredCount }}</span>
                </div>
                <div class="bg-slate-950/50 rounded-2xl px-5 py-4 border border-slate-800 text-right hover:border-brand-500/30 transition-all">
                  <span class="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Ganancia</span>
                  <span class="text-2xl font-black text-green-400 font-mono tracking-tighter">${{ (deliveredCount * 8.5).toFixed(1) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="!isLoading" class="bg-red-900/20 border border-red-900/50 rounded-2xl p-6 text-center animate-fade-in mb-8">
            <i class="bi bi-exclamation-triangle text-red-400 text-3xl mb-2"></i>
            <h2 class="text-white font-bold">Punto no asignado</h2>
            <p class="text-slate-400 text-sm mt-1">Tu cuenta de operador no tiene un local asignado. Contacta al administrador.</p>
          </div>

          <!-- Main Actions -->
          <div v-if="point && !currentMode" class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in animation-delay-200 mb-8">
            <button 
              @click="startMode('receive')"
              class="group relative overflow-hidden rounded-[2rem] bg-slate-900 text-white border border-slate-800 font-bold px-7 py-6 shadow-2xl hover:border-brand-500/30 transition-all flex items-center gap-5"
            >
              <div class="absolute -left-12 -bottom-12 w-32 h-32 bg-brand-500/5 blur-[40px] rounded-full group-hover:bg-brand-500/10 transition-all"></div>
              <div class="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center group-hover:bg-brand-500/10 transition-colors border border-slate-800 group-hover:border-brand-500/20 shadow-inner text-slate-400 group-hover:text-brand-400 relative z-10">
                <i class="bi bi-box-arrow-in-down text-2xl"></i>
              </div>
              <div class="text-left flex-1 relative z-10">
                <div class="text-xl font-black leading-tight tracking-tight">Recibir Paquetes</div>
                <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Paquetes del chofer</div>
              </div>
            </button>

            <button 
              @click="startMode('deliver')"
              class="group relative overflow-hidden rounded-[2rem] bg-brand-500 text-slate-900 font-bold px-7 py-6 shadow-xl shadow-brand-500/20 hover:shadow-2xl hover:shadow-brand-500/30 transition-all flex items-center justify-between"
            >
              <div class="absolute -right-12 -top-12 w-32 h-32 bg-white/10 blur-[40px] rounded-full group-hover:bg-white/20 transition-all scale-150"></div>
              <div class="flex items-center gap-5 relative z-10">
                <div class="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <i class="bi bi-person-check-fill text-2xl"></i>
                </div>
                <div class="text-left">
                  <div class="text-xl font-black leading-tight tracking-tight">Entregar a Cliente</div>
                  <div class="text-[10px] font-bold text-slate-900/60 uppercase tracking-widest mt-1">Escanear código</div>
                </div>
              </div>
              <i class="bi bi-arrow-right text-3xl group-hover:translate-x-1 transition-transform opacity-30 relative z-10"></i>
            </button>
          </div>

          <!-- Finalize Button -->
          <div v-if="currentMode" class="mb-4">
              <button 
              @click="endMode"
              class="w-full relative overflow-hidden rounded-2xl bg-red-500 text-white font-bold p-4 shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center justify-center gap-2"
              >
              <i class="bi bi-stop-circle-fill text-xl"></i>
              Finalizar {{ currentMode === 'receive' ? 'Recepción' : 'Entrega' }}
              </button>
          </div>

          <!-- Scanner Wrapper -->
          <Transition name="fade">
            <div v-if="currentMode" class="animate-fade-in mb-8">
              <Scanner :mode="currentMode === 'receive' ? 'pickup' : 'dropoff'" @scan="handleScan" @close="endMode" />
            </div>
          </Transition>
        </div>

        <!-- INVENTORY SECTION -->
        <div v-if="section === 'inventory' && point" class="animate-fade-in animation-delay-300">
        <DataView :items="atPointShipments" :columns="inventoryCols" label="Inventario" storageKey="ep_op_inventory">
          <template #row="{ item }">
            <td class="px-6 py-5">
              <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/50 border border-slate-800 font-mono text-brand-400 text-xs font-black shadow-inner">
                <i class="bi bi-upc-scan opacity-40"></i>{{ item.tracking_id }}
              </span>
            </td>
            <td class="px-6 py-5">
               <div class="flex flex-col">
                  <h4 class="text-white font-bold text-sm mb-1">{{ item.recipient_name || '—' }}</h4>
                  <span class="text-[10px] text-slate-500">Manejo Estándar</span>
               </div>
            </td>
            <td class="px-6 py-5">
               <div class="flex flex-col">
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{{ formatDate(item.updated) }}</span>
                  <span class="text-[9px] text-brand-500/50 font-black">REGISTRADO</span>
               </div>
            </td>
            <td class="px-6 py-5 text-right">
              <button @click="forceDeliver(item)" class="bg-brand-500 text-slate-900 text-xs font-bold px-4 py-2 rounded-lg hover:bg-brand-400 shadow-sm">
                Entregar
              </button>
            </td>
          </template>
          <template #card="{ item }">
            <div class="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-5 hover:border-brand-500/30 transition-all group relative overflow-hidden">
               <div class="flex items-center justify-between gap-4">
                  <div class="flex-1 min-w-0">
                     <div class="flex items-center gap-2 mb-2">
                        <span class="px-2 py-0.5 bg-slate-950 text-brand-500 border border-slate-800 rounded-md text-[9px] font-mono font-black">{{ item.tracking_id }}</span>
                        <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{{ formatDate(item.updated) }}</span>
                     </div>
                     <h4 class="text-white font-black text-sm truncate mb-3">{{ item.recipient_name || '—' }}</h4>
                     <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 bg-brand-500/10 text-brand-500 border border-brand-500/20 rounded text-[8px] font-black uppercase tracking-widest">En Local</span>
                     </div>
                  </div>
                  <button @click="forceDeliver(item)" class="w-12 h-12 shrink-0 bg-brand-500 text-slate-900 rounded-2xl flex items-center justify-center hover:bg-brand-400 shadow-lg shadow-brand-500/20 active:scale-90 transition-all">
                    <i class="bi bi-check-lg text-xl font-black"></i>
                  </button>
               </div>
            </div>
          </template>
        </DataView>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
const { loadModule } = window['vue3-sfc-loader'];
const PB = 'http://127.0.0.1:8090';

export default {
  inject: ['appState', 'logout', 'showModal', 'getMapsUrl'],
  components: {
    DataView: Vue.defineAsyncComponent(() => loadModule('./components/DataView.vue', options)),
    Scanner: Vue.defineAsyncComponent(() => loadModule('./components/Scanner.vue', options))
  },
  data() {
    return {
      section: 'dashboard',
      currentMode: null, // 'receive' | 'deliver' | null
      inventoryCols: [
        { key: 'pkg', label: 'ID Paquete' },
        { key: 'dest', label: 'Destinatario' },
        { key: 'date', label: 'Llegada' },
        { key: 'action', label: 'Acción', align: 'right' }
      ],
      point: null,
      shipments: [],
      isLoading: true
    }
  },
  mounted() {
    this.fetchData();
  },
  computed: {
    user() { return this.appState.user; },
    inTransitCount() { return this.shipments.filter(s => s.status === 'in_transit').length; },
    atPointCount() { return this.shipments.filter(s => s.status === 'at_point').length; },
    deliveredCount() { return this.shipments.filter(s => s.status === 'delivered').length; },
    atPointShipments() { return this.shipments.filter(s => s.status === 'at_point'); }
  },
  methods: {
    formatMode(m) {
      if(m === 'receive') return 'Recibir Paquetes';
      if(m === 'deliver') return 'Entregar Paquetes';
      return m;
    },
    formatDate(ds) {
      if(!ds) return '—';
      return new Date(ds).toLocaleDateString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
    },
    startMode(mode) {
      this.currentMode = mode;
      setTimeout(() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }, 100);
    },
    endMode() { this.currentMode = null; },
    async fetchData() {
      this.isLoading = true;
      try {
        if (!this.user?.point_ref) return;

        if (this.appState.demoMode) {
           const d = this.appState.demoData || {};
           this.point = d.points?.find(p => p.id === this.user.point_ref);
           this.shipments = d.shipments?.filter(s => s.expand?.point_id?.id === this.user.point_ref || s.expand?.point_id === this.user.point_ref || s.point_id === this.user.point_ref) || [];
           return;
        }

        const token = localStorage.getItem('ep_token');
        const h = { 'Content-Type': 'application/json', 'Authorization': token };

        // Fetch point info
        const pRes = await fetch(`${PB}/api/collections/points/records/${this.user.point_ref}`, { headers: h });
        if (pRes.ok) this.point = await pRes.json();

        // Fetch all shipments assigned to this point
        const sRes = await fetch(`${PB}/api/collections/shipments/records?filter=(point_id='${this.user.point_ref}')&perPage=500&sort=-updated`, { headers: h });
        const sData = await sRes.json();
        this.shipments = sData.items || [];
      } catch (e) {
        console.error(e);
      } finally {
        this.isLoading = false;
      }
    },
    async forceDeliver(shipment) {
      const ok = await this.showModal({
        title: 'Confirmar Entrega',
        message: `¿Marcar paquete ${shipment.tracking_id} como entregado al cliente?`,
        type: 'confirm',
        confirmText: 'Entregado'
      });
      if (!ok) return;
      await this.updateShipmentStatus(shipment, 'delivered');
    },
    async updateShipmentStatus(shipment, newStatus) {
      if (this.appState.demoMode) {
        const d = this.appState.demoData;
        const shp = d.shipments.find(s => s.id === shipment.id);
        if (shp) {
           shp.status = newStatus;
           shp.updated = new Date().toISOString();
           localStorage.setItem('ep_demo_data', JSON.stringify(d));
           this.shipments = this.shipments.map(s => s.id === shipment.id ? shp : s);
        }
        return;
      }
      try {
        const token = localStorage.getItem('ep_token');
        await fetch(`${PB}/api/collections/shipments/records/${shipment.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ status: newStatus })
        });
        await this.fetchData();
      } catch (e) {
        this.showModal({ title: 'Error', message: 'No se pudo actualizar el estado del envío.', type: 'error' });
      }
    },
    async handleScan(code) {
        if (this.appState.demoMode) {
           const d = this.appState.demoData;
           const sData = d.shipments.find(s => s.tracking_id === code);
           if (!sData) return this.showModal({ title: 'No Encontrado', message: 'El envío escaneado no existe (Demo).', type: 'warning' });
           
           if (this.currentMode === 'receive') {
              if (sData.status !== 'in_transit') return this.showModal({ title: 'Aviso', message: 'El paquete no está en tránsito.', type: 'info' });
              await this.updateShipmentStatus(sData, 'at_point');
              this.showModal({ title: 'Recibido', message: `Paquete ${code} recibido en punto.`, type: 'success' });
           } else if (this.currentMode === 'deliver') {
              if (sData.status !== 'at_point') return this.showModal({ title: 'Aviso', message: 'El paquete no está en este local.', type: 'info' });
              await this.updateShipmentStatus(sData, 'delivered');
              this.showModal({ title: 'Entregado', message: `Paquete ${code} entregado al cliente.`, type: 'success' });
           }
           return;
        }
        try {
          const token = localStorage.getItem('ep_token');
          // Find shipment by tracking_id
          const shpRes = await fetch(`${PB}/api/collections/shipments/records?filter=(tracking_id='${code}')`, {
            headers: { 'Authorization': token }
          });
          const shpData = await shpRes.json();
          if (!shpData.items || shpData.items.length === 0) {
              return this.showModal({ title: 'No Encontrado', message: 'El envío escaneado no existe en el sistema.', type: 'warning' });
          }
          
          const shipment = shpData.items[0];
          
          if (this.currentMode === 'receive') {
              // Only receive packages that are coming to us
              if (shipment.point_id !== this.user.point_ref) {
                  return this.showModal({ title: 'Punto Erróneo', message: 'Este paquete no pertenece a este local.', type: 'error' });
              }
              if (shipment.status === 'at_point') {
                  return this.showModal({ title: 'Repetido', message: 'El paquete ya fue recibido anteriormente.', type: 'info' });
              }
              if (shipment.status === 'delivered') {
                  return this.showModal({ title: 'Ya Entregado', message: 'Este paquete ya figura como entregado.', type: 'warning' });
              }
              
              await this.updateShipmentStatus(shipment, 'at_point');
              this.showModal({ title: 'Éxito', message: `Paquete ${code} recibido correctamente.`, type: 'success' });

          } else if (this.currentMode === 'deliver') {
              // Ensure it's in our local
              if (shipment.point_id !== this.user.point_ref) {
                  return this.showModal({ title: 'Acceso Denegado', message: 'Este paquete pertenece a otro local.', type: 'error' });
              }
              if (shipment.status !== 'at_point') {
                  return this.showModal({ title: 'No disponible', message: 'El paquete no se encuentra físicamente en bodega.', type: 'warning' });
              }
              
              await this.updateShipmentStatus(shipment, 'delivered');
              this.showModal({ title: 'Entregado', message: `Paquete ${code} entregado al cliente final.`, type: 'success' });
          }
        } catch (e) {
          this.showModal({ title: 'Error Red', message: 'No hay conexión con el servidor.', type: 'error' });
        }
    }
  }
}
</script>

<style scoped>
.animation-delay-100 { animation-delay: 100ms; }
.animation-delay-200 { animation-delay: 200ms; }
.animation-delay-300 { animation-delay: 300ms; }

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
