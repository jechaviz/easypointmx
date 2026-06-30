/// <reference path="../pb_data/types.d.ts" />

// Plan de abonos + recordatorios. Inline en cada handler (el JSVM no captura el
// scope del archivo).

// Al reservar con recordatorios: genera el calendario de fechas.
onRecordBeforeCreateRequest((e) => {
  const rec = e.record;
  if (!rec.getBool('reminder_optin')) return;

  const cadence = rec.getString('reminder_cadence') || 'biweekly';
  if (cadence === 'custom') {
    const dates = String(rec.getString('reminder_dates') || '')
      .split(/[\n,;]+/).map((s) => s.trim())
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)).sort();
    rec.set('reminder_dates', dates.join('\n'));
    return;
  }

  const step = cadence === 'weekly' ? 7 : 14;
  const excDate = String(rec.getString('excursion_date') || '').trim();
  const end = /^\d{4}-\d{2}-\d{2}$/.test(excDate) ? new Date(excDate + 'T00:00:00') : null;
  const out = [];
  for (let i = 1; i <= 8; i++) {
    const d = new Date();
    d.setDate(d.getDate() + step * i);
    if (end && d >= end) break;
    out.push(d.toISOString().slice(0, 10));
  }
  rec.set('reminder_dates', out.join('\n'));
}, 'excursion_bookings');

// Procesa los recordatorios vencidos (envía y marca). Staff/admin.
routerAdd('POST', '/api/reminders/run', (c) => {
  const info = $apis.requestInfo(c);
  if (!info.authRecord && !info.admin) return c.json(401, { error: 'unauthorized' });

  const today = new Date().toISOString().slice(0, 10);
  let processed = 0, sent = 0;

  let bookings = [];
  try {
    bookings = $app.dao().findRecordsByFilter(
      'excursion_bookings',
      "reminder_optin = true && balance > 0 && payment_status != 'paid' && payment_status != 'credit'",
      '-created', 500, 0
    );
  } catch (err) {}

  bookings.forEach((b) => {
    const dates = String(b.getString('reminder_dates') || '').split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const sentArr = String(b.getString('reminders_sent') || '').split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const due = dates.filter((d) => d <= today && sentArr.indexOf(d) === -1);
    if (!due.length) return;
    processed++;

    const channel = b.getString('reminder_channel') || 'email';
    const email = b.getString('customer_email');
    const phone = String(b.getString('customer_phone') || '').replace(/\D/g, '');
    const balance = Number(b.getFloat('balance')) || 0;
    const name = b.getString('customer_name');
    const excName = b.getString('excursion_name') || b.getString('destination') || 'tu excursión';

    if ((channel === 'email' || channel === 'both') && email) {
      try {
        const msg = new MailerMessage({
          from: { address: $app.settings().meta.senderAddress, name: $app.settings().meta.senderName },
          to: [{ address: email }],
          subject: 'Recordatorio de abono — Easypoint',
          html: `Hola ${name}, te recordamos tu abono pendiente de ${excName}. Saldo: $${balance}. Abona en tu punto Easypoint o en línea para asegurar tu lugar.`
        });
        $app.newMailClient().send(msg);
        sent++;
      } catch (err) {}
    }
    if (channel === 'whatsapp' || channel === 'both') {
      const waUrl = $os.getenv('WHATSAPP_API_URL');
      const waToken = $os.getenv('WHATSAPP_API_TOKEN');
      if (waUrl && waToken && phone) {
        try {
          $http.send({
            url: waUrl, method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + waToken },
            body: JSON.stringify({ to: phone, text: `Easypoint: recordatorio de abono de ${excName}. Saldo $${balance}. Abona para asegurar tu lugar.` }),
            timeout: 15
          });
          sent++;
        } catch (err) {}
      }
    }

    b.set('reminders_sent', sentArr.concat(due).join('\n'));
    try { $app.dao().saveRecord(b); } catch (err) {}
  });

  return c.json(200, { processed: processed, sent: sent });
});

// Cron diario (14:00 UTC ~ 8am CDMX): procesa recordatorios vencidos.
cronAdd('payment_reminders', '0 14 * * *', () => {
  const today = new Date().toISOString().slice(0, 10);
  let bookings = [];
  try {
    bookings = $app.dao().findRecordsByFilter(
      'excursion_bookings',
      "reminder_optin = true && balance > 0 && payment_status != 'paid' && payment_status != 'credit'",
      '-created', 500, 0
    );
  } catch (err) { return; }

  bookings.forEach((b) => {
    const dates = String(b.getString('reminder_dates') || '').split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const sentArr = String(b.getString('reminders_sent') || '').split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const due = dates.filter((d) => d <= today && sentArr.indexOf(d) === -1);
    if (!due.length) return;

    const channel = b.getString('reminder_channel') || 'email';
    const email = b.getString('customer_email');
    const phone = String(b.getString('customer_phone') || '').replace(/\D/g, '');
    const balance = Number(b.getFloat('balance')) || 0;
    const name = b.getString('customer_name');
    const excName = b.getString('excursion_name') || b.getString('destination') || 'tu excursión';

    if ((channel === 'email' || channel === 'both') && email) {
      try {
        const msg = new MailerMessage({
          from: { address: $app.settings().meta.senderAddress, name: $app.settings().meta.senderName },
          to: [{ address: email }],
          subject: 'Recordatorio de abono — Easypoint',
          html: `Hola ${name}, te recordamos tu abono pendiente de ${excName}. Saldo: $${balance}.`
        });
        $app.newMailClient().send(msg);
      } catch (err) {}
    }
    if (channel === 'whatsapp' || channel === 'both') {
      const waUrl = $os.getenv('WHATSAPP_API_URL');
      const waToken = $os.getenv('WHATSAPP_API_TOKEN');
      if (waUrl && waToken && phone) {
        try {
          $http.send({ url: waUrl, method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + waToken }, body: JSON.stringify({ to: phone, text: `Easypoint: recordatorio de abono de ${excName}. Saldo $${balance}.` }), timeout: 15 });
        } catch (err) {}
      }
    }

    b.set('reminders_sent', sentArr.concat(due).join('\n'));
    try { $app.dao().saveRecord(b); } catch (err) {}
  });
});
