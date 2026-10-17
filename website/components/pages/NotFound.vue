<template>
  <div class="container center section stack">
    <div style="font-size:4rem">🧭</div>
    <h1 class="h2">Esta ruta no existe</h1>
    <p class="lead" style="margin-inline:auto">Puede que el enlace haya cambiado. Vuelve al inicio o escríbenos si necesitas ayuda.</p>
    <div class="row" style="justify-content:center;gap:10px"><a :href="EP.href('/')" class="btn btn-primary">Ir al inicio</a><a :href="EP.href('/ayuda')" class="btn btn-ghost">Ayuda</a></div>
  </div>
</template>
<script>export default { data() { return { EP }; } };</script>
