// Offices: the globe turns to whichever office you pick; live local clocks.
import { createGlobe } from "../globe.js";
import { onView } from "../core/seen.js";
import { reduced } from "../core/engine.js";

function clock(tz) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false }).formatToParts(new Date());
  const get = (t) => (parts.find((p) => p.type === t) || {}).value;
  const h = +get("hour") % 24, m = +get("minute"), wd = get("weekday");
  const open = !["Sat", "Sun"].includes(wd) && h * 60 + m >= 9 * 60 && h * 60 + m < 18 * 60;
  return { text: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, open };
}

export function initOffices() {
  const sec = document.querySelector("[data-offices]");
  if (!sec) return;
  const canvas = sec.querySelector(".globe-canvas");
  const globe = createGlobe(canvas, { reduced });
  globe.resize();
  new ResizeObserver(() => globe.resize()).observe(canvas);
  onView(canvas, (hit) => (hit ? globe.start() : globe.stop()));

  const items = Array.from(sec.querySelectorAll("[data-office]"));
  const pick = (li, turn = true) => {
    items.forEach((x) => { const on = x === li; x.classList.toggle("is-active", on); x.querySelector(".of-top").setAttribute("aria-expanded", String(on)); });
    if (turn) globe.focus(li.dataset.office);
  };
  items.forEach((li) => li.querySelector(".of-top").addEventListener("click", () => pick(li)));

  const tick = () => items.forEach((li) => {
    const c = clock(li.dataset.tz);
    const t = li.querySelector("[data-clock]");
    t.textContent = c.text;
    t.setAttribute("aria-label", `Local time ${c.text}, ${c.open ? "office hours" : "outside office hours"}`);
    li.querySelector(".of-dot").classList.toggle("is-open", c.open);
  });
  tick();
  let timer = 0;
  onView(sec, (hit) => { clearInterval(timer); if (hit) { tick(); timer = setInterval(tick, 15000); } });
}
