import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { adminAuth, ensureJson, pbApi } from '../pb/scripts/_shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const dbFile = path.join(repoRoot, 'pb', 'pb_data', 'data.db');

const REQUIRED_COLLECTIONS = [
  'points',
  'shipments',
  'partner_applications',
  'users',
  'system_settings',
  'commissions',
  'invoices',
  'shipping_guides',
  'excursions',
  'excursion_bookings',
  'payments',
  'support_tickets',
  'wallets',
  'wallet_entries',
  'providers',
  'settlements',
  'audit_log',
  'services',
  'service_orders',
  'tracking_alerts'
];

async function checkOnline() {
  const health = await fetch(pbApi('/api/health')).then((response) =>
    ensureJson(response, 'PocketBase health')
  );
  console.log(`PocketBase health (online): ${health.message}`);

  const auth = await adminAuth();

  const collections = await fetch(pbApi('/api/collections?perPage=200'), {
    headers: { Authorization: auth.token }
  }).then((response) => ensureJson(response, 'List collections'));

  const names = new Set((collections.items || []).map((item) => item.name));
  const missing = REQUIRED_COLLECTIONS.filter((name) => !names.has(name));
  if (missing.length) {
    throw new Error(`Faltan colecciones requeridas en PocketBase: ${missing.join(', ')}`);
  }

  console.log(`✅ [Online] ${REQUIRED_COLLECTIONS.length} colecciones verificadas vía REST API: ${REQUIRED_COLLECTIONS.join(', ')}`);
}

function checkOffline() {
  if (!fs.existsSync(dbFile)) {
    throw new Error(`Archivo de base de datos no encontrado en ${dbFile}`);
  }
  const db = new DatabaseSync(dbFile);
  const rows = db.prepare('SELECT name FROM _collections').all();
  const names = new Set(rows.map((r) => r.name));
  const missing = REQUIRED_COLLECTIONS.filter((name) => !names.has(name));
  if (missing.length) {
    throw new Error(`Faltan colecciones requeridas en data.db: ${missing.join(', ')}`);
  }
  console.log(`✅ [Offline/SQLite] ${REQUIRED_COLLECTIONS.length} colecciones verificadas en data.db: ${REQUIRED_COLLECTIONS.join(', ')}`);
}

async function main() {
  try {
    await checkOnline();
  } catch (error) {
    console.log(`PocketBase no está respondiendo en línea (${error.message}). Verificando data.db directamente...`);
    checkOffline();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
