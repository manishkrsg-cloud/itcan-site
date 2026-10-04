// 03 Practices: a 3D coverflow of the nine practices, on desktop and phones alike.
// The centre card is the open practice; the caption under it gives its number, category,
// description and the practices it works with. Swipe, drag, arrow keys, the arrows or a chip
// all move the deck; it autoplays while on screen. The nine practices live in .pr-data
// (screen-reader text and the data source), so the content is edited in one place.
import { createCoverflow } from "../coverflow.js";

const pad = (n) => String(n).padStart(2, "0");
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';

export function initPractices() {
  const sec = document.getElementById("integrations");
  const root = sec && sec.querySelector("[data-pr-flow]");
  if (!root) return;
  const data = Array.from(sec.querySelectorAll(".pr-data li")).map((li) => ({
    name: li.dataset.name, cat: li.dataset.cat, desc: li.querySelector("p").textContent,
    img: li.dataset.img, imgL: li.dataset.imgL,
    rel: (li.dataset.rel || "").split(",").filter(Boolean).map(Number),
  }));
  const N = data.length;
  if (!N) return;
  const chips = Array.from(sec.querySelectorAll("[data-pr]"));
  const cN = root.querySelector("[data-pr-n]"), cCat = root.querySelector("[data-pr-cat]"), cTitle = root.querySelector("[data-pr-title]");
  const cDesc = root.querySelector("[data-pr-desc]"), cRel = root.querySelector("[data-pr-rel]"), cap = root.querySelector(".pr-cap");
  const chipRow = sec.querySelector(".pr-chips");

  const build = (i) => {
    const d = data[i];
    const el = document.createElement("div");
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `${d.name}, ${i + 1} of ${N}`);
    el.innerHTML =
      `<img class="pr-img" src="${d.img}" width="1024" height="1024" alt="" loading="lazy" decoding="async" draggable="false">` +
      `<img class="pr-img pr-img--l" src="${d.imgL}" width="1024" height="1024" alt="" loading="lazy" decoding="async" draggable="false">` +
      `<span class="pr-fc-shade" aria-hidden="true"></span>` +
      `<span class="pr-fc-n mono" aria-hidden="true">${pad(i + 1)}</span>` +
      `<span class="pr-fc-name" aria-hidden="true">${d.name}</span>`;
    // a daylight image that fails to load is removed, so the dark art shows instead
    const l = el.querySelector(".pr-img--l");
    l.addEventListener("error", () => l.remove(), { once: true });
    return el;
  };

  let flow = null;
  const show = (i) => {
    const d = data[i];
    cN.textContent = `${pad(i + 1)} / ${pad(N)}`;
    cCat.textContent = d.cat;
    cTitle.textContent = d.name;
    cDesc.textContent = d.desc;
    cRel.innerHTML = d.rel.map((r) => `<button type="button" data-go="${r}">${data[r].name}${ARROW}</button>`).join("");
    chips.forEach((c, k) => {
      c.setAttribute("aria-pressed", String(k === i));
      c.classList.toggle("is-rel", d.rel.includes(k));
    });
    // keep the pressed chip in view when the chip row scrolls sideways (phones)
    const on = chips[i];
    if (on && chipRow && chipRow.scrollWidth > chipRow.clientWidth) {
      const x = on.offsetLeft - (chipRow.clientWidth - on.offsetWidth) / 2;
      chipRow.scrollTo({ left: x, behavior: "smooth" });
    }
    // the caption re-enters on each change, so the text change reads as a new card
    cap.classList.remove("is-in"); void cap.offsetWidth; cap.classList.add("is-in");
  };

  flow = createCoverflow({
    root, stage: root.querySelector(".pr-stage"), deck: root.querySelector(".pr-deck"),
    count: N, build, cardClass: "pr-fc", cardW: 340, cardH: 340, persp: 1700,
    geo: { gap: 205, rotate: 42, depth: 190, drop: 0, shrink: 0.1, fade: 0.2, dim: 0.28, visible: 3 },
    autoplayMs: 3800, firstMs: 1600,
    // phones: a 62%-wide centre card with both neighbours peeking; desktop: up to 340px
    fit: (w) => (w < 700 ? (w * 0.62) / 340 : Math.min(1, w / 1100)),
    onActive: show,
  });
  flow.start();

  root.querySelector("[data-pr-prev]").addEventListener("click", () => flow.prev());
  root.querySelector("[data-pr-next]").addEventListener("click", () => flow.next());
  chips.forEach((c) => c.addEventListener("click", () => flow.go(+c.dataset.pr)));
  cRel.addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) flow.go(+b.dataset.go); });
}
