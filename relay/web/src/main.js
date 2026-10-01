// ITCAN site: boot order mirrors the Relay page (motion engine, scroll, entrances,
// sections, hand-offs, preloader, then the particle stream once the page is released).
import { reduced, coarse, fine, ticker } from "./core/engine.js";
import { initScroll, getScroll, onScroll, resize as lenisResize } from "./core/scroll.js";
import { initPrims } from "./core/prims.js";
import { onView } from "./core/seen.js";
import { runPreloader } from "./preloader.js";
import { initScrollBlur, initLogoOpen, initCursor } from "./transitions.js";
import { initNav, initBreath, initButtons, initTheme } from "./ui.js";
import { initHero } from "./sections/hero.js";
import { initPractices } from "./sections/practices.js";
import { initServices } from "./sections/services.js";
import { initStatement } from "./sections/statement.js";
import { initOffices } from "./sections/offices.js";
import { initAwards } from "./sections/awards.js";
import { initProof } from "./sections/proof.js";
import { initEngage } from "./sections/engage.js";
import { initFooter } from "./sections/footer.js";
import { initMisc } from "./sections/misc.js";

window.__itcan = true;
const html = document.documentElement;

function safe(name, fn) {
  try { fn(); } catch (e) { console.error(`[itcan] ${name}`, e); }
}

function docTop(el) { let t = 0; for (let e = el; e; e = e.offsetParent) t += e.offsetTop; return t; }
function placeField() {
  const f = document.querySelector(".bd-field"), s = document.getElementById("scale"), m = document.querySelector("main");
  if (f && s && m) f.style.top = `${docTop(s) - docTop(m)}px`;
}

function initStream() {
  const canvas = document.getElementById("stream");
  if (!canvas || html.hasAttribute("data-bot") || /[?&]nogl\b/.test(location.search)) return;
  const mod = import("./stream.js");
  let revealAsked = false, stream = null;
  window.addEventListener("itcan:stream", () => { revealAsked = true; if (stream && !reduced) stream.reveal(performance.now()); }, { once: true });
  const boot = async () => {
    try {
      const { createStream } = await mod;
      stream = await createStream(canvas, { reduced, coarse });
    } catch (e) {
      console.warn("[itcan] stream unavailable", e);
      canvas.remove();
      return;
    }
    const s = stream;
    s.setScroll(getScroll());
    onScroll((y) => s.setScroll(y));
    if (fine) addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") s.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1)); }, { passive: true });
    const main = document.querySelector("main");
    let rz = 0;
    const onResize = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => s.resize()); };
    new ResizeObserver(onResize).observe(main);
    addEventListener("resize", onResize);
    matchMedia("(hover: none) and (pointer: coarse)").addEventListener("change", onResize);
    if (reduced) {
      s.reveal(24000, true);
      const still = () => requestAnimationFrame(() => s.render(24000));
      still(); onScroll(still); addEventListener("resize", still);
      return;
    }
    if (revealAsked) s.reveal(performance.now());
    let visible = true, off = null;
    // watch the real frame rate for a few seconds; if the device struggles, lighten the stream
    let prev = 0, slow = 0, seen = 0, judged = false;
    const watch = (now) => {
      if (judged) return;
      if (prev) { const gap = now - prev; if (gap < 250) { seen++; if (gap > 24) slow++; } }
      prev = now;
      if (seen >= 120) { judged = true; if (slow / seen > 0.35) s.degrade(); }
    };
    const run = () => { if (!off && visible && !document.hidden) { prev = 0; off = ticker.add((now) => { watch(now); s.render(now); }, coarse ? 20 : 0); } };
    const stop = () => { if (off) { off(); off = null; } };
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : run()));
    run();
    // a safety reveal if the hero never asked (e.g. page opened scrolled down)
    setTimeout(() => { if (!revealAsked) { revealAsked = true; s.reveal(performance.now()); } }, 1200);
  };
  const waitClosed = () => {
    if (html.hasAttribute("data-preload") || html.hasAttribute("data-preload-closing")) { setTimeout(waitClosed, 60); return; }
    (window.requestIdleCallback || setTimeout)(boot, { timeout: 300 });
  };
  waitClosed();
}

try {
  safe("scroll", initScroll);
  safe("theme", initTheme);
  safe("nav", initNav);
  safe("breath", initBreath);
  safe("buttons", () => initButtons());
  safe("prims", () => initPrims());
  safe("hero", initHero);
  safe("practices", initPractices);
  safe("services", initServices);
  safe("statement", initStatement);
  safe("offices", initOffices);
  safe("awards", initAwards);
  safe("proof", initProof);
  safe("engage", initEngage);
  safe("footer", initFooter);
  safe("misc", initMisc);
  safe("scrollblur", initScrollBlur);
  safe("logoopen", initLogoOpen);
  safe("cursor", initCursor);
  placeField();
  addEventListener("resize", placeField);
  if (document.fonts) document.fonts.ready.then(() => { placeField(); lenisResize(); });
  runPreloader(() => { lenisResize(); placeField(); });
  safe("stream", initStream);
} catch (e) {
  console.error(e);
  html.removeAttribute("data-preload");
  html.removeAttribute("data-preload-closing");
  html.classList.remove("motion");
}
void onView;
