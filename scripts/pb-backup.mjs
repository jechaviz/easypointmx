import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const pbDir = path.join(repoRoot, 'pb');
const dataDir = path.join(pbDir, 'pb_data');
const backupsDir = path.join(pbDir, 'backups');
const backupName = process.argv[2] || new Date().toISOString().replace(/[:.]/g, '-');
const destination = path.join(backupsDir, backupName);

async function main() {
  await fs.mkdir(backupsDir, { recursive: true });
  await fs.access(dataDir);
  await fs.cp(dataDir, destination, { recursive: true, errorOnExist: true, force: false });
  console.log(`PocketBase backup created at: ${destination}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
