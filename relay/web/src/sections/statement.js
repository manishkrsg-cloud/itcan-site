// 05 Statement: one timeline keyed off the LogoOpen iris (data-open), replayed every visit.
import { Spring, springs, SPRING, SPRING_SOFT, DROP, POP, reduced, fine, ticker, ease, tween, clamp } from "../core/engine.js";
import { type } from "../core/prims.js";
import { onView } from "../core/seen.js";

const NOW_P = 0.5, CREST = 0.06, EDGE = 0.03;
const crest = (w, p) => { const d = Math.abs(w - p) / CREST; return d >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * d); };
const frameW = () => (innerWidth <= 580 ? 350 : innerWidth <= 900 ? 688 : innerWidth <= 1200 ? 928 : 1280);

export function initStatement() {
  const sec = document.getElementById("statement");
  if (!sec) return;
  const wrap = sec.closest("[data-open]");
  const q = (s) => sec.querySelector(s);
  const mark = q(".st-mark"), glyph = q(".st-glyph"), stem = q(".st-stem"), nowL = q(".st-now"), dot = q(".st-dot"), flash = q(".st-flash");
  const words = Array.from(sec.querySelectorAll(".st-title .w"));
  const acc = words.find((w) => w.classList.contains("acc"));
  const plain = words.filter((w) => w !== acc);
  const kicker = type(q('[data-st="kicker"]')), cap = type(q('[data-st="cap"]'));
  const hours = Array.from(sec.querySelectorAll(".st-hours li"));
  const ticksSvg = q(".st-ticks");

  // ---- ruler ticks (121 slots, "now" slot skipped)
  let ticks = [];
  const buildTicks = () => {
    const W = frameW();
    ticksSvg.setAttribute("viewBox", `0 0 ${W + 2} 18`);
    let d = "";
    ticks = [];
    ticksSvg.innerHTML = "";
    for (let i = 0; i <= 120; i++) {
      if (i === 60) continue;
      const x = 1 + (i * W) / 120;
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const big = i % 12 === 0, mid = i % 6 === 0;
      p.setAttribute("d", `M${x} ${big ? 0 : mid ? 7 : 12}V18`);
      p.setAttribute("stroke-width", big ? 2 : 1);
      ticksSvg.appendChild(p);
      ticks.push({ el: p, p: i / 120 });
    }
    void d;
  };
  buildTicks();

  // ---- springs
  const markS = springs({ y: -40, o: 0 }, (v) => { mark.style.opacity = v.o >= 1 ? "1" : Math.max(0, v.o); mark.style.transform = v.y ? `translateY(${v.y}px)` : "none"; });
  const wordS = plain.map((w) => springs({ o: 0, y: 22 }, (v) => { w.style.opacity = v.o >= 1 ? "1" : Math.max(0, v.o); w.style.transform = v.y ? `translateY(${v.y}px)` : "none"; }));
  const accS = springs({ o: 0, y: 28, k: -16 }, (v) => { acc.style.opacity = v.o >= 1 ? "1" : Math.max(0, v.o); acc.style.transform = v.y || v.k ? `translateY(${v.y}px) skewX(${v.k}deg)` : "none"; });
  const stemS = new Spring(0, (v) => { stem.style.transform = `scaleY(${Math.max(0, v)})`; });
  let bump = 0;
  const nowS = new Spring(0, (v) => {
    const s = Math.max(0, v);
    dot.style.opacity = s > 0 ? "1" : "0";
    dot.style.transform = `scale(${s * (1 + 0.6 * bump)})`;
    nowL.style.opacity = clamp(s);
    nowL.style.transform = `translateY(${(1 - Math.min(1, s)) * 6}px)`;
  });
  const chev = new Spring(0, (v) => { glyph.style.transform = v ? `translateY(${-v}px)` : "none"; });

  // ---- wave
  let wave = -0.12, shown = false;
  const drawWave = (w) => {
    wave = w;
    for (const t of ticks) {
      const c = crest(w, t.p);
      const rv = shown ? 1 : clamp((w - t.p + EDGE) / EDGE);
      t.el.style.opacity = rv * (0.35 + 0.4 * c);
      t.el.style.transform = `scaleY(${(0.2 + 0.8 * rv) * (1 + 0.5 * c)})`;
    }
    hours.forEach((h, i) => { h.style.opacity = shown ? 1 : clamp((w - (i * 24) / 120 + EDGE) / EDGE); });
    const ft = (w - 0.5) / 0.22;
    flash.style.transform = `scale(${1 + 2.2 * clamp(ft)})`;
    flash.style.opacity = ft > 0 && ft < 1 ? 0.6 * (1 - ft) : 0;
    bump = crest(w, NOW_P);
    nowS.onChange(nowS.value);
  };

  // ---- timeline
  let T = [], seen = false, inView = false, waveTw = null, loopT = 0, chevT = 0;
  const at = (ms, fn) => T.push(setTimeout(fn, ms));
  const reset = () => {
    T.forEach(clearTimeout); T = [];
    waveTw && waveTw.stop(); clearTimeout(loopT); clearInterval(chevT);
    markS.set({ y: -40, o: 0 }); wordS.forEach((s) => s.set({ o: 0, y: 22 })); accS.set({ o: 0, y: 28, k: -16 });
    stemS.set(0); nowS.set(0); kicker.reset(); cap.reset(); chev.set(0);
    drawWave(-0.12);
  };
  const passLoop = () => {
    if (!inView || !seen) return;
    loopT = setTimeout(() => {
      if (!inView || !seen) return;
      waveTw = tween(1600, ease.inOutSine, (e) => drawWave(-0.12 + 1.24 * e), passLoop);
    }, 3600);
  };
  const play = () => {
    markS.start({ y: 0, o: 1 }, { configs: { y: DROP, o: SPRING } });
    wordS.forEach((s, i) => s.start({ o: 1, y: 0 }, { config: SPRING, delay: 380 + i * 60 }));
    accS.start({ o: 1, y: 0, k: 0 }, { config: SPRING_SOFT, delay: 380 + plain.length * 60 });
    kicker.play(460);
    stemS.start(1, { config: SPRING_SOFT, delay: 1150 });
    nowS.start(1, { config: POP, delay: 1600 });
    at(1750, () => { waveTw = tween(1600, ease.linear, (e) => drawWave(-0.12 + 1.24 * e), () => { shown = true; drawWave(1.12); passLoop(); }); });
    cap.play(1800);
    chevT = setInterval(() => {
      if (!seen || !inView) return;
      chev.start(5, { config: SPRING });
      setTimeout(() => chev.start(0, { config: SPRING }), 200);
    }, 4000);
  };

  if (reduced) {
    markS.set({ y: 0, o: 1 }); wordS.forEach((s) => s.set({ o: 1, y: 0 })); accS.set({ o: 1, y: 0, k: 0 });
    stemS.set(1); nowS.set(1); kicker.play(0); cap.play(0); shown = true; drawWave(1.12);
    return;
  }
  reset();
  const check = () => {
    const now = wrap ? wrap.dataset.open === "true" : inView;
    if (now === seen) return;
    seen = now;
    if (seen) play(); else { reset(); }
  };
  if (wrap) new MutationObserver(check).observe(wrap, { attributes: true, attributeFilter: ["data-open"] });
  onView(sec, (hit) => {
    inView = hit;
    if (!hit) { waveTw && waveTw.stop(); clearTimeout(loopT); shown = false; }
    else if (seen && shown) passLoop();
    if (!wrap) check();
  });
  addEventListener("resize", () => { const s = shown; buildTicks(); shown = s; drawWave(wave); });

  // ---- dot field pointer swell (canvas)
  if (!fine) return;
  const canvas = q(".st-canvas"), dotsSvg = q(".st-dots");
  const ctx = canvas.getContext("2d");
  const COLS = 30, ROWS = 11, PITCH = 48, R0 = 1.5, RADIUS = 120;
  const sc = new Float32Array(COLS * ROWS).fill(1), vel = new Float32Array(COLS * ROWS), tgt = new Float32Array(COLS * ROWS).fill(1);
  let off = null, last = 0;
  const color = getComputedStyle(dotsSvg).color;
  const loop = (now) => {
    const dt = Math.min(0.032, (now - (last || now)) / 1000); last = now;
    let moving = false;
    for (let i = 0; i < sc.length; i++) {
      vel[i] += (170 * (tgt[i] - sc[i]) - 11 * vel[i]) * dt;
      sc[i] += vel[i] * dt;
      if (Math.abs(sc[i] - 1) > 0.002 || Math.abs(vel[i]) > 0.002 || tgt[i] !== 1) moving = true;
    }
    const k = (parseFloat(getComputedStyle(document.documentElement).fontSize) / 16) * (devicePixelRatio || 1);
    const w = canvas.clientWidth * (devicePixelRatio || 1), h = canvas.clientHeight * (devicePixelRatio || 1);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.clearRect(0, 0, w, h);
    if (!moving) { dotsSvg.style.visibility = ""; off(); off = null; last = 0; return; }
    dotsSvg.style.visibility = "hidden";
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c, x = (25.5 + c * PITCH) * k, y = (25.5 + r * PITCH) * k;
      ctx.moveTo(x + R0 * sc[i] * k, y);
      ctx.arc(x, y, R0 * sc[i] * k, 0, Math.PI * 2);
    }
    ctx.fill();
  };
  sec.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const r = sec.getBoundingClientRect(), k = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
    const px = (e.clientX - r.left) / k, py = (e.clientY - r.top) / k;
    for (let rr = 0; rr < ROWS; rr++) for (let c = 0; c < COLS; c++) {
      const d = Math.hypot(25.5 + c * PITCH - px, 25.5 + rr * PITCH - py);
      const f = d < RADIUS ? 1 - (d / RADIUS) ** 2 : 0;
      tgt[rr * COLS + c] = 1 + (2.4 - 1) * f * f;
    }
    if (!off) off = ticker.add(loop);
  });
  sec.addEventListener("pointerleave", () => { tgt.fill(1); if (!off) off = ticker.add(loop); });
}
