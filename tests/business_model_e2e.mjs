// E2E del modelo de negocio extendido: guias (DHL/Estafeta) + excursiones.
// Ejercita el ciclo autenticado (admin y operador), reglas por rol y los
// flujos publicos. Requiere stack arriba (local-stack serve) y un admin PB.
//
//   PB_API=http://127.0.0.1:8097/api PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... node tests/business_model_e2e.mjs

const PB_API = (process.env.PB_API || 'http://127.0.0.1:8097/api').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@easypoint.test';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'Test12345!';

let pass = 0, fail = 0;
const rnd = () => Math.floor(Math.random() * 1e6);

function ok(name, cond, detail = '') {
  if (cond) { console.log(`✅ ${name}`); pass++; }
  else { console.error(`❌ ${name}${detail ? ' — ' + detail : ''}`); fail++; }
}

async function req(method, path, { token, body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = token;
  const res = await fetch(`${PB_API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('🧪 E2E modelo de negocio extendido\n');

  // 0. Admin auth (PocketBase superuser/admin, 0.22 -> /api/admins)
  const auth = await req('POST', '/admins/auth-with-password', { body: { identity: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  ok('Admin auth', auth.ok && auth.data?.token, `status ${auth.status}`);
  const adminToken = auth.data?.token;
  if (!adminToken) { summary(); return; }

  // 1. Punto base (para guia / shipment)
  const point = await req('POST', '/collections/points/records', { token: adminToken, body: { name: `Punto E2E ${rnd()}`, address: 'Calle Falsa 123', status: 'active' } });
  ok('Admin crea punto', point.ok, JSON.stringify(point.data));
  const pointId = point.data?.id;

  // 2. Operador real (para probar reglas por rol)
  const opEmail = `op${rnd()}@easypoint.test`;
  const opPass = 'Operador123!';
  const opUser = await req('POST', '/collections/users/records', { token: adminToken, body: { email: opEmail, password: opPass, passwordConfirm: opPass, full_name: 'Operador E2E', role: 'operator', point_ref: pointId, verified: true, emailVisibility: true } });
  ok('Admin crea usuario operador', opUser.ok, JSON.stringify(opUser.data));
  const opAuth = await req('POST', '/collections/users/auth-with-password', { body: { identity: opEmail, password: opPass } });
  ok('Operador auth', opAuth.ok && opAuth.data?.token, `status ${opAuth.status}`);
  const opToken = opAuth.data?.token;

  // ===== EXCURSIONES =====
  // 3. Catalogo: solo admin escribe
  const providerDates = '2026-12-15\n2026-12-22\n2027-01-05';
  const exc = await req('POST', '/collections/excursions/records', { token: adminToken, body: { name: `Tour E2E ${rnd()}`, destination: 'Oaxaca', description: 'Test', price: 1500, duration: 'Día completo', provider_name: 'Prov E2E', provider_whatsapp: '5215500000000', active: true, available_dates: providerDates, max_capacity: 4, deposit_amount: 500 } });
  ok('Admin crea excursión (catálogo) con fechas del proveedor + cupo', exc.ok, JSON.stringify(exc.data));
  const excId = exc.data?.id;

  const excByOp = await req('POST', '/collections/excursions/records', { token: opToken, body: { name: 'No debería', destination: 'X', active: true } });
  ok('Operador NO puede crear excursión (admin-only)', !excByOp.ok && [400, 401, 403].includes(excByOp.status), `status ${excByOp.status}`);

  const excPublic = await req('GET', '/collections/excursions/records');
  ok('Catálogo de excursiones es público', excPublic.ok && Array.isArray(excPublic.data?.items), `status ${excPublic.status}`);
  const excFound = excPublic.data?.items?.find(e => e.id === excId);
  ok('Catálogo expone las fechas del proveedor', excFound && String(excFound.available_dates || '').includes('2026-12-15'), `dates ${excFound?.available_dates}`);

  // 4. Reserva publica (create abierto). Enviamos total y status MANIPULADOS
  // a proposito para verificar que el servidor los corrige.
  const booking = await req('POST', '/collections/excursion_bookings/records', { body: {
    excursion_ref: excId, excursion_name: 'NOMBRE FALSO', destination: 'DESTINO FALSO',
    customer_name: 'Cliente E2E', customer_phone: '5511112222', customer_email: 'cli@e2e.mx',
    people: 3, excursion_date: '2026-12-15', total: 1, status: 'confirmed'
  } });
  ok('Reserva pública creada', booking.ok, JSON.stringify(booking.data));
  ok('La reserva usa una fecha publicada por el proveedor', providerDates.includes(booking.data?.excursion_date || '___'), `fecha ${booking.data?.excursion_date}`);
  ok('Total recalculado en servidor (anti-manipulación)', booking.data?.total === 1500 * 3, `total ${booking.data?.total}`);
  ok('Status forzado a new (anti-suplantación)', booking.data?.status === 'new', `status ${booking.data?.status}`);
  ok('Nombre/destino denormalizados del catálogo', booking.data?.excursion_name === exc.data?.name && booking.data?.destination === 'Oaxaca', `${booking.data?.excursion_name} / ${booking.data?.destination}`);
  const bookingId = booking.data?.id;

  // 4b. Disponibilidad publica por fecha (cupo 4 - 3 ocupados = 1).
  const avail = await req('GET', `/excursion-availability/${excId}`);
  const d1 = avail.data?.dates?.find((x) => x.date === '2026-12-15');
  ok('Endpoint de disponibilidad reporta cupo restante', avail.ok && d1 && d1.remaining === 1, `remaining ${d1 && d1.remaining}`);

  // 4c. Sobrecupo rechazado (3 + 3 > 4).
  const overbook = await req('POST', '/collections/excursion_bookings/records', { body: {
    excursion_ref: excId, customer_name: 'Cliente Sobre', customer_phone: '5500000001', people: 3, excursion_date: '2026-12-15'
  } });
  ok('Sobrecupo rechazado', !overbook.ok && overbook.status === 400, `status ${overbook.status}`);

  // 4d. Fecha fuera de la lista del proveedor rechazada.
  const badDate = await req('POST', '/collections/excursion_bookings/records', { body: {
    excursion_ref: excId, customer_name: 'Cliente Fecha', customer_phone: '5500000002', people: 1, excursion_date: '2030-02-02'
  } });
  ok('Fecha no publicada rechazada', !badDate.ok && badDate.status === 400, `status ${badDate.status}`);

  // 5. Anónimo NO puede ver reservas (en PB las reglas de list filtran a 0 items).
  const anonBookings = await req('GET', '/collections/excursion_bookings/records');
  ok('Anónimo NO ve reservas (PII protegida)', (anonBookings.data?.items?.length || 0) === 0, `status ${anonBookings.status}, items ${anonBookings.data?.items?.length}`);

  // 6. Admin lista reservas y confirma
  const adminBookings = await req('GET', '/collections/excursion_bookings/records', { token: adminToken });
  ok('Admin lista reservas', adminBookings.ok && adminBookings.data?.items?.some(b => b.id === bookingId), `status ${adminBookings.status}`);

  if (bookingId) {
    const conf = await req('PATCH', `/collections/excursion_bookings/records/${bookingId}`, { token: adminToken, body: { status: 'confirmed', confirmed_channel: 'admin' } });
    ok('Admin confirma reserva', conf.ok && conf.data?.status === 'confirmed', `status ${conf.status}`);
  }

  // ===== GUIAS =====
  // 7. Anónimo NO puede crear ni listar guias
  const anonGuide = await req('POST', '/collections/shipping_guides/records', { body: { carrier: 'estafeta', status: 'quoted', recipient_name: 'X' } });
  ok('Anónimo NO crea guía (staff-only)', !anonGuide.ok && [400, 401, 403].includes(anonGuide.status), `status ${anonGuide.status}`);
  const anonGuideList = await req('GET', '/collections/shipping_guides/records');
  ok('Anónimo NO ve guías', (anonGuideList.data?.items?.length || 0) === 0, `status ${anonGuideList.status}, items ${anonGuideList.data?.items?.length}`);

  // 8. Operador vende guia y la genera (ciclo de estado)
  const guide = await req('POST', '/collections/shipping_guides/records', { token: opToken, body: {
    carrier: 'dhl', service: 'express', origin_cp: '06700', dest_cp: '44100',
    recipient_name: 'Receptor E2E', recipient_phone: '5599998888', weight_kg: 2,
    length_cm: 40, width_cm: 30, height_cm: 20,
    declared_value: 500, price: 222, status: 'quoted', point_name: point.data?.name
  } });
  ok('Operador vende guía (quoted)', guide.ok, JSON.stringify(guide.data));
  ok('Guía guarda dimensiones del envío', guide.data?.length_cm === 40 && guide.data?.width_cm === 30 && guide.data?.height_cm === 20, `dims ${guide.data?.length_cm}x${guide.data?.width_cm}x${guide.data?.height_cm}`);
  // 40x30x20 -> volumétrico 4.8 kg (>peso real 2) -> tramo <=5kg = $20.
  ok('Guía calcula comisión por peso/medidas ($20)', guide.data?.commission === 20, `commission ${guide.data?.commission}`);
  const guideId = guide.data?.id;

  if (guideId) {
    const paid = await req('PATCH', `/collections/shipping_guides/records/${guideId}`, { token: opToken, body: { status: 'paid' } });
    ok('Guía -> pagada', paid.ok && paid.data?.status === 'paid', `status ${paid.status}`);
    // Al pagarse, la guía genera un asiento en el libro (cobranza) con su comisión.
    const gpay = await req('GET', `/collections/payments/records?filter=${encodeURIComponent(`kind="guide" && ref="${guideId}"`)}`, { token: adminToken });
    ok('Guía pagada genera asiento de cobranza con comisión', (gpay.data?.items?.length || 0) === 1 && gpay.data.items[0].commission === 20 && gpay.data.items[0].status === 'held_at_point', `items ${gpay.data?.items?.length} comm ${gpay.data?.items?.[0]?.commission}`);
    const gen = await req('PATCH', `/collections/shipping_guides/records/${guideId}`, { token: opToken, body: { status: 'generated', tracking_number: `DHL${rnd()}` } });
    ok('Guía -> generada con tracking', gen.ok && gen.data?.status === 'generated' && gen.data?.tracking_number, `status ${gen.status}`);
  }

  // ===== PAGOS (pasarela + apartado) =====
  // Checkout por defecto = APARTADO definido por el proveedor (deposit_amount 500).
  const payBooking = await req('POST', '/pay/checkout', { body: { collection: 'excursion_bookings', id: bookingId } });
  ok('Checkout usa el apartado del proveedor por defecto', payBooking.ok && payBooking.data?.amount === 500, `amount ${payBooking.data?.amount}`);
  ok('Checkout reserva cae a pago manual sin pasarela', payBooking.data?.provider === 'manual' && Boolean(payBooking.data?.reference), `provider ${payBooking.data?.provider}`);

  // Checkout con monto específico (abono).
  const payCustom = await req('POST', '/pay/checkout', { body: { collection: 'excursion_bookings', id: bookingId, amount: 1000 } });
  ok('Checkout acepta monto de abono específico', payCustom.ok && payCustom.data?.amount === 1000, `amount ${payCustom.data?.amount}`);

  // Checkout de guía: monto = precio de la guía.
  const payGuide = await req('POST', '/pay/checkout', { body: { collection: 'shipping_guides', id: guideId } });
  ok('Checkout guía devuelve precio de la guía', payGuide.ok && payGuide.data?.amount === 222, `amount ${payGuide.data?.amount}`);

  // Checkout con colección inválida -> 400.
  const payBad = await req('POST', '/pay/checkout', { body: { collection: 'users', id: 'x' } });
  ok('Checkout rechaza colección inválida', !payBad.ok && payBad.status === 400, `status ${payBad.status}`);

  if (bookingId) {
    // Abono parcial: amount_paid 500 de 4500 -> partial, balance 4000.
    const partial = await req('PATCH', `/collections/excursion_bookings/records/${bookingId}`, { token: adminToken, body: { amount_paid: 500 } });
    ok('Abono parcial -> partial + saldo', partial.ok && partial.data?.payment_status === 'partial' && partial.data?.balance === 4000, `status ${partial.data?.payment_status} balance ${partial.data?.balance}`);

    // Liquidación: amount_paid 4500 -> paid, balance 0.
    const full = await req('PATCH', `/collections/excursion_bookings/records/${bookingId}`, { token: adminToken, body: { amount_paid: 4500 } });
    ok('Liquidación -> paid + saldo 0', full.ok && full.data?.payment_status === 'paid' && full.data?.balance === 0, `status ${full.data?.payment_status} balance ${full.data?.balance}`);

    // Crédito (no reembolso): se respeta aunque haya monto pagado.
    const credit = await req('PATCH', `/collections/excursion_bookings/records/${bookingId}`, { token: adminToken, body: { payment_status: 'credit' } });
    ok('Estado crédito se respeta (no reembolso)', credit.ok && credit.data?.payment_status === 'credit', `status ${credit.data?.payment_status}`);
  }

  // ===== COBRANZA (efectivo recolectado por chofer) =====
  await req('PATCH', `/collections/points/records/${pointId}`, { token: adminToken, body: { commission_rate: 10 } });
  const cobBooking = await req('POST', '/collections/excursion_bookings/records', { body: {
    excursion_ref: excId, customer_name: 'Cliente Cobranza', customer_phone: '5500002222', people: 1, excursion_date: '2026-12-22'
  } });
  const cobId = cobBooking.data?.id; // total = 1500 * 1
  const pay = await req('POST', '/collections/payments/records', { token: opToken, body: {
    kind: 'excursion', ref: cobId, label: 'Cliente Cobranza', amount: 500, point_id: pointId, point_name: point.data?.name, method: 'cash'
  } });
  ok('Operador registra abono (retenido en el punto)', pay.ok && pay.data?.status === 'held_at_point', `status ${pay.data?.status}`);
  const bkAfter = await req('GET', `/collections/excursion_bookings/records/${cobId}`, { token: adminToken });
  ok('El abono incrementa lo pagado de la reserva', bkAfter.data?.amount_paid === 500 && bkAfter.data?.payment_status === 'partial', `paid ${bkAfter.data?.amount_paid} ${bkAfter.data?.payment_status}`);

  const collected = await req('PATCH', `/collections/payments/records/${pay.data?.id}`, { token: opToken, body: { status: 'collected', collected_by: 'driverX' } });
  ok('Chofer recolecta: comisión 10% (50) y neto 450', collected.data?.status === 'collected' && collected.data?.commission === 50 && collected.data?.net === 450, `comm ${collected.data?.commission} net ${collected.data?.net}`);

  const delivered = await req('PATCH', `/collections/payments/records/${pay.data?.id}`, { token: opToken, body: { status: 'delivered' } });
  ok('Chofer entrega al admin (delivered + fecha)', delivered.data?.status === 'delivered' && Boolean(delivered.data?.delivered_at), `status ${delivered.data?.status}`);

  // Redondeo sin cambio (±$10): arriba = débito, abajo = crédito, >$10 rechazado.
  const mkPay = async () => (await req('POST', '/collections/payments/records', { token: opToken, body: { kind: 'excursion', ref: cobId, amount: 500, point_id: pointId, point_name: point.data?.name, method: 'cash' } })).data?.id;
  const pUp = await mkPay();
  const up = await req('PATCH', `/collections/payments/records/${pUp}`, { token: opToken, body: { status: 'collected', collected_amount: 453 } });
  ok('Redondeo arriba = débito (+3)', up.data?.rounding === 3 && up.data?.collected_amount === 453, `rounding ${up.data?.rounding}`);
  const pDown = await mkPay();
  const down = await req('PATCH', `/collections/payments/records/${pDown}`, { token: opToken, body: { status: 'collected', collected_amount: 448 } });
  ok('Redondeo abajo = crédito (-2)', down.data?.rounding === -2, `rounding ${down.data?.rounding}`);
  const pBig = await mkPay();
  const big = await req('PATCH', `/collections/payments/records/${pBig}`, { token: opToken, body: { status: 'collected', collected_amount: 470 } });
  ok('Redondeo mayor a $10 rechazado', !big.ok && big.status === 400, `status ${big.status}`);

  // Comisión FIJA por producto (no porcentaje): el punto pasa a tarifa fija $30.
  await req('PATCH', `/collections/points/records/${pointId}`, { token: adminToken, body: { commission_type: 'fixed', commission_amount: 30 } });
  const pf = await req('POST', '/collections/payments/records', { token: opToken, body: { kind: 'excursion', ref: cobId, amount: 500, point_id: pointId, point_name: point.data?.name, method: 'cash' } });
  const pfc = await req('PATCH', `/collections/payments/records/${pf.data?.id}`, { token: opToken, body: { status: 'collected', collected_amount: 470 } });
  ok('Comisión fija por producto ($30, no %)', pfc.data?.commission === 30 && pfc.data?.net === 470, `comm ${pfc.data?.commission} net ${pfc.data?.net}`);

  const anonPay = await req('GET', '/collections/payments/records');
  ok('Anónimo NO ve el libro de pagos', (anonPay.data?.items?.length || 0) === 0, `items ${anonPay.data?.items?.length}`);

  // ===== MONEDERO DE CRÉDITO =====
  // bookingId se convirtió a 'credit' con amount_paid 4500 (tel 5511112222).
  const wl = await req('GET', `/wallet/lookup?ref=${bookingId}`, { token: opToken });
  ok('Monedero acreditado al convertir a crédito (4500)', wl.ok && wl.data?.balance === 4500, `balance ${wl.data?.balance}`);

  // Auto-aplicado: al crear la nueva reserva del mismo cliente, el crédito se aplica solo.
  const wBooking = await req('POST', '/collections/excursion_bookings/records', { body: {
    excursion_ref: excId, customer_name: 'Cliente E2E', customer_phone: '5511112222', people: 1, excursion_date: '2027-01-05'
  } });
  const wbId = wBooking.data?.id; // total 1500
  const wbAfter = await req('GET', `/collections/excursion_bookings/records/${wbId}`, { token: adminToken });
  ok('Crédito se auto-aplica a la nueva reserva (1500)', wbAfter.data?.amount_paid === 1500 && wbAfter.data?.payment_status === 'paid', `paid ${wbAfter.data?.amount_paid} ${wbAfter.data?.payment_status}`);

  const wl2 = await req('GET', `/wallet/lookup?ref=${bookingId}`, { token: opToken });
  ok('Monedero descontado tras auto-aplicar (3000)', wl2.data?.balance === 3000, `balance ${wl2.data?.balance}`);

  const wlAnon = await req('GET', `/wallet/lookup?ref=${bookingId}`);
  ok('Lookup de monedero requiere auth', wlAnon.status === 401, `status ${wlAnon.status}`);

  // ===== RECORDATORIOS DE ABONOS =====
  const today = new Date().toISOString().slice(0, 10);
  const rb = await req('POST', '/collections/excursion_bookings/records', { body: {
    excursion_ref: excId, customer_name: 'Cliente Plan', customer_phone: '5500003333', customer_email: 'plan@e2e.mx',
    people: 1, excursion_date: '2027-01-05', reminder_optin: true, reminder_cadence: 'weekly', reminder_channel: 'email'
  } });
  const rbAdmin = await req('GET', `/collections/excursion_bookings/records/${rb.data?.id}`, { token: adminToken });
  ok('Plan semanal genera calendario de recordatorios', rb.ok && String(rbAdmin.data?.reminder_dates || '').split('\n').filter(Boolean).length >= 1, `dates ${rbAdmin.data?.reminder_dates}`);

  const rb2 = await req('POST', '/collections/excursion_bookings/records', { body: {
    excursion_ref: excId, customer_name: 'Cliente Hoy', customer_phone: '5500004444', customer_email: 'hoy@e2e.mx',
    people: 1, excursion_date: '2027-01-05', reminder_optin: true, reminder_cadence: 'custom', reminder_channel: 'email', reminder_dates: today
  } });
  const run = await req('POST', '/reminders/run', { token: opToken });
  ok('Procesa recordatorios vencidos', run.ok && (run.data?.processed || 0) >= 1, `processed ${run.data?.processed}`);
  const rb2After = await req('GET', `/collections/excursion_bookings/records/${rb2.data?.id}`, { token: adminToken });
  ok('Marca el recordatorio como enviado', String(rb2After.data?.reminders_sent || '').includes(today), `sent ${rb2After.data?.reminders_sent}`);
  const runAnon = await req('POST', '/reminders/run');
  ok('Run de recordatorios requiere auth', runAnon.status === 401, `status ${runAnon.status}`);

  // ===== RED DE SERVICIOS =====
  const svCat = await req('GET', '/collections/services/records?perPage=200');
  ok('Catálogo de servicios es público y sembrado', svCat.ok && (svCat.data?.items?.length || 0) >= 5, `count ${svCat.data?.items?.length}`);
  const svOpCreate = await req('POST', '/collections/services/records', { token: opToken, body: { name: 'X', commission_type: 'percent' } });
  ok('Operador NO edita catálogo (admin-only)', !svOpCreate.ok && [400, 401, 403].includes(svOpCreate.status), `status ${svOpCreate.status}`);

  const svc = (svCat.data?.items || []).find(s => s.commission_type === 'percent') || svCat.data?.items?.[0];
  const expected = svc && svc.commission_type === 'fixed' ? (svc.commission_amount || 0) : Math.round(100 * (svc?.commission_rate || 0)) / 100;
  const order = await req('POST', '/collections/service_orders/records', { token: opToken, body: { service_ref: svc?.id, amount: 100, point_id: pointId, point_name: point.data?.name } });
  ok('Venta de servicio calcula comisión del catálogo', order.ok && order.data?.commission === expected, `comm ${order.data?.commission} exp ${expected}`);
  const spay = await req('GET', `/collections/payments/records?filter=${encodeURIComponent(`kind="service" && ref="${order.data?.id}"`)}`, { token: adminToken });
  ok('Venta de servicio genera asiento de cobranza', (spay.data?.items?.length || 0) === 1 && spay.data.items[0].status === 'held_at_point', `items ${spay.data?.items?.length}`);
  const anonOrders = await req('GET', '/collections/service_orders/records');
  ok('Anónimo NO ve ventas de servicios', (anonOrders.data?.items?.length || 0) === 0, `items ${anonOrders.data?.items?.length}`);

  // ===== SOPORTE / QUEJAS (embudo privado) =====
  const ticket = await req('POST', '/collections/support_tickets/records', { body: {
    kind: 'complaint', subject_ref: bookingId, customer_name: 'Cliente Molesto', customer_phone: '5500001111',
    message: 'La experiencia no fue como esperaba.', status: 'open'
  } });
  ok('Queja pública creada (embudo privado)', ticket.ok, JSON.stringify(ticket.data));
  const anonTickets = await req('GET', '/collections/support_tickets/records');
  ok('Anónimo NO ve tickets (privado)', (anonTickets.data?.items?.length || 0) === 0, `items ${anonTickets.data?.items?.length}`);
  const adminTickets = await req('GET', '/collections/support_tickets/records', { token: adminToken });
  ok('Admin ve los tickets', adminTickets.ok && adminTickets.data?.items?.some(t => t.id === ticket.data?.id), `status ${adminTickets.status}`);

  // ===== TRACKING PUBLICO (paquetería existente) =====
  const trackCode = `E2E-${rnd()}`;
  const shp = await req('POST', '/collections/shipments/records', { token: adminToken, body: { tracking_id: trackCode, status: 'pending' } });
  ok('Admin crea envío', shp.ok, JSON.stringify(shp.data));
  const track = await req('GET', `/track/${encodeURIComponent(trackCode)}`);
  ok('Rastreo público devuelve el envío', track.ok && track.data?.tracking_id === trackCode, `status ${track.status}`);
  const trackNone = await req('GET', `/track/NOEXISTE-${rnd()}`);
  ok('Rastreo público 404 limpio', trackNone.status === 404 && trackNone.data?.error === 'not_found', `status ${trackNone.status}`);

  // ===== FINANZAS / PROVEEDORES / LIQUIDACIONES / CORTES / AUDITORÍA =====
  const fin = await req('GET', '/finance/summary', { token: adminToken });
  ok('Resumen financiero (admin)', fin.ok
    && typeof fin.data?.receivable !== 'undefined'
    && typeof fin.data?.cash_held !== 'undefined'
    && typeof fin.data?.credit_circulation !== 'undefined'
    && fin.data?.pending && typeof fin.data.pending === 'object',
    `status ${fin.status} ${JSON.stringify(fin.data)}`);

  const prov = await req('POST', '/collections/providers/records', { token: adminToken, body: { name: 'Prov E2E', fee_rate: 15, active: true } });
  ok('Admin crea proveedor', prov.ok, JSON.stringify(prov.data));

  const settleRun = await req('POST', '/settlements/run', { token: adminToken, body: { period: '2026-07' } });
  ok('Corrida de liquidaciones (admin)', settleRun.ok && typeof settleRun.data?.created === 'number', `status ${settleRun.status} ${JSON.stringify(settleRun.data)}`);

  const corte = await req('POST', '/cortes/driver', { token: opToken, body: {} });
  ok('Corte de chofer (staff)', corte.ok, `status ${corte.status} ${JSON.stringify(corte.data)}`);

  const anonAudit = await req('GET', '/collections/audit_log/records');
  ok('Anónimo NO ve la bitácora (admin-only)', (anonAudit.data?.items?.length || 0) === 0, `items ${anonAudit.data?.items?.length}`);

  const finAnon = await req('GET', '/finance/summary');
  ok('Resumen financiero requiere auth', finAnon.status === 401, `status ${finAnon.status}`);

  summary();
}

function summary() {
  console.log(`\n--- Resumen: ${pass} OK / ${fail} FAIL ---`);
  process.exitCode = fail === 0 ? 0 : 1;
}

run().catch((e) => { console.error('Fatal:', e); process.exitCode = 1; });
