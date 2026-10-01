// Capture every graphic frame of the ITCAN story film from scenes.html.
// node render.mjs  ->  frames/<scene>/00001.(jpg|png)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || "playwright");
import fs from "node:fs";
const FPS = 30;
// [scene, seconds, transparent overlay?]
const PLAN = [["s1", 7.3, true], ["s2", 7.3, true], ["s3", 6.4], ["s4", 6.0], ["s5", 7.0], ["s6", 7.3, true], ["s7a", 4.6], ["s7b", 4.6], ["s8", 9.5]];
const browser = await chromium.launch();
async function job(list) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto("file://" + process.cwd() + "/scenes.html");
  await page.evaluate(() => window.ready());
  for (const [id, dur, clear] of list) {
    fs.mkdirSync(`frames/${id}`, { recursive: true });
    const n = Math.round(dur * FPS);
    for (let f = 0; f < n; f++) {
      await page.evaluate(([s, t, d]) => window.setFrame(s, t, d), [id, f / FPS, dur]);
      const name = `frames/${id}/${String(f + 1).padStart(5, "0")}.${clear ? "png" : "jpg"}`;
      await page.screenshot(clear ? { path: name, omitBackground: true } : { path: name, type: "jpeg", quality: 92 });
    }
    console.log("done", id, n);
  }
}
// three pages in parallel, balanced by frame count
const lanes = [[], [], []], load = [0, 0, 0];
[...PLAN].sort((a, b) => b[1] - a[1]).forEach((p) => { const i = load.indexOf(Math.min(...load)); lanes[i].push(p); load[i] += p[1]; });
await Promise.all(lanes.map(job));
await browser.close();
