/// <reference path="../pb_data/types.d.ts" />

// Required env vars:
// ONESIGNAL_ENABLED=1
// ONESIGNAL_APP_ID=...
// ONESIGNAL_REST_API_KEY=...
// EASYPOINT_APP_URL=https://tu-dominio/app/

const PUSH_HELPERS = globalThis.EASYPOINT_PUSH_HOOKS = globalThis.EASYPOINT_PUSH_HOOKS || {};

PUSH_HELPERS.oneSignalAppId = $os.getenv('ONESIGNAL_APP_ID');
PUSH_HELPERS.oneSignalRestApiKey = $os.getenv('ONESIGNAL_REST_API_KEY');
PUSH_HELPERS.oneSignalEnabled = $os.getenv('ONESIGNAL_ENABLED') !== '0';
PUSH_HELPERS.appUrl = $os.getenv('EASYPOINT_APP_URL');

PUSH_HELPERS.pushIsConfigured = function pushIsConfigured() {
  return Boolean(
    PUSH_HELPERS.oneSignalEnabled &&
    PUSH_HELPERS.oneSignalAppId &&
    PUSH_HELPERS.oneSignalRestApiKey
  );
};

PUSH_HELPERS.asText = function asText(value) {
  return String(value || '').trim();
};

PUSH_HELPERS.buildTagFilters = function buildTagFilters(tags) {
  const filters = [];

  Object.entries(tags || {}).forEach(([key, value]) => {
    const normalized = PUSH_HELPERS.asText(value);
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
};

PUSH_HELPERS.sendOneSignalPush = function sendOneSignalPush({ title, message, filters, externalIds, data, url }) {
  if (!PUSH_HELPERS.pushIsConfigured()) return null;

  const payload = {
    app_id: PUSH_HELPERS.oneSignalAppId,
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

  const normalizedUrl = PUSH_HELPERS.asText(url || PUSH_HELPERS.appUrl);
  if (normalizedUrl) {
    payload.url = normalizedUrl;
  }

  const aliasList = (externalIds || []).map((value) => PUSH_HELPERS.asText(value)).filter(Boolean);
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
      Authorization: `Key ${PUSH_HELPERS.oneSignalRestApiKey}`
    },
    body: JSON.stringify(payload),
    timeout: 20
  });

  if (response.statusCode >= 400) {
    console.log('[push.pb] OneSignal error:', response.statusCode, response.raw);
  }

  return response;
};

PUSH_HELPERS.sendToRole = function sendToRole(role, options) {
  const payload = options || {};
  const filters = PUSH_HELPERS.buildTagFilters({
    auth_source: 'live',
    role,
    ...(payload.tags || {})
  });

  return PUSH_HELPERS.sendOneSignalPush({
    title: payload.title,
    message: payload.message,
    filters,
    data: payload.data,
    url: payload.url
  });
};

PUSH_HELPERS.sendToRoles = function sendToRoles(roles, options) {
  (roles || []).forEach((role) => PUSH_HELPERS.sendToRole(role, options));
};

PUSH_HELPERS.sendToExternalIds = function sendToExternalIds(externalIds, options) {
  const payload = options || {};
  return PUSH_HELPERS.sendOneSignalPush({
    title: payload.title,
    message: payload.message,
    externalIds,
    data: payload.data,
    url: payload.url
  });
};

PUSH_HELPERS.statusChanged = function statusChanged(record) {
  const before = record.originalCopy().getString('status');
  const after = record.getString('status');
  return {
    before,
    after,
    changed: before !== after
  };
};

onRecordAfterCreateRequest((e) => {
  if ($os.getenv('ONESIGNAL_ENABLED') === '0' || !$os.getenv('ONESIGNAL_APP_ID') || !$os.getenv('ONESIGNAL_REST_API_KEY')) return;
  const helpers = globalThis.EASYPOINT_PUSH_HOOKS;
  const record = e.record;
  if (record.getBool('verified') !== false) return;

  const fullName = helpers.asText(record.getString('full_name')) || helpers.asText(record.getString('email')) || 'Un nuevo usuario';
  const role = helpers.asText(record.getString('role')) || 'operator';

  helpers.sendToRole('admin', {
    title: 'Nuevo acceso pendiente',
    message: `${fullName} solicito acceso como ${role}.`,
    data: {
      kind: 'user_pending',
      user_id: helpers.asText(record.id),
      role
    }
  });
}, 'users');

onRecordAfterUpdateRequest((e) => {
  if ($os.getenv('ONESIGNAL_ENABLED') === '0' || !$os.getenv('ONESIGNAL_APP_ID') || !$os.getenv('ONESIGNAL_REST_API_KEY')) return;
  const helpers = globalThis.EASYPOINT_PUSH_HOOKS;
  const record = e.record;
  const before = record.originalCopy();
  const wasVerified = before.getBool('verified');
  const isVerified = record.getBool('verified');

  if (wasVerified === false && isVerified === true) {
    helpers.sendToExternalIds([record.id], {
      title: 'Acceso aprobado',
      message: 'Tu cuenta ya fue aprobada. Ya puedes entrar a Easypoint.',
      data: {
        kind: 'user_approved',
        user_id: helpers.asText(record.id)
      }
    });
  }
}, 'users');

onRecordAfterCreateRequest((e) => {
  if ($os.getenv('ONESIGNAL_ENABLED') === '0' || !$os.getenv('ONESIGNAL_APP_ID') || !$os.getenv('ONESIGNAL_REST_API_KEY')) return;
  const helpers = globalThis.EASYPOINT_PUSH_HOOKS;
  const record = e.record;
  const status = helpers.asText(record.getString('status')) || 'new';
  if (status !== 'new') return;

  const businessName = helpers.asText(record.getString('business_name')) || 'Nuevo prospecto';

  helpers.sendToRoles(['admin', 'sales'], {
    title: 'Nueva solicitud de afiliacion',
    message: `${businessName} quiere integrarse a la red Easypoint.`,
    data: {
      kind: 'partner_application_new',
      application_id: helpers.asText(record.id)
    }
  });
}, 'partner_applications');

onRecordAfterUpdateRequest((e) => {
  if ($os.getenv('ONESIGNAL_ENABLED') === '0' || !$os.getenv('ONESIGNAL_APP_ID') || !$os.getenv('ONESIGNAL_REST_API_KEY')) return;
  const helpers = globalThis.EASYPOINT_PUSH_HOOKS;
  const record = e.record;
  const status = helpers.statusChanged(record);
  if (!status.changed) return;
  if (!['approved', 'rejected'].includes(status.after)) return;

  const businessName = helpers.asText(record.getString('business_name')) || 'Un prospecto';
  const approved = status.after === 'approved';

  helpers.sendToRoles(['admin', 'sales'], {
    title: approved ? 'Afiliacion aprobada' : 'Afiliacion rechazada',
    message: approved
      ? `${businessName} ya puede pasar a onboarding operativo.`
      : `${businessName} fue descartado del pipeline comercial.`,
    data: {
      kind: approved ? 'partner_application_approved' : 'partner_application_rejected',
      application_id: helpers.asText(record.id)
    }
  });
}, 'partner_applications');

onRecordAfterCreateRequest((e) => {
  if ($os.getenv('ONESIGNAL_ENABLED') === '0' || !$os.getenv('ONESIGNAL_APP_ID') || !$os.getenv('ONESIGNAL_REST_API_KEY')) return;
  const helpers = globalThis.EASYPOINT_PUSH_HOOKS;
  const record = e.record;
  const status = helpers.asText(record.getString('status')) || 'pending';
  if (status !== 'pending') return;

  const trackingId = helpers.asText(record.getString('tracking_id')) || 'Nuevo envio';

  helpers.sendToRole('driver', {
    title: 'Nuevo envio por recolectar',
    message: `${trackingId} ya esta listo para entrar en ruta.`,
    data: {
      kind: 'shipment_pending',
      shipment_id: helpers.asText(record.id),
      tracking_id: trackingId
    }
  });
}, 'shipments');

onRecordAfterUpdateRequest((e) => {
  if ($os.getenv('ONESIGNAL_ENABLED') === '0' || !$os.getenv('ONESIGNAL_APP_ID') || !$os.getenv('ONESIGNAL_REST_API_KEY')) return;
  const helpers = globalThis.EASYPOINT_PUSH_HOOKS;
  const record = e.record;
  const status = helpers.statusChanged(record);
  if (!status.changed || status.after !== 'at_point') return;

  const trackingId = helpers.asText(record.getString('tracking_id')) || 'Un envio';
  const pointId = helpers.asText(record.getString('point_id'));

  helpers.sendToRole('admin', {
    title: 'Paquete listo en local',
    message: `${trackingId} ya llego a su punto de entrega.`,
    data: {
      kind: 'shipment_at_point',
      shipment_id: helpers.asText(record.id),
      tracking_id: trackingId,
      point_id: pointId
    }
  });

  if (pointId) {
    helpers.sendToRole('operator', {
      title: 'Paquete listo para mostrador',
      message: `${trackingId} ya esta listo para entrega en tu local.`,
      tags: { point_ref: pointId },
      data: {
        kind: 'shipment_at_point',
        shipment_id: helpers.asText(record.id),
        tracking_id: trackingId,
        point_id: pointId
      }
    });
  }
}, 'shipments');

onRecordAfterUpdateRequest((e) => {
  if ($os.getenv('ONESIGNAL_ENABLED') === '0' || !$os.getenv('ONESIGNAL_APP_ID') || !$os.getenv('ONESIGNAL_REST_API_KEY')) return;
  const helpers = globalThis.EASYPOINT_PUSH_HOOKS;
  const record = e.record;
  const status = helpers.statusChanged(record);
  if (!status.changed || status.after !== 'paid') return;

  const pointId = helpers.asText(record.getString('point_id'));
  const pointName = helpers.asText(record.getString('point_name')) || 'Un local';
  const period = helpers.asText(record.getString('period'));

  helpers.sendToRole('admin', {
    title: 'Comision liquidada',
    message: `${pointName} quedo marcado como pagado${period ? ` para ${period}` : ''}.`,
    data: {
      kind: 'commission_paid',
      commission_id: helpers.asText(record.id),
      point_id: pointId
    }
  });

  if (pointId) {
    helpers.sendToRole('operator', {
      title: 'Comision liquidada',
      message: `${pointName} ya tiene una comision pagada${period ? ` para ${period}` : ''}.`,
      tags: { point_ref: pointId },
      data: {
        kind: 'commission_paid',
        commission_id: helpers.asText(record.id),
        point_id: pointId
      }
    });
  }
}, 'commissions');
