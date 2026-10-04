// 03 Practices: a 3D coverflow of the nine practices, on desktop and phones alike.
// The centre card is the open practice; the caption under it gives its number, category,
// description and the practices it works with. Under it, a rail of nine numbered segments
// with a glowing marker that glides to the open practice. Swipe, drag, arrow keys, a side
// card, the arrows or a segment move the deck; it autoplays while on screen. The nine practices live in .pr-data
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
  const cN = root.querySelector("[data-pr-n]"), cCat = root.querySelector("[data-pr-cat]"), cTitle = root.querySelector("[data-pr-title]");
  const cDesc = root.querySelector("[data-pr-desc]"), cRel = root.querySelector("[data-pr-rel]"), cap = root.querySelector(".pr-cap");
  const rail = root.querySelector("[data-pr-rail]");
  rail.style.setProperty("--n", N);
  const segs = data.map((d, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "pr-seg"; b.dataset.pr = i;
    b.setAttribute("aria-label", d.name);
    b.innerHTML = `<i class="pr-seg-bar" aria-hidden="true"></i><span class="pr-seg-n mono" aria-hidden="true">${pad(i + 1)}</span><span class="pr-seg-tip" aria-hidden="true">${d.name}</span>`;
    rail.appendChild(b);
    return b;
  });

  // 640px for phones and small cards, 1200px for large cards on dense screens
  const img = (base, cls) => `<img class="${cls}" src="${base}-640.webp" srcset="${base}-640.webp 640w, ${base}-1200.webp 1200w" sizes="(width > 700px) 340px, 62vw" width="1200" height="1200" alt="" loading="lazy" decoding="async" draggable="false">`;
  const build = (i) => {
    const d = data[i];
    const el = document.createElement("div");
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `${d.name}, ${i + 1} of ${N}`);
    el.innerHTML =
      img(d.img, "pr-img") + img(d.imgL, "pr-img pr-img--l") +
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
    rail.style.setProperty("--i", i);
    segs.forEach((b, k) => { b.setAttribute("aria-pressed", String(k === i)); b.classList.toggle("is-past", k < i); b.classList.toggle("is-rel", d.rel.includes(k)); });
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
  segs.forEach((b, i) => b.addEventListener("click", () => flow.go(i)));
  cRel.addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) flow.go(+b.dataset.go); });
}
