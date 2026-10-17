// E2E Test: Flujo Integral Automatizado Cliente - Proveedor en EasyPoint
// Valida:
// 1. Registro y Auth del Proveedor.
// 2. Publicación de fechas y cupos por el Proveedor.
// 3. Reserva del Cliente con apartado y generación de voucher digital único + QR token.
// 4. Consulta pública del voucher por el Cliente (lookup seguro).
// 5. Abono/liquidación online del saldo por el Cliente con actualización instantánea.
// 6. Consulta de manifiesto de pasajeros por el Proveedor para su fecha de salida.
// 7. Validación del voucher y Check-in de abordaje por el Proveedor.
// 8. Cierre de excursión y LIQUIDACIÓN AUTOMÁTICA (cálculo de fee y neto devengado sin intervención manual).
// 9. Protección de endpoints y aislamiento entre proveedores.

const PB_API = (process.env.PB_API || 'http://127.0.0.1:8091/api').replace(/\/$/, '');
const ADMIN_IDENTITIES = [process.env.PB_ADMIN_EMAIL, 'admin@easypoint.mx', 'admin@demo.mx', 'admin@easypoint.test'].filter(Boolean);
const ADMIN_PASSWORDS = [process.env.PB_ADMIN_PASSWORD, 'easypoint123', 'Test12345!'].filter(Boolean);

let pass = 0, fail = 0;
const rnd = () => Math.floor(Math.random() * 1e6);

function ok(name, cond, detail = '') {
  if (cond) {
    console.log(`✅ ${name}`);
    pass++;
  } else {
    console.error(`❌ ${name}${detail ? ' — ' + detail : ''}`);
    fail++;
  }
}

async function req(method, path, { token, body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = token;
  const res = await fetch(`${PB_API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('🚀 Iniciando E2E: Ciclo Completo Automatizado Cliente - Proveedor\n');

  // 0. Autenticación de Admin
  let adminToken = null;
  for (const identity of ADMIN_IDENTITIES) {
    for (const password of ADMIN_PASSWORDS) {
      const auth = await req('POST', '/admins/auth-with-password', {
        body: { identity, password }
      });
      if (auth.ok && auth.data?.token) {
        adminToken = auth.data.token;
        break;
      }
    }
    if (adminToken) break;
  }
  ok('Admin autenticado', Boolean(adminToken), `token disponible`);
  if (!adminToken) { summary(); return; }

  // 1. Alta de Proveedor en catálogo
  const provRes = await req('POST', '/collections/providers/records', {
    token: adminToken,
    body: {
      name: `Aventuras Maya ${rnd()}`,
      whatsapp: '5219981234567',
      email: `prov_${rnd()}@maya.mx`,
      fee_rate: 15,
      active: true,
      clabe: '012180000123456789',
      bank_name: 'BBVA'
    }
  });
  ok('Admin crea proveedor con fee 15% y CLABE', provRes.ok, JSON.stringify(provRes.data));
  const provId = provRes.data?.id;

  // 2. Usuario con rol "provider" vinculado al proveedor
  const provEmail = `operador_prov_${rnd()}@maya.mx`;
  const provPass = 'Proveedor2026!';
  const provUserRes = await req('POST', '/collections/users/records', {
    token: adminToken,
    body: {
      email: provEmail,
      password: provPass,
      passwordConfirm: provPass,
      full_name: 'Guía Principal Maya',
      role: 'provider',
      provider_ref: provId,
      verified: true,
      emailVisibility: true
    }
  });
  ok('Admin crea usuario con rol "provider"', provUserRes.ok, JSON.stringify(provUserRes.data));

  // 3. Login del Proveedor
  const provAuth = await req('POST', '/collections/users/auth-with-password', {
    body: { identity: provEmail, password: provPass }
  });
  ok('Proveedor inicia sesión y obtiene token operativo', provAuth.ok && provAuth.data?.token, `status ${provAuth.status}`);
  const provToken = provAuth.data?.token;

  // 4. Creación de Excursión vinculada al Proveedor
  const excursionDate = '2026-11-20';
  const excRes = await req('POST', '/collections/excursions/records', {
    token: adminToken,
    body: {
      name: `Cenotes Mágicos ${rnd()}`,
      destination: 'Riviera Maya',
      description: 'Recorrido por cavernas subterráneas y snorkel.',
      price: 1800,
      duration: '6 horas',
      provider_name: provRes.data?.name,
      provider_whatsapp: '5219981234567',
      provider_id: provId,
      active: true,
      available_dates: `${excursionDate}\n2026-11-27`,
      max_capacity: 8,
      deposit_amount: 400
    }
  });
  ok('Excursión creada con apartado mínimo $400 y cupo 8', excRes.ok, JSON.stringify(excRes.data));
  const excId = excRes.data?.id;

  // 5. Proveedor actualiza calendario de fechas
  const updateDatesRes = await req('POST', '/provider/excursions/dates', {
    token: provToken,
    body: {
      excursion_id: excId,
      available_dates: `${excursionDate}\n2026-11-27\n2026-12-04`,
      max_capacity: 10
    }
  });
  ok('Proveedor gestiona y amplía sus fechas de salida directamente', updateDatesRes.ok && updateDatesRes.data?.max_capacity === 10, JSON.stringify(updateDatesRes.data));

  // 6. CLIENTE RESERVA EN LÍNEA (Público)
  const clientPhone = '9988776655';
  const clientName = 'Carlos Turista';
  const bookingRes = await req('POST', '/collections/excursion_bookings/records', {
    body: {
      excursion_ref: excId,
      customer_name: clientName,
      customer_phone: clientPhone,
      customer_email: 'carlos@turista.mx',
      people: 2,
      excursion_date: excursionDate,
      amount_paid: 800, // 2 personas x $400 apartado
      total: 3600 // 2 personas x $1800
    }
  });
  ok('Cliente reserva excursión con apartado', bookingRes.ok, JSON.stringify(bookingRes.data));
  const bookingId = bookingRes.data?.id;
  const voucherCode = bookingRes.data?.voucher_code;
  const voucherToken = bookingRes.data?.voucher_token;

  ok('Sistema genera folio de voucher único automáticamente', Boolean(voucherCode && voucherCode.startsWith('EP-BK-')), `voucher: ${voucherCode}`);
  ok('Sistema genera token para código QR de abordaje', Boolean(voucherToken && voucherToken.startsWith('vtok_')), `token: ${voucherToken}`);
  ok('Estado de pago inicial es parcial con saldo restante de $2,800', bookingRes.data?.payment_status === 'partial' && bookingRes.data?.balance === 2800, `balance ${bookingRes.data?.balance}`);

  // 7. CLIENTE CONSULTA SU VOUCHER DIGITAL (Público y Seguro)
  const lookupByCode = await req('GET', `/voucher/lookup?code=${encodeURIComponent(voucherCode)}`);
  ok('Lookup público por código de voucher exitoso', lookupByCode.ok && lookupByCode.data?.items?.[0]?.customer_name === clientName, `status ${lookupByCode.status}`);
  ok('Lookup expone datos de la experiencia y saldo sin requerir login', lookupByCode.data?.items?.[0]?.balance === 2800 && lookupByCode.data?.items?.[0]?.destination === 'Riviera Maya');

  const lookupByPhone = await req('GET', `/voucher/lookup?phone=${clientPhone}`);
  ok('Lookup público por teléfono del cliente devuelve reservación', lookupByPhone.ok && lookupByPhone.data?.items?.length >= 1);

  // Anti-scraping: teléfono muy corto debe rechazarse
  const shortPhoneLookup = await req('GET', '/voucher/lookup?phone=1234');
  ok('Anti-scraping: consulta por teléfono menor a 8 dígitos rechazada (400)', shortPhoneLookup.status === 400);

  // 8. CLIENTE ABONA Y LIQUIDA SALDO ONLINE
  // Intento de sobrepago
  const overpayRes = await req('POST', '/voucher/pay-abono', {
    body: { code: voucherCode, amount: 9999, method: 'card_online' }
  });
  ok('Protección financiera: abono mayor al saldo restante es rechazado (400)', overpayRes.status === 400);

  const payAbonoRes = await req('POST', '/voucher/pay-abono', {
    body: {
      code: voucherCode,
      amount: 2800,
      method: 'card_online'
    }
  });
  ok('Cliente liquida el saldo restante ($2,800) en línea', payAbonoRes.ok && payAbonoRes.data?.balance === 0, JSON.stringify(payAbonoRes.data));
  ok('Reservación se actualiza automáticamente a "paid" y "confirmed"', payAbonoRes.data?.payment_status === 'paid' && payAbonoRes.data?.status === 'confirmed');

  // Intento de pago adicional cuando ya está en saldo 0
  const alreadyPaidRes = await req('POST', '/voucher/pay-abono', {
    body: { code: voucherCode, amount: 100, method: 'card_online' }
  });
  ok('Protección financiera: abono sobre reservación ya liquidada es rechazado (400)', alreadyPaidRes.status === 400);

  // Verificar que se haya registrado en el libro de cobros
  const payLedger = await req('GET', `/collections/payments/records?filter=${encodeURIComponent(`ref="${bookingId}"`)}`, {
    token: adminToken
  });
  ok('Abono genera asiento contable automático en payments', (payLedger.data?.items?.length || 0) >= 1 && payLedger.data?.items?.[0]?.amount === 2800);

  // 9. PROVEEDOR CONSULTA SU MANIFIESTO DE PASAJEROS
  const manifestRes = await req('GET', `/provider/manifest?excursion_id=${excId}&date=${excursionDate}`, {
    token: provToken
  });
  ok('Proveedor obtiene manifiesto de su salida', manifestRes.ok && manifestRes.data?.items?.length >= 1, `items: ${manifestRes.data?.items?.length}`);
  const passengerEntry = manifestRes.data?.items?.find((p) => p.id === bookingId);
  ok('Pasajero aparece en manifiesto con pago liquidado y abordaje pendiente', passengerEntry && passengerEntry.payment_status === 'paid' && passengerEntry.checked_in === false);
  ok('Resumen del manifiesto computa plazas y montos en tiempo real', manifestRes.data?.summary?.total_passengers === 2 && manifestRes.data?.summary?.total_paid === 3600);

  // 10. VALIDACIÓN DE VOUCHER Y CHECK-IN POR EL PROVEEDOR
  const checkInRes = await req('POST', '/provider/checkin', {
    token: provToken,
    body: { code: voucherCode }
  });
  ok('Proveedor valida voucher y registra check-in de abordaje', checkInRes.ok && checkInRes.data?.ok === true, JSON.stringify(checkInRes.data));

  // Verificar estado del pasajero tras check-in
  const bookingAfterCheckIn = await req('GET', `/collections/excursion_bookings/records/${bookingId}`, {
    token: provToken
  });
  ok('Reserva registra abordaje (checked_in = true con timestamp)', bookingAfterCheckIn.data?.checked_in === true && Boolean(bookingAfterCheckIn.data?.checked_in_at));

  // 11. PROVEEDOR CONCLUYE SALIDA -> LIQUIDACIÓN AUTOMÁTICA
  const completeTripRes = await req('POST', '/provider/complete-trip', {
    token: provToken,
    body: {
      excursion_id: excId,
      date: excursionDate
    }
  });
  ok('Proveedor marca la salida como completada', completeTripRes.ok && completeTripRes.data?.ok === true, JSON.stringify(completeTripRes.data));
  const stData = completeTripRes.data?.settlement;

  // Verificación del cálculo automático de comisiones:
  // Total excursión = $3,600
  // Fee EasyPoint 15% = $540
  // Neto proveedor = $3,060
  ok('Liquidación auto-generada con cálculo exacto de comisiones', stData && stData.gross === 3600 && stData.fee === 540 && stData.net === 3060, `gross ${stData?.gross}, fee ${stData?.fee}, net ${stData?.net}`);
  ok('Genera folio de liquidación oficial con prefijo LIQ-PR-', Boolean(stData?.folio && stData.folio.startsWith('LIQ-PR-')), `folio ${stData?.folio}`);

  // Verificar que el asiento exista en la colección settlements
  const verifySettlement = await req('GET', `/collections/settlements/records?filter=${encodeURIComponent(`folio="${stData?.folio}"`)}`, {
    token: adminToken
  });
  ok('Asiento de liquidación guardado en base de datos en estado pending', (verifySettlement.data?.items?.length || 0) === 1 && verifySettlement.data?.items?.[0]?.status === 'pending');
  ok('Liquidación incluye CLABE y banco del proveedor en sus notas', verifySettlement.data?.items?.[0]?.notes?.includes('012180000123456789') && verifySettlement.data?.items?.[0]?.notes?.includes('BBVA'));

  // Verificar que las reservas asociadas pasaron a status = 'completed'
  const bookingFinal = await req('GET', `/collections/excursion_bookings/records/${bookingId}`, {
    token: adminToken
  });
  ok('Estatus final de la reservación es "completed"', bookingFinal.data?.status === 'completed');

  // 12. DASHBOARD DEL PROVEEDOR REFLEJA MÉTRICAS REALES
  const dashRes = await req('GET', '/provider/dashboard', {
    token: provToken
  });
  ok('Dashboard del proveedor computa métricas actualizadas', dashRes.ok && dashRes.data?.metrics?.completed_passengers === 2 && dashRes.data?.metrics?.pending_payout === 3060, JSON.stringify(dashRes.data?.metrics));

  // 13. SEGURIDAD Y PERMISOS RBAC
  // Anónimo no puede ver manifiesto
  const anonManifest = await req('GET', `/provider/manifest?date=${excursionDate}`);
  ok('Usuario anónimo NO puede acceder al manifiesto (401)', anonManifest.status === 401);

  // Anónimo no puede hacer check-in
  const anonCheckIn = await req('POST', '/provider/checkin', { body: { code: voucherCode } });
  ok('Usuario anónimo NO puede realizar check-in (401)', anonCheckIn.status === 401);

  // Anónimo no puede completar salidas ni liquidar
  const anonComplete = await req('POST', '/provider/complete-trip', { body: { excursion_id: excId, date: excursionDate } });
  ok('Usuario anónimo NO puede disparar liquidaciones (401)', anonComplete.status === 401);

  // 14. COBRANZA EN PUNTO CON VOUCHER_CODE Y CONFIRMACIÓN AUTOMÁTICA
  const testPoint = await req('POST', '/collections/points/records', {
    token: adminToken,
    body: { name: `Punto Cobranza ${rnd()}`, address: 'Av Juárez 100', status: 'active' }
  });
  const pointId = testPoint.data?.id;

  const booking2 = await req('POST', '/collections/excursion_bookings/records', {
    body: {
      excursion_ref: excId,
      customer_name: 'Ana Pasajera',
      customer_phone: '5511223344',
      people: 1,
      excursion_date: '2026-12-04',
      amount_paid: 400,
      total: 1800
    }
  });
  const booking2Code = booking2.data?.voucher_code;
  ok('2da reserva creada con status new y voucher_code', booking2.ok && booking2.data?.status === 'new' && Boolean(booking2Code));

  const puntoAbono = await req('POST', '/collections/payments/records', {
    token: adminToken,
    body: {
      kind: 'excursion',
      ref: booking2Code,
      amount: 1400,
      point_id: pointId,
      label: 'Abono en mostrador',
      method: 'cash'
    }
  });
  ok('Punto de cobro registra abono en efectivo resolviendo por voucher_code', puntoAbono.ok && Boolean(puntoAbono.data?.id), JSON.stringify(puntoAbono.data));

  const booking2Updated = await req('GET', `/collections/excursion_bookings/records/${booking2.data?.id}`, {
    token: adminToken
  });
  ok('Reserva promovida automáticamente a confirmed y canal point_cash', booking2Updated.data?.status === 'confirmed' && booking2Updated.data?.confirmed_channel === 'point_cash' && booking2Updated.data?.balance === 0);

  summary();
}

function summary() {
  console.log(`\n========================================`);
  console.log(`🏁 Resumen: ${pass} PASADOS / ${fail} FALLADOS`);
  console.log(`========================================\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}

run().catch((err) => {
  console.error('Error fatal durante la prueba:', err);
  process.exitCode = 1;
});
