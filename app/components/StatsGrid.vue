<template>
  <div class="grid grid-cols-2 gap-4">
    <!-- Pickups Card -->
    <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
        <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-green-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
        <div class="relative z-10 flex items-start justify-between">
            <div>
                <div class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Recolecciones</div>
                <div class="text-4xl font-bold text-slate-900">{{ pickups }}</div>
            </div>
            <div class="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <i class="bi bi-box-arrow-up text-xl"></i>
            </div>
        </div>
    </div>

    <!-- Deliveries Card -->
    <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
        <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
        <div class="relative z-10 flex items-start justify-between">
            <div>
                <div class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Entregas</div>
                <div class="text-4xl font-bold text-slate-900">{{ deliveries }}</div>
            </div>
            <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <i class="bi bi-box-arrow-down text-xl"></i>
            </div>
        </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    pickups: {
      type: Number,
      required: true
    },
    deliveries: {
      type: Number,
      required: true
    }
  }
}
</script>
