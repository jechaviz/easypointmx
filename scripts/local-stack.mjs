import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const pbDir = path.join(repoRoot, 'pb');
const pbBin = process.env.POCKETBASE_BIN || path.join(pbDir, 'pocketbase.exe');
const webEntry = path.join(repoRoot, 'app', 'server.mjs');
const smokeEntry = path.join(repoRoot, 'tests', 'api_e2e.mjs');
const generatedRuntimeConfig = path.join(repoRoot, 'runtime-config.generated.js');
const mode = process.argv[2] || 'serve';
const pbPort = Number.parseInt(process.env.PB_PORT || '', 10) || 8091;
const webPort = Number.parseInt(process.env.WEB_PORT || '', 10) || 3041;
const pbUrl = `http://127.0.0.1:${pbPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const webAliasUrl = `${webUrl}/easypoint`;
const managedRuntimeConfig = `window.EASYPOINT_RUNTIME_CONFIG = Object.assign(
  {},
  window.EASYPOINT_RUNTIME_CONFIG || {},
  {
    pocketBaseUrl: '${webUrl}'
  }
);
`;

const children = [];
let shuttingDown = false;

function usage() {
  console.log('Usage: node scripts/local-stack.mjs <serve|smoke>');
}

function prefixStream(stream, label) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim()) console.log(`[${label}] ${line}`);
    }
  });
  stream.on('end', () => {
    if (buffer.trim()) console.log(`[${label}] ${buffer}`);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(url, label, attempts = 40, delayMs = 500) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (_) {
      // Retry until timeout.
    }
    await wait(delayMs);
  }
  throw new Error(`${label} did not become ready: ${url}`);
}

function spawnManaged(name, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: process.env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  });

  children.push({ name, child });
  prefixStream(child.stdout, name);
  prefixStream(child.stderr, `${name}:err`);

  child.once('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[${name}] exited unexpectedly (code=${code ?? 'null'}, signal=${signal ?? 'null'})`);
    stopAll(code ?? 1).finally(() => {
      process.exit(code ?? 1);
    });
  });

  return child;
}

async function writeGeneratedRuntimeConfig() {
  await fs.writeFile(generatedRuntimeConfig, managedRuntimeConfig, 'utf8');
}

async function ensurePocketBaseExists() {
  try {
    await fs.access(pbBin);
  } catch (_) {
    throw new Error(`PocketBase binary not found: ${pbBin}`);
  }
}

async function stopAll(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = exitCode;

  const stops = children.map(async ({ child }) => {
    if (child.exitCode !== null) return;
    try {
      child.kill();
    } catch (_) {
      // Ignore shutdown failures.
    }
  });

  await Promise.all(stops);
}

function registerSignals() {
  const handler = async (signal) => {
    console.log(`Received ${signal}, stopping local stack...`);
    await stopAll(0);
    process.exit(0);
  };

  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);
}

async function startStack() {
  await ensurePocketBaseExists();
  await writeGeneratedRuntimeConfig();

  spawnManaged('pb', pbBin, ['serve', '--http', `127.0.0.1:${pbPort}`], {
    cwd: pbDir
  });

  spawnManaged('web', process.execPath, [webEntry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(webPort),
      PB_URL: pbUrl
    }
  });

  await waitForHttp(`${pbUrl}/api/health`, 'PocketBase');
  await waitForHttp(`${webUrl}/health`, 'Web server');

  console.log(`Runtime config written to ${generatedRuntimeConfig}`);
  console.log(`PocketBase: ${pbUrl}`);
  console.log(`Website: ${webUrl}/website/`);
  console.log(`App: ${webUrl}/app/`);
  console.log(`Alias: ${webAliasUrl}/`);
}

async function runSmoke() {
  const test = spawn(process.execPath, [smokeEntry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PB_API: `${pbUrl}/api`,
      WEB_URL: webAliasUrl
    },
    windowsHide: true,
    stdio: 'inherit'
  });

  const exitCode = await new Promise((resolve, reject) => {
    test.once('error', reject);
    test.once('exit', (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    throw new Error(`Smoke test failed with exit code ${exitCode}`);
  }
}

async function main() {
  if (!['serve', 'smoke'].includes(mode)) {
    usage();
    process.exitCode = 1;
    return;
  }

  registerSignals();
  await startStack();

  if (mode === 'smoke') {
    try {
      await runSmoke();
    } finally {
      await stopAll(0);
    }
    return;
  }

  console.log('Local stack is running. Press Ctrl+C to stop.');
  await new Promise(() => {});
}

main().catch(async (error) => {
  console.error(error.message || error);
  await stopAll(1);
});
