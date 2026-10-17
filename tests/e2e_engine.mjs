// Easypoint v2 · e2e del motor de automatización y de los escenarios límite (docs/ESCENARIOS.md).
//   node tests/e2e_engine.mjs     (misma configuración que e2e_v2.mjs)
import { ok, summary, get, post, put, sql, day, uniq, phone, login, tokens, setCfg } from './_h.mjs';

console.log('🚀 Easypoint v2 · motor y escenarios');
const T = await tokens();
const tick = async () => (await post('/api/admin/tick', {}, T.admin)).data;
const n = (q) => Number(sql(q));

async function mkExc(over = {}) {
  const r = await post('/api/r/excursions', { name: 'E2E ' + uniq + Math.random().toString(36).slice(2, 5), destination: 'Prueba', price: 1000, max_capacity: 20, deposit_amount: 200, active: true, cutoff_days: 3, ...over }, T.provider);
  return r.data;
}
const mkDate = (exc, d) => post('/api/provider/dates', { excursion_id: exc.id, dates: d }, T.provider);
async function book(exc, date, who, extra = {}) {
  const r = await post('/api/public/bookings', { excursion_id: exc.id, date, people: 1, customer_name: who, customer_phone: extra.phone || phone(), ...extra });
  return r.data;
}
const payFull = (b) => post('/api/public/voucher/pay', { code: b.booking.code, amount: 1000 });

// ── E1 · efectivo: recolección, exposición del chofer, efectivo estancado, abono grande ──
{
  await setCfg(T, { 'cash.point_limit': '1', 'cash.large_payment_flag': '100', 'cash.driver_limit': '1' });
  const exc = await mkExc(); const d = day(40); await mkDate(exc, d);
  const b = await book(exc, d, 'Efectivo E1');
  await post('/api/ops/cash-payment', { code: b.booking.code, amount: 200 }, T.operator);
  await tick();
  ok('Efectivo sobre el límite del punto → tarea de recolección para el chofer', n(`SELECT COUNT(*) FROM tasks WHERE kind='collect_cash' AND role='driver' AND status='open'`) >= 1);
  ok('Abono en efectivo grande → bandera de riesgo', n(`SELECT COUNT(*) FROM risk_flags WHERE kind='large_cash'`) >= 1);
  const route = await get('/api/driver/route', T.driver);
  await post('/api/driver/collect', { point_id: route.data.stops[0].id }, T.driver);
  await tick();
  ok('Chofer sobre su límite → tarea urgente de entrega', n(`SELECT COUNT(*) FROM tasks WHERE kind='deliver_cash' AND priority='urgent'`) >= 1);
  ok('Chofer sobre su límite → bandera de exposición', n(`SELECT COUNT(*) FROM risk_flags WHERE kind='driver_cash_exposure'`) >= 1);
  await post('/api/driver/corte', {}, T.driver);
  const b2 = await book(exc, d, 'Efectivo estancado');
  await post('/api/ops/cash-payment', { code: b2.booking.code, amount: 200 }, T.operator);
  sql(`UPDATE payments SET created_at=DATE_SUB(created_at, INTERVAL 20 DAY) WHERE status='held_at_point'`);
  await tick();
  ok('Efectivo retenido > 2× el máximo de días → bandera "stale_cash"', n(`SELECT COUNT(*) FROM risk_flags WHERE kind='stale_cash'`) >= 1);
  await post('/api/driver/collect', { point_id: (await get('/api/driver/route', T.driver)).data.stops[0].id }, T.driver);
  await post('/api/driver/corte', {}, T.driver);
  await setCfg(T, { 'cash.point_limit': '3000', 'cash.large_payment_flag': '8000', 'cash.driver_limit': '5000' });
}

// ── E2 · salida bajo el mínimo: tarea y auto-cancelación con crédito ──
{
  const exc = await mkExc({ min_people: 5, max_capacity: 10 }); const d = day(2); await mkDate(exc, d);
  const b = await book(exc, d, 'Bajo mínimo'); await payFull(b);
  await tick();
  ok('Salida bajo el mínimo → tarea para el admin', n(`SELECT COUNT(*) FROM tasks WHERE kind='departure_at_risk' AND role='admin' AND entity_id=${exc.id}`) === 1);
  ok('Salida bajo el mínimo → tarea para el proveedor', n(`SELECT COUNT(*) FROM tasks WHERE kind='departure_at_risk' AND role='provider' AND entity_id=${exc.id}`) === 1);
  await setCfg(T, { 'ops.auto_cancel_under_min': 'true' });
  sql(`UPDATE departures SET date='${day(1)}' WHERE excursion_id=${exc.id}`); sql(`UPDATE bookings SET excursion_date='${day(1)}' WHERE excursion_id=${exc.id}`);
  await tick();
  await setCfg(T, { 'ops.auto_cancel_under_min': 'false' });
  const st = sql(`SELECT status, closed_reason FROM bookings WHERE code='${b.booking.code}'`);
  ok('A 1 día y bajo el mínimo: se cancela sola (cupo_minimo)', st === 'cancelled\tdeparture_cancelled:cupo_minimo', st);
  ok('Cancelación por cupo mínimo: crédito completo, sin bono', n(`SELECT COALESCE(SUM(amount),0) FROM wallet_entries WHERE ref='${b.booking.code}'`) === 1000);
}

// ── E3 · proveedor olvida cerrar la salida ──
{
  const exc = await mkExc(); const d = day(6); await mkDate(exc, d);
  const b = await book(exc, d, 'Sin cerrar'); await payFull(b);
  sql(`UPDATE departures SET date='${day(-1)}' WHERE excursion_id=${exc.id}`); sql(`UPDATE bookings SET excursion_date='${day(-1)}' WHERE excursion_id=${exc.id}`);
  await tick();
  ok('Salida pasada sin cerrar → tarea al proveedor', n(`SELECT COUNT(*) FROM tasks WHERE kind='close_departure' AND role='provider' AND entity_id=${exc.id}`) === 1);
  sql(`UPDATE departures SET date='${day(-6)}' WHERE excursion_id=${exc.id}`); sql(`UPDATE bookings SET excursion_date='${day(-6)}' WHERE excursion_id=${exc.id}`);
  await tick();
  ok('A los 4+ días sin cerrar → tarea al admin', n(`SELECT COUNT(*) FROM tasks WHERE kind='close_departure' AND role='admin' AND entity_id=${exc.id}`) === 1);
}

// ── E4 · crédito: aviso a 30 días y vencimiento (breakage) ──
{
  const exc = await mkExc(); const d = day(45); await mkDate(exc, d); const ph = phone();
  const b = await book(exc, d, 'Crédito vence', { phone: ph });
  await post('/api/public/voucher/pay', { code: b.booking.code, amount: 200 });
  await post('/api/public/voucher/cancel', { code: b.booking.code, token: b.booking.token });
  ok('Cancelar sin Protege: todo el abono pasa a crédito, sin reembolso', n(`SELECT balance FROM wallets WHERE customer_phone='${ph}'`) === 200 && n(`SELECT COUNT(*) FROM support_tickets WHERE kind='refund_request' AND message LIKE '%${b.booking.code}%'`) === 0);
  sql(`UPDATE wallet_entries SET expires_at='${day(10)} 00:00:00' WHERE customer_phone='${ph}' AND amount>0`);
  await tick();
  ok('Crédito a punto de vencer → aviso', n(`SELECT COUNT(*) FROM outbox WHERE template='credit_expiring' AND recipient='${ph}'`) >= 1);
  sql(`UPDATE wallet_entries SET expires_at='2000-01-01 00:00:00' WHERE customer_phone='${ph}' AND amount>0`);
  const t = await tick();
  ok('Crédito vencido se debita (breakage) y se avisa', n(`SELECT balance FROM wallets WHERE customer_phone='${ph}'`) === 0 && n(`SELECT COUNT(*) FROM outbox WHERE template='credit_expired' AND recipient='${ph}'`) >= 1, JSON.stringify(t.counts));
}

// ── E5 · winback ──
{
  const exc = await mkExc(); const d = day(50); await mkDate(exc, d); const ph = phone();
  await book(exc, d, 'Dormida Dora', { phone: ph });
  sql(`UPDATE customers SET trips=1, last_seen='2020-01-01 00:00:00', marketing_opt_in=1 WHERE phone='${ph}'`);
  await tick();
  ok('Cliente dormido recibe winback', n(`SELECT COUNT(*) FROM outbox WHERE template='winback' AND recipient='${ph}'`) >= 1);
  ok('El winback crea un código de un solo uso (costo sólo si lo usan)', n(`SELECT COUNT(*) FROM pricing_rules WHERE code LIKE 'VUELVE-%' AND max_uses=1`) >= 1);
  const before = n(`SELECT COUNT(*) FROM outbox WHERE template='winback' AND recipient='${ph}'`);
  await tick();
  ok('Winback no se repite en el mismo año', n(`SELECT COUNT(*) FROM outbox WHERE template='winback' AND recipient='${ph}'`) === before);
}

// ── E6 · SLA de soporte ──
{
  const tk = await post('/api/public/tickets', { kind: 'question', customer_name: 'SLA', customer_phone: phone(), message: 'Quiero saber cómo funciona el crédito, gracias' });
  sql(`UPDATE support_tickets SET sla_due='2000-01-01 00:00:00' WHERE code='${tk.data.code}'`);
  await tick();
  ok('Ticket sin respuesta fuera de SLA → escalado', sql(`SELECT status FROM support_tickets WHERE code='${tk.data.code}'`) === 'escalated');
  ok('Escalamiento levanta bandera sla_breach', n(`SELECT COUNT(*) FROM risk_flags WHERE kind='sla_breach'`) >= 1);
}

// ── E7 · Club: cashback; reseñas altas ──
{
  const exc = await mkExc(); const d = day(55); await mkDate(exc, d); const ph = phone();
  await post('/api/public/club', { phone: ph, name: 'Socia Club' });
  const b = await book(exc, d, 'Socia Club', { phone: ph }); await payFull(b);
  sql(`UPDATE bookings SET status='completed', excursion_date='${day(-3)}' WHERE code='${b.booking.code}'`);
  await tick();
  ok('Socio Club recibe cashback del 5% al completar', n(`SELECT COALESCE(SUM(amount),0) FROM wallet_entries WHERE customer_phone='${ph}' AND reason='club_cashback'`) === 50);
  ok('Se cuenta el viaje en el CRM y cambia el segmento', n(`SELECT trips FROM customers WHERE phone='${ph}'`) === 1 && sql(`SELECT segment FROM customers WHERE phone='${ph}'`) === 'primer_viaje');
  const rv = await post('/api/public/voucher/review', { code: b.booking.code, token: b.booking.token, rating: 5, text: 'Todo perfecto, repetiría' });
  ok('Reseña de 5★: se pide reseña pública y hay bono', rv.data.public_review_prompt === true && n(`SELECT COALESCE(SUM(amount),0) FROM wallet_entries WHERE customer_phone='${ph}' AND reason='review_bonus'`) === 20);
  const pub = await get('/api/public/reviews');
  ok('La reseña aparece en el sitio público (sólo nombre de pila)', pub.data.some((x) => x.name === 'Socia' && x.quote.includes('perfecto')));
}

// ── E8 · plan de recordatorios elegido por el cliente ──
{
  const exc = await mkExc(); const d = day(60); await mkDate(exc, d);
  const b = await book(exc, d, 'Plan Pagos', { reminder_optin: 1, reminder_cadence: 'custom', reminder_dates: day(0), reminder_channel: 'whatsapp' });
  await tick();
  const c1 = n(`SELECT COUNT(*) FROM outbox WHERE entity='booking' AND entity_id=(SELECT id FROM bookings WHERE code='${b.booking.code}') AND dedupe_key LIKE 'plan:%'`);
  ok('Fecha del calendario de abonos vencida → recordatorio', c1 === 1);
  await tick();
  ok('El recordatorio no se repite', n(`SELECT COUNT(*) FROM outbox WHERE entity='booking' AND entity_id=(SELECT id FROM bookings WHERE code='${b.booking.code}') AND dedupe_key LIKE 'plan:%'`) === 1);
}

// ── E9 · aislamiento entre proveedores ──
{
  const u = await post('/api/admin/users', { email: `prov2-${uniq}@test.mx`, name: 'Proveedor 2', role: 'provider', provider_id: 2 }, T.admin);
  const t2 = await login(`prov2-${uniq}@test.mx`, u.data.temp_password);
  const exc1 = await mkExc(); const d = day(65); await mkDate(exc1, d); const b = await book(exc1, d, 'Ajena');
  const ci = await post('/api/provider/checkin', { code: b.booking.code }, t2);
  ok('Un proveedor NO puede abordar vouchers de otro', ci.status === 403);
  const mine = (await get('/api/r/bookings?limit=200', t2)).data.items;
  const p2 = sql(`SELECT GROUP_CONCAT(id) FROM excursions WHERE provider_id=2`).split(',').map(Number);
  ok('Un proveedor sólo ve reservas de sus excursiones', mine.every((x) => p2.includes(x.excursion_id)));
  ok('Un proveedor NO ve la liquidación de otro', (await get('/api/r/settlements', t2)).data.items.every((s) => s.ref === '2'));
  const man = await get(`/api/provider/manifest?excursion_id=${exc1.id}&date=${d}`, t2);
  ok('Un proveedor NO ve el manifiesto de otro', man.status === 404);
}

// ── E10 · transferencia con confirmación manual ──
{
  await setCfg(T, { 'payments.mode': 'manual_confirm' });
  const exc = await mkExc(); const d = day(70); await mkDate(exc, d); const b = await book(exc, d, 'Transferencia');
  const p = await post('/api/public/voucher/pay', { code: b.booking.code, amount: 200 });
  ok('Modo transferencia: devuelve referencia e instrucciones, sin aplicar el pago', p.data.mode === 'manual_confirm' && p.data.reference && n(`SELECT amount_paid FROM bookings WHERE code='${b.booking.code}'`) === 0);
  ok('Se crea tarea al admin para confirmar el depósito', n(`SELECT COUNT(*) FROM tasks WHERE kind='confirm_transfer' AND dedupe_key='transfer:${p.data.reference}'`) === 1);
  const pid = n(`SELECT id FROM payments WHERE gateway_ref='${p.data.reference}'`);
  const c = await post(`/api/admin/payments/${pid}/confirm`, {}, T.admin);
  ok('Admin confirma el depósito y se aplica a la reserva', c.data.ok && n(`SELECT amount_paid FROM bookings WHERE code='${b.booking.code}'`) === 200);
  ok('Confirmar dos veces no duplica el abono', (await post(`/api/admin/payments/${pid}/confirm`, {}, T.admin)).status === 404 && n(`SELECT amount_paid FROM bookings WHERE code='${b.booking.code}'`) === 200);
  await setCfg(T, { 'payments.mode': 'demo' });
}

// ── E11 · recuperación de contraseña y límite de intentos ──
{
  const email = `reset-${uniq}@test.mx`;
  const u = await post('/api/admin/users', { email, name: 'Reset', role: 'operator', password: 'Inicial123!' }, T.admin);
  ok('Alta de usuario con clave propia', u.status === 201 && (await login(email, 'Inicial123!')) !== undefined);
  const r1 = await post('/api/auth/reset-request', { email });
  const r2 = await post('/api/auth/reset-request', { email: 'noexiste@test.mx' });
  ok('Recuperar contraseña no revela si el correo existe', r1.data.ok && r2.data.ok);
  const body = sql(`SELECT body FROM outbox WHERE template='password_reset' AND recipient='${email}' ORDER BY id DESC LIMIT 1`);
  const tok = (body.match(/token=([a-f0-9]+)/) || [])[1];
  ok('El correo incluye enlace con token de un solo uso', !!tok && tok.length >= 30);
  ok('Contraseña nueva demasiado corta → 400', (await post('/api/auth/reset', { token: tok, password: 'corta' })).status === 400);
  const ok1 = await post('/api/auth/reset', { token: tok, password: 'Nueva12345!' });
  ok('Restablecer con el token funciona', ok1.data.ok && !!(await login(email, 'Nueva12345!')));
  ok('El token no se puede reutilizar', (await post('/api/auth/reset', { token: tok, password: 'Otra123456!' })).status === 400);
  let last = 0; for (let i = 0; i < 10; i++) last = (await post('/api/auth/login', { email: `rl-${uniq}@test.mx`, password: 'x' + i })).status;
  ok('Fuerza bruta: tras 8 intentos responde 429', last === 429);
}

// ── E12 · guías y red ──
{
  const q = await post('/api/ops/guide', { carrier: 'dhl', service: 'express', weight_kg: 2, origin_cp: '76000', dest_cp: '64000', recipient_name: 'Dest', sender_name: 'Rem', paid: 0 }, T.operator);
  const pg = await post('/api/ops/guide', { carrier: 'estafeta', service: 'standard', weight_kg: 1, origin_cp: '76000', dest_cp: '76100', recipient_name: 'Dest2', sender_name: 'Rem2', paid: 1 }, T.operator);
  ok('Guía: precio de convenio calculado en servidor (DHL express nacional 2 kg)', q.status === 201 && q.data.price === Math.round((139 + 38) * 1.6 * 1.4), JSON.stringify(q.data));
  sql(`UPDATE shipping_guides SET created_at=DATE_SUB(created_at, INTERVAL 3 DAY) WHERE id=${q.data.id}`);
  sql(`UPDATE shipping_guides SET created_at=DATE_SUB(created_at, INTERVAL 6 HOUR) WHERE id=${pg.data.id}`);
  await tick();
  ok('Cotización de guía sin pagar vence a las 48 h', sql(`SELECT status FROM shipping_guides WHERE id=${q.data.id}`) === 'cancelled');
  ok('Guía pagada sin generar a las 4 h → tarea al punto', n(`SELECT COUNT(*) FROM tasks WHERE kind='generate_guide' AND dedupe_key='guide:${pg.data.id}'`) === 1);
  const gen = await post(`/api/ops/guide/${pg.data.id}/generate`, { tracking_number: 'EST123456' }, T.operator);
  ok('El punto captura el número de guía y se cierra la tarea', gen.data.ok && n(`SELECT COUNT(*) FROM tasks WHERE dedupe_key='guide:${pg.data.id}' AND status='done'`) === 1);

  const ap = await post('/api/public/applications', { business_name: 'Local Inactivo ' + uniq, contact_phone: '4421110000', whatsapp: '4421110000', address: 'Calle larga 123 Qro', email: `inact-${uniq}@test.mx` });
  const id = n(`SELECT id FROM partner_applications WHERE business_name='Local Inactivo ${uniq}'`);
  const appr = await post(`/api/admin/applications/${id}/approve`, {}, T.admin);
  sql(`UPDATE points SET created_at=DATE_SUB(created_at, INTERVAL 40 DAY), last_activity_at=NULL WHERE id=${appr.data.point_id}`);
  await tick();
  ok('Punto sin actividad en 14+ días → tarea de reactivación a ventas', ap.status === 201 && n(`SELECT COUNT(*) FROM tasks WHERE kind='inactive_point' AND role='sales' AND entity_id=${appr.data.point_id}`) === 1);
}

// ── E13 · cierre de salida con saldo pendiente ──
{
  const exc = await mkExc(); const d = day(75); await mkDate(exc, d);
  const full = await book(exc, d, 'Pagó todo'); await payFull(full);
  const part = await book(exc, d, 'Pagó parte'); await post('/api/public/voucher/pay', { code: part.booking.code, amount: 200 });
  sql(`UPDATE departures SET date='${day(-1)}' WHERE excursion_id=${exc.id}`); sql(`UPDATE bookings SET excursion_date='${day(-1)}' WHERE excursion_id=${exc.id}`);
  const done = await post('/api/provider/complete', { excursion_id: exc.id, date: day(-1) }, T.provider);
  ok('Sólo se liquida lo realmente pagado', done.data.completed === 1 && done.data.gross === 1000);
  ok('Reserva que cierra con saldo → bandera de riesgo', n(`SELECT COUNT(*) FROM risk_flags WHERE kind='balance_at_completion' AND detail LIKE '%${part.booking.code}%'`) === 1);
}

// ── E14 · permisos de la bandeja ──
{
  const items = (await get('/api/r/outbox?status=manual&limit=1', T.sales)).data.items;
  ok('Ventas puede marcar mensajes de la bandeja (envío manual)', items.length === 0 || (await put(`/api/r/outbox/${items[0].id}`, { status: 'sent' }, T.sales)).status === 200);
  ok('El operador NO ve la bandeja', (await get('/api/r/outbox', T.operator)).status === 403);
  const big = await post('/api/public/bookings', { excursion_id: 1, date: day(30), people: 99, customer_name: 'Grupo enorme', customer_phone: phone() });
  ok('Más de 40 personas → 400 (grupos por WhatsApp)', big.status === 400 || big.status === 404);
}

summary();
