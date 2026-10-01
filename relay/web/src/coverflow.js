// A CSS-3D coverflow: cards fan into an arc, the centre card lifts and the sides tilt,
// sink and dim. Autoplay, drag or swipe with momentum, arrow keys, click a side card to
// bring it forward. It wraps forever. The frame loop only runs while something moves.
import { reduced } from "./core/engine.js";
import { onView } from "./core/seen.js";

const wrapOf = (n) => (o) => { o = ((o % n) + n) % n; return o > n / 2 ? o - n : o; };

export function createCoverflow({
  root, stage, deck, count, build, cardClass = "cf-card",
  geo = { gap: 150, rotate: 38, depth: 150, drop: 22, shrink: 0.14, fade: 0.3, dim: 0.22, visible: 2 },
  cardW = 240, cardH = 310, persp = 1680, autoplayMs = 3600, firstMs = 1200, ease = 0.14, sensitivity = 0.0072, start = 0,
  fit = () => 1, onActive = () => {}, onOpen = () => {}, near = null,
}) {
  let N = count, wrap = wrapOf(N);
  let cards = [], cache = [];
  let pos = start, target = start, lastActive = -1, scale = 1;
  let moved = false, dragging = false;

  function make() {
    deck.innerHTML = "";
    cards = Array.from({ length: N }, (_, i) => {
      const el = build(i);
      el.classList.add(cardClass);
      el.addEventListener("click", () => {
        if (moved) return;
        if (i === activeIndex()) onOpen(i); else { go(i); sync(true); }
      });
      deck.appendChild(el);
      return el;
    });
    cache = cards.map(() => ({}));
  }
  const set = (i, k, v) => { if (cache[i][k] !== v) { cache[i][k] = v; cards[i].style[k] = v; } };
  const activeIndex = () => ((Math.round(pos) % N) + N) % N;

  function layout() {
    const f = Math.max(0.4, Math.min(1, fit(stage.clientWidth || root.clientWidth, root.clientHeight)));
    root.style.setProperty("--card-w", `${Math.round(cardW * f)}px`);
    root.style.setProperty("--card-h", `${Math.round(cardH * f)}px`);
    root.style.setProperty("--persp", `${Math.max(1050, persp * f)}px`);
    root.style.setProperty("--card-f", f.toFixed(4));
    scale = f;
  }

  function paint() {
    const { gap, rotate, depth, drop, shrink, fade, dim, visible } = geo;
    for (let i = 0; i < N; i++) {
      const o = wrap(i - pos), ao = Math.abs(o);
      if (near) near(i, ao);
      // cards off the fan fade out but stay in the DOM, so keyboard focus is never dropped
      if (ao > visible + 0.5) { set(i, "opacity", "0"); set(i, "pointerEvents", "none"); if (cards[i].tabIndex !== -1) cards[i].tabIndex = -1; continue; }
      if (cards[i].tabIndex !== 0) cards[i].tabIndex = 0;
      const sc = Math.max(0.4, 1 - ao * shrink);
      cards[i].style.transform = `translate3d(${(o * gap * scale).toFixed(2)}px, ${(ao * drop * scale).toFixed(2)}px, ${(-ao * depth * scale).toFixed(2)}px) rotateY(${(-o * rotate).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      set(i, "opacity", Math.max(0, 1 - ao * fade).toFixed(3));
      set(i, "filter", `brightness(${Math.max(0.3, 1 - ao * dim).toFixed(2)})`);
      set(i, "zIndex", String(Math.round(100 - ao * 10)));
      set(i, "pointerEvents", "auto");
    }
    const a = activeIndex();
    if (a !== lastActive) {
      if (cards[lastActive]) cards[lastActive].classList.remove("is-active");
      lastActive = a;
      cards[a].classList.add("is-active");
      onActive(a);
    }
  }

  let raf = 0, inView = false;
  function frame() {
    raf = 0;
    if (!dragging) {
      if (reduced) pos = target;
      else { pos += (target - pos) * ease; if (Math.abs(target - pos) < 0.001) pos = target; }
    }
    paint();
    if (inView && (dragging || pos !== target)) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  function go(i) { const cur = Math.round(target); target = cur + wrap(i - cur); kick(); }
  const next = () => { target += 1; kick(); };
  const prev = () => { target -= 1; kick(); };

  // drag / swipe with momentum
  let lastX = 0, startX = 0, vel = 0, pid = 0;
  stage.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true; moved = false; lastX = startX = e.clientX; vel = 0;
    pid = e.pointerId;
    stage.classList.add("-drag");
    sync(); kick();
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    // capture only once it is a real drag, so a plain click still reaches the card
    if (!moved && Math.abs(e.clientX - startX) > 5) { moved = true; try { stage.setPointerCapture(pid); } catch (err) { /* pointer gone */ } }
    const d = -dx * sensitivity;
    pos += d; vel = d;
  });
  const release = () => {
    if (!dragging) return;
    dragging = false; stage.classList.remove("-drag");
    target = Math.round(pos + vel * 8); vel = 0;
    sync(); kick();
    setTimeout(() => { moved = false; }, 0);
  };
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
  stage.addEventListener("lostpointercapture", release);
  addEventListener("pointerup", release);

  root.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("[role='tab']")) return;
    if (e.key === "ArrowRight") { next(); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { prev(); e.preventDefault(); }
    else if (e.key === "Home") { go(0); e.preventDefault(); }
    else if (e.key === "End") { go(N - 1); e.preventDefault(); }
  });

  // autoplay pauses while the pointer rests on the front card, during keyboard focus, a drag,
  // a hidden tab, or when scrolled away. The first move comes soon after start, then a steady beat.
  let hovering = false, focused = false, started = false, paused = false, timer = 0, first = true;
  const active = () => started && !paused && autoplayMs > 0 && !reduced && !hovering && !focused && !dragging && inView && !document.hidden;
  const beat = () => { next(); timer = 0; first = false; sync(); };
  function sync(resume) {
    clearTimeout(timer); timer = 0;
    if (active()) timer = setTimeout(beat, first ? firstMs : resume ? Math.min(autoplayMs, 2200) : autoplayMs);
  }
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const h = !!(e.target.closest && e.target.closest(`.${cardClass}.is-active`));
    if (h !== hovering) { hovering = h; sync(!h); }
  }, { passive: true });
  stage.addEventListener("pointerleave", () => { if (hovering) { hovering = false; sync(true); } });
  root.addEventListener("focusin", (e) => { focused = !!(e.target.matches && e.target.matches(":focus-visible")); sync(); });
  root.addEventListener("focusout", () => { if (focused) { focused = false; sync(true); } });
  document.addEventListener("visibilitychange", () => sync(true));
  onView(root, (hit) => { inView = hit; root.classList.toggle("cf-live", hit); sync(true); if (hit) kick(); });

  let rz = 0;
  addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { layout(); paint(); }); });

  make(); layout(); paint();

  return {
    start() { started = true; sync(); },
    pause(p) { paused = p; sync(); },
    layout() { layout(); paint(); },
    go(i) { go(i); sync(true); }, next() { next(); sync(true); }, prev() { prev(); sync(true); },
    get index() { return activeIndex(); },
    rebuild(n, fn, at = 0) {
      N = n; wrap = wrapOf(N); build = fn || build;
      pos = target = at; lastActive = -1;
      make(); paint(); sync();
    },
  };
}
