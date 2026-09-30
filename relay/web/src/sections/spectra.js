// Hero service slider: a CSS-3D coverflow of ITCAN services and practices.
// Each card carries a small product-style illustration and a short explanation.
// The centre card lifts and its hue lights the halo; it autoplays, and drag, swipe,
// arrow keys or a click spin the fan. The frame loop only runs while something moves.
import { reduced } from "../core/engine.js";
import { scrollTo } from "../core/scroll.js";
import { createCoverflow } from "../coverflow.js";

// ---- illustrations: 300 x 180 panels in the site's own UI language
const tick = (x, y) => `<path d="M${x - 3.5} ${y}l2.5 2.5 4.5-5" class="ic-tick"/>`;
const FIG = {
  consult: `
    <line x1="26" y1="40" x2="26" y2="136" class="s-dash"/>
    <circle cx="26" cy="40" r="8" class="f-acc"/>${tick(26, 40)}
    <text x="44" y="44" class="t-txt">Requirements</text>
    <circle cx="26" cy="88" r="8" class="f-acc"/>${tick(26, 88)}
    <text x="44" y="92" class="t-txt">Platform choice</text>
    <circle cx="26" cy="136" r="8" class="s-acc f-none" stroke-width="2"/><circle cx="26" cy="136" r="3.2" class="f-acc"/><circle cx="26" cy="136" r="8" class="f-acc anim-ring"/>
    <text x="44" y="140" class="t-mut">Roll-out</text>
    <text x="176" y="36" class="t-sm">Return on spend</text>
    <line x1="176" y1="150" x2="284" y2="150" class="s-grid"/><line x1="176" y1="118" x2="284" y2="118" class="s-grid"/><line x1="176" y1="86" x2="284" y2="86" class="s-grid"/>
    <path d="M176 144C198 138 212 126 228 108S262 66 282 52V150H176Z" class="f-area"/>
    <path d="M176 144C198 138 212 126 228 108S262 66 282 52" class="s-acc f-none" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="282" cy="52" r="4" class="f-acc"/><circle cx="282" cy="52" r="4" class="f-acc anim-ring"/>`,
  build: `
    <text x="16" y="26" class="t-sm"># client-portal</text><text x="284" y="26" class="t-sm" text-anchor="end">Today</text>
    <line x1="0" y1="38" x2="300" y2="38" class="s-grid"/>
    <rect x="16" y="52" width="28" height="28" rx="9" class="f-acc"/><text x="30" y="70.5" class="t-btn" text-anchor="middle">IT</text>
    <text x="54" y="62" class="t-txt">ITCAN delivery</text><text x="146" y="62" class="t-sm">9:41</text>
    <text x="54" y="80" class="t-mut">Release 2.4 passed user testing.</text>
    <text x="54" y="96" class="t-mut">Ship it to production tonight?</text>
    <rect x="54" y="108" width="104" height="20" rx="10" class="f-ok"/><circle cx="66" cy="118" r="3" class="f-okdot"/><text x="74" y="121.5" class="t-ok">All tests passed</text>
    <rect x="54" y="138" width="74" height="26" rx="13" class="f-acc anim-glow"/><text x="91" y="155" class="t-btn" text-anchor="middle">Approve</text>
    <rect x="136" y="138" width="58" height="26" rx="13" class="f-panel"/><text x="165" y="155" class="t-txt" text-anchor="middle">Hold</text>`,
  layers: `
    <path d="M86 128 138 104 86 80 34 104Z" class="f-plate"/>
    <path d="M86 102 138 78 86 54 34 78Z" class="f-plate"/>
    <path d="M86 76 138 52 86 28 34 52Z" class="f-plate-on anim-float"/>
    <line x1="140" y1="52" x2="160" y2="52" class="s-grid"/><line x1="140" y1="78" x2="160" y2="78" class="s-grid"/><line x1="140" y1="104" x2="160" y2="104" class="s-grid"/>
    <text x="166" y="48" class="t-sm">01</text><text x="166" y="62" class="t-txt">Web front-end</text>
    <text x="166" y="74" class="t-sm">02</text><text x="166" y="88" class="t-txt">Middle layer</text>
    <text x="166" y="100" class="t-sm">03</text><text x="166" y="114" class="t-txt">Database back-end</text>
    <text x="16" y="160" class="t-sm">One dedicated team, one owner per layer</text>`,
  run: `
    <text x="16" y="26" class="t-sm">Your estate, this week</text><text x="284" y="26" class="t-sm" text-anchor="end">4 systems</text>
    <line x1="0" y1="38" x2="300" y2="38" class="s-grid"/>
    <text x="16" y="60" class="t-txt">HR portal</text><text x="112" y="60" class="t-mut">v3.8 to v4.0</text><rect x="214" y="47" width="72" height="20" rx="10" class="f-chip"/><text x="250" y="61" class="t-chip" text-anchor="middle">Upgraded</text>
    <line x1="16" y1="74" x2="284" y2="74" class="s-grid"/>
    <text x="16" y="94" class="t-txt">ERP</text><text x="112" y="94" class="t-mut">Patch 12</text><rect x="214" y="81" width="72" height="20" rx="10" class="f-chip"/><text x="250" y="95" class="t-chip" text-anchor="middle">Patched</text>
    <line x1="16" y1="108" x2="284" y2="108" class="s-grid"/>
    <text x="16" y="128" class="t-txt">CRM</text><text x="112" y="128" class="t-mut">Watched</text><rect x="214" y="115" width="72" height="20" rx="10" class="f-ok"/><circle cx="227" cy="125" r="3" class="f-okdot"/><circle cx="227" cy="125" r="3" class="f-okdot anim-ring"/><text x="256" y="129" class="t-ok" text-anchor="middle">Healthy</text>
    <line x1="16" y1="142" x2="284" y2="142" class="s-grid"/>
    <text x="16" y="162" class="t-txt">Web store</text><text x="112" y="162" class="t-mut">Ticket closed</text><rect x="214" y="149" width="72" height="20" rx="10" class="f-panel"/><text x="250" y="163" class="t-mut" text-anchor="middle">Closed</text>`,
  erp: `
    <line x1="150" y1="92" x2="62" y2="46" class="s-link"/><line x1="150" y1="92" x2="238" y2="46" class="s-link"/>
    <line x1="150" y1="92" x2="62" y2="140" class="s-link"/><line x1="150" y1="92" x2="238" y2="140" class="s-link"/>
    <line x1="150" y1="92" x2="150" y2="22" class="s-link"/>
    <rect x="30" y="34" width="64" height="24" rx="12" class="f-panel"/><text x="62" y="50" class="t-txt" text-anchor="middle">Finance</text>
    <rect x="206" y="34" width="64" height="24" rx="12" class="f-panel"/><text x="238" y="50" class="t-txt" text-anchor="middle">HR</text>
    <rect x="30" y="128" width="64" height="24" rx="12" class="f-panel"/><text x="62" y="144" class="t-txt" text-anchor="middle">Sales</text>
    <rect x="206" y="128" width="64" height="24" rx="12" class="f-panel"/><text x="238" y="144" class="t-txt" text-anchor="middle">Stock</text>
    <rect x="124" y="10" width="52" height="22" rx="11" class="f-panel"/><text x="150" y="25" class="t-txt" text-anchor="middle">CRM</text>
    <circle cx="150" cy="92" r="26" class="f-acc anim-ring"/><circle cx="150" cy="92" r="24" class="f-acc"/><text x="150" y="96.5" class="t-btn" text-anchor="middle">ERP</text>`,
  code: `
    <rect x="0" y="0" width="300" height="30" class="f-bar"/>
    <rect x="12" y="7" width="86" height="23" rx="6" class="f-tab"/><text x="55" y="22" class="t-txt" text-anchor="middle">Payroll.java</text><line x1="12" y1="30" x2="98" y2="30" class="s-acc" stroke-width="2"/>
    <text x="126" y="22" class="t-mut" text-anchor="middle">Api.cs</text><text x="184" y="22" class="t-mut" text-anchor="middle">Query.sql</text>
    <g class="t-code">
      <text x="16" y="54">1</text><text x="16" y="74">2</text><text x="16" y="94">3</text><text x="16" y="114">4</text><text x="16" y="134">5</text><text x="16" y="154">6</text>
    </g>
    <rect x="36" y="46" width="44" height="9" rx="3" class="f-acc"/><rect x="86" y="46" width="70" height="9" rx="3" class="f-code1"/>
    <rect x="50" y="66" width="36" height="9" rx="3" class="f-code2"/><rect x="92" y="66" width="96" height="9" rx="3" class="f-code1"/>
    <rect x="50" y="86" width="58" height="9" rx="3" class="f-code3"/><rect x="114" y="86" width="44" height="9" rx="3" class="f-acc"/><rect x="164" y="86" width="60" height="9" rx="3" class="f-code1"/>
    <rect x="64" y="106" width="120" height="9" rx="3" class="f-code1"/>
    <rect x="50" y="126" width="30" height="9" rx="3" class="f-code2"/>
    <rect x="36" y="146" width="12" height="9" rx="3" class="f-code1"/><rect x="54" y="144" width="2" height="13" class="f-txt anim-blink"/>`,
  web: `
    <rect x="0" y="0" width="300" height="28" class="f-bar"/>
    <circle cx="16" cy="14" r="3.5" class="f-dim"/><circle cx="28" cy="14" r="3.5" class="f-dim"/><circle cx="40" cy="14" r="3.5" class="f-dim"/>
    <rect x="96" y="7" width="108" height="14" rx="7" class="f-panel"/><text x="150" y="17.5" class="t-sm" text-anchor="middle">Client portal</text>
    <rect x="12" y="40" width="56" height="128" rx="8" class="f-panel"/>
    <rect x="22" y="52" width="36" height="6" rx="3" class="f-acc"/><rect x="22" y="68" width="30" height="6" rx="3" class="f-dim"/><rect x="22" y="84" width="34" height="6" rx="3" class="f-dim"/><rect x="22" y="100" width="26" height="6" rx="3" class="f-dim"/>
    <rect x="78" y="40" width="210" height="58" rx="10" class="f-hero"/>
    <text x="92" y="64" class="t-btn">Welcome back</text><text x="92" y="82" class="t-sm">3 requests waiting for you</text>
    <rect x="78" y="108" width="66" height="60" rx="8" class="f-panel"/><rect x="150" y="108" width="66" height="60" rx="8" class="f-panel"/><rect x="222" y="108" width="66" height="60" rx="8" class="f-panel"/>
    <rect x="88" y="120" width="30" height="6" rx="3" class="f-acc"/><rect x="160" y="120" width="30" height="6" rx="3" class="f-dim"/><rect x="232" y="120" width="30" height="6" rx="3" class="f-dim"/>
    <rect x="88" y="150" width="46" height="8" rx="4" class="f-dim"/><rect x="160" y="150" width="46" height="8" rx="4" class="f-dim"/><rect x="232" y="150" width="46" height="8" rx="4" class="f-dim"/>`,
};

const SLIDES = [
  { name: "Business consulting", kind: "Service", fig: "consult", href: "#product", glow: "#ff3d48",
    desc: "Certified consultants help you pick the right platform, roll it out and get a fast return on what you spend.",
    tags: ["Requirements", "Platform choice", "Roll-out"] },
  { name: "Customized solutions", kind: "Service", fig: "build", href: "#product", glow: "#6d88ff",
    desc: "Software built around how your business works. We learn the problem first, then design and deliver the fix.",
    tags: ["On-site consulting", "Turnkey projects"] },
  { name: "Outsourcing", kind: "Service", fig: "layers", href: "#product", glow: "#a57bff",
    desc: "A dedicated development team in three layers. Each layer owns its own architecture and delivery.",
    tags: ["Front-end", "Middle layer", "Back-end"] },
  { name: "Managing applications", kind: "Service", fig: "run", href: "#product", glow: "#35d0b2",
    desc: "New systems need support while old ones still need upgrades. We carry both, so your people stay on the business.",
    tags: ["Support", "Upgrades", "Roll-outs"] },
  { name: "ERP and CRM", kind: "Practice", fig: "erp", href: "#integrations", glow: "#e6ad66",
    desc: "Enterprise applications chosen, rolled out and supported, connected to the rest of your business.",
    tags: ["ERP", "CRM", "Enterprise apps"] },
  { name: "Java and Microsoft", kind: "Practice", fig: "code", href: "#integrations", glow: "#79a2dc",
    desc: "Engineers across Java and Microsoft technologies, programming languages, databases and operating systems.",
    tags: ["Java", "Microsoft", "RDBMS"] },
  { name: "Web and portals", kind: "Practice", fig: "web", href: "#integrations", glow: "#ff6f9a",
    desc: "Web technologies and portals, from the screens your users see to the systems behind them.",
    tags: ["Web", "Portals", "Front-end"] },
];
const N = SLIDES.length;
const CARD_W = 340, CARD_H = 452;
const pad = (n) => String(n).padStart(2, "0");

export function initSpectra(root) {
  if (!root) return null;
  const live = root.querySelector("[data-sp-live]"), foot = root.querySelector(".sp-foot");
  const tN = root.querySelector("[data-sp-n]"), tKind = root.querySelector("[data-sp-kind]"), cta = root.querySelector("[data-sp-cta]");
  const hero = root.closest(".hero");

  const build = (i) => {
    const s = SLIDES[i];
    const el = document.createElement("button");
    el.type = "button";
    el.setAttribute("aria-label", `${s.name}. ${s.desc} ${s.kind} ${i + 1} of ${N}`);
    el.style.setProperty("--glow", s.glow);
    el.innerHTML = `<span class="sp-inner">`
      + `<span class="sp-top"><span class="sp-num">${pad(i + 1)}</span><span class="sp-kind">${s.kind}</span></span>`
      + `<span class="sp-fig"><svg viewBox="0 0 300 180" aria-hidden="true">${FIG[s.fig]}</svg></span>`
      + `<span class="sp-body"><span class="sp-name">${s.name}</span><span class="sp-desc">${s.desc}</span>`
      + `<span class="sp-tags">${s.tags.map((t) => `<i>${t}</i>`).join("")}</span></span>`
      + `</span>`;
    return el;
  };

  const onActive = (i) => {
    const s = SLIDES[i];
    root.style.setProperty("--halo", s.glow);
    tN.textContent = `${pad(i + 1)} / ${pad(N)}`;
    tKind.textContent = `${s.kind}: ${s.name}`;
    cta.setAttribute("href", s.href);
    cta.firstElementChild.textContent = s.kind === "Service" ? "Explore services" : "See our practices";
    live.textContent = `${s.name}, ${i + 1} of ${N}`;
    if (!reduced && foot) { const k = foot.querySelector(".sp-kicker"); k.classList.remove("sp-swap"); void k.offsetWidth; k.classList.add("sp-swap"); }
  };

  // size the fan from the room left in the first screen once the headline is placed
  const fit = (w) => {
    const copy = hero ? hero.querySelector(".hero-copy") : null;
    const nav = 88;
    const room = innerHeight - nav - (copy ? copy.offsetHeight : 200) - (foot ? foot.offsetHeight : 90) - 96;
    // phones: let the card be big and the hero run a little past the fold
    if (w < 600) return Math.max(0.64, Math.min(0.86, w / 450));
    const byW = w / (w < 1000 ? 700 : 1100);
    return Math.max(0.64, Math.min(1, byW, room / CARD_H));
  };

  return createCoverflow({
    root, stage: root.querySelector(".sp-stage"), deck: root.querySelector(".sp-deck"),
    count: N, build, cardClass: "sp-card", cardW: CARD_W, cardH: CARD_H, persp: 1900,
    geo: { gap: 205, rotate: 40, depth: 170, drop: 20, shrink: 0.13, fade: 0.3, dim: 0.24, visible: 2 },
    autoplayMs: 4200,
    fit, onActive,
    onOpen: (i) => { const t = document.querySelector(SLIDES[i].href); if (t) scrollTo(t); },
  });
}
