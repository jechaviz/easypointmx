// Entorno local en un comando:  node scripts/dev.mjs [--no-build] [--reset] [--port 8081]
//  1) levanta MariaDB local (datos en .data/mysql, puerto 3307) si no está corriendo
//  2) compila server/ con V (si hace falta)
//  3) migra y siembra la demo la primera vez (o con --reset)
//  4) corre el servidor: API + sitio en http://127.0.0.1:<puerto>/website/  y  /app/
// Variables opcionales: V_BIN, EP_MARIADB_DIR, EP_SEED_PASSWORD
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = path.join(root, '.data');
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 8081;
const DBPORT = 3307;
const exe = process.platform === 'win32' ? '.exe' : '';
const V = process.env.V_BIN || 'C:/git/v/v.exe';
const mdir = process.env.EP_MARIADB_DIR || path.join(os.homedir(), 'scoop/apps/mariadb/current/bin');
const bin = (n) => path.join(mdir, n + exe);
const ep = path.join(data, 'ep' + exe);

const env = {
  ...process.env,
  EP_DB_HOST: '127.0.0.1', EP_DB_PORT: String(DBPORT), EP_DB_NAME: 'easypoint', EP_DB_USER: 'ep', EP_DB_PASS: 'ep_dev_pw',
  EP_MARIADB_BIN: bin('mariadb'), EP_JWT_SECRET: process.env.EP_JWT_SECRET || 'dev_secret_change_me_0123456789',
  EP_BCRYPT_COST: '6', EP_SEED_PASSWORD: process.env.EP_SEED_PASSWORD || 'Demo12345!', EP_WEB_ROOT: root,
  EASYPOINT_APP_URL: `http://127.0.0.1:${port}`, EP_MAIL: 'off', EP_LOGIN_GLOBAL_LIMIT: '1000'
};
const run = (cmd, a, o = {}) => spawnSync(cmd, a, { stdio: 'inherit', env, ...o });
const sql = (q, user = 'root') => spawnSync(bin('mariadb'), ['-N', '-B', `-h127.0.0.1`, `-P${DBPORT}`, `-u${user}`, ...(user === 'ep' ? ['easypoint'] : []), '-e', q], { env: { ...env, MYSQL_PWD: user === 'ep' ? 'ep_dev_pw' : '' }, encoding: 'utf8' });
const up = () => new Promise((res) => { const s = net.connect(DBPORT, '127.0.0.1'); s.on('connect', () => { s.destroy(); res(true); }); s.on('error', () => res(false)); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(data, { recursive: true });

// 1) MariaDB
if (!(await up())) {
  const dd = path.join(data, 'mysql');
  if (!fs.existsSync(dd)) { console.log('· inicializando MariaDB local…'); run(bin('mariadb-install-db'), [`--datadir=${dd}`, '--password=']); }
  console.log('· arrancando MariaDB en el puerto', DBPORT);
  spawn(bin('mariadbd'), [`--datadir=${dd}`, `--port=${DBPORT}`, '--bind-address=127.0.0.1', '--console'], { detached: true, stdio: ['ignore', fs.openSync(path.join(data, 'mysqld.log'), 'a'), 'ignore'], windowsHide: true }).unref();
  for (let i = 0; i < 40 && !(await up()); i++) await wait(500);
  if (!(await up())) { console.error('✗ MariaDB no arrancó (revisa .data/mysqld.log)'); process.exit(1); }
}
if (args.includes('--reset')) sql('DROP DATABASE IF EXISTS easypoint');
sql("CREATE DATABASE IF NOT EXISTS easypoint CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'ep'@'127.0.0.1' IDENTIFIED BY 'ep_dev_pw'; CREATE USER IF NOT EXISTS 'ep'@'localhost' IDENTIFIED BY 'ep_dev_pw'; GRANT ALL ON easypoint.* TO 'ep'@'127.0.0.1'; GRANT ALL ON easypoint.* TO 'ep'@'localhost';");

// 2) compilar
if (!args.includes('--no-build') || !fs.existsSync(ep)) {
  console.log('· compilando server/ con V…');
  const r = run(V, ['-o', ep, path.join(root, 'server')]);
  if (r.status !== 0) process.exit(r.status || 1);
}

// 3) migrar + demo
run(ep, ['--migrate']);
const hasPoints = sql('SELECT COUNT(*) FROM points', 'ep').stdout.trim() !== '0';
if (!hasPoints) { console.log('· sembrando demo…'); run(ep, ['--seed-demo']); } else run(ep, ['--seed']);

// 4) servir
console.log(`\n  Sitio:  http://127.0.0.1:${port}/website/\n  Panel:  http://127.0.0.1:${port}/app/   (admin@easypoint.mx / ${env.EP_SEED_PASSWORD})\n`);
const srv = spawn(ep, ['--serve', String(port)], { stdio: 'inherit', env });
process.on('SIGINT', () => { srv.kill(); process.exit(0); });
srv.on('exit', (c) => process.exit(c || 0));
