/* Easypoint · núcleo del front (sin build). Define window.EP: API, sesión, rutas, formato, tema, avisos.
   Se carga como script clásico DESPUÉS de Vue, vue3-sfc-loader y vendor/web-common/browser.js. */
(function (global) {
  'use strict';
  const Vue = global.Vue;
  const WC = global.WebCommon || {};
  const RC = global.EASYPOINT_RUNTIME_CONFIG || {};
  const loc = global.location;
  const VERSION = '2.0.0';

  // ── base de la API: <prefijo>/api, donde <prefijo> es lo que antecede a /website o /app ──
  const m = loc.pathname.match(/^(.*?)\/(website|app|demo)(?:\/|$)/);
  const PREFIX = m ? m[1] : '';
  const API = RC.apiBase && /^https?:/.test(RC.apiBase) ? RC.apiBase.replace(/\/$/, '') : PREFIX + '/api';
  const ROOT = PREFIX + '/';

  class ApiError extends Error {
    constructor(status, data) {
      super((data && (data.message || data.error)) || 'Error ' + status);
      this.status = status; this.code = data && data.error; this.data = data;
    }
  }

  const EP = {
    version: VERSION, apiBase: API, root: ROOT, ApiError,
    session: Vue.reactive({ token: '', user: null }),
    config: Vue.reactive({}),
    toasts: Vue.reactive([]),
    dialog: Vue.reactive({ open: false }),
    view: Vue.shallowReactive({ comp: null, name: '', params: {}, title: '' }),
    route: Vue.reactive({ path: '/', query: {}, hash: '' }),
    busy: Vue.reactive({ n: 0 })
  };

  // ── entorno de demostración (aislado del real) ──
  // /demo/ pide la contraseña y guarda un token de entorno (X-EP-Demo). Con él activo, TODA la API (sitio y panel) usa la base de
  // demostración y la sesión se guarda aparte: nada de lo que se haga aquí toca al negocio real, ni al revés.
  const demoStore = WC.createVersionedStorage ? WC.createVersionedStorage('ep-demo', 1) : null;
  EP.demo = Vue.reactive({ active: false, token: '', exp: 0, accounts: [], password: '' });
  (function loadDemo() {
    if (!demoStore) return;
    const r = demoStore.read();
    if (r && r.value && r.value.token && r.value.exp > Date.now()) Object.assign(EP.demo, r.value, { active: true });
    else if (r && r.value) demoStore.write(null);
  })();
  const saveDemo = () => { if (demoStore) demoStore.write(EP.demo.active ? { token: EP.demo.token, exp: EP.demo.exp, accounts: EP.demo.accounts, password: EP.demo.password } : null); };

  // ── almacenamiento (web-common) ──
  // la sesión de la demostración vive en otra clave: nunca se mezcla con la del negocio real
  const sessKey = () => (EP.demo.active ? 'ep-session-demo' : 'ep-session');
  const stores = {};
  const sessStore = () => { const k = sessKey(); return stores[k] || (stores[k] = WC.createVersionedStorage ? WC.createVersionedStorage(k, 2) : null); };
  function loadSession() {
    const store = sessStore(); if (!store) return;
    const r = store.read();
    if (r && r.value && r.value.token) { EP.session.token = r.value.token; EP.session.user = r.value.user; }
  }
  function saveSession() {
    const store = sessStore(); if (!store) return;
    store.write(EP.session.token ? { token: EP.session.token, user: EP.session.user } : null);
  }
  loadSession();

  // ── API ──
  async function api(method, path, body, opts = {}) {
    const headers = { Accept: 'application/json' };
    if (EP.demo.active) headers['X-EP-Demo'] = EP.demo.token;
    if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (EP.session.token && opts.auth !== false) headers.Authorization = 'Bearer ' + EP.session.token;
    let res;
    EP.busy.n++;
    try {
      res = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (e) {
      throw new ApiError(0, { error: 'network', message: 'Sin conexión. Revisa tu internet e intenta de nuevo.' });
    } finally { EP.busy.n--; }
    let data = null;
    const txt = await res.text();
    try { data = txt ? JSON.parse(txt) : null; } catch (_) { data = { error: 'bad_response', message: 'Respuesta inesperada del servidor.' }; }
    if (!res.ok) {
      if (res.status === 401 && data && data.error === 'demo_expired' && EP.demo.active) { EP.demoExit(true); return Promise.reject(new ApiError(401, data)); }
      if (res.status === 401 && EP.session.token && !opts.quiet401) { EP.logout(); EP.go('/login'); }
      throw new ApiError(res.status, data);
    }
    return data;
  }
  EP.api = api;
  EP.get = (p, o) => api('GET', p, undefined, o);
  EP.post = (p, b, o) => api('POST', p, b === undefined ? {} : b, o);
  EP.put = (p, b, o) => api('PUT', p, b, o);
  EP.del = (p, o) => api('DELETE', p, undefined, o);
  EP.qs = (o) => {
    const p = Object.entries(o || {}).filter(([, v]) => v !== '' && v != null && v !== false).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v === true ? 1 : v));
    return p.length ? '?' + p.join('&') : '';
  };

  EP.login = async (email, password) => {
    const r = await api('POST', '/auth/login', { email, password }, { auth: false });
    EP.session.token = r.token; EP.session.user = r.user; saveSession();
    return r.user;
  };
  // Entrar a la demostración (contraseña) → guarda el token de entorno y recarga el modo demo.
  EP.demoEnter = async (password) => {
    const r = await api('POST', '/demo/login', { password }, { auth: false });
    Object.assign(EP.demo, { active: true, token: r.token, exp: Date.now() + r.expires_in * 1000 - 60000, accounts: r.accounts || [], password: r.password || '' });
    saveDemo();
    EP.session.token = ''; EP.session.user = null; // la sesión del negocio real no se arrastra a la demo
    return r;
  };
  // Salir de la demostración: borra el token y la sesión de demo; vuelve a /demo (o al sitio si no se pide pantalla de entrada).
  EP.demoExit = (expired) => {
    try { localStorage.removeItem('ep-session-demo'); } catch (_) {}
    EP.demo.active = false; EP.demo.token = ''; saveDemo();
    EP.session.token = ''; EP.session.user = null;
    loc.href = ROOT + (expired ? 'demo/' : 'website/');
  };
  // Vuelve a sembrar los datos ficticios de la demostración.
  EP.demoReset = async () => { await api('POST', '/demo/reset', {}); EP.logout(); };
  // Entra directo con una de las cuentas ficticias.
  EP.demoAs = async (email) => { const r = await api('POST', '/demo/as', { email }, { auth: false }); EP.setSession(r.token, r.user); return r.user; };
  EP.setSession = (token, user) => { EP.session.token = token; EP.session.user = user; saveSession(); };
  EP.logout = () => { EP.session.token = ''; EP.session.user = null; saveSession(); };
  EP.isRole = (...roles) => !!EP.session.user && roles.includes(EP.session.user.role);

  // ── avisos y diálogos ──
  let toastId = 0;
  EP.toast = (msg, kind = '', ms = 3800) => {
    const id = ++toastId;
    EP.toasts.push({ id, msg, kind });
    setTimeout(() => { const i = EP.toasts.findIndex((t) => t.id === id); if (i >= 0) EP.toasts.splice(i, 1); }, ms);
  };
  EP.err = (e) => EP.toast((e && e.message) || 'Algo salió mal', 'bad', 5200);
  // confirmación asíncrona: await EP.confirm('¿Seguro?', {ok:'Sí', danger:true})
  EP.confirm = (message, o = {}) => new Promise((resolve) => {
    Object.assign(EP.dialog, { open: true, kind: 'confirm', title: o.title || 'Confirmar', message, ok: o.ok || 'Confirmar', cancel: o.cancel || 'Cancelar', danger: !!o.danger, input: null, resolve });
  });
  EP.prompt = (message, o = {}) => new Promise((resolve) => {
    Object.assign(EP.dialog, { open: true, kind: 'prompt', title: o.title || 'Captura', message, ok: o.ok || 'Aceptar', cancel: 'Cancelar', danger: false, input: o.value || '', placeholder: o.placeholder || '', type: o.type || 'text', resolve });
  });

  // ── formato (es-MX) ──
  const nf0 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
  const pd = (s) => { // 'YYYY-MM-DD' o 'YYYY-MM-DD HH:MM:SS' (UTC) → Date
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [y, mo, d] = s.split('-').map(Number); return new Date(y, mo - 1, d); }
    return new Date(String(s).replace(' ', 'T') + 'Z');
  };
  EP.fmt = {
    money: (n) => nf0.format(Number(n) || 0),
    money2: (n) => nf2.format(Number(n) || 0),
    num: (n) => new Intl.NumberFormat('es-MX').format(Number(n) || 0),
    pct: (n) => (Number(n) || 0).toFixed(1).replace(/\.0$/, '') + '%',
    date: (s, o) => { const d = pd(s); return d ? d.toLocaleDateString('es-MX', o || { weekday: 'short', day: 'numeric', month: 'short' }) : ''; },
    dateLong: (s) => { const d = pd(s); return d ? d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''; },
    dt: (s) => { const d = pd(s); return d ? d.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; },
    ago: (s) => {
      const d = pd(s); if (!d) return '';
      const sec = Math.round((Date.now() - d.getTime()) / 1000);
      const a = Math.abs(sec), fut = sec < 0;
      const t = a < 60 ? 'un momento' : a < 3600 ? Math.round(a / 60) + ' min' : a < 86400 ? Math.round(a / 3600) + ' h' : Math.round(a / 86400) + ' d';
      return fut ? 'en ' + t : (a < 60 ? 'justo ahora' : 'hace ' + t);
    },
    phone: (p) => { const d = String(p || '').replace(/\D/g, '').slice(-10); return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : (p || ''); },
    cap: (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1),
    initials: (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase(),
    snake: (s) => String(s || '').replace(/_/g, ' ')
  };
  EP.today = () => new Date().toISOString().slice(0, 10);

  // etiquetas de estado → { texto, tono }
  const ST = {
    new: ['Nueva', 'info'], confirmed: ['Confirmada', 'ok'], cancelled: ['Cancelada', 'bad'], completed: ['Completada', 'ok'],
    pending: ['Pendiente', 'warn'], partial: ['Abonada', 'info'], paid: ['Pagada', 'ok'], credit: ['Crédito', 'brand'], refunded: ['Reembolsada', 'mute'], failed: ['Falló', 'bad'],
    reservado: ['Reservado', 'info'], abonado: ['Abonado', 'info'], pagado: ['Pagado', 'ok'], abordado: ['Abordó', 'ok'], completado: ['Completado', 'ok'], credito: ['Crédito', 'brand'], cancelado: ['Cancelado', 'bad'],
    held_at_point: ['En el punto', 'warn'], collected: ['Con el chofer', 'info'], delivered: ['Entregado', 'ok'], pending_confirm: ['Por confirmar', 'warn'],
    open: ['Abierto', 'warn'], in_progress: ['En curso', 'info'], escalated: ['Escalado', 'bad'], resolved: ['Resuelto', 'ok'], doing: ['En curso', 'info'], done: ['Hecho', 'ok'], dismissed: ['Descartado', 'mute'],
    queued: ['En cola', 'info'], sent: ['Enviado', 'ok'], manual: ['Enviar a mano', 'warn'], skipped: ['Omitido', 'mute'],
    approved: ['Aprobada', 'ok'], rejected: ['Rechazada', 'bad'], active: ['Activo', 'ok'], low: ['Baja', 'mute'], medium: ['Media', 'warn'], high: ['Alta', 'bad'], urgent: ['Urgente', 'bad'], normal: ['Normal', 'info'],
    at_point: ['En el punto', 'warn'], in_transit: ['En camino', 'info'], quoted: ['Cotizada', 'mute'], generated: ['Generada', 'ok'], reviewed: ['Revisada', 'ok'], dormido: ['Dormido', 'mute']
  };
  EP.status = (s) => { const x = ST[s]; return x ? { text: x[0], tone: x[1] } : { text: EP.fmt.cap(EP.fmt.snake(s)), tone: 'mute' }; };

  // ── tema ──
  EP.theme = Vue.ref((() => { try { return localStorage.getItem('ep-theme') || 'auto'; } catch (_) { return 'auto'; } })());
  EP.applyTheme = () => {
    const t = EP.theme.value;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('ep-theme', t); } catch (_) {}
  };
  EP.toggleTheme = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (EP.theme.value === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    EP.theme.value = dark ? 'light' : 'dark'; EP.applyTheme();
  };
  EP.applyTheme();

  // ── router por hash ──
  function parseHash() {
    const raw = (loc.hash || '#/').slice(1) || '/';
    const [p, q] = raw.split('?');
    const query = {};
    (q || '').split('&').filter(Boolean).forEach((kv) => { const [k, v] = kv.split('='); query[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    EP.route.path = '/' + p.replace(/^\/+/, '').replace(/\/+$/, '');
    EP.route.query = query;
  }
  EP.go = (path, replace) => {
    const safe = WC.safeInternalPath ? WC.safeInternalPath(path, '/') : path;
    if (replace) loc.replace('#' + safe); else loc.hash = '#' + safe;
    if (!replace && ('#' + safe) === loc.hash) parseHash();
  };
  EP.href = (path) => '#' + path;
  EP.setQuery = (patch) => {
    const q = Object.assign({}, EP.route.query, patch);
    Object.keys(q).forEach((k) => { if (q[k] === '' || q[k] == null) delete q[k]; });
    EP.go(EP.route.path + EP.qs(q), true);
    parseHash();
  };

  // ── carga de componentes SFC ──
  let sfcOptions = null;
  const compCache = {};
  function loader() {
    if (sfcOptions) return sfcOptions;
    const { loadModule } = global['vue3-sfc-loader'];
    sfcOptions = {
      moduleCache: { vue: Vue },
      async getFile(url) {
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + (RC.assetVersion || VERSION));
        if (!res.ok) throw Object.assign(new Error(res.statusText + ' ' + url), { res });
        return { getContentData: (bin) => (bin ? res.arrayBuffer() : res.text()) };
      },
      addStyle(css) { document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css })); },
      handleModule: undefined
    };
    sfcOptions._load = loadModule;
    return sfcOptions;
  }
  EP.comp = (url) => {
    if (!compCache[url]) {
      compCache[url] = Vue.defineAsyncComponent({
        loader: () => { const o = loader(); return o._load(url, o); },
        delay: 80, timeout: 20000,
        errorComponent: { template: '<div class="empty">No pudimos cargar esta sección. <button class="btn btn-sm btn-ghost" onclick="location.reload()">Reintentar</button></div>' }
      });
    }
    return compCache[url];
  };
  EP.loadModule = (url) => { const o = loader(); return o._load(url, o); };

  function matchRoute(routes, path) {
    for (const r of routes) {
      const names = [];
      const re = new RegExp('^' + r.path.replace(/:[^/]+/g, (mm) => { names.push(mm.slice(1)); return '([^/]+)'; }) + '$');
      const mt = path.match(re);
      if (mt) { const params = {}; names.forEach((n, i) => { params[n] = decodeURIComponent(mt[i + 1]); }); return { route: r, params }; }
    }
    return null;
  }

  // ── arranque ──
  EP.boot = async function boot({ routes, shell, base, notFound, guard, onRoute }) {
    // atribución + utilidades de growth-kit (módulos ES vendorizados)
    try {
      EP.gk = await import(ROOT + 'vendor/growth-kit/index.js');
      EP.attr = EP.gk.captureAttribution({ search: loc.search + (loc.hash.includes('?') ? '&' + loc.hash.split('?')[1] : ''), referrer: document.referrer });
    } catch (_) { EP.gk = null; EP.attr = null; }
    EP.utm = () => {
      try { return EP.gk && EP.attr ? JSON.stringify(EP.gk.attributionFields(EP.attr)) : ''; } catch (_) { return ''; }
    };
    EP.wa = (number, text) => (EP.gk ? EP.gk.waLink(number, text) : 'https://wa.me/');
    EP.share = (net, o) => (EP.gk ? EP.gk.shareIntent(net, o) : null);

    try { global.qrcode = (await import(ROOT + 'vendor/qrcode/qrcode.js')).default; } catch (_) {}
    try { Object.assign(EP.config, await EP.get('/public/config', { auth: false })); } catch (_) {}

    const apply = async () => {
      parseHash();
      const hit = matchRoute(routes, EP.route.path);
      let target = hit || { route: notFound, params: {} };
      if (guard) { const redirect = guard(target.route, EP.route); if (redirect) { EP.go(redirect, true); return; } }
      EP.view.params = target.params;
      EP.view.name = target.route.name || target.route.path;
      EP.view.title = target.route.title || '';
      EP.view.comp = EP.comp(base + target.route.comp);
      if (WC.syncDocumentMeta && target.route.title) {
        WC.syncDocumentMeta('es', { title: target.route.title + ' · Easypoint', description: target.route.description || document.querySelector('meta[name="description"]')?.content });
      }
      global.scrollTo({ top: 0, behavior: 'instant' in global ? 'instant' : 'auto' });
      if (onRoute) onRoute(target.route);
    };
    global.addEventListener('hashchange', apply);
    await apply();

    const app = Vue.createApp({ components: { Shell: EP.comp(shell) }, template: '<Shell />' });
    // componentes de UI globales
    const ui = ['ep-modal', 'ep-kpi', 'ep-table', 'ep-form', 'ep-chart', 'ep-badge', 'ep-empty', 'ep-qr', 'ep-cover', 'ep-stepper', 'ep-tasks', 'ep-dialogs', 'ep-theme', 'ep-map', 'ep-share', 'ep-ico', 'ep-demobar'];
    ui.forEach((n) => app.component(n, EP.comp(ROOT.replace(/\/$/, '') + '/shared/ui/' + n + '.vue')));
    // componentes de web-ui (lib) con los nombres de la lib
    ['FAQ', 'Testimonials', 'Timeline', 'AudiencePaths'].forEach((n) => app.component(n, EP.comp(ROOT.replace(/\/$/, '') + '/vendor/web-ui/' + n + '.vue')));
    // aparición suave al hacer scroll
    app.directive('reveal', {
      mounted(el) {
        el.classList.add('reveal');
        const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }), { threshold: 0.12 });
        io.observe(el);
      }
    });
    app.mount('#app');
    return app;
  };

  EP.qr = (text, cell = 4) => {
    try { const q = global.qrcode(0, 'M'); q.addData(String(text)); q.make(); return q.createDataURL(cell, 2); } catch (_) { return ''; }
  };
  EP.csv = (rows, name) => {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const txt = '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
    a.download = name || 'export.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  };
  EP.copy = async (t) => { try { await navigator.clipboard.writeText(t); EP.toast('Copiado', 'ok'); } catch (_) { EP.toast('No se pudo copiar'); } };

  global.EP = EP;
})(window);
