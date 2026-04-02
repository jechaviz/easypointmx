const PB = 'http://127.0.0.1:8090';

async function run() {
  const authBody = JSON.stringify({ identity: 'admin@easypoint.mx', password: 'easypoint123' });
  const { token } = await fetch(`${PB}/api/admins/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: authBody
  }).then(r => r.json());

  const H = { 'Content-Type': 'application/json', 'Authorization': token };

  const { items } = await fetch(`${PB}/api/collections/users/records?filter=(email='admin@yopmail.com')`, { headers: H }).then(r => r.json());

  if (items?.[0]) {
    const resp = await fetch(`${PB}/api/collections/users/records/${items[0].id}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ password: '123', passwordConfirm: '123' })
    });
    console.log(await resp.json());
  }
}
run();
