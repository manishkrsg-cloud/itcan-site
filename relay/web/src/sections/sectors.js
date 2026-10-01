// Sectors: twelve industry cards start as a fanned stack and spread across the screen as you
// scroll, revealing the heading in the middle. Wide screens only; phones and reduced motion
// get the plain image grid from sectors.css.
import { reduced, fine, clamp, smooth, ticker } from "../core/engine.js";
import { onScroll, getScroll, resize as lenisResize } from "../core/scroll.js";
import { rise } from "../core/prims.js";
import { onSeen, whenReleased } from "../core/seen.js";

// rest spot from the centre of the area under the nav bar (x in % of its width, y in % of its
// height), width in u (1u = 1% of min(width, 1.75 x height)),
// a = height / width, and the offset (vw, vh) and angle while stacked. Order = paint order.
const L = [
  { x: -37, y: -27, w: 13, a: 1.2, sx: -5, sy: -5, sr: -14 },
  { x: -17, y: -31, w: 12, a: 1.2, sx: 6, sy: -7, sr: 12 },
  { x: 1, y: -33, w: 11, a: 1.1, sx: -2, sy: -8, sr: -5 },
  { x: 19, y: -29, w: 13, a: 1.2, sx: 7, sy: -3, sr: 15 },
  { x: 38, y: -27, w: 14, a: 1.15, sx: -7, sy: 2, sr: -9 },
  { x: -40, y: 3, w: 12, a: 1.2, sx: 4, sy: 5, sr: 7 },
  { x: 40, y: 5, w: 13, a: 1.1, sx: -6, sy: 6, sr: -6 },
  { x: -33, y: 32, w: 13, a: 1.2, sx: 6, sy: 7, sr: 10 },
  { x: -13, y: 30, w: 12, a: 1.15, sx: -4, sy: 8, sr: -12 },
  { x: 6, y: 33, w: 13, a: 1.1, sx: 3, sy: 3, sr: 4 },
  { x: 24, y: 29, w: 11, a: 1.3, sx: -3, sy: -2, sr: -3 },
  { x: 41, y: 32, w: 12, a: 1.2, sx: 1, sy: 1, sr: 2 },
];
const HOLD = 0.08, END = 0.86, STAGGER = 0.016, STACK_S = 0.86, LEN = 280;
const PAR_X = 1.6, PAR_Y = 1.4; // pointer drift once spread, in vw / vh at full depth

export function initSectors() {
  const sec = document.querySelector("[data-spread]");
  if (!sec) return;
  const stage = sec.querySelector(".ss-stage");
  const cards = Array.from(sec.querySelectorAll(".ss-card"));
  const n = cards.length;
  const wide = matchMedia("(min-width: 1001px) and (min-height: 600px)");

  // grid mode: the cards rise in as the grid comes into view
  const grid = cards.map((c, i) => ({ r: rise(c.querySelector(".ss-face")), d: (i % 4) * 70 + Math.floor(i / 4) * 50 }));
  let gridShown = false;
  const showGrid = () => { gridShown = true; if (!on) grid.forEach((g) => g.r.play(g.d)); };
  if (!reduced) { grid.forEach((g) => g.r.reset()); onSeen(sec.querySelector(".ss-cards"), showGrid); }

  let on = false, top = 0, len = 1, vw = 1, vh = 1, nh = 0, rh = 1, u = 1, last = -9;
  const nav = document.querySelector(".nav");
  let mx = 0, my = 0, cx = 0, cy = 0, drift = null;
  const size = [];

  const measure = () => {
    if (!on) return;
    vw = innerWidth; vh = stage.clientHeight || innerHeight;
    nh = nav ? Math.min(nav.offsetHeight, vh * 0.15) : 0; rh = vh - nh;
    sec.style.setProperty("--ss-top", `${nh}px`);
    u = Math.min(vw, rh * 1.75) / 100;
    cards.forEach((c, i) => {
      const w = L[i].w * u, h = w * L[i].a;
      size[i] = [w, h];
      c.style.width = `${w}px`; c.style.height = `${h}px`;
    });
    top = sec.getBoundingClientRect().top + getScroll();
    len = Math.max(1, sec.offsetHeight - vh);
    last = -9;
    render(getScroll());
  };

  const render = (y) => {
    if (!on) return;
    const raw = (y - top) / len;
    if (raw === last) return;
    last = raw;
    const p = clamp((raw - HOLD) / (END - HOLD));
    const spread = p >= 1 ? 1 : 0;
    cards.forEach((c, i) => {
      const o = L[i], d = (n - 1 - i) * STAGGER;
      const t = smooth(clamp((p - d) / (1 - (n - 1) * STAGGER)));
      const depth = 0.55 + (i / (n - 1)) * 0.75;
      const px = (o.sx + (o.x - o.sx) * t) * vw / 100 - cx * PAR_X * depth * t * vw / 100;
      const py = (o.sy + (o.y - o.sy) * t) * rh / 100 - cy * PAR_Y * depth * t * rh / 100;
      const [w, h] = size[i];
      const r = o.sr * (1 - t), s = STACK_S + (1 - STACK_S) * t;
      c.style.transform = `translate3d(${(vw / 2 + px - w / 2).toFixed(1)}px, ${(nh + rh / 2 + py - h / 2).toFixed(1)}px, 0) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(4)})`;
    });
    const tc = clamp((p - 0.22) / 0.38);
    sec.style.setProperty("--copy", tc.toFixed(3));
    sec.style.setProperty("--copy-s", (0.9 + 0.1 * smooth(clamp((p - 0.22) / 0.6))).toFixed(4));
    sec.style.setProperty("--names", clamp((p - 0.72) / 0.24).toFixed(3));
    sec.style.setProperty("--hint", (1 - clamp(raw / HOLD)).toFixed(3));
    sec.classList.toggle("is-open", spread === 1);
  };

  // gentle pointer drift once the cards have spread (mouse only)
  const kick = () => {
    if (drift) return;
    drift = ticker.add((now, dt) => {
      const k = 1 - Math.exp(-dt / 140);
      cx += (mx - cx) * k; cy += (my - cy) * k;
      last = -9; render(getScroll());
      if (Math.abs(mx - cx) < 0.001 && Math.abs(my - cy) < 0.001) { cx = mx; cy = my; drift(); drift = null; }
    });
  };
  const onMove = (e) => {
    const open = sec.classList.contains("is-open");
    mx = open ? (e.clientX / innerWidth) * 2 - 1 : 0;
    my = open ? (e.clientY / innerHeight) * 2 - 1 : 0;
    kick();
  };

  const set = (want) => {
    if (want === on) return;
    on = want;
    sec.classList.toggle("is-spread", on);
    if (on) {
      sec.style.setProperty("--ss-len", `${LEN}vh`);
      cards.forEach((c) => { c.querySelector(".ss-face").style.cssText = ""; });
      measure();
    } else {
      ["--copy", "--copy-s", "--names", "--hint", "--ss-len", "--ss-top"].forEach((k) => sec.style.removeProperty(k));
      sec.classList.remove("is-open");
      cards.forEach((c) => { c.style.transform = c.style.width = c.style.height = ""; });
      if (gridShown || reduced) grid.forEach((g) => g.r.play(0));
    }
    lenisResize();
  };

  set(!reduced && wide.matches);
  wide.addEventListener("change", () => set(!reduced && wide.matches));
  onScroll(render);
  addEventListener("resize", measure);
  new ResizeObserver(() => { if (on) { const t = sec.getBoundingClientRect().top + getScroll(); if (Math.abs(t - top) > 0.5) measure(); } }).observe(document.body);
  whenReleased(() => requestAnimationFrame(measure));
  if (document.fonts) document.fonts.ready.then(measure);
  if (fine && !reduced) sec.addEventListener("pointermove", onMove, { passive: true });
  sec.addEventListener("pointerleave", () => { mx = my = 0; kick(); });
}
