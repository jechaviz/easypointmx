/// <reference path="../pb_data/types.d.ts" />

// Bitácora de auditoría. Inserta un audit_log por cada cambio relevante.
// Todo inline (el JSVM de PocketBase NO captura el scope del archivo: los
// callbacks de hook solo ven los globals de PB). Nunca rompemos la petición
// original si el log falla -> todo dentro de try/catch.

// Actualización de reserva de excursión.
onRecordAfterUpdateRequest((e) => {
  try {
    const rec = e.record;
    let actor = '';
    try { const info = $apis.requestInfo(e.httpContext); actor = (info && info.authRecord) ? String(info.authRecord.id) : ''; } catch (err) { actor = ''; }
    const status = String(rec.getString('status') || '');
    const ps = String(rec.getString('payment_status') || '');
    const log = new Record($app.dao().findCollectionByNameOrId('audit_log'), {
      actor: actor,
      action: 'update',
      target_collection: 'excursion_bookings',
      target_id: String(rec.id),
      detail: `status=${status} payment_status=${ps} paid=${Number(rec.getFloat('amount_paid')) || 0}`
    });
    $app.dao().saveRecord(log);
  } catch (err) {}
}, 'excursion_bookings');

// Actualización de guía de envío.
onRecordAfterUpdateRequest((e) => {
  try {
    const rec = e.record;
    let actor = '';
    try { const info = $apis.requestInfo(e.httpContext); actor = (info && info.authRecord) ? String(info.authRecord.id) : ''; } catch (err) { actor = ''; }
    const status = String(rec.getString('status') || '');
    const ps = String(rec.getString('payment_status') || '');
    const log = new Record($app.dao().findCollectionByNameOrId('audit_log'), {
      actor: actor,
      action: 'update',
      target_collection: 'shipping_guides',
      target_id: String(rec.id),
      detail: `status=${status} payment_status=${ps} price=${Number(rec.getFloat('price')) || 0}`
    });
    $app.dao().saveRecord(log);
  } catch (err) {}
}, 'shipping_guides');

// Actualización de pago (cobranza).
onRecordAfterUpdateRequest((e) => {
  try {
    const rec = e.record;
    let actor = '';
    try { const info = $apis.requestInfo(e.httpContext); actor = (info && info.authRecord) ? String(info.authRecord.id) : ''; } catch (err) { actor = ''; }
    const status = String(rec.getString('status') || '');
    const log = new Record($app.dao().findCollectionByNameOrId('audit_log'), {
      actor: actor,
      action: 'update',
      target_collection: 'payments',
      target_id: String(rec.id),
      detail: `status=${status} amount=${Number(rec.getFloat('amount')) || 0} net=${Number(rec.getFloat('net')) || 0}`
    });
    $app.dao().saveRecord(log);
  } catch (err) {}
}, 'payments');

// Alta de pago (cobranza).
onRecordAfterCreateRequest((e) => {
  try {
    const rec = e.record;
    let actor = '';
    try { const info = $apis.requestInfo(e.httpContext); actor = (info && info.authRecord) ? String(info.authRecord.id) : ''; } catch (err) { actor = ''; }
    const kind = String(rec.getString('kind') || '');
    const status = String(rec.getString('status') || '');
    const log = new Record($app.dao().findCollectionByNameOrId('audit_log'), {
      actor: actor,
      action: 'create',
      target_collection: 'payments',
      target_id: String(rec.id),
      detail: `kind=${kind} status=${status} amount=${Number(rec.getFloat('amount')) || 0}`
    });
    $app.dao().saveRecord(log);
  } catch (err) {}
}, 'payments');

// Alta de ticket de soporte/queja.
onRecordAfterCreateRequest((e) => {
  try {
    const rec = e.record;
    let actor = '';
    try { const info = $apis.requestInfo(e.httpContext); actor = (info && info.authRecord) ? String(info.authRecord.id) : ''; } catch (err) { actor = ''; }
    const kind = String(rec.getString('kind') || '');
    const status = String(rec.getString('status') || '');
    const log = new Record($app.dao().findCollectionByNameOrId('audit_log'), {
      actor: actor,
      action: 'create',
      target_collection: 'support_tickets',
      target_id: String(rec.id),
      detail: `kind=${kind} status=${status}`
    });
    $app.dao().saveRecord(log);
  } catch (err) {}
}, 'support_tickets');
