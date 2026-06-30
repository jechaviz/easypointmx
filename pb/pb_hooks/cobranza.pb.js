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
    // Comisión del punto: porcentaje (commission_rate) o cantidad fija
    // por producto (commission_amount, p.ej. tarifa por peso/medidas).
    let commission = 0;
    const pid = String(rec.getString('point_id') || '').trim();
    if (pid) {
      try {
        const pt = $app.dao().findRecordById('points', pid);
        if ((pt.getString('commission_type') || 'percent') === 'fixed') {
          commission = Number(pt.getFloat('commission_amount')) || 0;
        } else {
          const rate = Number(pt.getFloat('commission_rate')) || 0;
          commission = Math.round(amount * rate) / 100;
        }
      } catch (err) { commission = 0; }
    }
    if (commission > amount) commission = amount; // la comisión no excede el monto
    const net = amount > commission ? amount - commission : 0;
    rec.set('commission', commission);
    rec.set('net', net);

    // Redondeo sin cambio: el chofer puede recolectar un monto redondeado ±$10.
    let collected = Number(rec.getFloat('collected_amount')) || 0;
    if (collected <= 0) { collected = net; }
    const rounding = Math.round((collected - net) * 100) / 100;
    if (Math.abs(rounding) > 10) {
      throw new BadRequestError('El redondeo no puede exceder $10 (una decena).');
    }
    rec.set('collected_amount', collected);
    rec.set('rounding', rounding); // + débito (cobró de más), − crédito (cobró de menos)

    if (!rec.getString('collected_at')) rec.set('collected_at', new Date().toISOString());
  }

  if (status === 'delivered' && !rec.getString('delivered_at')) {
    rec.set('delivered_at', new Date().toISOString());
  }
}, 'payments');
