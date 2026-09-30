// Shared entrance primitives, driven by data attributes:
//   data-a="rise|fade|focus|type|draw|drawy|pulse|count|pop"  data-d="delay ms"
//   data-of="#id" (play when that element is seen instead of self)
//   focus: data-blur (10 default, 8 for body copy); type: data-ms (30)
import { Spring, springs, SPRING, SPRING_SOFT, reduced, ease, tween } from "./engine.js";
import { onSeen } from "./seen.js";

const px = (n) => `${n}px`;
const R = () => (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16;

export function rise(el, cfg = SPRING, dist = 24) {
  const s = springs({ o: 0, y: dist }, (v) => {
    el.style.opacity = v.o >= 1 ? "1" : v.o;
    el.style.transform = v.y === 0 ? "none" : `translate3d(0,${v.y * R()}px,0)`;
  });
  return {
    play(delay = 0) { s.start({ o: 1, y: 0 }, { config: cfg, delay }); },
    reset() { s.set({ o: 0, y: dist }); },
    s,
  };
}

export function fade(el, cfg = SPRING_SOFT) {
  const sp = new Spring(0, (v) => { el.style.opacity = v >= 1 ? "1" : v; });
  return { play(delay = 0) { sp.start(1, { config: cfg, delay }); }, reset() { sp.set(0); }, sp };
}

export function focus(el, blur = 10, cfg = SPRING_SOFT) {
  const sp = new Spring(0, (p) => {
    const st = el.style;
    if (p >= 1) { st.opacity = "1"; st.filter = "none"; st.maskImage = st.webkitMaskImage = "none"; return; }
    st.opacity = Math.max(0, p);
    st.filter = `blur(${((1 - p) * blur).toFixed(2)}px)`;
    const r = p * 140;
    st.maskImage = st.webkitMaskImage = `linear-gradient(90deg, #000 ${r - 40}%, transparent ${r}%)`;
  });
  return { play(delay = 0) { sp.start(1, { config: cfg, delay }); }, reset() { sp.set(0); }, sp };
}

// Labels reveal left to right with a soft wipe (works for any typeface).
export function type(el, ms = 30) {
  const text = el.textContent;
  const len = text.length;
  let tw = null;
  const draw = (p) => { el.style.clipPath = p >= 1 ? "none" : `inset(-0.2em ${((1 - p) * 100).toFixed(2)}% -0.2em 0)`; };
  return {
    play(delay = 0, onDone) {
      tw && tw.stop();
      if (reduced) { draw(1); onDone && onDone(); return; }
      tw = tween(Math.min(900, Math.max(320, len * 24)), ease.outQuad, (t) => draw(t), onDone, delay);
    },
    reset() { tw && tw.stop(); draw(0); },
    get length() { return len; },
  };
}

export function draw(el, axis = "x", cfg = SPRING_SOFT) {
  const sp = new Spring(0, (p) => { el.style.transform = p >= 1 ? "none" : `scale${axis.toUpperCase()}(${Math.max(0, p)})`; });
  return { play(delay = 0) { sp.start(1, { config: cfg, delay }); }, reset() { sp.set(0); }, sp };
}

export function pulse(el) {
  const halo = el.querySelector(".halo") || el;
  const sp = new Spring(0, (p) => {
    halo.style.transform = `scale(${1 + 1.6 * p})`;
    halo.style.opacity = p >= 1 ? 0 : 0.8 * (1 - p);
  });
  return { play(delay = 250) { sp.start(1, { config: SPRING_SOFT, delay }); }, reset() { sp.set(0); } };
}

export function pop(el, cfg = SPRING) {
  const sp = new Spring(0, (p) => {
    el.style.opacity = p >= 1 ? "1" : Math.max(0, Math.min(1, p));
    el.style.transform = p >= 1 ? "none" : `scale(${0.6 + 0.4 * p})`;
  });
  return { play(delay = 0) { sp.start(1, { config: cfg, delay }); }, reset() { sp.set(0); } };
}

// Counts 0 -> value over 1400 ms easeOutCubic, tabular while counting.
export function count(el, dur = 1400) {
  const to = parseFloat(el.dataset.to || el.textContent.replace(/[^\d.]/g, "")) || 0;
  const final = el.dataset.final || el.textContent;
  const suffix = el.dataset.suffix || "";
  const fmt = new Intl.NumberFormat("en-US");
  let tw = null;
  const show = (v) => { el.textContent = fmt.format(Math.round(v)) + suffix; };
  return {
    play(delay = 0) {
      tw && tw.stop();
      el.style.fontVariantNumeric = "tabular-nums";
      tw = tween(dur, ease.outCubic, (t) => show(to * t), () => { el.textContent = final; el.style.fontVariantNumeric = ""; }, delay);
    },
    reset() { tw && tw.stop(); show(0); },
  };
}

const makers = {
  rise: (el) => rise(el),
  fade: (el) => fade(el),
  focus: (el) => focus(el, parseFloat(el.dataset.blur || "10")),
  type: (el) => type(el, parseFloat(el.dataset.ms || "30")),
  draw: (el) => draw(el, "x"),
  drawy: (el) => draw(el, "y"),
  pulse: (el) => pulse(el),
  pop: (el) => pop(el),
  count: (el) => count(el),
};

// Wire every [data-a] under root. Returns the controllers so sections can replay.
export function initPrims(root = document) {
  const all = [];
  root.querySelectorAll("[data-a]").forEach((el) => {
    if (el.__a) return;
    const kinds = el.dataset.a.split(/\s+/);
    const ctrls = kinds.map((k) => makers[k] && makers[k](el)).filter(Boolean);
    el.__a = ctrls;
    if (reduced) { ctrls.forEach((c) => { c.play(0); }); return; }
    ctrls.forEach((c) => c.reset());
    if (el.hasAttribute("data-manual")) return;
    const delay = parseFloat(el.dataset.d || "0");
    const of = el.dataset.of;
    const trigger = of ? (of === "parent" ? el.parentElement : document.querySelector(of)) : el;
    onSeen(trigger || el, () => ctrls.forEach((c) => c.play(delay)));
    all.push(el);
  });
  return all;
}

export const playEl = (el, delay = 0) => el && el.__a && el.__a.forEach((c) => c.play(delay));
export const resetEl = (el) => el && el.__a && el.__a.forEach((c) => c.reset());
export { px };
