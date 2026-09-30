// Vision / mission / values tabs, the video modal and the contact brief form.
import { springs, SPRING, reduced } from "../core/engine.js";
import { lock } from "../core/scroll.js";

function tabs() {
  const seg = document.querySelector(".ab-vmv .seg");
  if (!seg) return;
  const btns = Array.from(seg.querySelectorAll('[role="tab"]'));
  const knob = seg.querySelector(".seg-knob");
  const s = springs({ x: 0, w: 0 }, (v) => { knob.style.transform = `translateX(${v.x}px)`; knob.style.width = `${v.w}px`; });
  const place = (b, immediate) => {
    const to = { x: b.offsetLeft, w: b.offsetWidth };
    if (immediate || reduced) s.set(to); else s.start(to, { config: SPRING });
  };
  const select = (b, focus) => {
    btns.forEach((t) => {
      const on = t === b;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    place(b);
    if (focus) b.focus();
  };
  btns.forEach((b, i) => {
    b.addEventListener("click", () => select(b));
    b.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); select(btns[(i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length], true); }
    });
  });
  const init = () => place(btns.find((b) => b.getAttribute("aria-selected") === "true") || btns[0], true);
  init();
  addEventListener("resize", init);
  if (document.fonts) document.fonts.ready.then(init);
}

function video() {
  const modal = document.getElementById("videoModal");
  if (!modal) return;
  const frame = document.getElementById("vmFrame"), title = document.getElementById("vmTitle"), link = document.getElementById("vmLink");
  let last = null;
  const close = () => { modal.hidden = true; frame.innerHTML = ""; lock(false); last && last.focus(); };
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-video]");
    if (!b) return;
    e.preventDefault();
    last = b;
    const id = b.dataset.video;
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${b.dataset.title || "Video"}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    title.textContent = b.dataset.title || "";
    link.href = `https://www.youtube.com/watch?v=${id}`;
    modal.hidden = false;
    lock(true);
    modal.querySelector(".lb-close").focus();
  });
  modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) close(); });
}

function brief() {
  const form = document.getElementById("briefForm");
  if (!form) return;
  const err = document.getElementById("formError"), done = document.getElementById("formDone");
  const pre = document.getElementById("donePreview"), to = document.getElementById("doneTo");
  const ROUTE = { job: "jobs@itcan.biz", consulting: "sales@itcan.biz", custom: "sales@itcan.biz", outsourcing: "sales@itcan.biz", managed: "sales@itcan.biz", other: "info@itcan.biz" };
  const NEED = { consulting: "Business consulting", custom: "A customized solution", outsourcing: "An outsourced team", managed: "Application support", job: "A job at ITCAN", other: "Something else" };
  let text = "";
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = form.elements;
    const bad = [];
    ["name", "email", "need", "message"].forEach((n) => {
      const el = f[n];
      const ok = el.value.trim() && (n !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.setAttribute("aria-invalid", String(!ok));
      if (!ok) bad.push(el);
    });
    if (bad.length) {
      err.hidden = false;
      err.textContent = bad.some((b) => b.name === "email" && b.value.trim()) ? "Check the email address." : "Please fill in the highlighted fields.";
      bad[0].focus();
      return;
    }
    err.hidden = true;
    const need = f.need.value, addr = ROUTE[need] || "info@itcan.biz";
    const subject = `${NEED[need]}: brief from ${f.name.value.trim()}${f.company.value.trim() ? `, ${f.company.value.trim()}` : ""}`;
    text = `Name: ${f.name.value.trim()}\nEmail: ${f.email.value.trim()}\nCompany: ${f.company.value.trim() || "-"}\nNeed: ${NEED[need]}\n\n${f.message.value.trim()}\n`;
    pre.textContent = `To: ${addr}\nSubject: ${subject}\n\n${text}`;
    to.textContent = addr; to.href = `mailto:${addr}`;
    done.hidden = false;
    location.href = `mailto:${addr}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  });
  document.getElementById("copyBrief").addEventListener("click", async (e) => {
    try { await navigator.clipboard.writeText(pre.textContent); e.currentTarget.querySelector("span").textContent = "Copied"; } catch (x) { /* ignore */ }
  });
  document.getElementById("newBrief").addEventListener("click", () => { form.reset(); done.hidden = true; form.elements.name.focus(); });
}

export function initMisc() {
  tabs();
  video();
  brief();
}
