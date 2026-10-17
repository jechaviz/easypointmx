// Auditoría de contrato del front (sin servidor ni base de datos):
//  · site-audit-core (lib): archivos esperados, nombres, longitud, anclas y fuentes externas
//  · rutas declaradas en index.html ↔ componentes existentes
//  · componentes ui registrados ↔ archivos
//  · cada <ep-xxx> usado en una plantilla está registrado
//  · SFCs sin imports ES (no hay bundler), vendor/ sin deriva respecto a ../lib
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditSite, formatHumanReport } from '../vendor/site-audit-core/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log('✅', n); } else { fail++; console.log('❌', n, x ? '→ ' + x : ''); } };
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const walk = (d, out = []) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const r = path.join(d, e.name); if (e.isDirectory()) walk(r, out); else out.push(r.replace(/\\/g, '/')); } return out; };

// 1) site-audit-core sobre website/ y app/
for (const target of ['website', 'app', 'shared']) {
  const rep = await auditSite({
    target: path.join(root, target), maxLines: 700,
    manifest: { expectedFiles: target === 'shared' ? ['ep-core.js', 'ep-ui.css', 'ep-art.js'] : ['index.html', 'manifest.webmanifest', 'sw.js'].concat(target === 'website' ? ['icon.svg'] : []), fileNamePattern: '^[A-Za-z0-9._-]+$', allowedExternalSources: [] }
  });
  const errors = rep.issues.filter((i) => i.severity === 'error');
  ok(`site-audit-core · ${target}: sin errores (${rep.files.actual.length} archivos)`, errors.length === 0, errors.slice(0, 3).map((e) => e.message || e.type).join('; '));
}

// 2) rutas ↔ componentes
for (const [section, rx] of [['website', /comp: '([^']+)'/g], ['app', /R\('[^']+', '([^']+)'/g]]) {
  const html = read(`${section}/index.html`);
  const comps = [...html.matchAll(rx)].map((m) => m[1]);
  const missing = comps.filter((c) => !fs.existsSync(path.join(root, section, 'components', section === 'app' ? `pages/${c}.vue` : c)));
  ok(`${section}: ${comps.length} rutas apuntan a componentes existentes`, comps.length > 5 && missing.length === 0, missing.join(', '));
}

// 3) componentes ui registrados ↔ archivos; uso de <ep-*>
const core = read('shared/ep-core.js');
const reg = (core.match(/const ui = \[([^\]]+)\]/) || [])[1].split(',').map((s) => s.trim().replace(/'/g, ''));
const missingUi = reg.filter((n) => !fs.existsSync(path.join(root, `shared/ui/${n}.vue`)));
ok(`shared/ui: ${reg.length} componentes registrados existen`, missingUi.length === 0, missingUi.join(', '));
const used = new Set();
for (const f of [...walk('website'), ...walk('app'), ...walk('shared/ui')].filter((x) => x.endsWith('.vue'))) for (const m of read(f).matchAll(/<(ep-[a-z]+)/g)) used.add(m[1]);
const unreg = [...used].filter((n) => !reg.includes(n));
ok(`Todos los <ep-*> usados (${used.size}) están registrados`, unreg.length === 0, unreg.join(', '));

// 4) SFCs sin imports ES ni módulos
const sfcs = [...walk('website'), ...walk('app'), ...walk('shared/ui')].filter((x) => x.endsWith('.vue'));
const bad = sfcs.filter((f) => /^\s*import\s.+from\s/m.test(read(f).split('<script>')[1] || ''));
ok(`${sfcs.length} SFCs sin imports ES (sin bundler)`, bad.length === 0, bad.join(', '));

// 5) cada <script> tiene su plantilla y export default
const noExport = sfcs.filter((f) => { const t = read(f); return t.includes('<script>') && !/export default/.test(t); });
ok('Todos los SFCs con <script> exportan un componente', noExport.length === 0, noExport.join(', '));

// 6) vendor sin deriva respecto a ../lib (si existe)
const lib = path.resolve(root, '..', 'lib');
if (fs.existsSync(lib)) {
  let drift = '';
  try { execFileSync(process.execPath, [path.join(root, 'scripts/sync-lib.mjs'), '--check'], { stdio: 'pipe' }); } catch (e) { drift = String(e.stderr || e.message); }
  ok('vendor/ coincide con ../lib (sin deriva)', drift === '', drift.split('\n')[0]);
} else { console.log('· ../lib no está disponible: se omite la prueba de deriva'); }

// 7) PocketBase fuera para siempre
const pb = [...walk('server'), ...walk('website'), ...walk('app'), ...walk('shared')].filter((f) => /pocketbase|pb_hooks/i.test(read(f)));
ok('Sin referencias a PocketBase en el código', pb.length === 0, pb.join(', '));

console.log(`\n🏁 ${pass} OK / ${fail} FAIL`);
if (fail) process.exit(1);
