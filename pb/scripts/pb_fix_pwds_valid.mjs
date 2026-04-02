const PB = 'http://127.0.0.1:8090';

(async () => {
  const { token } = await fetch(`${PB}/api/admins/auth-with-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@easypoint.mx', password: 'easypoint123' })
  }).then(r => r.json());

  const H = { 'Content-Type': 'application/json', 'Authorization': token };
  
  const demos = [
    { email: 'admin@yopmail.com', pass: 'Admin2024!' },
    { email: 'punto1@yopmail.com', pass: 'Punto2024!' },
    { email: 'punto2@yopmail.com', pass: 'Punto2024!' }
  ];

  for(const d of demos){
    const { items } = await fetch(
      `${PB}/api/collections/users/records?filter=(email='${d.email}')`, { headers: H }
    ).then(r => r.json());

    if(items?.[0]){
      const r = await fetch(`${PB}/api/collections/users/records/${items[0].id}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ password: d.pass, passwordConfirm: d.pass })
      }).then(r => r.json());
      console.log(d.email, '=>', r.code ? r.message : 'OK ' + d.pass);
    }
  }
})();
