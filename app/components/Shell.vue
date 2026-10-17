<template>
  <div>
    <div v-if="!authed" class="auth-wrap"><div class="page-anim" :key="EP.route.path"><component :is="EP.view.comp" /></div><ep-dialogs /></div>
    <div v-else class="app" :class="{ nav: navOpen }">
      <aside class="side" aria-label="Menú">
        <a :href="EP.href('/')" class="brand row"><img :src="logo" width="32" height="32" alt="" /><span class="wm">easy<b>point</b></span></a>
        <nav class="menu">
          <a v-for="m in menu" :key="m.to" :href="EP.href(m.to)" :class="{ on: active(m.to) }" @click="navOpen = false"><ep-ico :name="m.i" :size="19" /><span>{{ m.t }}</span><b class="cnt" v-if="m.to === '/' && openTasks">{{ openTasks }}</b></a>
          <template v-if="adminLinks.length"><div class="sec">Administración</div>
            <a v-for="m in adminLinks" :key="m.to" :href="EP.href(m.to)" :class="{ on: active(m.to) }" @click="navOpen = false"><ep-ico :name="m.i" :size="19" /><span>{{ m.t }}</span></a></template>
        </nav>
        <div class="who">
          <a :href="EP.href('/perfil')" class="row grow" style="gap:8px;min-width:0" title="Mi perfil"><div class="av">{{ EP.fmt.initials(user.name || user.email) }}</div>
          <div class="grow" style="min-width:0"><b class="small" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ user.name || user.email }}</b><div class="tiny muted">{{ roleLabel }}</div></div></a>
          <ep-theme /><button class="btn btn-ghost btn-sm" @click="logout" aria-label="Salir" title="Salir"><ep-ico name="logout" :size="16" /></button>
        </div>
      </aside>
      <div class="main">
        <header class="top">
          <button class="btn btn-ghost btn-sm only-sm" @click="navOpen = !navOpen" aria-label="Menú"><ep-ico name="menu" /></button>
          <h1 class="h3 grow">{{ EP.view.title }}</h1>
          <a :href="EP.href('/')" class="btn btn-ghost btn-sm" v-if="openTasks"><ep-ico name="bell" :size="16" /> {{ openTasks }} por hacer</a>
          <span class="chip" :class="{ 'b-ok': online }"><i class="dot" v-if="online"></i>{{ online ? 'En línea' : 'Sin conexión' }}</span>
        </header>
        <main class="content"><div class="page-anim" :key="EP.route.path"><component :is="EP.view.comp" /></div></main>
      </div>
      <nav class="tabbar only-sm" aria-label="Atajos">
        <a v-for="m in menu.slice(0, 5)" :key="m.to" :href="EP.href(m.to)" :class="{ on: active(m.to) }"><ep-ico :name="m.i" :size="22" /><span>{{ m.t }}</span></a>
      </nav>
      <div class="scrim only-sm" v-if="navOpen" @click="navOpen = false"></div>
      <ep-dialogs />
    </div>
  </div>
</template>
<script>
const MENUS = {
  admin: [['/', 'Hoy', 'home'], ['/economia', 'Economía', 'chart'], ['/reservas', 'Reservas', 'ticket'], ['/clientes', 'Clientes', 'users'], ['/efectivo', 'Efectivo', 'cash'], ['/liquidaciones', 'Liquidaciones', 'wallet'], ['/tickets', 'Tickets', 'message'], ['/aspirantes', 'Aspirantes', 'store'], ['/campanas', 'Campañas', 'sparkles'], ['/bandeja', 'Bandeja', 'inbox'], ['/riesgo', 'Riesgo', 'alert'], ['/automatizacion', 'Automatización', 'zap'], ['/ruta', 'Ruta', 'route'], ['/salidas', 'Salidas', 'calendar']],
  operator: [['/', 'Hoy', 'home'], ['/cobrar', 'Cobrar', 'cash'], ['/vender', 'Vender', 'tag'], ['/paquetes', 'Paquetes', 'package'], ['/caja', 'Mi caja', 'wallet']],
  driver: [['/', 'Hoy', 'home'], ['/ruta', 'Ruta', 'route']],
  provider: [['/', 'Hoy', 'home'], ['/salidas', 'Salidas', 'calendar'], ['/excursiones', 'Excursiones', 'mountain'], ['/reservas', 'Reservas', 'ticket'], ['/liquidaciones', 'Liquidaciones', 'wallet']],
  sales: [['/', 'Hoy', 'home'], ['/aspirantes', 'Aspirantes', 'store'], ['/clientes', 'Clientes', 'users'], ['/campanas', 'Campañas', 'sparkles'], ['/bandeja', 'Bandeja', 'inbox']],
  support: [['/', 'Hoy', 'home'], ['/tickets', 'Tickets', 'message'], ['/reservas', 'Reservas', 'ticket'], ['/clientes', 'Clientes', 'users'], ['/bandeja', 'Bandeja', 'inbox']]
};
const ADMIN = [['/admin/points', 'Puntos', 'pin'], ['/admin/providers', 'Proveedores', 'users'], ['/admin/excursions', 'Excursiones', 'mountain'], ['/admin/departures', 'Fechas de salida', 'calendar'], ['/admin/services', 'Servicios', 'layers'], ['/admin/pricing_rules', 'Precios y promos', 'percent'], ['/admin/users', 'Usuarios', 'user'], ['/admin/partners', 'Socios API', 'link'], ['/admin/wallets', 'Monederos', 'wallet'], ['/admin/events', 'Eventos', 'list'], ['/admin/audit', 'Auditoría', 'shield'], ['/admin/jobs', 'Tareas diferidas', 'clock']];
const ROLE = { admin: 'Administrador', operator: 'Punto', driver: 'Chofer', provider: 'Proveedor', sales: 'Ventas', support: 'Soporte' };
export default {
  data() { return { EP, logo: EP.root + 'website/icon.svg', navOpen: false, openTasks: 0, online: navigator.onLine }; },
  computed: {
    authed() { return !!EP.session.token && !!EP.session.user && EP.view.name !== '/login' && EP.view.name !== '/reset'; },
    user() { return EP.session.user || {}; },
    roleLabel() { return ROLE[this.user.role] || this.user.role; },
    menu() { return (MENUS[this.user.role] || MENUS.support).map(([to, t, i]) => ({ to, t, i })); },
    adminLinks() { return this.user.role === 'admin' ? ADMIN.map(([to, t, i]) => ({ to, t, i })) : (this.user.role === 'sales' ? ADMIN.slice(0, 1).map(([to, t, i]) => ({ to, t, i })) : []); }
  },
  watch: { authed(v) { if (v) this.poll(); }, 'EP.route.path'() { if (this.authed) this.poll(); } },
  mounted() {
    window.addEventListener('online', () => { this.online = true; }); window.addEventListener('offline', () => { this.online = false; });
    if (this.authed) this.poll(); this._p = setInterval(() => { if (this.authed && !document.hidden) this.poll(); }, 60000);
  },
  beforeUnmount() { clearInterval(this._p); },
  methods: {
    active(to) { return to === '/' ? EP.route.path === '/' : EP.route.path === to || EP.route.path.startsWith(to + '/'); },
    async poll() { try { const r = await EP.get('/tasks?status=open'); this.openTasks = r.total; } catch (_) {} },
    async logout() { if (await EP.confirm('¿Cerrar sesión?', { ok: 'Salir' })) { EP.logout(); EP.go('/login'); } }
  }
};
</script>
<style>
.auth-wrap { min-height: 100vh; }
.app { display: grid; grid-template-columns: 252px 1fr; min-height: 100vh; }
.side { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; background: var(--surface); border-right: 1px solid var(--line); padding: 16px 12px; gap: 14px; }
.brand { gap: 10px; padding: 4px 8px; font-weight: 800; } .wm { font-size: 1.25rem; font-weight: 500; letter-spacing: -.02em; } .wm b { font-weight: 900; color: var(--brand-2); }
.menu { display: grid; gap: 2px; overflow: auto; flex: 1; align-content: start; padding-right: 2px; }
.menu a { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; font-weight: 600; font-size: .92rem; color: var(--ink-2); transition: background .12s, color .12s; }
.menu a:hover { background: var(--bg-2); } .menu a.on { background: var(--ink); color: var(--bg); }
.menu .cnt { margin-left: auto; background: var(--bad); color: #fff; border-radius: 99px; font-size: .7rem; padding: 1px 7px; }
.menu .sec { margin: 14px 12px 4px; font-size: .68rem; text-transform: uppercase; letter-spacing: .12em; color: var(--muted); font-weight: 800; }
.who { display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 14px; background: var(--bg-2); }
.av { width: 36px; height: 36px; border-radius: 50%; background: var(--brand); color: var(--on-brand); display: grid; place-items: center; font-weight: 900; font-size: .85rem; flex: none; }
.main { min-width: 0; display: flex; flex-direction: column; }
.top { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 12px; padding: 14px 24px; background: color-mix(in srgb, var(--bg) 85%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
.content { padding: 24px; max-width: 1280px; width: 100%; margin: 0 auto; }
.page-anim { animation: pageIn .26s ease; } @keyframes pageIn { from { transform: translateY(8px); } }
.tabbar { display: none; }
@media (max-width: 860px) {
  .app { grid-template-columns: 1fr; }
  .side { position: fixed; z-index: 60; inset: 0 auto 0 0; width: 280px; transform: translateX(-102%); transition: transform .25s var(--ease); box-shadow: var(--shadow-3); }
  .app.nav .side { transform: none; }
  .scrim { position: fixed; inset: 0; background: rgba(5,9,18,.5); z-index: 55; }
  .content { padding: 16px 14px 96px; } .top { padding: 10px 14px; }
  .tabbar { display: grid !important; grid-auto-flow: column; grid-auto-columns: 1fr; position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; background: var(--surface); border-top: 1px solid var(--line); padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); }
  .tabbar a { display: grid; justify-items: center; gap: 2px; padding: 6px 2px; border-radius: 12px; font-size: .68rem; font-weight: 700; color: var(--muted); } .tabbar a.on { color: var(--brand-3); background: var(--brand-soft); }
}
</style>
