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

  const span = () => Math.max(1, sec.offsetHeight - innerHeight);
  const update = () => { const r = sec.getBoundingClientRect(); pts.setProgress(clamp(-r.top / span())); };
  onScroll(update);
  addEventListener("resize", update);
  update();

  let raf = 0, live = false;
  const tick = () => {
    raf = 0;
    const c = pts.chapter, intro = pts.intro;
    caps.forEach((el, k) => {
      const d = c - k;
      let o = clamp(1 - Math.abs(d) * 2.4);
      if (k === 0) o *= clamp((intro - 0.3) / 0.45);
      if (k === last && d > 0) o = 1;
      el.style.setProperty("--o", o >= 0.999 ? "1" : o.toFixed(3));
      el.style.setProperty("--y", `${(-d * 40).toFixed(1)}px`);
      el.style.setProperty("--b", `${((1 - o) * 10).toFixed(1)}px`);
      el.classList.toggle("is-off", o < 0.04);
    });
    stage.style.setProperty("--shade", (0.4 + 0.6 * clamp(c * 1.2) * clamp((4.6 - c) / 1.2)).toFixed(3));
    if (cue) cue.style.setProperty("--cue", (clamp(1 - c * 5) * clamp((intro - 0.7) / 0.3)).toFixed(3));
    if (live) raf = requestAnimationFrame(tick);
  };

  onView(stage, (hit) => {
    if (hit) { pts.start(); if (!live) { live = true; raf = requestAnimationFrame(tick); } }
    else { pts.stop(); live = false; cancelAnimationFrame(raf); raf = 0; }
  });

  rail.forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    const k = +a.dataset.go;
    const top = sec.getBoundingClientRect().top + getScroll() + (span() * k) / last;
    scrollToY(top + 2);
  }));
}
