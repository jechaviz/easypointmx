const PB_URL = 'http://127.0.0.1:8090';

async function richSchemaUpgrade() {
  console.log('Authenticating...');
  const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@easypoint.mx', password: 'easypoint123' })
  });
  const { token } = await authRes.json();
  if (!token) throw new Error("Failed to auth");
  const headers = { 'Content-Type': 'application/json', 'Authorization': token };

  console.log('Fetching points collection...');
  const collectionsRes = await fetch(`${PB_URL}/api/collections/points`, { headers });
  const pointsColl = await collectionsRes.json();
  
  if (pointsColl && pointsColl.id) {
    console.log('Adding rich fields to:', pointsColl.id);
    const existingNames = pointsColl.schema.map(f => f.name);
    
    const newFields = [
      { name: 'description', type: 'text' },
      { name: 'hours', type: 'text' },
      { name: 'services', type: 'select', maxSelect: 3, values: ["pickup", "dropoff", "locker", "express"] },
      { name: 'image_url', type: 'url' } // Using URL for simplicity with generated images
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
    console.log('Schema updated successfully.');
  }

  // Seed with rich data
  console.log('Seeding rich data...');
  const ptsRes = await fetch(`${PB_URL}/api/collections/points/records`, { headers });
  const ptsData = await ptsRes.json();

  const richData = [
    {
      description: 'Tu punto de confianza en el corazón de la ciudad. Recoge tus compras mientras caminas por la Alameda.',
      hours: 'Lun-Vie 9:00 - 20:00, Sáb 10:00 - 18:00',
      services: ['pickup', 'dropoff'],
      image_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=400'
    },
    {
      description: 'Locker express de alta seguridad ubicado en zona estratégica. Disponible casi 24/7.',
      hours: 'Abierto 24 horas',
      services: ['locker', 'express'],
      image_url: 'https://images.unsplash.com/photo-1542103749-8ef59b94f47e?auto=format&fit=crop&q=80&w=400'
    }
  ];

  for(let i=0; i < (ptsData.items || []).length; i++) {
    const p = ptsData.items[i];
    await fetch(`${PB_URL}/api/collections/points/records/${p.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(richData[i % richData.length])
    });
  }

  console.log('Rich data seeded!');
}

richSchemaUpgrade().catch(console.error);
