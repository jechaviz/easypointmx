import { ensureJson, pbApi } from '../pb/scripts/_shared.mjs';

async function main() {
  const createJson = async (path, body) => {
    const response = await fetch(pbApi(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return ensureJson(response, `POST ${path}`);
  };

  const point = await createJson('/api/collections/points/records', {
    name: 'Smoke Punto',
    address: 'Av. Reforma 100, CDMX',
    active: true
  });

  await createJson('/api/collections/shipments/records', {
    tracking_id: `SMOKE-${Date.now()}`,
    status: 'pending',
    point_id: point.id
  });

  console.log('Smoke seed completed successfully.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
