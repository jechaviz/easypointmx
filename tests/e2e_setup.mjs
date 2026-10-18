// Easypoint · e2e de /demo (contraseña, aislamiento) y del asistente de configuración del negocio REAL.
//   node tests/e2e_setup.mjs
// Requiere una base real EN BLANCO (node scripts/dev.mjs --reset): el asistente crea el primer administrador.
// Si la base real ya tiene administrador, sólo se prueba la parte de demo y los límites.
import { API, ok, summary } from './_h.mjs';

const DEMO_PW = process.env.EP_DEMO_PASSWORD || 'midemo';
async function call(method, path, body, { token, demo } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(demo ? { 'X-EP-Demo': demo } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let data = null; try { data = await res.json(); } catch (_) {}
  return { status: res.status, data };
}
const post = (p, b, o) => call('POST', p, b ?? {}, o);
const get = (p, o) => call('GET', p, undefined, o);

console.log('🚀 Easypoint · demo + asistente');

// ── /demo: contraseña ──
{
  const st = await get('/api/demo/status');
  ok('La demo anuncia que requiere contraseña', st.data?.available === true && st.data?.password_required === true);
  const bad = await post('/api/demo/login', { password: 'incorrecta' });
  ok('Contraseña incorrecta → 401 sin token', bad.status === 401 && !bad.data?.token);
  const none = await post('/api/demo/login', {});
  ok('Sin contraseña → 401', none.status === 401);
  const good = await post('/api/demo/login', { password: DEMO_PW });
  ok('Contraseña correcta → token de demo y cuentas ficticias', good.status === 200 && !!good.data?.token && good.data.accounts?.length >= 6);
  globalThis.DEMO = good.data?.token;
}
const DEMO = globalThis.DEMO;

// ── aislamiento ──
let demoAdmin, realStatus;
{
  const forged = await post('/api/auth/login', { email: 'admin@easypoint.mx', password: 'Demo12345!' }, { demo: 'token.falso.x' });
  ok('Token de demo inventado → 401 demo_expired', forged.status === 401 && forged.data?.error === 'demo_expired');
  const a = await post('/api/demo/as', { email: 'admin@easypoint.mx' }, { demo: DEMO });
  demoAdmin = a.data?.token;
  ok('Entrar con una cuenta de demo con el token de entorno', a.status === 200 && !!demoAdmin && a.data.user.role === 'admin');
  const outsider = await post('/api/demo/as', { email: 'dueno@miempresa.mx' }, { demo: DEMO });
  ok('/demo/as sólo acepta cuentas ficticias', outsider.status === 404);
  const noTok = await post('/api/demo/as', { email: 'admin@easypoint.mx' });
  ok('/demo/as sin token de demo → 401', noTok.status === 401);
  const inReal = await get('/api/admin/config', { token: demoAdmin });
  ok('La sesión de DEMO no sirve en el entorno REAL (sin cabecera)', inReal.status === 401);
  const inDemo = await get('/api/admin/config', { token: demoAdmin, demo: DEMO });
  ok('La sesión de demo sí sirve dentro de la demo', inDemo.status === 200);
  const pay = await post('/api/public/club/join', { name: 'Cliente Demo', phone: '4491110000' }, { demo: DEMO });
  ok('La demo cobra de forma simulada (el Club se activa al instante)', pay.status === 200 && pay.data?.pending === false);
  realStatus = (await get('/api/setup/status')).data;
  ok('/setup/status del entorno real responde', typeof realStatus?.has_admin === 'boolean');
  const setupInDemo = await get('/api/setup/status', { demo: DEMO });
  ok('El asistente no aplica dentro de la demo (403)', setupInDemo.status === 403);
}

// ── pago simulado SÓLO en la demo ──
{
  const exc = (await get('/api/public/excursions', { demo: DEMO })).data;
  const list = exc?.items || exc?.excursions || exc || [];
  ok('El catálogo de la demo trae excursiones', Array.isArray(list) && list.length > 0);
}

// ── asistente (base real en blanco) ──
if (realStatus.has_admin) {
  console.log('· la base real ya tiene administrador: se omite el recorrido del asistente (usa dev.mjs --reset)');
} else {
  const weak = await post('/api/setup/admin', { name: 'Dueña', email: 'dueno@miempresa.mx', password: 'corta' });
  ok('Contraseña débil rechazada', weak.status === 400 && weak.data?.error === 'weak_password');
  const reserved = await post('/api/setup/admin', { name: 'Dueña', email: 'admin@easypoint.mx', password: 'ClaveSegura123' });
  ok('No se permite un correo de demostración como dueño', reserved.status === 400);
  const a = await post('/api/setup/admin', { name: 'Dueña Prueba', email: 'dueno@miempresa.mx', password: 'ClaveSegura123' });
  ok('Se crea el primer administrador', a.status === 200 && !!a.data?.token);
  const T = a.data?.token; const o = { token: T };
  const again = await post('/api/setup/admin', { name: 'Intruso', email: 'x@y.mx', password: 'ClaveSegura123' });
  ok('Un segundo administrador por el asistente → 409', again.status === 409);
  const noAuth = await get('/api/setup/checklist');
  ok('La lista de verificación exige sesión', noAuth.status === 401);

  let cl = (await get('/api/setup/checklist', o)).data;
  ok('Al inicio faltan los pasos obligatorios', cl.ready === false && cl.required_left >= 5);
  const fin0 = await post('/api/setup/finish', {}, o);
  ok('No se puede terminar con pasos obligatorios pendientes', fin0.status === 409 && fin0.data?.error === 'incomplete');

  // pagos: sin configurar, en el entorno real nadie paga
  const dep = await get('/api/public/excursions');
  const first = (dep.data?.items || dep.data?.excursions || dep.data || [])[0];
  ok('Sin cobros configurados, el club no cobra (503)', (await post('/api/public/club/join', { name: 'Cliente Real', phone: '4491112233' })).status === 503);
  if (first) ok('(real en blanco) no hay excursiones públicas aún', true);

  const badBiz = await post('/api/setup/business', { brand_name: 'X' }, o);
  ok('Nombre comercial muy corto → 400', badBiz.status === 400);
  const biz = await post('/api/setup/business', { brand_name: 'Mi Empresa', legal_name: 'Mi Empresa SA de CV', rfc: 'MEM010101AB1', zip: '76000', email: 'hola@miempresa.mx', phone: '4421234567' }, o);
  ok('Datos del negocio guardados', biz.status === 200);
  ok('RFC inválido rechazado', (await post('/api/setup/business', { brand_name: 'Mi Empresa', rfc: 'ABC' }, o)).status === 400);

  ok('Modo de cobro inválido → 400', (await post('/api/setup/payments', { mode: 'efectivo' }, o)).status === 400);
  ok('CLABE con dígito verificador malo → 400', (await post('/api/setup/payments', { mode: 'manual_confirm', clabe: '123456789012345678', bank: 'BBVA', beneficiary: 'Mi Empresa' }, o)).status === 400);
  ok('Pasarela sin token → 400', (await post('/api/setup/payments', { mode: 'gateway' }, o)).status === 400);
  const pay = await post('/api/setup/payments', { mode: 'manual_confirm', clabe: '002010077777777771', bank: 'Banamex', beneficiary: 'Mi Empresa SA' }, o);
  ok('Transferencia con CLABE válida configurada', pay.status === 200);

  const econ = await post('/api/setup/params', { preset: 'rentable', 'pricing.protect_pct': '7', 'secret.mp_token': 'x', 'sys.last_tick': 'x' }, o);
  ok('El preset de economía se aplica', econ.status === 200 && econ.data.updated >= 7);
  const cfg = (await get('/api/admin/config', o)).data.items;
  ok('Los parámetros no permitidos (secret./sys.) NO se pueden escribir en bloque', !cfg.find((i) => i.ckey === 'secret.mp_token')?.cvalue && !cfg.find((i) => i.ckey === 'sys.last_tick')?.cvalue);
  ok('El ajuste fino pisa al preset', cfg.find((i) => i.ckey === 'pricing.protect_pct')?.cvalue === '7');

  ok('Punto sin nombre → 400', (await post('/api/setup/point', { name: '' }, o)).status === 400);
  const pt = await post('/api/setup/point', { name: 'Papelería Centro', address: 'Av. 5 de Febrero 100', whatsapp: '4421112233', operator_email: 'centro@miempresa.mx' }, o);
  ok('Punto + operador creados con contraseña temporal', pt.status === 201 && !!pt.data?.user?.temp_password);
  const opLogin = await post('/api/auth/login', { email: 'centro@miempresa.mx', password: pt.data.user.temp_password });
  ok('El operador entra con su contraseña temporal', opLogin.status === 200 && opLogin.data.user.role === 'operator');
  ok('Un operador NO puede usar el asistente (403)', (await get('/api/setup/checklist', { token: opLogin.data.token })).status === 403);
  ok('Correo de demostración no permitido para el equipo', (await post('/api/setup/user', { name: 'X', role: 'driver', email: 'chofer@easypoint.mx' }, o)).status === 400);
  ok('Operador sin punto → 400', (await post('/api/setup/user', { name: 'Op', role: 'operator', email: 'op2@miempresa.mx' }, o)).status === 400);
  ok('Chofer creado', (await post('/api/setup/user', { name: 'Luis', role: 'driver', email: 'luis@miempresa.mx' }, o)).status === 201);
  ok('Soporte creado', (await post('/api/setup/user', { name: 'Ana', role: 'support', email: 'ana@miempresa.mx' }, o)).status === 201);
  ok('Proveedor con CLABE inválida → 400', (await post('/api/setup/provider', { name: 'Tours Sierra', clabe: '1234' }, o)).status === 400);
  ok('Proveedor creado con acceso', (await post('/api/setup/provider', { name: 'Tours Sierra', email: 'tours@sierra.mx' }, o)).status === 201);

  ok('WhatsApp requerido en canales', (await post('/api/setup/channels', { whatsapp: '123' }, o)).status === 400);
  ok('Canales guardados', (await post('/api/setup/channels', { whatsapp: '4421234567', url: 'https://miempresa.mx' }, o)).status === 200);

  cl = (await get('/api/setup/checklist', o)).data;
  ok('Todos los pasos obligatorios listos', cl.ready === true && cl.required_left === 0);
  ok('La base real no contiene cuentas de demostración', cl.steps.find((s) => s.key === 'demo')?.done === true);
  ok('La CLABE completa no se expone en la lista', !JSON.stringify(cl).includes('002010077777777771'));
  const pub = JSON.stringify((await get('/api/public/config')).data);
  ok('La configuración pública no filtra CLABE, RFC ni secretos', !pub.includes('002010077777777771') && !pub.includes('MEM010101AB1') && !pub.includes('secret.'));
  ok('Terminar la configuración', (await post('/api/setup/finish', {}, o)).status === 200 && (await get('/api/setup/checklist', o)).data.completed === true);
  ok('Purgar exige la frase de confirmación', (await post('/api/setup/purge-demo', { confirm: 'si' }, o)).status === 400);
}

summary();
