import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projRoot = path.resolve(__dirname, '..');
const PORT = Number.parseInt(process.env.PORT || '', 10) || 3033;
const PB_URL = new URL(process.env.PB_URL || 'http://127.0.0.1:8090');
const ROUTE_ALIASES = ['/easypoint'];
const PROXY_PREFIXES = ['/api', '/_/'];
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade'
]);

const MIME_TYPES = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.map': 'application/json',
};

function normalizeRequestPath(rawUrl = '/') {
  const rawPath = String(rawUrl || '/').split('?')[0] || '/';
  let urlPath;

  try {
    urlPath = decodeURIComponent(rawPath);
  } catch (_) {
    return null;
  }

  if (urlPath.includes('\0')) return null;

  for (const alias of ROUTE_ALIASES) {
    if (urlPath === alias) return '/';
    if (urlPath.startsWith(`${alias}/`)) {
      return urlPath.slice(alias.length) || '/';
    }
  }
  return urlPath;
}

function isInsideProjectRoot(candidatePath) {
  return candidatePath === projRoot || candidatePath.startsWith(`${projRoot}${path.sep}`);
}

function shouldProxyPath(urlPath) {
  return PROXY_PREFIXES.some((prefix) => urlPath === prefix || urlPath.startsWith(`${prefix}/`));
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

function buildProxyHeaders(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    const lowered = key.toLowerCase();
    if (!value || lowered === 'host' || lowered === 'content-length' || HOP_BY_HOP_HEADERS.has(lowered)) {
      continue;
    }
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  if (req.headers.host) headers.set('x-forwarded-host', req.headers.host);
  headers.set('x-forwarded-proto', 'http');
  return headers;
}

async function proxyRequest(req, res, upstreamUrl) {
  try {
    const method = req.method || 'GET';
    const init = {
      method,
      headers: buildProxyHeaders(req),
      redirect: 'manual'
    };

    if (!['GET', 'HEAD'].includes(method)) {
      init.body = await readRequestBody(req);
    }

    const upstreamRes = await fetch(upstreamUrl, init);
    const responseHeaders = {};
    upstreamRes.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    const body = method === 'HEAD' ? Buffer.alloc(0) : Buffer.from(await upstreamRes.arrayBuffer());
    res.writeHead(upstreamRes.status, responseHeaders);
    res.end(body);
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      error: 'Bad Gateway',
      message: error.message
    }));
  }
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const urlPath = normalizeRequestPath(requestUrl.pathname);
  if (urlPath === null) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  if (urlPath === '/health') {
    const body = JSON.stringify({
      status: 'ok',
      service: 'easypoint-web',
      port: PORT,
      timestamp: new Date().toISOString(),
      aliases: ROUTE_ALIASES,
      proxy: {
        upstream: PB_URL.origin,
        prefixes: PROXY_PREFIXES
      }
    });
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(body);
    return;
  }

  if (urlPath === '/favicon.ico') {
    res.writeHead(204, {
      'Cache-Control': 'public, max-age=86400'
    });
    res.end();
    return;
  }

  if (shouldProxyPath(urlPath)) {
    const upstreamUrl = new URL(`${urlPath}${requestUrl.search}`, PB_URL);
    proxyRequest(req, res, upstreamUrl);
    return;
  }

  let filePath = path.resolve(projRoot, `.${urlPath === '/' ? '/index.html' : urlPath}`);
  
  // Basic security: stay within root
  if (!isInsideProjectRoot(filePath)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  // If path has no extension, treat as a potential directory → serve index.html
  const serveFile = (fp) => {
    const extname = path.extname(fp);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';
    fs.readFile(fp, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          // SPA Fallback logic
          if (urlPath.startsWith('/website')) {
             const fallback = path.resolve(projRoot, 'website', 'index.html');
             if (fp !== fallback) return serveFile(fallback);
          } else if (urlPath.startsWith('/app')) {
             const fallback = path.resolve(projRoot, 'app', 'index.html');
             if (fp !== fallback) return serveFile(fallback);
          }
          res.statusCode = 404;
          res.end('404 Not Found');
        } else {
          res.statusCode = 500;
          res.end('500 Internal Server Error: ' + error.message);
        }
      } else {
        const securityHeaders = {
          'Content-Type': contentType,
          'X-Content-Type-Options': 'nosniff', // Prevents MIME-sniffing
          'X-Frame-Options': 'DENY', // Clickjacking protection
          'X-XSS-Protection': '1; mode=block', // Legacy XSS filter
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains', // HSTS
          'Referrer-Policy': 'strict-origin-when-cross-origin', // Information leakage protection
          // CSP tailored for Vue SFC, PocketBase API, CDN imports, and OneSignal
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://cdn.onesignal.com https://cdn.redoc.ly; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; img-src 'self' data: blob: https://images.unsplash.com https://cdn.onesignal.com https://unpkg.com https://*.basemaps.cartocdn.com; connect-src 'self' http://127.0.0.1:* http://localhost:* https://nominatim.openstreetmap.org https://api.onesignal.com https://cdn.onesignal.com https://*.onesignal.com wss://*.onesignal.com; worker-src 'self' https://cdn.onesignal.com blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
          // Restrict browser features (OWASP Best Practice)
          'Permissions-Policy': "camera=(self), microphone=(), geolocation=()"
        };
        res.writeHead(200, securityHeaders);
        res.end(content, 'utf-8');
      }
    });
  };

  // Check if it's a directory and resolve to index.html
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      if (!requestUrl.pathname.endsWith('/')) {
        res.writeHead(308, {
          Location: `${requestUrl.pathname}/${requestUrl.search}`,
          'Cache-Control': 'no-store'
        });
        res.end();
        return;
      }
      filePath = path.join(filePath, 'index.html');
    }
    serveFile(filePath);
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set PORT to a free port and retry.`);
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Easypoint Unified Server running at http://localhost:${PORT}/`);
  console.log(`- Landing: http://localhost:${PORT}/website/`);
  console.log(`- App: http://localhost:${PORT}/app/`);
  console.log(`- Alias: http://localhost:${PORT}/easypoint/`);
  console.log(`- Health: http://localhost:${PORT}/health`);
  console.log(`- PocketBase upstream: ${PB_URL.origin}`);
});
