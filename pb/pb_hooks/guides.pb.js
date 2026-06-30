/// <reference path="../pb_data/types.d.ts" />

// Comisión de guía por TRAMOS de peso/medidas (cantidad fija por producto) y
// alta en el libro de cobranza cuando la guía se paga, para que fluya como las
// excursiones (chofer recolecta neto -> entrega al admin / liquidación).
// Todo inline (el JSVM no captura el scope del archivo).
//
// Tabla de tramos (MXN, demo, configurable): peso cobrable = max(peso real,
// volumétrico = L*An*Al/5000).  <=1kg:$10  <=5kg:$20  <=20kg:$35  >20kg:$50

// Calcula la comisión al crear la guía.
onRecordBeforeCreateRequest((e) => {
  const g = e.record;
  const vol = ((Number(g.getFloat('length_cm')) || 0) * (Number(g.getFloat('width_cm')) || 0) * (Number(g.getFloat('height_cm')) || 0)) / 5000;
  const kg = Math.max(Number(g.getFloat('weight_kg')) || 0, vol);
  const commission = kg <= 1 ? 10 : (kg <= 5 ? 20 : (kg <= 20 ? 35 : 50));
  g.set('commission', commission);
}, 'shipping_guides');

// Recalcula la comisión si cambian peso/medidas.
onRecordBeforeUpdateRequest((e) => {
  const g = e.record;
  const vol = ((Number(g.getFloat('length_cm')) || 0) * (Number(g.getFloat('width_cm')) || 0) * (Number(g.getFloat('height_cm')) || 0)) / 5000;
  const kg = Math.max(Number(g.getFloat('weight_kg')) || 0, vol);
  const commission = kg <= 1 ? 10 : (kg <= 5 ? 20 : (kg <= 20 ? 35 : 50));
  g.set('commission', commission);
}, 'shipping_guides');

// Guía creada ya pagada -> asiento en el libro (retenido en el punto).
onRecordAfterCreateRequest((e) => {
  const g = e.record;
  if (g.getString('status') !== 'paid') return;
  let existing = [];
  try { existing = $app.dao().findRecordsByFilter('payments', "kind = 'guide' && ref = {:r}", '', 1, 0, { r: g.id }); } catch (err) {}
  if (existing.length) return;
  const amount = Number(g.getFloat('price')) || 0;
  const commission = Number(g.getFloat('commission')) || 0;
  try {
    const coll = $app.dao().findCollectionByNameOrId('payments');
    const p = new Record(coll, {
      kind: 'guide', ref: g.id, label: 'Guía ' + (g.getString('carrier') || '').toUpperCase(),
      point_id: g.getString('point_id'), point_name: g.getString('point_name'),
      amount: amount, commission: commission, net: amount > commission ? amount - commission : 0,
      method: 'cash', status: 'held_at_point'
    });
    $app.dao().saveRecord(p);
  } catch (err) {}
}, 'shipping_guides');

// Guía pasa a 'paid' -> asiento en el libro (idempotente).
onRecordAfterUpdateRequest((e) => {
  const g = e.record;
  let before = '';
  try { before = g.originalCopy().getString('status'); } catch (err) {}
  if (before === 'paid' || g.getString('status') !== 'paid') return;
  let existing = [];
  try { existing = $app.dao().findRecordsByFilter('payments', "kind = 'guide' && ref = {:r}", '', 1, 0, { r: g.id }); } catch (err) {}
  if (existing.length) return;
  const amount = Number(g.getFloat('price')) || 0;
  const commission = Number(g.getFloat('commission')) || 0;
  try {
    const coll = $app.dao().findCollectionByNameOrId('payments');
    const p = new Record(coll, {
      kind: 'guide', ref: g.id, label: 'Guía ' + (g.getString('carrier') || '').toUpperCase(),
      point_id: g.getString('point_id'), point_name: g.getString('point_name'),
      amount: amount, commission: commission, net: amount > commission ? amount - commission : 0,
      method: 'cash', status: 'held_at_point'
    });
    $app.dao().saveRecord(p);
  } catch (err) {}
}, 'shipping_guides');
