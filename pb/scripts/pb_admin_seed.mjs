const PB_URL = 'http://127.0.0.1:8090';

async function seed() {
  // Auth as superadmin
  const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@easypoint.mx', password: 'easypoint123' })
  });
  const { token } = await authRes.json();
  const H = { 'Content-Type': 'application/json', 'Authorization': token };

  // ── 1. Add 'role' + 'point_id' fields to the users collection ──────────────
  console.log('Patching users collection...');
  const usersRes = await fetch(`${PB_URL}/api/collections/users`, { headers: H });
  const usersColl = await usersRes.json();
  const existingNames = usersColl.schema.map(f => f.name);
  if (!existingNames.includes('role'))
    usersColl.schema.push({ name: 'role', type: 'text' });
  if (!existingNames.includes('point_ref'))
    usersColl.schema.push({ name: 'point_ref', type: 'text' }); // store point id
  if (!existingNames.includes('full_name'))
    usersColl.schema.push({ name: 'full_name', type: 'text' });

  // Make sure email is verified by default: patch options
  usersColl.options = { ...usersColl.options, requireEmail: true };
  await fetch(`${PB_URL}/api/collections/${usersColl.id}`, {
    method: 'PATCH', headers: H, body: JSON.stringify(usersColl)
  });

  // ── 2. Create demo users ────────────────────────────────────────────────────
  const makeUser = async (email, password, role, full_name) => {
    // Check if user already exists
    const check = await fetch(
      `${PB_URL}/api/collections/users/records?filter=(email='${email}')`, { headers: H }
    );
    const checkData = await check.json();
    if (checkData.items?.length > 0) {
      console.log(`  User ${email} already exists, patching role...`);
      await fetch(`${PB_URL}/api/collections/users/records/${checkData.items[0].id}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ role, full_name, emailVisibility: true, verified: true })
      });
      return checkData.items[0];
    }
    const r = await fetch(`${PB_URL}/api/collections/users/records`, {
      method: 'POST', headers: H,
      body: JSON.stringify({
        email, password, passwordConfirm: password,
        role, full_name, emailVisibility: true, verified: true
      })
    });
    const data = await r.json();
    if (data.code) console.error('  Error creating user:', data.message);
    else console.log(`  Created: ${email} [${role}]`);
    return data;
  };

  // Get first two points to link operators
  const ptsRes = await fetch(`${PB_URL}/api/collections/points/records?perPage=5`, { headers: H });
  const pts = (await ptsRes.json()).items || [];

  await makeUser('admin@yopmail.com', 'Admin2024!', 'admin', 'Carlos Easypoint');
  const op1 = await makeUser('punto1@yopmail.com', 'Punto2024!', 'operator', 'Ana López');
  const op2 = await makeUser('punto2@yopmail.com', 'Punto2024!', 'operator', 'Roberto Díaz');

  // Link operators to points
  if (pts[0] && op1.id) {
    await fetch(`${PB_URL}/api/collections/users/records/${op1.id}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ point_ref: pts[0].id })
    });
    await fetch(`${PB_URL}/api/collections/points/records/${pts[0].id}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ operator_email: 'punto1@yopmail.com' })
    });
  }
  if (pts[1] && op2.id) {
    await fetch(`${PB_URL}/api/collections/users/records/${op2.id}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ point_ref: pts[1].id })
    });
  }

  // ── 3. Create commissions collection ──────────────────────────────────────
  console.log('Ensuring commissions collection...');
  const commRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      name: 'commissions',
      type: 'base',
      schema: [
        { name: 'point_id', type: 'text', required: true },
        { name: 'point_name', type: 'text' },
        { name: 'period', type: 'text' },   // e.g. "2026-03"
        { name: 'packages_handled', type: 'number' },
        { name: 'rate', type: 'number' },    // MXN per package
        { name: 'total', type: 'number' },
        { name: 'status', type: 'text' }     // pending | paid
      ],
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: ''
    })
  });
  const commData = await commRes.json();
  if (commData.code && commData.code !== 400) console.log('Commissions:', commData.message);

  // ── 4. Create invoices collection ─────────────────────────────────────────
  console.log('Ensuring invoices collection...');
  await fetch(`${PB_URL}/api/collections`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      name: 'invoices',
      type: 'base',
      schema: [
        { name: 'number', type: 'text' },
        { name: 'client_name', type: 'text' },
        { name: 'client_rfc', type: 'text' },
        { name: 'period', type: 'text' },
        { name: 'items', type: 'json' },
        { name: 'subtotal', type: 'number' },
        { name: 'tax', type: 'number' },
        { name: 'total', type: 'number' },
        { name: 'status', type: 'text' },   // draft | sent | paid
        { name: 'notes', type: 'text' }
      ],
      listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: ''
    })
  });

  // ── 5. Seed demo commissions ───────────────────────────────────────────────
  if (pts.length > 0) {
    console.log('Seeding demo commissions...');
    const months = ['2026-01','2026-02','2026-03'];
    for (const pt of pts.slice(0, 2)) {
      for (const period of months) {
        const packages = Math.floor(Math.random() * 100 + 50);
        const rate = 8.50;
        await fetch(`${PB_URL}/api/collections/commissions/records`, {
          method: 'POST', headers: H,
          body: JSON.stringify({
            point_id: pt.id, point_name: pt.name,
            period, packages_handled: packages, rate, total: packages * rate,
            status: period === '2026-03' ? 'pending' : 'paid'
          })
        });
      }
    }
  }

  // ── 6. Seed demo invoice ───────────────────────────────────────────────────
  console.log('Seeding demo invoice...');
  await fetch(`${PB_URL}/api/collections/invoices/records`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      number: 'EP-2026-001',
      client_name: 'Tienda Online SA de CV',
      client_rfc: 'TOSC201010ABC',
      period: '2026-03',
      items: [{ concept: 'Paquetes entregados', qty: 420, unit_price: 25, total: 10500 }],
      subtotal: 10500, tax: 1680, total: 12180,
      status: 'sent',
      notes: 'Pago a 30 días'
    })
  });

  console.log('\n✅ Seed complete!');
  console.log('Admin login:    admin@yopmail.com   / Admin2024!');
  console.log('Operator 1:     punto1@yopmail.com  / Punto2024!');
  console.log('Operator 2:     punto2@yopmail.com  / Punto2024!');
}

seed().catch(console.error);
