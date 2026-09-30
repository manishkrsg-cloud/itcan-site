// Trophy hall: 28 awards on a track that pins and slides sideways as you scroll
// (on phones it is a swipe row), a year ruler, and a lightbox.
import { onScroll, getScroll, scrollToY, lock } from "../core/scroll.js";
import { coarse, clamp, reduced } from "../core/engine.js";

const CAT = { e50: "Enterprise 50", brand: "Brand and leadership", ent: "Entrepreneurship", exc: "Excellence" };

export async function initHall() {
  const sec = document.querySelector("[data-hall]");
  if (!sec) return;
  const view = sec.querySelector("[data-hall-view]"), track = sec.querySelector("[data-hall-track]"), yearsEl = sec.querySelector("[data-years]");
  let list = [];
  try { list = await (await fetch("/data/awards.json")).json(); } catch (e) { return; }
  list.sort((a, b) => b.year - a.year);

  track.innerHTML = list.map((a, i) => `<li class="award"><button type="button" data-i="${i}" aria-label="${a.title}, ${a.year}. Open photo">`
    + `<span class="award-img"><img src="/awards/${a.slug}-sm.jpg" alt="" loading="lazy" decoding="async" width="720" height="${Math.round((720 * a.h) / a.w)}"><span class="award-year">${a.year}</span></span>`
    + `<span class="award-meta"><b>${a.title}</b><span class="tag ${a.cat}">${CAT[a.cat] || ""}</span></span></button></li>`).join("");
  const cards = Array.from(track.children);

  // year ruler: one tick per year, height by count
  const years = [];
  for (let y = 2023; y >= 2007; y--) years.push({ y, n: list.filter((a) => a.year === y).length });
  years.reverse();
  yearsEl.innerHTML = years.map((y) => `<span data-y="${y.y}" style="--n:${y.n}"><i></i><b>${y.y}</b></span>`).join("");
  const ticks = Array.from(yearsEl.children);
  let onYear = 0;
  const markYear = (yr) => { if (yr === onYear) return; onYear = yr; ticks.forEach((t) => t.classList.toggle("is-on", +t.dataset.y === yr)); };

  // ---- pinned sideways scroll on wide screens with a mouse or trackpad
  let pinned = false, overflow = 0, base = 0, secTop = 0;
  const cardStep = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : 300);
  function measure() {
    const want = !coarse && innerWidth > 900 && !reduced;
    pinned = want;
    sec.classList.toggle("is-pinned", pinned);
    track.style.transform = "";
    sec.style.height = "";
    cacheGeo();
    secTop = sec.getBoundingClientRect().top + getScroll();
    if (!pinned) return;
    overflow = Math.max(0, track.scrollWidth - view.clientWidth);
    base = sec.querySelector(".hall-pin").offsetHeight;
    sec.style.height = `${base + overflow}px`;
    update();
  }
  // card centres and the view width are cached, so scrolling never forces a layout
  let centres = [], viewW = 0;
  const cacheGeo = () => { centres = cards.map((c) => c.offsetLeft + c.offsetWidth / 2); viewW = view.clientWidth; };
  function centreYear(x) {
    // the card nearest the middle of the view sets the year
    if (!centres.length) cacheGeo();
    const mid = x + viewW / 2;
    let best = 0, bd = 1e9;
    for (let i = 0; i < centres.length; i++) { const d = Math.abs(centres[i] - mid); if (d < bd) { bd = d; best = i; } }
    markYear(list[best].year);
  }
  let lastX = -1;
  function update() {
    if (!pinned) return;
    const p = overflow ? clamp((getScroll() - secTop) / overflow) : 0;
    const x = Math.round(p * overflow * 2) / 2;
    if (x === lastX) return;
    lastX = x;
    track.style.transform = `translate3d(${-x}px,0,0)`;
    centreYear(x);
  }
  onScroll(update);
  view.addEventListener("scroll", () => { if (!pinned) centreYear(view.scrollLeft); }, { passive: true });
  addEventListener("resize", measure);
  new ResizeObserver(() => { secTop = sec.getBoundingClientRect().top + getScroll(); }).observe(document.body);
  track.querySelectorAll("img").forEach((img) => img.addEventListener("load", () => { if (pinned) { const o = overflow; overflow = Math.max(0, track.scrollWidth - view.clientWidth); if (o !== overflow) measure(); } }, { once: true }));
  measure();
  centreYear(0);

  const move = (dir) => {
    const step = cardStep() * 2;
    if (pinned) scrollToY(getScroll() + dir * step);
    else view.scrollBy({ left: dir * step, behavior: reduced ? "auto" : "smooth" });
  };
  sec.querySelector("[data-hall-prev]").addEventListener("click", () => move(-1));
  sec.querySelector("[data-hall-next]").addEventListener("click", () => move(1));

  // ---- lightbox
  const lb = document.querySelector("[data-lb]");
  const img = lb.querySelector("[data-lb-img]"), yr = lb.querySelector("[data-lb-year]"), tt = lb.querySelector("[data-lb-title]"), cat = lb.querySelector("[data-lb-cat]"), cnt = lb.querySelector("[data-lb-count]");
  let at = 0, opener = null;
  const show = (i) => {
    at = (i + list.length) % list.length;
    const a = list[at];
    img.src = `/awards/${a.slug}.jpg`;
    img.width = a.w; img.height = a.h;
    img.alt = `${a.title}, ${a.year}`;
    yr.textContent = a.year; tt.textContent = a.title;
    cat.textContent = CAT[a.cat] || ""; cat.className = `tag ${a.cat}`;
    cnt.textContent = `${at + 1} of ${list.length}`;
  };
  track.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (!b) return;
    opener = b; show(+b.dataset.i); lb.showModal(); lock(true);
  });
  lb.querySelector("[data-lb-close]").addEventListener("click", () => lb.close());
  lb.querySelector("[data-lb-prev]").addEventListener("click", () => show(at - 1));
  lb.querySelector("[data-lb-next]").addEventListener("click", () => show(at + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") show(at - 1); if (e.key === "ArrowRight") show(at + 1); });
  lb.addEventListener("close", () => { lock(false); if (opener) opener.focus({ preventScroll: true }); });
  // swipe in the lightbox
  let sx = null;
  lb.addEventListener("pointerdown", (e) => { sx = e.clientX; });
  lb.addEventListener("pointerup", (e) => { if (sx == null) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 50) show(at + (d < 0 ? 1 : -1)); });
}
