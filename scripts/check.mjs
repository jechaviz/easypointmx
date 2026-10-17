// Verificación previa a desplegar, sin base de datos:  node scripts/check.mjs
//   1) DDL generado al día   2) vendor/ sin deriva   3) contrato del front
//   4) el servidor compila (V) y pasa su autoprueba (--selftest)
// Las pruebas con MySQL (e2e_v2, e2e_engine) se corren aparte contra una base de pruebas.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
let bad = 0;
function step(name, cmd, args, opt = {}) {
  process.stdout.write(`▶ ${name} … `);
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', ...opt });
  const out = (r.stdout || '') + (r.stderr || '');
  if (r.status === 0) console.log('ok' + (opt.show ? ' · ' + out.trim().split('\n').pop() : ''));
  else { bad++; console.log('FALLA\n' + out.split('\n').slice(-12).join('\n')); }
}

step('schema_gen.v al día', node, ['scripts/gen-schema.mjs', '--check']);
step('vendor/ sin deriva', node, ['scripts/sync-lib.mjs', '--check']);
step('contrato del front', node, ['tests/site_audit.mjs'], { show: true });
const V = process.env.V_BIN || 'C:/git/v/v.exe';
if (fs.existsSync(V)) {
  const out = path.join(root, '.data', process.platform === 'win32' ? 'check.exe' : 'check');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  step('servidor compila', V, ['-o', out, 'server']);
  step('autoprueba del servidor', out, ['--selftest'], { show: true });
} else console.log('· V no disponible: se omite compilación y autoprueba');
console.log(bad ? `\n✗ ${bad} verificación(es) fallaron` : '\n✓ todo en orden');
process.exit(bad ? 1 : 0);
