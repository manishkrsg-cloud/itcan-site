// Hero service slider: a CSS-3D coverflow of ITCAN services and practices.
// The centre card lifts and its hue lights the halo; it autoplays, and drag, swipe,
// arrow keys or a click spin the fan. The frame loop only runs while something moves.
import { reduced } from "../core/engine.js";
import { scrollTo } from "../core/scroll.js";
import { createCoverflow } from "../coverflow.js";

const ART = {
  consult: '<circle cx="60" cy="60" r="44" opacity=".28"/><circle cx="60" cy="60" r="30" stroke-dasharray="2 6" opacity=".6"/><path d="M60 24 69 60 60 96 51 60Z" fill="currentColor" fill-opacity=".14"/><path d="M60 24 69 60H51Z" fill="currentColor" stroke="none"/><circle cx="60" cy="60" r="4" fill="currentColor" stroke="none"/><path d="M60 8v6M60 106v6M8 60h6M106 60h6" opacity=".6"/>',
  build: '<rect x="14" y="22" width="92" height="72" rx="10" opacity=".5"/><path d="M14 38h92" opacity=".5"/><circle cx="24" cy="30" r="2" fill="currentColor" stroke="none"/><circle cx="31" cy="30" r="2" fill="currentColor" stroke="none" opacity=".6"/><path d="M47 54 36 66l11 12M73 54l11 12-11 12"/><path d="M65 50 55 82" opacity=".8"/>',
  layers: '<path d="M60 20 102 40 60 60 18 40Z" fill="currentColor" fill-opacity=".16"/><path d="M18 57 60 77 102 57" opacity=".8"/><path d="M18 74 60 94 102 74" opacity=".5"/><circle cx="60" cy="40" r="3.5" fill="currentColor" stroke="none"/>',
  run: '<circle cx="60" cy="60" r="44" opacity=".25"/><path d="M14 64h22l8-20 12 36 10-28 7 12h33"/><circle cx="96" cy="64" r="3.5" fill="currentColor" stroke="none"/>',
  erp: '<circle cx="60" cy="60" r="10" fill="currentColor" fill-opacity=".25"/><path d="M60 50V24M60 70v26M51 55 29 42M69 65l22 13M51 65 29 78M69 55l22-13" opacity=".6"/><circle cx="60" cy="20" r="6"/><circle cx="60" cy="100" r="6"/><circle cx="25" cy="40" r="6"/><circle cx="95" cy="80" r="6"/><circle cx="25" cy="80" r="6"/><circle cx="95" cy="40" r="6"/>',
  code: '<rect x="16" y="24" width="88" height="68" rx="10" opacity=".55"/><path d="M30 46l12 10-12 10"/><path d="M50 70h26" opacity=".85"/><path d="M16 84h88" opacity=".3"/><circle cx="92" cy="36" r="3" fill="currentColor" stroke="none" opacity=".7"/>',
  web: '<rect x="14" y="20" width="92" height="76" rx="10" opacity=".55"/><path d="M14 34h92" opacity=".55"/><rect x="24" y="44" width="32" height="40" rx="5" fill="currentColor" fill-opacity=".18"/><path d="M66 48h30M66 58h22M66 68h26M66 78h16" opacity=".8"/>',
};

const SLIDES = [
  { name: "Business consulting", kind: "Service", art: "consult", href: "#product", line: "Choose the right platform, roll it out and get a fast return on what you spend.", c1: "#d9202c", c2: "#1a0306", glow: "#ff3d48" },
  { name: "Customized solutions", kind: "Service", art: "build", href: "#product", line: "Software built around how your business works, from on-site consulting to turnkey projects.", c1: "#3f6bc8", c2: "#0b1224", glow: "#6d88ff" },
  { name: "Outsourcing", kind: "Service", art: "layers", href: "#product", line: "A dedicated development team in three layers: front-end, middle layer and database.", c1: "#7d4fd6", c2: "#140b26", glow: "#a57bff" },
  { name: "Managing applications", kind: "Service", art: "run", href: "#product", line: "Support and upgrades for old and new systems, so your people can stay on the business.", c1: "#1b9a86", c2: "#051e1a", glow: "#35d0b2" },
  { name: "ERP and CRM", kind: "Practice", art: "erp", href: "#integrations", line: "Enterprise applications chosen, rolled out and supported by certified consultants.", c1: "#c48a45", c2: "#2a1a0c", glow: "#e6ad66" },
  { name: "Java and Microsoft", kind: "Practice", art: "code", href: "#integrations", line: "Java and Microsoft technologies, databases and operating systems.", c1: "#4f78b0", c2: "#0a0f18", glow: "#79a2dc" },
  { name: "Web and portals", kind: "Practice", art: "web", href: "#integrations", line: "Web technologies and portals, from the front-end to the back-end.", c1: "#cf4a78", c2: "#21060f", glow: "#ff6f9a" },
];
const N = SLIDES.length;
const CARD_H = 310;
const pad = (n) => String(n).padStart(2, "0");

export function initSpectra(root) {
  if (!root) return null;
  const live = root.querySelector("[data-sp-live]"), foot = root.querySelector(".sp-foot");
  const tN = root.querySelector("[data-sp-n]"), tKind = root.querySelector("[data-sp-kind]"), tTitle = root.querySelector("[data-sp-title]"), tLine = root.querySelector("[data-sp-line]"), cta = root.querySelector("[data-sp-cta]");

  const build = (i) => {
    const s = SLIDES[i];
    const el = document.createElement("button");
    el.type = "button";
    el.setAttribute("aria-label", `${s.name}, ${s.kind.toLowerCase()} ${i + 1} of ${N}`);
    el.style.setProperty("--c1", s.c1);
    el.style.setProperty("--c2", s.c2);
    el.innerHTML = `<span class="sp-inner"><span class="sp-media"></span>`
      + `<svg class="sp-art" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ART[s.art]}</svg>`
      + `<span class="sp-meta"><span class="sp-top"><span class="sp-num">${pad(i + 1)}</span><span class="sp-kind">${s.kind}</span></span><span class="sp-name">${s.name}</span></span></span>`;
    return el;
  };

  const onActive = (i) => {
    const s = SLIDES[i];
    root.style.setProperty("--halo", s.glow);
    tN.textContent = `${pad(i + 1)} / ${pad(N)}`;
    tKind.textContent = s.kind;
    tTitle.textContent = s.name;
    tLine.textContent = s.line;
    cta.setAttribute("href", s.href);
    cta.firstElementChild.textContent = s.kind === "Service" ? "Explore services" : "See our practices";
    live.textContent = `${s.name}, ${i + 1} of ${N}`;
    if (!reduced && foot) { foot.classList.remove("sp-swap"); void foot.offsetWidth; foot.classList.add("sp-swap"); }
  };

  return createCoverflow({
    root, stage: root.querySelector(".sp-stage"), deck: root.querySelector(".sp-deck"),
    count: N, build, cardClass: "sp-card", cardW: 240, cardH: CARD_H,
    geo: { gap: 150, rotate: 38, depth: 150, drop: 22, shrink: 0.14, fade: 0.3, dim: 0.22, visible: 2 },
    // fit the fan to the room the hero gives it
    fit: (w, h) => Math.max(0.5, Math.min(1, w / (w < 600 ? 540 : 820), (h - 264) / CARD_H)),
    onActive,
    onOpen: (i) => { const t = document.querySelector(SLIDES[i].href); if (t) scrollTo(t); },
  });
}
