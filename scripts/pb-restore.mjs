import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const pbDir = path.join(repoRoot, 'pb');
const dataDir = path.join(pbDir, 'pb_data');
const backupsDir = path.join(pbDir, 'backups');
const requested = process.argv[2] || '';

async function findLatestBackup() {
  const entries = await fs.readdir(backupsDir, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  if (!dirs.length) throw new Error('No backups found in pb/backups.');
  return path.join(backupsDir, dirs[dirs.length - 1]);
}

async function main() {
  const source = requested ? path.resolve(repoRoot, requested) : await findLatestBackup();
  const sourceStat = await fs.stat(source);
  if (!sourceStat.isDirectory()) throw new Error(`Backup path is not a directory: ${source}`);

  const snapshot = `${dataDir}.pre_restore_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  await fs.cp(dataDir, snapshot, { recursive: true });
  await fs.rm(dataDir, { recursive: true, force: true });
  await fs.cp(source, dataDir, { recursive: true });

  console.log(`PocketBase data restored from: ${source}`);
  console.log(`Pre-restore snapshot saved at: ${snapshot}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
