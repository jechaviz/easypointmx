const PB_URL = 'http://127.0.0.1:8090';

async function finalSchemaUpgrade() {
  console.log('Authenticating...');
  const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@easypoint.mx', password: 'easypoint123' })
  });
  const { token } = await authRes.json();
  const headers = { 'Content-Type': 'application/json', 'Authorization': token };

  // 1. Fix partner_applications
  console.log('Updating partner_applications collection...');
  const paRes = await fetch(`${PB_URL}/api/collections/partner_applications`, { headers });
  const paColl = await paRes.json();
  
  if (paColl && paColl.id) {
    const existingNames = paColl.schema.map(f => f.name);
    
    // Fix status if it's email
    paColl.schema = paColl.schema.filter(f => f.name !== 'status');
    paColl.schema.push({ name: 'status', type: 'text' });

    const newFields = [
      { name: 'address', type: 'text' },
      { name: 'whatsapp', type: 'text' },
      { name: 'maps_url', type: 'url' },
      { name: 'description', type: 'text' },
      { name: 'horarios', type: 'text' }
    ];

    for (const field of newFields) {
      if (!existingNames.includes(field.name)) {
        paColl.schema.push(field);
      }
    }

    await fetch(`${PB_URL}/api/collections/${paColl.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(paColl)
    });
  }

  // 2. Add notifications collection
  console.log('Ensuring notifications collection...');
  await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'tracking_alerts',
      type: 'base',
      schema: [
        { name: 'tracking_id', type: 'text', required: true },
        { name: 'email', type: 'email' },
        { name: 'browser_subscription', type: 'json' },
        { name: 'status', type: 'text' }
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: ""
    })
  });

  console.log('Final schema upgrade complete!');
}

finalSchemaUpgrade().catch(console.error);
