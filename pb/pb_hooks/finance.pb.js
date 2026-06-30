/// <reference path="../pb_data/types.d.ts" />

// Resumen financiero para staff/admin. Todo inline (el JSVM de PocketBase no
// captura el scope del archivo). Sumas/conteos via findRecordsByFilter.
routerAdd('GET', '/api/finance/summary', (c) => {
  const info = $apis.requestInfo(c);
  if (!info.authRecord && !info.admin) return c.json(401, { error: 'unauthorized' });

  // Por cobrar = saldo pendiente de reservas pendientes/parciales.
  let receivable = 0;
  try {
    const rows = $app.dao().findRecordsByFilter(
      'excursion_bookings',
      "payment_status = 'pending' || payment_status = 'partial'",
      '', 5000, 0
    );
    rows.forEach((r) => { receivable += (Number(r.getFloat('balance')) || 0); });
  } catch (err) {}

  // Efectivo en circulacion por estado de los pagos (excluye credito).
  let cash_held = 0, cash_collected = 0, cash_delivered = 0;
  try {
    const rows = $app.dao().findRecordsByFilter(
      'payments',
      "method != 'credit'",
      '', 10000, 0
    );
    rows.forEach((r) => {
      const st = r.getString('status');
      if (st === 'held_at_point') cash_held += (Number(r.getFloat('amount')) || 0);
      else if (st === 'collected') cash_collected += (Number(r.getFloat('net')) || 0);
      else if (st === 'delivered') cash_delivered += (Number(r.getFloat('net')) || 0);
    });
  } catch (err) {}

  // Credito en circulacion = saldo de los monederos.
  let credit_circulation = 0;
  try {
    const rows = $app.dao().findRecordsByFilter('wallets', "balance != 0", '', 10000, 0);
    rows.forEach((r) => { credit_circulation += (Number(r.getFloat('balance')) || 0); });
  } catch (err) {}

  // Ingresos por guias (cobradas o en flujo logistico).
  let revenue_guides = 0;
  try {
    const rows = $app.dao().findRecordsByFilter(
      'shipping_guides',
      "status = 'paid' || status = 'generated' || status = 'in_transit' || status = 'delivered'",
      '', 10000, 0
    );
    rows.forEach((r) => { revenue_guides += (Number(r.getFloat('price')) || 0); });
  } catch (err) {}

  // Ingresos por excursiones (pagadas o parciales).
  let revenue_excursions = 0;
  try {
    const rows = $app.dao().findRecordsByFilter(
      'excursion_bookings',
      "payment_status = 'paid' || payment_status = 'partial'",
      '', 10000, 0
    );
    rows.forEach((r) => { revenue_excursions += (Number(r.getFloat('total')) || 0); });
  } catch (err) {}

  // Pendientes operativos (conteos).
  let tickets_open = 0, bookings_new = 0, guides_to_generate = 0, payments_held = 0;
  try { tickets_open = $app.dao().findRecordsByFilter('support_tickets', "status = 'open'", '', 10000, 0).length; } catch (err) {}
  try { bookings_new = $app.dao().findRecordsByFilter('excursion_bookings', "status = 'new'", '', 10000, 0).length; } catch (err) {}
  try { guides_to_generate = $app.dao().findRecordsByFilter('shipping_guides', "status = 'paid'", '', 10000, 0).length; } catch (err) {}
  try { payments_held = $app.dao().findRecordsByFilter('payments', "status = 'held_at_point'", '', 10000, 0).length; } catch (err) {}

  return c.json(200, {
    receivable: receivable,
    cash_held: cash_held,
    cash_collected: cash_collected,
    cash_delivered: cash_delivered,
    credit_circulation: credit_circulation,
    revenue_guides: revenue_guides,
    revenue_excursions: revenue_excursions,
    pending: {
      tickets_open: tickets_open,
      bookings_new: bookings_new,
      guides_to_generate: guides_to_generate,
      payments_held: payments_held
    }
  });
});
