// Genera server/schema_gen.v a partir de server/schema/*.sql (base64 → sin problemas de escape).
// V no incrusta $embed_file en el C transpilado de builds de desarrollo, así que el DDL viaja como constante.
//   node scripts/gen-schema.mjs           escribe server/schema_gen.v
//   node scripts/gen-schema.mjs --check   falla si el generado no coincide con los .sql
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'server', 'schema');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const items = files.map((f) => `\t'${Buffer.from(fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n')).toString('base64')}', // ${f}`);
const out = `module main

// GENERADO por scripts/gen-schema.mjs a partir de server/schema/*.sql — no editar a mano.
const ddl_b64 = [
${items.join('\n')}
]
`;
const target = path.join(root, 'server', 'schema_gen.v');
if (process.argv.includes('--check')) {
  const have = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : '';
  if (have !== out) { console.error('✗ server/schema_gen.v no coincide con server/schema/*.sql (corre scripts/gen-schema.mjs)'); process.exit(1); }
  console.log('✓ schema_gen.v al día con', files.length, 'archivos SQL');
} else {
  fs.writeFileSync(target, out);
  console.log('✓ server/schema_gen.v generado con', files.length, 'archivos SQL');
}
