// 06 Offices: the HQ hub loop (orbits, breathing glow, packets from five offices)
// and the time-zone lanes, which show how far each office is through its working day.
import { Spring, GROW, POP, reduced, ticker } from "../core/engine.js";
import { watchLoop, onView } from "../core/seen.js";
import { localTime, isOpen } from "./hero.js";

// design px inside the 566 x 336 hub; hub centre is the HQ tile centre
const C = [283, 169];
const NODES = [
  { code: "IN", name: "new delhi", at: [88, 169] },
  { code: "MY", name: "kuala lumpur", at: [163, 95], up: true },
  { code: "HK", name: "hong kong", at: [403, 95], up: true },
  { code: "AU", name: "sydney", at: [478, 169] },
  { code: "ID", name: "jakarta", at: [163, 243], left: true },
];

function dayShare(tz) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
  const h = +p.find((x) => x.type === "hour").value % 24, m = +p.find((x) => x.type === "minute").value;
  return Math.max(0, Math.min(1, (h + m / 60 - 9) / 9));
}

function initHub(card) {
  const hub = card.querySelector(".hub"), art = card.querySelector(".hub-art");
  const wires = hub.querySelector(".hub-wires"), list = hub.querySelector(".hub-nodes");
  const outer = hub.querySelector(".o-out"), inner = hub.querySelector(".o-in"), glow = hub.querySelector(".hub-glow");
  wires.setAttribute("viewBox", "0 0 566 336");
  wires.innerHTML = `<defs>${NODES.map((n, i) => `<linearGradient id="hw${i}" gradientUnits="userSpaceOnUse" x1="${n.at[0]}" y1="${n.at[1]}" x2="${C[0]}" y2="${C[1]}"><stop offset="0" stop-color="#ff3d48" stop-opacity=".12"/><stop offset="1" stop-color="#ff3d48" stop-opacity=".6"/></linearGradient>`).join("")}</defs>` +
    NODES.map((n, i) => `<path d="M${n.at[0]} ${n.at[1]}L${C[0]} ${C[1]}" stroke="url(#hw${i})" ${n.at[1] === C[1] ? "" : 'stroke-dasharray="2 7"'}/>`).join("");
  const k = () => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
  const items = NODES.map((n) => {
    const li = document.createElement("li");
    if (n.up) li.className = "lab-up";
    if (n.left) li.className = "lab-left";
    li.style.left = `calc(${n.at[0]} * var(--u))`;
    li.style.top = `calc(${n.at[1]} * var(--u))`;
    li.innerHTML = `<span class="nd">${n.code}</span><span class="fl"></span><span class="lb">${n.name}</span>`;
    list.appendChild(li);
    const pk = document.createElement("i");
    pk.className = "hub-pk";
    hub.appendChild(pk);
    return { li, pk, fl: li.querySelector(".fl"), dx: C[0] - n.at[0], dy: C[1] - n.at[1], x0: n.at[0], y0: n.at[1] };
  });
  const fit = () => {
    const s = Math.min(1, art.clientWidth / (566 * k()));
    const w = 566 * k() * s;
    hub.style.transform = `translateX(${Math.max(0, (art.clientWidth - w) / 2)}px) scale(${s})`;
  };
  fit();
  new ResizeObserver(fit).observe(art);

  let t = 0, last = 0, off = null;
  const draw = () => {
    const turn = ((t % 32000) / 32000) * 360;
    outer.style.transform = `rotate(${turn}deg)`;
    inner.style.transform = `rotate(${-turn}deg)`;
    const b = (1 - Math.cos((2 * Math.PI * t) / 3840)) / 2;
    glow.style.opacity = 1 - 0.3 * b;
    glow.style.transform = `scale(${1 + 0.06 * b})`;
    items.forEach((it, i) => {
      const p = (t / 1920 + i / NODES.length) % 1;
      const sm = (a, b2, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b2 - a))); return u * u * (3 - 2 * u); };
      it.pk.style.left = `calc(${it.x0 + it.dx * p} * var(--u))`;
      it.pk.style.top = `calc(${it.y0 + it.dy * p} * var(--u))`;
      it.pk.style.opacity = sm(0, 0.15, p) * (1 - sm(0.85, 1, p));
      it.fl.style.opacity = Math.pow(Math.max(0, 1 - p / 0.3), 2);
    });
  };
  draw();
  if (reduced) return;
  watchLoop(card, {
    arm() {
      if (off) return;
      last = 0;
      off = ticker.add((now) => { const dt = last ? Math.min(100, now - last) : 0; last = now; t += dt; draw(); });
    },
    disarm() { if (off) { off(); off = null; } t = 0; draw(); },
  });
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
    const t = c.querySelector(".of-clock");
    t.textContent = localTime(c.dataset.tz, false);
    t.classList.toggle("open", isOpen(c.dataset.tz));
    t.setAttribute("title", isOpen(c.dataset.tz) ? "office hours now" : "outside office hours");
  });
  tickCards();
  let iv = 0;
  onView(sec, (hit) => { clearInterval(iv); if (hit) { tickCards(); iv = setInterval(tickCards, 15000); } });
}
