// Fix demo passwords by setting collection minPasswordLength to 3
const PB = 'http://127.0.0.1:8090';

const { token } = await fetch(`${PB}/api/admins/auth-with-password`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identity: 'admin@easypoint.mx', password: 'easypoint123' })
}).then(r => r.json());

const H = { 'Content-Type': 'application/json', 'Authorization': token };

// Lower collection-level minPasswordLength to 3
const coll = await fetch(`${PB}/api/collections/users`, { headers: H }).then(r => r.json());
await fetch(`${PB}/api/collections/${coll.id}`, {
  method: 'PATCH', headers: H,
  body: JSON.stringify({ options: { ...coll.options, minPasswordLength: 3 } })
});
console.log('Collection minPasswordLength set to 3');

// Reset demo passwords
for (const email of ['admin@yopmail.com', 'punto1@yopmail.com', 'punto2@yopmail.com']) {
  const { items } = await fetch(
    `${PB}/api/collections/users/records?filter=(email="${email}")`, { headers: H }
  ).then(r => r.json());
  if (items?.[0]) {
    const r = await fetch(`${PB}/api/collections/users/records/${items[0].id}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ password: '123', passwordConfirm: '123' })
    }).then(r => r.json());
    console.log(email, '=>', r.code ? `ERROR: ${r.message}` : 'password=123 ✅');
  }
}
