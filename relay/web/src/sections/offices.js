// 06 Offices: the HQ hub loop (orbits, breathing glow, packets from five offices)
// and the time-zone lanes, which show how far each office is through its working day.
import { Spring, GROW, POP, reduced, ticker } from "../core/engine.js";
import { watchLoop, onView } from "../core/seen.js";
import { localTime, isOpen } from "./hero.js";
import { createGlobe } from "../globe.js";

// design px inside the 566 x 336 hub; hub centre is the HQ tile centre

const NODES = [
  { code: "IN", name: "New Delhi", at: [88, 169] },
  { code: "MY", name: "Kuala Lumpur", at: [163, 95], up: true },
  { code: "HK", name: "Hong Kong", at: [403, 95], up: true },
  { code: "AU", name: "Sydney", at: [478, 169] },
  { code: "ID", name: "Jakarta", at: [163, 243], left: true },
];

function dayShare(tz) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
  const h = +p.find((x) => x.type === "hour").value % 24, m = +p.find((x) => x.type === "minute").value;
  return Math.max(0, Math.min(1, (h + m / 60 - 9) / 9));
}

function initHub(card) {
  const canvas = card.querySelector(".globe-canvas");
  if (!canvas) return;
  const globe = createGlobe(canvas, { reduced, target: card.querySelector("[data-logo-target]"), offsetY: -0.02 });
  globe.resize();
  new ResizeObserver(() => globe.resize()).observe(canvas);
  onView(card, (hit) => (hit ? globe.start() : globe.stop()));
}

function initZones(card) {
  const rows = Array.from(card.querySelectorAll(".tz-rows li")).map((li) => {
    const fill = li.querySelector(".tz-fill"), head = li.querySelector(".tz-head"), halo = head.querySelector("i"), time = li.querySelector(".tz-time"), lane = li.querySelector(".tz-lane");
    const row = { li, tz: li.dataset.tz, share: 0 };
    row.grow = new Spring(0, (v) => {
      const w = lane.clientWidth * row.share * Math.max(0, v);
      fill.style.width = `${w}px`;
      head.style.opacity = v > 0.01 ? 1 : 0;
      head.style.transform = `translateX(${w}px)`;
    });
    row.pulse = new Spring(0, (p) => { halo.style.transform = `scale(${1 + 1.6 * p})`; halo.style.opacity = p > 0 && p < 1 ? 0.8 * (1 - p) : 0; });
    row.update = () => { row.share = dayShare(row.tz); time.textContent = localTime(row.tz, false); };
    return row;
  });
  const clock = card.querySelector(".tz-clock");
  const lock = new Spring(0.82, (v) => { clock.style.transform = `scale(${v})`; });
  const update = () => rows.forEach((r) => { r.update(); r.grow.onChange(r.grow.value); });
  update();
  let tick = 0;
  onView(card, (hit) => { clearInterval(tick); if (hit) { update(); tick = setInterval(update, 20000); } });
  if (reduced) { rows.forEach((r) => r.grow.set(1)); lock.set(1); return; }
  let T = [];
  const play = () => {
    update();
    rows.forEach((r, i) => r.grow.start(1, { config: GROW, delay: 0.8 * (1 + 3 + i) * 70, onRest: () => { r.pulse.set(0); r.pulse.start(1, { config: GROW }); } }));
    lock.start(1, { config: POP, delay: 1040 });
    T.push(setTimeout(() => {
      rows.forEach((r) => r.grow.start(0, { config: GROW }));
      lock.start(0.82, { config: GROW });
      T.push(setTimeout(play, 1280));
    }, 1920 + 2800));
  };
  watchLoop(card, {
    arm() { T.forEach(clearTimeout); T = []; play(); },
    disarm() { T.forEach(clearTimeout); T = []; rows.forEach((r) => { r.grow.set(0); r.pulse.set(0); }); lock.set(0.82); },
  });
}

export function initOffices() {
  const sec = document.getElementById("scale");
  if (!sec) return;
  const hub = sec.querySelector(".of-hub-card"), zones = sec.querySelector(".of-tz-card");
  if (hub) initHub(hub);
  if (zones) initZones(zones);
  // live clocks on the address cards
  const cards = Array.from(sec.querySelectorAll(".of-addr[data-tz]"));
  const tickCards = () => cards.forEach((c) => {
    const t = c.querySelector(".of-clock"), st = c.querySelector(".of-state"), on = isOpen(c.dataset.tz);
    t.textContent = localTime(c.dataset.tz, false);
    t.classList.toggle("open", on);
    if (st) st.textContent = on ? "Open" : "After hours";
    t.setAttribute("title", on ? "office hours now" : "outside office hours");
  });
  tickCards();
  let iv = 0;
  const grid = sec.querySelector(".of-grid");
  onView(sec, (hit) => { clearInterval(iv); if (hit) { tickCards(); iv = setInterval(tickCards, 15000); } });
  // the map pins only ping while the cards are on screen
  if (grid) onView(grid, (hit) => grid.classList.toggle("is-live", hit));
}
