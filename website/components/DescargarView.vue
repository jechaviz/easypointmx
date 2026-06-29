<template>
  <div class="pt-32 pb-16 min-h-screen bg-slate-50">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

      <div class="text-center max-w-2xl mx-auto mb-12">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-black uppercase tracking-widest mb-6">App Easypoint</div>
        <h1 class="text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">Lleva Easypoint en tu <span class="text-brand-500">teléfono</span>.</h1>
        <p class="text-xl text-slate-600">Instala la app para rastrear envíos, comprar guías y reservar excursiones — rápido, sin abrir el navegador.</p>
      </div>

      <!-- Instalar (PWA) -->
      <div class="bg-slate-900 rounded-[2.5rem] p-10 md:p-14 text-center mb-10 shadow-2xl">
        <div class="w-20 h-20 mx-auto mb-6 rounded-[1.5rem] bg-brand-500 flex items-center justify-center text-slate-900 text-4xl shadow-lg shadow-brand-500/30"><i class="bi bi-box-seam-fill"></i></div>
        <h2 class="text-2xl font-black text-white mb-2">Instalar ahora</h2>
        <p class="text-slate-400 mb-8 max-w-md mx-auto">Funciona en Android, iPhone y computadora. Se instala como app, sin tienda.</p>
        <button @click="install" class="bg-brand-500 text-slate-900 font-black px-10 py-4 rounded-2xl text-lg hover:bg-brand-400 transition-all inline-flex items-center gap-3 shadow-xl">
          <i class="bi bi-download"></i> {{ installable ? 'Instalar app' : 'Cómo instalar' }}
        </button>
        <p v-if="installed" class="text-brand-400 text-sm font-bold mt-4"><i class="bi bi-check-circle-fill"></i> ¡App instalada! Búscala en tu pantalla de inicio.</p>
        <p v-if="hint" class="text-slate-300 text-sm mt-4 max-w-md mx-auto">{{ hint }}</p>
      </div>

      <!-- Instrucciones por plataforma -->
      <div class="grid md:grid-cols-3 gap-6 mb-12">
        <div class="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm">
          <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 text-2xl mb-5"><i class="bi bi-android2"></i></div>
          <h3 class="font-black text-slate-900 mb-2">Android</h3>
          <p class="text-sm text-slate-500">Toca <strong>Instalar app</strong>, o desde el menú ⋮ de Chrome elige <strong>"Instalar aplicación"</strong>.</p>
        </div>
        <div class="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm">
          <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 text-2xl mb-5"><i class="bi bi-apple"></i></div>
          <h3 class="font-black text-slate-900 mb-2">iPhone / iPad</h3>
          <p class="text-sm text-slate-500">En Safari toca <strong>Compartir</strong> <i class="bi bi-box-arrow-up"></i> y luego <strong>"Agregar a inicio"</strong>.</p>
        </div>
        <div class="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm">
          <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 text-2xl mb-5"><i class="bi bi-laptop"></i></div>
          <h3 class="font-black text-slate-900 mb-2">Computadora</h3>
          <p class="text-sm text-slate-500">En Chrome/Edge usa el ícono <strong>instalar</strong> <i class="bi bi-download"></i> de la barra de direcciones.</p>
        </div>
      </div>

      <!-- App nativa (próximamente) -->
      <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 class="text-lg font-black text-slate-900 mb-1">App nativa (Android / iOS)</h3>
          <p class="text-sm text-slate-500">Estamos preparando la app nativa para las tiendas. Mientras, la app instalable tiene todo lo que necesitas.</p>
        </div>
        <div class="flex gap-3 shrink-0">
          <span class="inline-flex items-center gap-2 bg-slate-100 text-slate-400 font-bold px-5 py-3 rounded-xl text-sm cursor-default"><i class="bi bi-google-play"></i> Próximamente</span>
          <span class="inline-flex items-center gap-2 bg-slate-100 text-slate-400 font-bold px-5 py-3 rounded-xl text-sm cursor-default"><i class="bi bi-apple"></i> Próximamente</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      installable: Boolean(window.__epInstallPrompt),
      installed: false,
      hint: ''
    };
  },
  mounted() {
    window.addEventListener('ep-installable', this.onInstallable);
    window.addEventListener('appinstalled', this.onInstalled);
  },
  unmounted() {
    window.removeEventListener('ep-installable', this.onInstallable);
    window.removeEventListener('appinstalled', this.onInstalled);
  },
  methods: {
    onInstallable() { this.installable = Boolean(window.__epInstallPrompt); },
    onInstalled() { this.installed = true; this.installable = false; this.hint = ''; },
    async install() {
      const prompt = window.__epInstallPrompt;
      if (prompt) {
        prompt.prompt();
        try {
          const choice = await prompt.userChoice;
          if (choice && choice.outcome === 'accepted') this.installed = true;
        } catch (_) {}
        window.__epInstallPrompt = null;
        this.installable = false;
        return;
      }
      // Sin prompt nativo (iOS u otros): mostrar guía contextual.
      const ua = navigator.userAgent || '';
      if (/iPhone|iPad|iPod/i.test(ua)) {
        this.hint = 'En iPhone: toca Compartir (cuadro con flecha) y luego "Agregar a pantalla de inicio".';
      } else if (/Android/i.test(ua)) {
        this.hint = 'En Android: abre el menú ⋮ de Chrome y elige "Instalar aplicación".';
      } else {
        this.hint = 'En tu navegador de escritorio usa el ícono de instalar en la barra de direcciones.';
      }
    }
  }
}
</script>
