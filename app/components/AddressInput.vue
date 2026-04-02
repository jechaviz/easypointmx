<template>
  <div class="relative w-full" v-click-outside="close">
    <div class="relative group">
      <i class="bi bi-geo-alt absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 text-xl group-focus-within:text-brand-400 transition-colors z-10"></i>
      <input 
        type="text" 
        v-model="query" 
        @input="onInput"
        @focus="showResults = true"
        class="input-premium pl-14" 
        :placeholder="placeholder || 'Buscar dirección...'"
      >
      <!-- Loading Spinner (Premium Pulse) -->
      <div v-if="loading" class="absolute right-5 top-1/2 -translate-y-1/2 z-10">
        <div class="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    </div>

    <!-- Results Dropdown (Glassmorphism) -->
    <Transition name="slide-up">
      <div v-if="showResults && results.length > 0" class="absolute z-[100] w-full mt-3 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden max-h-[320px] overflow-y-auto custom-scrollbar">
        <div class="p-2">
          <button 
            v-for="res in results" 
            :key="res.place_id"
            @click="select(res)"
            class="w-full px-5 py-4 text-left hover:bg-slate-800/80 transition-all rounded-2xl flex items-start gap-4 group mb-1 last:mb-0"
          >
            <div class="w-8 h-8 shrink-0 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-brand-500 group-hover:text-slate-900 transition-colors">
              <i class="bi bi-pin-map text-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
               <p class="text-white text-xs font-black truncate mb-1 group-hover:text-brand-400 transition-colors">{{ res.display_name.split(',')[0] }}</p>
               <p class="text-slate-500 text-[9px] font-bold uppercase tracking-tight leading-normal truncate">{{ res.display_name.split(',').slice(1).join(',').trim() }}</p>
            </div>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
export default {
  props: ['modelValue', 'placeholder'],
  emits: ['update:modelValue', 'select'],
  data() {
    return {
      query: this.modelValue || '',
      results: [],
      loading: false,
      showResults: false,
      timeout: null
    }
  },
  watch: {
    modelValue(newVal) { if(newVal !== this.query) this.query = newVal; }
  },
  directives: {
    'click-outside': {
       mounted(el, binding) {
          el._click_outside = (e) => { if (!(el == e.target || el.contains(e.target))) binding.value(); };
          document.addEventListener('click', el._click_outside);
       },
       unmounted(el) { document.removeEventListener('click', el._click_outside); }
    }
  },
  methods: {
    onInput() {
      this.$emit('update:modelValue', this.query);
      if (this.timeout) clearTimeout(this.timeout);
      if (this.query.length < 3) {
        this.results = [];
        return;
      }
      this.timeout = setTimeout(() => this.search(), 500);
    },
    async search() {
      this.loading = true;
      try {
        // Optimized search for Mexico
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.query)}&countrycodes=MX&addressdetails=1&limit=8`);
        this.results = await res.json();
      } catch (e) {
        console.error('Search failed', e);
      } finally {
        this.loading = false;
        this.showResults = true;
      }
    },
    select(res) {
      this.query = res.display_name;
      this.showResults = false;
      this.$emit('update:modelValue', this.query);
      this.$emit('select', res);
    },
    close() { this.showResults = false; }
  }
}
</script>

<style scoped>
.input-premium { 
  width: 100%;
  background-color: rgba(2, 6, 23, 0.6) !important; 
  border: 1px solid rgba(30, 41, 59, 0.8) !important; 
  color: white !important;
  border-radius: 1.2rem;
  padding: 1rem 1.25rem 1rem 3.5rem !important; 
  font-size: 0.875rem;
  outline: none;
  transition: all 0.3s ease;
}
.input-premium:focus {
  border-color: rgba(245, 158, 11, 0.5) !important;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1) !important;
}
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from { opacity: 0; transform: translateY(15px) scale(0.98); }
.slide-up-leave-to { opacity: 0; transform: translateY(10px); }

.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
</style>
