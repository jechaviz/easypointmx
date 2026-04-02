const PB_URL = 'http://127.0.0.1:8090';

async function improveMapData() {
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
    console.log('Adding lat/lng fields to:', pointsColl.id);
    const hasLat = pointsColl.schema.some(f => f.name === 'lat');
    if (!hasLat) {
      pointsColl.schema.push(
        { name: 'lat', type: 'number' },
        { name: 'lng', type: 'number' }
      );
      const updateRes = await fetch(`${PB_URL}/api/collections/${pointsColl.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(pointsColl)
      });
      console.log('Update Status:', updateRes.status);
    } else {
      console.log('Fields already exist.');
    }
  }

  console.log('Updating sample points with coordinates (Mexico City)...');
  const ptsRes = await fetch(`${PB_URL}/api/collections/points/records`, { headers });
  const ptsData = await ptsRes.json();

  const coords = [
    { lat: 19.4326, lng: -99.1332 }, // Centro
    { lat: 19.4149, lng: -99.1620 }, // Roma
    { lat: 19.4320, lng: -99.1900 }  // Polanco
  ];

  for(let i=0; i < (ptsData.items || []).length; i++) {
    const p = ptsData.items[i];
    await fetch(`${PB_URL}/api/collections/points/records/${p.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(coords[i % coords.length])
    });
  }

  console.log('Map data improved!');
}

improveMapData().catch(console.error);
