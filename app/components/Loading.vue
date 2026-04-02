<template>
  <Transition name="fade">
    <div v-if="modelValue" class="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <div class="text-center animate-scale-in">
        <div class="relative inline-block mb-6">
          <div class="w-16 h-16 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-8 h-8 bg-brand-500 rounded-lg animate-pulse shadow-lg shadow-brand-500/50 flex items-center justify-center">
               <i class="bi bi-cpu-fill text-slate-900"></i>
            </div>
          </div>
        </div>
        <h3 class="text-white font-black text-lg tracking-tight mb-2 uppercase">{{ message || 'Procesando...' }}</h3>
        <p class="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">Por favor, espera un momento</p>
      </div>
    </div>
  </Transition>
</template>

<script>
export default {
  props: ['modelValue', 'message']
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes scale-in {
  from { transform: scale(0.9) opacity: 0; }
  to { transform: scale(1) opacity: 1; }
}
.animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
</style>
