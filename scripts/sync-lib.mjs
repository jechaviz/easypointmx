// Sincroniza los módulos compartidos de ../lib hacia vendor/ (copia en build: el despliegue nunca
// depende de ../lib en ejecución). Registra el origen y el hash de cada archivo en vendor/MANIFEST.json.
//   node scripts/sync-lib.mjs           copia y actualiza el manifiesto
//   node scripts/sync-lib.mjs --check   falla si vendor/ difiere de lib/ (deriva)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = process.env.EP_LIB || path.resolve(root, '..', 'lib');
const check = process.argv.includes('--check');

// destino → [origen relativo a lib, archivos]
const MAP = [
  ['vendor/growth-kit', 'growth-kit/js', ['index.js', 'whatsapp.js', 'attribution.js', 'share.js', 'campaign.js', 'leads.js', 'ui.js']],
  ['vendor/web-ui', 'web-ui/components', ['FAQ.vue', 'Testimonials.vue', 'Timeline.vue', 'AudiencePaths.vue', 'Gallery.vue', 'Lightbox.vue', 'SocialBar.vue']],
  ['vendor/web-common', 'web-common', ['browser.js']],
  ['vendor/procurement-common', 'procurement-common', ['browser.js']],
  ['vendor/qrcode', 'erp/ui/vendor', ['qrcode.js']],
  ['vendor/site-audit-core', 'site-audit-core', ['index.mjs', 'promotion.mjs']]
];

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);
const manifest = {};
let drift = 0;
for (const [dest, src, files] of MAP) {
  for (const f of files) {
    const from = path.join(LIB, src, f);
    const to = path.join(root, dest, f);
    if (!fs.existsSync(from)) { console.error('✗ falta en lib:', path.join(src, f)); drift++; continue; }
    const data = fs.readFileSync(from);
    const rel = `${dest}/${f}`;
    manifest[rel] = { from: `${src}/${f}`, sha256_16: sha(data), bytes: data.length };
    if (check) {
      const have = fs.existsSync(to) ? sha(fs.readFileSync(to)) : '';
      if (have !== sha(data)) { console.error('✗ deriva:', rel); drift++; }
    } else {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.writeFileSync(to, data);
    }
  }
}
if (!check) {
  fs.writeFileSync(path.join(root, 'vendor', 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`✓ ${Object.keys(manifest).length} archivos sincronizados desde ${LIB}`);
} else if (drift) {
  console.error(`✗ ${drift} archivo(s) con deriva respecto a lib/`);
  process.exit(1);
} else {
  console.log(`✓ vendor/ coincide con lib/ (${Object.keys(manifest).length} archivos)`);
}
