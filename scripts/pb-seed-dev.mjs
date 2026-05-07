import { randomUUID } from 'crypto';
import { adminHeaders, ensureJson, pbApi } from '../pb/scripts/_shared.mjs';

async function main() {
  const headers = await adminHeaders();
  const post = (path, body) => fetch(pbApi(path), {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  }).then((response) => ensureJson(response, `POST ${path}`));

  const patch = (path, body) => fetch(pbApi(path), {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body)
  }).then((response) => ensureJson(response, `PATCH ${path}`));

  const pointA = await post('/api/collections/points/records', {
    name: 'Dev Punto Roma',
    address: 'Av. Alvaro Obregon 100, Roma Norte, CDMX',
    whatsapp: '5511002200',
    active: true,
    lat: 19.419,
    lng: -99.161
  });

  const pointB = await post('/api/collections/points/records', {
    name: 'Dev Punto Condesa',
    address: 'Amsterdam 220, Condesa, CDMX',
    whatsapp: '5511003300',
    active: true,
    lat: 19.412,
    lng: -99.172
  });

  await post('/api/collections/shipments/records', {
    tracking_id: `DEV-${randomUUID().slice(0, 8).toUpperCase()}`,
    status: 'pending',
    point_id: pointA.id
  });
  await post('/api/collections/shipments/records', {
    tracking_id: `DEV-${randomUUID().slice(0, 8).toUpperCase()}`,
    status: 'in_transit',
    point_id: pointB.id
  });
  await post('/api/collections/shipments/records', {
    tracking_id: `DEV-${randomUUID().slice(0, 8).toUpperCase()}`,
    status: 'at_point',
    point_id: pointA.id
  });

  await post('/api/collections/partner_applications/records', {
    business_name: 'Dev Tienda Barrial',
    address: 'Insurgentes Sur 400, CDMX',
    whatsapp: '5522334455',
    description: 'Seed dev partner application',
    horarios: 'L-S 09:00-19:00',
    status: 'new'
  });

  const settings = await fetch(pbApi('/api/collections/system_settings/records'), { headers }).then((response) =>
    ensureJson(response, 'List system settings')
  );
  if (settings.items?.[0]) {
    await patch(`/api/collections/system_settings/records/${settings.items[0].id}`, { test_mode: true });
  }

  console.log('Development seed completed successfully.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
