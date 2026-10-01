// ITCAN website server. Zero dependencies. Node 20+.
// Serves /public, compresses text, caches assets, and falls back to the
// original itcan.biz photo when an award image was not fetched at build time.
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ORIGIN_UPLOADS = 'https://www.itcan.biz/wp-content/uploads/';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.webmanifest', '.xml', '.txt', '.svg']);

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https://www.itcan.biz https://i.ytimg.com",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'self' mailto:",
  "frame-ancestors 'self'",
].join('; ');

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': CSP,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

// slug -> original upload path, for the award image fallback
let awardSources = {};
try {
  const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'awards.json'), 'utf8'));
  for (const a of list) awardSources[a.slug] = a.src;
} catch (err) {
  console.error('[server] could not read awards.json:', err.message);
}

// old WordPress addresses on itcan.biz, sent to the matching section (301 keeps their ranking)
const LEGACY = {
  '/services': '/#product', '/about-us': '/#about', '/about': '/#about', '/contact-us': '/#contact', '/contact': '/#contact',
  '/career': '/#careers', '/careers': '/#careers', '/industrial-solutions': '/#integrations', '/press': '/#media',
  '/media': '/#media', '/our-offices': '/#scale', '/offices': '/#scale',
};

const gzCache = new Map(); // abs path -> { mtimeMs, buf }

function cacheControl(ext, urlPath, versioned) {
  // hashed lazy chunks and ?v= stamped files never change; everything else revalidates (cheap 304 via ETag)
  if (urlPath.startsWith('/js/chunks/') || (versioned && ['.css', '.js'].includes(ext))) return 'public, max-age=31536000, immutable';
  // HTML, CSS, JS and data always revalidate, so a deploy shows up at once
  if (['.html', '.css', '.js', '.mjs', '.json', '.webmanifest'].includes(ext)) return 'no-cache';
  if (urlPath.startsWith('/awards/')) return 'public, max-age=2592000, immutable';
  if (urlPath.startsWith('/assets/')) return 'public, max-age=604800';
  return 'public, max-age=3600';
}

async function sendFile(req, res, absPath, urlPath, status = 200, versioned = false) {
  const ext = path.extname(absPath).toLowerCase();
  const stat = await fsp.stat(absPath);
  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const headers = {
    ...SECURITY_HEADERS,
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    'Cache-Control': cacheControl(ext, urlPath, versioned),
    'ETag': etag,
    'Last-Modified': stat.mtime.toUTCString(),
    'Vary': 'Accept-Encoding',
  };
  if (status === 200 && req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    return res.end();
  }
  const ae = req.headers['accept-encoding'] || '';
  const enc = /\bbr\b/.test(ae) ? 'br' : /\bgzip\b/.test(ae) ? 'gzip' : '';
  if (COMPRESSIBLE.has(ext) && enc && stat.size > 1024) {
    const key = enc + ':' + absPath;
    let entry = gzCache.get(key);
    if (!entry || entry.mtimeMs !== stat.mtimeMs) {
      const raw = await fsp.readFile(absPath);
      const buf = enc === 'br'
        ? zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } })
        : zlib.gzipSync(raw, { level: 9 });
      entry = { mtimeMs: stat.mtimeMs, buf };
      gzCache.set(key, entry);
    }
    headers['Content-Encoding'] = enc;
    headers['Content-Length'] = entry.buf.length;
    res.writeHead(status, headers);
    return res.end(req.method === 'HEAD' ? undefined : entry.buf);
  }
  headers['Accept-Ranges'] = 'bytes';
  // byte ranges, so video can stream and seek (Safari needs this)
  const range = status === 200 && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]));
    let end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
    if (start >= stat.size || start > end) {
      res.writeHead(416, { ...SECURITY_HEADERS, 'Content-Range': `bytes */${stat.size}` });
      return res.end();
    }
    headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    headers['Content-Length'] = end - start + 1;
    res.writeHead(206, headers);
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(absPath, { start, end }).pipe(res);
  }
  headers['Content-Length'] = stat.size;
  res.writeHead(status, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(absPath).pipe(res);
}

async function exists(p) {
  try { return (await fsp.stat(p)).isFile(); } catch { return false; }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', ...SECURITY_HEADERS });
      return res.end('Method not allowed');
    }
    const url = new URL(req.url, 'http://local');
    let urlPath;
    try { urlPath = decodeURIComponent(url.pathname); } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
      return res.end('Bad request');
    }
    if (urlPath === '/favicon.ico') urlPath = '/assets/brand/favicon.ico';
    const versioned = url.searchParams.has('v');

    if (urlPath === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
      return res.end('ok');
    }

    const legacy = LEGACY[urlPath.replace(/\/+$/, '').toLowerCase()];
    if (legacy) { res.writeHead(301, { Location: legacy, 'Cache-Control': 'public, max-age=86400', ...SECURITY_HEADERS }); return res.end(); }

    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const absPath = path.normalize(path.join(ROOT, urlPath));
    if (!absPath.startsWith(ROOT)) {
      res.writeHead(400, SECURITY_HEADERS);
      return res.end('Bad request');
    }

    if (await exists(absPath)) return await sendFile(req, res, absPath, urlPath, 200, versioned);

    // Award photo not cached locally: send the browser to the original.
    const m = urlPath.match(/^\/awards\/([a-z0-9-]+?)(-sm)?\.jpg$/);
    if (m && awardSources[m[1]]) {
      res.writeHead(302, { Location: ORIGIN_UPLOADS + awardSources[m[1]], 'Cache-Control': 'public, max-age=3600' });
      return res.end();
    }

    // Clean URLs: /about -> /about.html if it exists
    if (!path.extname(absPath) && await exists(absPath + '.html')) {
      return await sendFile(req, res, absPath + '.html', urlPath + '.html');
    }

    return await sendFile(req, res, path.join(ROOT, '404.html'), '/404.html', 404);
  } catch (err) {
    console.error('[server]', req.url, err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[server] ITCAN site listening on http://${HOST}:${PORT}`);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
