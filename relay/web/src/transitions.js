// Block-to-block hand-offs (ScrollBlur, LogoOpen) and the cursor ring.
import { springs, Spring, SPRING, ticker, reduced, fine, clamp, mix, smooth } from "./core/engine.js";
import { getScroll, onScroll } from "./core/scroll.js";
import { onView, whenReleased } from "./core/seen.js";

// ------------------------------------------------------------ ScrollBlur
const DRIFT = 48, ENTER_FROM = 0.6, LEAVE_TO = 0.25;
export function initScrollBlur() {
  if (reduced) return;
  document.querySelectorAll("[data-sb]").forEach((wrap) => {
    const inner = wrap.firstElementChild;
    const flags = wrap.dataset.sb.split(/\s+/);
    const enter = flags.includes("enter"), leave = flags.includes("leave"), still = flags.includes("still");
    const drift = still ? 0 : DRIFT;
    let docTop = 0, height = 0, vh = innerHeight, k = 1;
    const measure = () => {
      docTop = wrap.getBoundingClientRect().top + getScroll();
      height = wrap.offsetHeight; vh = innerHeight;
      k = (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16;
    };
    const sp = springs({ o: 1, y: 0 }, (v) => {
      inner.style.opacity = v.o >= 0.999 ? "" : v.o;
      inner.style.transform = Math.abs(v.y) < 0.01 ? "" : `translate3d(0,${v.y}px,0)`;
    });
    let key = NaN, off = null;
    const tick = () => {
      const top = docTop - getScroll(), bottom = top + height;
      let o = 1, y = 0;
      if (enter) { const p = clamp((vh - top) / (vh / 2)); o *= mix(ENTER_FROM, 1, p); y += mix(drift * k, 0, p); }
      if (leave) { const p = clamp((vh / 2 - bottom) / (vh / 2)); o *= mix(1, LEAVE_TO, p); y += mix(0, -drift * k, p); }
      const nk = Math.round(o * 1e4) + y;
      if (nk !== key) { key = nk; sp.start({ o, y }, { config: SPRING }); }
    };
    measure();
    new ResizeObserver(measure).observe(wrap);
    addEventListener("resize", measure);
    whenReleased(() => setTimeout(measure, 50));
    onView(wrap, (hit) => {
      if (hit && !off) { measure(); off = ticker.add(tick); }
      else if (!hit && off) { tick(); off(); off = null; }
    });
  });
}

// ------------------------------------------------------------ LogoOpen
const PIN = 240, OPEN = 300, CLOSE = 320, CLOSE_LEAD = 0, POP = 60, FLIGHT = 300, TILE_ROUND = 24 / 76;
function foldBox(g, w, h, cx, cy, tile, plateRound, curve = smooth) {
  const side0 = Math.max(tile, 2 * Math.min(cx, w - cx, cy, h - cy));
  if (g < 0.5) {
    const t = curve(Math.max(g, 0) / 0.5);
    const half = (tile + (side0 - tile) * t) / 2;
    return { top: cy - half, left: cx - half, bottom: h - (cy + half), right: w - (cx + half), round: half * 2 * TILE_ROUND };
  }
  const t = curve(Math.min(g, 1) * 2 - 1);
  const half = side0 / 2;
  return {
    top: (cy - half) * (1 - t), right: (w - (cx + half)) * (1 - t), bottom: (h - (cy + half)) * (1 - t), left: (cx - half) * (1 - t),
    round: side0 * TILE_ROUND * (1 - t) + plateRound * t,
  };
}
export function fold(g, w, h, cx, cy, tile, plateRound, curve) {
  if (g <= 0) return "inset(50%)";
  const { top, right, bottom, left, round } = foldBox(g, w, h, cx, cy, tile, plateRound, curve);
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${round}px)`;
}

export function initLogoOpen() {
  const wrap = document.querySelector(".logo-open-wrap");
  if (!wrap) return;
  const plate = wrap.querySelector(".logo-open");
  const section = plate.querySelector("section");
  const mark = plate.querySelector("[data-statement-mark]");
  const target = document.querySelector("[data-logo-target]");
  const flight = document.querySelector(".logo-open-flight");
  const cover = flight && flight.querySelector(".flight-cover");
  if (reduced) {
    wrap.dataset.reduced = "true"; wrap.dataset.open = "true";
    plate.style.setProperty("--grow", 1); plate.style.clipPath = "none";
    return;
  }
  let k = 1, plateRound = 32, markSize = 76, mx = 0, my = 0, short = false;
  const lin = (t) => t;
  const nav = document.querySelector(".nav");
  const measure = () => {
    k = (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16;
    plateRound = parseFloat(getComputedStyle(section).borderTopLeftRadius) || 32;
    markSize = mark.offsetWidth;
    mx = mark.offsetLeft + markSize / 2;
    my = mark.offsetTop + mark.offsetHeight / 2;
    plate.style.setProperty("--mx", `${mx}px`);
    plate.style.setProperty("--my", `${my}px`);
    plate.style.setProperty("--msize", `${markSize}px`);
    update();
  };
  function update() {
    const vh = innerHeight, plateH = plate.offsetHeight, plateW = plate.offsetWidth;
    // a screen shorter than the plate (a phone held sideways) shows the plate as a plain card
    const isShort = vh < plateH + (nav ? nav.offsetHeight : 0) + 16;
    if (isShort !== short) {
      short = isShort;
      wrap.dataset.reduced = short ? "true" : "false";
      if (!short) { requestAnimationFrame(measure); return; }
    }
    if (short) {
      wrap.dataset.open = "true";
      plate.style.setProperty("--grow", 1); plate.style.setProperty("--flying", 0);
      plate.style.clipPath = "none";
      if (target) { target.style.opacity = ""; delete target.dataset.flying; }
      if (flight) flight.hidden = true;
      return;
    }
    const wrapTop = wrap.getBoundingClientRect().top;
    const to = target ? target.getBoundingClientRect() : null;
    const from = mark.getBoundingClientRect();
    const pinTop = (vh - plateH) / 2;
    const s = pinTop - wrapTop;
    const seenAt = pinTop + my - vh;
    const openEnd = seenAt + POP * k + OPEN * k;
    const closeStart = (PIN - CLOSE_LEAD) * k, closeEnd = closeStart + CLOSE * k;
    const pop = smooth(clamp((s - seenAt) / (POP * k)));
    const opening = clamp((s - seenAt - POP * k) / (OPEN * k));
    const closing = clamp((closeEnd - s) / (CLOSE * k));
    plate.style.setProperty("--pop", pop);
    plate.style.setProperty("--shift", "0px");
    const grow = smooth(Math.min(opening, closing));
    plate.style.setProperty("--grow", grow);
    plate.style.clipPath = fold(grow, plateW, plateH, mx, my, markSize, plateRound, lin);
    if (s >= openEnd) wrap.dataset.open = "true";
    if (s < seenAt) wrap.dataset.open = "false";
    const t = clamp((s - closeEnd) / (FLIGHT * k));
    const flying = t > 0 && t < 1;
    if (s > closeEnd) wrap.dataset.open = "false";
    plate.style.setProperty("--flying", t > 0 ? 1 : 0);
    if (target) { target.style.opacity = flying ? 0 : ""; if (flying) target.dataset.flying = "1"; else delete target.dataset.flying; }
    if (flight) {
      flight.hidden = !flying;
      if (flying && to) {
        const e = smooth(t);
        const size = from.width + (to.width - from.width) * e;
        const x = from.left + (to.left - from.left) * e;
        const y = from.top + (to.top - from.top) * e;
        flight.style.transform = `translate(${x}px, ${y}px)`;
        flight.style.width = flight.style.height = `${size}px`;
        if (cover) cover.style.opacity = clamp((e - 0.35) / 0.5);
      }
    }
  }
  onScroll(update);
  addEventListener("resize", measure);
  whenReleased(() => requestAnimationFrame(measure));
  if (document.fonts) document.fonts.ready.then(measure);
  measure();
}

// ------------------------------------------------------------ cursor ring
export function initCursor() {
  if (!fine || reduced) return;
  const ring = document.createElement("div");
  ring.className = "cursor-ring";
  ring.setAttribute("aria-hidden", "true");
  ring.innerHTML = '<span class="cursor-fill"></span>';
  document.body.appendChild(ring);
  const fill = ring.firstChild;
  const FOLLOW = { tension: 210, friction: 24, mass: 1 };
  const SHAPE = { tension: 400, friction: 30 };
  let px = -200, py = -200, placed = false;
  const pos = springs({ x: -200, y: -200 }, render);
  const shape = springs({ size: 28, fill: 0, press: 1, show: 1 }, render);
  function render() {
    const p = pos.vals, s = shape.vals;
    ring.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%) scale(${s.press})`;
    ring.style.width = ring.style.height = `${s.size}px`;
    ring.style.opacity = s.show;
    fill.style.opacity = s.fill;
  }
  const INTERACTIVE = "a, button, input, textarea, select, label, [role='button'], [role='radio'], [role='slider'], [role='tab']";
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    px = e.clientX; py = e.clientY;
    if (!placed) { placed = true; pos.set({ x: px, y: py }); }
    else pos.start({ x: px, y: py }, { config: FOLLOW });
    const t = e.target;
    const none = t.closest && t.closest("[data-cursor='none']");
    const hot = t.closest && t.closest(INTERACTIVE);
    shape.start({ size: hot ? 44 : 28, fill: hot ? 0.12 : 0, show: none ? 0 : 1 }, { config: SHAPE });
  }, { passive: true });
  document.addEventListener("pointerleave", () => { placed = false; pos.set({ x: -200, y: -200 }); });
  addEventListener("blur", () => { placed = false; pos.set({ x: -200, y: -200 }); });
  addEventListener("pointerdown", () => shape.start({ press: 0.82 }, { config: SHAPE }));
  addEventListener("pointerup", () => shape.start({ press: 1 }, { config: SHAPE }));
  render();
}
