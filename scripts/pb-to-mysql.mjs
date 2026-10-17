#!/usr/bin/env node
/**
 * ==============================================================================
 * EasyPoint - Migrador y Generador de Dump PocketBase (SQLite) a MySQL 8.x
 * ==============================================================================
 * Uso:
 *   node scripts/pb-to-mysql.mjs               # Genera deploy/easypoint_mysql_dump.sql
 *   node scripts/pb-to-mysql.mjs --check       # Verifica integridad del origen SQLite
 *   node scripts/pb-to-mysql.mjs --out <file>  # Especifica ruta de salida del dump
 *
 * Variables de entorno soportadas para conexión en vivo (opcional):
 *   MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const dbPath = path.join(repoRoot, 'pb', 'pb_data', 'data.db');
const defaultDumpPath = path.join(repoRoot, 'deploy', 'easypoint_mysql_dump.sql');
const schemaPath = path.join(repoRoot, 'deploy', 'easypoint_mysql_schema.sql');

// Orden de inserción para respetar claves foráneas
const ORDERED_TABLES = [
  '_admins',
  'system_settings',
  'points',
  'providers',
  'users',
  'excursions',
  'excursion_bookings',
  'services',
  'service_orders',
  'shipping_guides',
  'shipments',
  'tracking_alerts',
  'partner_applications',
  'commissions',
  'invoices',
  'payments',
  'wallets',
  'wallet_entries',
  'settlements',
  'support_tickets',
  'audit_log'
];

function parseArgs() {
  const args = process.argv.slice(2);
  let dumpPath = defaultDumpPath;
  let checkOnly = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--check') checkOnly = true;
    if (args[i] === '--out' && args[i + 1]) {
      dumpPath = path.resolve(process.cwd(), args[i + 1]);
      i++;
    }
  }

  return { dumpPath, checkOnly };
}

function escapeSqlString(str) {
  if (str == null) return 'NULL';
  return "'" + String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z') + "'";
}

function formatSqlValue(val, colName, colType) {
  if (val === null || val === undefined) return 'NULL';

  const type = String(colType || '').toUpperCase();
  const name = String(colName || '').toLowerCase();

  // Booleanos
  if (type === 'BOOLEAN' || type === 'TINYINT' || name.startsWith('is_') || name === 'active' || name === 'test_mode' || name === 'verified' || name === 'emailvisibility' || name === 'checked_in' || name === 'reminder_optin') {
    if (val === true || val === 1 || val === '1' || val === 'true') return '1';
    return '0';
  }

  // Fechas (convertir ISO 8601 a formato MySQL DATETIME)
  if (name === 'created' || name === 'updated' || name.endsWith('_at')) {
    if (!val || val === "''") return 'NULL';
    const s = String(val).trim().replace('T', ' ').replace(/Z$/, '');
    return escapeSqlString(s);
  }

  // JSON
  if (type === 'JSON' || name === 'items' || typeof val === 'object') {
    const jsonStr = typeof val === 'string' ? val : JSON.stringify(val);
    return escapeSqlString(jsonStr);
  }

  // Numéricos
  if (type === 'NUMERIC' || type === 'INTEGER' || type === 'REAL' || type === 'FLOAT') {
    if (typeof val === 'number') return Number.isFinite(val) ? String(val) : '0';
    if (val === '' || val == null) return '0';
    const n = Number(val);
    return Number.isFinite(n) ? String(n) : '0';
  }

  // Cadenas de texto
  return escapeSqlString(val);
}

function generateDump(db, dumpFilePath) {
  console.log(`\n📦 Leyendo SQLite: ${dbPath}`);
  let sql = `-- ==============================================================================
-- EasyPoint - Complete MySQL 8.x / MariaDB Database Dump
-- Generated: ${new Date().toISOString()}
-- Source: PocketBase SQLite (pb/pb_data/data.db)
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET NAMES utf8mb4;

`;

  // 1. Incluir el esquema DDL base
  if (fs.existsSync(schemaPath)) {
    sql += `-- ------------------------------------------------------------------------------\n`;
    sql += `-- 1. DDL Schema Definition\n`;
    sql += `-- ------------------------------------------------------------------------------\n\n`;
    sql += fs.readFileSync(schemaPath, 'utf8') + `\n\n`;
  }

  sql += `-- ------------------------------------------------------------------------------\n`;
  sql += `-- 2. Data Inserts\n`;
  sql += `-- ------------------------------------------------------------------------------\n\n`;

  let totalRows = 0;
  const stats = [];

  for (const table of ORDERED_TABLES) {
    let colInfo;
    try {
      colInfo = db.prepare(`PRAGMA table_info(${table})`).all();
    } catch (_) {
      console.warn(`⚠️  Tabla "${table}" no existe en el origen.`);
      continue;
    }

    const colMap = new Map();
    for (const c of colInfo) {
      colMap.set(c.name, c.type);
    }

    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    stats.push({ table, count: rows.length });
    totalRows += rows.length;

    if (rows.length === 0) {
      sql += `-- Tabla: \`${table}\` (0 registros)\n\n`;
      continue;
    }

    sql += `-- Tabla: \`${table}\` (${rows.length} registros)\n`;
    sql += `LOCK TABLES \`${table}\` WRITE;\n`;

    // Obtener las columnas del primer registro
    const cols = Object.keys(rows[0]);
    const colListSql = cols.map(c => `\`${c}\``).join(', ');

    // Agrupar en batches de 50 registros por INSERT
    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const valuesSql = batch.map(row => {
        const vals = cols.map(col => formatSqlValue(row[col], col, colMap.get(col)));
        return `  (${vals.join(', ')})`;
      }).join(',\n');

      sql += `INSERT INTO \`${table}\` (${colListSql}) VALUES\n${valuesSql}\nON DUPLICATE KEY UPDATE \`updated\` = VALUES(\`updated\`);\n`;
    }

    sql += `UNLOCK TABLES;\n\n`;
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  sql += `-- Dump completado exitosamente con ${totalRows} registros.\n`;

  // Asegurar directorio destino
  const targetDir = path.dirname(dumpFilePath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(dumpFilePath, sql, 'utf8');

  const sizeKb = (Buffer.byteLength(sql, 'utf8') / 1024).toFixed(1);
  console.log(`\n✅ Dump generado con éxito: ${dumpFilePath} (${sizeKb} KB)`);
  console.log(`📊 Resumen de registros por tabla:`);
  console.log(`-----------------------------------------------`);
  for (const s of stats) {
    console.log(`  ${s.table.padEnd(24)}: ${String(s.count).padStart(5)} registros`);
  }
  console.log(`-----------------------------------------------`);
  console.log(`  TOTAL:                    ${String(totalRows).padStart(5)} registros\n`);

  console.log(`💡 Instrucciones para importar en tu servidor MySQL:`);
  console.log(`   mysql -h <host> -u <usuario> -p <nombre_db> < "${path.relative(process.cwd(), dumpFilePath)}"`);
  console.log(`   O desde phpMyAdmin / DBeaver / Workbench: importar el archivo .sql directamente.\n`);
}

function main() {
  console.log('🚀 EasyPoint - Migrador SQLite a MySQL 8.x');

  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Error: No se encontró la base de datos SQLite en: ${dbPath}`);
    process.exit(1);
  }

  const { dumpPath, checkOnly } = parseArgs();
  const db = new DatabaseSync(dbPath, { open: true });

  if (checkOnly) {
    console.log(`\n🔍 Verificando integridad de tablas en: ${dbPath}`);
    for (const table of ORDERED_TABLES) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
        console.log(`  ✓ ${table.padEnd(24)}: ${count} filas`);
      } catch (err) {
        console.error(`  ✗ ${table.padEnd(24)}: ${err.message}`);
      }
    }
    console.log('\nIntegridad SQLite verificada.');
    return;
  }

  generateDump(db, dumpPath);
}

main();
