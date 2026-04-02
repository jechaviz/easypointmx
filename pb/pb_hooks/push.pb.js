/// <reference path="../pb_data/types.d.ts" />

// Required env vars:
// ONESIGNAL_ENABLED=1
// ONESIGNAL_APP_ID=...
// ONESIGNAL_REST_API_KEY=...
// EASYPOINT_APP_URL=https://tu-dominio/app/

const ONESIGNAL_APP_ID = $os.getenv('ONESIGNAL_APP_ID');
const ONESIGNAL_REST_API_KEY = $os.getenv('ONESIGNAL_REST_API_KEY');
const ONESIGNAL_ENABLED = $os.getenv('ONESIGNAL_ENABLED') !== '0';
const EASYPOINT_APP_URL = $os.getenv('EASYPOINT_APP_URL');

function pushIsConfigured() {
  return Boolean(ONESIGNAL_ENABLED && ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY);
}

function asText(value) {
  return String(value || '').trim();
}

function buildTagFilters(tags) {
  const filters = [];

  Object.entries(tags || {}).forEach(([key, value]) => {
    const normalized = asText(value);
    if (!normalized) return;
    if (filters.length) filters.push({ operator: 'AND' });
    filters.push({
      field: 'tag',
      key,
      relation: '=',
      value: normalized
    });
  });

  return filters;
}

function sendOneSignalPush({ title, message, filters, externalIds, data, url }) {
  if (!pushIsConfigured()) return null;

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    target_channel: 'push',
    headings: {
      en: title,
      es: title
    },
    contents: {
      en: message,
      es: message
    },
    data: data || {}
  };

  const normalizedUrl = asText(url || EASYPOINT_APP_URL);
  if (normalizedUrl) {
    payload.url = normalizedUrl;
  }

  const aliasList = (externalIds || []).map(asText).filter(Boolean);
  if (aliasList.length) {
    payload.include_aliases = { external_id: aliasList };
  } else if ((filters || []).length) {
    payload.filters = filters;
  } else {
    return null;
  }

  const response = $http.send({
    url: 'https://api.onesignal.com/notifications',
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Key ${ONESIGNAL_REST_API_KEY}`
    },
    body: JSON.stringify(payload),
    timeout: 20
  });

  if (response.statusCode >= 400) {
    console.log('[push.pb] OneSignal error:', response.statusCode, response.raw);
  }

  return response;
}

function sendToRole(role, options) {
  const payload = options || {};
  const filters = buildTagFilters({
    auth_source: 'live',
    role,
    ...(payload.tags || {})
  });

  return sendOneSignalPush({
    title: payload.title,
    message: payload.message,
    filters,
    data: payload.data,
    url: payload.url
  });
}

function sendToRoles(roles, options) {
  (roles || []).forEach((role) => sendToRole(role, options));
}

function sendToExternalIds(externalIds, options) {
  const payload = options || {};
  return sendOneSignalPush({
    title: payload.title,
    message: payload.message,
    externalIds,
    data: payload.data,
    url: payload.url
  });
}

function statusChanged(record) {
  const before = record.originalCopy().getString('status');
  const after = record.getString('status');
  return {
    before,
    after,
    changed: before !== after
  };
}

onRecordAfterCreateRequest((e) => {
  const record = e.record;
  if (record.getBool('verified') !== false) return;

  const fullName = asText(record.getString('full_name')) || asText(record.getString('email')) || 'Un nuevo usuario';
  const role = asText(record.getString('role')) || 'operator';

  sendToRole('admin', {
    title: 'Nuevo acceso pendiente',
    message: `${fullName} solicito acceso como ${role}.`,
    data: {
      kind: 'user_pending',
      user_id: asText(record.id),
      role
    }
  });
}, 'users');

onRecordAfterUpdateRequest((e) => {
  const record = e.record;
  const before = record.originalCopy();
  const wasVerified = before.getBool('verified');
  const isVerified = record.getBool('verified');

  if (wasVerified === false && isVerified === true) {
    sendToExternalIds([record.id], {
      title: 'Acceso aprobado',
      message: 'Tu cuenta ya fue aprobada. Ya puedes entrar a Easypoint.',
      data: {
        kind: 'user_approved',
        user_id: asText(record.id)
      }
    });
  }
}, 'users');

onRecordAfterCreateRequest((e) => {
  const record = e.record;
  const status = asText(record.getString('status')) || 'new';
  if (status !== 'new') return;

  const businessName = asText(record.getString('business_name')) || 'Nuevo prospecto';

  sendToRoles(['admin', 'sales'], {
    title: 'Nueva solicitud de afiliacion',
    message: `${businessName} quiere integrarse a la red Easypoint.`,
    data: {
      kind: 'partner_application_new',
      application_id: asText(record.id)
    }
  });
}, 'partner_applications');

onRecordAfterUpdateRequest((e) => {
  const record = e.record;
  const status = statusChanged(record);
  if (!status.changed) return;
  if (!['approved', 'rejected'].includes(status.after)) return;

  const businessName = asText(record.getString('business_name')) || 'Un prospecto';
  const approved = status.after === 'approved';

  sendToRoles(['admin', 'sales'], {
    title: approved ? 'Afiliacion aprobada' : 'Afiliacion rechazada',
    message: approved
      ? `${businessName} ya puede pasar a onboarding operativo.`
      : `${businessName} fue descartado del pipeline comercial.`,
    data: {
      kind: approved ? 'partner_application_approved' : 'partner_application_rejected',
      application_id: asText(record.id)
    }
  });
}, 'partner_applications');

onRecordAfterCreateRequest((e) => {
  const record = e.record;
  const status = asText(record.getString('status')) || 'pending';
  if (status !== 'pending') return;

  const trackingId = asText(record.getString('tracking_id')) || 'Nuevo envio';

  sendToRole('driver', {
    title: 'Nuevo envio por recolectar',
    message: `${trackingId} ya esta listo para entrar en ruta.`,
    data: {
      kind: 'shipment_pending',
      shipment_id: asText(record.id),
      tracking_id: trackingId
    }
  });
}, 'shipments');

onRecordAfterUpdateRequest((e) => {
  const record = e.record;
  const status = statusChanged(record);
  if (!status.changed || status.after !== 'at_point') return;

  const trackingId = asText(record.getString('tracking_id')) || 'Un envio';
  const pointId = asText(record.getString('point_id'));

  sendToRole('admin', {
    title: 'Paquete listo en local',
    message: `${trackingId} ya llego a su punto de entrega.`,
    data: {
      kind: 'shipment_at_point',
      shipment_id: asText(record.id),
      tracking_id: trackingId,
      point_id: pointId
    }
  });

  if (pointId) {
    sendToRole('operator', {
      title: 'Paquete listo para mostrador',
      message: `${trackingId} ya esta listo para entrega en tu local.`,
      tags: { point_ref: pointId },
      data: {
        kind: 'shipment_at_point',
        shipment_id: asText(record.id),
        tracking_id: trackingId,
        point_id: pointId
      }
    });
  }
}, 'shipments');

onRecordAfterUpdateRequest((e) => {
  const record = e.record;
  const status = statusChanged(record);
  if (!status.changed || status.after !== 'paid') return;

  const pointId = asText(record.getString('point_id'));
  const pointName = asText(record.getString('point_name')) || 'Un local';
  const period = asText(record.getString('period'));

  sendToRole('admin', {
    title: 'Comision liquidada',
    message: `${pointName} quedo marcado como pagado${period ? ` para ${period}` : ''}.`,
    data: {
      kind: 'commission_paid',
      commission_id: asText(record.id),
      point_id: pointId
    }
  });

  if (pointId) {
    sendToRole('operator', {
      title: 'Comision liquidada',
      message: `${pointName} ya tiene una comision pagada${period ? ` para ${period}` : ''}.`,
      tags: { point_ref: pointId },
      data: {
        kind: 'commission_paid',
        commission_id: asText(record.id),
        point_id: pointId
      }
    });
  }
}, 'commissions');
