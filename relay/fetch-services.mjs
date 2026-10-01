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
  ['consult', 'hf_20260930_115616_a13c4e26-dd7a-438d-bad5-7e3aa80e138c'],
  ['build', 'hf_20260930_115615_bdfe54f5-90b2-4b86-b691-a7282a245737'],
  ['layers', 'hf_20260930_115614_75e1d533-3188-4c58-8fff-b8111dfc17d7'],
  ['run', 'hf_20260930_115615_e5b94f89-7424-4d6c-88e8-80920d36d413'],
  ['erp', 'hf_20260930_115615_49c28cd0-ce8c-482d-9222-59184222d772'],
  ['code', 'hf_20260930_115615_bccc58bd-9460-469f-aace-a57d7ecdb84d'],
  ['web', 'hf_20260930_115615_a7c397fd-30cf-40e6-b1e2-1a05399c2d88'],
];

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

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  let ok = 0, failed = 0;
  await Promise.all(LIST.map(async (item) => {
    try { const r = await processOne(item); ok++; console.log(`[services] ${r.padEnd(6)} ${item[0]}`); }
    catch (err) { failed++; console.log(`[services] FAILED ${item[0]}: ${err.message}`); }
  }));
  console.log(`[services] done: ${ok} saved, ${failed} missing`);
  await fs.mkdir(VIDEO_OUT, { recursive: true });
  await Promise.all(VIDEOS.map(async ([name, id]) => {
    const out = path.join(VIDEO_OUT, name);
    if (await exists(out)) return console.log(`[film] cached ${name}`);
    try { await fs.writeFile(out, await get(FILM + id)); console.log(`[film] ok     ${name}`); }
    catch (err) { console.log(`[film] FAILED ${name}: ${err.message}`); }
  }));
}

main().catch(err => { console.log('[services] skipped:', err.message); }).finally(() => process.exit(0));
