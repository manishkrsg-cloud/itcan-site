// 08 Proof: drifting blooms, three looping mini visuals, quotes that focus in.
import { SPRING_QUICK, reduced, ticker, ease } from "../core/engine.js";
import { rise, focus, draw } from "../core/prims.js";
import { watchLoop, onSeen, onView } from "../core/seen.js";
import { getScroll, onScroll } from "../core/scroll.js";

const NS = "http://www.w3.org/2000/svg";
const k = () => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
const HOLD = 2720, FADE = 360, GAP = 280;

function spark(box) {
  const svg = box.querySelector("svg");
  const Y = [52, 46, 48, 40, 42, 34, 28, 30, 22, 24, 16, 18, 10, 12, 4];
  let line, area, dot, rule, halo, len = 1;
  const build = () => {
    const W = Math.max(60, box.clientWidth / k());
    const end = W - 6;
    svg.setAttribute("viewBox", `0 0 ${W} 56`);
    svg.setAttribute("preserveAspectRatio", "none");
    const pts = Y.map((y, i) => [(i / (Y.length - 1)) * end, y]);
    const d = "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L");
    svg.innerHTML = `<defs><linearGradient id="spA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3d48" stop-opacity=".22"/><stop offset="1" stop-color="#ff3d48" stop-opacity="0"/></linearGradient><linearGradient id="spL" gradientUnits="userSpaceOnUse" x1="0" y1="4" x2="${end}" y2="56"><stop offset=".4171" stop-color="#ffd6d9"/><stop offset="1" stop-color="#ff3d48"/></linearGradient><linearGradient id="spR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3d48" stop-opacity=".9"/><stop offset="1" stop-color="#ff3d48" stop-opacity=".1"/></linearGradient></defs>
<path class="a" d="${d}V56H0V52Z" fill="url(#spA)"/><path class="l" d="${d}" fill="none" stroke="url(#spL)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" pathLength="1"/>
<rect class="r" x="${end - 0.5}" y="4" width="1" height="52" fill="url(#spR)"/><circle class="dt" cx="${end}" cy="4" r="3" fill="#ff3d48"/><circle class="h" cx="${end}" cy="4" r="3" fill="none" stroke="#ff3d48"/>`;
    line = svg.querySelector(".l"); area = svg.querySelector(".a"); dot = svg.querySelector(".dt"); rule = svg.querySelector(".r"); halo = svg.querySelector(".h");
    line.style.strokeDasharray = "1 1";
    void len;
  };
  build();
  new ResizeObserver(build).observe(box);
  return {
    PLAY: 1280,
    frame(t) {
      line.style.strokeDashoffset = 1 - ease.inOutCubic(Math.min(1, t / 720));
      area.style.opacity = ease.outCubic(Math.max(0, Math.min(1, (t - 240) / 480)));
      const dp = Math.max(0, Math.min(1, (t - 720) / 96));
      dot.style.opacity = rule.style.opacity = dp;
      const pu = Math.max(0, Math.min(1, (t - 720) / 560));
      halo.setAttribute("r", 3 + 8 * ease.outCubic(pu));
      halo.style.opacity = 0.8 * dp * (1 - pu);
    },
    fade(o) { svg.style.opacity = o; },
  };
}

function bars(box) {
  const svg = box.querySelector("svg");
  let rects = [];
  const build = () => {
    const W = Math.max(60, box.clientWidth / k()), s = W / 384;
    const bw = 20 * s, pitch = 28 * s;
    svg.setAttribute("viewBox", `0 0 ${W} 56`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.width = "100%";
    svg.innerHTML = `<defs><linearGradient id="brG" x1="0" y1="0" x2="1" y2="1"><stop offset=".4171" stop-color="#ffd6d9"/><stop offset="1" stop-color="#ff3d48"/></linearGradient></defs>` +
      Array.from({ length: 11 }, (_, i) => `<rect class="b" x="${(i * pitch).toFixed(2)}" width="${bw.toFixed(2)}" rx="${Math.min(6, bw / 3)}" fill="url(#brG)" y="56" height="0"/>`).join("") +
      Array.from({ length: 3 }, (_, i) => `<rect class="dim" x="${((11 + i) * pitch).toFixed(2)}" width="${bw.toFixed(2)}" rx="${Math.min(6, bw / 3)}" y="22" height="34"/>`).join("");
    rects = Array.from(svg.querySelectorAll("rect.b"));
  };
  build();
  new ResizeObserver(build).observe(box);
  return {
    PLAY: 1000,
    frame(t) {
      rects.forEach((r, i) => {
        const e = ease.outCubic(Math.max(0, Math.min(1, (t - i * 48) / 520)));
        const h = 56 * e;
        r.setAttribute("y", 56 - h); r.setAttribute("height", h);
      });
    },
    fade(o) { svg.style.opacity = o; },
  };
}

function prog(box) {
  const fill = box.querySelector(".pg-fill");
  const p = (t) => {
    if (t < 880) return 0.99 * ease.outCubic(t / 880);
    if (t < 1056) return 0.99;
    if (t < 1184) return 0.99 - 0.018 * ease.outQuad((t - 1056) / 128);
    if (t < 1280) return 0.972;
    return 0.972 + 0.028 * ease.inOutCubic(Math.min(1, (t - 1280) / 336));
  };
  return {
    PLAY: 1616,
    frame(t) { const v = p(t); fill.style.clipPath = v >= 1 ? "none" : `inset(0 ${(1 - v) * 100}% 0 0 round 999px)`; },
    fade(o) { fill.style.opacity = o; },
  };
}

export function initProof() {
  const sec = document.getElementById("proof");
  if (!sec) return;
  // blooms drift with the scroll across the section
  const drifts = Array.from(sec.querySelectorAll(".pf-drift"));
  if (!reduced && drifts.length) {
    let top = 0, h = 1;
    const measure = () => { const r = sec.getBoundingClientRect(); top = r.top + getScroll(); h = r.height; };
    measure(); addEventListener("resize", measure); new ResizeObserver(measure).observe(sec);
    const upd = (y) => {
      const p = Math.max(0, Math.min(1, (y + innerHeight - top) / (h + innerHeight)));
      drifts.forEach((d) => { const dir = +d.dataset.dir; d.style.transform = `translateY(${dir * (-40 + 80 * p) * k()}px)`; });
    };
    onScroll(upd); upd(getScroll());
  }

  const makers = { spark, bars, prog };
  Array.from(sec.querySelectorAll(".pf-col")).forEach((col, i) => {
    const box = col.querySelector(".pf-vis");
    const vis = makers[box.dataset.vis](box);
    const pill = rise(col.querySelector(".pf-pill"));
    const tick = draw(col.querySelector(".pf-tick"));
    const qt = focus(col.querySelector("blockquote"), 8, SPRING_QUICK), nm = focus(col.querySelector("figcaption b"), 8, SPRING_QUICK), rl = focus(col.querySelector("figcaption .mono"), 8, SPRING_QUICK);
    const TOTAL = vis.PLAY + HOLD + FADE + GAP;
    if (reduced) { vis.frame(vis.PLAY); [pill, tick, qt, nm, rl].forEach((c) => c.play(0)); return; }
    [pill, tick, qt, nm, rl].forEach((c) => c.reset());
    vis.frame(0);
    onSeen(col, () => {
      const start = 210 + i * 140;
      pill.play(start + 210 + [880, 1000, 1600][i]);
    });
    onSeen(col.querySelector(".pf-quote"), () => { qt.play(i * 90); nm.play(i * 90 + 150); rl.play(i * 90 + 220); tick.play(i * 90); });
    let off = null, t0 = 0, timer = 0;
    watchLoop(box, {
      arm() {
        clearTimeout(timer);
        timer = setTimeout(() => {
          t0 = performance.now();
          off = ticker.add((now) => {
            const t = (now - t0) % TOTAL;
            if (t < vis.PLAY + HOLD) { vis.fade(1); vis.frame(Math.min(t, vis.PLAY)); }
            else if (t < vis.PLAY + HOLD + FADE) vis.fade(1 - ease.inOutQuad((t - vis.PLAY - HOLD) / FADE));
            else { vis.fade(1); vis.frame(0); }
          }, 16);
        }, i * 112);
      },
      disarm() { clearTimeout(timer); if (off) { off(); off = null; } vis.frame(0); vis.fade(1); },
    });
  });
  void onView;
}
