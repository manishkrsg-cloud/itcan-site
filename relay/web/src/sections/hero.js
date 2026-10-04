// 02 Hero: the load sequence for the copy, and the service slider on the right.
import { springs, SPRING_SOFT, reduced } from "../core/engine.js";
import { rise, focus, fade, type } from "../core/prims.js";
import { whenReleased } from "../core/seen.js";
import { initSpectra } from "./spectra.js";

const fmtCache = {};
function localTime(tz, withSec = true) {
  const k = tz + withSec;
  const f = fmtCache[k] || (fmtCache[k] = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: withSec ? "2-digit" : undefined, hour12: false }));
  return f.format(new Date());
}
export function isOpen(tz) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", hour: "numeric", hour12: false }).formatToParts(new Date());
  const wd = p.find((x) => x.type === "weekday").value, h = +p.find((x) => x.type === "hour").value;
  return !["Sat", "Sun"].includes(wd) && h >= 9 && h < 18;
}
export { localTime };

export function initHero() {
  const hero = document.getElementById("hero");
  if (!hero) return;
  const q = (s) => hero.querySelector(s);
  const spRoot = q("[data-spectra]");
  const spectra = initSpectra(spRoot);

  // ---------------------------------------------------------- load sequence
  const title = rise(q(".hc-title")), titleF = focus(q(".hero-h1"), 10);
  const sub = fade(q(".hc-sub"));
  const actions = rise(q(".hc-actions"));
  const spIn = springs({ o: 0, y: 28, s: 0.94 }, (v) => {
    if (!spRoot) return;
    spRoot.style.opacity = v.o >= 1 ? "1" : v.o;
    spRoot.style.transform = v.y === 0 && v.s === 1 ? "none" : `translate3d(0, ${v.y}px, 0) scale(${v.s})`;
  });

  const play = () => {
    title.play(70); titleF.play(70);
    sub.play(140);
    actions.play(210);
    spIn.start({ o: 1, y: 0, s: 1 }, { config: SPRING_SOFT, delay: 240 });
    setTimeout(() => spectra && spectra.start(), 1400);
    setTimeout(() => window.dispatchEvent(new Event("itcan:stream")), 416);
  };
  if (reduced) {
    [title, titleF, sub, actions].forEach((c) => c.play(0));
    spIn.set({ o: 1, y: 0, s: 1 });
  } else {
    [title, actions].forEach((c) => c.reset());
    titleF.reset(); sub.reset();
    whenReleased(() => requestAnimationFrame(play));
  }
  if (document.fonts) document.fonts.ready.then(() => spectra && spectra.layout());
}
