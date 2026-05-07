import { adminHeaders, pbApi, pbApiUrl, pbFilterString } from './_shared.mjs';

(async () => {
  const H = await adminHeaders();
  
  const demos = [
    { email: 'admin@yopmail.com', pass: 'Admin2024!' },
    { email: 'punto1@yopmail.com', pass: 'Punto2024!' },
    { email: 'punto2@yopmail.com', pass: 'Punto2024!' }
  ];

  for(const d of demos){
    const { items } = await fetch(
      pbApiUrl('/api/collections/users/records', {
        filter: `(email=${pbFilterString(d.email)})`
      }), { headers: H }
    ).then(r => r.json());

    if(items?.[0]){
      const r = await fetch(pbApi(`/api/collections/users/records/${items[0].id}`), {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ password: d.pass, passwordConfirm: d.pass })
      }).then(r => r.json());
      console.log(d.email, '=>', r.code ? r.message : 'OK ' + d.pass);
    }
  }
})();
