// 09 Engage: the team-size meter (drag to see a model), the digit roll, and the lit plan card.
import { Spring, springs, SPRING, SPRING_SOFT, GROW, SNAP, reduced, fine } from "../core/engine.js";
import { focus } from "../core/prims.js";
import { onSeen } from "../core/seen.js";

const FRAMES = { 1440: { len: 860, stops: [0, 373, 760], fx: 0 }, 1024: { len: 616, stops: [0, 265, 616], fx: 0 }, 768: { len: 614, stops: [0, 262, 614], fx: 13 }, 390: { len: 284, stops: [0, 120, 284], fx: 13 } };
const frameOf = (w) => (w <= 580 ? 390 : w <= 900 ? 768 : w <= 1200 ? 1024 : 1440);
const PLANS = [
  { name: "Business consulting", inc: "Senior consultants on your site" },
  { name: "Dedicated team", inc: "Three layers, one lead each" },
  { name: "Managed service", inc: "Support, upgrades and roll-outs" },
];
const planOf = (n) => (n <= 3 ? 0 : n <= 30 ? 1 : 2);

function swapText(host) {
  let cur = host.firstElementChild;
  return (text) => {
    if (cur.textContent === text) return;
    const next = document.createElement("span");
    next.textContent = text;
    host.appendChild(next);
    const old = cur;
    cur = next;
    if (reduced) { old.remove(); return; }
    const a = new Spring(0, (v) => { next.style.opacity = v; next.style.filter = `blur(${(1 - v) * 6}px)`; });
    const b = new Spring(1, (v) => { old.style.opacity = v; old.style.filter = `blur(${(1 - v) * 6}px)`; if (v <= 0.001) old.remove(); });
    next.style.opacity = 0;
    a.start(1, { config: SPRING_SOFT }); b.start(0, { config: SPRING_SOFT });
  };
}

function digitRoll(el) {
  const cols = [0, 1, 2].map(() => {
    const w = document.createElement("span"); w.className = "wrap";
    const c = document.createElement("span"); c.className = "col";
    c.innerHTML = Array.from({ length: 11 }, (_, i) => `<i>${i < 10 ? i : "​"}</i>`).join("");
    w.appendChild(c); el.appendChild(w);
    return { w, c };
  });
  let dw = 0;
  const measure = () => { const i = cols[0].c.firstChild; dw = i.getBoundingClientRect().width || 0; };
  const sp = cols.map((col) => springs({ v: 10, w: 0 }, (s) => {
    col.c.style.transform = `translateY(${-s.v * 100 / 11}%)`;
    col.w.style.width = `${s.w}px`;
  }));
  return {
    set(n, immediate) {
      if (!dw) measure();
      const s = String(n).padStart(3, " ");
      [...s].forEach((ch, i) => {
        const v = ch === " " ? 10 : +ch;
        const target = { v, w: v === 10 ? 0 : dw };
        if (immediate || reduced) sp[i].set(target);
        else sp[i].start(target, { config: GROW, delay: i * 56 });
      });
    },
    measure,
  };
}

export function initEngage() {
  const sec = document.getElementById("pricing");
  if (!sec) return;
  const meter = sec.querySelector("[data-meter]");
  const input = meter.querySelector(".mt-input"), fill = meter.querySelector(".mt-fill"), knob = meter.querySelector(".mt-knob");
  const ticks = Array.from(meter.querySelectorAll(".mt-tick")), stops = Array.from(meter.querySelectorAll(".mt-stop"));
  const planSwap = swapText(meter.querySelector('[data-swap="plan"]')), incSwap = swapText(meter.querySelector('[data-swap="inc"]'));
  const sr = meter.querySelector("[data-people-sr]");
  const roll = digitRoll(meter.querySelector(".roll"));
  const cards = Array.from(sec.querySelectorAll(".plan"));
  let frame = frameOf(innerWidth), F = FRAMES[frame];
  let pos = 1, hoverCard = -1, plan = 1;

  const pxOf = (p) => { const i = p <= 1 ? 0 : 1; return F.stops[i] + (p - i) * (F.stops[i + 1] - F.stops[i]); };
  const posOf = (px) => { const i = px <= F.stops[1] ? 0 : 1; return i + (px - F.stops[i]) / (F.stops[i + 1] - F.stops[i]); };
  const maxPos = () => posOf(F.len);
  const k = () => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
  const fS = new Spring(pxOf(1) / F.len, (f) => {
    knob.style.left = `${f * 100}%`;
    fill.style.width = `${(F.fx + f * F.len) * k()}px`;
  });

  // ---- lit card cross-fade
  const lit = cards.map((c) => {
    const glow = c.querySelector(".plan-glow"), stroke = c.querySelector(".plan-stroke"), tier = c.querySelector(".tier-btn"), cta = c.querySelector(".plan-cta");
    const s = new Spring(0, (v) => {
      glow.style.opacity = v; stroke.style.opacity = v;
      tier.style.opacity = 1 - v; cta.style.opacity = v;
    });
    return { s, tier, cta };
  });
  const setLit = () => {
    const on = hoverCard >= 0 ? hoverCard : plan;
    lit.forEach((l, i) => {
      l.s.start(i === on ? 1 : 0, { config: SPRING_SOFT });
      const active = i === on;
      l.cta.style.pointerEvents = active ? "auto" : "none";
      l.cta.setAttribute("aria-hidden", String(!active)); l.cta.tabIndex = active ? 0 : -1;
      l.tier.setAttribute("aria-hidden", String(active)); l.tier.tabIndex = active ? -1 : 0;
      l.tier.style.pointerEvents = active ? "none" : "auto";
    });
  };

  const apply = (immediate) => {
    const n = Math.max(1, Math.round(Math.pow(10, pos)));
    plan = planOf(n);
    planSwap(PLANS[plan].name); incSwap(PLANS[plan].inc);
    roll.set(n, immediate);
    sr.textContent = `${n} ${n === 1 ? "person" : "people"}`;
    input.setAttribute("aria-valuetext", `${n} ${n === 1 ? "person" : "people"}, ${PLANS[plan].name}`);
    const near = pos < 0.5 ? 0 : pos < 1.5 ? 1 : 2;
    stops.forEach((s, i) => s.classList.toggle("on", i === near));
    ticks.forEach((t, i) => t.classList.toggle("on", i === near));
    const f = pxOf(pos) / F.len;
    if (immediate) fS.set(f); else fS.start(f, { config: SPRING });
    setLit();
  };
  const syncInput = () => { input.max = F.len; input.value = Math.round(pxOf(pos)); };
  // phones: the plans are a swipe row, so dragging the meter glides the row to the plan it suggests
  const row = sec.querySelector(".plans"), swipe = matchMedia("(max-width: 580px)");
  const glideTo = (i) => {
    if (!row || !swipe.matches || row.scrollWidth <= row.clientWidth) return;
    const pad = parseFloat(getComputedStyle(row).scrollPaddingInlineStart) || 0;
    const dx = cards[i].getBoundingClientRect().left - row.getBoundingClientRect().left;
    row.scrollTo({ left: row.scrollLeft + dx - pad, behavior: reduced ? "auto" : "smooth" });
  };
  input.addEventListener("input", () => { const was = plan; pos = Math.min(maxPos(), posOf(+input.value)); apply(false); if (plan !== was) glideTo(plan); });
  syncInput();
  apply(true);
  if (document.fonts) document.fonts.ready.then(() => { roll.measure(); apply(true); });
  addEventListener("resize", () => {
    const f = frameOf(innerWidth);
    if (f !== frame) { frame = f; F = FRAMES[f]; pos = Math.min(pos, maxPos()); syncInput(); }
    apply(true);
  });

  // ---- card hover + tier buttons (fill from the side the pointer came in)
  cards.forEach((c, i) => {
    if (fine) {
      c.addEventListener("pointerenter", () => { hoverCard = i; setLit(); });
      c.addEventListener("pointerleave", () => { hoverCard = -1; setLit(); });
    }
    const tb = c.querySelector(".tier-btn"), tf = tb.querySelector(".tb-fill");
    let side = "l";
    const s = new Spring(0, (v) => { const r = (1 - Math.max(0, Math.min(1, v))) * 100; tf.style.clipPath = side === "l" ? `inset(0 ${r}% 0 0 round 999px)` : `inset(0 0 0 ${r}% round 999px)`; });
    const pr = new Spring(1, (v) => { tb.style.transform = v === 1 ? "" : `scale(${v})`; });
    if (fine) {
      tb.addEventListener("pointerenter", (e) => { const r = tb.getBoundingClientRect(); side = e.clientX < r.left + r.width / 2 ? "l" : "r"; s.start(1, { config: SPRING_SOFT }); });
      tb.addEventListener("pointerleave", (e) => { const r = tb.getBoundingClientRect(); side = e.clientX < r.left + r.width / 2 ? "l" : "r"; s.start(0, { config: SPRING_SOFT }); });
      tb.addEventListener("pointerdown", () => pr.start(0.97, { config: SPRING }));
      tb.addEventListener("pointerup", () => pr.start(1, { config: SPRING }));
    }
    // entrance: checks pop and draw, lines focus in, off the card being seen
    const d = (i + 2) * 70;
    const feats = Array.from(c.querySelectorAll(".plan-feats li"));
    const parts = feats.map((li) => {
      const svg = li.querySelector("svg"), txt = li.querySelector("span");
      return { pop: new Spring(0, (v) => { svg.style.opacity = Math.max(0, Math.min(1, v)); svg.style.transform = `scale(${0.5 + 0.5 * v})`; }), f: focus(txt, 8, SPRING) };
    });
    if (reduced) { parts.forEach((p) => { p.pop.set(1); p.f.play(0); }); return; }
    parts.forEach((p) => p.f.reset());
    onSeen(c, () => parts.forEach((p, j) => { p.pop.start(1, { config: SNAP, delay: d + (1 + j) * 40 }); p.f.play(d + (2 + j) * 40); }));
  });
}
