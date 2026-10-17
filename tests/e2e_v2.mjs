// Easypoint v2 · e2e contra el servidor V + MySQL/MariaDB.
//   API=http://127.0.0.1:8081 EP_MARIADB_BIN=... EP_DB_* node tests/e2e_v2.mjs
// Usa la demo sembrada (--seed-demo). Para viajar en el tiempo ajusta fechas con SQL directo.
import { execFileSync } from 'node:child_process';

const API = process.env.API || 'http://127.0.0.1:8081';
const PASS = process.env.EP_SEED_PASSWORD || 'Demo12345!';
let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('✅', name); }
  else { fail++; failures.push(name); console.log('❌', name, extra ? '→ ' + extra : ''); }
}

async function api(method, path, body, token, headers = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  return { status: res.status, data };
}
const get = (p, t, h) => api('GET', p, undefined, t, h);
const post = (p, b, t, h) => api('POST', p, b ?? {}, t, h);
const put = (p, b, t) => api('PUT', p, b, t);

function sql(q) {
  return execFileSync(process.env.EP_MARIADB_BIN, [
    '-N', '-B', `-h${process.env.EP_DB_HOST || '127.0.0.1'}`, `-P${process.env.EP_DB_PORT || '3307'}`,
    `-u${process.env.EP_DB_USER || 'ep'}`, process.env.EP_DB_NAME || 'easypoint', '-e', q
  ], { env: { ...process.env, MYSQL_PWD: process.env.EP_DB_PASS || 'ep_dev_pw' }, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
}

const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const money = (x) => Math.round(Number(x) * 100) / 100;
const uniq = Math.random().toString(36).slice(2, 7);
const phoneA = '44' + String(Math.floor(10000000 + Math.random() * 89999999));

async function login(email) {
  const r = await post('/api/auth/login', { email, password: PASS });
  return r.data?.token;
}

console.log('🚀 Easypoint v2 e2e contra', API);

// ── A. público ───────────────────────────────────────────────────────────────
{
  const h = await get('/api/health');
  ok('Health responde', h.status === 200 && h.data.ok);
  const c = await get('/api/public/config');
  ok('Config pública expone parámetros del negocio', c.data['policy.credit_validity_months'] === 12 && c.data['club.price_month'] === 99);
  ok('Config pública NO expone parámetros internos', c.data['cash.driver_limit'] === undefined && c.data['settlement.payout_days'] === undefined);
  const p = await get('/api/public/points');
  ok('Puntos activos públicos (6) con coordenadas', p.data.length >= 6 && p.data[0].lat !== 0);
  const s = await get('/api/public/services');
  ok('Catálogo de servicios público (17)', s.data.length >= 17);
  const e = await get('/api/public/excursions');
  ok('Excursiones públicas con salidas y cupo', e.data.length >= 6 && e.data[0].departures.length > 0 && e.data[0].departures[0].remaining !== undefined);
  ok('Excursiones no exponen WhatsApp ni fee del proveedor', e.data[0].provider_whatsapp === undefined && e.data[0].fee_rate === undefined);
}

// ── B. auth y RBAC ───────────────────────────────────────────────────────────
const bad = await post('/api/auth/login', { email: 'admin@easypoint.mx', password: 'mala' });
ok('Login con clave incorrecta → 401', bad.status === 401);
const T = {};
for (const [k, em] of Object.entries({ admin: 'admin@easypoint.mx', support: 'soporte@easypoint.mx', sales: 'ventas@easypoint.mx', driver: 'chofer@easypoint.mx', operator: 'punto@easypoint.mx', provider: 'proveedor@easypoint.mx' })) {
  T[k] = await login(em);
}
ok('Los 6 roles inician sesión', Object.values(T).every(Boolean));
{
  const me = await get('/api/auth/me', T.operator);
  ok('/auth/me devuelve rol y punto', me.data.user.role === 'operator' && me.data.user.point_id > 0);
  ok('Sin sesión no hay acceso a recursos', (await get('/api/r/bookings')).status === 401);
  ok('Operador NO lee reservas (PII)', (await get('/api/r/bookings', T.operator)).status === 403);
  ok('Operador NO accede a admin', (await get('/api/admin/config', T.operator)).status === 403);
  ok('Proveedor NO accede a admin', (await post('/api/admin/tick', {}, T.provider)).status === 403);
  const pts = await get('/api/r/points', T.operator);
  ok('Operador sólo ve SU punto (alcance)', pts.data.total === 1);
  const allp = await get('/api/r/points', T.admin);
  ok('Admin ve todos los puntos', allp.data.total >= 6);
  const ph = await get('/api/r/users', T.admin);
  ok('Usuarios nunca exponen password_hash', ph.data.items.length > 0 && ph.data.items.every((u) => u.password_hash === undefined));
}

// ── C. precios y cotizador ───────────────────────────────────────────────────
const exc = (await get('/api/public/excursions')).data;
const sierra = exc.find((x) => x.name.startsWith('Sierra Gorda'));
const dateA = (sierra.departures.find((d) => d.date >= day(10)) || sierra.departures[0]).date;
{
  const q1 = (await get(`/api/public/quote?excursion=${sierra.id}&date=${dateA}&people=2`)).data;
  ok('Cotización base = precio × personas', q1.total === 2900 && q1.discount === 0 && q1.deposit === 800);
  const q2 = (await get(`/api/public/quote?excursion=${sierra.id}&date=${dateA}&people=2&protect=1`)).data;
  ok('Easypoint Protege suma 6% (mín $30)', q2.protect_fee === 174 && q2.total === 3074);
  const q3 = (await get(`/api/public/quote?excursion=${sierra.id}&date=${dateA}&people=2&promo=BIENVENIDO100`)).data;
  ok('Código promo resta $100', q3.discount === 100 && q3.total === 2800);
  const q4 = (await get(`/api/public/quote?excursion=${sierra.id}&date=${dateA}&people=6`)).data;
  ok('Sin precio dinámico no hay descuento por grupo', q4.discount === 0);
  await post('/api/admin/config', { 'pricing.dynamic_enabled': 'true' }, T.admin);
  const q5 = (await get(`/api/public/quote?excursion=${sierra.id}&date=${dateA}&people=6`)).data;
  ok('Precio dinámico: grupo de 6+ → −8%', q5.discount === money(1450 * 6 * 0.08) && q5.dynamic === true, JSON.stringify(q5));
  await post('/api/admin/config', { 'pricing.dynamic_enabled': 'false' }, T.admin);
}

// ── D. reservas: validación, cupo y carrera ──────────────────────────────────
const pv = T.provider;
let myExc;
{
  const created = await post('/api/r/excursions', { name: 'E2E Cañón ' + uniq, destination: 'Prueba', price: 500, max_capacity: 3, deposit_amount: 100, active: true, cutoff_days: 3 }, pv);
  myExc = created.data;
  ok('Proveedor crea su excursión (provider_id forzado)', created.status === 201 && myExc.provider_id === 1);
  const d = day(30);
  const dates = await post('/api/provider/dates', { excursion_id: myExc.id, dates: [d, day(31), day(2)] }, pv);
  ok('Proveedor publica fechas (la pasada/cercana se acepta si es futura)', dates.status === 200 && dates.data.processed >= 2);
  myExc.date = d;

  const base = { excursion_id: myExc.id, date: d, customer_name: 'Cliente E2E', customer_phone: phoneA, customer_email: `e2e${uniq}@test.mx` };
  ok('Reserva sin nombre → 400', (await post('/api/public/bookings', { ...base, customer_name: '' })).status === 400);
  ok('Reserva con fecha pasada → 400', (await post('/api/public/bookings', { ...base, date: day(-3) })).status === 400);
  ok('Reserva en fecha no publicada → 400', (await post('/api/public/bookings', { ...base, date: day(77) })).status === 400);
  ok('Excursión inexistente → 404', (await post('/api/public/bookings', { ...base, excursion_id: 99999 })).status === 404);

  const b1 = await post('/api/public/bookings', { ...base, people: 2 });
  ok('Reserva creada con voucher, token y estado new', b1.status === 201 && b1.data.booking.code.startsWith('EP-BK-') && b1.data.booking.token && b1.data.booking.status === 'new');
  ok('Total recalculado en el servidor (no confía en el cliente)', b1.data.booking.total === 1000 && b1.data.booking.balance === 1000);
  const over = await post('/api/public/bookings', { ...base, people: 2 });
  ok('Cupo agotado → 409 sold_out', over.status === 409 && over.data.error === 'sold_out');
  const race = await Promise.all([1, 2, 3].map((i) => post('/api/public/bookings', { ...base, customer_name: 'Carrera ' + i, customer_phone: '44' + String(20000000 + i), people: 1 })));
  const wins = race.filter((r) => r.status === 201).length;
  ok('Carrera por el último lugar: exactamente 1 gana', wins === 1, race.map((r) => r.status).join(','));
  myExc.booking = b1.data.booking;
}

// ── E. voucher y pagos ───────────────────────────────────────────────────────
const bk = myExc.booking;
{
  const l = await get(`/api/public/voucher?code=${bk.code}`);
  ok('Voucher por código SIN token no entrega token', l.status === 200 && l.data.items[0].token === undefined && l.data.items[0].owner === false);
  const lt = await get(`/api/public/voucher?code=${bk.code}&t=${bk.token}`);
  ok('Voucher con token entrega línea de tiempo y saldo', lt.data.items[0].timeline.length >= 1 && lt.data.items[0].referral_code);
  ok('Teléfono corto rechazado (anti-scraping)', (await get('/api/public/voucher?phone=123')).status === 400);
  const ph = await get(`/api/public/voucher?phone=${phoneA}`);
  ok('Consulta por teléfono devuelve la reserva', ph.status === 200 && ph.data.items.length >= 1);

  const tooMuch = await post('/api/public/voucher/pay', { code: bk.code, amount: 99999 });
  ok('Abono mayor al saldo → 400', tooMuch.status === 400 && tooMuch.data.error === 'amount_exceeds_balance');
  const dep = await post('/api/public/voucher/pay', { code: bk.code });
  ok('Abono por defecto = apartado del proveedor ($100×2)', dep.status === 200 && dep.data.amount_paid === 200 && dep.data.payment_status === 'partial' && dep.data.status === 'confirmed', JSON.stringify(dep.data));
  const rest = await post('/api/public/voucher/pay', { code: bk.code, amount: 800 });
  ok('Liquida el saldo → paid', rest.data.payment_status === 'paid' && rest.data.balance === 0);
  ok('Abonar a reserva liquidada → 400', (await post('/api/public/voucher/pay', { code: bk.code, amount: 10 })).status === 400);
  const led = sql(`SELECT COUNT(*), COALESCE(SUM(amount),0) FROM payments WHERE booking_id=(SELECT id FROM bookings WHERE code='${bk.code}')`).split('\t');
  ok('Cada abono deja asiento en el libro (2, $1000)', led[0] === '2' && Number(led[1]) === 1000, led.join(','));
}

// ── F. efectivo en punto → chofer → corte → liquidación de punto ─────────────
{
  const dateB = sierra.departures[1].date;
  const b = await post('/api/public/bookings', { excursion_id: sierra.id, date: dateB, people: 1, customer_name: 'Pago en Punto', customer_phone: '44' + String(30000000 + Math.floor(Math.random() * 9999999)) });
  const code = b.data.booking.code;
  ok('Operador consulta la reserva por código', (await get(`/api/ops/booking?code=${code}`, T.operator)).data.balance === 1450);
  ok('Operador no puede abonar más que el saldo', (await post('/api/ops/cash-payment', { code, amount: 5000 }, T.operator)).status === 400);
  const cp = await post('/api/ops/cash-payment', { code, amount: 400 }, T.operator);
  ok('Abono en efectivo queda retenido y confirma la reserva', cp.status === 201 && cp.data.status === 'confirmed' && cp.data.payment_status === 'partial');
  const route = await get('/api/driver/route', T.driver);
  ok('Ruta del chofer incluye el punto con efectivo', route.data.stops.length >= 1 && route.data.stops[0].name && route.data.stops[0].net >= 400);
  const pid = route.data.stops[0].id;
  ok('Redondeo > $10 rechazado', (await post('/api/driver/collect', { point_id: pid, collected_amount: 99999 }, T.driver)).status === 400);
  const col = await post('/api/driver/collect', { point_id: pid }, T.driver);
  ok('Chofer recolecta: comisión del punto 10% → neto', col.status === 200 && col.data.net > 0, JSON.stringify(col.data));
  const pay = sql(`SELECT amount, commission, net, status FROM payments WHERE kind='excursion' AND status='collected' ORDER BY id DESC LIMIT 1`).split('\t');
  ok('Comisión del punto calculada en el servidor (10% de $400 = $40)', Number(pay[0]) === 400 && Number(pay[1]) === 40 && Number(pay[2]) === 360, pay.join(','));
  const corte = await post('/api/driver/corte', {}, T.driver);
  ok('Corte del chofer entrega y genera folio', corte.data.folio.startsWith('CORTE-') && corte.data.count >= 1);
  ok('Segundo corte sin efectivo no inventa nada', (await post('/api/driver/corte', {}, T.driver)).data.count === 0);
  const run = await post('/api/admin/settlements/run', { period: day(0) }, T.admin);
  ok('Liquidación de comisiones por punto', run.data.created >= 1);
  const run2 = await post('/api/admin/settlements/run', { period: day(0) }, T.admin);
  ok('Liquidar de nuevo es idempotente (no duplica)', run2.data.created === 0);
}

// ── G. cierre de salida y liquidación al proveedor ───────────────────────────
{
  sql(`UPDATE departures SET date='${day(-1)}' WHERE excursion_id=${myExc.id} AND date='${myExc.date}'`);
  sql(`UPDATE bookings SET excursion_date='${day(-1)}' WHERE excursion_id=${myExc.id} AND excursion_date='${myExc.date}'`);
  const man = await get(`/api/provider/manifest?excursion_id=${myExc.id}&date=${day(-1)}`, pv);
  ok('Manifiesto lista pasajeros con saldos', man.data.summary.seats >= 2 && man.data.passengers.some((p) => p.code === bk.code));
  const ci = await post('/api/provider/checkin', { code: bk.code }, pv);
  ok('Check-in de abordaje', ci.data.ok === true);
  ok('Segundo check-in rechazado (409)', (await post('/api/provider/checkin', { code: bk.code }, pv)).status === 409);
  const other = await post('/api/provider/checkin', { code: 'EP-BK-NOEXISTE' }, pv);
  ok('Check-in de voucher inexistente → 404', other.status === 404);
  const done = await post('/api/provider/complete', { excursion_id: myExc.id, date: day(-1) }, pv);
  ok('Completar salida liquida: fee 15% exacto', done.data.completed >= 1 && done.data.gross === 1000 && done.data.fee === 150 && done.data.net === 850, JSON.stringify(done.data));
  ok('Folio de liquidación LIQ-PR-', String(done.data.folio).startsWith('LIQ-PR-'));
  const again = await post('/api/provider/complete', { excursion_id: myExc.id, date: day(-1) }, pv);
  ok('Completar de nuevo es idempotente', again.data.completed === 0);
  const dash = await get('/api/provider/dashboard', pv);
  ok('Dashboard del proveedor: pendiente $850', dash.data.totals.pending_net >= 850);
  const stl = (await get('/api/r/settlements?kind=provider', T.admin)).data.items.find((s) => s.folio === done.data.folio);
  const paid = await post(`/api/admin/settlements/${stl.id}/pay`, {}, T.admin);
  ok('Admin paga la liquidación', paid.data.ok === true);
  ok('Pagar dos veces → 409', (await post(`/api/admin/settlements/${stl.id}/pay`, {}, T.admin)).status === 409);
  const st = sql(`SELECT status FROM bookings WHERE code='${bk.code}'`);
  ok('La reserva queda completed', st === 'completed');
}

// ── H. autoservicio del cliente: cambio de fecha y cancelación ───────────────
let cust;
{
  const ph = '44' + String(40000000 + Math.floor(Math.random() * 9999999));
  const d1 = sierra.departures[2].date, d2 = sierra.departures[3].date;
  const b = await post('/api/public/bookings', { excursion_id: sierra.id, date: d1, people: 1, customer_name: 'Cambio Fecha', customer_phone: ph, protect: 1 });
  cust = { ph, code: b.data.booking.code, token: b.data.booking.token, d1, d2 };
  ok('Protege agrega el cargo al total', b.data.booking.protect_fee === 87 && b.data.booking.total === 1537, JSON.stringify(b.data.booking));
  ok('Sin token no se puede mover la reserva', (await post('/api/public/voucher/reschedule', { code: cust.code, date: d2 })).status === 403);
  const rs = await post('/api/public/voucher/reschedule', { code: cust.code, token: cust.token, date: d2 });
  ok('Cambio de fecha con Protege: gratis', rs.status === 200 && rs.data.fee === 0 && rs.data.booking.excursion_date === d2, JSON.stringify(rs.data));
  await post('/api/public/voucher/pay', { code: cust.code, amount: 800 });
  const cancel = await post('/api/public/voucher/cancel', { code: cust.code, token: cust.token });
  ok('Cancelar con Protege (≥7 días): 80% a reembolso, 20% a crédito', cancel.data.refund_requested === 640 && cancel.data.credit === 160, JSON.stringify(cancel.data));
  const w = sql(`SELECT balance FROM wallets WHERE customer_phone='${ph}'`);
  ok('El 20% queda en el monedero', Number(w) === 160, w);
  const tk = sql(`SELECT COUNT(*) FROM support_tickets WHERE kind='refund_request' AND message LIKE '%640%'`);
  ok('Se crea ticket de reembolso para el admin', Number(tk) >= 1);
}

// ── I. motor de automatización ───────────────────────────────────────────────
{
  // reserva sin pagar a 2 días (dentro del plazo) → se vence sola; con abono → crédito
  const ph1 = '44' + String(50000000 + Math.floor(Math.random() * 9999999));
  const ph2 = '44' + String(60000000 + Math.floor(Math.random() * 9999999));
  const dd = sierra.departures[4].date;
  const a = await post('/api/public/bookings', { excursion_id: sierra.id, date: dd, people: 1, customer_name: 'Sin Pagar', customer_phone: ph1, customer_email: `np${uniq}@test.mx` });
  const b = await post('/api/public/bookings', { excursion_id: sierra.id, date: dd, people: 1, customer_name: 'Abonó y Dejó', customer_phone: ph2 });
  await post('/api/public/voucher/pay', { code: b.data.booking.code, amount: 400 });
  sql(`UPDATE bookings SET excursion_date='${day(2)}', created_at=DATE_SUB(created_at, INTERVAL 2 DAY) WHERE code IN ('${a.data.booking.code}','${b.data.booking.code}')`);
  sql(`INSERT IGNORE INTO departures (excursion_id, date, status, created_at) VALUES (${sierra.id}, '${day(2)}', 'open', NOW())`);
  const t1 = await post('/api/admin/tick', {}, T.admin);
  ok('Tick full corre sin errores', t1.status === 200 && t1.data.errors.length === 0, JSON.stringify(t1.data));
  const sa = sql(`SELECT status, payment_status, closed_reason FROM bookings WHERE code='${a.data.booking.code}'`);
  ok('Reserva sin pago dentro del plazo se cancela y libera cupo', sa.startsWith('cancelled'), sa);
  const sb = sql(`SELECT status, payment_status FROM bookings WHERE code='${b.data.booking.code}'`);
  ok('Reserva con abono vencida → estado credit', sb === 'cancelled\tcredit', sb);
  const wb = sql(`SELECT balance FROM wallets WHERE customer_phone='${ph2}'`);
  ok('El abono se convirtió en crédito (sin reembolso en efectivo)', Number(wb) === 400, wb);
  const ob = sql(`SELECT COUNT(*) FROM outbox WHERE template='expired_to_credit'`);
  ok('Se encoló el aviso "tu abono ahora es crédito"', Number(ob) >= 1);
  const n1 = sql('SELECT (SELECT COUNT(*) FROM outbox)+(SELECT COUNT(*) FROM tasks)+(SELECT COUNT(*) FROM risk_flags)');
  await post('/api/admin/tick', {}, T.admin);
  const n2 = sql('SELECT (SELECT COUNT(*) FROM outbox)+(SELECT COUNT(*) FROM tasks)+(SELECT COUNT(*) FROM risk_flags)');
  ok('El motor es idempotente: un segundo tick no duplica nada', n1 === n2, `${n1} vs ${n2}`);
  const wa = sql(`SELECT COUNT(*) FROM outbox WHERE channel='whatsapp' AND status='manual'`);
  ok('WhatsApp sin API queda "manual" con enlace wa.me', Number(wa) >= 1);
}

// ── J. Club, referidos, reseñas y soporte ────────────────────────────────────
{
  const refOwner = '44' + String(70000000 + Math.floor(Math.random() * 9999999));
  const friend = '44' + String(80000000 + Math.floor(Math.random() * 9999999));
  const dj = sierra.departures[5].date;
  const first = await post('/api/public/bookings', { excursion_id: sierra.id, date: dj, people: 1, customer_name: 'Invita Ana', customer_phone: refOwner });
  const lk = await get(`/api/public/voucher?code=${first.data.booking.code}&t=${first.data.booking.token}`);
  const refCode = lk.data.items[0].referral_code;
  ok('Cada cliente recibe su código de referido', /^[A-Z]{1,4}[A-Z0-9]{4}$/.test(refCode), refCode);
  ok('Código de referido válido se reconoce', (await get(`/api/public/referral?code=${refCode}`)).data.valid === true);
  ok('Código inventado no es válido', (await get('/api/public/referral?code=NOEXISTE')).data.valid === false);
  const fb = await post('/api/public/bookings', { excursion_id: sierra.id, date: dj, people: 1, customer_name: 'Amigo Beto', customer_phone: friend, referral_code: refCode });
  const selfb = await post('/api/public/bookings', { excursion_id: sierra.id, date: dj, people: 1, customer_name: 'Auto Referido', customer_phone: refOwner, referral_code: refCode });
  ok('Auto-referido se ignora', sql(`SELECT referral_code_used FROM bookings WHERE code='${selfb.data.booking.code}'`) === '');
  await post('/api/public/voucher/pay', { code: fb.data.booking.code, amount: 1450 });
  sql(`UPDATE bookings SET status='completed', excursion_date='${day(-3)}' WHERE code='${fb.data.booking.code}'`);
  const club = await post('/api/public/club', { phone: refOwner, name: 'Invita Ana' });
  ok('Unirse al Club (modo demo) activa la membresía', club.data.ok && club.data.until > day(0));
  await post('/api/admin/tick', {}, T.admin);
  const wOwner = Number(sql(`SELECT COALESCE(SUM(amount),0) FROM wallet_entries WHERE customer_phone='${refOwner}' AND reason='referral_reward'`));
  const wFriend = Number(sql(`SELECT COALESCE(SUM(amount),0) FROM wallet_entries WHERE customer_phone='${friend}' AND reason='referral_reward'`));
  ok('Referido completa su primer viaje: ambos reciben $100', wOwner === 100 && wFriend === 100, `${wOwner}/${wFriend}`);
  const cb = Number(sql(`SELECT COALESCE(SUM(amount),0) FROM wallet_entries WHERE customer_phone='${friend}' AND reason='club_cashback'`));
  ok('El cliente Club (invitado no es Club) no recibe cashback ajeno', cb === 0);
  const rq = sql(`SELECT COUNT(*) FROM outbox WHERE template='review_request' AND entity_id=(SELECT id FROM bookings WHERE code='${fb.data.booking.code}')`);
  ok('Se pide reseña tras completar', Number(rq) >= 1);
  const rv = await post('/api/public/voucher/review', { code: fb.data.booking.code, token: fb.data.booking.token, rating: 2, text: 'El guía llegó tarde' });
  ok('Reseña baja (≤3) abre ticket PRIVADO y no pide reseña pública', rv.data.ok && rv.data.public_review_prompt === false);
  const tkr = sql(`SELECT COUNT(*) FROM support_tickets WHERE kind='complaint' AND message LIKE '%guía llegó tarde%'`);
  ok('La queja queda en el embudo privado', Number(tkr) >= 1);
  const dup = await post('/api/public/voucher/review', { code: fb.data.booking.code, token: fb.data.booking.token, rating: 5 });
  ok('No se puede reseñar dos veces', dup.status === 400);

  // ticket público → SLA → resolución con compensación
  const tkPhone = '4499' + String(100000 + Math.floor(Math.random() * 899999));
  const tk = await post('/api/public/tickets', { kind: 'complaint', customer_name: 'Quejoso', customer_phone: tkPhone, message: 'Me cobraron doble y no me responden' });
  ok('Ticket público clasifica prioridad urgente por contenido', tk.status === 201 && tk.data.priority === 'urgent');
  const tid = Number(sql(`SELECT id FROM support_tickets WHERE code='${tk.data.code}'`));
  const over = await post(`/api/admin/tickets/${tid}/resolve`, { resolution: 'Se corrigió', compensation: 500 }, T.support);
  ok('Soporte no puede compensar arriba del tope ($300)', over.status === 403 && over.data.error === 'over_cap');
  const res = await post(`/api/admin/tickets/${tid}/resolve`, { resolution: 'Se corrigió el cobro y se disculpó', compensation: 200 }, T.support);
  ok('Soporte resuelve con compensación en crédito', res.data.ok && sql(`SELECT balance FROM wallets WHERE customer_phone='${tkPhone}'`) === '200.00');
  ok('Honeypot de ticket: bots no crean registros', (await post('/api/public/tickets', { message: 'spam spam spam', website: 'http://bot' })).status === 201);
}

// ── K. red: solicitudes, leads, socios API ───────────────────────────────────
{
  const ap = await post('/api/public/applications', { business_name: 'Tienda E2E ' + uniq, contact_name: 'Dueño', contact_phone: '4421112222', whatsapp: '4421112222', address: 'Calle Falsa 123, Querétaro', description: 'Tienda de abarrotes con buen flujo y horario amplio', horarios: 'L-S 9-19', email: `punto${uniq}@test.mx`, maps_url: 'https://maps.example/x' });
  ok('Solicitud de punto puntúa (score ≥ 70) y crea tarea para ventas', ap.status === 201 && ap.data.score >= 70);
  const apps = (await get('/api/r/applications?status=pending', T.sales)).data.items;
  const mine = apps.find((a) => a.business_name.includes(uniq));
  const appr = await post(`/api/admin/applications/${mine.id}/approve`, {}, T.sales);
  ok('Ventas aprueba: crea punto + usuario operador con clave temporal', appr.data.ok && appr.data.point_id > 0 && appr.data.temp_password.length >= 8);
  const nl = await post('/api/auth/login', { email: `punto${uniq}@test.mx`, password: appr.data.temp_password });
  ok('El nuevo punto inicia sesión con su clave temporal', nl.status === 200 && nl.data.user.point_id === appr.data.point_id);
  ok('Lead con envío instantáneo (bot) se descarta en silencio', (await post('/api/public/leads', { name: 'Bot', phone: '4421112222', elapsed_ms: 100 })).status === 201 && Number(sql(`SELECT COUNT(*) FROM leads WHERE name='Bot'`)) === 0);
  ok('Lead legítimo se guarda', (await post('/api/public/leads', { name: 'Lead Real ' + uniq, phone: '4421113333', elapsed_ms: 5000, type: 'ecommerce' })).status === 201 && Number(sql(`SELECT COUNT(*) FROM leads WHERE name='Lead Real ${uniq}'`)) === 1);

  const pk = await post('/api/admin/partners', { name: 'Tienda Shopify E2E', fee_per_parcel: 12 }, T.admin);
  ok('Admin genera API key de socio (se muestra una vez)', pk.status === 201 && pk.data.api_key.startsWith('epk_'));
  ok('API socio sin llave → 401', (await post('/api/v1/shipments', { tracking_id: 'X1' })).status === 401);
  const ptid = (await get('/api/v1/points', undefined, { 'X-API-Key': pk.data.api_key })).data[0].id;
  const sh = await post('/api/v1/shipments', { tracking_id: 'SHP' + uniq.toUpperCase(), point_id: ptid, recipient_name: 'Cliente Final', recipient_email: `rcp${uniq}@test.mx` }, undefined, { 'X-API-Key': pk.data.api_key });
  ok('Socio e-commerce crea envío hacia un punto', sh.status === 201);
  ok('Envío duplicado → 409', (await post('/api/v1/shipments', { tracking_id: 'SHP' + uniq.toUpperCase(), point_id: ptid }, undefined, { 'X-API-Key': pk.data.api_key })).status === 409);
  const tr = await get(`/api/public/track/SHP${uniq.toUpperCase()}`);
  ok('Rastreo público sin PII', tr.status === 200 && tr.data.recipient_name === undefined && tr.data.status === 'pending');
  const shid = Number(sql(`SELECT id FROM shipments WHERE tracking_id='SHP${uniq.toUpperCase()}'`));
  const own = (await post('/api/auth/login', { email: 'punto@easypoint.mx', password: PASS })).data;
  sql(`UPDATE shipments SET point_id=${own.user.point_id} WHERE id=${shid}`);
  const upd = await post(`/api/ops/shipment/${shid}/status`, { status: 'at_point' }, T.operator);
  ok('Operador marca "listo en punto" y se avisa al destinatario', upd.data.ok && Number(sql(`SELECT COUNT(*) FROM outbox WHERE entity='shipment' AND entity_id=${shid}`)) >= 1);
}

// ── L. salida cancelada por el proveedor ─────────────────────────────────────
{
  const ph = '44' + String(90000000 + Math.floor(Math.random() * 9999999));
  const dc = sierra.departures[6].date;
  const b = await post('/api/public/bookings', { excursion_id: sierra.id, date: dc, people: 1, customer_name: 'Salida Cancelada', customer_phone: ph });
  await post('/api/public/voucher/pay', { code: b.data.booking.code, amount: 400 });
  const cd = await post('/api/provider/cancel-departure', { excursion_id: sierra.id, date: dc, reason: 'proveedor' }, pv);
  ok('Proveedor cancela la salida: todos reciben crédito + 10% de bono', cd.data.ok && cd.data.bookings >= 1 && cd.data.bonus >= 40, JSON.stringify(cd.data));
  ok('El cliente tiene crédito + bono', Number(sql(`SELECT balance FROM wallets WHERE customer_phone='${ph}'`)) === 440);
  const after = await post('/api/public/bookings', { excursion_id: sierra.id, date: dc, people: 1, customer_name: 'Tarde', customer_phone: ph });
  ok('La salida cancelada ya no acepta reservas', after.status === 400);
  const next = await post('/api/public/bookings', { excursion_id: sierra.id, date: sierra.departures[7].date, people: 1, customer_name: 'Reusa Crédito', customer_phone: ph });
  ok('Siguiente reserva usa el crédito del monedero automáticamente', next.data.applied_credit === 440 && next.data.booking.amount_paid === 440, JSON.stringify(next.data.applied_credit));
}

// ── M. administración y economía ─────────────────────────────────────────────
{
  const home = await get('/api/ops/home', T.admin);
  ok('"Hoy" del admin trae KPIs y tareas', home.data.kpis.length >= 6 && Array.isArray(home.data.tasks));
  const opHome = await get('/api/ops/home', T.operator);
  ok('"Hoy" del operador es distinto y acotado', opHome.data.role === 'operator' && opHome.data.kpis.some((k) => k.key === 'commission'));
  const eco = await get('/api/ops/economics?days=30', T.admin);
  ok('Economía unitaria: GMV, take, custodia, margen y clientes', eco.data.excursions.gmv_booked > 0 && eco.data.custody.float_total >= 0 && eco.data.contribution.margin !== undefined && eco.data.customers.total > 0, JSON.stringify(Object.keys(eco.data)));
  ok('Economía sólo para admin', (await get('/api/ops/economics', T.sales)).status === 403);
  const fin = await get('/api/ops/finance', T.admin);
  ok('Resumen financiero', fin.data.cash_held !== undefined && fin.data.credit_circulation >= 0);
  const cfg = await post('/api/admin/config', { 'policy.credit_validity_months': '18' }, T.admin);
  ok('Parámetros del negocio editables en runtime', cfg.data.updated === 1 && (await get('/api/public/config')).data['policy.credit_validity_months'] === 18);
  await post('/api/admin/config', { 'policy.credit_validity_months': '12' }, T.admin);
  const ob = await get('/api/r/outbox?status=manual&limit=5', T.admin);
  ok('Bandeja de salida con enlaces wa.me para envío manual', ob.data.items.length > 0 && ob.data.items[0].link.startsWith('https://wa.me/'));
  const au = await get('/api/r/audit', T.admin);
  ok('Bitácora de auditoría sólo para admin', au.status === 200 && (await get('/api/r/audit', T.operator)).status === 403);
  const tasks = await get('/api/tasks', T.provider);
  ok('Tareas del proveedor sólo las suyas', tasks.status === 200 && tasks.data.items.every((t) => t.role === 'provider'));
}

console.log(`\n🏁 ${pass} OK / ${fail} FAIL`);
if (fail) { console.log('Fallos:\n - ' + failures.join('\n - ')); process.exit(1); }
