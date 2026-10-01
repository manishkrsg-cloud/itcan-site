// Hero service slider: a CSS-3D coverflow of ITCAN services and practices on the right of
// the hero. Each card is a full-bleed AI artwork (made for ITCAN with Higgsfield) with the
// service name, a short explanation and tags over it. The centre card lifts, its hue lights
// the halo and its artwork drifts slowly. It autoplays; drag, swipe, the arrows, arrow keys
// or a click spin the fan. The frame loop only runs while something moves.
import { reduced } from "../core/engine.js";
import { scrollTo } from "../core/scroll.js";
import { createCoverflow } from "../coverflow.js";

const SLIDES = [
  { name: "Business consulting", kind: "Service", img: "consult-p", href: "#product", glow: "#ff3d48",
    desc: "Consultants who shape your digital and AI roadmap, select the right cloud and SaaS platforms, and roll them out with confidence.",
    tags: ["AI roadmap", "Cloud strategy", "Platform selection"] },
  { name: "Staffing solutions", kind: "Service", img: "staff-p", href: "#pricing", glow: "#ff8a4c", cta: "Build your team",
    desc: "Cloud, data, AI and full-stack engineers who join your team when you need them. Start with one specialist or a full squad, and scale as priorities change.",
    tags: ["AI talent", "Dedicated squads", "Scale up or down"] },
  { name: "Customised solutions", kind: "Service", img: "build-p", href: "#product", glow: "#6d88ff",
    desc: "Cloud-native software designed around how your business works, with AI built in where it adds value. We understand the problem first, then design, build and deliver.",
    tags: ["Cloud-native", "AI-ready", "Turnkey delivery"] },
  { name: "Outsourcing", kind: "Service", img: "layers-p", href: "#product", glow: "#a57bff",
    desc: "A dedicated agile squad across front-end, APIs and cloud data, with DevOps built in and a clear owner for each layer.",
    tags: ["Front-end", "APIs", "Cloud data"] },
  { name: "Managed applications", kind: "Service", img: "run-p", href: "#product", glow: "#35d0b2",
    desc: "We run, secure and upgrade your systems with 24/7 monitoring and automation, so your team stays focused on the business.",
    tags: ["24/7 monitoring", "Cloud ops", "Upgrades"] },
  { name: "ERP and CRM", kind: "Practice", img: "erp-p", href: "#integrations", glow: "#e6ad66",
    desc: "SAP S/4HANA, Microsoft Dynamics 365, Salesforce and Oracle, rolled out, supported and connected to the rest of your business.",
    tags: ["SAP S/4HANA", "Dynamics 365", "Salesforce"] },
  { name: "Cloud, AI and modernisation", kind: "Practice", img: "code-p", href: "#integrations", glow: "#79a2dc",
    desc: "Legacy Java and .NET systems moved to microservices on AWS, Azure or Google Cloud, with DevOps pipelines and generative AI built in.",
    tags: ["Cloud", "Microservices", "GenAI"] },
  { name: "Web and mobile", kind: "Practice", img: "web-p", href: "#integrations", glow: "#ff6f9a",
    desc: "Web apps, portals and mobile apps, from the screens your users see to the systems behind them.",
    tags: ["React", "Next.js", "Flutter"] },
];
const N = SLIDES.length;
const CARD_W = 440, CARD_H = 584;
const pad = (n) => String(n).padStart(2, "0");
const src = (slug, w) => `/assets/services/${slug}-${w}.webp`;
// light-theme versions of the photographs (the same scenes in daylight). A card without one, or whose
// light file fails to load, keeps its dark art in light mode.
const LIGHT = {
  "consult-p": "consult-pl", "staff-p": "staff-pl", "build-p": "build-pl", "layers-p": "layers-pl", "run-p": "run-pl",
  "erp-p": "erp-pl", "code-p": "code-pl", "web-p": "web-pl",
};
const failed = new Set();
const isLight = () => document.documentElement.getAttribute("data-theme") === "light";
const artFor = (slug) => (isLight() && LIGHT[slug] && !failed.has(slug) ? LIGHT[slug] : slug);

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
    const art = artFor(s.img);
    el.dataset.art = s.img;
    el.classList.toggle("-lightart", art !== s.img);
    el.innerHTML = `<span class="sp-inner">`
      + `<span class="sp-media"><img class="sp-img" data-cur="${art}" src="${src(art, 480)}" srcset="${src(art, 480)} 480w, ${src(art, 880)} 880w" sizes="(max-width: 600px) 86vw, 440px" width="880" height="1168" alt="" decoding="async" draggable="false" fetchpriority="${i === 0 ? "high" : "low"}"></span>`
      + `<span class="sp-shade" aria-hidden="true"></span><span class="sp-sheen" aria-hidden="true"></span>`
      + `<span class="sp-top"><span class="sp-num">${pad(i + 1)}</span><span class="sp-kind">${s.kind}</span></span>`
      + `<span class="sp-body"><span class="sp-name">${s.name}</span><span class="sp-desc">${s.desc}</span>`
      + `<span class="sp-tags">${s.tags.map((t) => `<i>${t}</i>`).join("")}</span></span>`
      + `</span>`;
    const img = el.querySelector("img");
    img.addEventListener("error", () => {
      if (img.dataset.cur !== s.img) { failed.add(s.img); paintArt(el); } // light art missing: back to dark
      else el.classList.add("-noimg");
    });
    return el;
  };
  // swap a card between its dark and light art when the theme changes
  function paintArt(el) {
    const slug = el.dataset.art, use = artFor(slug), img = el.querySelector(".sp-img");
    if (!img || img.dataset.cur === use) return;
    img.dataset.cur = use;
    img.srcset = `${src(use, 480)} 480w, ${src(use, 880)} 880w`;
    img.src = src(use, 480);
    el.classList.toggle("-lightart", use !== slug);
  }
  window.addEventListener("itcan:theme", () => root.querySelectorAll(".sp-card").forEach(paintArt));

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
