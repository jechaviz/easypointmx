/// <reference path="../pb_data/types.d.ts" />

// Portal del Proveedor: Manifiestos de salida, validación de vouchers (Check-in),
// conclusión de excursiones y liquidación automática.
// Todo inline para el JSVM de PocketBase (no captura scopes externos).

// 1. Dashboard de métricas del proveedor
routerAdd('GET', '/api/provider/dashboard', (c) => {
  const info = $apis.requestInfo(c);
  if (!info.authRecord && !info.admin) return c.json(401, { error: 'unauthorized', message: 'Acceso no autorizado.' });

  const dao = $app.dao();
  let prov = null;

  if (info.admin) {
    const provId = String(c.queryParam('provider_id') || '').trim();
    if (provId) {
      try { prov = dao.findRecordById('providers', provId); } catch (_) {}
    }
  }

  if (!prov && info.authRecord) {
    const user = info.authRecord;
    const provRef = user.getString('provider_ref');
    if (provRef) {
      try { prov = dao.findRecordById('providers', provRef); } catch (_) {}
    }
    if (!prov) {
      const email = user.getString('email');
      if (email) {
        try { prov = dao.findFirstRecordByFilter('providers', 'email = {:em}', { em: email }); } catch (_) {}
      }
    }
  }

  if (!prov) return c.json(401, { error: 'unauthorized', message: 'Acceso exclusivo a proveedores afiliados.' });

  const provId = prov.id;

  // Excursiones asociadas
  let excs = [];
  try {
    excs = dao.findRecordsByFilter('excursions', 'provider_id = {:pid}', '', 0, 0, { pid: provId });
  } catch (_) {}

  let totalBookings = 0;
  let totalPassengers = 0;
  let completedPassengers = 0;
  let grossRevenue = 0;
  let nextDepartures = [];

  const today = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < excs.length; i++) {
    const exc = excs[i];
    const dates = String(exc.getString('available_dates') || '').split(/[\n,;]+/).map((s) => s.trim()).filter((s) => s >= today);
    dates.forEach((d) => {
      if (!nextDepartures.find((x) => x.date === d && x.excursion_id === exc.id)) {
        nextDepartures.push({ excursion_id: exc.id, excursion_name: exc.getString('name'), date: d });
      }
    });

    let bks = [];
    try {
      bks = dao.findRecordsByFilter('excursion_bookings', 'excursion_ref = {:eid} && status != "cancelled"', '', 0, 0, { eid: exc.id });
    } catch (_) {}

    bks.forEach((b) => {
      totalBookings++;
      const p = Number(b.getFloat('people')) || 1;
      totalPassengers += p;
      if (b.getString('status') === 'completed') completedPassengers += p;
      grossRevenue += Number(b.getFloat('amount_paid')) || 0;
    });
  }

  // Liquidaciones acumuladas
  let settlements = [];
  try {
    settlements = dao.findRecordsByFilter('settlements', 'kind = "provider" && ref = {:pid}', '-created', 10, 0, { pid: provId });
  } catch (_) {}

  let settledGross = 0;
  let settledFee = 0;
  let settledNet = 0;
  let pendingPayout = 0;

  settlements.forEach((st) => {
    const net = Number(st.getFloat('net')) || 0;
    settledGross += Number(st.getFloat('gross')) || 0;
    settledFee += Number(st.getFloat('fee')) || 0;
    settledNet += net;
    if (st.getString('status') === 'pending') pendingPayout += net;
  });

  return c.json(200, {
    provider: {
      id: prov.id,
      name: prov.getString('name'),
      whatsapp: prov.getString('whatsapp'),
      email: prov.getString('email'),
      fee_rate: Number(prov.getFloat('fee_rate')) || 0,
      fee_type: prov.getString('fee_type') || 'percent',
      clabe: prov.getString('clabe') || '',
      bank_name: prov.getString('bank_name') || ''
    },
    metrics: {
      excursions_count: excs.length,
      total_bookings: totalBookings,
      total_passengers: totalPassengers,
      completed_passengers: completedPassengers,
      gross_revenue: grossRevenue,
      settled_net: settledNet,
      pending_payout: pendingPayout
    },
    next_departures: nextDepartures.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    recent_settlements: settlements.map((s) => ({
      id: s.id,
      folio: s.getString('folio'),
      period: s.getString('period'),
      gross: Number(s.getFloat('gross')) || 0,
      fee: Number(s.getFloat('fee')) || 0,
      net: Number(s.getFloat('net')) || 0,
      status: s.getString('status'),
      created: s.created.string()
    }))
  });
});

// 2. Manifiesto de pasajeros por excursión y fecha
routerAdd('GET', '/api/provider/manifest', (c) => {
  const info = $apis.requestInfo(c);
  if (!info.authRecord && !info.admin) return c.json(401, { error: 'unauthorized', message: 'Acceso no autorizado.' });

  const dao = $app.dao();
  let prov = null;

  if (info.admin) {
    const provId = String(c.queryParam('provider_id') || '').trim();
    if (provId) {
      try { prov = dao.findRecordById('providers', provId); } catch (_) {}
    }
  }

  if (!prov && info.authRecord) {
    const user = info.authRecord;
    const provRef = user.getString('provider_ref');
    if (provRef) {
      try { prov = dao.findRecordById('providers', provRef); } catch (_) {}
    }
    if (!prov) {
      const email = user.getString('email');
      if (email) {
        try { prov = dao.findFirstRecordByFilter('providers', 'email = {:em}', { em: email }); } catch (_) {}
      }
    }
  }

  if (!prov) return c.json(401, { error: 'unauthorized', message: 'Acceso exclusivo a proveedores afiliados.' });

  const excId = String(c.queryParam('excursion_id') || '').trim();
  const date = String(c.queryParam('date') || '').trim();

  let excs = [];
  try {
    excs = dao.findRecordsByFilter('excursions', 'provider_id = {:pid}', '', 0, 0, { pid: prov.id });
  } catch (_) {}

  const validExcIds = new Set(excs.map((e) => e.id));

  let filter = 'status != "cancelled"';
  const filterParams = {};

  if (excId) {
    if (!validExcIds.has(excId) && !info.admin) {
      return c.json(403, { error: 'forbidden', message: 'Excursión no pertenece a tu catálogo.' });
    }
    filter += ' && excursion_ref = {:eid}';
    filterParams.eid = excId;
  } else {
    const idsList = Array.from(validExcIds);
    if (!idsList.length) return c.json(200, { items: [], summary: { total_passengers: 0, checked_in_count: 0, total_gross: 0, total_paid: 0, total_balance: 0 } });
    const orExpr = idsList.map((id, idx) => `excursion_ref = {:e${idx}}`).join(' || ');
    idsList.forEach((id, idx) => { filterParams[`e${idx}`] = id; });
    filter += ` && (${orExpr})`;
  }

  if (date) {
    filter += ' && excursion_date = {:d}';
    filterParams.d = date;
  }

  let bookings = [];
  try {
    bookings = dao.findRecordsByFilter('excursion_bookings', filter, '-created', 200, 0, filterParams);
  } catch (_) {
    bookings = [];
  }

  let totalPassengers = 0;
  let checkedInCount = 0;
  let totalGross = 0;
  let totalPaid = 0;
  let totalBalance = 0;

  const items = bookings.map((b) => {
    const people = Number(b.getFloat('people')) || 1;
    const isChecked = Boolean(b.getBool('checked_in'));
    const tot = Number(b.getFloat('total')) || 0;
    const paid = Number(b.getFloat('amount_paid')) || 0;
    const bal = Number(b.getFloat('balance')) || 0;

    totalPassengers += people;
    if (isChecked) checkedInCount += people;
    totalGross += tot;
    totalPaid += paid;
    totalBalance += bal;

    return {
      id: b.id,
      voucher_code: b.getString('voucher_code') || ('EP-BK-' + b.id.slice(0, 6).toUpperCase()),
      customer_name: b.getString('customer_name'),
      customer_phone: b.getString('customer_phone'),
      customer_email: b.getString('customer_email'),
      people: people,
      excursion_ref: b.getString('excursion_ref'),
      excursion_name: b.getString('excursion_name'),
      destination: b.getString('destination'),
      excursion_date: b.getString('excursion_date'),
      total: tot,
      amount_paid: paid,
      balance: bal,
      payment_status: b.getString('payment_status') || 'pending',
      status: b.getString('status'),
      checked_in: isChecked,
      checked_in_at: b.getString('checked_in_at') || null,
      created: b.created.string()
    };
  });

  return c.json(200, {
    items: items,
    summary: {
      total_passengers: totalPassengers,
      checked_in_count: checkedInCount,
      total_gross: totalGross,
      total_paid: totalPaid,
      total_balance: totalBalance
    }
  });
});

// 3. Validación de voucher y Check-in de abordaje
routerAdd('POST', '/api/provider/checkin', (c) => {
  const info = $apis.requestInfo(c);
  if (!info.authRecord && !info.admin) return c.json(401, { error: 'unauthorized', message: 'Acceso no autorizado.' });

  const dao = $app.dao();
  let prov = null;

  if (info.admin) {
    const provId = String(c.queryParam('provider_id') || '').trim();
    if (provId) {
      try { prov = dao.findRecordById('providers', provId); } catch (_) {}
    }
  }

  if (!prov && info.authRecord) {
    const user = info.authRecord;
    const provRef = user.getString('provider_ref');
    if (provRef) {
      try { prov = dao.findRecordById('providers', provRef); } catch (_) {}
    }
    if (!prov) {
      const email = user.getString('email');
      if (email) {
        try { prov = dao.findFirstRecordByFilter('providers', 'email = {:em}', { em: email }); } catch (_) {}
      }
    }
  }

  if (!prov) return c.json(401, { error: 'unauthorized', message: 'Acceso exclusivo a proveedores afiliados.' });

  const body = info.data || {};
  const code = String(body.code || body.token || c.queryParam('code') || '').trim();
  if (!code) return c.json(400, { error: 'missing_code', message: 'Escanea o ingresa el código del voucher.' });

  let rec = null;
  try {
    const list = dao.findRecordsByFilter(
      'excursion_bookings',
      'voucher_code = {:c} || voucher_token = {:c} || id = {:c}',
      '-created', 1, 0, { c: code }
    );
    if (list.length) rec = list[0];
  } catch (_) {}

  if (!rec) {
    return c.json(404, { error: 'not_found', message: 'Voucher no encontrado o no existe.' });
  }

  // Verificar pertenencia al proveedor
  let exc = null;
  try { exc = dao.findRecordById('excursions', rec.getString('excursion_ref')); } catch (_) {}

  if (exc && !info.admin) {
    if (exc.getString('provider_id') !== prov.id) {
      return c.json(403, {
        error: 'wrong_provider',
        message: 'Este voucher corresponde a otro proveedor (' + (exc.getString('provider_name') || 'distinto') + ').'
      });
    }
  }

  const now = new Date().toISOString();
  rec.set('checked_in', true);
  rec.set('checked_in_at', now);
  if (rec.getString('status') === 'new') {
    rec.set('status', 'confirmed');
  }
  dao.saveRecord(rec);

  const balance = Number(rec.getFloat('balance')) || 0;
  const warning = balance > 0 ? `El cliente tiene un saldo pendiente de $${balance} MXN.` : null;

  return c.json(200, {
    ok: true,
    message: '¡Abordaje confirmado exitosamente!',
    warning: warning,
    passenger: {
      name: rec.getString('customer_name'),
      people: Number(rec.getFloat('people')) || 1,
      excursion: rec.getString('excursion_name'),
      date: rec.getString('excursion_date'),
      voucher_code: rec.getString('voucher_code'),
      total: Number(rec.getFloat('total')) || 0,
      amount_paid: Number(rec.getFloat('amount_paid')) || 0,
      balance: balance,
      payment_status: rec.getString('payment_status'),
      checked_in_at: now
    }
  });
});

// 4. Conclusión de salida y LIQUIDACIÓN AUTOMÁTICA
routerAdd('POST', '/api/provider/complete-trip', (c) => {
  const info = $apis.requestInfo(c);
  if (!info.authRecord && !info.admin) return c.json(401, { error: 'unauthorized', message: 'Acceso no autorizado.' });

  const dao = $app.dao();
  let prov = null;

  if (info.admin) {
    const provId = String(c.queryParam('provider_id') || '').trim();
    if (provId) {
      try { prov = dao.findRecordById('providers', provId); } catch (_) {}
    }
  }

  if (!prov && info.authRecord) {
    const user = info.authRecord;
    const provRef = user.getString('provider_ref');
    if (provRef) {
      try { prov = dao.findRecordById('providers', provRef); } catch (_) {}
    }
    if (!prov) {
      const email = user.getString('email');
      if (email) {
        try { prov = dao.findFirstRecordByFilter('providers', 'email = {:em}', { em: email }); } catch (_) {}
      }
    }
  }

  if (!prov) return c.json(401, { error: 'unauthorized', message: 'Acceso exclusivo a proveedores afiliados.' });

  const body = info.data || {};
  const excId = String(body.excursion_id || '').trim();
  const date = String(body.date || '').trim();

  if (!excId || !date) {
    return c.json(400, { error: 'missing_params', message: 'Se requiere id de excursión y fecha de salida.' });
  }

  let exc = null;
  try { exc = dao.findRecordById('excursions', excId); } catch (_) {}
  if (!exc) return c.json(404, { error: 'excursion_not_found' });

  if (exc.getString('provider_id') !== prov.id && !info.admin) {
    return c.json(403, { error: 'forbidden' });
  }

  let bookings = [];
  try {
    bookings = dao.findRecordsByFilter(
      'excursion_bookings',
      'excursion_ref = {:eid} && excursion_date = {:d} && status != "cancelled"',
      '', 0, 0, { eid: excId, d: date }
    );
  } catch (_) { bookings = []; }

  if (!bookings.length) {
    return c.json(400, { error: 'no_bookings', message: 'No hay reservaciones activas para esta fecha.' });
  }

  let gross = 0;
  let count = 0;
  let checkedCount = 0;
  let totalBooked = 0;
  let uncollectedBalance = 0;

  for (let i = 0; i < bookings.length; i++) {
    const b = bookings[i];
    b.set('status', 'completed');
    dao.saveRecord(b);
    count++;
    if (b.getBool('checked_in')) checkedCount++;
    const paid = Number(b.getFloat('amount_paid')) || 0;
    const tot = Number(b.getFloat('total')) || 0;
    const bal = Number(b.getFloat('balance')) || (tot > paid ? tot - paid : 0);
    totalBooked += tot;
    gross += paid;
    if (bal > 0) uncollectedBalance += bal;
  }

  // CÁLCULO AUTOMÁTICO DE LIQUIDACIÓN SOBRE FONDOS EN CUSTODIA (ESCROW)
  let fee = 0;
  const feeType = prov.getString('fee_type') || 'percent';
  if (feeType === 'fixed') {
    fee = (Number(prov.getFloat('fee_amount')) || 0) * count;
  } else {
    const rate = Number(prov.getFloat('fee_rate')) || 15;
    fee = Math.round(gross * rate) / 100;
  }
  const net = gross > fee ? gross - fee : 0;

  const folio = 'LIQ-PR-' + prov.id.slice(0, 4).toUpperCase() + '-' + date.replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900);

  const clabe = prov.getString('clabe') || '';
  const bank = prov.getString('bank_name') || '';
  const bankInfo = clabe ? ` CLABE: ${clabe} (${bank})` : ' (Sin CLABE registrada)';
  const uncollectedInfo = uncollectedBalance > 0 ? ` [Saldos no liquidados por clientes: $${uncollectedBalance} MXN]` : '';

  let settlementRec = null;
  try {
    const coll = dao.findCollectionByNameOrId('settlements');
    settlementRec = new Record(coll, {
      kind: 'provider',
      ref: prov.id,
      ref_name: prov.getString('name'),
      period: date,
      gross: gross,
      fee: fee,
      net: net,
      folio: folio,
      status: 'pending',
      notes: 'Liquidación auto-generada: ' + exc.getString('name') + ' (' + date + '). ' + count + ' reservas procesadas. ' + bankInfo + uncollectedInfo
    });
    dao.saveRecord(settlementRec);
  } catch (err) {}

  return c.json(200, {
    ok: true,
    message: '¡Salida completada exitosamente! Se generó la liquidación correspondiente.',
    settlement: {
      folio: folio,
      date: date,
      excursion: exc.getString('name'),
      bookings_count: count,
      checked_in_count: checkedCount,
      total_booked: totalBooked,
      gross: gross,
      fee: fee,
      net: net,
      uncollected_balance: uncollectedBalance,
      status: 'pending'
    }
  });
});

// 5. Gestión de fechas de salida por el proveedor
routerAdd('POST', '/api/provider/excursions/dates', (c) => {
  const info = $apis.requestInfo(c);
  if (!info.authRecord && !info.admin) return c.json(401, { error: 'unauthorized', message: 'Acceso no autorizado.' });

  const dao = $app.dao();
  let prov = null;

  if (info.admin) {
    const provId = String(c.queryParam('provider_id') || '').trim();
    if (provId) {
      try { prov = dao.findRecordById('providers', provId); } catch (_) {}
    }
  }

  if (!prov && info.authRecord) {
    const user = info.authRecord;
    const provRef = user.getString('provider_ref');
    if (provRef) {
      try { prov = dao.findRecordById('providers', provRef); } catch (_) {}
    }
    if (!prov) {
      const email = user.getString('email');
      if (email) {
        try { prov = dao.findFirstRecordByFilter('providers', 'email = {:em}', { em: email }); } catch (_) {}
      }
    }
  }

  if (!prov) return c.json(401, { error: 'unauthorized', message: 'Acceso exclusivo a proveedores afiliados.' });

  const body = info.data || {};
  const excId = String(body.excursion_id || '').trim();
  const dates = Array.isArray(body.available_dates) ? body.available_dates : String(body.available_dates || '').split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  const maxCapacity = Number(body.max_capacity);

  let exc = null;
  try { exc = dao.findRecordById('excursions', excId); } catch (_) {}
  if (!exc) return c.json(404, { error: 'not_found' });

  if (exc.getString('provider_id') !== prov.id && !info.admin) {
    return c.json(403, { error: 'forbidden' });
  }

  exc.set('available_dates', dates.join('\n'));
  if (!isNaN(maxCapacity) && maxCapacity >= 0) {
    exc.set('max_capacity', maxCapacity);
  }
  dao.saveRecord(exc);

  return c.json(200, {
    ok: true,
    excursion_id: exc.id,
    available_dates: dates,
    max_capacity: exc.getFloat('max_capacity')
  });
});
