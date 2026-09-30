// Nav (plate, breathing status dot, 390 menu card) and the shared buttons.
import { Spring, springs, SPRING, SPRING_SOFT, ticker, reduced, fine, ease, tween } from "./core/engine.js";
import { getScroll, onScroll } from "./core/scroll.js";
import { whenReleased, onView } from "./core/seen.js";

export function initNav() {
  const nav = document.querySelector("[data-nav]");
  if (!nav) return;
  const plate = nav.querySelector(".nav-plate");
  const row = nav.querySelector(".nav-row");
  const po = new Spring(0, (v) => { plate.style.opacity = v; });
  let on = false;
  const check = () => {
    const want = getScroll() > nav.offsetHeight;
    if (want !== on) { on = want; po.start(on ? 1 : 0, { config: SPRING }); }
  };
  onScroll(check); check();
  // the header fades in as one block once the page is released
  const fo = new Spring(reduced ? 1 : 0, (v) => { row.style.opacity = v >= 1 ? "1" : v; });
  whenReleased(() => fo.start(1, { config: SPRING_SOFT }));

  // ---- 390 menu card
  const btn = nav.querySelector(".menu-btn");
  const card = nav.querySelector(".menu-card");
  if (!btn || !card) return;
  const bars = btn.querySelectorAll("i");
  const rows = Array.from(card.querySelectorAll("li"));
  const rowSp = rows.map((li) => new Spring(0, (v) => {
    li.style.opacity = v; li.style.transform = v >= 1 ? "none" : `translateY(${(1 - v) * 8}px)`;
  }));
  let open = false, trail = 0;
  const t = new Spring(0, (v) => {
    bars[0].style.transform = `translateY(${v * 6}px) rotate(${v * 45}deg)`;
    bars[1].style.opacity = 1 - v;
    bars[2].style.transform = `translateY(${-v * 5}px) rotate(${-v * 45}deg) scaleX(${1 + 0.6 * v})`;
    card.style.opacity = v;
    card.style.transform = `scale(${0.94 + 0.06 * v})`;
    card.style.visibility = v < 0.01 ? "hidden" : "visible";
  });
  // rows trail: row 0 follows t after 60 ms, each next row follows the previous one's live value
  const follow = () => {
    rows.forEach((_, i) => {
      const target = i === 0 ? (open ? 1 : 0) : rowSp[i - 1].value;
      if (Math.abs(rowSp[i].to - target) > 0.001) rowSp[i].start(target, { config: SPRING });
    });
  };
  const setOpen = (v) => {
    if (open === v) return;
    open = v;
    btn.setAttribute("aria-expanded", String(v));
    btn.setAttribute("aria-label", v ? "Close menu" : "Open menu");
    t.start(v ? 1 : 0, { config: SPRING });
    clearTimeout(trail);
    if (v) trail = setTimeout(runTrail, 60);
    else rowSp.forEach((s) => s.start(0, { config: SPRING }));
  };
  let trailOff = null;
  function runTrail() {
    if (trailOff) return;
    trailOff = ticker.add(() => {
      follow();
      const tgt = open ? 1 : 0;
      if (rowSp.every((s) => s.idle && Math.abs(s.value - tgt) < 0.001)) { trailOff(); trailOff = null; }
    });
  }
  btn.addEventListener("click", () => setOpen(!open));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  addEventListener("pointerdown", (e) => { if (open && !card.contains(e.target) && !btn.contains(e.target)) setOpen(false); });
  card.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  matchMedia("(max-width: 580px)").addEventListener("change", (e) => { if (!e.matches) setOpen(false); });
}

// Breathing status dot: the dot scales 1 -> 1.35 -> 1 -> 1 in three 600 ms legs,
// the halo scales 1 -> 3 and fades .8 -> 0 over 1800 ms, forever.
export function initBreath() {
  if (reduced) return;
  document.querySelectorAll("[data-breath]").forEach((el) => {
    const dot = el.querySelector(".b-dot"), halo = el.querySelector(".b-halo");
    let off = null, t0 = performance.now();
    const run = (now) => {
      const t = ((now - t0) % 1800) / 1800;
      const s = t < 1 / 3 ? 1 + 0.35 * (t * 3) : t < 2 / 3 ? 1.35 - 0.35 * ((t - 1 / 3) * 3) : 1;
      dot.style.transform = `scale(${s})`;
      halo.style.transform = `scale(${1 + 2 * t})`;
      halo.style.opacity = 0.8 * (1 - t);
    };
    onView(el, (hit) => {
      if (hit && !off) off = ticker.add(run, 16);
      else if (!hit && off) { off(); off = null; }
    });
  });
}

// Primary CTA "handoff" hover + glass button ring sweep.
export function initButtons(root = document) {
  root.querySelectorAll(".cta").forEach((b) => {
    if (b.__cta) return; b.__cta = true;
    const ink = b.querySelector(".cta-ink"), fillL = b.querySelector(".cta-fill"), ring = b.querySelector(".cta-ring");
    const label = ink && ink.querySelector(".cta-label"), chev = ink && ink.querySelector(".cta-chev");
    if (!ink) return;
    const p = springs({ p: 0, s: 1 }, (v) => {
      const q = Math.max(0, Math.min(1, v.p));
      fillL.style.opacity = 1 - q * q;
      ink.style.clipPath = q <= 0.001 ? "inset(0 100% 0 0 round 999px)" : `inset(0 ${(1 - q) * 100}% 0 0 round 999px)`;
      if (label) label.style.transform = `translateX(${-5 * q}px)`;
      if (chev) { chev.style.transform = `translateX(${-8 + 8 * q}px)`; chev.style.opacity = q; }
      b.style.transform = v.s === 1 ? "" : `scale(${v.s})`;
    });
    let tw = null, fill = 0;
    const ringTo = (to) => {
      tw && tw.stop();
      const from = fill, dur = to > from ? 1100 : 450;
      tw = tween(dur * Math.abs(to - from), ease.inOutCubic, (e) => { fill = from + (to - from) * e; ring.style.setProperty("--fill", `${fill * 100}%`); });
    };
    if (!fine) return;
    let hover = false;
    b.addEventListener("pointerenter", () => { hover = true; p.start({ p: 1, s: 1.02 }, { config: SPRING }); ringTo(1); });
    b.addEventListener("pointerleave", () => { hover = false; p.start({ p: 0, s: 1 }, { config: SPRING }); ringTo(0); });
    b.addEventListener("pointerdown", () => p.start({ s: 0.97 }, { config: SPRING }));
    b.addEventListener("pointerup", () => p.start({ s: hover ? 1.02 : 1 }, { config: SPRING }));
  });
  root.querySelectorAll(".glass-btn").forEach((b) => {
    if (b.__gb) return; b.__gb = true;
    const ring = b.querySelector(".glass-ring");
    const s = new Spring(1, (v) => { b.style.transform = v === 1 ? "" : `scale(${v})`; });
    let tw = null, fill = 0;
    const ringTo = (to) => {
      if (!ring) return;
      tw && tw.stop();
      const from = fill, dur = to > from ? 1100 : 450;
      tw = tween(dur * Math.abs(to - from), ease.inOutCubic, (e) => { fill = from + (to - from) * e; ring.style.setProperty("--fill", `${fill * 100}%`); });
    };
    if (!fine) return;
    b.addEventListener("pointerenter", () => ringTo(1));
    b.addEventListener("pointerleave", () => { ringTo(0); s.start(1, { config: SPRING_SOFT }); });
    b.addEventListener("pointerdown", () => s.start(0.97, { config: SPRING_SOFT }));
    b.addEventListener("pointerup", () => s.start(1, { config: SPRING_SOFT }));
  });
}
