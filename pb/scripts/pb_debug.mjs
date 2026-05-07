import { adminHeaders, pbApi, pbApiUrl, pbFilterString } from './_shared.mjs';

async function run() {
  const H = await adminHeaders();

  const { items } = await fetch(pbApiUrl('/api/collections/users/records', {
    filter: `(email=${pbFilterString('admin@yopmail.com')})`
  }), { headers: H }).then(r => r.json());

  if (items?.[0]) {
    const resp = await fetch(pbApi(`/api/collections/users/records/${items[0].id}`), {
      method: 'PATCH', headers: H, body: JSON.stringify({ password: '123', passwordConfirm: '123' })
    });
    console.log(await resp.json());
  }
}
run();
