// Ayudantes compartidos por los e2e: cliente HTTP, SQL directo (para viajar en el tiempo) y marcador de resultados.
import { execFileSync } from 'node:child_process';

export const API = process.env.API || 'http://127.0.0.1:8081';
export const PASS = process.env.EP_SEED_PASSWORD || 'Demo12345!';
let pass = 0, fail = 0;
const failures = [];

export function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('✅', name); } else { fail++; failures.push(name); console.log('❌', name, extra ? '→ ' + extra : ''); }
}
export function summary() {
  console.log(`\n🏁 ${pass} OK / ${fail} FAIL`);
  if (fail) { console.log('Fallos:\n - ' + failures.join('\n - ')); process.exit(1); }
}

// Todos los e2e corren en el entorno de DEMOSTRACIÓN (base *_demo, pagos simulados). El token de entorno se pide una vez.
export const DEMO_PASSWORD = process.env.EP_DEMO_PASSWORD || 'midemo';
export const DEMO_DB = process.env.EP_DEMO_DB_NAME || (process.env.EP_DB_NAME || 'easypoint') + '_demo';
let demoTok = null;
export async function demoToken() {
  if (demoTok) return demoTok;
  const r = await fetch(API + '/api/demo/login', { method: 'POST', body: JSON.stringify({ password: DEMO_PASSWORD }) });
  const d = await r.json();
  if (!d.token) throw new Error('No se pudo entrar a la demo: ' + JSON.stringify(d));
  return (demoTok = d.token);
}
export async function api(method, path, body, token, headers = {}) {
  const demo = path.startsWith('/api/demo/') ? {} : { 'X-EP-Demo': await demoToken() };
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...demo, ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  return { status: res.status, data };
}
export const get = (p, t, h) => api('GET', p, undefined, t, h);
export const post = (p, b, t, h) => api('POST', p, b ?? {}, t, h);
export const put = (p, b, t) => api('PUT', p, b, t);

export function sql(q) {
  return execFileSync(process.env.EP_MARIADB_BIN, [
    '-N', '-B', `-h${process.env.EP_DB_HOST || '127.0.0.1'}`, `-P${process.env.EP_DB_PORT || '3307'}`,
    `-u${process.env.EP_DB_USER || 'ep'}`, DEMO_DB, '-e', q
  ], { env: { ...process.env, MYSQL_PWD: process.env.EP_DB_PASS || 'ep_dev_pw' }, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
}

export const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
export const uniq = Math.random().toString(36).slice(2, 7);
export const phone = (n) => '44' + String(10000000 + Math.floor(Math.random() * 89999999)).padStart(8, '0').slice(0, 8) + (n || '');
export async function login(email, password = PASS) { return (await post('/api/auth/login', { email, password })).data?.token; }
export async function tokens() {
  const T = {};
  for (const [k, em] of Object.entries({ admin: 'admin@easypoint.mx', support: 'soporte@easypoint.mx', sales: 'ventas@easypoint.mx', driver: 'chofer@easypoint.mx', operator: 'punto@easypoint.mx', provider: 'proveedor@easypoint.mx' })) T[k] = await login(em);
  return T;
}
export async function setCfg(T, o) { return post('/api/admin/config', o, T.admin); }
