// 02 Hero: load sequence, pointer tilt, the live engagement run and the office-time feed.
import { Spring, springs, SPRING, SPRING_SOFT, reduced, fine, ticker, clamp } from "../core/engine.js";
import { rise, focus, fade, type } from "../core/prims.js";
import { whenReleased, onView } from "../core/seen.js";

const frameOf = (w) => (w <= 580 ? 390 : w <= 900 ? 768 : w <= 1200 ? 1024 : 1440);

// connector + route geometry per frame (window padding-box px)
const GEO = {
  1440: { vb: [678, 622], horizontal: true },
  1024: { vb: [514, 657], cx: 257, y0: 189, stem: 16, edge: 52, c1: 29, c2: 23, xl: 143, xr: 371, card: 60, g1: [143, 189, 228], g2: [143, 317, 228] },
  768: { vb: [514, 588], cx: 257, y0: 190, stem: 14, edge: 50, c1: 30, c2: 20, xl: 153, xr: 361, card: 60, g1: [153, 190, 208], g2: [153, 314, 208] },
};
GEO[390] = GEO[768];

function wiresSVG(f) {
  const g = GEO[f];
  const red = (id, x1, y1, x2, y2, a1, a2) =>
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="#ff3d48" stop-opacity="${a1}"/><stop offset="1" stop-color="#ff3d48" stop-opacity="${a2}"/></linearGradient>`;
  if (g.horizontal) {
    // left fan out of the trigger port (mirrored), right fan into "Run it"
    return `<defs>${red("hwA", 169, 0, 89, 0, 0.25, 0.95)}${red("hwB", 379, 0, 459, 0, 0.25, 0.95)}</defs>
<path class="w1 red" stroke="url(#hwA)" pathLength="1" d="M89 279C129 279 129 199 169 199"/>
<path class="w1 grey" pathLength="1" d="M89 279C129 279 129 359 169 359"/>
<path class="w2 red" stroke="url(#hwB)" pathLength="1" d="M379 199C419 199 419 279 459 279"/>
<path class="w2 grey" pathLength="1" d="M379 359C419 359 419 279 459 279"/>`;
  }
  const [x1, y1, w] = g.g1, [, y2] = g.g2;
  const m = x1 + w / 2, s = g.stem, e = g.edge, h = s + e;
  return `<defs>${red("hwA", 0, y1 + s, 0, y1 + h, 0.3, 0.95)}${red("hwB", 0, y2, 0, y2 + e, 0.95, 0.3)}</defs>
<path class="w1 grey" pathLength="1" d="M${m} ${y1}V${y1 + s}"/>
<path class="w1 red" stroke="url(#hwA)" pathLength="1" d="M${m} ${y1 + s}C${m} ${y1 + s + g.c1} ${x1} ${y1 + s + g.c2} ${x1} ${y1 + h}"/>
<path class="w1 grey" pathLength="1" d="M${m} ${y1 + s}C${m} ${y1 + s + g.c1} ${x1 + w} ${y1 + s + g.c2} ${x1 + w} ${y1 + h}"/>
<path class="w2 red" stroke="url(#hwB)" pathLength="1" d="M${x1} ${y2}C${x1} ${y2 + g.c1} ${m} ${y2 + g.c2} ${m} ${y2 + e}"/>
<path class="w2 grey" pathLength="1" d="M${x1 + w} ${y2}C${x1 + w} ${y2 + g.c1} ${m} ${y2 + g.c2} ${m} ${y2 + e}"/>
<path class="w2 grey" pathLength="1" d="M${m} ${y2 + e}V${y2 + h}"/>`;
}

// route as a list of cubic/line segments -> sampled polyline with cumulative lengths
function cubic(p0, p1, p2, p3, n = 48) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return out;
}
function line(p0, p1, n = 48) { const o = []; for (let i = 1; i <= n; i++) { const t = i / n; o.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t]); } return o; }
function route(f, grey) {
  const g = GEO[f];
  let pts, hitIndex;
  if (g.horizontal) {
    const y = grey ? 359 : 199;
    const a = [89, 279];
    const s0 = cubic(a, [129, 279], [129, y], [169, y]);
    const s1 = line([169, y], [379, y]);
    const s2 = cubic([379, y], [419, y], [419, 279], [459, 279]);
    pts = [a, ...s0, ...s1];
    hitIndex = pts.length - 1;
    pts = pts.concat(s2);
  } else {
    const x = grey ? g.xr : g.xl, m = g.cx, s = g.stem, e = g.edge;
    const y0 = g.y0, yA = y0 + s, yB = yA + e, yC = yB + g.card, yD = yC + e, yE = yD + s;
    const s0 = line([m, y0], [m, yA]);
    const s1 = cubic([m, yA], [m, yA + g.c1], [x, yA + g.c2], [x, yB]);
    const s2 = line([x, yB], [x, yC]);
    const s3 = cubic([x, yC], [x, yC + g.c1], [m, yC + g.c2], [m, yD]);
    const s4 = line([m, yD], [m, yE]);
    pts = [[m, y0], ...s0, ...s1];
    hitIndex = pts.length - 1;
    pts = pts.concat(s2, s3, s4);
  }
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = L[L.length - 1];
  return { pts, L, total, hit: L[hitIndex] };
}
function at(r, d) {
  let lo = 0, hi = r.L.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (r.L[mid] < d) lo = mid; else hi = mid; }
  const t = (d - r.L[lo]) / Math.max(1e-6, r.L[hi] - r.L[lo]);
  return [r.pts[lo][0] + (r.pts[hi][0] - r.pts[lo][0]) * t, r.pts[lo][1] + (r.pts[hi][1] - r.pts[lo][1]) * t];
}

// offices for the feed: name, code, zone
const OFFICES = [
  ["Singapore", "HQ", "Asia/Singapore"], ["Kuala Lumpur", "MY", "Asia/Kuala_Lumpur"], ["Sydney", "AU", "Australia/Sydney"],
  ["Hong Kong", "HK", "Asia/Hong_Kong"], ["New Delhi", "IN", "Asia/Kolkata"], ["Jakarta", "ID", "Asia/Jakarta"],
];
const fmtCache = {};
function localTime(tz, withSec = true) {
  const k = tz + withSec;
  const f = fmtCache[k] || (fmtCache[k] = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: withSec ? "2-digit" : undefined, hour12: false }));
  return f.format(new Date());
}
export function isOpen(tz) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", hour: "numeric", hour12: false }).formatToParts(new Date());
  const wd = p.find((x) => x.type === "weekday").value, h = +p.find((x) => x.type === "hour").value;
  return !["Sat", "Sun"].includes(wd) && h >= 9 && h < 18;
}
export { localTime };

export function initHero() {
  const hero = document.getElementById("hero");
  if (!hero) return;
  const q = (s) => hero.querySelector(s);
  const qa = (s) => Array.from(hero.querySelectorAll(s));
  const tilt = q(".hero-tilt"), win = q(".hw-window");
  const wires = q(".hw-wires"), packets = q(".hw-packets");
  let frame = frameOf(innerWidth);

  const drawWires = () => {
    const g = GEO[frame];
    wires.setAttribute("viewBox", `0 0 ${g.vb[0]} ${g.vb[1]}`);
    packets.setAttribute("viewBox", `0 0 ${g.vb[0]} ${g.vb[1]}`);
    wires.innerHTML = wiresSVG(frame);
    if (wiresDrawn.w1) wires.querySelectorAll(".w1").forEach((p) => { p.style.visibility = "visible"; });
    if (wiresDrawn.w2) wires.querySelectorAll(".w2").forEach((p) => { p.style.visibility = "visible"; });
  };
  const wiresDrawn = { w1: reduced, w2: reduced };
  drawWires();

  // ---------------------------------------------------------- load sequence
  const chip = rise(q(".hc-chip")), chipT = type(q('[data-h="chiptext"]'));
  const title = rise(q(".hc-title")), titleF = focus(q(".hero-h1"), 10);
  const sub = fade(q(".hc-sub"));
  const actions = rise(q(".hc-actions"));
  const note = rise(q(".hc-note")), noteT = type(q('[data-h="notetext"]'));
  const grid = q(".hw-grid");
  const gridSp = new Spring(-0.25, (r) => {
    if (r >= 1) { grid.style.maskImage = grid.style.webkitMaskImage = "none"; return; }
    const k = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
    const m = `radial-gradient(circle at 50% 50%, #000 ${Math.max(0, r * 480 * k)}px, transparent ${Math.max(0, r * 480 * k + 120 * k)}px)`;
    grid.style.maskImage = grid.style.webkitMaskImage = m;
  });
  const fadeEl = (el, d) => { if (el) fade(el).play(d); };
  const nodeIn = (el, d) => {
    const s = springs({ o: 0, y: 8 }, (v) => { el.style.opacity = v.o >= 1 ? "1" : v.o; el.style.translate = v.y === 0 ? "none" : `0 ${v.y}px`; });
    s.start({ o: 1, y: 0 }, { config: SPRING, delay: d });
  };
  const popEl = (el, d) => {
    if (!el) return;
    const s = springs({ o: 0, s: 0.4 }, (v) => { el.style.opacity = v.o >= 1 ? "1" : v.o; el.style.scale = v.s >= 1 ? "none" : v.s; });
    s.start({ o: 1, s: 1 }, { config: SPRING_SOFT, delay: d });
  };
  const drawGroup = (cls, d) => {
    setTimeout(() => {
      wiresDrawn[cls] = true;
      wires.querySelectorAll("." + cls).forEach((p) => {
        p.style.visibility = "visible";
        p.style.strokeDasharray = "1 1";
        const sp = new Spring(1, (v) => { p.style.strokeDashoffset = v; if (v <= 0) p.style.strokeDasharray = "none"; });
        sp.start(0, { config: SPRING_SOFT });
      });
    }, d);
  };

  let liveStart = 0;
  const play = () => {
    chip.play(0); chipT.play(120);
    title.play(70); titleF.play(70);
    sub.play(140);
    actions.play(210);
    note.play(280); noteT.play(400);
    gridSp.start(1, { config: SPRING_SOFT, delay: 192 });
    ["hw-chrome", "hw-runs-rule", "hw-runs-label"].forEach((c) => fadeEl(q("." + c), 288));
    nodeIn(q(".n-t"), 416); nodeIn(q(".n-a"), 472); nodeIn(q(".n-b"), 528); nodeIn(q(".n-c"), 584);
    fadeEl(q(".hw-wait"), 654);
    popEl(q(".pt-over"), 416);
    popEl(q(".pt-out"), 608); drawGroup("w1", 608);
    drawGroup("w2", 688); qa(".hw-label").forEach((l) => fadeEl(l, 688)); [".pt1", ".pt2", ".pt3", ".pt4"].forEach((s) => popEl(q(s), 688));
    popEl(q(".pt5"), 896); fadeEl(q(".hw-live"), 896);
    rows.slice(0, 3).forEach((li, i) => fadeEl(li, 800 + i * 70));
    setTimeout(() => window.dispatchEvent(new Event("itcan:stream")), 416);
    liveStart = performance.now() + 944;
    startLive();
  };
  if (reduced) {
    [chip, chipT, title, titleF, sub, actions, note, noteT].forEach((c) => c.play(0));
    gridSp.set(1);
  } else {
    [chip, title, note, actions].forEach((c) => c.reset());
    chipT.reset(); noteT.reset(); titleF.reset(); sub.reset();
    whenReleased(() => requestAnimationFrame(play));
  }

  // ---------------------------------------------------------- pointer tilt
  const layers = qa("[data-depth]").map((el) => [el, +el.dataset.depth]);
  const tiltSp = springs({ x: 0, y: 0 }, (v) => {
    const k = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
    tilt.style.transform = v.x === 0 && v.y === 0 ? "none" : `perspective(1400px) rotateX(${-v.y * 12}deg) rotateY(${v.x * 12}deg)`;
    layers.forEach(([el, d]) => { el.style.translate = v.x === 0 && v.y === 0 ? "none" : `${v.x * d * k}px ${v.y * d * k}px`; });
  });
  if (fine && !reduced) {
    const anchor = () => (frame === 768 ? [0.5, 649 / 976] : frame === 390 ? [0.5, 679.5 / 949] : [1100 / 1440, 0.5]);
    hero.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = hero.getBoundingClientRect(), [ax, ay] = anchor();
      let x = (e.clientX - (r.left + r.width * ax)) / (r.width / 2);
      let y = (e.clientY - (r.top + r.height * ay)) / (r.height / 2);
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      tiltSp.start({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 }, { config: SPRING_SOFT });
    });
    const rest = () => tiltSp.start({ x: 0, y: 0 }, { config: SPRING_SOFT });
    hero.addEventListener("pointerleave", rest);
    addEventListener("blur", rest);
  }

  // ---------------------------------------------------------- live run
  const pkLive = packets.querySelector(".pk-live"), pkGrey = packets.querySelector(".pk-grey");
  const flashes = { t: q(".fl-t"), a: q(".fl-a"), b: q(".fl-b"), c: q(".fl-c") };
  let routes = { live: route(frame, false), grey: route(frame, true) };
  let inView = false, liveOff = null;
  const flashAt = {};
  const TRIP = 720, EVERY = 1920;
  function startLive() {
    if (reduced || liveOff || !inView) return;
    liveOff = ticker.add((now) => {
      if (now < liveStart) return;
      const t = now - liveStart;
      const k = Math.floor(t / EVERY), into = t - k * EVERY;
      const grey = k % 3 === 2;
      const r = grey ? routes.grey : routes.live;
      const pk = grey ? pkGrey : pkLive, other = grey ? pkLive : pkGrey;
      other.style.opacity = 0;
      if (into <= TRIP) {
        const u = into / TRIP;
        const e = (1 - Math.cos(Math.PI * u)) / 2;
        const [x, y] = at(r, e * r.total);
        pk.setAttribute("transform", `translate(${x} ${y})`);
        pk.style.opacity = Math.max(0, Math.min(1, u / 0.08, (1 - u) / 0.04));
        const hitU = Math.acos(1 - (2 * r.hit) / r.total) / Math.PI;
        const tag = k + (grey ? "g" : "l");
        if (flashAt.trip !== tag) { flashAt.trip = tag; flashAt.t = now; flashAt.mid = 0; flashAt.end = 0; }
        if (!flashAt.mid && u >= hitU) flashAt.mid = now;
        if (!flashAt.end && u >= 0.999) flashAt.end = now;
      } else pk.style.opacity = 0;
      const fl = (el, since) => {
        if (!el) return;
        const f = since == null || since > 416 ? 0 : Math.pow(1 - since / 416, 2);
        el.style.opacity = f * 0.85;
        el.style.transform = f ? `scale(${1 + (1 - f) * 1.4})` : "";
      };
      fl(flashes.t, flashAt.t ? now - flashAt.t : null);
      fl(grey ? flashes.b : flashes.a, flashAt.mid ? now - flashAt.mid : null);
      fl(grey ? flashes.a : flashes.b, null);
      fl(flashes.c, flashAt.end ? now - flashAt.end : null);
    });
  }
  onView(win, (hit) => {
    inView = hit;
    if (hit) { if (liveStart) startLive(); }
    else if (liveOff) { liveOff(); liveOff = null; }
  });

  // ---------------------------------------------------------- office-time feed
  // Four rows laid out absolutely; p 0 -> 1 moves row i to (i - 1 + p) * pitch.
  const list = q(".hw-list");
  const rows = [];
  let next = 0;
  const fill = (li) => {
    const [name, code, tz] = OFFICES[next++ % OFFICES.length];
    li.querySelector("span").textContent = name;
    li.querySelector("em").textContent = code;
    li._tz = tz;
  };
  list.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const li = document.createElement("li");
    li.innerHTML = "<i></i><time></time><span></span><em></em>";
    fill(li); rows.push(li); list.appendChild(li);
  }
  const pitchPx = () => (frame === 1440 ? 34 : 28) * (parseFloat(getComputedStyle(document.documentElement).fontSize) / 16);
  const placeRows = (p, opacity = true) => {
    const P = pitchPx();
    rows.forEach((li, i) => {
      li.style.transform = `translateY(${(i - 1 + p) * P}px)`;
      if (!opacity) return;
      if (i === 0) li.style.opacity = p;
      else if (i === 3) li.style.opacity = Math.max(0, 1 - p);
      else li.style.opacity = "1";
    });
  };
  const tick = () => {
    rows.forEach((li) => {
      li.querySelector("time").textContent = localTime(li._tz);
      li.querySelector("i").className = isOpen(li._tz) ? "live" : "";
    });
  };
  placeRows(1, false);
  rows[3].style.opacity = 0;
  if (!reduced) rows.slice(0, 3).forEach((li) => { li.style.opacity = 0; });
  tick();
  let clipped = false, feedTimer = 0, clockTimer = 0;
  const shift = () => {
    const last = rows.pop();
    fill(last);
    rows.unshift(last);
    tick();
    if (!clipped) { clipped = true; list.style.clipPath = "inset(0 -16px 0 -16px)"; }
    placeRows(0);
    const s = new Spring(0, (p) => placeRows(p));
    s.start(1, { config: SPRING });
  };
  onView(list, (hit) => {
    clearInterval(feedTimer); clearInterval(clockTimer);
    if (!hit) return;
    tick();
    clockTimer = setInterval(tick, 1000);
    if (!reduced) feedTimer = setInterval(shift, 4000);
  });

  // ---------------------------------------------------------- frame changes
  addEventListener("resize", () => {
    const f = frameOf(innerWidth);
    placeRows(1, false);
    if (f === frame) return;
    frame = f;
    routes = { live: route(frame, false), grey: route(frame, true) };
    drawWires();
  });
}
