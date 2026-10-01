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
  // hero cards: editorial photographs in the site palette (1 Oct 2026), dark set and daylight set
  ['consult-p', 'hf_20261001_100000_6eb9b453-a1df-416a-bb88-9e6828dd98c3'],
  ['staff-p', 'hf_20261001_100000_84c6025f-39c6-474d-b999-b4c42ba08cad'],
  ['build-p', 'hf_20261001_095959_60e9c541-1f9f-4a27-b6fe-e0bd9ca67e70'],
  ['layers-p', 'hf_20261001_100000_0a590443-b16e-4da8-b465-25902ea0f01d'],
  ['run-p', 'hf_20261001_095959_162d540e-16d6-4cc3-91e2-322407751744'],
  ['erp-p', 'hf_20261001_100000_7de473b1-d3f4-4df3-aee2-2b091731df60'],
  ['code-p', 'hf_20261001_100000_f0393d50-844d-4c63-8cb3-20e6e9735bdf'],
  ['web-p', 'hf_20261001_100000_de1eb8c1-0a50-4e53-ad45-2ed41ab4eea0'],
  ['consult-pl', 'hf_20261001_100000_e4b96840-4da8-4e51-b24f-9906da3d770d'],
  ['staff-pl', 'hf_20261001_100000_3964e8b3-edf1-4c21-bfa9-2177c790fe00'],
  ['build-pl', 'hf_20261001_100000_d4e7dee4-90b1-4f73-a617-e2d1924d34b6'],
  ['layers-pl', 'hf_20261001_100000_72b5c4b6-a0c1-42a1-9618-d2cb2b82c4d2'],
  ['run-pl', 'hf_20261001_100004_9274eb9f-d5ab-4988-9c1f-2d0ffc3c95b1'],
  ['erp-pl', 'hf_20261001_100004_a5e322ff-53c0-488b-8153-6cb249be96aa'],
  ['code-pl', 'hf_20261001_100004_2a560510-5494-4445-b33d-b40259c9beb0'],
  ['web-pl', 'hf_20261001_100004_f9c4e3f5-660e-4e61-9a78-5de682c4a5d0'],
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
  ['consult-l', 'hf_20261001_072236_f699e743-c822-4c92-b67f-f61487b51011'],
  ['layers-l', 'hf_20261001_072247_4c0ee9b9-9d4c-47c3-aad8-6335a1849796'],
  ['run-l', 'hf_20261001_072236_4ccb54d6-16f7-4556-9ffd-107fa3c4f102'],
  ['erp-l', 'hf_20261001_072237_56a93b13-c4b6-4820-a383-9a077de3979e'],
  ['code-l', 'hf_20261001_072238_194b8a86-3f8e-4e5f-95fc-722608a60b50'],
  ['web-l', 'hf_20261001_072236_206a5004-a854-49b0-80ff-a02e48f66294'],
  ['staff-l', 'hf_20261001_073915_f0327507-0499-4611-a029-2f6e1c26fb52'],
  // the ten sector photographs (Sectors section)
  ['sec-bank', 'hf_20261001_095436_c004368b-eeb9-4ce8-861b-db5b3b6da1bb'],
  ['sec-insure', 'hf_20261001_095435_3f2745bd-765e-4bcc-915e-f7a8d926e005'],
  ['sec-gov', 'hf_20261001_095435_8572aa65-3a27-4290-9232-7e8dff69f2bb'],
  ['sec-edu', 'hf_20261001_095435_6f80946e-a2cf-4fcc-9d29-0266af3e3fcb'],
  ['sec-telco', 'hf_20261001_095436_ff167cc8-f380-490a-89bc-4dec6690972c'],
  ['sec-health', 'hf_20261001_095435_17a6dc9e-362c-423b-970c-a21e83c8cf10'],
  ['sec-logi', 'hf_20261001_095436_e3ee6ca6-1139-4a81-b2c4-1ec03e81fadb'],
  ['sec-mfg', 'hf_20261001_095435_231b7886-677f-4a40-84c2-5463d2803e49'],
  ['sec-energy', 'hf_20261001_095435_543af290-9139-4fea-a49a-f9a5ae7849c1'],
  ['sec-tech', 'hf_20261001_095435_267fa85f-97a0-41fd-bb85-9d76894220a9'],
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
