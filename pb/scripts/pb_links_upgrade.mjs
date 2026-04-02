const PB_URL = 'http://127.0.0.1:8090';

async function richDataUpgrade() {
  console.log('Authenticating...');
  const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@easypoint.mx', password: 'easypoint123' })
  });
  const { token } = await authRes.json();
  const headers = { 'Content-Type': 'application/json', 'Authorization': token };

  console.log('Fetching points collection...');
  const collectionsRes = await fetch(`${PB_URL}/api/collections/points`, { headers });
  const pointsColl = await collectionsRes.json();
  
  if (pointsColl && pointsColl.id) {
    console.log('Adding whatsapp/maps fields...');
    const existingNames = pointsColl.schema.map(f => f.name);
    
    const newFields = [
      { name: 'whatsapp', type: 'text' },
      { name: 'maps_url', type: 'url' }
    ];

    for (const field of newFields) {
      if (!existingNames.includes(field.name)) {
        pointsColl.schema.push(field);
      }
    }

    await fetch(`${PB_URL}/api/collections/${pointsColl.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(pointsColl)
    });
  }

  // Seed with rich links
  console.log('Seeding rich links...');
  const ptsRes = await fetch(`${PB_URL}/api/collections/points/records`, { headers });
  const ptsData = await ptsRes.json();

  const richLinks = [
    {
      whatsapp: '525512345678',
      maps_url: 'https://maps.app.goo.gl/1'
    },
    {
      whatsapp: '525587654321',
      maps_url: 'https://maps.app.goo.gl/2'
    }
  ];

  for(let i=0; i < (ptsData.items || []).length; i++) {
    const p = ptsData.items[i];
    await fetch(`${PB_URL}/api/collections/points/records/${p.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(richLinks[i % richLinks.length])
    });
  }

  console.log('Rich links seeded!');
}

richDataUpgrade().catch(console.error);
