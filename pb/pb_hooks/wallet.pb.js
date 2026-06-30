/// <reference path="../pb_data/types.d.ts" />

// Monedero de crédito por cliente (clave = teléfono). Todo inline (el JSVM no
// captura el scope del archivo).

// Reserva -> 'credit' (no reembolso): lo pagado pasa al monedero del cliente.
// Idempotente: sólo en la transición a 'credit'.
onRecordAfterUpdateRequest((e) => {
  const rec = e.record;
  let before = '';
  try { before = rec.originalCopy().getString('payment_status'); } catch (err) {}
  const after = rec.getString('payment_status');
  if (before === 'credit' || after !== 'credit') return;

  const phone = String(rec.getString('customer_phone') || '').trim();
  const amount = Number(rec.getFloat('amount_paid')) || 0;
  if (!phone || amount <= 0) return;

  try {
    let wallet;
    try { wallet = $app.dao().findFirstRecordByFilter('wallets', 'customer_phone = {:p}', { p: phone }); }
    catch (err) { wallet = null; }
    if (wallet) {
      const newBal = (Number(wallet.getFloat('balance')) || 0) + amount;
      wallet.set('balance', newBal);
      if (!wallet.getString('customer_name')) wallet.set('customer_name', rec.getString('customer_name'));
      $app.dao().saveRecord(wallet);
      try {
        const wec = $app.dao().findCollectionByNameOrId('wallet_entries');
        const we = new Record(wec, {
          customer_phone: phone, amount: amount, reason: 'credit_from_booking',
          ref: rec.id, balance_after: newBal
        });
        $app.dao().saveRecord(we);
      } catch (err) {}
    } else {
      const coll = $app.dao().findCollectionByNameOrId('wallets');
      const w = new Record(coll, {
        customer_phone: phone,
        customer_name: rec.getString('customer_name'),
        balance: amount
      });
      $app.dao().saveRecord(w);
      try {
        const wec = $app.dao().findCollectionByNameOrId('wallet_entries');
        const we = new Record(wec, {
          customer_phone: phone, amount: amount, reason: 'credit_from_booking',
          ref: rec.id, balance_after: amount
        });
        $app.dao().saveRecord(we);
      } catch (err) {}
    }
  } catch (err) {}
}, 'excursion_bookings');

// Auto-aplicar crédito: al crear una reserva, si el cliente tiene saldo en su
// monedero se aplica automáticamente al siguiente abono (reduce el saldo a pagar).
onRecordAfterCreateRequest((e) => {
  const bk = e.record;
  const phone = String(bk.getString('customer_phone') || '').trim();
  if (!phone) return;

  let wallet;
  try { wallet = $app.dao().findFirstRecordByFilter('wallets', 'customer_phone = {:p}', { p: phone }); }
  catch (err) { return; }

  const available = Number(wallet.getFloat('balance')) || 0;
  if (available <= 0) return;
  const total = Number(bk.getFloat('total')) || 0;
  const owed = total - (Number(bk.getFloat('amount_paid')) || 0);
  if (owed <= 0) return;

  const applied = Math.min(available, owed);
  if (applied <= 0) return;

  const paid = (Number(bk.getFloat('amount_paid')) || 0) + applied;
  bk.set('amount_paid', paid);
  bk.set('balance', total > paid ? total - paid : 0);
  const ps = bk.getString('payment_status');
  if (ps !== 'credit' && ps !== 'refunded' && ps !== 'failed') {
    bk.set('payment_status', paid <= 0 ? 'pending' : (total > 0 && paid >= total ? 'paid' : 'partial'));
  }
  $app.dao().saveRecord(bk);

  wallet.set('balance', available - applied);
  $app.dao().saveRecord(wallet);

  try {
    const wec = $app.dao().findCollectionByNameOrId('wallet_entries');
    const we = new Record(wec, {
      customer_phone: phone, amount: -applied, reason: 'auto_applied',
      ref: bk.id, balance_after: available - applied
    });
    $app.dao().saveRecord(we);
  } catch (err) {}

  try {
    const coll = $app.dao().findCollectionByNameOrId('payments');
    const p = new Record(coll, {
      kind: 'excursion', ref: bk.id, label: 'Crédito aplicado (auto)',
      amount: applied, net: applied, commission: 0,
      method: 'credit', status: 'delivered', delivered_at: new Date().toISOString()
    });
    $app.dao().saveRecord(p);
  } catch (err) {}
}, 'excursion_bookings');

// Consulta de saldo por reserva o por teléfono (staff).
routerAdd('GET', '/api/wallet/lookup', (c) => {
  const info = $apis.requestInfo(c);
  if (!info.authRecord && !info.admin) return c.json(401, { error: 'unauthorized' });

  let phone = String(c.queryParam('phone') || '').trim();
  let name = '';
  const ref = String(c.queryParam('ref') || '').trim();
  if (!phone && ref) {
    try {
      const bk = $app.dao().findRecordById('excursion_bookings', ref);
      phone = String(bk.getString('customer_phone') || '').trim();
      name = bk.getString('customer_name');
    } catch (err) { return c.json(404, { error: 'booking_not_found' }); }
  }
  if (!phone) return c.json(400, { error: 'missing_phone' });

  let balance = 0;
  try { balance = Number($app.dao().findFirstRecordByFilter('wallets', 'customer_phone = {:p}', { p: phone }).getFloat('balance')) || 0; }
  catch (err) { balance = 0; }
  return c.json(200, { phone: phone, name: name, balance: balance });
});

// Aplica crédito del monedero a una reserva (staff). Descuenta del monedero,
// incrementa lo pagado de la reserva y deja un asiento en el libro (audit).
routerAdd('POST', '/api/wallet/apply', (c) => {
  const info = $apis.requestInfo(c);
  if (!info.authRecord && !info.admin) return c.json(401, { error: 'unauthorized' });

  const body = info.data || {};
  const ref = String(body.ref || c.queryParam('ref') || '').trim();
  if (!ref) return c.json(400, { error: 'missing_ref' });

  let bk;
  try { bk = $app.dao().findRecordById('excursion_bookings', ref); }
  catch (err) { return c.json(404, { error: 'booking_not_found' }); }

  const phone = String(bk.getString('customer_phone') || '').trim();
  if (!phone) return c.json(400, { error: 'no_phone' });

  let wallet;
  try { wallet = $app.dao().findFirstRecordByFilter('wallets', 'customer_phone = {:p}', { p: phone }); }
  catch (err) { return c.json(200, { applied: 0, balance: 0, reason: 'no_wallet' }); }

  const available = Number(wallet.getFloat('balance')) || 0;
  const total = Number(bk.getFloat('total')) || 0;
  const owed = total - (Number(bk.getFloat('amount_paid')) || 0);
  const reqAmount = Number(body.amount) || 0;
  let applied = Math.min(available, owed > 0 ? owed : available);
  if (reqAmount > 0) applied = Math.min(applied, reqAmount);
  applied = Math.round(applied * 100) / 100;
  if (applied <= 0) return c.json(200, { applied: 0, balance: available, reason: 'nothing_to_apply' });

  // Incrementa lo pagado de la reserva (saveRecord no dispara hooks de request).
  const paid = (Number(bk.getFloat('amount_paid')) || 0) + applied;
  bk.set('amount_paid', paid);
  bk.set('balance', total > paid ? total - paid : 0);
  const ps = bk.getString('payment_status');
  if (ps !== 'credit' && ps !== 'refunded' && ps !== 'failed') {
    bk.set('payment_status', paid <= 0 ? 'pending' : (total > 0 && paid >= total ? 'paid' : 'partial'));
  }
  $app.dao().saveRecord(bk);

  // Descuenta del monedero.
  wallet.set('balance', available - applied);
  $app.dao().saveRecord(wallet);

  try {
    const wec = $app.dao().findCollectionByNameOrId('wallet_entries');
    const we = new Record(wec, {
      customer_phone: phone, amount: -applied, reason: 'manual_applied',
      ref: ref, balance_after: available - applied
    });
    $app.dao().saveRecord(we);
  } catch (err) {}

  // Asiento de auditoría en el libro de pagos.
  try {
    const coll = $app.dao().findCollectionByNameOrId('payments');
    const p = new Record(coll, {
      kind: 'excursion', ref: ref, label: 'Crédito aplicado',
      amount: applied, net: applied, commission: 0,
      method: 'credit', status: 'delivered',
      delivered_at: new Date().toISOString()
    });
    $app.dao().saveRecord(p);
  } catch (err) {}

  return c.json(200, { applied: applied, balance: available - applied, booking_paid: paid });
});
