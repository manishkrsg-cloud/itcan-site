// Lenis smooth scroll + a scroll bus. Every per-frame scroll read uses this number.
import Lenis from "lenis";
import { ticker, reduced, coarse } from "./engine.js";

let lenis = null;
let y = window.scrollY;
const subs = new Set();
const emit = () => { for (const fn of subs) fn(y); };

export const getScroll = () => y;
export function onScroll(fn) { subs.add(fn); return () => subs.delete(fn); }
export const getLenis = () => lenis;

export function initScroll() {
  if (!reduced && !coarse) {
    lenis = new Lenis({ smoothWheel: true, autoRaf: false, lerp: 0.16 }); // quicker catch-up: smooth, but no felt lag behind the wheel
    lenis.on("scroll", (l) => { y = l.scroll; emit(); });
    ticker.add((now) => lenis.raf(now));
  }
  window.addEventListener("scroll", () => { if (!lenis) { y = window.scrollY; emit(); } }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  // anchors: smooth-scroll with the nav height as offset
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id === "#" || id.length < 2) return;
    const t = id === "#top" ? document.body : document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    scrollTo(t);
    history.replaceState(null, "", id === "#top" ? location.pathname : id);
  });
}

export function scrollTo(target) {
  const nav = document.querySelector(".nav");
  const off = -(nav ? nav.offsetHeight : 0) + 1;
  // content above can still grow while the smooth scroll runs (late images, reveals);
  // once it settles, land the target exactly under the header
  const settle = () => {
    if (target === document.body) return;
    const miss = target.getBoundingClientRect().top + off;
    if (Math.abs(miss) > 4) { if (lenis) lenis.scrollTo(target, { offset: off, immediate: true }); else window.scrollTo({ top: window.scrollY + miss, behavior: "auto" }); }
  };
  if (lenis) lenis.scrollTo(target === document.body ? 0 : target, { offset: off, duration: 1.2, onComplete: settle });
  else {
    const top = target === document.body ? 0 : target.getBoundingClientRect().top + window.scrollY + off;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    if ("onscrollend" in window) window.addEventListener("scrollend", settle, { once: true }); else setTimeout(settle, 900);
  }
}

export function resize() { lenis && lenis.resize(); }
export function lock(on) {
  // the page and the bar behind an open dialog cannot be focused or clicked
  document.querySelectorAll(".page, [data-nav]").forEach((el) => { el.inert = !!on; });
  if (!lenis) return;
  on ? lenis.stop() : lenis.start();
}
