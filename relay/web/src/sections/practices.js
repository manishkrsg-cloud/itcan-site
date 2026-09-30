// 03 Practices: a dashed rail draws in, tiles pop as the edge reaches them, then a red
// packet glides along the rail lighting each tile it passes, lap after lap.
import { Spring, SPRING_SOFT, reduced, ticker, ease, tween } from "../core/engine.js";
import { type } from "../core/prims.js";
import { watchLoop, onSeen } from "../core/seen.js";

const mixHex = (a, b, t) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
};

export function initPractices() {
  const sec = document.getElementById("integrations");
  if (!sec) return;
  const rail = sec.querySelector(".pr-rail"), svg = rail.querySelector("svg"), path = svg.querySelector(".pr-path");
  const grad = svg.querySelector("#prGrad"), peakStop = grad.querySelector(".pr-peak");
  const packet = rail.querySelector(".pr-packet");
  const ul = sec.querySelector(".pr-tiles");
  const all = Array.from(ul.children);

  // captions type in once seen (the 390 second line after the first)
  const capMain = sec.querySelector(".pr-cap-1 span"), capA = sec.querySelector(".pr-cap-390a span"), capB = sec.querySelector(".pr-cap-390b span");
  const tm = type(capMain), ta = type(capA), tb = type(capB);
  if (!reduced) { tm.reset(); ta.reset(); tb.reset(); }
  onSeen(sec, () => { tm.play(0); ta.play(0); tb.play(ta.length * 30); });

  // per-tile state: pop spring + lit cross-fade spring
  const state = all.map((li) => {
    const tile = li.querySelector(".pr-tile"), idle = li.querySelector(".idle"), lit = li.querySelector(".lit");
    const st = { li, tile, pop: 0, a: 0, popped: false };
    const render = () => {
      tile.style.opacity = st.pop >= 1 ? "1" : Math.max(0, st.pop);
      tile.style.transform = `scale(${(0.8 + 0.2 * st.pop) * (1 + 0.06 * st.a)})`;
      idle.style.opacity = 1 - st.a;
      lit.style.opacity = st.a;
    };
    st.popS = new Spring(0, (v) => { st.pop = v; render(); });
    st.aS = new Spring(0, (v) => { st.a = v; render(); });
    st.render = render;
    return st;
  });
  let tiles = [];
  let railX = 0, railW = 1, tileX = 0, pitch = 1, size = 1, rest = 0;
  const measure = () => {
    tiles = state.filter((s) => getComputedStyle(s.li).display !== "none");
    railX = rail.offsetLeft; railW = rail.offsetWidth || 1;
    tileX = ul.offsetLeft + (tiles[0] ? tiles[0].li.offsetLeft : 0);
    size = tiles[0] ? tiles[0].li.offsetWidth : 60;
    pitch = tiles[1] ? tiles[1].li.offsetLeft - tiles[0].li.offsetLeft : size;
    rest = tileX + size + (pitch - size) * 0.675;
    svg.setAttribute("viewBox", `0 0 ${railW} 2`);
    path.setAttribute("d", `M0 1H${railW}`);
    // hide the rail under every tile box
    const stops = [];
    tiles.forEach((t) => {
      const l = ((ul.offsetLeft + t.li.offsetLeft - railX) / railW) * 100, r = l + (size / railW) * 100;
      stops.push(`#000 ${l.toFixed(3)}%`, `transparent ${l.toFixed(3)}%`, `transparent ${r.toFixed(3)}%`, `#000 ${r.toFixed(3)}%`);
    });
    const m = `linear-gradient(90deg, #000 0%, ${stops.join(", ")}, #000 100%)`;
    rail.style.maskImage = rail.style.webkitMaskImage = m;
    setPacket(curX, curO);
  };
  const centre = (i) => tileX + i * pitch + size / 2;
  let curX = 0, curO = 0, litIdx = -1;
  function setPacket(x, o) {
    curX = x; curO = o;
    packet.style.left = "0px";
    packet.style.transform = `translateX(${x - railX - 3}px)`;
    packet.style.opacity = o;
    const peak = (x - railX) / railW;
    grad.setAttribute("x1", (peak - 0.1001) * railW);
    grad.setAttribute("x2", (peak + 0.8999) * railW);
    peakStop.setAttribute("stop-color", mixHex("#c2c2c2", "#ff3d48", o));
  }
  function light(i) {
    if (i === litIdx) return;
    litIdx = i;
    tiles.forEach((t, k) => t.aS.start(k === i ? 1 : 0, { config: SPRING_SOFT }));
  }
  measure();
  new ResizeObserver(measure).observe(sec);

  if (reduced) {
    tiles.forEach((t) => { t.popS.set(1); });
    svg.style.clipPath = "none";
    setPacket(rest, 1); light(1);
    return;
  }

  let drawTw = null, lapOff = null, forceT = 0;
  const reset = () => {
    drawTw && drawTw.stop(); lapOff && lapOff(); lapOff = null; clearTimeout(forceT);
    svg.style.clipPath = "inset(0 100% 0 0)";
    state.forEach((t) => { t.popped = false; t.popS.set(0); t.aS.set(0); });
    litIdx = -1;
    setPacket(rest, 0);
  };
  const start = () => {
    measure();
    drawTw = tween(1760, ease.inOutQuad, (p) => {
      svg.style.clipPath = p >= 1 ? "none" : `inset(0 ${(1 - p) * 100}% 0 0)`;
      const edge = railX + p * railW;
      tiles.forEach((t) => {
        if (!t.popped && edge >= ul.offsetLeft + t.li.offsetLeft) { t.popped = true; t.popS.start(1, { config: SPRING_SOFT }); }
      });
    }, () => { forceT = setTimeout(() => tiles.forEach((t) => { if (!t.popped) { t.popped = true; t.popS.start(1, { config: SPRING_SOFT }); } }), 160); });
    lap();
  };
  const glide = (t) => { const k = 1 / (1 - 0.09); return t < 0.18 ? (k * t * t) / 0.36 : k * (t - 0.09); };
  function lap() {
    let step = 0, t0 = performance.now();
    setPacket(centre(0), 0); light(0);
    lapOff = ticker.add((now) => {
      const e = now - t0;
      if (step === 0) { if (e >= 30) { step = 1; t0 = now; } return; }
      if (step === 1) {
        const last = tiles.length - 1;
        const t = Math.min(1, e / 5600);
        const x = centre(0) + (centre(last) - centre(0)) * Math.min(1, glide(t));
        setPacket(x, Math.min(1, e / 360));
        const i = Math.max(0, Math.min(last, Math.floor((x - tileX + 0.4 * size) / pitch)));
        light(i);
        if (e >= 5800) { step = 2; t0 = now; light(last); }
        return;
      }
      if (step === 2) {
        setPacket(curX, Math.max(0, 1 - e / 360));
        if (e >= 360 + 380) { step = 0; t0 = now; setPacket(centre(0), 0); light(0); }
      }
    });
  }
  reset();
  watchLoop(sec, { arm: start, disarm: reset });
}
