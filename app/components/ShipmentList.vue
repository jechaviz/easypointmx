<template>
  <div class="space-y-4">
    <h2 class="text-lg font-bold text-slate-900 px-1 border-b border-slate-200 pb-2 mb-4">Ruta de Hoy ({{ locations.length }} Paradas)</h2>
    
    <!-- Empty State -->
    <div v-if="locations.length === 0" class="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
      <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <i class="bi bi-check2-all text-3xl text-slate-300"></i>
      </div>
      <h3 class="text-lg font-bold text-slate-900">Ruta Completada</h3>
      <p class="text-slate-500">No hay más paradas pendientes.</p>
    </div>

    <!-- Location Cards -->
    <div class="space-y-4">
      <div 
        v-for="(loc, index) in locations" 
        :key="loc.id"
        class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group relative"
      >
        <!-- Location Header -->
        <div class="p-5 flex items-start gap-4">
          <!-- Step Number -->
          <div class="w-10 h-10 shrink-0 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-slate-900/20">
            {{ index + 1 }}
          </div>
          
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-bold text-slate-900 truncate pr-8">{{ loc.name }}</h3>
            <p class="text-slate-500 text-sm truncate flex items-center gap-1 mt-0.5">
              <i class="bi bi-geo-alt text-slate-400"></i>
              {{ loc.address }}
            </p>
            <div class="mt-2 text-xs font-semibold text-brand-600 bg-brand-50 inline-flex px-2 py-1 rounded-md">
              A {{ loc.distance }}
            </div>
          </div>

          <!-- Actions Dropdown (mock) -->
          <button class="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors absolute top-4 right-4">
            <i class="bi bi-three-dots-vertical"></i>
          </button>
        </div>

        <!-- Location Pending Actions Summary -->
        <div class="bg-slate-50 border-t border-slate-100 p-4">
            <div class="grid grid-cols-2 gap-3">
                <!-- Pickups (Recolecciones - From Point to Truck) -->
                <div class="bg-white p-3 rounded-xl border border-green-100 flex items-center justify-between shadow-sm relative overflow-hidden" :class="{'opacity-50 grayscale': loc.pickups.length === 0}">
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                            <i class="bi bi-box-arrow-up"></i>
                        </div>
                        <div class="font-medium text-slate-700 text-sm">Recoger</div>
                    </div>
                    <div class="text-xl font-bold text-slate-900">{{ loc.pickups.length }}</div>
                </div>

                <!-- Deliveries (Entregas - From Truck to Point) -->
                <div class="bg-white p-3 rounded-xl border border-blue-100 flex items-center justify-between shadow-sm relative overflow-hidden" :class="{'opacity-50 grayscale': loc.deliveries.length === 0}">
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <i class="bi bi-box-arrow-down"></i>
                        </div>
                        <div class="font-medium text-slate-700 text-sm">Entregar</div>
                    </div>
                    <div class="text-xl font-bold text-slate-900">{{ loc.deliveries.length }}</div>
                </div>
            </div>
            
            <!-- Quick Expand Button (Mock) -->
            <button class="w-full mt-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1">
                Ver paquetes <i class="bi bi-chevron-down text-xs"></i>
            </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    locations: {
      type: Array,
      required: true
    }
  }
}
</script>
