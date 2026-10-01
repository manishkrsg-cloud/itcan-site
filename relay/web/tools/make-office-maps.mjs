// Builds the dot-matrix map headers for the six office cards from Natural Earth land data.
// Output: html/of-map-<id>.html partials (inline SVG, themed through CSS).
// Needs: npm i --no-save world-atlas@2 topojson-client@3 d3-geo@3  (set MAPS_NODE_MODULES if installed elsewhere)
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const req = createRequire(join(process.env.MAPS_NODE_MODULES || join(here, "..", "node_modules"), "x.js"));
const { feature } = req("topojson-client");
const { geoContains } = req("d3-geo");
const land = feature(JSON.parse(readFileSync(req.resolve("world-atlas/land-50m.json"), "utf8")), "land");

const W = 480, H = 176, P = 10; // viewBox and dot pitch
const OFFICES = [
  { id: "sg", lat: 1.2797, lon: 103.849, span: 20, hq: true },
  { id: "my", lat: 3.118, lon: 101.677, span: 20 },
  { id: "au", lat: -33.873, lon: 151.094, span: 26 },
  { id: "hk", lat: 22.305, lon: 114.189, span: 20 },
  { id: "in", lat: 28.63, lon: 77.225, span: 30 },
  { id: "id", lat: -6.188, lon: 106.823, span: 22 },
];
const PX = 0.5, PY = 0.56; // where the office sits in the frame

for (const o of OFFICES) {
  const k = Math.cos((o.lat * Math.PI) / 180);
  const degPerPx = o.span / W; // longitude degrees per px, scaled by cos(lat) on y
  const toGeo = (x, y) => [o.lon + (x - W * PX) * degPerPx, o.lat - ((y - H * PY) * degPerPx) * k];
  const toXY = (lon, lat) => [W * PX + (lon - o.lon) / degPerPx, H * PY - (lat - o.lat) / degPerPx / k];
  let d = "";
  for (let y = P / 2; y < H; y += P) {
    for (let x = P / 2; x < W; x += P) {
      if (geoContains(land, toGeo(x, y))) d += `M${x} ${y}h0`;
    }
  }
  // the other offices in view show as quiet rings
  const near = OFFICES.filter((q) => q !== o).map((q) => toXY(q.lon, q.lat)).filter(([x, y]) => x > 8 && x < W - 8 && y > 8 && y < H - 8);
  const rings = near.map(([x, y]) => `<circle class="of-near" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>`).join("");
  const [cx, cy] = toXY(o.lon, o.lat);
  const svg = `<svg class="of-mapsvg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">`
    + `<defs><pattern id="ofp-${o.id}" width="${P}" height="${P}" patternUnits="userSpaceOnUse"><circle cx="${P / 2}" cy="${P / 2}" r="1" class="of-sea"/></pattern></defs>`
    + `<rect width="${W}" height="${H}" fill="url(#ofp-${o.id})"/>`
    + `<path class="of-land" d="${d}"/>${rings}`
    + `</svg>`;
  // the pin is HTML so its ping runs on the compositor; the band keeps the map's aspect ratio,
  // so percentages land exactly on the city
  const at = `left:${((cx / W) * 100).toFixed(2)}%;top:${((cy / H) * 100).toFixed(2)}%`;
  const pin = o.hq
    ? `<span class="of-pin hq" style="${at}"><span class="mark mark--lit"><svg><use href="#g-i"/></svg></span></span>`
    : `<span class="of-pin" style="${at}"></span>`;
  writeFileSync(join(here, "..", "html", `of-map-${o.id}.html`), svg + pin + "\n");
  console.log(o.id, d.length, "bytes of land,", near.length, "near");
}
