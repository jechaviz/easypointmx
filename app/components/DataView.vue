<template>
  <div class="space-y-4">
    <!-- View Switcher & Action Header -->
    <div class="flex items-center justify-between flex-wrap gap-4 px-1">
      <div>
        <slot name="header-left">
           <p class="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">{{ items.length }} {{ label }}</p>
        </slot>
      </div>

      <div class="flex items-center gap-3">
        <slot name="header-actions"></slot>
        
        <!-- Toggle -->
        <div class="inline-flex bg-slate-900 border border-slate-800 p-0.5 rounded-xl shadow-inner">
          <button 
            @click="currentView = 'table'" 
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300"
            :class="currentView === 'table' ? 'bg-brand-500 text-slate-900 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-300'"
          >
            <i class="bi bi-list-columns-reverse"></i> <span class="hidden sm:inline">Tabla</span>
          </button>
          <button 
            @click="currentView = 'grid'" 
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300"
            :class="currentView === 'grid' ? 'bg-brand-500 text-slate-900 shadow-md transform scale-[1.02]' : 'text-slate-500 hover:text-slate-300'"
          >
            <i class="bi bi-grid-3x3-gap-fill"></i> <span class="hidden sm:inline">Cards</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Main List Container -->
    <div class="relative min-h-[200px]">
      
      <!-- Table View -->
      <transition name="view-fade" mode="out-in">
        <div v-if="currentView === 'table'" key="table" class="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-10">
                  <th v-for="col in columns" :key="col.key" 
                    class="px-6 py-4 text-[10px] text-slate-500 uppercase tracking-widest font-black"
                    :class="col.align === 'right' ? 'text-right' : ''"
                  >
                    {{ col.label }}
                  </th>
                  <th v-if="$slots.actions" class="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/50">
                <tr v-for="item in items" :key="item.id" class="hover:bg-brand-500/5 transition-colors group">
                  <slot name="row" :item="item"></slot>
                  <td v-if="$slots.actions" class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <slot name="actions" :item="item"></slot>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="items.length === 0" class="flex flex-col items-center justify-center p-20 text-slate-600">
            <i class="bi bi-database-dash text-5xl mb-3 opacity-20"></i>
            <p class="font-bold text-xs uppercase tracking-widest">Sin registros encontrados</p>
          </div>
        </div>

        <!-- Grid View -->
        <div v-else key="grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
           <slot v-for="item in items" :key="item.id" name="card" :item="item"></slot>
           <div v-if="items.length === 0" class="col-span-full flex flex-col items-center justify-center p-20 text-slate-600 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl">
              <i class="bi bi-grid-3x3-gap text-5xl mb-3 opacity-20"></i>
              <p class="font-bold text-xs uppercase tracking-widest">No hay items que mostrar</p>
           </div>
        </div>
      </transition>

    </div>
  </div>
</template>

<script>
export default {
  props: {
    items: { type: Array, required: true },
    columns: { type: Array, required: true },
    label: { type: String, default: 'Registros' },
    defaultView: { type: String, default: 'table' },
    storageKey: { type: String, default: 'ep_dataview' }
  },
  data() {
    return {
      currentView: this.defaultView
    }
  },
  mounted() {
    // Persistent preference (optional)
    const saved = localStorage.getItem(this.storageKey);
    if (saved && (saved === 'table' || saved === 'grid')) {
      this.currentView = saved;
    }
  },
  watch: {
    currentView(val) {
      localStorage.setItem(this.storageKey, val);
    }
  }
}
</script>

<style scoped>
.view-fade-enter-active, .view-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.view-fade-enter-from, .view-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
