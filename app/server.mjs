import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projRoot = path.resolve(__dirname, '..');
const PORT = 3033;

const MIME_TYPES = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  // Strip query strings
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(projRoot, urlPath === '/' ? 'index.html' : urlPath);
  
  // Basic security: stay within root
  if (!filePath.startsWith(projRoot)) {
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
             const fallback = path.join(projRoot, 'website', 'index.html');
             if (fp !== fallback) return serveFile(fallback);
          } else if (urlPath.startsWith('/app')) {
             const fallback = path.join(projRoot, 'app', 'index.html');
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
          // CSP tailored for Vue SFC, PocketBase API, CDN imports, and Unsplash images
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; img-src 'self' data: blob: https://images.unsplash.com; connect-src 'self' http://127.0.0.1:8090; object-src 'none'; base-uri 'self';",
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
      // Ensure trailing slash then serve index.html
      filePath = path.join(filePath, 'index.html');
    }
    serveFile(filePath);
  });
});

server.listen(PORT, () => {
  console.log(`Easypoint Unified Server running at http://localhost:${PORT}/easypoint/`);
  console.log(`- Landing: http://localhost:${PORT}/easypoint/website/`);
  console.log(`- App: http://localhost:${PORT}/easypoint/app/`);
});
