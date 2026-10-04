// Sectors: ten industry cards start as a fanned stack and spread across the screen as you
// scroll, revealing the heading in the middle. Wide screens only; phones and reduced motion
// get the plain image grid from sectors.css.
import { reduced, fine, clamp, smooth, ticker } from "../core/engine.js";
import { onScroll, getScroll, resize as lenisResize } from "../core/scroll.js";
import { rise } from "../core/prims.js";
import { onSeen, whenReleased } from "../core/seen.js";

// rest spot from the centre of the area under the nav bar (x in % of its width, y in % of its
// height), width in u (1u = 1% of min(width, 1.6 x height)), in two straight rows of five,
// a = height / width, and the offset (vw, vh) and angle while stacked. Order = paint order.
const L = [
  // top row
  { x: -36, y: -30, w: 14, a: 1.1, sx: -5, sy: -5, sr: -14 },
  { x: -18, y: -30, w: 14, a: 1.1, sx: 6, sy: -7, sr: 12 },
  { x: 0, y: -30, w: 14, a: 1.1, sx: -2, sy: -8, sr: -5 },
  { x: 18, y: -30, w: 14, a: 1.1, sx: 7, sy: -3, sr: 15 },
  { x: 36, y: -30, w: 14, a: 1.1, sx: -7, sy: 2, sr: -9 },
  // bottom row
  { x: -36, y: 30, w: 14, a: 1.1, sx: 4, sy: 5, sr: 7 },
  { x: -18, y: 30, w: 14, a: 1.1, sx: -6, sy: 6, sr: -6 },
  { x: 0, y: 30, w: 14, a: 1.1, sx: 6, sy: 7, sr: 10 },
  { x: 18, y: 30, w: 14, a: 1.1, sx: -4, sy: 8, sr: -12 },
  { x: 36, y: 30, w: 14, a: 1.1, sx: 1, sy: 1, sr: 3 },
];
// phones (portrait): the same stack-to-spread with small cards, two rows above the heading (3 + 2), two below (2 + 3).
// row = which band (-2 outer top ... 2 outer bottom); measure() packs the rows against the heading in px, so tall
// phones don't open a big empty gap between the cards and the title.
const LP = [
  { x: -32, y: -40, w: 22, row: -2, a: 1.1, sx: -5, sy: -5, sr: -14 },
  { x: 0, y: -40, w: 22, row: -2, a: 1.1, sx: 6, sy: -7, sr: 12 },
  { x: 32, y: -40, w: 22, row: -2, a: 1.1, sx: -2, sy: -8, sr: -5 },
  { x: -16, y: -25, w: 22, row: -1, a: 1.1, sx: 7, sy: -3, sr: 15 },
  { x: 16, y: -25, w: 22, row: -1, a: 1.1, sx: -7, sy: 2, sr: -9 },
  { x: -16, y: 25, w: 22, row: 1, a: 1.1, sx: 4, sy: 5, sr: 7 },
  { x: 16, y: 25, w: 22, row: 1, a: 1.1, sx: -6, sy: 6, sr: -6 },
  { x: -32, y: 40, w: 22, row: 2, a: 1.1, sx: 6, sy: 7, sr: 10 },
  { x: 0, y: 40, w: 22, row: 2, a: 1.1, sx: -4, sy: 8, sr: -12 },
  { x: 32, y: 40, w: 22, row: 2, a: 1.1, sx: 1, sy: 1, sr: 3 },
];
const LEN_PHONE = 150;
const P_ROW_GAP = 3, P_COPY_GAP = 6; // phones: vw between card rows, and between the heading and the nearest row
const HOLD = 0.08, END = 0.86, STAGGER = 0.016, STACK_S = 0.86, LEN = 280;
const PAR_X = 1.6, PAR_Y = 1.4; // pointer drift once spread, in vw / vh at full depth

export function initSectors() {
  const sec = document.querySelector("[data-spread]");
  if (!sec) return;
  const stage = sec.querySelector(".ss-stage");
  const cards = Array.from(sec.querySelectorAll(".ss-card"));
  const n = cards.length;
  const wide = matchMedia("(min-width: 1001px) and (min-height: 600px)");
  const phone = matchMedia("(max-width: 580px) and (min-height: 560px)");
  let lay = L;

  // grid mode (phones, tablets): each card rises in as it scrolls into view, staggered across its row,
  // so the lower rows of a five-row phone grid still animate when you reach them
  const grid = cards.map((c) => ({ r: rise(c.querySelector(".ss-face"), undefined, 32), shown: false }));
  const colOf = (c) => cards.filter((o) => Math.abs(o.offsetTop - c.offsetTop) < 4).indexOf(c);
  const showCard = (i) => { const g = grid[i]; if (g.shown) return; g.shown = true; if (!on) g.r.play(Math.max(0, colOf(cards[i])) * 90); };
  if (!reduced) { grid.forEach((g) => g.r.reset()); cards.forEach((c, i) => onSeen(c, () => showCard(i), "0px 0px -12% 0px")); }

  let on = false, top = 0, len = 1, vw = 1, vh = 1, nh = 0, rh = 1, u = 1, last = -9;
  const nav = document.querySelector(".nav");
  let mx = 0, my = 0, cx = 0, cy = 0, drift = null;
  const size = [];
  const rowY = []; // phones: resting y offset in px from the centre, per card (null = use lay[i].y)
  const copy = sec.querySelector(".ss-copy");

  const measure = () => {
    if (!on) return;
    vw = innerWidth; vh = stage.clientHeight || innerHeight;
    nh = nav ? Math.min(nav.offsetHeight, vh * 0.15) : 0; rh = vh - nh;
    lay = phone.matches ? LP : L;
    sec.style.setProperty("--ss-top", `${nh}px`);
    u = Math.min(vw, rh * 1.6) / 100;
    cards.forEach((c, i) => {
      const w = lay[i].w * u, h = w * lay[i].a;
      size[i] = [w, h];
      c.style.width = `${w}px`; c.style.height = `${h}px`;
    });
    rowY.length = 0;
    if (lay === LP) {
      const h = size[0][1], ch = copy ? copy.offsetHeight : 0;
      const inner = ch / 2 + (P_COPY_GAP * vw) / 100 + h / 2, outer = inner + h + (P_ROW_GAP * vw) / 100;
      lay.forEach((o, i) => { rowY[i] = Math.sign(o.row) * (Math.abs(o.row) === 1 ? inner : outer); });
    }
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
      const o = lay[i], d = (n - 1 - i) * STAGGER;
      const t = smooth(clamp((p - d) / (1 - (n - 1) * STAGGER)));
      const depth = 0.55 + (i / (n - 1)) * 0.75;
      const px = (o.sx + (o.x - o.sx) * t) * vw / 100 - cx * PAR_X * depth * t * vw / 100;
      const ty = rowY[i] ?? (o.y * rh) / 100;
      const py = (o.sy * rh) / 100 * (1 - t) + ty * t - cy * PAR_Y * depth * t * rh / 100;
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
      sec.style.setProperty("--ss-len", `${phone.matches ? LEN_PHONE : LEN}vh`); // phones: a shorter pin, the fan-out still completes
      cards.forEach((c) => { c.querySelector(".ss-face").style.cssText = ""; });
      measure();
    } else {
      ["--copy", "--copy-s", "--names", "--hint", "--ss-len", "--ss-top"].forEach((k) => sec.style.removeProperty(k));
      sec.classList.remove("is-open");
      cards.forEach((c) => { c.style.transform = c.style.width = c.style.height = ""; });
      grid.forEach((g) => { if (g.shown || reduced) g.r.play(0); });
    }
    lenisResize();
  };

  const want = () => !reduced && (wide.matches || phone.matches);
  set(want());
  wide.addEventListener("change", () => set(want()));
  phone.addEventListener("change", () => { if (on) { set(false); } set(want()); });
  onScroll(render);
  addEventListener("resize", measure);
  new ResizeObserver(() => { if (on) { const t = sec.getBoundingClientRect().top + getScroll(); if (Math.abs(t - top) > 0.5) measure(); } }).observe(document.body);
  whenReleased(() => requestAnimationFrame(measure));
  if (document.fonts) document.fonts.ready.then(measure);
  if (fine && !reduced) sec.addEventListener("pointermove", onMove, { passive: true });
  sec.addEventListener("pointerleave", () => { mx = my = 0; kick(); });
}
