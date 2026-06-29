/// <reference path="../pb_data/types.d.ts" />

// Notificaciones para los servicios nuevos (excursiones y guias).
// Reutiliza los helpers de push definidos en push.pb.js
// (globalThis.EASYPOINT_PUSH_HOOKS). La confirmacion por WhatsApp al cliente y
// al proveedor se dispara desde la UI con deep links wa.me; aqui solo avisamos
// al equipo (admin) por push cuando entra una reserva nueva.
//
// IMPORTANTE: en el JSVM de PocketBase los callbacks de hook NO capturan el
// scope del archivo. Todo lo que se use dentro del handler debe venir de los
// globals de PB ($os, etc.) o de globalThis. Por eso el chequeo de env va inline.

// Nueva reservacion de excursion -> avisar al admin.
onRecordAfterCreateRequest((e) => {
  if ($os.getenv('ONESIGNAL_ENABLED') === '0' || !$os.getenv('ONESIGNAL_APP_ID') || !$os.getenv('ONESIGNAL_REST_API_KEY')) return;
  const helpers = globalThis.EASYPOINT_PUSH_HOOKS;
  if (!helpers) return;

  const record = e.record;
  const customer = helpers.asText(record.getString('customer_name')) || 'Un cliente';
  const excursion = helpers.asText(record.getString('excursion_name')) ||
    helpers.asText(record.getString('destination')) || 'una excursion';
  const date = helpers.asText(record.getString('excursion_date'));

  helpers.sendToRole('admin', {
    title: 'Nueva reserva de excursion',
    message: `${customer} reservo ${excursion}${date ? ` para ${date}` : ''}.`,
    data: {
      kind: 'excursion_booking_new',
      booking_id: helpers.asText(record.id)
    }
  });
}, 'excursion_bookings');

// Reservacion confirmada -> avisar al admin (trazabilidad).
onRecordAfterUpdateRequest((e) => {
  if ($os.getenv('ONESIGNAL_ENABLED') === '0' || !$os.getenv('ONESIGNAL_APP_ID') || !$os.getenv('ONESIGNAL_REST_API_KEY')) return;
  const helpers = globalThis.EASYPOINT_PUSH_HOOKS;
  if (!helpers) return;

  const record = e.record;
  const status = helpers.statusChanged(record);
  if (!status.changed || status.after !== 'confirmed') return;

  const customer = helpers.asText(record.getString('customer_name')) || 'Una reserva';
  const excursion = helpers.asText(record.getString('excursion_name')) ||
    helpers.asText(record.getString('destination')) || 'la excursion';

  helpers.sendToRole('admin', {
    title: 'Reserva de excursion confirmada',
    message: `${customer} quedo confirmado para ${excursion}.`,
    data: {
      kind: 'excursion_booking_confirmed',
      booking_id: helpers.asText(record.id)
    }
  });
}, 'excursion_bookings');

// Nueva guia generada -> avisar al admin.
onRecordAfterCreateRequest((e) => {
  if ($os.getenv('ONESIGNAL_ENABLED') === '0' || !$os.getenv('ONESIGNAL_APP_ID') || !$os.getenv('ONESIGNAL_REST_API_KEY')) return;
  const helpers = globalThis.EASYPOINT_PUSH_HOOKS;
  if (!helpers) return;

  const record = e.record;
  const carrier = (helpers.asText(record.getString('carrier')) || 'paqueteria').toUpperCase();
  const recipient = helpers.asText(record.getString('recipient_name')) || 'destinatario';

  helpers.sendToRole('admin', {
    title: 'Nueva guia vendida',
    message: `Guia ${carrier} para ${recipient} registrada en el sistema.`,
    data: {
      kind: 'shipping_guide_new',
      guide_id: helpers.asText(record.id)
    }
  });
}, 'shipping_guides');

// Nuevo ticket de soporte/queja -> avisar al admin de inmediato (resolución privada).
onRecordAfterCreateRequest((e) => {
  if ($os.getenv('ONESIGNAL_ENABLED') === '0' || !$os.getenv('ONESIGNAL_APP_ID') || !$os.getenv('ONESIGNAL_REST_API_KEY')) return;
  const helpers = globalThis.EASYPOINT_PUSH_HOOKS;
  if (!helpers) return;

  const record = e.record;
  const kind = helpers.asText(record.getString('kind')) || 'mensaje';
  const customer = helpers.asText(record.getString('customer_name')) || 'Un cliente';

  helpers.sendToRole('admin', {
    title: kind === 'complaint' ? 'Queja recibida (atender ya)' : 'Nuevo ticket de soporte',
    message: `${customer} envió un ${kind}. Atiéndelo en privado antes de que escale.`,
    data: {
      kind: 'support_ticket_new',
      ticket_id: helpers.asText(record.id)
    }
  });
}, 'support_tickets');
