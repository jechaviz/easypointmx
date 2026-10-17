<template>
  <div class="container section" style="max-width:860px">
    <div class="stack center" style="--gap:14px"><img :src="logo" width="84" height="84" alt="" style="margin-inline:auto;border-radius:22px;box-shadow:var(--shadow-2)" /><h1 class="h2">Easypoint en tu pantalla de inicio</h1><p class="lead" style="margin-inline:auto">Instala la app (PWA): abre al instante, funciona con conexión débil y no ocupa espacio como una app de tienda.</p>
      <button v-if="canInstall" class="btn btn-primary btn-lg" style="margin-inline:auto" @click="install"><ep-ico name="download" :size="20" /> Instalar ahora</button></div>
    <div class="grid g3 mt-4" style="--gap:16px">
      <div class="card card-pad stack" style="--gap:6px"><b>🤖 Android (Chrome)</b><span class="small muted">Toca el menú ⋮ → «Instalar app» o «Agregar a pantalla principal».</span></div>
      <div class="card card-pad stack" style="--gap:6px"><b>🍎 iPhone (Safari)</b><span class="small muted">Toca Compartir → «Agregar a inicio».</span></div>
      <div class="card card-pad stack" style="--gap:6px"><b>💻 Computadora</b><span class="small muted">En Chrome o Edge, usa el ícono de instalar en la barra de direcciones.</span></div>
    </div>
    <div class="card card-pad mt-3 row between wrap" style="gap:14px"><div><b>¿Eres punto, chofer o proveedor?</b><div class="small muted">Tu panel de trabajo también se instala.</div></div><a :href="EP.root + 'app/'" class="btn btn-dark">Abrir panel de trabajo</a></div>
  </div>
</template>
<script>
export default {
  data() { return { EP, logo: EP.root + 'website/icon.svg', canInstall: !!window.__epInstall }; },
  mounted() { this._h = () => { this.canInstall = true; }; window.addEventListener('ep-installable', this._h); },
  beforeUnmount() { window.removeEventListener('ep-installable', this._h); },
  methods: { async install() { const p = window.__epInstall; if (!p) return; p.prompt(); await p.userChoice; window.__epInstall = null; this.canInstall = false; } }
};
</script>
