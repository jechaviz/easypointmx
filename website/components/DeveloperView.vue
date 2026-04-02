<template>
  <div class="pt-24 min-h-screen bg-white">
     <div class="max-w-7xl mx-auto px-4 py-12">
        <div class="flex items-center gap-4 mb-8">
           <div class="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-slate-900 text-2xl shadow-lg"><i class="bi bi-code-slash"></i></div>
           <h1 class="text-4xl font-black text-slate-900">Developer Portal</h1>
        </div>
        <div id="redoc-container" class="border rounded-3xl overflow-hidden shadow-xl bg-slate-50 min-h-[800px]"></div>
     </div>
  </div>
</template>

<script>
export default {
  mounted() {
    if (!window.Redoc) {
      const script = document.createElement('script');
      script.src = 'https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js';
      script.onload = () => this.initRedoc();
      document.head.appendChild(script);
    } else {
      this.initRedoc();
    }
  },
  methods: {
    initRedoc() {
      Redoc.init('/easypoint/app/openapi.json', {
        theme: {
          colors: { 
            primary: { main: '#84cc16' },
            text: { primary: '#0f172a' }
          },
          typography: { 
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px'
          },
          rightPanel: { backgroundColor: '#0f172a' }
        }
      }, document.getElementById('redoc-container'));
    }
  }
}
</script>
