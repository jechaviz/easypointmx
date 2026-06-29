/// <reference path="../pb_data/types.d.ts" />

// Integridad y cupo de las reservas de excursiones.
// El create de excursion_bookings es PUBLICO, asi que validamos en el servidor
// (no solo en la UI). Todo va inline en cada handler: en el JSVM de PocketBase
// los callbacks de hook no capturan el scope del archivo.
//
//  - status entrante se fuerza a 'new'
//  - personas >= 1
//  - no se aceptan fechas pasadas
//  - si la excursion existe: la fecha debe estar entre las publicadas por el
//    proveedor, se recalcula el total desde el precio del catalogo (anti-fraude),
//    se denormalizan nombre/destino, y se respeta el cupo por fecha
//    (max_capacity = asientos por salida; 0 = sin limite).
//
// Ademas expone disponibilidad publica por fecha SIN filtrar PII.

onRecordBeforeCreateRequest((e) => {
  const record = e.record;

  record.set('status', 'new');

  let people = Number(record.getFloat('people')) || 1;
  if (people < 1) { people = 1; }
  record.set('people', people);

  const today = new Date().toISOString().slice(0, 10);
  const date = String(record.getString('excursion_date') || '').trim();

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date < today) {
    throw new BadRequestError('La fecha seleccionada ya pasó.');
  }

  const ref = String(record.getString('excursion_ref') || '').trim();
  if (!ref) return; // sin catalogo resoluble (demo/fallback): no mas validacion

  let exc;
  try {
    exc = $app.dao().findRecordById('excursions', ref);
  } catch (err) {
    return; // ref no resuelve: se acepta tal cual (no romper reservas)
  }

  record.set('excursion_name', exc.getString('name'));
  record.set('destination', exc.getString('destination'));

  const dates = String(exc.getString('available_dates') || '')
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
  if (dates.length && date && dates.indexOf(date) === -1) {
    throw new BadRequestError('Esa fecha no está disponible para esta excursión.');
  }

  const price = Number(exc.getFloat('price')) || 0;
  record.set('total', price * people);

  const cap = Number(exc.getFloat('max_capacity')) || 0;
  if (cap > 0 && date) {
    let taken = 0;
    try {
      const rows = $app.dao().findRecordsByFilter(
        'excursion_bookings',
        "excursion_ref = {:r} && excursion_date = {:d} && status != 'cancelled'",
        '', 1000, 0, { r: ref, d: date }
      );
      rows.forEach((r) => { taken += (Number(r.getFloat('people')) || 1); });
    } catch (err) {}
    if (taken + people > cap) {
      throw new BadRequestError('Esa fecha ya no tiene cupo disponible.');
    }
  }
}, 'excursion_bookings');

// Disponibilidad publica por fecha (cupos restantes), sin exponer reservas.
routerAdd('GET', '/api/excursion-availability/:id', (c) => {
  const id = String(c.pathParam('id') || '');
  let exc;
  try {
    exc = $app.dao().findRecordById('excursions', id);
  } catch (err) {
    return c.json(404, { error: 'not_found' });
  }

  const cap = Number(exc.getFloat('max_capacity')) || 0;
  const today = new Date().toISOString().slice(0, 10);
  const dates = String(exc.getString('available_dates') || '')
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && s >= today)
    .sort();

  const out = dates.map((d) => {
    let taken = 0;
    try {
      const rows = $app.dao().findRecordsByFilter(
        'excursion_bookings',
        "excursion_ref = {:r} && excursion_date = {:d} && status != 'cancelled'",
        '', 1000, 0, { r: id, d: d }
      );
      rows.forEach((r) => { taken += (Number(r.getFloat('people')) || 1); });
    } catch (err) {}
    return {
      date: d,
      remaining: cap > 0 ? Math.max(0, cap - taken) : null,
      soldOut: cap > 0 ? taken >= cap : false
    };
  });

  return c.json(200, { excursion_id: id, capacity: cap || null, dates: out });
});
