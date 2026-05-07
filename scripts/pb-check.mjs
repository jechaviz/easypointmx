import { adminAuth, ensureJson, pbApi } from '../pb/scripts/_shared.mjs';
const REQUIRED_COLLECTIONS = [
  'points',
  'shipments',
  'partner_applications',
  'users',
  'system_settings',
  'commissions',
  'invoices'
];

async function main() {
  const health = await fetch(pbApi('/api/health')).then((response) =>
    ensureJson(response, 'PocketBase health')
  );
  console.log(`PocketBase health: ${health.message}`);

  const auth = await adminAuth();

  const collections = await fetch(pbApi('/api/collections?perPage=200'), {
    headers: { Authorization: auth.token }
  }).then((response) => ensureJson(response, 'List collections'));

  const names = new Set((collections.items || []).map((item) => item.name));
  const missing = REQUIRED_COLLECTIONS.filter((name) => !names.has(name));
  if (missing.length) {
    throw new Error(`Missing required collections: ${missing.join(', ')}`);
  }

  console.log(`Required collections present: ${REQUIRED_COLLECTIONS.join(', ')}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
