/// <reference path="../pb_data/types.d.ts" />

// Liquidaciones (settlements) y cortes de chofer. Todo inline (el JSVM no
// captura el scope del archivo).

// Corre liquidaciones del periodo (admin/staff): comisiones por punto desde
// pagos entregados + fee Easypoint por proveedor desde reservas pagadas.
routerAdd('POST', '/api/settlements/run', (c) => {
  const info = $apis.requestInfo(c);
  if (!info.authRecord && !info.admin) return c.json(401, { error: 'unauthorized' });

  const body = info.data || {};
  const period = String(body.period || c.queryParam('period') || '').trim();
  if (!period) throw new BadRequestError('Falta el periodo.');

  let created = 0;
  const coll = $app.dao().findCollectionByNameOrId('settlements');

  // Por punto: suma de pagos status='delivered' (excluye method 'credit').
  let points = [];
  try { points = $app.dao().findRecordsByFilter('points', "commission_rate > 0", '', 0, 0); }
  catch (err) { points = []; }
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const pid = pt.id;
    let pays = [];
    try { pays = $app.dao().findRecordsByFilter('payments', "point_id = {:pid} && status = 'delivered' && method != 'credit'", '', 0, 0, { pid: pid }); }
    catch (err) { pays = []; }
    if (!pays.length) continue;
    let gross = 0, fee = 0, net = 0;
    for (let j = 0; j < pays.length; j++) {
      gross += Number(pays[j].getFloat('amount')) || 0;
      fee += Number(pays[j].getFloat('commission')) || 0;
      net += Number(pays[j].getFloat('net')) || 0;
    }
    const st = new Record(coll, {
      kind: 'point', ref: pid, ref_name: pt.getString('name'), period: period,
      gross: gross, fee: fee, net: net, folio: 'LIQ-P-' + pid, status: 'pending'
    });
    $app.dao().saveRecord(st);
    created++;
  }

  // Por proveedor: fee Easypoint sobre reservas pagadas de sus excursiones.
  let providers = [];
  try { providers = $app.dao().findRecordsByFilter('providers', "active = true", '', 0, 0); }
  catch (err) { providers = []; }
  for (let i = 0; i < providers.length; i++) {
    const pv = providers[i];
    const pvid = pv.id;
    let excs = [];
    try { excs = $app.dao().findRecordsByFilter('excursions', "provider_id = {:pid}", '', 0, 0, { pid: pvid }); }
    catch (err) { excs = []; }
    if (!excs.length) continue;
    let gross = 0, count = 0;
    for (let j = 0; j < excs.length; j++) {
      let bks = [];
      try { bks = $app.dao().findRecordsByFilter('excursion_bookings', "excursion_ref = {:eid} && payment_status = 'paid'", '', 0, 0, { eid: excs[j].id }); }
      catch (err) { bks = []; }
      for (let k = 0; k < bks.length; k++) { gross += Number(bks[k].getFloat('total')) || 0; count++; }
    }
    if (gross <= 0) continue;
    // Fee Easypoint: porcentaje (fee_rate) o cantidad fija por reserva (fee_amount).
    let fee;
    if ((pv.getString('fee_type') || 'percent') === 'fixed') {
      fee = (Number(pv.getFloat('fee_amount')) || 0) * count;
    } else {
      const rate = Number(pv.getFloat('fee_rate')) || 0;
      fee = Math.round(gross * rate) / 100;
    }
    const net = gross > fee ? gross - fee : 0;
    const st = new Record(coll, {
      kind: 'provider', ref: pvid, ref_name: pv.getString('name'), period: period,
      gross: gross, fee: fee, net: net, folio: 'LIQ-V-' + pvid, status: 'pending'
    });
    $app.dao().saveRecord(st);
    created++;
  }

  return c.json(200, { created: created });
});

// Corte del chofer (staff): agrupa sus pagos recolectados en un settlement y
// los marca como entregados.
routerAdd('POST', '/api/cortes/driver', (c) => {
  const info = $apis.requestInfo(c);
  if (!info.authRecord && !info.admin) return c.json(401, { error: 'unauthorized' });

  const driverId = info.authRecord ? info.authRecord.id : '';
  if (!driverId) throw new BadRequestError('Sin chofer.');

  let pays = [];
  try { pays = $app.dao().findRecordsByFilter('payments', "collected_by = {:d} && status = 'collected'", '', 0, 0, { d: driverId }); }
  catch (err) { pays = []; }
  if (!pays.length) return c.json(200, { folio: '', total: 0, count: 0 });

  let gross = 0, net = 0;
  for (let i = 0; i < pays.length; i++) {
    gross += Number(pays[i].getFloat('amount')) || 0;
    net += Number(pays[i].getFloat('net')) || 0;
  }

  const now = new Date().toISOString();
  const folio = 'CORTE-' + now;
  const coll = $app.dao().findCollectionByNameOrId('settlements');
  const st = new Record(coll, {
    kind: 'driver_corte', ref: driverId, folio: folio,
    gross: gross, net: net, status: 'pending'
  });
  $app.dao().saveRecord(st);

  for (let i = 0; i < pays.length; i++) {
    const p = pays[i];
    p.set('status', 'delivered');
    p.set('delivered_at', now);
    $app.dao().saveRecord(p);
  }

  return c.json(200, { folio: folio, total: net, count: pays.length });
});
