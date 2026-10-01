// 04 Services: index counters and the looping cards (three storylines and the layers stack).
import { Spring, springs, SPRING, SPRING_SOFT, GROW, reduced, ticker, tween, ease } from "../core/engine.js";
import { type } from "../core/prims.js";
import { watchLoop } from "../core/seen.js";

const OVERSHOOT = { tension: 390, friction: 20.8 };
const POPC = { tension: 320, friction: 17 };

function timers() {
  let list = [];
  return { at(ms, fn) { list.push(setTimeout(fn, ms)); }, clear() { list.forEach(clearTimeout); list = []; } };
}
const setO = (el, v) => { el.style.opacity = v >= 1 ? "1" : Math.max(0, v); };

// every card: { play(), reverse(), reset(), rest(), playMs }
function loopCard(el, card) {
  if (reduced) { card.rest(); return; }
  card.reset();
  let timer = 0;
  const cycle = () => {
    card.play();
    timer = setTimeout(() => { card.reverse(); timer = setTimeout(cycle, 800); }, card.playMs + 2800);
  };
  watchLoop(el, {
    arm() { clearTimeout(timer); timer = setTimeout(cycle, 240); },
    disarm() { clearTimeout(timer); card.reset(); },
  });
}

// ------------------------------------------------------------ counters
function roll(el) {
  const txt = el.dataset.roll;
  el.textContent = "";
  el.setAttribute("aria-label", txt);
  const strips = txt.split("").map((ch) => {
    const d = +ch;
    const s = document.createElement("span");
    s.className = "dg";
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = Array.from({ length: 11 + d }, (_, i) => `<i>${i % 10}</i>`).join("");
    el.appendChild(s);
    return { s, d };
  });
  const lh = () => el.getBoundingClientRect().height || 20;
  const sps = strips.map(({ s, d }) => new Spring(0, (v) => { s.style.transform = `translateY(${-v * lh()}px)`; }));
  return {
    play() { strips.forEach(({ d }, i) => sps[i].start(10 + d, { config: SPRING_SOFT, delay: 150 + i * 70 })); },
    rest() { strips.forEach(({ d }, i) => sps[i].set(10 + d)); },
  };
}

// ------------------------------------------------------------ storyline (consulting, custom builds, managed applications)
// The thread fills from chapter to chapter; each chapter lights up as the thread reaches it.
function storyCard(fig) {
  const T = timers();
  const kick = type(fig.querySelector('[data-t="kick"]'), 24), sum = type(fig.querySelector('[data-t="sum"]'), 24);
  const steps = Array.from(fig.querySelectorAll(".sy-step"));
  const line = fig.querySelector(".sy-line"), fill = fig.querySelector(".sy-fill");
  const nodes = steps.map((s) => s.querySelector(".sy-node"));
  // the thread runs from the first chapter marker to the last, across or down
  const fit = () => {
    const a = nodes[0].getBoundingClientRect(), b = nodes[nodes.length - 1].getBoundingClientRect(), box = line.parentElement.getBoundingClientRect();
    const across = Math.abs(b.top - a.top) < 4;
    line.style.left = `${a.left - box.left + a.width / 2}px`;
    line.style.top = `${a.top - box.top + a.height / 2}px`;
    line.style.width = across ? `${b.left - a.left}px` : "";
    line.style.height = across ? "" : `${b.top - a.top}px`;
  };
  fit();
  addEventListener("resize", fit);
  if (document.fonts) document.fonts.ready.then(fit);
  const n = steps.length, LEG = 640, FIRST = 520;
  let p = 0, tw = null;
  const setP = (v) => { p = v; fill.style.setProperty("--p", v.toFixed(4)); };
  const light = (i, on) => steps[i].classList.toggle("is-on", on);
  const settle = (i) => steps[i].classList.add("is-done");
  return {
    playMs: FIRST + (n - 1) * LEG + 400,
    play() {
      fig.classList.add("is-armed");
      kick.play(160); sum.play(900);
      T.at(FIRST, () => light(0, true));
      for (let i = 1; i < n; i++) {
        T.at(FIRST + (i - 1) * LEG + 80, () => {
          const from = (i - 1) / (n - 1), to = i / (n - 1);
          tw && tw.stop && tw.stop();
          tw = tween(LEG - 120, ease.inOutCubic, (t) => setP(from + (to - from) * t), () => { settle(i - 1); light(i, true); });
        });
      }
    },
    reverse() {
      T.clear(); tw && tw.stop && tw.stop();
      steps.slice().reverse().forEach((s, k) => T.at(k * 70, () => s.classList.remove("is-on", "is-done")));
      const from = p;
      tw = tween(420, ease.inOutCubic, (t) => setP(from * (1 - t)));
      T.at(220, () => { kick.reset(); sum.reset(); });
    },
    reset() { T.clear(); tw && tw.stop && tw.stop(); fig.classList.add("is-armed"); kick.reset(); sum.reset(); steps.forEach((s) => s.classList.remove("is-on", "is-done")); setP(0); },
    rest() { fig.classList.remove("is-armed"); kick.play(0); sum.play(0); steps.forEach((s) => s.classList.add("is-on", "is-done")); setP(1); },
  };
}

// ------------------------------------------------------------ layers
function layersCard(fig) {
  const slabs = [".s3", ".s2", ".s1"].map((s) => fig.querySelector(".ly-slab" + s));
  const labels = [".l3", ".l2", ".l1"].map((s) => fig.querySelector(".ly-labels " + s));
  const glow = fig.querySelector(".ly-glow");
  const cap = type(fig.querySelector(".ly-cap")), cap2 = type(fig.querySelector(".ly-cap2"));
  const k = () => (fig.clientWidth || 760) / 760;
  const slabS = slabs.map((g) => springs({ o: 0, y: -26 }, (v) => { setO(g, v.o); g.style.translate = v.y ? `0 ${v.y}px` : "none"; }));
  const labS = labels.map((l) => springs({ o: 0, x: -8 }, (v) => { setO(l, v.o); l.style.translate = v.x ? `${v.x}px 0` : "none"; }));
  const gS = new Spring(0, (v) => { const s = Math.sin(Math.PI * Math.min(1, Math.max(0, v))); glow.style.opacity = s; glow.style.transform = `scale(${0.8 + 0.45 * s})`; });
  void k;
  return {
    playMs: 2072,
    play() {
      cap.play(120); cap2.play(360);
      slabS.forEach((s, i) => s.start({ o: 1, y: 0 }, { configs: { y: OVERSHOOT, o: SPRING }, delay: 240 + i * 120 }));
      labS.forEach((s, i) => s.start({ o: 1, x: 0 }, { config: SPRING, delay: 448 + i * 120 }));
      gS.set(0); gS.start(1, { config: { tension: 60, friction: 20 }, delay: 480 + 208 + 304 });
    },
    reverse() {
      slabS.slice().reverse().forEach((s, i) => s.start({ o: 0, y: -26 }, { config: SPRING, delay: i * 32 }));
      labS.slice().reverse().forEach((s, i) => s.start({ o: 0, x: -8 }, { config: SPRING, delay: i * 32 }));
    },
    reset() { cap.reset(); cap2.reset(); slabS.forEach((s) => s.set({ o: 0, y: -26 })); labS.forEach((s) => s.set({ o: 0, x: -8 })); gS.set(0); },
    rest() { cap.play(0); cap2.play(0); slabS.forEach((s) => s.set({ o: 1, y: 0 })); labS.forEach((s) => s.set({ o: 1, x: 0 })); },
  };
}

export function initServices() {
  const sec = document.getElementById("product");
  if (!sec) return;
  sec.querySelectorAll("[data-roll]").forEach((el) => {
    const r = roll(el);
    if (reduced) { r.rest(); return; }
    let played = false;
    watchLoop(el, { arm() { if (!played) { played = true; r.play(); } }, disarm() {} });
  });
  const make = { story: storyCard, layers: layersCard };
  sec.querySelectorAll("[data-loop]").forEach((fig) => {
    const f = make[fig.dataset.loop];
    if (f) loopCard(fig, f(fig));
  });
}
