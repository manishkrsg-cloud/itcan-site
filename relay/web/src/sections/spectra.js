// Hero service slider: a CSS-3D coverflow of ITCAN services and practices on the right of
// the hero. Each card is a full-bleed AI artwork (made for ITCAN with Higgsfield) with the
// service name, a short explanation and tags over it. The centre card lifts, its hue lights
// the halo and its artwork drifts slowly. It autoplays; drag, swipe, the arrows, arrow keys
// or a click spin the fan. The frame loop only runs while something moves.
import { reduced } from "../core/engine.js";
import { scrollTo } from "../core/scroll.js";
import { createCoverflow } from "../coverflow.js";

const SLIDES = [
  { name: "Business consulting", kind: "Service", img: "consult", href: "#product", glow: "#ff3d48",
    desc: "Certified consultants help you pick the right platform, roll it out and get a fast return on what you spend.",
    tags: ["Requirements", "Platform choice", "Roll-out"] },
  { name: "Staffing solutions", kind: "Service", img: "staff", href: "#pricing", glow: "#ff8a4c", cta: "Build your team",
    desc: "Skilled IT people who join your team when you need them. Start with one specialist or a full team, and scale as the work changes.",
    tags: ["IT specialists", "Dedicated teams", "Scale up or down"] },
  { name: "Customized solutions", kind: "Service", img: "build", href: "#product", glow: "#6d88ff",
    desc: "Software built around how your business works. We learn the problem first, then design and deliver the fix.",
    tags: ["On-site consulting", "Turnkey projects"] },
  { name: "Outsourcing", kind: "Service", img: "layers", href: "#product", glow: "#a57bff",
    desc: "A dedicated development team in three layers. Each layer owns its own architecture and delivery.",
    tags: ["Front-end", "Middle layer", "Back-end"] },
  { name: "Managing applications", kind: "Service", img: "run", href: "#product", glow: "#35d0b2",
    desc: "New systems need support while old ones still need upgrades. We carry both, so your people stay on the business.",
    tags: ["Support", "Upgrades", "Roll-outs"] },
  { name: "ERP and CRM", kind: "Practice", img: "erp", href: "#integrations", glow: "#e6ad66",
    desc: "Enterprise applications chosen, rolled out and supported, connected to the rest of your business.",
    tags: ["ERP", "CRM", "Enterprise apps"] },
  { name: "Java and Microsoft", kind: "Practice", img: "code", href: "#integrations", glow: "#79a2dc",
    desc: "Engineers across Java and Microsoft technologies, programming languages, databases and operating systems.",
    tags: ["Java", "Microsoft", "RDBMS"] },
  { name: "Web and portals", kind: "Practice", img: "web", href: "#integrations", glow: "#ff6f9a",
    desc: "Web technologies and portals, from the screens your users see to the systems behind them.",
    tags: ["Web", "Portals", "Front-end"] },
];
const N = SLIDES.length;
const CARD_W = 440, CARD_H = 584;
const pad = (n) => String(n).padStart(2, "0");
const src = (slug, w) => `/assets/services/${slug}-${w}.webp`;

export function initSpectra(root) {
  if (!root) return null;
  const live = root.querySelector("[data-sp-live]"), foot = root.querySelector(".sp-foot");
  const tN = root.querySelector("[data-sp-n]"), tKind = root.querySelector("[data-sp-kind]"), cta = root.querySelector("[data-sp-cta]");

  const build = (i) => {
    const s = SLIDES[i];
    const el = document.createElement("button");
    el.type = "button";
    el.setAttribute("aria-label", `${s.name}. ${s.desc} ${s.kind} ${i + 1} of ${N}`);
    el.style.setProperty("--glow", s.glow);
    el.innerHTML = `<span class="sp-inner">`
      + `<span class="sp-media"><img class="sp-img" src="${src(s.img, 480)}" srcset="${src(s.img, 480)} 480w, ${src(s.img, 880)} 880w" sizes="(max-width: 600px) 86vw, 440px" width="880" height="1168" alt="" decoding="async" draggable="false" fetchpriority="${i === 0 ? "high" : "low"}"></span>`
      + `<span class="sp-shade" aria-hidden="true"></span><span class="sp-sheen" aria-hidden="true"></span>`
      + `<span class="sp-top"><span class="sp-id"><span class="sp-mark mark mark--lit" aria-hidden="true"><svg><use href="#g-i"/></svg></span><span class="sp-num">${pad(i + 1)}</span></span><span class="sp-kind">${s.kind}</span></span>`
      + `<span class="sp-body"><span class="sp-name">${s.name}</span><span class="sp-desc">${s.desc}</span>`
      + `<span class="sp-tags">${s.tags.map((t) => `<i>${t}</i>`).join("")}</span></span>`
      + `</span>`;
    const img = el.querySelector("img");
    img.addEventListener("error", () => el.classList.add("-noimg"), { once: true });
    return el;
  };

  const onActive = (i) => {
    const s = SLIDES[i];
    root.style.setProperty("--halo", s.glow);
    tN.textContent = `${pad(i + 1)} / ${pad(N)}`;
    tKind.textContent = `${s.kind}: ${s.name}`;
    cta.setAttribute("href", s.href);
    cta.firstElementChild.textContent = s.cta || (s.kind === "Service" ? "Explore services" : "See our practices");
    live.textContent = `${s.name}, ${i + 1} of ${N}`;
    if (!reduced && foot) { const k = foot.querySelector(".sp-kicker"); k.classList.remove("sp-swap"); void k.offsetWidth; k.classList.add("sp-swap"); }
  };

  // wide screens: the fan fills the right column inside the first screen.
  // stacked (tablet, phone): the fan sits under the headline and may run past the fold.
  const fit = (w) => {
    if (w < 600) return Math.max(0.56, Math.min(0.77, w / 500));
    if (innerWidth <= 900) return Math.max(0.58, Math.min(0.82, w / 720));
    const footH = foot ? foot.offsetHeight : 64;
    const room = innerHeight - 88 - footH - 100;
    return Math.max(0.56, Math.min(1, w / 760, room / CARD_H));
  };

  const cf = createCoverflow({
    root, stage: root.querySelector(".sp-stage"), deck: root.querySelector(".sp-deck"),
    count: N, build, cardClass: "sp-card", cardW: CARD_W, cardH: CARD_H, persp: 1900,
    geo: { gap: 215, rotate: 40, depth: 200, drop: 14, shrink: 0.12, fade: 0.34, dim: 0.3, visible: 2 },
    autoplayMs: 4600,
    fit, onActive,
    onOpen: (i) => { const t = document.querySelector(SLIDES[i].href); if (t) scrollTo(t); },
  });

  const prev = root.querySelector("[data-sp-prev]"), next = root.querySelector("[data-sp-next]");
  if (prev) prev.addEventListener("click", () => cf.prev());
  if (next) next.addEventListener("click", () => cf.next());
  // a visible pause for the autoplay (WCAG 2.2.2)
  const pauseBtn = root.querySelector("[data-sp-pause]");
  if (pauseBtn) {
    if (reduced) pauseBtn.hidden = true;
    pauseBtn.addEventListener("click", () => {
      const on = pauseBtn.getAttribute("aria-pressed") !== "true";
      pauseBtn.setAttribute("aria-pressed", String(on));
      pauseBtn.setAttribute("aria-label", on ? "Play the slideshow" : "Pause the slideshow");
      cf.pause(on);
    });
  }
  return cf;
}
