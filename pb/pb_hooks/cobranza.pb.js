/// <reference path="../pb_data/types.d.ts" />

// Cobranza en efectivo. Todo inline (el JSVM no captura el scope del archivo).

// Nuevo abono: arranca retenido en el punto.
onRecordBeforeCreateRequest((e) => {
  const rec = e.record;
  if (!rec.getString('status')) rec.set('status', 'held_at_point');
  if (!rec.getString('method')) rec.set('method', 'cash');
}, 'payments');

// Abono registrado en el punto -> incrementa lo pagado de la reserva (cash drive).
onRecordAfterCreateRequest((e) => {
  const rec = e.record;
  if (rec.getString('kind') !== 'excursion') return;
  const ref = String(rec.getString('ref') || '').trim();
  if (!ref) return;
  try {
    const bk = $app.dao().findRecordById('excursion_bookings', ref);
    const total = Number(bk.getFloat('total')) || 0;
    const paid = (Number(bk.getFloat('amount_paid')) || 0) + (Number(rec.getFloat('amount')) || 0);
    bk.set('amount_paid', paid);
    bk.set('balance', total > paid ? total - paid : 0);
    const ps = bk.getString('payment_status');
    if (ps !== 'credit' && ps !== 'refunded' && ps !== 'failed') {
      bk.set('payment_status', paid <= 0 ? 'pending' : (total > 0 && paid >= total ? 'paid' : 'partial'));
    }
    $app.dao().saveRecord(bk);
  } catch (err) {}
}, 'payments');

// Ciclo de cobranza: al recolectar se calcula la comisión del punto y el neto;
// al entregar se sella la fecha. La comisión se recalcula en el servidor desde
// points.commission_rate (anti-manipulación del chofer).
onRecordBeforeUpdateRequest((e) => {
  const rec = e.record;
  const status = rec.getString('status');
  const amount = Number(rec.getFloat('amount')) || 0;

  if (status === 'collected') {
    let rate = 0;
    const pid = String(rec.getString('point_id') || '').trim();
    if (pid) {
      try { rate = Number($app.dao().findRecordById('points', pid).getFloat('commission_rate')) || 0; }
      catch (err) { rate = 0; }
    }
    const commission = Math.round(amount * rate) / 100; // rate es porcentaje
    rec.set('commission', commission);
    rec.set('net', amount > commission ? amount - commission : 0);
    if (!rec.getString('collected_at')) rec.set('collected_at', new Date().toISOString());
  }

  if (status === 'delivered' && !rec.getString('delivered_at')) {
    rec.set('delivered_at', new Date().toISOString());
  }
}, 'payments');
