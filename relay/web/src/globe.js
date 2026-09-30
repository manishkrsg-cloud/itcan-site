// A blue 3D globe on a 2D canvas: lit ocean, shaded land, a blue atmosphere, ITCAN offices as glowing pins,
// arcs from Singapore HQ with travelling packets. Drag to spin, eases back to Asia.
import WORLD from "./world.json";

const D2R = Math.PI / 180;
export const OFFICES = [
  { id: "sg", name: "Singapore HQ", lat: 1.28, lon: 103.85, tz: "Asia/Singapore", hq: true, lx: 24, ly: 12 },
  { id: "kl", name: "Kuala Lumpur", lat: 3.14, lon: 101.69, tz: "Asia/Kuala_Lumpur", lx: -22, ly: -30 },
  { id: "jk", name: "Jakarta", lat: -6.2, lon: 106.85, tz: "Asia/Jakarta", lx: -18, ly: 30 },
  { id: "hk", name: "Hong Kong", lat: 22.32, lon: 114.17, tz: "Asia/Hong_Kong", lx: 18, ly: -18 },
  { id: "dl", name: "New Delhi", lat: 28.61, lon: 77.21, tz: "Asia/Kolkata", lx: -18, ly: -16 },
  { id: "sy", name: "Sydney", lat: -33.87, lon: 151.21, tz: "Australia/Sydney", lx: 16, ly: 16 },
];

// light from the upper left, toward the viewer (view space: x right, y up, z out)
const LIGHT = (() => { const v = [-0.45, 0.5, 0.74], n = Math.hypot(...v); return v.map((c) => c / n); })();

const unit = (lat, lon) => [Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.sin(lat * D2R), Math.cos(lat * D2R) * Math.sin(lon * D2R)];

function slerp(a, b, t) {
  const d = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const w = Math.acos(d);
  if (w < 1e-6) return a.slice();
  const s = Math.sin(w), ka = Math.sin((1 - t) * w) / s, kb = Math.sin(t * w) / s;
  return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
}

// meridians every 30 degrees, parallels every 30 degrees
const GRID = [];
for (let lon = -180; lon < 180; lon += 30) { const l = []; for (let lat = -84; lat <= 84; lat += 4) l.push(unit(lat, lon)); GRID.push(l); }
for (let lat = -60; lat <= 60; lat += 30) { const l = []; for (let lon = -180; lon <= 180; lon += 4) l.push(unit(lat, lon)); GRID.push(l); }

export function createGlobe(canvas, opts = {}) {
  const ctx = canvas.getContext("2d");
  const reduced = !!opts.reduced;
  const font = opts.font || "Geist, system-ui, sans-serif";
  const land = [];
  for (let i = 0; i < WORLD.length; i += 2) land.push(unit(WORLD[i], WORLD[i + 1]));
  const offices = OFFICES.map((o) => ({ ...o, v: unit(o.lat, o.lon) }));
  const hq = offices[0];
  const arcs = offices.slice(1).map((o) => {
    const pts = [];
    const d = Math.acos(Math.min(1, hq.v[0] * o.v[0] + hq.v[1] * o.v[1] + hq.v[2] * o.v[2]));
    const lift = 0.06 + d * 0.22;
    for (let i = 0; i <= 48; i++) {
      const t = i / 48, p = slerp(hq.v, o.v, t), h = 1 + lift * Math.sin(Math.PI * t);
      pts.push([p[0] * h, p[1] * h, p[2] * h]);
    }
    return { to: o, pts };
  });

  let w = 1, h = 1, dpr = 1, R = 1, cx = 0, cy = 0, glowR = 1;
  let lon0 = opts.lon ?? 104, lat0 = opts.lat ?? 12;
  let vx = 0, vy = 0, drag = null, lastInteract = -1e9;
  let raf = 0, running = false, t0 = performance.now();
  const target = opts.target || null;

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    R = Math.min(w * 0.44, h * 0.43);
    cx = w / 2; cy = h / 2 + (opts.offsetY || 0) * h;
    // the halo must fit inside the canvas, or its edge shows as a box
    glowR = Math.min(R * 1.32, cy, h - cy, cx, w - cx);
    draw(performance.now());
  }

  // rotate world vector into view space (z toward viewer)
  function view(v) {
    const l = lon0 * D2R, p = lat0 * D2R;
    // yaw so lon0 faces the viewer
    const x1 = v[0] * Math.sin(l) - v[2] * Math.cos(l);
    const z1 = v[0] * Math.cos(l) + v[2] * Math.sin(l);
    const y1 = v[1];
    // pitch so lat0 faces the viewer
    const y2 = y1 * Math.cos(p) - z1 * Math.sin(p);
    const z2 = y1 * Math.sin(p) + z1 * Math.cos(p);
    return [-x1, y2, z2];
  }

  function draw(now) {
    const t = now - t0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // blue atmosphere around the planet
    const glow = ctx.createRadialGradient(cx, cy, R * 0.94, cx, cy, glowR);
    glow.addColorStop(0, "rgba(90,165,255,0.42)");
    glow.addColorStop(0.18, "rgba(70,140,255,0.2)");
    glow.addColorStop(0.55, "rgba(60,110,255,0.06)");
    glow.addColorStop(1, "rgba(60,110,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2); ctx.fill();

    // ocean, lit from the upper left
    const lx = cx - R * 0.38, ly = cy - R * 0.42;
    const ocean = ctx.createRadialGradient(lx, ly, R * 0.05, cx, cy, R);
    ocean.addColorStop(0, "#3f86e0");
    ocean.addColorStop(0.3, "#1f5bb4");
    ocean.addColorStop(0.62, "#10357a");
    ocean.addColorStop(0.88, "#0a2253");
    ocean.addColorStop(1, "#071a42");
    ctx.fillStyle = ocean;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

    // faint graticule on the near side, for a sense of a turning sphere
    ctx.lineWidth = 0.75;
    ctx.strokeStyle = "rgba(170,210,255,0.08)";
    ctx.beginPath();
    for (const line of GRID) {
      let on = false;
      for (const v of line) {
        const p = view(v);
        if (p[2] > 0) { const x = cx + p[0] * R, y = cy - p[1] * R; if (on) ctx.lineTo(x, y); else ctx.moveTo(x, y); on = true; }
        else on = false;
      }
    }
    ctx.stroke();

    // land: soft overlapping discs shaded by the light, then a fine dot texture on top
    const buckets = [[], [], [], [], [], []];
    for (const v of land) {
      const p = view(v);
      if (p[2] <= 0.01) continue;
      const lit = Math.max(0, p[0] * LIGHT[0] + p[1] * LIGHT[1] + p[2] * LIGHT[2]);
      const b = Math.min(5, Math.floor(lit * 6));
      buckets[b].push(cx + p[0] * R, cy - p[1] * R);
    }
    const landR = Math.max(2.2, R * 0.0165), dotR = Math.max(0.7, R / 210);
    buckets.forEach((pts, b) => {
      if (!pts.length) return;
      const k = (b + 0.5) / 6;
      ctx.fillStyle = `rgb(${Math.round(38 + 118 * k)},${Math.round(84 + 124 * k)},${Math.round(140 + 105 * k)})`;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 2) { ctx.moveTo(pts[i] + landR, pts[i + 1]); ctx.arc(pts[i], pts[i + 1], landR, 0, Math.PI * 2); }
      ctx.fill();
      ctx.fillStyle = `rgba(225,240,255,${(0.12 + 0.4 * k).toFixed(3)})`;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 2) { ctx.moveTo(pts[i] + dotR, pts[i + 1]); ctx.arc(pts[i], pts[i + 1], dotR, 0, Math.PI * 2); }
      ctx.fill();
    });

    // night side: the lower right falls into shadow
    const night = ctx.createRadialGradient(cx + R * 0.7, cy + R * 0.75, R * 0.1, cx + R * 0.35, cy + R * 0.4, R * 1.35);
    night.addColorStop(0, "rgba(2,6,20,0.7)");
    night.addColorStop(0.55, "rgba(2,6,20,0.35)");
    night.addColorStop(1, "rgba(2,6,20,0)");
    ctx.fillStyle = night;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    // sun glint on the ocean and a soft limb darkening
    const glint = ctx.createRadialGradient(lx, ly, 0, lx, ly, R * 0.55);
    glint.addColorStop(0, "rgba(200,230,255,0.22)");
    glint.addColorStop(1, "rgba(200,230,255,0)");
    ctx.fillStyle = glint;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    const limb = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R);
    limb.addColorStop(0, "rgba(4,10,30,0)");
    limb.addColorStop(1, "rgba(4,10,30,0.45)");
    ctx.fillStyle = limb;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    // thin bright atmosphere edge on the lit side
    const rim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    rim.addColorStop(0, "rgba(170,215,255,0.85)");
    rim.addColorStop(0.45, "rgba(110,170,255,0.35)");
    rim.addColorStop(1, "rgba(80,120,255,0.08)");
    ctx.strokeStyle = rim;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2); ctx.stroke();

    // arcs from HQ with a travelling packet each
    ctx.lineCap = "round";
    arcs.forEach((a, i) => {
      let prev = null;
      ctx.lineWidth = 1.5;
      for (let k = 0; k < a.pts.length; k++) {
        const p = view(a.pts[k]);
        const vis = p[2] > -0.05;
        const s = [cx + p[0] * R, cy - p[1] * R];
        if (prev && vis && prev.vis) {
          const f = k / (a.pts.length - 1);
          ctx.strokeStyle = `rgba(255,${Math.round(61 + 80 * f)},${Math.round(72 + 60 * f)},${(0.35 + 0.45 * Math.sin(Math.PI * f)).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(prev.s[0], prev.s[1]); ctx.lineTo(s[0], s[1]); ctx.stroke();
        }
        prev = { s, vis };
      }
      if (!reduced) {
        const u = ((t / 2200 + i * 0.19) % 1);
        const idx = u * (a.pts.length - 1), k = Math.floor(idx), f = idx - k;
        const A = a.pts[k], B = a.pts[Math.min(a.pts.length - 1, k + 1)];
        const p = view([A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f]);
        if (p[2] > 0) {
          const sx = cx + p[0] * R, sy = cy - p[1] * R;
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 7);
          g.addColorStop(0, "rgba(255,230,232,1)"); g.addColorStop(0.35, "rgba(255,61,72,0.8)"); g.addColorStop(1, "rgba(255,61,72,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
        }
      }
    });

    // offices: glow, pulse ring, core, leader line and label
    ctx.font = `500 ${Math.round(Math.max(11, Math.min(14, R / 11)))}px ${font}`;
    ctx.textBaseline = "middle";
    offices.forEach((o, i) => {
      const p = view(o.v);
      o.screen = null;
      if (p[2] <= 0.05) return;
      const sx = cx + p[0] * R, sy = cy - p[1] * R;
      o.screen = [sx, sy];
      const size = o.hq ? 13 : 8;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 2.2);
      g.addColorStop(0, "rgba(255,61,72,0.75)"); g.addColorStop(1, "rgba(255,61,72,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, size * 2.2, 0, Math.PI * 2); ctx.fill();
      if (!reduced) {
        const q = ((t / 2400 + i * 0.17) % 1);
        ctx.strokeStyle = `rgba(255,90,100,${(0.7 * (1 - q)).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sx, sy, 3 + q * size * 1.6, 0, Math.PI * 2); ctx.stroke();
      }
      if (!o.hq || !target) {
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sx, sy, o.hq ? 3.2 : 2.4, 0, Math.PI * 2); ctx.fill();
      }
      // label with a short leader
      const lx = sx + o.lx, ly = sy + o.ly;
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath(); ctx.moveTo(sx + Math.sign(o.lx) * 4, sy + Math.sign(o.ly) * 3); ctx.lineTo(lx, ly); ctx.stroke();
      const tw = ctx.measureText(o.name).width, padX = 7, bh = 20;
      const bx = o.lx < 0 ? lx - tw - padX * 2 : lx, by = ly - bh / 2;
      ctx.fillStyle = "rgba(10,11,16,0.82)";
      roundRect(ctx, bx, by, tw + padX * 2, bh, 6); ctx.fill();
      ctx.strokeStyle = o.hq ? "rgba(255,61,72,0.6)" : "rgba(255,255,255,0.12)";
      ctx.stroke();
      ctx.fillStyle = o.hq ? "#fff" : "rgba(235,238,245,0.92)";
      ctx.fillText(o.name, bx + padX, ly + 0.5);
    });

    if (target) {
      if (hq.screen) {
        target.style.opacity = target.dataset.flying ? 0 : "";
        // the canvas bleeds past the art box, so place the tile in the canvas's frame
        target.style.transform = `translate(${canvas.offsetLeft + hq.screen[0]}px, ${canvas.offsetTop + hq.screen[1]}px) translate(-50%, -50%)`;
        target.style.visibility = "visible";
      } else target.style.visibility = "hidden";
    }
  }

  function roundRect(c, x, y, ww, hh, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + ww, y, x + ww, y + hh, r); c.arcTo(x + ww, y + hh, x, y + hh, r);
    c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + ww, y, r); c.closePath();
  }

  let lastT = 0;
  function frame(now) {
    raf = 0;
    const dt = lastT ? Math.min(64, now - lastT) : 16;
    lastT = now;
    if (!drag) {
      lon0 += vx * dt; lat0 += vy * dt;
      vx *= Math.pow(0.94, dt / 16); vy *= Math.pow(0.94, dt / 16);
      if (now - lastInteract > 2500) {
        // drift back toward Asia with a slow sway
        const tl = 104 + 22 * Math.sin((now - t0) / 9000), tp = 12 + 5 * Math.sin((now - t0) / 13000);
        lon0 += (tl - lon0) * Math.min(1, dt / 1600);
        lat0 += (tp - lat0) * Math.min(1, dt / 1600);
      }
    }
    lat0 = Math.max(-45, Math.min(55, lat0));
    draw(now);
    if (running) raf = requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, lon: lon0, lat: lat0, t: performance.now() };
    canvas.setPointerCapture(e.pointerId);
    lastInteract = performance.now();
    vx = vy = 0;
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const k = 180 / (Math.PI * R);
    const nlon = drag.lon - (e.clientX - drag.x) * k, nlat = drag.lat + (e.clientY - drag.y) * k;
    const now = performance.now(), dt = Math.max(1, now - drag.t);
    vx = (nlon - lon0) / dt; vy = (nlat - lat0) / dt;
    lon0 = nlon; lat0 = nlat; drag.t = now;
    lastInteract = now;
    if (!running) draw(now);
  });
  const end = () => { drag = null; lastInteract = performance.now(); };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);

  return {
    resize,
    start() { if (reduced) { draw(performance.now()); return; } if (running) return; running = true; lastT = 0; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; },
    draw: () => draw(performance.now()),
  };
}
