const PB_URL = 'http://127.0.0.1:8090';

async function setupPB() {
  console.log('Authenticating as Admin...');
  const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@easypoint.mx', password: 'easypoint123' })
  });
  const { token } = await authRes.json();
  if (!token) throw new Error("Failed to auth");

  const headers = { 'Content-Type': 'application/json', 'Authorization': token };

  console.log('Creating points collection...');
  let pointsRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST', headers,
    body: JSON.stringify({
      name: 'points',
      type: 'base',
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'address', type: 'text', required: true },
        { name: 'active', type: 'bool' }
      ]
    })
  });
  let pointsData = await pointsRes.json();
  // ignore errors if already exists

  console.log('Creating shipments collection...');
  let shipmentsRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST', headers,
    body: JSON.stringify({
      name: 'shipments',
      type: 'base',
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [
        { name: 'tracking_id', type: 'text', required: true },
        { name: 'status', type: 'select', maxSelect: 1, values: ["pending", "in_transit", "ready_for_pickup", "delivered"] },
        { name: 'point_id', type: 'relation', collectionId: pointsData.id, maxSelect: 1 }
      ]
    })
  });

  console.log('Creating partner_applications collection...');
  await fetch(`${PB_URL}/api/collections`, {
    method: 'POST', headers,
    body: JSON.stringify({
      name: 'partner_applications',
      type: 'base',
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '',
      fields: [
        { name: 'business_name', type: 'text', required: true },
        { name: 'contact_phone', type: 'text' },
        { name: 'status', type: 'text' }
      ]
    })
  });

  console.log('Done mapping schema!');
}

setupPB().catch(console.error);
