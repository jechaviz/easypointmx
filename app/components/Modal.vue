<template>
  <Transition name="modal-bounce">
    <div v-if="modelValue" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-md" @click="handleCancel"></div>
      
      <!-- Modal Box -->
      <div class="relative bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-scale-in">
        <!-- Decor: Brand Glow -->
        <div class="absolute -top-24 -left-24 w-48 h-48 bg-brand-500/10 blur-[60px] rounded-full"></div>
        
        <div class="p-8 relative z-10 text-center">
          <!-- Icon Header -->
          <div class="mb-6 flex justify-center">
             <div class="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-2xl border" :class="typeStyles[type].iconContainer">
                <i :class="['bi', typeStyles[type].icon]"></i>
             </div>
          </div>
          
          <h3 class="text-xl font-black text-white tracking-tight mb-2 uppercase">{{ title }}</h3>
          <p class="text-sm text-slate-400 leading-relaxed px-2">{{ message }}</p>
          
          <!-- Actions -->
          <div class="mt-8 flex flex-col gap-3">
             <button 
               @click="handleConfirm" 
               class="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.15em] transition-all active:scale-95 shadow-lg"
               :class="typeStyles[type].button"
             >
               {{ confirmText || (isConfirm ? 'Confirmar' : 'Entendido') }}
             </button>
             
             <button 
               v-if="isConfirm"
               @click="handleCancel" 
               class="w-full py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
             >
               {{ cancelText || 'Cancelar' }}
             </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
export default {
  props: {
    modelValue: Boolean,
    title: { type: String, default: 'Mensaje' },
    message: String,
    type: { type: String, default: 'info' }, // 'info' | 'success' | 'warning' | 'error' | 'confirm'
    confirmText: String,
    cancelText: String
  },
  emits: ['update:modelValue', 'confirm', 'cancel'],
  data() {
    return {
      typeStyles: {
        info: { 
          icon: 'bi-info-circle-fill', 
          iconContainer: 'bg-slate-800 border-slate-700 text-brand-400',
          button: 'bg-brand-500 text-slate-900 hover:bg-brand-400'
        },
        success: { 
          icon: 'bi-check-circle-fill', 
          iconContainer: 'bg-green-500/10 border-green-500/20 text-green-400',
          button: 'bg-green-500 text-slate-900 hover:bg-green-400'
        },
        warning: { 
          icon: 'bi-exclamation-triangle-fill', 
          iconContainer: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
          button: 'bg-amber-500 text-slate-900 hover:bg-amber-400'
        },
        error: { 
          icon: 'bi-x-circle-fill', 
          iconContainer: 'bg-red-500/10 border-red-500/20 text-red-500',
          button: 'bg-red-500 text-white hover:bg-red-600'
        },
        confirm: { 
          icon: 'bi-question-circle-fill', 
          iconContainer: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
          button: 'bg-blue-500 text-white hover:bg-blue-600'
        }
      }
    }
  },
  computed: {
    isConfirm() { return this.type === 'confirm' || this.type === 'warning' && this.confirmText; }
  },
  methods: {
    handleConfirm() {
      this.$emit('confirm');
      this.$emit('update:modelValue', false);
    },
    handleCancel() {
      this.$emit('cancel');
      this.$emit('update:modelValue', false);
    }
  }
}
</script>

<style scoped>
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-scale-in { animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

.modal-bounce-enter-active { transition: all 0.3s ease; }
.modal-bounce-leave-active { transition: all 0.2s ease; }
.modal-bounce-enter-from, .modal-bounce-leave-to { opacity: 0; }
</style>
