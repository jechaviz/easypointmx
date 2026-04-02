<template>
  <div class="pt-32 pb-16 min-h-screen bg-slate-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col lg:flex-row items-center gap-16 mb-20">
        <div class="lg:w-1/2">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-black uppercase tracking-widest mb-6">Para E-commerce</div>
          <h1 class="text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">Reduce 100% las <span class="text-brand-500">entregas fallidas</span>.</h1>
          <p class="text-xl text-slate-600 mb-8 leading-relaxed">Ofrece a tus clientes la libertad de recoger sus compras en más de 1,000 Puntos Easypoint. Aumenta tu conversión, fideliza clientes y reduce drásticamente tus gastos de logística inversa.</p>
          <div class="flex flex-col sm:flex-row gap-4">
            <button @click="$emit('open-modal', 'b2b')" class="bg-brand-500 text-slate-900 px-8 py-4 rounded-xl text-lg font-black hover:bg-brand-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">Contactar Ventas B2B <i class="bi bi-person-badge"></i></button>
            <button @click="$emit('navigate', '/developers')" class="bg-white text-slate-900 border-2 border-slate-200 px-8 py-4 rounded-xl text-lg font-bold hover:border-slate-300 transition-all">Ver Integraciones</button>
          </div>
        </div>
        <div class="lg:w-1/2 relative">
          <div class="absolute inset-0 bg-brand-200 rounded-full blur-3xl opacity-30 transform translate-x-10 translate-y-10"></div>
          <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800" alt="Ecommerce logistics" class="rounded-[2.5rem] shadow-2xl relative z-10 border border-white/50">
        </div>
      </div>

      <!-- Features -->
      <div class="grid md:grid-cols-3 gap-8 mb-20">
        <div class="bg-slate-900 p-8 rounded-3xl text-white transform hover:-translate-y-2 transition-transform duration-300">
          <div class="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-slate-900 mb-6 font-black text-xl">1</div>
          <h3 class="text-xl font-bold mb-3">Selector de Mapa</h3>
          <p class="text-slate-400 text-sm">Integra un buscador de puntos nativo en tu checkout (Shopify/Woo). Tus clientes eligen visualmente.</p>
        </div>
        <div class="bg-slate-900 p-8 rounded-3xl text-white transform hover:-translate-y-2 transition-transform duration-300">
          <div class="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-slate-900 mb-6 font-black text-xl">2</div>
          <h3 class="text-xl font-bold mb-3">Seguimiento MXL</h3>
          <p class="text-slate-400 text-sm">Notificaciones automáticas con el ID de rastreo MXL único para cada paquete.</p>
        </div>
        <div class="bg-slate-900 p-8 rounded-3xl text-white transform hover:-translate-y-2 transition-transform duration-300">
          <div class="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-slate-900 mb-6 font-black text-xl">3</div>
          <h3 class="text-xl font-bold mb-3">Plugin One-Click</h3>
          <p class="text-slate-400 text-sm">Instalación inmediata. Sin código. Compatible con las principales plataformas de México.</p>
        </div>
      </div>

      <!-- Comparison / Stats -->
      <div class="bg-white rounded-[3rem] p-10 md:p-16 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-12 items-center">
        <div class="md:w-1/2">
           <h2 class="text-3xl font-black text-slate-900 mb-6">Eficiencia Logística Humana</h2>
           <div class="space-y-6">
              <div class="flex items-start gap-4">
                 <div class="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 mt-1"><i class="bi bi-check-lg"></i></div>
                 <p class="text-slate-600 font-medium"><strong>+25% Conversión:</strong> Los clientes prefieren opciones flexibles y baratas.</p>
              </div>
              <div class="flex items-start gap-4">
                 <div class="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 mt-1"><i class="bi bi-check-lg"></i></div>
                 <p class="text-slate-600 font-medium"><strong>-40% Costos:</strong> Entregar múltiples paquetes en un solo punto destruye el costo de última milla.</p>
              </div>
           </div>
        </div>
        <div class="md:w-1/2 grid grid-cols-2 gap-4">
           <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
              <div class="text-3xl font-black text-slate-900">0%</div>
              <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Fallas</div>
           </div>
           <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
              <div class="text-3xl font-black text-slate-900">100%</div>
              <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Seguro</div>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default { emits: ['open-modal', 'navigate'] }
</script>
