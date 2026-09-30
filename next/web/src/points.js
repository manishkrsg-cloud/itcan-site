// Points of light. 1,200 particles, one for each ITCAN person, that re-form as you
// scroll through the story: the wordmark, the globe, the people, "28", the four services.
import WORLD from "./world.json";
import { OFFICES, unit } from "./globe.js";
import { reduced, fine, clamp } from "./core/engine.js";

const N = 1200;
const K = 5; // shapes: 0 logo, 1 globe, 2 people, 3 "28", 4 services
const D2R = Math.PI / 180;
const COLORS = [
  [236, 240, 250], // 0 white
  [255, 51, 64],   // 1 ITCAN red
  [98, 128, 255],  // 2 ITCAN blue, lifted
  [255, 206, 178], // 3 warm
];
const CHAPTER_GLOW = [[255, 51, 64], [98, 128, 255], [236, 240, 250], [255, 51, 64], [98, 128, 255]];
export const CLUSTERS = [
  { n: 260, color: 0 },
  { n: 300, color: 2 },
  { n: 340, color: 1 },
  { n: 300, color: 3 },
];

// deterministic noise so every visit draws the same shapes
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const R = rng(7);
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outCubic = (t) => 1 - Math.pow(1 - t, 3);

// Sample a drawn bitmap onto a regular grid holding close to N dots.
function sampleBitmap(draw, bw, bh) {
  const c = document.createElement("canvas");
  c.width = bw; c.height = bh;
  const g = c.getContext("2d", { willReadFrequently: true });
  draw(g, bw, bh);
  const d = g.getImageData(0, 0, bw, bh).data;
  const at = (x, y) => (Math.round(y) * bw + Math.round(x)) * 4;
  const grid = (step) => {
    const out = [];
    for (let y = step / 2; y < bh; y += step) for (let x = step / 2; x < bw; x += step) {
      const i = at(x, y);
      if (d[i + 3] > 110) out.push([x / bw, y / bh, d[i] > 170 && d[i + 1] < 140 ? 1 : 0]);
    }
    return out;
  };
  let lo = 0.6, hi = 40, best = grid(4);
  for (let k = 0; k < 22; k++) {
    const mid = (lo + hi) / 2, g2 = grid(mid);
    if (g2.length >= N) { best = g2; lo = mid; } else hi = mid;
  }
  // drop extras at random; top up with near-duplicates if the bitmap is thin
  while (best.length > N) best.splice(Math.floor(R() * best.length), 1);
  while (best.length < N) { const p = best[Math.floor(R() * best.length)] || [0.5, 0.5, 0]; best.push([p[0] + (R() - 0.5) * 0.004, p[1] + (R() - 0.5) * 0.004, p[2]]); }
  return { pts: best, aspect: bw / bh };
}

function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

export function createPoints(stage, opts = {}) {
  const canvas = stage.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const font = "Geist, system-ui, sans-serif";
  const onChapter = opts.onChapter || (() => {});
  const labels = opts.labels || [];

  // per particle constants
  const delay = new Float32Array(N), swirl = new Float32Array(N), phase = new Float32Array(N), freq = new Float32Array(N), amp = new Float32Array(N), size = new Float32Array(N);
  const scatterA = new Float32Array(N), scatterR = new Float32Array(N), introD = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    delay[i] = R() * 0.42; swirl[i] = (R() - 0.5) * 2; phase[i] = R() * Math.PI * 2;
    freq[i] = 0.0006 + R() * 0.0011; amp[i] = 0.4 + R() * 0.9; size[i] = 0.75 + R() * 0.55;
    scatterA[i] = R() * Math.PI * 2; scatterR[i] = 0.55 + R() * 0.7; introD[i] = R() * 0.5;
  }

  // shapes: normalized source points (set once) and laid-out pixel targets (set on resize)
  const src = new Array(K).fill(null);
  const X = Array.from({ length: K }, () => new Float32Array(N));
  const Y = Array.from({ length: K }, () => new Float32Array(N));
  const Z = Array.from({ length: K }, () => new Float32Array(N).fill(1));
  const C = Array.from({ length: K }, () => new Uint8Array(N));
  const S = Array.from({ length: K }, () => new Float32Array(N).fill(1));

  // globe source: 6 offices + land dots on the Asia-facing hemisphere
  const view0 = unit(12, 104);
  const land = [];
  for (let i = 0; i < WORLD.length; i += 2) {
    const v = unit(WORLD[i], WORLD[i + 1]);
    if (v[0] * view0[0] + v[1] * view0[1] + v[2] * view0[2] > 0.08) land.push(v);
  }
  const globeV = [];
  const officeSlots = [];
  OFFICES.forEach((o) => globeV.push({ v: unit(o.lat, o.lon), office: o }));
  const stepL = land.length / (N - OFFICES.length);
  for (let j = 0; globeV.length < N; j++) globeV.push({ v: land[Math.min(land.length - 1, Math.floor(j * stepL))] });
  let lon0 = 104, lat0 = 12;
  const viewV = (v) => {
    const l = lon0 * D2R, p = lat0 * D2R;
    const x1 = v[0] * Math.sin(l) - v[2] * Math.cos(l), z1 = v[0] * Math.cos(l) + v[2] * Math.sin(l), y1 = v[1];
    return [-x1, y1 * Math.cos(p) - z1 * Math.sin(p), y1 * Math.sin(p) + z1 * Math.cos(p)];
  };
  // order the globe by screen x at the rest pose, so particles sweep in from the side
  globeV.sort((a, b) => viewV(a.v)[0] - viewV(b.v)[0]);
  globeV.forEach((g, i) => { if (g.office) officeSlots.push({ i, o: g.office }); C[1][i] = g.office ? 1 : 0; S[1][i] = g.office ? (g.office.hq ? 3.2 : 2.4) : 1; });
  const arcs = OFFICES.slice(1).map((o) => {
    const a = unit(OFFICES[0].lat, OFFICES[0].lon), b = unit(o.lat, o.lon);
    const d = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const pts = [];
    for (let k = 0; k <= 40; k++) {
      const t = k / 40, w = Math.sin(d), ka = Math.sin((1 - t) * d) / w, kb = Math.sin(t * d) / w, h = 1 + (0.05 + d * 0.22) * Math.sin(Math.PI * t);
      pts.push([(a[0] * ka + b[0] * kb) * h, (a[1] * ka + b[1] * kb) * h, (a[2] * ka + b[2] * kb) * h]);
    }
    return pts;
  });

  // layout state
  let w = 1, h = 1, dpr = 1, mobile = false, base = 1.3;
  let gx = 0, gy = 0, gR = 1; // globe centre and radius
  const clusterBox = [];

  function sortInto(k, pts) {
    // pts: [x, y, colour, size]; order by x with a little noise so the sweep is not a hard wipe
    const idx = pts.map((p, i) => [p[0] + (R() - 0.5) * (w * 0.04), i]).sort((a, b) => a[0] - b[0]);
    idx.forEach(([, j], i) => { const p = pts[j]; X[k][i] = p[0]; Y[k][i] = p[1]; C[k][i] = p[2]; S[k][i] = p[3] || 1; });
  }

  function layoutBitmap(k, box, colourOf) {
    const s = src[k];
    if (!s) return;
    let bw = box.w, bh = bw / s.aspect;
    if (bh > box.h) { bh = box.h; bw = bh * s.aspect; }
    const x0 = box.x - bw / 2, y0 = box.y - bh / 2;
    sortInto(k, s.pts.map((p) => [x0 + p[0] * bw, y0 + p[1] * bh, colourOf(p), 1]));
  }

  function layout() {
    mobile = w < 900;
    base = clamp(Math.min(w, h * 1.4) / 900, 0.85, 1.45);
    // 0 wordmark
    layoutBitmap(0, mobile ? { x: w / 2, y: h * 0.33, w: w * 0.8, h: h * 0.22 } : { x: w / 2, y: h * 0.36, w: Math.min(w * 0.6, 980), h: h * 0.3 }, (p) => p[2]);
    // 1 globe (positions are live; only the frame is set here)
    if (mobile) { gx = w / 2; gy = h * 0.34; gR = Math.min(w * 0.4, h * 0.22); }
    else { gx = w * 0.66; gy = h * 0.52; gR = Math.min(h * 0.36, w * 0.25); }
    // 2 people: one dot per person on a loose grid
    {
      const box = mobile ? { x: w * 0.08, y: h * 0.12, w: w * 0.84, h: h * 0.46 } : { x: w * 0.44, y: h * 0.17, w: w * 0.44, h: h * 0.66 };
      const cols = Math.round(Math.sqrt((N * box.w) / box.h)), rows = Math.ceil(N / cols);
      const sx = box.w / (cols - 1), sy = box.h / (rows - 1);
      const pts = [];
      for (let i = 0; i < N; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        pts.push([box.x + c * sx + (R() - 0.5) * sx * 0.35, box.y + r * sy + (R() - 0.5) * sy * 0.35, 0, 0.8]);
      }
      sortInto(2, pts);
    }
    // 3 the number 28
    layoutBitmap(3, mobile ? { x: w / 2, y: h * 0.33, w: w * 0.78, h: h * 0.34 } : { x: w * 0.68, y: h * 0.5, w: w * 0.42, h: h * 0.6 }, () => 1);
    // 4 four service clusters
    {
      clusterBox.length = 0;
      const pts = [];
      const cells = mobile
        ? [[0.3, 0.2], [0.7, 0.2], [0.3, 0.47], [0.7, 0.47]].map(([a, b]) => [a * w, b * h])
        : [0.17, 0.39, 0.61, 0.83].map((a) => [a * w, h * 0.4]);
      const maxR = mobile ? Math.min(w * 0.17, h * 0.1) : Math.min(w * 0.085, h * 0.17);
      CLUSTERS.forEach((cl, k) => {
        const r = maxR * Math.sqrt(cl.n / 340);
        const [cx, cy] = cells[k];
        clusterBox.push({ x: cx, y: cy, r });
        for (let j = 0; j < cl.n; j++) {
          const rr = r * Math.sqrt((j + 0.5) / cl.n), th = j * 2.399963;
          pts.push([cx + Math.cos(th) * rr, cy + Math.sin(th) * rr, cl.color, j < 3 ? 1.8 : 1]);
        }
      });
      sortInto(4, pts);
    }
    placeLabels();
  }

  function placeLabels() {
    labels.forEach((el, k) => {
      const b = clusterBox[k];
      if (!b || !el) return;
      const maxR = Math.max(...clusterBox.map((c) => c.r));
      el.style.transform = `translate(${b.x}px, ${b.y + maxR + (mobile ? 10 : 24)}px) translateX(-50%)`;
    });
  }

  function globeFrame(t) {
    if (!reduced) { lon0 = 104 + 18 * Math.sin(t / 9000); lat0 = 11 + 4 * Math.sin(t / 13000); }
    for (let i = 0; i < N; i++) {
      const p = viewV(globeV[i].v);
      X[1][i] = gx + p[0] * gR; Y[1][i] = gy - p[1] * gR; Z[1][i] = p[2];
    }
  }

  // sprites: one soft dot per colour, drawn additively
  const sprites = COLORS.map(([r, g, b]) => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(255,255,255,1)`);
    gr.addColorStop(0.1, `rgba(${r},${g},${b},1)`);
    gr.addColorStop(0.28, `rgba(${r},${g},${b},0.42)`);
    gr.addColorStop(0.6, `rgba(${r},${g},${b},0.08)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return c;
  });

  // input
  let mx = -9999, my = -9999, pmx = -9999, pmy = -9999;
  if (fine && !reduced) {
    stage.addEventListener("pointermove", (e) => { const r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    stage.addEventListener("pointerleave", () => { mx = my = -9999; });
  }

  // twinkles for the people chapter
  const twinkles = [];
  let nextTwinkle = 0;

  let cur = 0, target = 0, intro = reduced ? 1 : 0, introStart = 0, ready = false, running = false, raf = 0, last = 0, lastCh = -1;

  function resize() {
    const r = canvas.getBoundingClientRect();
    // soft glowing dots gain nothing from a full retina buffer; 1.5x keeps them crisp for less work
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    if (ready) { layout(); draw(performance.now()); }
  }

  function setProgress(p) { target = clamp(p) * (K - 1); }

  function draw(now) {
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    cur = reduced ? target : cur + (target - cur) * (1 - Math.exp(-dt / 110));
    if (Math.abs(target - cur) < 0.0005) cur = target;
    if (!reduced && intro < 1) intro = clamp((now - introStart) / 2600);

    const k = Math.min(K - 2, Math.floor(cur));
    const frac = cur - k;
    const f = reduced ? (frac < 0.5 ? 0 : 1) : clamp((frac - 0.16) / 0.68);
    const ch = Math.round(cur);
    if (ch !== lastCh) { lastCh = ch; onChapter(ch); }
    if (k === 1 || k + 1 === 1) globeFrame(now);
    const gW = k === 1 ? 1 - f : k === 0 ? f : 0; // globe weight
    const pW = k === 2 ? 1 - f : k === 1 ? f : 0; // people weight

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // chapter glow behind the shape
    {
      const a = CHAPTER_GLOW[k], b = CHAPTER_GLOW[k + 1];
      const col = a.map((v, i) => Math.round(v + (b[i] - v) * f));
      const centres = mobile ? [[0.5, 0.34], [0.5, 0.34], [0.5, 0.34], [0.5, 0.33], [0.5, 0.34]] : [[0.5, 0.42], [0.66, 0.52], [0.69, 0.5], [0.68, 0.5], [0.5, 0.42]];
      const cx = (centres[k][0] + (centres[k + 1][0] - centres[k][0]) * f) * w, cy = (centres[k][1] + (centres[k + 1][1] - centres[k][1]) * f) * h;
      const rr = Math.max(w, h) * 0.55;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
      g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${(0.1 * intro).toFixed(3)})`);
      g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }

    // globe sphere, rim and arcs sit under the dots
    if (gW > 0.01) drawGlobeBody(gW, now);

    // pointer, smoothed
    if (mx > -9000) { pmx = pmx < -9000 ? mx : pmx + (mx - pmx) * 0.18; pmy = pmy < -9000 ? my : pmy + (my - pmy) * 0.18; } else { pmx = pmy = -9999; }
    const repR = 110 * base, repR2 = repR * repR;

    ctx.globalCompositeOperation = "lighter";
    const XA = X[k], YA = Y[k], ZA = Z[k], CA = C[k], SA = S[k];
    const XB = X[k + 1], YB = Y[k + 1], ZB = Z[k + 1], CB = C[k + 1], SB = S[k + 1];
    const cxs = w / 2, cys = h * 0.42, far = Math.max(w, h);
    for (let i = 0; i < N; i++) {
      let fi = f <= 0 ? 0 : f >= 1 ? 1 : clamp(f * 1.42 - delay[i]);
      const e = inOut(fi);
      let x = XA[i] + (XB[i] - XA[i]) * e;
      let y = YA[i] + (YB[i] - YA[i]) * e;
      if (e > 0 && e < 1) {
        // travel on a curve, not a straight line
        const dx = XB[i] - XA[i], dy = YB[i] - YA[i], s = Math.sin(Math.PI * e) * 0.22 * swirl[i];
        x += -dy * s; y += dx * s;
      }
      let z = ZA[i] + (ZB[i] - ZA[i]) * e;
      // globe backside fades out
      let a = z < 0.04 ? 0 : z >= 0.35 ? 1 : (z - 0.04) / 0.31;
      if (!reduced) {
        const wob = amp[i] * (1 + pW * 1.4);
        x += Math.sin(now * freq[i] + phase[i]) * wob;
        y += Math.cos(now * freq[i] * 0.8 + phase[i]) * wob;
        if (pmx > -9000) {
          const ddx = x - pmx, ddy = y - pmy, d2 = ddx * ddx + ddy * ddy;
          if (d2 < repR2 && d2 > 0.01) { const d = Math.sqrt(d2), push = (1 - d / repR) ** 2 * 28 * base; x += (ddx / d) * push; y += (ddy / d) * push; }
        }
      }
      if (intro < 1) {
        const ii = outCubic(clamp(intro * 1.5 - introD[i]));
        const sx = cxs + Math.cos(scatterA[i]) * scatterR[i] * far, sy = cys + Math.sin(scatterA[i]) * scatterR[i] * far * 0.7;
        x = sx + (x - sx) * ii; y = sy + (y - sy) * ii; a *= ii;
      }
      if (a <= 0.01) continue;
      const sz = (SA[i] + (SB[i] - SA[i]) * e) * size[i] * base * (0.72 + 0.28 * Math.max(0, Math.min(1, z))) * 11;
      const ca = CA[i], cb = CB[i];
      if (ca === cb || e <= 0 || e >= 1) {
        ctx.globalAlpha = a * 0.95;
        ctx.drawImage(sprites[e >= 1 ? cb : ca], x - sz / 2, y - sz / 2, sz, sz);
      } else {
        ctx.globalAlpha = a * 0.95 * (1 - e);
        ctx.drawImage(sprites[ca], x - sz / 2, y - sz / 2, sz, sz);
        ctx.globalAlpha = a * 0.95 * e;
        ctx.drawImage(sprites[cb], x - sz / 2, y - sz / 2, sz, sz);
      }
    }
    ctx.globalAlpha = 1;

    // people chapter: a few people light up at a time
    if (pW > 0.3 && !reduced) {
      if (now > nextTwinkle) { twinkles.push({ i: Math.floor(R() * N), t: now }); nextTwinkle = now + 160; }
      for (let j = twinkles.length - 1; j >= 0; j--) {
        const tw = twinkles[j], q = (now - tw.t) / 1400;
        if (q >= 1) { twinkles.splice(j, 1); continue; }
        const x = X[2][tw.i], y = Y[2][tw.i];
        const sz = 30 * base * (0.6 + q);
        ctx.globalAlpha = (1 - q) * pW * 0.9;
        ctx.drawImage(sprites[1], x - sz / 2, y - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = "source-over";

    if (gW > 0.4) drawOfficeLabels((gW - 0.4) / 0.6);
    // service labels ride along with the clusters
    const lw = k === 3 ? f : k === 4 ? 1 : 0;
    labels.forEach((el) => { if (el) { el.style.opacity = lw >= 0.999 ? "1" : Math.max(0, (lw - 0.5) * 2).toFixed(3); } });
  }

  function project(v) { const p = viewV(v); return [gx + p[0] * gR, gy - p[1] * gR, p[2]]; }

  function drawGlobeBody(a, now) {
    ctx.globalAlpha = a;
    const body = ctx.createRadialGradient(gx - gR * 0.35, gy - gR * 0.4, gR * 0.1, gx, gy, gR);
    body.addColorStop(0, "rgba(34,40,72,0.55)");
    body.addColorStop(1, "rgba(6,8,18,0.7)");
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(gx, gy, gR, 0, Math.PI * 2); ctx.fill();
    const rim = ctx.createLinearGradient(gx - gR, gy - gR, gx + gR, gy + gR);
    rim.addColorStop(0, "rgba(190,200,255,0.4)"); rim.addColorStop(0.5, "rgba(160,176,255,0.1)"); rim.addColorStop(1, "rgba(255,51,64,0.35)");
    ctx.strokeStyle = rim; ctx.lineWidth = 1; ctx.stroke();
    // arcs from Singapore with a packet each
    ctx.lineCap = "round";
    arcs.forEach((pts, j) => {
      let prev = null;
      ctx.lineWidth = 1.4;
      for (let q = 0; q < pts.length; q++) {
        const p = project(pts[q]);
        if (prev && p[2] > -0.02 && prev[2] > -0.02) {
          const t = q / (pts.length - 1);
          ctx.strokeStyle = `rgba(255,${Math.round(70 + 90 * t)},${Math.round(80 + 70 * t)},${(0.3 + 0.5 * Math.sin(Math.PI * t)).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        }
        prev = p;
      }
      if (!reduced) {
        const u = (now / 2400 + j * 0.21) % 1, idx = u * (pts.length - 1), q = Math.floor(idx), fr = idx - q;
        const A = pts[q], B = pts[Math.min(pts.length - 1, q + 1)];
        const p = project([A[0] + (B[0] - A[0]) * fr, A[1] + (B[1] - A[1]) * fr, A[2] + (B[2] - A[2]) * fr]);
        if (p[2] > 0) { const sz = 16; ctx.globalCompositeOperation = "lighter"; ctx.drawImage(sprites[1], p[0] - sz / 2, p[1] - sz / 2, sz, sz); ctx.globalCompositeOperation = "source-over"; }
      }
    });
    ctx.globalAlpha = 1;
  }

  function drawOfficeLabels(a) {
    const fs = Math.round(clamp(gR / 14, 11, 14));
    ctx.font = `500 ${fs}px ${font}`;
    ctx.textBaseline = "middle";
    officeSlots.forEach(({ o }) => {
      const p = project(unit(o.lat, o.lon));
      if (p[2] < 0.1) return;
      const sx = p[0], sy = p[1];
      const k = mobile ? 0.8 : 1;
      const lx = sx + o.lx * k * (o.hq ? 1.1 : 1), ly = sy + o.ly * k;
      ctx.globalAlpha = a;
      ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx + Math.sign(o.lx) * 4, sy + Math.sign(o.ly) * 3); ctx.lineTo(lx, ly); ctx.stroke();
      const tw = ctx.measureText(o.name).width, px = 7, bh = fs + 8;
      const bx = o.lx < 0 ? lx - tw - px * 2 : lx, by = ly - bh / 2;
      ctx.fillStyle = "rgba(8,9,14,0.84)";
      rr(bx, by, tw + px * 2, bh, 6); ctx.fill();
      ctx.strokeStyle = o.hq ? "rgba(255,51,64,0.65)" : "rgba(255,255,255,0.14)"; ctx.stroke();
      ctx.fillStyle = o.hq ? "#fff" : "rgba(236,239,246,0.94)";
      ctx.fillText(o.name, bx + px, ly + 0.5);
    });
    ctx.globalAlpha = 1;
  }
  function rr(x, y, ww, hh, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + ww, y, x + ww, y + hh, r); ctx.arcTo(x + ww, y + hh, x, y + hh, r); ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + ww, y, r); ctx.closePath(); }

  function frame(now) {
    raf = 0;
    draw(now);
    if (running) raf = requestAnimationFrame(frame);
  }

  async function init() {
    try { await Promise.race([document.fonts && document.fonts.load(`700 200px ${font}`), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* fall back to system face */ }
    let logo = null;
    try { logo = await loadImage("/assets/brand/itcan-logo-dark-480.png"); } catch (e) { logo = null; }
    src[0] = logo
      ? sampleBitmap((g, bw, bh) => g.drawImage(logo, 0, 0, bw, bh), 960, Math.round((960 * logo.naturalHeight) / logo.naturalWidth))
      : sampleBitmap((g, bw, bh) => { g.font = `700 ${bh * 0.9}px ${font}`; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText("iT", 0, bh / 2); g.fillStyle = "#ff3340"; g.fillText("CAN", g.measureText("iT").width, bh / 2); }, 960, 360);
    src[3] = sampleBitmap((g, bw, bh) => {
      g.font = `700 ${Math.round(bh * 1.02)}px ${font}`;
      g.textAlign = "center"; g.textBaseline = "alphabetic";
      g.fillStyle = "#ff3340";
      try { g.letterSpacing = `${-bh * 0.05}px`; } catch (e) { /* older engines */ }
      g.fillText("28", bw / 2, bh * 0.86);
    }, 720, 560);
    ready = true;
    resize();
    introStart = performance.now();
    stage.classList.add("is-ready");
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  init();

  return {
    setProgress,
    start() { if (running) return; running = true; last = 0; if (ready) raf = requestAnimationFrame(frame); else { const wait = () => (ready ? (raf = requestAnimationFrame(frame)) : setTimeout(wait, 50)); wait(); } },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; },
    get chapter() { return cur; },
    get intro() { return intro; },
    get ready() { return ready; },
    resize,
  };
}
