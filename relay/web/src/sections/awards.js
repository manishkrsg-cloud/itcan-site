// 07 Awards: dashboard widgets drawn from awards.json, the photo gallery and the lightbox.
import { Spring, springs, SPRING, SPRING_SOFT, GROW, SNAP, reduced, ticker, ease, tween } from "../core/engine.js";
import { watchLoop, onView } from "../core/seen.js";
import { scrollTo, lock } from "../core/scroll.js";

const YEARS = Array.from({ length: 17 }, (_, i) => 2007 + i);
const CATS = ["e50", "brand", "ent", "exc"];
const CAT_NAME = { e50: "Enterprise 50", brand: "Brand and leadership", ent: "Entrepreneurship", exc: "Excellence" };
const SLOW = { tension: 105, friction: 26.9 };
const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };
const setO = (el, v) => { el.style.opacity = v >= 1 ? "1" : Math.max(0, v); };

let AWARDS = [];
let setFilter = () => {};

// ------------------------------------------------------------ W1 heatmap (years x kinds)
function heatmap(card) {
  const hm = card.querySelector(".hm");
  const counts = {};
  AWARDS.forEach((a) => { counts[a.year + a.cat] = (counts[a.year + a.cat] || 0) + 1; });
  const latest = AWARDS.filter((a) => a.cat === "e50").reduce((m, a) => Math.max(m, a.year), 0);
  const cells = [];
  let peak = null, rule = null;
  YEARS.forEach((y, col) => {
    CATS.forEach((c, row) => {
      const n = counts[y + c] || 0;
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `${y}: ${n} ${CAT_NAME[c]} award${n === 1 ? "" : "s"}`);
      const g = n === 0 ? [62, 65, 69, 0.42, 0.16] : n === 1 ? [229, 34, 46, 0.62, 0.32] : [255, 61, 72, 0.95, 0.6];
      b.style.background = `linear-gradient(90deg, rgb(${g[0]} ${g[1]} ${g[2]} / ${g[3]}), rgb(${g[0]} ${g[1]} ${g[2]} / ${g[4]}))`;
      if (y === latest && c === "e50") { b.style.background = "linear-gradient(90deg, #ff3d48, rgba(255,61,72,.72))"; const gl = document.createElement("i"); gl.className = "glow"; b.appendChild(gl); peak = gl; }
      b.addEventListener("click", () => setFilter({ year: y }));
      hm.appendChild(b);
      cells.push({ el: b, col, row });
    });
    const lab = document.createElement("span");
    lab.className = "yr" + (y === latest ? " hot" : "") + (col % 2 ? " odd" : "");
    lab.textContent = String(y).slice(2);
    if (y === latest) { rule = document.createElement("i"); rule.className = "rule"; lab.appendChild(rule); }
    hm.appendChild(lab);
    cells.push({ el: lab, col, row: 5, label: true });
  });
  const sp = cells.map((c) => new Spring(0, (t) => { setO(c.el, t); c.el.style.transform = t >= 1 ? "none" : `scale(${0.92 + 0.08 * Math.max(0, t)})`; }));
  const glowS = new Spring(0, (g) => { if (peak) peak.style.opacity = Math.sin(Math.PI * Math.max(0, Math.min(1, g))); });
  const ruleS = new Spring(0, (v) => { if (rule) rule.style.transform = `scaleX(${Math.max(0, v)})`; });
  // clock chip: a full turn, then three 6 degree ticks per cycle
  const hand = card.querySelector(".wg-clock .hand");
  let turns = 0, ticks = 0, clockT = 0;
  const handS = new Spring(0, (a) => { hand.style.transform = a % 360 === 0 ? "none" : `rotate(${a}deg)`; });
  const clockCycle = () => {
    turns++; ticks = 0;
    handS.start(360 * turns, { config: { tension: 105, friction: 24.4 } });
    let beat = 0;
    clearInterval(clockT);
    clockT = setInterval(() => {
      beat++;
      if (beat >= 4 && beat <= 6) { ticks++; handS.start(360 * turns + ticks * 6, { config: SNAP }); }
      if (beat >= 8) { clearInterval(clockT); clockCycle(); }
    }, 640);
  };
  const T = [];
  return {
    play() {
      cells.forEach((c, i) => sp[i].start(1, { config: SLOW, delay: c.label ? 208 + (c.col + 7) * 36 : 208 + (c.col + c.row) * 36 }));
      glowS.set(0); glowS.start(1, { config: { tension: 33, friction: 15.9 }, delay: 208 + (16 + 2) * 36 + 96 });
      ruleS.start(1, { config: GROW, delay: 208 + (16 + 4) * 36 + 180 });
      if (!clockT) T.push(setTimeout(clockCycle, 380));
    },
    out() { cells.forEach((c, i) => sp[i].start(0, { config: SPRING, delay: (c.col + Math.min(c.row, 4)) * 20 })); ruleS.start(0, { config: SPRING }); },
    reset() { T.forEach(clearTimeout); T.length = 0; clearInterval(clockT); clockT = 0; turns = 0; handS.set(0); sp.forEach((s) => s.set(0)); glowS.set(0); ruleS.set(0); },
    rest() { sp.forEach((s) => s.set(1)); ruleS.set(1); },
    playMs: 2240,
  };
}

// ------------------------------------------------------------ W2 ring (Enterprise 50 wins out of 17 years)
function ring(card) {
  const arc = card.querySelector(".ring-arc"), fig = card.querySelector("[data-ring]");
  const wins = AWARDS.filter((a) => a.cat === "e50").length || 10;
  const frac = wins / 17;
  const p = new Spring(0, (v) => {
    const q = Math.max(0, Math.min(1, v));
    arc.style.strokeDashoffset = 1 - q * frac;
    arc.style.visibility = q > 0 ? "visible" : "hidden";
    fig.textContent = String(Math.round(q * wins));
  });
  return {
    play() { p.start(1, { config: GROW }); },
    out() { p.start(0, { config: { duration: 1120, easing: ease.inOutCubic } }); },
    reset() { p.set(0); }, rest() { p.set(1); }, playMs: 1440, lead: 410,
  };
}

// ------------------------------------------------------------ W3 faces (award photos)
function faces(card) {
  const ul = card.querySelector(".faces"), count = card.querySelector("[data-faces-count]");
  const pick = ["2023-enterprise-50", "2019-brand-laureate", "2018-enterprise-medal-of-honour", "2017-enterprise-50", "2014-turnover-growth-excellence"];
  const items = pick.map((slug) => AWARDS.find((a) => a.slug === slug)).filter(Boolean);
  const els = items.map((a) => { const li = document.createElement("li"); li.innerHTML = `<img src="/awards/${a.slug}-sm.jpg" alt="" loading="lazy" width="60" height="60">`; ul.appendChild(li); return li; });
  const total = AWARDS.length || 28;
  const fs = els.map((li, i) => new Spring(0, (v) => { setO(li, v); li.style.transform = v >= 1 ? "none" : `translateX(${(1 - v) * (36 + i * 14)}px)`; }));
  const cs = new Spring(0, (v) => { count.textContent = String(Math.round(Math.max(0, v) * total)); });
  return {
    play(first) {
      const lead = first ? 440 : 0;
      fs.forEach((s, i) => s.start(1, { config: GROW, delay: lead + i * 48 }));
      cs.start(1, { config: GROW, delay: lead + 5 * 48 });
    },
    out() { fs.forEach((s, i) => s.start(0, { config: GROW, delay: (4 - i) * 32 })); cs.start(0, { config: { duration: 960, easing: ease.inOutCubic } }); },
    reset() { fs.forEach((s) => s.set(0)); cs.set(0); }, rest() { fs.forEach((s) => s.set(1)); cs.set(1); }, playMs: 1600,
  };
}

// ------------------------------------------------------------ W4 cumulative curves
function curves(card) {
  const svg = card.querySelector(".curves");
  const all = svg.querySelector(".cv-all"), e50 = svg.querySelector(".cv-e50"), marks = svg.querySelector(".cv-marks");
  const X = (y) => ((y - 2007) / 16) * 365, Y = (v) => 104 - (v / 28) * 98;
  const cum = (f) => { let s = 0; return YEARS.map((y) => (s += AWARDS.filter((a) => a.year === y && f(a)).length)); };
  const path = (vals) => {
    const pts = vals.map((v, i) => [X(YEARS[i]), Y(v)]);
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2; d += `C${mx.toFixed(1)} ${y0.toFixed(1)} ${mx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`; }
    return d;
  };
  const A = cum(() => true), E = cum((a) => a.cat === "e50");
  all.setAttribute("d", path(A)); e50.setAttribute("d", path(E));
  [all, e50].forEach((p) => { p.setAttribute("pathLength", "1"); p.style.strokeDasharray = "1 1"; });
  const mk = [[2007, A[0], "2007"], [2017, A[10], "2017"], [2023, A[16], `${A[16]}`]].map(([y, v, t]) => {
    const g = svgEl("g", { transform: `translate(${X(y)} ${Y(v)})` }, marks);
    const ping = svgEl("circle", { r: 5, class: "ping" }, g);
    svgEl("circle", { r: 5 }, g);
    const label = svgEl("text", { x: y === 2023 ? -8 : 8, y: -10, "text-anchor": y === 2023 ? "end" : "start" }, g);
    label.textContent = t;
    return { g, ping };
  });
  const la = new Spring(0, (v) => { all.style.strokeDashoffset = 1 - Math.max(0, v); });
  const le = new Spring(0, (v) => { e50.style.strokeDashoffset = 1 - Math.max(0, v); });
  const ms = mk.map((m) => new Spring(0, (v) => { const q = Math.max(0, v); m.g.style.opacity = Math.min(1, q); m.g.firstChild.nextSibling.style.transform = `scale(${0.4 + 0.6 * q})`; }));
  let pingOff = null;
  const pings = (on) => {
    if (on && !pingOff && !reduced) {
      const t0 = performance.now();
      pingOff = ticker.add((now) => {
        mk.forEach((m, i) => {
          const t = ((now - t0 - i * 360) % 2400 + 2400) % 2400;
          const e = t < 1040 ? ease.outCubic(t / 1040) : 1;
          m.ping.setAttribute("r", 5 + 9 * e);
          m.ping.style.opacity = t < 1040 ? 0.8 * (1 - e) : 0;
        });
      }, 32);
    } else if (!on && pingOff) { pingOff(); pingOff = null; mk.forEach((m) => { m.ping.style.opacity = 0; }); }
  };
  const T = [];
  return {
    play() { la.start(1, { config: GROW, delay: 550 }); le.start(1, { config: GROW, delay: 662 }); ms.forEach((s) => s.start(1, { config: SPRING, delay: 1270 })); T.push(setTimeout(() => pings(true), 1910)); },
    reset() { T.forEach(clearTimeout); T.length = 0; pings(false); la.set(0); le.set(0); ms.forEach((s) => s.set(0)); },
    rest() { la.set(1); le.set(1); ms.forEach((s) => s.set(1)); },
    once: true,
  };
}

// ------------------------------------------------------------ W5 dot map (Singapore, HQ pin)
const SG = [[103.605, 1.265], [103.64, 1.32], [103.66, 1.385], [103.7, 1.43], [103.76, 1.447], [103.8, 1.466], [103.85, 1.463], [103.89, 1.43], [103.94, 1.418], [103.99, 1.408], [104.035, 1.39], [104.09, 1.36], [104.03, 1.33], [103.98, 1.31], [103.93, 1.3], [103.87, 1.283], [103.845, 1.265], [103.82, 1.26], [103.78, 1.277], [103.74, 1.292], [103.7, 1.3], [103.66, 1.28], [103.625, 1.262]];
function dotmap(card) {
  const svg = card.querySelector(".dotmap");
  const W = 366, H = 132, lon0 = 103.58, lon1 = 104.11, lat0 = 1.225, lat1 = 1.485;
  const P = (lon, lat) => [((lon - lon0) / (lon1 - lon0)) * W, ((lat1 - lat) / (lat1 - lat0)) * H];
  const poly = SG.map(([a, b]) => P(a, b));
  const inside = (x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const dots = [];
  for (let x = 4; x < W; x += 6.5357) for (let y = 3; y < H; y += 6) if (inside(x, y)) dots.push(svgEl("ellipse", { class: "d", cx: x.toFixed(2), cy: y, rx: 1.525, ry: 1.4 }, svg));
  const [hx, hy] = P(103.8487, 1.2805);
  const lbl = svgEl("g", { transform: `translate(${hx + 14} ${hy - 30})` }, svg);
  svgEl("rect", { class: "plate", width: 108, height: 24, rx: 6 }, lbl);
  const txt = svgEl("text", { class: "lbl", x: 8, y: 16.5 }, lbl);
  txt.textContent = "itcan hq";
  const pin = svgEl("g", { transform: `translate(${hx} ${hy})` }, svg);
  const ping = svgEl("circle", { class: "ping", r: 16 }, pin);
  svgEl("circle", { class: "halo", r: 10 }, pin);
  svgEl("circle", { class: "ring0", r: 13.5 }, pin);
  const head = svgEl("circle", { class: "pin", r: 4.5 }, pin);
  const buckets = dots.map((_, i) => (Math.imul(i + 1, 2654435761) >>> 0) % 9);
  const ds = dots.map((d, i) => new Spring(0, (v) => setO(d, v)));
  const pinS = new Spring(0, (v) => { const q = Math.max(0, Math.min(1, v)); pin.style.opacity = q; head.setAttribute("cy", -(1 - v) * 14); lbl.style.opacity = q; });
  let pingOff = null;
  const pings = (on) => {
    if (on && !pingOff && !reduced) {
      const t0 = performance.now();
      pingOff = ticker.add((now) => {
        const t = (now - t0) % 2400, e = t < 1040 ? ease.outCubic(t / 1040) : 1;
        ping.setAttribute("r", 16 * (0.28 + 0.72 * e));
        ping.style.opacity = t < 1040 ? 0.8 * (1 - e) : 0;
      }, 32);
    } else if (!on && pingOff) { pingOff(); pingOff = null; ping.style.opacity = 0; }
  };
  const T = [];
  return {
    play() {
      ds.forEach((s, i) => s.start(1, { config: GROW, delay: 580 + buckets[i] * 44 }));
      pinS.start(1, { config: SNAP, delay: 580 + 416 });
      T.push(setTimeout(() => pings(true), 580 + 416 + 336 + 400));
    },
    reset() { T.forEach(clearTimeout); T.length = 0; pings(false); ds.forEach((s) => s.set(0)); pinS.set(0); },
    rest() { ds.forEach((s) => s.set(1)); pinS.set(1); },
    once: true,
  };
}

// loops: play -> hold 2800 -> out -> again; "once" widgets rewind only when fully off screen
function drive(card, w) {
  if (reduced) { w.rest(); return; }
  w.reset();
  let T = 0, first = true;
  const cycle = () => {
    w.play(first); first = false;
    if (w.once) return;
    T = setTimeout(() => { w.out(); T = setTimeout(cycle, 1200); }, (w.playMs || 1600) + 2800);
  };
  watchLoop(card, {
    arm() { clearTimeout(T); T = setTimeout(cycle, w.lead || 0); },
    disarm() { clearTimeout(T); first = true; w.reset(); },
  });
}

// ------------------------------------------------------------ gallery + lightbox
function gallery(sec) {
  const grid = sec.querySelector("#awardGrid");
  const tabs = Array.from(sec.querySelectorAll("#awardFilters button"));
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg"), lbYear = document.getElementById("lbYear"), lbTitle = document.getElementById("lbTitle"), lbMeta = document.getElementById("lbMeta");
  let shown = AWARDS.slice(), idx = 0;
  const render = () => {
    grid.innerHTML = "";
    shown.forEach((a, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `gal-item ${a.cat}`;
      b.setAttribute("aria-label", `${a.year} ${a.title}, open photo`);
      b.innerHTML = `<span class="gal-img"><img src="/awards/${a.slug}-sm.jpg" alt="${a.title}, ${a.year}" loading="lazy" width="720" height="${Math.round((720 * a.h) / a.w)}"></span><span class="gal-meta"><span class="mono">${a.year}</span><b>${a.title}</b><span class="tag">${CAT_NAME[a.cat]}</span></span>`;
      b.addEventListener("click", () => open(i));
      grid.appendChild(b);
      if (!reduced) {
        const s = springs({ o: 0, y: 16 }, (v) => { setO(b, v.o); b.style.transform = v.y ? `translateY(${v.y}px)` : "none"; });
        s.set({ o: 0, y: 16 });
        const off = onView(b, (hit) => { if (hit) { off(); s.start({ o: 1, y: 0 }, { config: SPRING, delay: (i % 4) * 70 }); } });
      }
    });
  };
  setFilter = (f) => {
    const cat = f.cat || null, year = f.year || null;
    tabs.forEach((t) => t.setAttribute("aria-selected", String(!year && (t.dataset.filter === (cat || "all")))));
    shown = AWARDS.filter((a) => (year ? a.year === year : !cat || cat === "all" || a.cat === cat));
    render();
    if (year) scrollTo(sec.querySelector(".gal-head"));
  };
  tabs.forEach((t) => t.addEventListener("click", () => setFilter({ cat: t.dataset.filter })));
  tabs.forEach((t, i) => t.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    n.focus(); n.click();
  }));
  // lightbox
  let lastFocus = null;
  const show = () => {
    const a = shown[idx];
    lbImg.src = `/awards/${a.slug}.jpg`;
    lbImg.alt = `${a.title}, ${a.year}`;
    lbYear.textContent = a.year; lbTitle.textContent = a.title;
    lbMeta.textContent = `${CAT_NAME[a.cat]} / ${idx + 1} of ${shown.length}`;
  };
  const open = (i) => { idx = i; lastFocus = document.activeElement; show(); lb.hidden = false; lock(true); lb.querySelector(".lb-close").focus(); };
  const close = () => { lb.hidden = true; lock(false); lbImg.removeAttribute("src"); lastFocus && lastFocus.focus(); };
  const step = (d) => { idx = (idx + d + shown.length) % shown.length; show(); };
  lb.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
  document.getElementById("lbPrev").addEventListener("click", () => step(-1));
  document.getElementById("lbNext").addEventListener("click", () => step(1));
  addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") close(); else if (e.key === "ArrowLeft") step(-1); else if (e.key === "ArrowRight") step(1);
  });
  let sx = 0;
  lb.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); });
  render();
}

export async function initAwards() {
  const sec = document.getElementById("signals");
  if (!sec) return;
  try { AWARDS = await (await fetch("/data/awards.json")).json(); } catch (e) { AWARDS = []; }
  const q = (s) => sec.querySelector(s);
  drive(q(".wg-years"), heatmap(q(".wg-years")));
  drive(q(".wg-ring"), ring(q(".wg-ring")));
  drive(q(".wg-faces"), faces(q(".wg-faces")));
  drive(q(".wg-curves"), curves(q(".wg-curves")));
  drive(q(".wg-map"), dotmap(q(".wg-map")));
  gallery(sec);
  void tween;
}
