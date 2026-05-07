// Fix demo passwords by setting collection minPasswordLength to 3
import { adminHeaders, pbApi, pbApiUrl, pbFilterString } from './_shared.mjs';

const H = await adminHeaders();

// Lower collection-level minPasswordLength to 3
const coll = await fetch(pbApi('/api/collections/users'), { headers: H }).then(r => r.json());
await fetch(pbApi(`/api/collections/${coll.id}`), {
  method: 'PATCH', headers: H,
  body: JSON.stringify({ options: { ...coll.options, minPasswordLength: 3 } })
});
console.log('Collection minPasswordLength set to 3');

// Reset demo passwords
for (const email of ['admin@yopmail.com', 'punto1@yopmail.com', 'punto2@yopmail.com']) {
  const { items } = await fetch(
    pbApiUrl('/api/collections/users/records', {
      filter: `(email=${pbFilterString(email)})`
    }), { headers: H }
  ).then(r => r.json());
  if (items?.[0]) {
    const r = await fetch(pbApi(`/api/collections/users/records/${items[0].id}`), {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ password: '123', passwordConfirm: '123' })
    }).then(r => r.json());
    console.log(email, '=>', r.code ? `ERROR: ${r.message}` : 'password=123 ✅');
  }
}
