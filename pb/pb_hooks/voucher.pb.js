/// <reference path="../pb_data/types.d.ts" />

// Voucher digital, tokens de pase de abordar y cobranza de abonos en línea.
// Todo inline para el JSVM de PocketBase.

// 1. Asigna folio de voucher amigable y token de verificación al crear la reserva
onRecordBeforeCreateRequest((e) => {
  const rec = e.record;
  if (!rec.getString('voucher_code')) {
    const rndCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rec.set('voucher_code', 'EP-BK-' + rndCode);
  }
  if (!rec.getString('voucher_token')) {
    const token = 'vtok_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
    rec.set('voucher_token', token);
  }
}, 'excursion_bookings');

// 2. Consulta pública y segura de voucher (por código de reserva, ID o teléfono)
routerAdd('GET', '/api/voucher/lookup', (c) => {
  const code = String(c.queryParam('code') || '').trim();
  const phone = String(c.queryParam('phone') || '').trim().replace(/\D/g, '');

  if (!code && !phone) {
    return c.json(400, { error: 'missing_identifier', message: 'Indica folio de voucher o teléfono.' });
  }

  if (phone && phone.length < 8) {
    return c.json(400, { error: 'invalid_phone', message: 'El teléfono para consulta debe tener al menos 8 dígitos.' });
  }

  let items = [];
  try {
    if (code) {
      // Buscar por voucher_code o por ID directo
      items = $app.dao().findRecordsByFilter(
        'excursion_bookings',
        'voucher_code = {:c} || id = {:c}',
        '-created', 1, 0, { c: code }
      );
    } else if (phone) {
      items = $app.dao().findRecordsByFilter(
        'excursion_bookings',
        'customer_phone ~ {:p}',
        '-created', 10, 0, { p: phone }
      );
    }
  } catch (err) {
    items = [];
  }

  if (!items.length) {
    return c.json(404, { error: 'not_found', message: 'No se encontró ninguna reservación con esos datos.' });
  }

  const results = items.map((rec) => {
    let excDetails = { provider_name: '', duration: '', policy: '', image_url: '' };
    try {
      const exc = $app.dao().findRecordById('excursions', rec.getString('excursion_ref'));
      if (exc) {
        excDetails.provider_name = exc.getString('provider_name') || '';
        excDetails.duration = exc.getString('duration') || '';
        excDetails.policy = exc.getString('policy') || '';
        excDetails.image_url = exc.getString('image_url') || '';
      }
    } catch (_) {}

    return {
      id: rec.id,
      voucher_code: rec.getString('voucher_code') || ('EP-BK-' + rec.id.slice(0, 6).toUpperCase()),
      voucher_token: rec.getString('voucher_token') || rec.id,
      excursion_ref: rec.getString('excursion_ref'),
      excursion_name: rec.getString('excursion_name'),
      destination: rec.getString('destination'),
      customer_name: rec.getString('customer_name'),
      customer_phone: rec.getString('customer_phone'),
      customer_email: rec.getString('customer_email'),
      people: Number(rec.getFloat('people')) || 1,
      excursion_date: rec.getString('excursion_date'),
      total: Number(rec.getFloat('total')) || 0,
      amount_paid: Number(rec.getFloat('amount_paid')) || 0,
      balance: Number(rec.getFloat('balance')) || 0,
      payment_status: rec.getString('payment_status') || 'pending',
      status: rec.getString('status') || 'new',
      checked_in: Boolean(rec.getBool('checked_in')),
      checked_in_at: rec.getString('checked_in_at') || null,
      created: rec.created.string(),
      provider_name: excDetails.provider_name,
      duration: excDetails.duration,
      policy: excDetails.policy,
      image_url: excDetails.image_url
    };
  });

  return c.json(200, { items: results });
});

// 3. Pago o abono directo sobre un voucher
routerAdd('POST', '/api/voucher/pay-abono', (c) => {
  const info = $apis.requestInfo(c);
  const body = info.data || {};
  const code = String(body.code || body.id || c.queryParam('code') || '').trim();
  const amount = Number(body.amount) || 0;
  const method = String(body.method || 'card_online').trim();

  if (!code) {
    return c.json(400, { error: 'missing_code', message: 'Falta código de reserva o folio.' });
  }
  if (amount <= 0) {
    return c.json(400, { error: 'invalid_amount', message: 'El monto a abonar debe ser mayor a $0.' });
  }

  let rec = null;
  try {
    const list = $app.dao().findRecordsByFilter(
      'excursion_bookings',
      'voucher_code = {:c} || id = {:c}',
      '-created', 1, 0, { c: code }
    );
    if (list.length) rec = list[0];
  } catch (err) {}

  if (!rec) {
    return c.json(404, { error: 'not_found', message: 'Reservación no encontrada.' });
  }

  if (rec.getString('status') === 'cancelled') {
    return c.json(400, { error: 'booking_cancelled', message: 'No se pueden realizar abonos a una reservación cancelada.' });
  }

  const currentPaid = Number(rec.getFloat('amount_paid')) || 0;
  const total = Number(rec.getFloat('total')) || 0;
  if (total > 0 && currentPaid >= total) {
    return c.json(400, { error: 'already_paid', message: 'Esta reservación ya se encuentra liquidada en su totalidad.' });
  }

  const remaining = total > currentPaid ? total - currentPaid : 0;
  if (total > 0 && amount > remaining) {
    return c.json(400, { error: 'amount_exceeds_balance', message: 'El monto excede el saldo restante (' + remaining + ').' });
  }

  const newPaid = currentPaid + amount;
  const newBalance = total > newPaid ? total - newPaid : 0;

  rec.set('amount_paid', newPaid);
  rec.set('balance', newBalance);
  rec.set('payment_status', total > 0 && newPaid >= total ? 'paid' : 'partial');
  rec.set('paid_at', new Date().toISOString());

  // Si estaba en 'new', al recibir un abono pasa a 'confirmed'
  if (rec.getString('status') === 'new') {
    rec.set('status', 'confirmed');
    rec.set('confirmed_channel', 'online_abono');
  }

  $app.dao().saveRecord(rec);

  // Asiento contable en el libro de pagos
  try {
    const coll = $app.dao().findCollectionByNameOrId('payments');
    const p = new Record(coll, {
      kind: 'excursion',
      ref: rec.id,
      label: 'Abono online: ' + rec.getString('customer_name') + ' (' + (rec.getString('voucher_code') || rec.id) + ')',
      amount: amount,
      method: method,
      status: 'delivered',
      delivered_at: new Date().toISOString()
    });
    $app.dao().saveRecord(p);
  } catch (err) {}

  return c.json(200, {
    ok: true,
    voucher_code: rec.getString('voucher_code'),
    total: total,
    amount_paid: newPaid,
    balance: newBalance,
    payment_status: rec.getString('payment_status'),
    status: rec.getString('status'),
    receipt: {
      date: new Date().toISOString(),
      amount_added: amount,
      method: method
    }
  });
});
