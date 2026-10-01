// 03 Practices: a radial orbit. Nine small nodes circle a gradient core on one flat ring and
// turn slowly. Picking a practice (on the ring or in the list) stops the turn, swings it to
// the top, lights the practices it works with and opens a card under it. Picking it again,
// pressing Escape or clicking the empty ring closes the card and the turn resumes.
// The frame loop only runs while the orbit is on screen and something moves.
import { reduced } from "../core/engine.js";
import { onView } from "../core/seen.js";

const SPEED = 6; // degrees per second, one turn a minute
const pad = (n) => String(n).padStart(2, "0");
const wrap180 = (a) => { a = (a + 180) % 360; if (a < 0) a += 360; return a - 180; };
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';

export function initPractices() {
  const sec = document.getElementById("integrations");
  if (!sec) return;
  const orbit = sec.querySelector("[data-orbit]");
  if (!orbit) return;
  const items = Array.from(orbit.querySelectorAll(".pr-nodes li"));
  const nodes = items.map((li) => li.querySelector(".pr-node"));
  const chips = Array.from(sec.querySelectorAll("[data-pr]"));
  const N = items.length;
  const data = items.map((li) => ({ name: li.dataset.name, cat: li.dataset.cat, desc: li.dataset.desc, rel: (li.dataset.rel || "").split(",").filter(Boolean).map(Number) }));
  const card = orbit.querySelector(".pr-card");
  const cBadge = card.querySelector("[data-pr-badge]"), cN = card.querySelector("[data-pr-n]"), cTitle = card.querySelector("[data-pr-title]"), cDesc = card.querySelector("[data-pr-desc]"), cRel = card.querySelector("[data-pr-rel]");

  // ---- geometry
  let cx = 0, cy = 0, r = 200;
  const measure = () => {
    const W = orbit.clientWidth, H = orbit.clientHeight;
    cx = W / 2; cy = H / 2;
    r = Math.max(90, Math.min(205, W / 2 - 70, H / 2 - 70));
    orbit.style.setProperty("--r", `${r.toFixed(1)}px`);
    card.style.top = `${(cy - r + (W < 520 ? 66 : 84)).toFixed(1)}px`;
  };

  // ---- place every node for the current ring angle
  let rot = 0, open = -1;
  const paint = () => {
    for (let i = 0; i < N; i++) {
      const a = (((i / N) * 360 + rot) * Math.PI) / 180;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      const li = items[i], isOpen = i === open;
      li.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      li.style.opacity = isOpen ? "1" : Math.max(0.4, 0.4 + 0.6 * ((1 + Math.sin(a)) / 2)).toFixed(3);
      li.style.zIndex = String(isOpen ? 200 : Math.round(100 + 50 * Math.cos(a)));
    }
  };

  // ---- open and close
  let target = null, showT = 0;
  const setRel = (list) => {
    items.forEach((li, k) => li.classList.toggle("is-rel", list.includes(k)));
    chips.forEach((c, k) => c.classList.toggle("is-rel", list.includes(k)));
  };
  const close = () => {
    if (open < 0) return;
    items[open].classList.remove("is-open");
    nodes[open].setAttribute("aria-expanded", "false");
    chips[open] && chips[open].setAttribute("aria-pressed", "false");
    open = -1; target = null;
    setRel([]);
    clearTimeout(showT);
    card.classList.remove("is-in");
    showT = setTimeout(() => { if (open < 0) card.hidden = true; }, reduced ? 0 : 320);
    kick();
  };
  const show = (i) => {
    if (open === i) { close(); return; }
    if (open >= 0) { items[open].classList.remove("is-open"); nodes[open].setAttribute("aria-expanded", "false"); chips[open] && chips[open].setAttribute("aria-pressed", "false"); }
    open = i;
    const d = data[i];
    items[i].classList.add("is-open");
    nodes[i].setAttribute("aria-expanded", "true");
    chips[i] && chips[i].setAttribute("aria-pressed", "true");
    setRel(d.rel);
    // swing it to the top (270 degrees), the short way round
    const want = 270 - (i / N) * 360;
    target = rot + wrap180(want - rot);
    if (reduced) { rot = target; target = null; }
    cBadge.textContent = d.cat;
    cN.textContent = `${pad(i + 1)} / ${pad(N)}`;
    cTitle.textContent = d.name;
    cDesc.textContent = d.desc;
    cRel.innerHTML = d.rel.map((k) => `<button type="button" data-go="${k}">${data[k].name}${ARROW}</button>`).join("");
    clearTimeout(showT);
    card.classList.remove("is-in");
    card.hidden = false;
    showT = setTimeout(() => card.classList.add("is-in"), reduced ? 0 : 260);
    paint();
    kick();
  };

  nodes.forEach((b, i) => {
    b.addEventListener("click", (e) => { e.stopPropagation(); show(i); });
    b.addEventListener("keydown", (e) => {
      const go = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!go) return;
      e.preventDefault();
      nodes[(i + go + N) % N].focus({ preventScroll: true });
    });
  });
  chips.forEach((c) => c.addEventListener("click", () => show(+c.dataset.pr)));
  cRel.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-go]");
    if (!b) return;
    e.stopPropagation();
    const k = +b.dataset.go;
    show(k);
    nodes[k].focus({ preventScroll: true });
  });
  card.addEventListener("click", (e) => e.stopPropagation());
  orbit.addEventListener("click", () => close());
  sec.addEventListener("keydown", (e) => { if (e.key === "Escape" && open >= 0) { const k = open; close(); nodes[k].focus({ preventScroll: true }); } });

  // ---- motion: a slow turn while nothing is open, an eased swing when something opens
  let raf = 0, last = 0, inView = false;
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (target !== null) {
      rot += (target - rot) * (1 - Math.exp(-dt * 6));
      if (Math.abs(target - rot) < 0.05) { rot = target; target = null; }
    } else if (open < 0 && !reduced) {
      rot = (rot + SPEED * dt) % 360;
    }
    paint();
    if (inView && (target !== null || (open < 0 && !reduced))) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && inView) { last = 0; raf = requestAnimationFrame(frame); } };

  measure(); paint();
  orbit.classList.add("is-ready");
  new ResizeObserver(() => { measure(); paint(); }).observe(orbit);
  onView(orbit, (hit) => {
    inView = hit;
    sec.classList.toggle("is-live", hit && !reduced);
    if (hit) kick(); else { cancelAnimationFrame(raf); raf = 0; }
  });
}
