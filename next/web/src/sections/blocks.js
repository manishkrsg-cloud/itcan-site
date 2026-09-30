// Nav, menu, doors, services, process track, media modal, footer dots.
import { onScroll, getScroll, scrollTo, lock } from "../core/scroll.js";
import { onView } from "../core/seen.js";
import { reduced, fine, clamp } from "../core/engine.js";

// ------------------------------------------------------------ nav + menu
export function initNav() {
  const nav = document.querySelector("[data-nav]");
  if (!nav) return;
  const set = (y) => nav.classList.toggle("is-scrolled", y > 8);
  onScroll(set);
  set(getScroll());

  // highlight the section in view
  const links = Array.from(nav.querySelectorAll(".nav-links a"));
  const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const a = map.get(e.target.id);
      if (a && e.isIntersecting) { links.forEach((l) => l.classList.remove("is-on")); a.classList.add("is-on"); }
      else if (a && !e.isIntersecting) a.classList.remove("is-on");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });

  const menu = document.querySelector("[data-menu]");
  const open = document.querySelector("[data-menu-open]");
  if (!menu || !open) return;
  const close = () => { if (menu.open) menu.close(); };
  open.addEventListener("click", () => { menu.showModal(); open.setAttribute("aria-expanded", "true"); lock(true); });
  menu.addEventListener("close", () => { open.setAttribute("aria-expanded", "false"); lock(false); });
  menu.querySelector("[data-menu-close]").addEventListener("click", close);
  menu.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#']");
    if (!a) return;
    e.preventDefault();
    close();
    const t = document.querySelector(a.getAttribute("href"));
    if (t) requestAnimationFrame(() => scrollTo(t));
  });
  addEventListener("resize", () => { if (innerWidth > 640) close(); });
}

// ------------------------------------------------------------ doors: spotlight follows the pointer
export function initDoors() {
  if (!fine) return;
  document.querySelectorAll("[data-spot]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

// ------------------------------------------------------------ services accordion (one open at a time)
export function initServices() {
  document.querySelectorAll("[data-acc]").forEach((list) => {
    const items = Array.from(list.children);
    items.forEach((li) => {
      const btn = li.querySelector(".svc-top");
      btn.addEventListener("click", () => {
        const opening = !li.classList.contains("is-open");
        items.forEach((x) => { x.classList.remove("is-open"); x.querySelector(".svc-top").setAttribute("aria-expanded", "false"); });
        if (opening) { li.classList.add("is-open"); btn.setAttribute("aria-expanded", "true"); }
      });
    });
  });
}

// ------------------------------------------------------------ process: a token runs the track as you scroll
export function initProcess() {
  const wrap = document.querySelector("[data-steps]");
  if (!wrap) return;
  const track = wrap.querySelector(".track");
  const steps = Array.from(wrap.querySelectorAll(".step"));
  let marks = [];
  let vertical = false, visible = false;
  const measure = () => {
    visible = !!track.offsetParent && getComputedStyle(track).display !== "none";
    if (!visible) return;
    const tr = track.getBoundingClientRect();
    vertical = tr.height > tr.width;
    marks = steps.map((s) => {
      const d = s.querySelector(".step-dot").getBoundingClientRect();
      return vertical ? (d.top + d.height / 2 - tr.top) / tr.height : (d.left + d.width / 2 - tr.left) / tr.width;
    });
  };
  const light = (n) => steps.forEach((s, i) => s.classList.toggle("is-lit", i < n));
  let lastP = -1, docTop = 0, wrapH = 1;
  const cacheTop = () => { docTop = wrap.getBoundingClientRect().top + getScroll(); wrapH = wrap.offsetHeight; };
  const update = () => {
    if (!visible) return;
    const vh = innerHeight, r = { top: docTop - getScroll(), height: wrapH };
    const p = vertical ? clamp((vh * 0.62 - r.top) / r.height) : clamp((vh * 0.82 - r.top) / (vh * 0.42));
    if (Math.abs(p - lastP) < 0.0005) return;
    lastP = p;
    track.style.setProperty("--p", p.toFixed(4));
    track.style.setProperty("--tok", p > 0.002 ? "1" : "0");
    light(marks.filter((m) => p >= m - 0.01).length);
  };
  measure(); cacheTop();
  addEventListener("resize", () => { measure(); cacheTop(); lastP = -1; update(); });
  new ResizeObserver(() => { cacheTop(); }).observe(document.body);
  if (document.fonts) document.fonts.ready.then(() => { measure(); cacheTop(); update(); });
  if (reduced) { light(steps.length); track.style.setProperty("--p", "1"); return; }
  onScroll(update);
  update();
  // grid layout without a track: light the steps in turn once seen
  onView(wrap, (hit) => {
    if (!hit || visible) return;
    steps.forEach((s, i) => setTimeout(() => s.classList.add("is-lit"), 120 * i));
  }, "0px 0px -20% 0px");
}

// ------------------------------------------------------------ video modal
export function initMedia() {
  const vm = document.querySelector("[data-vm]");
  if (!vm) return;
  const frame = vm.querySelector("[data-vm-frame]"), title = vm.querySelector("[data-vm-title]"), yt = vm.querySelector("[data-vm-yt]");
  document.querySelectorAll("[data-video]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.video;
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${b.dataset.title}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    title.textContent = b.dataset.title;
    yt.href = `https://www.youtube.com/watch?v=${id}`;
    vm.showModal(); lock(true);
  }));
  const close = () => vm.open && vm.close();
  vm.querySelector("[data-vm-close]").addEventListener("click", close);
  vm.addEventListener("click", (e) => { if (e.target === vm) close(); });
  vm.addEventListener("close", () => { frame.innerHTML = ""; lock(false); });
  // Escape should close the film even when focus has drifted outside the dialog
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

// ------------------------------------------------------------ footer: a slow field of dots under the last call to action
export function initFooter() {
  const y = document.querySelector("[data-year]");
  if (y) y.textContent = String(new Date().getFullYear());
  const c = document.querySelector("[data-foot-dots]");
  if (!c) return;
  const ctx = c.getContext("2d");
  let w = 1, h = 1, dpr = 1, raf = 0, on = false, mx = -1e4, my = -1e4;
  const resize = () => {
    const r = c.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1); w = Math.max(1, r.width); h = Math.max(1, r.height);
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    draw(performance.now());
  };
  // dots are bucketed by colour and brightness so each frame is a handful of fills, not thousands
  const BUCKETS = 8;
  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const gap = w < 700 ? 18 : 24;
    const cols = Math.ceil(w / gap) + 1, rows = Math.ceil(h / gap) + 1;
    const paths = [[], []].map(() => Array.from({ length: BUCKETS }, () => new Path2D()));
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * gap, y0 = j * gap;
      const cx = (x - w / 2) / (w / 2), cy = (y0 - h * 0.45) / (h / 2);
      const fall = 1 - Math.sqrt(cx * cx * 0.9 + cy * cy * 1.6);
      if (fall <= 0.02) continue;
      const wave = reduced ? 0 : Math.sin(i * 0.22 + t / 1400) * Math.cos(j * 0.3 + t / 1900);
      const y = y0 + wave * 4;
      const dx = x - mx, dy = y - my, near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 140);
      const a = Math.min(1, fall * (0.18 + 0.28 * (wave * 0.5 + 0.5)) + near * 0.6);
      const red = near > 0.05 || fall > 0.8 ? 1 : 0;
      const b = Math.min(BUCKETS - 1, Math.floor(a * BUCKETS));
      const r = 1.1 + near * 1.4;
      paths[red][b].rect(x - r, y - r, r * 2, r * 2);
    }
    for (let c = 0; c < 2; c++) for (let b = 0; b < BUCKETS; b++) {
      ctx.fillStyle = c ? `rgba(255,70,80,${((b + 0.5) / BUCKETS).toFixed(2)})` : `rgba(210,216,235,${((b + 0.5) / BUCKETS).toFixed(2)})`;
      ctx.fill(paths[c][b]);
    }
  }
  let lastDraw = 0;
  const loop = (t) => { if (t - lastDraw > 32) { lastDraw = t; draw(t); } if (on) raf = requestAnimationFrame(loop); };
  new ResizeObserver(resize).observe(c);
  const host = c.parentElement;
  if (fine) {
    host.addEventListener("pointermove", (e) => { const r = c.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    host.addEventListener("pointerleave", () => { mx = my = -1e4; });
  }
  onView(c, (hit) => {
    if (hit && !on && !reduced) { on = true; raf = requestAnimationFrame(loop); }
    else if (!hit) { on = false; cancelAnimationFrame(raf); }
  });
}
