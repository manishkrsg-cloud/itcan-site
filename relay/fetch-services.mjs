// Build step: download the hero card artwork (AI images made for ITCAN with Higgsfield)
// and save web-sized copies to public/assets/services/<slug>-880.webp and <slug>-480.webp,
// then download the one-minute story film (see film/) to public/assets/video/.
// Never fails the build. A card whose image is missing keeps its gradient background;
// a missing film leaves the Watch our story player empty.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'public', 'assets', 'services');
const BASE = 'https://d8j0ntlcm91z4.cloudfront.net/user_2zirxwP6e4obj22XOM5lG6LDlk1/';

const LIST = [
  // the ITCAN i tile placed inside each story (edits of the first set, 1 Oct 2026)
  ['consult-i', 'hf_20261001_041759_991fc9c8-c2b8-4a1d-a33d-ae98c7bd62f9'],
  ['build-i', 'hf_20261001_041754_9ad5d806-02db-41d4-a0b4-197d471936a3'],
  ['layers-i', 'hf_20261001_041754_3832e263-3d07-4965-bcb9-82c79a157ccf'],
  ['run-i', 'hf_20261001_041754_361b312b-ea5a-4c80-853a-1f4a5c35285a'],
  ['erp-i', 'hf_20261001_041755_02501c65-947d-46ac-be09-08eec95235df'],
  ['code-i', 'hf_20261001_041754_9399878d-d67d-404f-ae78-f4de62a6fbab'],
  ['web-i', 'hf_20261001_041754_deb340c7-3171-43f3-94dc-0b65a9da24bf'],
  // light-theme versions (daylight, white glass), used when the site is in light mode
  ['build-l', 'hf_20261001_062651_157af7ba-ddce-4b2c-a71a-fa6e3d8676c6'],
];

// nine practice thumbnails, cut from one 3 x 3 sheet (1024 px, tiles ~316 px with even gaps)
const PRACTICE_SHEET = 'hf_20261001_041754_ffba951e-a93c-44a9-88b3-5534c6470494';
const PRACTICE_OUT = path.join(__dirname, 'public', 'assets', 'practices');
const PRACTICES = ['erp', 'apps', 'os', 'lang', 'rdbms', 'portals', 'web', 'microsoft', 'java'];
const CELL = [17, 353, 689], TILE = 316, INSET = 10;

const VIDEO_OUT = path.join(__dirname, 'public', 'assets', 'video');
const FILM = 'https://d2ol7oe51mr4n9.cloudfront.net/user_2zirxwP6e4obj22XOM5lG6LDlk1/';
const VIDEOS = [
  ['itcan-story-1080.mp4', 'ef0ec47c-2767-48b1-b059-2a9dd15fb8bc.mp4'],
  ['itcan-story-720.mp4', '4f3254d5-1958-4cae-ab3b-adb8649246e6.mp4'],
  ['itcan-story-poster.jpg', 'ec8c90ad-7797-4396-9580-986575a1549c.jpg'],
];

let sharp = null;
try { sharp = (await import('sharp')).default; } catch { console.log('[services] sharp not available, saving originals'); }

async function get(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 90000);
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

async function processOne([slug, id]) {
  const big = path.join(OUT, slug + '-880.webp');
  const small = path.join(OUT, slug + '-480.webp');
  if (await exists(big) && await exists(small)) return 'cached';
  const buf = await get(BASE + id + '.png');
  if (sharp) {
    const base = sharp(buf).flatten({ background: '#07080b' });
    await base.clone().resize({ width: 880, withoutEnlargement: true }).webp({ quality: 74, effort: 5 }).toFile(big);
    await base.clone().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 70, effort: 5 }).toFile(small);
  } else {
    // browsers sniff image bytes, so the PNG still shows under a .webp name
    await fs.writeFile(big, buf);
    await fs.writeFile(small, buf);
  }
  return 'ok';
}

async function practices() {
  await fs.mkdir(PRACTICE_OUT, { recursive: true });
  const outs = PRACTICES.map((n) => path.join(PRACTICE_OUT, n + '.webp'));
  if ((await Promise.all(outs.map(exists))).every(Boolean)) return console.log('[practices] cached');
  if (!sharp) return console.log('[practices] skipped: sharp not available');
  try {
    const sheet = await get(BASE + PRACTICE_SHEET + '.png');
    await Promise.all(PRACTICES.map((n, i) => {
      const left = CELL[i % 3] + INSET, top = CELL[Math.floor(i / 3)] + INSET, size = TILE - INSET * 2;
      return sharp(sheet).extract({ left, top, width: size, height: size }).resize(200, 200).webp({ quality: 80, effort: 5 }).toFile(outs[i]);
    }));
    console.log('[practices] ok     9 thumbnails');
  } catch (err) { console.log('[practices] FAILED:', err.message); }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  let ok = 0, failed = 0;
  await Promise.all(LIST.map(async (item) => {
    try { const r = await processOne(item); ok++; console.log(`[services] ${r.padEnd(6)} ${item[0]}`); }
    catch (err) { failed++; console.log(`[services] FAILED ${item[0]}: ${err.message}`); }
  }));
  console.log(`[services] done: ${ok} saved, ${failed} missing`);
  await practices();
  await fs.mkdir(VIDEO_OUT, { recursive: true });
  await Promise.all(VIDEOS.map(async ([name, id]) => {
    const out = path.join(VIDEO_OUT, name);
    if (await exists(out)) return console.log(`[film] cached ${name}`);
    try { await fs.writeFile(out, await get(FILM + id)); console.log(`[film] ok     ${name}`); }
    catch (err) { console.log(`[film] FAILED ${name}: ${err.message}`); }
  }));
}

main().catch(err => { console.log('[services] skipped:', err.message); }).finally(() => process.exit(0));
