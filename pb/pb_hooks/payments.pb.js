/// <reference path="../pb_data/types.d.ts" />

// Pasarela de pago para reservas de excursiones y guías.
// Se activa con variables de entorno; sin ellas cae a pago MANUAL (efectivo/
// transferencia) devolviendo una referencia. Todo va inline en cada handler
// (el JSVM de PocketBase no captura el scope del archivo).
//
//   PAYMENT_PROVIDER=mercadopago|stripe
//   MERCADOPAGO_ACCESS_TOKEN=...
//   STRIPE_SECRET_KEY=...
//   EASYPOINT_APP_URL=https://tu-dominio/app/   (back_urls / notification_url)
//   PAYMENT_MANUAL_INSTRUCTIONS=...             (texto para pago manual)

// Crea un checkout y devuelve la URL de la pasarela (o instrucciones manuales).
routerAdd('POST', '/api/pay/checkout', (c) => {
  const info = $apis.requestInfo(c);
  const body = info.data || {};
  const collection = String(body.collection || c.queryParam('collection') || '');
  const id = String(body.id || c.queryParam('id') || '');

  if (!collection || !id) return c.json(400, { error: 'missing_params' });
  if (collection !== 'excursion_bookings' && collection !== 'shipping_guides') {
    return c.json(400, { error: 'bad_collection' });
  }

  let rec;
  try { rec = $app.dao().findRecordById(collection, id); }
  catch (err) { return c.json(404, { error: 'not_found' }); }

  const amount = collection === 'excursion_bookings'
    ? (Number(rec.getFloat('total')) || 0)
    : (Number(rec.getFloat('price')) || 0);
  if (amount <= 0) return c.json(400, { error: 'invalid_amount' });

  const title = collection === 'excursion_bookings'
    ? ('Reserva: ' + (rec.getString('excursion_name') || 'Excursión'))
    : ('Guía ' + (rec.getString('carrier') || '').toUpperCase());
  const reference = collection + ':' + id;

  const appUrl = $os.getenv('EASYPOINT_APP_URL') || '';
  const provider = String($os.getenv('PAYMENT_PROVIDER') || '').toLowerCase();
  const mpToken = $os.getenv('MERCADOPAGO_ACCESS_TOKEN');
  const stripeKey = $os.getenv('STRIPE_SECRET_KEY');

  if (provider === 'mercadopago' && mpToken) {
    const payload = {
      items: [{ title: title, quantity: 1, unit_price: amount, currency_id: 'MXN' }],
      external_reference: reference
    };
    if (appUrl) {
      payload.back_urls = { success: appUrl, failure: appUrl, pending: appUrl };
      payload.notification_url = appUrl.replace(/\/$/, '') + '/api/pay/webhook/mercadopago';
    }
    const res = $http.send({
      url: 'https://api.mercadopago.com/checkout/preferences',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + mpToken },
      body: JSON.stringify(payload),
      timeout: 20
    });
    if (res.statusCode >= 400) return c.json(502, { error: 'gateway_error', detail: res.raw });
    const pref = res.json || {};
    return c.json(200, { provider: 'mercadopago', url: pref.init_point || pref.sandbox_init_point, amount: amount });
  }

  if (provider === 'stripe' && stripeKey) {
    const params = [
      'mode=payment',
      'line_items[0][quantity]=1',
      'line_items[0][price_data][currency]=mxn',
      'line_items[0][price_data][unit_amount]=' + Math.round(amount * 100),
      'line_items[0][price_data][product_data][name]=' + encodeURIComponent(title),
      'client_reference_id=' + encodeURIComponent(reference),
      'success_url=' + encodeURIComponent(appUrl || 'https://example.com'),
      'cancel_url=' + encodeURIComponent(appUrl || 'https://example.com')
    ].join('&');
    const res = $http.send({
      url: 'https://api.stripe.com/v1/checkout/sessions',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Bearer ' + stripeKey },
      body: params,
      timeout: 20
    });
    if (res.statusCode >= 400) return c.json(502, { error: 'gateway_error', detail: res.raw });
    return c.json(200, { provider: 'stripe', url: (res.json || {}).url, amount: amount });
  }

  return c.json(200, {
    provider: 'manual',
    amount: amount,
    reference: reference,
    instructions: $os.getenv('PAYMENT_MANUAL_INSTRUCTIONS') ||
      'Paga en efectivo o por transferencia en tu punto Easypoint y confirma por WhatsApp para asegurar tu lugar.'
  });
});

// Webhook MercadoPago -> marca pagado.
routerAdd('POST', '/api/pay/webhook/mercadopago', (c) => {
  const info = $apis.requestInfo(c);
  const data = info.data || {};
  const token = $os.getenv('MERCADOPAGO_ACCESS_TOKEN');
  const paymentId = (data.data && data.data.id) || c.queryParam('id') || c.queryParam('data.id');
  if (token && paymentId) {
    try {
      const res = $http.send({
        url: 'https://api.mercadopago.com/v1/payments/' + paymentId,
        headers: { Authorization: 'Bearer ' + token },
        timeout: 20
      });
      const p = res.json || {};
      if (p.status === 'approved' && p.external_reference) {
        const parts = String(p.external_reference).split(':');
        if (parts.length === 2) {
          try {
            const rec = $app.dao().findRecordById(parts[0], parts[1]);
            rec.set('payment_status', 'paid');
            rec.set('payment_method', 'mercadopago');
            rec.set('payment_ref', String(paymentId));
            rec.set('paid_at', new Date().toISOString());
            if (parts[0] === 'shipping_guides' && rec.getString('status') === 'quoted') rec.set('status', 'paid');
            $app.dao().saveRecord(rec);
          } catch (err) {}
        }
      }
    } catch (err) {}
  }
  return c.json(200, { ok: true });
});

// Webhook Stripe -> marca pagado.
routerAdd('POST', '/api/pay/webhook/stripe', (c) => {
  const info = $apis.requestInfo(c);
  const ev = info.data || {};
  try {
    const obj = (ev.data && ev.data.object) || {};
    const done = obj.payment_status === 'paid' || ev.type === 'checkout.session.completed';
    if (done && obj.client_reference_id) {
      const parts = String(obj.client_reference_id).split(':');
      if (parts.length === 2) {
        const rec = $app.dao().findRecordById(parts[0], parts[1]);
        rec.set('payment_status', 'paid');
        rec.set('payment_method', 'stripe');
        rec.set('payment_ref', String(obj.id || ''));
        rec.set('paid_at', new Date().toISOString());
        if (parts[0] === 'shipping_guides' && rec.getString('status') === 'quoted') rec.set('status', 'paid');
        $app.dao().saveRecord(rec);
      }
    }
  } catch (err) {}
  return c.json(200, { ok: true });
});
