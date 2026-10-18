<template>
  <div class="shell">
    <a href="#main" class="sr">Saltar al contenido</a>
    <div class="progress-top" :style="{ width: prog + '%' }"></div>
    <header class="head" :class="{ solid: scrolled || open || !isHome }">
      <div class="container row between head-in">
        <a :href="EP.href('/')" class="brand row" aria-label="Easypoint, inicio">
          <img :src="logo" width="34" height="34" alt="" />
          <span class="wm">easy<b>point</b></span>
        </a>
        <nav class="nav hide-sm" aria-label="Principal">
          <a v-for="l in links" :key="l.to" :href="EP.href(l.to)" :class="{ on: active(l.to) }">{{ l.label }}</a>
        </nav>
        <div class="row" style="gap:8px">
          <ep-theme class="hide-sm" />
          <a :href="EP.href('/voucher')" class="btn btn-dark btn-sm hide-sm"><ep-ico name="qr" :size="16" /> Mi voucher</a>
          <button class="btn btn-ghost btn-sm only-sm" @click="open = !open" :aria-expanded="open" aria-label="Menú"><ep-ico :name="open ? 'x' : 'menu'" /></button>
        </div>
      </div>
      <div v-if="open" class="mobile only-sm">
        <a v-for="l in links" :key="l.to" :href="EP.href(l.to)" @click="open = false">{{ l.label }}</a>
        <a :href="EP.href('/voucher')" @click="open = false"><b>Mi voucher</b></a>
        <a :href="EP.href('/descargar')" @click="open = false">Instalar la app</a>
        <div class="row" style="padding:8px 4px"><ep-theme /></div>
      </div>
    </header>

    <main id="main">
      <div class="page-anim" :key="pageKey"><component :is="EP.view.comp" /></div>
    </main>

    <footer class="foot">
      <div class="container grid g4" style="--gap:32px">
        <div>
          <div class="brand row"><img :src="logo" width="34" height="34" alt="" /><span class="wm">easy<b>point</b></span></div>
          <p class="small muted mt-2" style="max-width:30ch">Tu ciudad, a un punto de distancia. Paquetes, guías, servicios y excursiones con apartado.</p>
          <div class="row mt-2" style="gap:8px">
            <a v-if="wa" class="btn btn-soft btn-sm" :href="wa" target="_blank" rel="noopener"><ep-ico name="message" :size="16" /> WhatsApp</a>
            <a class="btn btn-ghost btn-sm" :href="EP.href('/descargar')"><ep-ico name="download" :size="16" /> App</a>
          </div>
        </div>
        <div class="stack" style="--gap:8px"><b class="small">Para ti</b>
          <a :href="EP.href('/excursiones')">Excursiones</a><a :href="EP.href('/envia')">Enviar paquete</a><a :href="EP.href('/rastreo')">Rastrear</a><a :href="EP.href('/servicios')">Servicios</a><a :href="EP.href('/club')">Club</a></div>
        <div class="stack" style="--gap:8px"><b class="small">Para negocios</b>
          <a :href="EP.href('/afiliate')">Sé un punto Easypoint</a><a :href="EP.href('/afiliate?t=proveedor')">Publica tus experiencias</a><a :href="EP.href('/afiliate?t=ecommerce')">E-commerce y API</a><a :href="EP.href('/puntos')">Mapa de puntos</a></div>
        <div class="stack" style="--gap:8px"><b class="small">Confianza</b>
          <a :href="EP.href('/ayuda')">Ayuda</a><a :href="EP.href('/legal/condiciones')">Condiciones</a><a :href="EP.href('/legal/privacidad')">Privacidad</a><a :href="EP.href('/legal/credito')">Política de crédito</a></div>
      </div>
      <div class="container tiny muted row between wrap" style="margin-top:32px;padding-top:18px;border-top:1px solid var(--line)">
        <span>© {{ new Date().getFullYear() }} Easypoint. Hecho en México.</span>
        <a :href="appUrl" class="link">Acceso para puntos, choferes y proveedores →</a>
      </div>
    </footer>

    <a v-if="wa" class="wa-fab" :href="wa" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp"><ep-ico name="message" :size="26" /></a>
    <ep-dialogs /><ep-demobar />
  </div>
</template>
<script>
export default {
  data() {
    return {
      EP, logo: EP.root + 'website/icon.svg', open: false, scrolled: false, prog: 0,
      links: [
        { to: '/excursiones', label: 'Excursiones' }, { to: '/envia', label: 'Envía' }, { to: '/rastreo', label: 'Rastrea' },
        { to: '/puntos', label: 'Puntos' }, { to: '/servicios', label: 'Servicios' }, { to: '/club', label: 'Club' }, { to: '/afiliate', label: 'Afíliate' }
      ]
    };
  },
  computed: {
    isHome() { return EP.route.path === '/'; },
    pageKey() { return EP.route.path + (EP.view.name === 'afiliate' ? '' : JSON.stringify(EP.route.query)); },
    wa() {
      const n = EP.config['brand.whatsapp'] || (window.EASYPOINT_RUNTIME_CONFIG || {}).contactWhatsapp || '';
      return String(n).replace(/\D/g, '').length >= 10 ? EP.wa(n, 'Hola Easypoint, necesito ayuda con…') : '';
    },
    appUrl() { return EP.root + 'app/'; }
  },
  mounted() {
    this._s = () => { this.scrolled = window.scrollY > 24; const h = document.documentElement; this.prog = Math.min(100, (window.scrollY / Math.max(1, h.scrollHeight - h.clientHeight)) * 100); };
    window.addEventListener('scroll', this._s, { passive: true }); this._s();
    window.addEventListener('hashchange', () => { this.open = false; });
  },
  beforeUnmount() { window.removeEventListener('scroll', this._s); },
  methods: { active(to) { return EP.route.path === to || EP.route.path.startsWith(to + '/'); } }
};
</script>
<style>
.shell { min-height: 100vh; display: flex; flex-direction: column; }
.shell main { flex: 1; }
.progress-top { position: fixed; top: 0; left: 0; height: 3px; background: linear-gradient(90deg, var(--brand), var(--accent)); z-index: 90; transition: width .1s linear; }
.head { position: sticky; top: 0; z-index: 80; transition: background .25s, box-shadow .25s, backdrop-filter .25s; background: transparent; }
.head.solid { background: color-mix(in srgb, var(--bg) 82%, transparent); backdrop-filter: blur(16px) saturate(1.5); box-shadow: 0 1px 0 var(--line); }
.head-in { height: 68px; }
.brand { gap: 10px; font-weight: 800; letter-spacing: -.02em; }
.wm { font-size: 1.35rem; font-weight: 500; } .wm b { font-weight: 900; color: var(--brand-2); }
.nav { display: flex; gap: 2px; }
.nav a { padding: 8px 14px; border-radius: 999px; font-weight: 600; font-size: .92rem; color: var(--ink-2); transition: background .15s, color .15s; }
.nav a:hover { background: color-mix(in srgb, var(--ink) 6%, transparent); }
.nav a.on { background: var(--ink); color: var(--bg); }
.mobile { display: grid !important; gap: 2px; padding: 8px 16px 18px; border-top: 1px solid var(--line); background: var(--bg); }
.mobile a { padding: 12px 8px; font-weight: 600; border-radius: 10px; } .mobile a:active { background: var(--bg-2); }
.foot { background: var(--bg-2); border-top: 1px solid var(--line); padding: 56px 0 32px; margin-top: 40px; }
.foot .stack a { display: block; font-size: .92rem; color: var(--ink-2); padding: 2px 0; } .foot a { color: var(--ink-2); } .foot a:hover { color: var(--brand-3); }
.wa-fab { position: fixed; right: 18px; bottom: 18px; z-index: 70; width: 56px; height: 56px; border-radius: 50%; background: #25d366; color: #fff; display: grid; place-items: center; box-shadow: 0 10px 30px rgba(37,211,102,.45); transition: transform .2s var(--ease); }
.wa-fab:hover { transform: scale(1.08) rotate(-6deg); }
.page-anim { animation: pageIn .28s ease; }
@keyframes pageIn { from { transform: translateY(8px); } }
</style>
