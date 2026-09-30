// 03 Practices: nine practices orbit an ITCAN core on a tilted ring. The node that swings to
// the front lights up and the panel beside it explains that practice. Hovering pauses the
// ring; a drag spins it; a click, a tap or keyboard focus brings a practice to the front.
// The frame loop only runs while the orbit is on screen.
import { reduced } from "../core/engine.js";
import { onView } from "../core/seen.js";

const TAU = Math.PI * 2, FRONT = Math.PI / 2, SPEED = -TAU / 54;
const NS = "http://www.w3.org/2000/svg";
const pad = (n) => String(n).padStart(2, "0");
const wrapPi = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

export function initPractices() {
  const sec = document.getElementById("integrations");
  if (!sec) return;
  const orbit = sec.querySelector("[data-orbit]");
  if (!orbit) return;
  const rings = Array.from(orbit.querySelectorAll(".pr-ring"));
  const spokesG = orbit.querySelector(".pr-spokes");
  const items = Array.from(orbit.querySelectorAll(".pr-nodes li"));
  const btns = items.map((li) => li.querySelector(".pr-node"));
  const N = items.length, step = TAU / N;
  const dText = sec.querySelector(".pr-d-text"), dIco = sec.querySelector("[data-pr-ico]");
  const dN = sec.querySelector("[data-pr-n]"), dName = sec.querySelector("[data-pr-name]"), dDesc = sec.querySelector("[data-pr-desc]");
  const live = sec.querySelector("[data-pr-live]");
  const spokes = items.map(() => { const l = document.createElementNS(NS, "line"); spokesG.appendChild(l); return l; });

  // ---- geometry
  let cx = 0, cy = 0, rx = 1, ry = 1;
  const measure = () => {
    const W = orbit.clientWidth, H = orbit.clientHeight;
    cx = W / 2; cy = H / 2;
    rx = Math.min(W * (W < 520 ? 0.39 : 0.43), 330);
    ry = Math.min(H * 0.3, rx * (W < 520 ? 0.5 : 0.4));
    rings.forEach((r, k) => {
      const f = k ? 1.16 : 1;
      r.setAttribute("cx", cx); r.setAttribute("cy", cy);
      r.setAttribute("rx", (rx * f).toFixed(1)); r.setAttribute("ry", (ry * f).toFixed(1));
    });
  };

  // ---- the practice in front drives the panel
  let frontIdx = -1, told = false;
  const setFront = (i) => {
    if (i === frontIdx) return;
    if (frontIdx >= 0) { items[frontIdx].classList.remove("is-front"); spokes[frontIdx].classList.remove("-front"); }
    frontIdx = i;
    items[i].classList.add("is-front"); spokes[i].classList.add("-front");
    const b = btns[i];
    dN.textContent = pad(i + 1);
    dName.textContent = b.dataset.name;
    dDesc.textContent = b.dataset.desc;
    dIco.innerHTML = b.querySelector(".pr-disc").innerHTML;
    if (told) live.textContent = `${b.dataset.name}. ${b.dataset.desc}`;
    if (!reduced) [dText, dIco].forEach((el) => { el.classList.remove("pr-swap"); void el.offsetWidth; el.classList.add("pr-swap"); });
  };

  // ---- paint every node for the current ring angle
  let theta = FRONT;
  const paint = () => {
    let best = 0, bestS = -2;
    for (let i = 0; i < N; i++) {
      const a = theta + i * step, s = Math.sin(a);
      const x = cx + rx * Math.cos(a), y = cy + ry * s, d = (s + 1) / 2;
      const li = items[i];
      li.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(0.62 + 0.42 * d).toFixed(3)})`;
      li.style.opacity = (0.34 + 0.66 * d).toFixed(3);
      li.style.zIndex = String(10 + Math.round(d * 80));
      li.style.setProperty("--d", d.toFixed(3));
      const l = spokes[i];
      l.setAttribute("x1", cx.toFixed(1)); l.setAttribute("y1", cy.toFixed(1));
      l.setAttribute("x2", x.toFixed(1)); l.setAttribute("y2", y.toFixed(1));
      l.setAttribute("stroke-opacity", (0.04 + 0.2 * d).toFixed(3));
      if (s > bestS) { bestS = s; best = i; }
    }
    setFront(best);
  };

  // ---- motion: slow auto spin, eased stops, drag with momentum
  let target = null, hover = false, hold = 0, k = reduced ? 0 : 1, dragging = false, vel = 0, coast = false;
  const bring = (i, user = true) => {
    const t = FRONT - i * step;
    target = theta + wrapPi(t - theta);
    hold = performance.now() + 3200;
    if (user) told = true;
    if (reduced) { theta = target; target = null; paint(); } else kick();
  };

  let raf = 0, last = 0, inView = false;
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    if (!dragging) {
      if (target !== null) {
        theta += (target - theta) * (1 - Math.exp(-dt * 7));
        if (Math.abs(target - theta) < 0.0008) { theta = target; target = null; }
      } else if (coast) {
        theta += vel; vel *= Math.exp(-dt * 9);
        hold = now + 2400;
        // once the spin has nearly stopped, settle the nearest practice exactly in front
        if (Math.abs(vel) < 0.004) { coast = false; vel = 0; target = theta + wrapPi(FRONT - frontIdx * step - theta); }
      }
      const want = reduced || hover || now < hold ? 0 : 1;
      k += (want - k) * Math.min(1, dt * 2.5);
      theta += SPEED * k * dt;
    }
    paint();
    if (inView && !reduced) raf = requestAnimationFrame(frame);
    else if (inView && (target !== null || dragging)) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf && inView) { last = 0; raf = requestAnimationFrame(frame); } };

  orbit.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hover = true; });
  orbit.addEventListener("pointerleave", () => { hover = false; });

  let sx = 0, lx = 0, moved = false, pid = 0;
  orbit.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true; moved = false; sx = lx = e.clientX; vel = 0; coast = false; target = null; pid = e.pointerId;
    kick();
  });
  orbit.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx; lx = e.clientX;
    if (!moved && Math.abs(e.clientX - sx) > 6) { moved = true; try { orbit.setPointerCapture(pid); } catch (err) { /* gone */ } }
    if (!moved) return;
    const d = -dx / Math.max(80, rx);
    theta += d; vel = Math.max(-0.12, Math.min(0.12, d));
    kick();
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    if (moved) { hold = performance.now() + 2400; told = true; coast = !reduced; if (reduced) bring(frontIdx); }
    setTimeout(() => { moved = false; }, 0);
    kick();
  };
  orbit.addEventListener("pointerup", release);
  orbit.addEventListener("pointercancel", release);
  orbit.addEventListener("lostpointercapture", release);

  btns.forEach((b, i) => {
    b.addEventListener("click", (e) => { if (moved) { e.preventDefault(); return; } bring(i); });
    b.addEventListener("focus", () => { if (!dragging) bring(i); });
    b.addEventListener("keydown", (e) => {
      const go = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!go) return;
      e.preventDefault();
      btns[(i + go + N) % N].focus({ preventScroll: true });
    });
  });

  measure(); paint();
  orbit.classList.add("is-ready");
  new ResizeObserver(() => { measure(); paint(); }).observe(orbit);
  onView(orbit, (hit) => {
    inView = hit;
    sec.classList.toggle("is-live", hit && !reduced);
    if (hit) kick(); else { cancelAnimationFrame(raf); raf = 0; }
  });
}
