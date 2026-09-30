// Build step: download the award photos from itcan.biz and save web-sized
// copies to public/awards/<slug>.jpg (1600px) and <slug>-sm.jpg (720px).
// Never fails the build. Any photo that cannot be fetched falls back to the
// original URL at runtime (see server.js).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const OUT = path.join(PUBLIC, 'awards');
const BASE = 'https://www.itcan.biz/wp-content/uploads/';

let sharp = null;
try { sharp = (await import('sharp')).default; } catch { console.log('[awards] sharp not available, saving originals'); }

async function get(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (ITCAN site build)' } });
      clearTimeout(t);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (i === tries) throw err;
      await new Promise(r => setTimeout(r, 800 * i));
    }
  }
}

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function processOne(a) {
  const big = path.join(OUT, a.slug + '.jpg');
  const small = path.join(OUT, a.slug + '-sm.jpg');
  if (await exists(big) && await exists(small)) return 'cached';
  const buf = await get(BASE + a.src);
  if (sharp) {
    const base = sharp(buf, { animated: false }).rotate().flatten({ background: '#0b0d13' });
    await base.clone().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toFile(big);
    await base.clone().resize({ width: 720, withoutEnlargement: true }).jpeg({ quality: 74, mozjpeg: true }).toFile(small);
  } else {
    await fs.writeFile(big, buf);
    await fs.writeFile(small, buf);
  }
  return 'ok';
}

async function main() {
  const list = JSON.parse(await fs.readFile(path.join(PUBLIC, 'data', 'awards.json'), 'utf8'));
  await fs.mkdir(OUT, { recursive: true });
  let ok = 0, failed = 0;
  const queue = [...list];
  async function worker() {
    while (queue.length) {
      const a = queue.shift();
      try { const r = await processOne(a); ok++; console.log(`[awards] ${r.padEnd(6)} ${a.slug}`); }
      catch (err) { failed++; console.log(`[awards] FAILED ${a.slug}: ${err.message} (runtime fallback will be used)`); }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  console.log(`[awards] done: ${ok} saved, ${failed} using fallback`);
}

main().catch(err => { console.log('[awards] skipped:', err.message); }).finally(() => process.exit(0));
