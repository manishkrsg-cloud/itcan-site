// Loader: a red line runs round the screen edge as real load progress, floods the
// screen, then folds screen -> square -> the 76px ITCAN tile, uncovering the hero.
import { Spring, tween, ease } from "./core/engine.js";
import { release } from "./core/seen.js";

const MAX_WAIT = 1600;
const CLOSED = 0.96;
const FULL = 0.97;
const TILE_ROUND = 24 / 76;

export function runPreloader(onDone) {
  const html = document.documentElement;
  const root = document.querySelector("[data-preloader]");
  if (!root || !html.hasAttribute("data-preload")) { root && root.remove(); release(); onDone && onDone(); return; }

  const svg = root.querySelector(".pl-ring");
  const rect = svg.querySelector("rect");
  const stage = root.querySelector(".pl-stage");
  const flood = root.querySelector(".pl-flood");
  const plate = root.querySelector(".pl-plate");
  const tile = root.querySelector(".pl-tile");
  const dark = root.querySelector(".pl-tile .mark--dark");

  let w = innerWidth, h = innerHeight, k = 1;
  const measure = () => {
    w = innerWidth; h = innerHeight;
    k = (parseFloat(getComputedStyle(html).fontSize) || 16) / 16;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const i = 8 * k;
    rect.setAttribute("x", i); rect.setAttribute("y", i);
    rect.setAttribute("width", Math.max(0, w - 2 * i)); rect.setAttribute("height", Math.max(0, h - 2 * i));
    rect.setAttribute("rx", 24 * k); rect.setAttribute("stroke-width", 2 * k);
  };
  measure();
  addEventListener("resize", measure);

  // ---- progress
  let progress = 0.04;
  const imgs = Array.from(document.images).filter((i) => i.loading !== "lazy");
  let loaded = 0, fonts = 0;
  const DRAW = { tension: 150, friction: 26 };
  const raise = (p) => { if (p > progress) { progress = p; d.start(progress, { config: DRAW }); } };
  const update = () => raise(0.04 + (0.76 * (loaded + fonts)) / (imgs.length + 1));
  imgs.forEach((im) => {
    if (im.complete) loaded++;
    else { const f = () => { loaded++; update(); }; im.addEventListener("load", f, { once: true }); im.addEventListener("error", f, { once: true }); }
  });

  // ---- phase 1: draw
  let phase = "draw";
  const d = new Spring(0, (v) => {
    rect.style.strokeDashoffset = 100 * (1 - v);
    if (phase === "draw" && v >= CLOSED) startFlood();
  });
  d.start(progress, { config: DRAW });
  update();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fonts = 1; update(); });
  const done = () => raise(1);
  // do not hold the page for every image: fonts and the first paint are enough
  const ready = () => setTimeout(done, 80);
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(ready);
  else if (document.readyState === "complete") ready(); else addEventListener("load", ready, { once: true });
  setTimeout(done, MAX_WAIT);

  // ---- phase 2: flood
  function startFlood() {
    phase = "flood";
    flood.style.opacity = 1;
    const kk = new Spring(0, (v) => {
      const inset = 8 * k;
      const reach = Math.ceil(Math.max(w, h) / 2) + 2;
      flood.style.boxShadow = `inset 0 0 0 ${inset + v * (reach - inset)}px var(--plate)`;
      dark.style.opacity = Math.min(1, v);
      if (phase === "flood" && v >= FULL) startFold();
    });
    kk.start(1, { config: { tension: 200, friction: 28 } });
  }

  // ---- phase 3: fold
  const half = (v) => (1 - v) * (Math.max(w, h) / 2);
  const mask = (v) => {
    const H = half(v);
    const hw = Math.min(H, w / 2), hh = Math.min(H, h / 2);
    const side = Math.min(hw, hh) * 2;
    const squared = Math.max(w, h) === Math.min(w, h) ? 1
      : Math.min(1, Math.max(0, (Math.max(w, h) / 2 - H) / ((Math.max(w, h) - Math.min(w, h)) / 2)));
    const round = side * TILE_ROUND * squared;
    return `inset(${h / 2 - hh}px ${w / 2 - hw}px round ${round}px)`;
  };
  const cut = (v) => {
    const side = half(v) * 2, t = 76 * k;
    if (side >= t) return "none";
    return `inset(${(t - side) / 2}px round ${side * TILE_ROUND}px)`;
  };
  function startFold() {
    phase = "fold";
    html.setAttribute("data-preload-closing", "");
    html.removeAttribute("data-preload");
    stage.style.display = svg.style.display = flood.style.display = "none";
    plate.style.display = "block";
    plate.style.clipPath = mask(0);
    release();
    tween(760, ease.inOutQuad, (c) => {
      plate.style.clipPath = c >= 1 ? "inset(50%)" : mask(c);
      tile.style.clipPath = c >= 1 ? "inset(50%)" : cut(c);
    }, finish);
  }
  function finish() {
    phase = "done";
    html.removeAttribute("data-preload-closing");
    removeEventListener("resize", measure);
    root.remove();
    try { sessionStorage.setItem("itcan-intro", "1"); } catch (e) { /* private mode */ }
    window.dispatchEvent(new Event("itcan:ready"));
    onDone && onDone();
  }
}
