/**
 * Resets all demo user passwords to "123" for development convenience.
 * Also lowers the PocketBase minimum password length so "123" is accepted.
 *
 * NOTE: Run this ONLY in dev. For production, remove this script and
 * enforce strong passwords via the AdminView strength meter.
 */
const PB_URL = 'http://127.0.0.1:8090';

async function resetDemoPasswords() {
  console.log('Authenticating...');
  const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@easypoint.mx', password: 'easypoint123' })
  });
  const { token } = await authRes.json();
  const H = { 'Content-Type': 'application/json', 'Authorization': token };

  // 1. Lower password minimum length to 3 so "123" is accepted by PocketBase
  console.log('Setting passwordMinLength = 3 (dev mode)...');
  await fetch(`${PB_URL}/api/settings`, {
    method: 'PATCH', headers: H,
    body: JSON.stringify({ meta: { passwordMinLength: 3 } })
  });

  // 2. Reset known demo user passwords
  const demos = [
    'admin@yopmail.com',
    'punto1@yopmail.com',
    'punto2@yopmail.com',
  ];

  for (const email of demos) {
    const searchRes = await fetch(
      `${PB_URL}/api/collections/users/records?filter=(email='${email}')`, { headers: H }
    );
    const { items } = await searchRes.json();
    if (items?.length > 0) {
      await fetch(`${PB_URL}/api/collections/users/records/${items[0].id}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ password: '123', passwordConfirm: '123' })
      });
      console.log(`  ✅ ${email} → password: 123`);
    } else {
      console.log(`  ⚠️  ${email} not found`);
    }
  }

  console.log('\n✅ Done. All demo passwords are now: 123');
  console.log('   (PocketBase minimum length set to 3 for dev convenience)');
  console.log('\n   For production: set passwordMinLength back to 8+ and delete demo accounts.\n');
}

resetDemoPasswords().catch(console.error);
