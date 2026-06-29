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
  const exc = await req('POST', '/collections/excursions/records', { token: adminToken, body: { name: `Tour E2E ${rnd()}`, destination: 'Oaxaca', description: 'Test', price: 1500, duration: 'Día completo', provider_name: 'Prov E2E', provider_whatsapp: '5215500000000', active: true } });
  ok('Admin crea excursión (catálogo)', exc.ok, JSON.stringify(exc.data));
  const excId = exc.data?.id;

  const excByOp = await req('POST', '/collections/excursions/records', { token: opToken, body: { name: 'No debería', destination: 'X', active: true } });
  ok('Operador NO puede crear excursión (admin-only)', !excByOp.ok && [400, 401, 403].includes(excByOp.status), `status ${excByOp.status}`);

  const excPublic = await req('GET', '/collections/excursions/records');
  ok('Catálogo de excursiones es público', excPublic.ok && Array.isArray(excPublic.data?.items), `status ${excPublic.status}`);

  // 4. Reserva publica (create abierto)
  const booking = await req('POST', '/collections/excursion_bookings/records', { body: {
    excursion_ref: excId, excursion_name: exc.data?.name, destination: 'Oaxaca',
    customer_name: 'Cliente E2E', customer_phone: '5511112222', customer_email: 'cli@e2e.mx',
    people: 3, excursion_date: '2026-12-15', total: 4500, status: 'new'
  } });
  ok('Reserva pública creada', booking.ok, JSON.stringify(booking.data));
  const bookingId = booking.data?.id;

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
    declared_value: 500, price: 222, status: 'quoted', point_name: point.data?.name
  } });
  ok('Operador vende guía (quoted)', guide.ok, JSON.stringify(guide.data));
  const guideId = guide.data?.id;

  if (guideId) {
    const paid = await req('PATCH', `/collections/shipping_guides/records/${guideId}`, { token: opToken, body: { status: 'paid' } });
    ok('Guía -> pagada', paid.ok && paid.data?.status === 'paid', `status ${paid.status}`);
    const gen = await req('PATCH', `/collections/shipping_guides/records/${guideId}`, { token: opToken, body: { status: 'generated', tracking_number: `DHL${rnd()}` } });
    ok('Guía -> generada con tracking', gen.ok && gen.data?.status === 'generated' && gen.data?.tracking_number, `status ${gen.status}`);
  }

  // ===== TRACKING PUBLICO (paquetería existente) =====
  const trackCode = `E2E-${rnd()}`;
  const shp = await req('POST', '/collections/shipments/records', { token: adminToken, body: { tracking_id: trackCode, status: 'pending' } });
  ok('Admin crea envío', shp.ok, JSON.stringify(shp.data));
  const track = await req('GET', `/track/${encodeURIComponent(trackCode)}`);
  ok('Rastreo público devuelve el envío', track.ok && track.data?.tracking_id === trackCode, `status ${track.status}`);
  const trackNone = await req('GET', `/track/NOEXISTE-${rnd()}`);
  ok('Rastreo público 404 limpio', trackNone.status === 404 && trackNone.data?.error === 'not_found', `status ${trackNone.status}`);

  summary();
}

function summary() {
  console.log(`\n--- Resumen: ${pass} OK / ${fail} FAIL ---`);
  process.exitCode = fail === 0 ? 0 : 1;
}

run().catch((e) => { console.error('Fatal:', e); process.exitCode = 1; });
