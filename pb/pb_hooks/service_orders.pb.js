/// <reference path="../pb_data/types.d.ts" />

// Ventas de servicios en el punto. Todo inline (el JSVM no captura el scope del
// archivo). La comisión se calcula desde el catálogo (% o fija) y la venta crea
// un asiento en el libro de cobranza (kind='service') para que fluya como las
// guías/abonos (chofer recolecta el neto -> entrega al admin -> liquidación).

// Al registrar la venta: comisión desde el servicio.
onRecordBeforeCreateRequest((e) => {
  const o = e.record;
  if (!o.getString('status')) o.set('status', 'completed');
  const amount = Number(o.getFloat('amount')) || 0;
  let commission = 0;
  const ref = String(o.getString('service_ref') || '').trim();
  if (ref) {
    try {
      const sv = $app.dao().findRecordById('services', ref);
      if ((sv.getString('commission_type') || 'percent') === 'fixed') {
        commission = Number(sv.getFloat('commission_amount')) || 0;
      } else {
        commission = Math.round(amount * (Number(sv.getFloat('commission_rate')) || 0)) / 100;
      }
      if (!o.getString('service_name')) o.set('service_name', sv.getString('name'));
      if (!o.getString('category')) o.set('category', sv.getString('category'));
    } catch (err) { commission = 0; }
  }
  if (commission > amount) commission = amount;
  o.set('commission', commission);
}, 'service_orders');

// Venta creada -> asiento en el libro (retenido en el punto).
onRecordAfterCreateRequest((e) => {
  const o = e.record;
  if (o.getString('status') === 'cancelled') return;
  const amount = Number(o.getFloat('amount')) || 0;
  if (amount <= 0) return;
  const commission = Number(o.getFloat('commission')) || 0;
  try {
    const coll = $app.dao().findCollectionByNameOrId('payments');
    const p = new Record(coll, {
      kind: 'service', ref: o.id, label: o.getString('service_name') || 'Servicio',
      point_id: o.getString('point_id'), point_name: o.getString('point_name'),
      amount: amount, commission: commission, net: amount > commission ? amount - commission : 0,
      method: 'cash', status: 'held_at_point'
    });
    $app.dao().saveRecord(p);
  } catch (err) {}
}, 'service_orders');
