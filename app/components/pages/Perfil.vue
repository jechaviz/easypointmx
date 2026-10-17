<template>
  <div class="grid g2" style="--gap:20px;max-width:900px" id="pf">
    <section class="card card-pad stack" style="--gap:12px"><div class="row" style="gap:14px"><span class="av">{{ EP.fmt.initials(u.name || u.email) }}</span><div><b class="h3">{{ u.name || '—' }}</b><div class="small muted">{{ u.email }}</div><span class="chip" style="margin-top:6px">{{ u.role }}</span></div></div>
      <div class="divider"></div><div class="row between"><span>Tema</span><div class="seg"><button :class="{ on: EP.theme.value === 'light' }" @click="th('light')">Claro</button><button :class="{ on: EP.theme.value === 'auto' }" @click="th('auto')">Auto</button><button :class="{ on: EP.theme.value === 'dark' }" @click="th('dark')">Oscuro</button></div></div>
      <button v-if="canInstall" class="btn btn-soft" @click="install"><ep-ico name="download" :size="18" /> Instalar el panel como app</button>
      <button class="btn btn-ghost" @click="out"><ep-ico name="logout" :size="18" /> Cerrar sesión</button></section>
    <form class="card card-pad stack" style="--gap:12px" @submit.prevent="change"><h3 class="h3">Cambiar contraseña</h3>
      <div class="field"><label>Actual</label><input class="input" type="password" v-model="f.current" autocomplete="current-password" /></div>
      <div class="field"><label>Nueva</label><input class="input" type="password" v-model="f.new" autocomplete="new-password" /><div class="help">Mínimo 8 caracteres.</div></div>
      <div class="error" v-if="error">{{ error }}</div><button class="btn btn-primary" :class="{ 'is-loading': busy }">Guardar</button></form>
  </div>
</template>
<script>
export default {
  data() { return { EP, f: { current: '', new: '' }, busy: false, error: '', canInstall: !!window.__epInstall }; },
  computed: { u() { return EP.session.user; } },
  mounted() { window.addEventListener('ep-installable', () => { this.canInstall = true; }); },
  methods: {
    th(t) { EP.theme.value = t; EP.applyTheme(); },
    async install() { const p = window.__epInstall; if (p) { p.prompt(); await p.userChoice; window.__epInstall = null; this.canInstall = false; } },
    async out() { EP.logout(); EP.go('/login'); },
    async change() { this.error = ''; this.busy = true; try { await EP.post('/auth/password', this.f); EP.toast('Contraseña actualizada', 'ok'); this.f = { current: '', new: '' }; } catch (e) { this.error = e.message; } finally { this.busy = false; } }
  }
};
</script>
<style scoped>.av { width: 56px; height: 56px; border-radius: 50%; background: var(--brand); color: var(--on-brand); display: grid; place-items: center; font-weight: 900; font-size: 1.1rem; } @media (max-width: 760px) { #pf { grid-template-columns: 1fr !important; } }</style>
