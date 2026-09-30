// 04 Services: index counters and four looping cards (trace, approval, layers, estate).
import { Spring, springs, SPRING, SPRING_SOFT, GROW, reduced, ticker } from "../core/engine.js";
import { type } from "../core/prims.js";
import { watchLoop } from "../core/seen.js";

const OVERSHOOT = { tension: 390, friction: 20.8 };
const POPC = { tension: 320, friction: 17 };

function timers() {
  let list = [];
  return { at(ms, fn) { list.push(setTimeout(fn, ms)); }, clear() { list.forEach(clearTimeout); list = []; } };
}
const setO = (el, v) => { el.style.opacity = v >= 1 ? "1" : Math.max(0, v); };

// every card: { play(), reverse(), reset(), rest(), playMs }
function loopCard(el, card) {
  if (reduced) { card.rest(); return; }
  card.reset();
  let timer = 0;
  const cycle = () => {
    card.play();
    timer = setTimeout(() => { card.reverse(); timer = setTimeout(cycle, 800); }, card.playMs + 2800);
  };
  watchLoop(el, {
    arm() { clearTimeout(timer); timer = setTimeout(cycle, 240); },
    disarm() { clearTimeout(timer); card.reset(); },
  });
}

// ------------------------------------------------------------ counters
function roll(el) {
  const txt = el.dataset.roll;
  el.textContent = "";
  el.setAttribute("aria-label", txt);
  const strips = txt.split("").map((ch) => {
    const d = +ch;
    const s = document.createElement("span");
    s.className = "dg";
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = Array.from({ length: 11 + d }, (_, i) => `<i>${i % 10}</i>`).join("");
    el.appendChild(s);
    return { s, d };
  });
  const lh = () => el.getBoundingClientRect().height || 20;
  const sps = strips.map(({ s, d }) => new Spring(0, (v) => { s.style.transform = `translateY(${-v * lh()}px)`; }));
  return {
    play() { strips.forEach(({ d }, i) => sps[i].start(10 + d, { config: SPRING_SOFT, delay: 150 + i * 70 })); },
    rest() { strips.forEach(({ d }, i) => sps[i].set(10 + d)); },
  };
}

// ------------------------------------------------------------ trace
function traceCard(fig) {
  const T = timers();
  const run = type(fig.querySelector('[data-t="run"]'), 24), sum = type(fig.querySelector('[data-t="sum"]'), 24);
  const rows = Array.from(fig.querySelectorAll(".tr-steps li"));
  const parts = rows.map((li) => {
    const span = li.querySelector(".tr-span, .tr-pend"), ico = li.querySelector(".tr-ico"), val = li.querySelector(".tr-val");
    const path = ico.querySelector("path");
    const to = parseFloat(val.dataset.to || "0"), unit = val.textContent.replace(/[\d.]/g, "").trim();
    const pend = li.classList.contains("pending");
    const g = new Spring(0, (v) => {
      span.style.transform = `scaleX(${Math.max(0, v)})`;
      if (pend) { setO(ico, v); setO(val, v); }
      else if (to) val.textContent = `${Math.round(Math.max(0, Math.min(1, v)) * to)} ${unit}`;
    });
    const c = new Spring(1, (v) => { if (path && !pend) { path.style.strokeDasharray = "1 1"; path.style.strokeDashoffset = v; } });
    return { g, c, pend };
  });
  const starts = [360, 760, 920, 1040];
  // dashes of the pending span crawl while the card is on screen
  const pendRect = fig.querySelector(".tr-pend rect");
  let crawl = null;
  const crawlOn = (on) => {
    if (on && !crawl && !reduced) crawl = ticker.add((now) => { pendRect.style.strokeDashoffset = -((now / 1120) % 1) * 7; }, 32);
    if (!on && crawl) { crawl(); crawl = null; }
  };
  return {
    playMs: 2072,
    play() {
      crawlOn(true);
      run.play(240); sum.play(1400);
      parts.forEach((p, i) => { p.g.start(1, { config: SPRING_SOFT, delay: starts[i] }); p.c.start(0, { config: SPRING, delay: starts[i] + 240 }); });
    },
    reverse() {
      parts.slice().reverse().forEach((p, k) => { p.g.start(0, { config: SPRING_SOFT, delay: k * 48 }); p.c.start(1, { config: SPRING, delay: k * 48 }); });
      T.at(200, () => { run.reset(); sum.reset(); });
    },
    reset() { T.clear(); crawlOn(false); run.reset(); sum.reset(); parts.forEach((p) => { p.g.set(0); p.c.set(1); }); },
    rest() { run.play(0); sum.play(0); parts.forEach((p) => { p.g.set(1); p.c.set(0); }); },
  };
}

// ------------------------------------------------------------ approval
function approveCard(fig) {
  const T = timers();
  const dots = fig.querySelector(".ap-dots"), dotI = Array.from(dots.children);
  const head = [fig.querySelector(".ap-ava"), fig.querySelector(".ap-from"), fig.querySelector(".ap-text")];
  const fields = Array.from(fig.querySelectorAll(".ap-fields div"));
  const bar = fig.querySelector(".ap-bar");
  const btns = [fig.querySelector(".ap-ok"), fig.querySelector(".ap-hold"), fig.querySelector(".ap-wait")];
  const min = fig.querySelector('[data-t="min"]');
  const riser = (els) => springs({ o: 0, y: 8 }, (v) => els.forEach((el) => { setO(el, v.o); el.style.translate = v.y ? `0 ${v.y}px` : "none"; }));
  const headS = riser(head), fieldS = fields.map((f) => riser([f])), btnS = btns.map((b) => riser([b]));
  const dotO = new Spring(0, (v) => setO(dots, v));
  const barS = new Spring(0, (v) => { bar.style.transform = `scaleY(${Math.max(0, v)})`; });
  let hop = null;
  const hopRun = (t0) => {
    hop = ticker.add((now) => {
      const t = Math.min(1, (now - t0) / 640);
      dotI.forEach((d, i) => { const p = Math.max(0, Math.min(2, t * 2.5 - i * 0.25)); d.style.transform = `translateY(${-3 * Math.abs(Math.sin(Math.PI * p))}px)`; });
      if (t >= 1) { hop(); hop = null; }
    });
  };
  const all = [headS, ...fieldS, ...btnS];
  return {
    playMs: 4472,
    play() {
      min.textContent = "26";
      dotO.start(1, { config: SPRING, delay: 240 });
      T.at(360, () => hopRun(performance.now()));
      T.at(1120, () => dotO.start(0, { config: SPRING }));
      headS.start({ o: 1, y: 0 }, { config: SPRING, delay: 1160 });
      fieldS.forEach((s, i) => s.start({ o: 1, y: 0 }, { config: SPRING, delay: 1360 + i * 112 }));
      barS.start(1, { config: SPRING_SOFT, delay: 1584 });
      btnS.forEach((s, i) => s.start({ o: 1, y: 0 }, { config: SPRING, delay: 1800 + i * 56 }));
      for (let k = 1; k <= 4; k++) T.at(2312 + (k - 1) * 720, () => { min.textContent = String(26 + k); });
    },
    reverse() {
      const d = [192, 160, 128, 96, 64, 32, 0];
      headS.start({ o: 0, y: 8 }, { config: SPRING, delay: d[0] });
      fieldS.forEach((s, i) => s.start({ o: 0, y: 8 }, { config: SPRING, delay: d[1 + i] }));
      barS.start(0, { config: SPRING_SOFT, delay: 64 });
      btnS.forEach((s, i) => s.start({ o: 0, y: 8 }, { config: SPRING, delay: [64, 32, 0][i] }));
      T.at(280, () => { min.textContent = "26"; });
    },
    reset() { T.clear(); hop && hop(); hop = null; all.forEach((s) => s.set({ o: 0, y: 8 })); dotO.set(0); barS.set(0); min.textContent = "26"; },
    rest() { all.forEach((s) => s.set({ o: 1, y: 0 })); dotO.set(0); barS.set(1); },
  };
}

// ------------------------------------------------------------ layers
function layersCard(fig) {
  const slabs = [".s3", ".s2", ".s1"].map((s) => fig.querySelector(".ly-slab" + s));
  const labels = [".l3", ".l2", ".l1"].map((s) => fig.querySelector(".ly-labels " + s));
  const glow = fig.querySelector(".ly-glow");
  const cap = type(fig.querySelector(".ly-cap")), cap2 = type(fig.querySelector(".ly-cap2"));
  const k = () => (fig.clientWidth || 760) / 760;
  const slabS = slabs.map((g) => springs({ o: 0, y: -26 }, (v) => { setO(g, v.o); g.style.translate = v.y ? `0 ${v.y}px` : "none"; }));
  const labS = labels.map((l) => springs({ o: 0, x: -8 }, (v) => { setO(l, v.o); l.style.translate = v.x ? `${v.x}px 0` : "none"; }));
  const gS = new Spring(0, (v) => { const s = Math.sin(Math.PI * Math.min(1, Math.max(0, v))); glow.style.opacity = s; glow.style.transform = `scale(${0.8 + 0.45 * s})`; });
  void k;
  return {
    playMs: 2072,
    play() {
      cap.play(120); cap2.play(360);
      slabS.forEach((s, i) => s.start({ o: 1, y: 0 }, { configs: { y: OVERSHOOT, o: SPRING }, delay: 240 + i * 120 }));
      labS.forEach((s, i) => s.start({ o: 1, x: 0 }, { config: SPRING, delay: 448 + i * 120 }));
      gS.set(0); gS.start(1, { config: { tension: 60, friction: 20 }, delay: 480 + 208 + 304 });
    },
    reverse() {
      slabS.slice().reverse().forEach((s, i) => s.start({ o: 0, y: -26 }, { config: SPRING, delay: i * 32 }));
      labS.slice().reverse().forEach((s, i) => s.start({ o: 0, x: -8 }, { config: SPRING, delay: i * 32 }));
    },
    reset() { cap.reset(); cap2.reset(); slabS.forEach((s) => s.set({ o: 0, y: -26 })); labS.forEach((s) => s.set({ o: 0, x: -8 })); gS.set(0); },
    rest() { cap.play(0); cap2.play(0); slabS.forEach((s) => s.set({ o: 1, y: 0 })); labS.forEach((s) => s.set({ o: 1, x: 0 })); },
  };
}

// ------------------------------------------------------------ estate
function estateCard(fig) {
  const t1 = type(fig.querySelector('[data-t="t1"]'), 24), t2 = type(fig.querySelector('[data-t="t2"]'), 24);
  const rows = Array.from(fig.querySelectorAll(".es-rows li"));
  const parts = rows.map((li) => {
    const lane = li.querySelector(".es-lane i"), tag = li.querySelector(".es-tag");
    return {
      r: springs({ o: 0, y: 8 }, (v) => { setO(li, v.o); li.style.translate = v.y ? `0 ${v.y}px` : "none"; }),
      g: new Spring(0, (v) => { lane.style.transform = `scaleX(${Math.max(0, v)})`; }),
      t: new Spring(0, (v) => { setO(tag, v); tag.style.transform = `scale(${0.6 + 0.4 * v})`; }),
    };
  });
  return {
    playMs: 2000,
    play() {
      t1.play(240); t2.play(1400);
      parts.forEach((p, i) => {
        p.r.start({ o: 1, y: 0 }, { config: SPRING, delay: 360 + i * 120 });
        p.g.start(1, { config: GROW, delay: 480 + i * 120 });
        p.t.start(1, { config: POPC, delay: 1000 + i * 120 });
      });
    },
    reverse() {
      parts.slice().reverse().forEach((p, i) => { p.t.start(0, { config: SPRING, delay: i * 32 }); p.g.start(0, { config: GROW, delay: i * 32 }); p.r.start({ o: 0, y: 8 }, { config: SPRING, delay: 200 + i * 32 }); });
      setTimeout(() => { t1.reset(); t2.reset(); }, 200);
    },
    reset() { t1.reset(); t2.reset(); parts.forEach((p) => { p.r.set({ o: 0, y: 8 }); p.g.set(0); p.t.set(0); }); },
    rest() { t1.play(0); t2.play(0); parts.forEach((p) => { p.r.set({ o: 1, y: 0 }); p.g.set(1); p.t.set(1); }); },
  };
}

export function initServices() {
  const sec = document.getElementById("product");
  if (!sec) return;
  sec.querySelectorAll("[data-roll]").forEach((el) => {
    const r = roll(el);
    if (reduced) { r.rest(); return; }
    let played = false;
    watchLoop(el, { arm() { if (!played) { played = true; r.play(); } }, disarm() {} });
  });
  const make = { trace: traceCard, approve: approveCard, layers: layersCard, estate: estateCard };
  sec.querySelectorAll("[data-loop]").forEach((fig) => {
    const f = make[fig.dataset.loop];
    if (f) loopCard(fig, f(fig));
  });
}
