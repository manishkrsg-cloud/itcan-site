// 10 Footer: one staged timeline (top panels, then the links row), the glyph loop
// and the call-back form.
import { Spring, springs, SPRING, SPRING_SOFT, SNAP, reduced, ticker } from "../core/engine.js";
import { rise, focus, fade, draw, type } from "../core/prims.js";
import { onSeen, onView } from "../core/seen.js";
import { isOpen } from "./hero.js";

const ZONES = ["Asia/Singapore", "Asia/Kuala_Lumpur", "Australia/Sydney", "Asia/Hong_Kong", "Asia/Kolkata", "Asia/Jakarta"];

export function initFooter() {
  const ft = document.getElementById("footer");
  if (!ft) return;
  const q = (s) => ft.querySelector(`[data-ft="${s}"]`);

  // live status: how many offices are inside working hours right now
  const oc = ft.querySelector("[data-open-count]");
  const upd = () => { const n = ZONES.filter(isOpen).length; oc.textContent = n ? `${n} of 6 offices open right now` : "6 offices, back at 9am local"; };
  upd(); setInterval(upd, 60000);
  const y = ft.querySelector("[data-year]"); if (y) y.textContent = new Date().getFullYear();

  // ---- staged entrance
  const cues = {
    cta: rise(q("cta")), brand: rise(q("brand")),
    eye: type(q("eye")), copy: focus(q("copy"), 8), form: rise(q("form")), tag: focus(q("tag"), 8),
    phair: draw(q("phair")), social: fade(q("social")),
    hairb: draw(q("hairb")), company: rise(q("company")), hairf: draw(q("hairf")), legal: fade(q("legal")),
    cols: [0, 1, 2, 3].map((i) => rise(q("col" + i))),
  };
  const line = q("line");
  const lineS = new Spring(108, (v) => { line.style.transform = v === 0 ? "none" : `translateY(${v}%)`; });
  const dots = [0, 1, 2].map((i) => { const d = q("dot" + i); return new Spring(0, (v) => { d.style.opacity = 0.2 + 0.8 * v; d.style.transform = `scale(${0.6 + 0.4 * v})`; }); });
  const labels = [0, 1, 2].map((i) => fade(q("st" + i)));
  const all = () => [cues.cta, cues.brand, cues.eye, cues.copy, cues.form, cues.tag, cues.phair, cues.social, cues.hairb, cues.company, cues.hairf, cues.legal, ...cues.cols, ...labels];
  if (reduced) { all().forEach((c) => c.play(0)); lineS.set(0); dots.forEach((d) => d.set(1)); }
  else {
    all().forEach((c) => c.reset());
    let topAt = 0;
    onSeen(ft.querySelector(".ft-s-top"), () => {
      topAt = performance.now();
      cues.cta.play(0); cues.brand.play(50); cues.eye.play(160); lineS.start(0, { config: SPRING, delay: 160 });
      cues.copy.play(260); cues.form.play(350); cues.tag.play(430); cues.phair.play(490); cues.social.play(540);
      dots.forEach((d, i) => d.start(1, { config: SPRING, delay: 620 + i * 130 }));
      labels.forEach((l, i) => l.play(680 + i * 130));
      setTimeout(startGlyph, 1200);
    });
    onSeen(ft.querySelector(".ft-s-bottom"), () => {
      const wait = Math.max(0, 350 - (performance.now() - (topAt || performance.now() - 350)));
      setTimeout(() => {
        cues.hairb.play(0); cues.company.play(40);
        cues.cols.forEach((c, i) => c.play(100 + i * 50));
        cues.hairf.play(300); cues.legal.play(380);
      }, topAt ? wait : 350);
    });
  }

  // ---- panel glyph loop ("step forward")
  const glyph = ft.querySelector(".ft-glyph"), gb = glyph.querySelector(".gb"), gf = glyph.querySelector(".gf");
  const p = new Spring(0, (v) => {
    const lead = Math.min(1, v / 0.7), trail = Math.max(0, (v - 0.3) / 0.7);
    gf.style.transform = `translateX(${26 * lead}px)`; gf.style.opacity = 0.12 + 0.08 * lead;
    gb.style.transform = `translateX(${26 * trail}px)`; gb.style.opacity = 0.06 + 0.05 * trail;
  });
  let unlocked = false, inView = false, T = 0;
  const cycle = () => {
    if (!inView) return;
    T = setTimeout(() => {
      p.start(1, { config: SNAP, onRest: () => { T = setTimeout(() => { p.start(0, { config: SNAP, onRest: () => { T = setTimeout(cycle, 2080 - 320); } }); }, 720); } });
    }, 320);
  };
  function startGlyph() { unlocked = true; if (inView && !reduced) cycle(); }
  onView(glyph, (hit) => {
    inView = hit;
    clearTimeout(T);
    if (!hit) p.set(0); else if (unlocked && !reduced) cycle();
  });

  // ---- call-back form: focus ring, arrow, "Drafted"
  const form = ft.querySelector("#ftForm"), input = form.querySelector("input"), ring = form.querySelector(".ft-ring");
  const lab = form.querySelector(".ft-lab"), a = form.querySelector(".ft-a"), b = form.querySelector(".ft-b"), arrow = form.querySelector(".ft-arrow"), arrowSvg = arrow.querySelector("svg");
  let focused = false, sent = false, wA = 0, wB = 0;
  const measure = () => { wA = a.getBoundingClientRect().width; wB = b.getBoundingClientRect().width; };
  const s = springs({ ring: 0, arrow: 0, done: 0, width: 0 }, (v) => {
    ring.style.opacity = v.ring;
    arrow.style.width = `${v.arrow * 22}px`; arrow.style.opacity = v.arrow; arrowSvg.style.transform = `translateX(${-6 * (1 - v.arrow)}px)`;
    a.style.opacity = 1 - v.done; a.style.transform = `translateY(${-8 * v.done}px)`;
    b.style.opacity = v.done; b.style.transform = `translateY(${8 * (1 - v.done)}px)`;
    if (v.width) lab.style.width = `${v.width}px`;
  });
  const go = () => s.start({ ring: focused ? 1 : 0, arrow: focused && !sent ? 1 : 0, done: sent ? 1 : 0, width: sent ? wB : wA }, { config: SPRING });
  requestAnimationFrame(() => { measure(); s.set({ width: wA }); });
  if (document.fonts) document.fonts.ready.then(() => { measure(); if (!sent) s.set({ width: wA }); });
  input.addEventListener("focus", () => { focused = true; go(); });
  input.addEventListener("blur", () => { focused = false; go(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!input.checkValidity()) { input.reportValidity(); return; }
    const body = `Hello ITCAN,\n\nPlease call me back about a project.\n\nEmail: ${input.value}\n`;
    location.href = `mailto:sales@itcan.biz?subject=${encodeURIComponent("Call back request from itcan.biz")}&body=${encodeURIComponent(body)}`;
    sent = true; go();
  });
  void SPRING_SOFT; void ticker;
}
