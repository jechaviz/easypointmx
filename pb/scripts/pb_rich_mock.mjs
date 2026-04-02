/**
 * Generates rich, production-like mock data for the Easypoint platform.
 * Also configures the `system_settings` collection for the global "Test Mode" toggle.
 * 
 * Run with: node pb_rich_mock.mjs
 */

const PB = 'http://127.0.0.1:8090';

// Helper for dates
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomEl = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function run() {
  console.log('--- EASYPOINT RICH MOCK DATA GENERATOR ---');
  console.log('Authenticating as admin...');
  const { token } = await fetch(`${PB}/api/admins/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@easypoint.mx', password: 'easypoint123' })
  }).then(r => r.json());

  const H = { 'Content-Type': 'application/json', 'Authorization': token };
  const handleRes = async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));
    return data;
  };
  const getAPI = async (path) => fetch(`${PB}${path}`, { headers: H }).then(handleRes);
  const postAPI = async (path, body) => fetch(`${PB}${path}`, { method: 'POST', headers: H, body: JSON.stringify(body) }).then(handleRes);
  const patchAPI = async (path, body) => fetch(`${PB}${path}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) }).then(handleRes);
  const delAPI = async (path) => fetch(`${PB}${path}`, { method: 'DELETE', headers: H });

  // 1. Setup 'system_settings' collection
  console.log('1. Setting up system_settings...');
  const existingCols = await getAPI('/api/collections?perPage=100');
  let settingsCol = existingCols.items.find(c => c.name === 'system_settings');
  if (!settingsCol) {
    settingsCol = await postAPI('/api/collections', {
      name: 'system_settings', type: 'base',
      schema: [{ name: 'test_mode', type: 'bool' }],
      listRule: "", viewRule: "", // Publicly readable
      createRule: "@request.auth.role = 'admin'", updateRule: "@request.auth.role = 'admin'", deleteRule: null
    });
  }

  // Ensure singleton record exists
  const settingsRecords = await getAPI('/api/collections/system_settings/records');
  if (settingsRecords.items.length === 0) {
    await postAPI('/api/collections/system_settings/records', { id: 'sys_settings_01', test_mode: true });
  } else {
    await patchAPI(`/api/collections/system_settings/records/${settingsRecords.items[0].id}`, { test_mode: true });
  }

  // 1b. Fix 'shipments' schema (corrupted enum and wrong point_id relation)
  console.log('1b. Repairing shipments schema...');
  const shipCol = existingCols.items.find(c => c.name === 'shipments');
  const pointsCol = existingCols.items.find(c => c.name === 'points');
  if (shipCol && pointsCol) {
    let sSchema = shipCol.schema;
    // Fix status enum
    const statusField = sSchema.find(f => f.name === 'status');
    if (statusField) statusField.options.values = ['pending', 'in_transit', 'at_point', 'delivered'];
    
    // PocketBase doesn't allow changing a relation's target. We must delete and recreate the field.
    sSchema = sSchema.filter(f => f.name !== 'point_id');
    sSchema.push({
      name: 'point_id', type: 'relation', required: false,
      options: { collectionId: pointsCol.id, cascadeDelete: false, maxSelect: 1 }
    });
    
    await patchAPI(`/api/collections/${shipCol.id}`, { schema: sSchema });
  }

  // 2. Clear old demo data (except users) to prevent duplicates
  console.log('2. Clearing old shipments, points, invoices, commissions, apps...');
  for (const col of ['shipments', 'points', 'invoices', 'commissions', 'partner_applications']) {
    try {
      const list = await getAPI(`/api/collections/${col}/records?perPage=500`);
      if (list.items) {
        for (const item of list.items) await delAPI(`/api/collections/${col}/records/${item.id}`);
      }
    } catch (e) {
      // Ignore 404 if collection doesn't exist yet
    }
  }

  // 3. Create Points
  console.log('3. Generating Points...');
  const pointData = [
    { name: 'Abarrotes Don Pepe', address: 'Av. Chapultepec 123, Roma Nte., CDMX', whatsapp: '5512345678', horarios: 'L-V: 08:00 - 20:00' },
    { name: 'Papelería El Lápiz', address: 'Insurgentes Sur 456, Condesa, CDMX', whatsapp: '5587654321', horarios: 'L-S: 09:00 - 18:00' },
    { name: 'Farmacia Saludable', address: 'Reforma 789, Juarez, CDMX', whatsapp: '5555555555', horarios: '24 Horas' },
    { name: 'CyberCafe Net', address: 'Av. Universidad 1020, Coyoacán, CDMX', whatsapp: '5544443333', horarios: 'L-V: 10:00 - 22:00' },
    { name: 'Minisuper La Esquina', address: 'Homero 345, Polanco, CDMX', whatsapp: '5599998888', horarios: 'L-D: 07:00 - 23:00' }
  ];
  const createdPoints = [];
  for (const pd of pointData) {
    createdPoints.push(await postAPI('/api/collections/points/records', pd));
  }

  // 4. Create extra users (Operators) tied to these points
  console.log('4. Generating Users...');
  const usersToCreate = [
    { email: 'admin@easypoint.mx', full_name: 'Test Admin', role: 'admin', pass: 'easypoint123' },
    { email: 'driver@easypoint.mx', full_name: 'Repartidor de Prueba', role: 'driver', pass: 'Punto2024!' },
    { email: 'pepe@yopmail.com', full_name: 'José Martínez', role: 'operator', pass: 'Punto2024!', point_idx: 0 },
    { email: 'maria@yopmail.com', full_name: 'María Gómez', role: 'operator', pass: 'Punto2024!', point_idx: 1 },
    { email: 'carlos@yopmail.com', full_name: 'Carlos Ruiz', role: 'operator', pass: 'Punto2024!', point_idx: 2 }
  ];
  for (const u of usersToCreate) {
    const existing = await getAPI(`/api/collections/users/records?filter=(email="${u.email}")`);
    if (existing.items?.length > 0) await delAPI(`/api/collections/users/records/${existing.items[0].id}`);
    
    await postAPI('/api/collections/users/records', {
      email: u.email, full_name: u.full_name, role: u.role,
      password: u.pass, passwordConfirm: u.pass,
      emailVisibility: true, verified: true,
      ...(u.point_idx !== undefined ? { point_ref: createdPoints[u.point_idx].id } : {})
    });
  }

  // Map original demo operators to points too
  const op1 = await getAPI('/api/collections/users/records?filter=(email="punto1@yopmail.com")');
  if (op1.items?.[0]) await patchAPI(`/api/collections/users/records/${op1.items[0].id}`, { point_ref: createdPoints[3].id, full_name: 'Operador 1' });
  const op2 = await getAPI('/api/collections/users/records?filter=(email="punto2@yopmail.com")');
  if (op2.items?.[0]) await patchAPI(`/api/collections/users/records/${op2.items[0].id}`, { point_ref: createdPoints[4].id, full_name: 'Operador 2' });

  // 5. Generate Shipments (Lots of them)
  console.log('5. Generating 45 Shipments...');
  const cNames = ['Ana López', 'Roberto Díaz', 'Elena Torres', 'Miguel Sánchez', 'Laura Flores', 'Jorge Ramos', 'Carmen Castillo', 'Pedro Ortiz'];
  const pList = createdPoints.map(p => p.id);
  const statuses = ['pending', 'in_transit', 'at_point', 'delivered'];
  
  for (let i = 0; i < 45; i++) {
    // 50% at_point, 20% delivered, 20% in_transit, 10% pending
    const rnd = Math.random();
    let status = 'at_point';
    if (rnd > 0.9) status = 'pending';
    else if (rnd > 0.7) status = 'in_transit';
    else if (rnd > 0.5) status = 'delivered';

    await postAPI('/api/collections/shipments/records', {
      tracking_id: `EP-MX-${randomInt(100000, 999999)}`,
      recipient_name: randomEl(cNames),
      status: status,
      point_id: randomEl(pList),
      // Create dates artificially spread over the last 15 days
      created: daysAgo(randomInt(0, 15))
    });
  }

  // 6. Generate Commissions
  console.log('6. Generating Commissions...');
  const periods = ['2026-01', '2026-02', '2026-03'];
  for (const pt of createdPoints) {
    for (let i = 0; i < periods.length; i++) {
      const q = randomInt(40, 150);
      const isPaid = i < 2; // Jan/Feb paid, March pending
      await postAPI('/api/collections/commissions/records', {
        point_id: pt.id, point_name: pt.name, period: periods[i], packages_handled: q,
        rate_per_package: 8.50, total: q * 8.50, status: isPaid ? 'paid' : 'pending'
      });
    }
  }

  // 7. Generate Invoices
  console.log('7. Generating Invoices...');
  let invCol = existingCols.items.find(c => c.name === 'invoices');
  if (!invCol) {
    console.log('Creating invoices collection...');
    invCol = await postAPI('/api/collections', {
      name: 'invoices', type: 'base',
      schema: [
        { name: 'number', type: 'text' }, { name: 'period', type: 'text' },
        { name: 'client_name', type: 'text' }, { name: 'client_rfc', type: 'text' },
        { name: 'items', type: 'json', options: { maxSize: 2000000 } }, { name: 'subtotal', type: 'number' },
        { name: 'tax', type: 'number' }, { name: 'total', type: 'number' },
        { name: 'status', type: 'select', options: { maxSelect: 1, values: ['draft', 'sent', 'paid'] } }
      ],
      listRule: "@request.auth.role = 'admin'", viewRule: "@request.auth.role = 'admin'",
      createRule: "@request.auth.role = 'admin'", updateRule: "@request.auth.role = 'admin'", deleteRule: null
    });
  }

  const clients = [
    { n: 'EcoStore MX S.A.', rfc: 'ECO202103XYZ' },
    { n: 'SneakerShop City', rfc: 'SNE993322AAA' },
    { n: 'Cosméticos Naturales', rfc: 'COS887766BBB' }
  ];
  for (let i = 1; i <= 5; i++) {
    const cli = randomEl(clients);
    const qty = randomInt(100, 500);
    const sub = qty * 45; // $45 charge to ecommerce per package
    await postAPI('/api/collections/invoices/records', {
      number: `EP-2026-${String(i).padStart(3, '0')}`,
      period: randomEl(['2026-01', '2026-02', '2026-03']),
      client_name: cli.n, client_rfc: cli.rfc,
      items: [{ concept: 'Envíos OOH - Plan Pro', qty, unit_price: 45, total: sub }],
      subtotal: sub, tax: sub * 0.16, total: sub * 1.16,
      status: randomEl(['draft', 'sent', 'paid', 'paid'])
    });
  }

  // 8. Generate Partner Applications
  console.log('8. Generating Partner Applications...');
  await postAPI('/api/collections/partner_applications/records', { business_name: 'Tienda La Barda', address: 'Insurgentes Nte 112', whatsapp: '5500112233', description: 'Tengo mucho espacio libre', status: 'new', horarios: '9am - 9pm' });
  await postAPI('/api/collections/partner_applications/records', { business_name: 'Cafetería Java', address: 'Miguel Angel de Quevedo 44', whatsapp: '5577889900', description: 'Mi local es seguro y abro temprano', status: 'new', horarios: '7am - 10pm' });
  await postAPI('/api/collections/partner_applications/records', { business_name: 'Boutique Fashion', address: 'Altavista 77', whatsapp: '5566332211', description: 'Quiero tráfico a mi tienda', status: 'rejected', horarios: '11am - 7pm' });

  console.log('\n✅ RICH MOCK DATA SEEDED SUCCESSFULLY!');
  console.log('Test Mode Setting initialized to: TRUE (Publicly readable)');
}

run().catch(console.error);
