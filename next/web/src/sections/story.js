// The opening story: a sticky stage whose particles re-form chapter by chapter.
import { createPoints } from "../points.js";
import { onView } from "../core/seen.js";
import { onScroll, getScroll, scrollToY } from "../core/scroll.js";
import { clamp } from "../core/engine.js";

export function initStory() {
  const sec = document.querySelector("[data-story]");
  if (!sec) return;
  const stage = sec.querySelector("[data-stage]");
  sec.classList.add("is-live");
  const caps = Array.from(sec.querySelectorAll("[data-ch]"));
  const labels = Array.from(sec.querySelectorAll("[data-cluster]"));
  const rail = Array.from(sec.querySelectorAll("[data-go]"));
  const cue = sec.querySelector(".cue");
  const last = caps.length - 1;

  const pts = createPoints(stage, {
    labels,
    onChapter: (ch) => rail.forEach((a, i) => (i === ch ? a.setAttribute("aria-current", "step") : a.removeAttribute("aria-current"))),
  });

  // geometry is cached so the scroll handler never reads layout
  let top = 0, spanPx = 1;
  const measure = () => { top = sec.getBoundingClientRect().top + getScroll(); spanPx = Math.max(1, sec.offsetHeight - innerHeight); };
  const span = () => spanPx;
  const update = (y = getScroll()) => pts.setProgress(clamp((y - top) / spanPx));
  measure();
  onScroll(update);
  addEventListener("resize", () => { measure(); update(); });
  new ResizeObserver(() => { measure(); update(); }).observe(document.body);
  update();

  let raf = 0, live = false;
  const memo = new Map();
  const put = (el, k, v) => { const key = el.dataset.ch + k; if (memo.get(key) !== v) { memo.set(key, v); el.style.setProperty(k, v); } };
  const tick = () => {
    raf = 0;
    const c = pts.chapter, intro = pts.intro;
    caps.forEach((el, k) => {
      const d = c - k;
      let o = clamp(1 - Math.abs(d) * 2.4);
      if (k === 0) o *= clamp((intro - 0.3) / 0.45);
      if (k === last && d > 0) o = 1;
      if (o > 0.97) o = 1; // settle crisp: no lingering blur while the chapter eases in the last pixels
      put(el, "--o", o >= 0.999 ? "1" : o.toFixed(2));
      put(el, "--y", `${(-d * 40).toFixed(0)}px`);
      const b = (1 - o) * 10;
      put(el, "--f", o >= 0.999 || o < 0.04 ? "none" : `blur(${b.toFixed(1)}px)`);
      const off = o < 0.04;
      if (el.classList.contains("is-off") !== off) el.classList.toggle("is-off", off);
    });
    const shade = (0.4 + 0.6 * clamp(c * 1.2) * clamp((4.6 - c) / 1.2)).toFixed(2);
    if (memo.get("shade") !== shade) { memo.set("shade", shade); stage.style.setProperty("--shade", shade); }
    const cv = (clamp(1 - c * 5) * clamp((intro - 0.7) / 0.3)).toFixed(2);
    if (cue && memo.get("cue") !== cv) { memo.set("cue", cv); cue.style.setProperty("--cue", cv); }
    if (live) raf = requestAnimationFrame(tick);
  };

  onView(stage, (hit) => {
    if (hit) { pts.start(); if (!live) { live = true; raf = requestAnimationFrame(tick); } }
    else { pts.stop(); live = false; cancelAnimationFrame(raf); raf = 0; }
  });

  rail.forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    const k = +a.dataset.go;
    scrollToY(top + (span() * k) / last + 2);
  }));
}
