<template>
  <div class="pt-24 pb-16 min-h-screen bg-slate-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="mb-12 text-center max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-black uppercase tracking-widest mb-6">Para Locales</div>
        <h1 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Conviértete en <span class="text-brand-500">Punto Easypoint</span></h1>
        <p class="text-lg text-slate-600">Monetiza tu local y atrae clientes a tu puerta todos los días.</p>
      </div>
      
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mb-6"><i class="bi bi-people-fill"></i></div>
          <h3 class="text-xl font-bold mb-2">Tráfico Garantizado</h3>
          <p class="text-slate-600">Personas de tu colonia entrarán a tu local a recoger paquetes. Muchos terminarán comprando algo de paso.</p>
        </div>
        <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div class="w-16 h-16 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center text-3xl mb-6"><i class="bi bi-cash-coin"></i></div>
          <h3 class="text-xl font-bold mb-2">Ingreso Extra</h3>
          <p class="text-slate-600">Te pagamos por cada paquete que recibas y entregues correctamente. Sin cuotas ocultas.</p>
        </div>
        <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div class="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-3xl mb-6"><i class="bi bi-phone"></i></div>
          <h3 class="text-xl font-bold mb-2">App de Gestión</h3>
          <p class="text-slate-600">Escaneo MXL instantáneo y gestión de inventario desde tu celular.</p>
        </div>
        <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div class="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center text-3xl mb-6"><i class="bi bi-graph-up-arrow"></i></div>
          <h3 class="text-xl font-bold mb-2">Analytics & Pagos</h3>
          <p class="text-slate-600">Dashboard detallado de tus ganancias y depósitos semanales.</p>
        </div>
      </div>

      <div class="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-center shadow-xl">
        <h2 class="text-3xl font-black text-white mb-6">¿Tu local cumple los requisitos?</h2>
        <ul class="text-slate-400 text-left max-w-lg mx-auto space-y-4 mb-10 font-medium">
          <li class="flex items-center gap-3"><i class="bi bi-check-circle-fill text-brand-400"></i> Espacio seguro de al menos 1m² para guardar paquetes</li>
          <li class="flex items-center gap-3"><i class="bi bi-check-circle-fill text-brand-400"></i> Horario de apertura de al menos 6 horas diarias</li>
          <li class="flex items-center gap-3"><i class="bi bi-check-circle-fill text-brand-400"></i> Celular o tablet con conexión a internet</li>
          <li class="flex items-center gap-3"><i class="bi bi-check-circle-fill text-brand-400"></i> Actitud de servicio al cliente</li>
        </ul>
        <button @click="$emit('open-modal', 'partner')" class="bg-brand-500 text-slate-900 px-8 py-4 rounded-xl text-lg font-black hover:bg-brand-400 transition-all">Solicitar Afiliación Hoy</button>
      </div>
    </div>
  </div>
</template>

<script>
export default { emits: ['open-modal'] }
</script>
