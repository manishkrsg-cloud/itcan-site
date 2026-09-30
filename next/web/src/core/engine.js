// Motion engine: one shared rAF ticker and react-spring style springs.
// Springs integrate in 1 ms sub-steps exactly like @react-spring/web.

export const SPRING = { tension: 280, friction: 32 };
export const SPRING_SOFT = { tension: 120, friction: 26 };
export const SPRING_QUICK = { tension: 260, friction: 30 };
export const GROW = { tension: 180, friction: 31.72, clamp: true };
export const SNAP = { tension: 420, friction: 39.04 };
export const POP = { tension: 420, friction: 14 };
export const DROP = { tension: 260, friction: 15 };
export const STEP = 70;

const mq = (q) => typeof matchMedia === "function" && matchMedia(q).matches;
export const reduced = mq("(prefers-reduced-motion: reduce)");
export const fine = mq("(hover: hover) and (pointer: fine)");
export const coarse = mq("(hover: none) and (pointer: coarse)");

export const ease = {
  linear: (t) => t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);

// ---------------------------------------------------------------- ticker
const subs = new Set();
let raf = 0;
let last = -1;
function frame(now) {
  raf = 0;
  const dt = last < 0 ? 16 : Math.min(100, Math.max(0, now - last));
  last = now;
  for (const s of subs) {
    if (s.gap && now - s.at < s.gap) continue;
    s.at = now;
    try { s.fn(now, dt); } catch (e) { console.error(e); subs.delete(s); }
  }
  if (subs.size) raf = requestAnimationFrame(frame);
  else last = -1;
}
export const ticker = {
  add(fn, gap = 0) {
    const s = { fn, gap, at: 0 };
    subs.add(s);
    if (!raf) raf = requestAnimationFrame(frame);
    return () => subs.delete(s);
  },
  now: () => performance.now(),
};

// ---------------------------------------------------------------- springs
// A single animated number. start(to, opts) retargets and keeps velocity.
export class Spring {
  constructor(value = 0, onChange) {
    this.value = value;
    this.vel = 0;
    this.to = value;
    this.from = value;
    this.cfg = SPRING;
    this.onChange = onChange;
    this.idle = true;
    this.off = null;
    this.startAt = 0;
    this.timer = 0;
    this.onRest = null;
  }
  set(v) {
    this.stop();
    this.value = this.to = this.from = v;
    this.vel = 0;
    this.onChange && this.onChange(v);
    return this;
  }
  stop() {
    clearTimeout(this.timer);
    if (this.off) { this.off(); this.off = null; }
    this.idle = true;
  }
  start(to, opts = {}) {
    const { config = this.cfg, delay = 0, immediate = false, onRest = null } = opts;
    clearTimeout(this.timer);
    this.onRest = onRest;
    const go = () => {
      this.cfg = config;
      if (immediate || reduced) { this.set(to); onRest && onRest(); return; }
      this.from = this.value;
      this.to = to;
      this.startAt = performance.now();
      if (config.duration != null) this.vel = 0;
      if (this.value === to && Math.abs(this.vel) < 1e-6) { this.onChange && this.onChange(to); onRest && onRest(); return; }
      this.idle = false;
      if (!this.off) this.off = ticker.add((now, dt) => this.step(now, dt));
    };
    if (delay > 0 && !immediate && !reduced) this.timer = setTimeout(go, delay);
    else go();
    return this;
  }
  step(now, dt) {
    const c = this.cfg;
    let done = false;
    if (c.duration != null) {
      const t = clamp((now - this.startAt) / Math.max(1, c.duration));
      this.value = this.from + (this.to - this.from) * (c.easing || ease.linear)(t);
      done = t >= 1;
    } else {
      const mass = c.mass || 1;
      const precision = Math.min(1, Math.abs(this.to - this.from) * 0.001) || 0.0005;
      const restVel = precision / 10;
      const steps = Math.ceil(dt);
      let pos = this.value, vel = this.vel;
      for (let i = 0; i < steps; i++) {
        const force = -c.tension * 0.000001 * (pos - this.to);
        const damp = -c.friction * 0.001 * vel;
        vel += (force + damp) / mass;
        pos += vel;
        if (c.clamp && (this.to - this.from) * (pos - this.to) > 0) { pos = this.to; vel = 0; break; }
      }
      this.value = pos;
      this.vel = vel;
      if (Math.abs(vel) <= restVel && Math.abs(this.to - pos) <= precision) done = true;
    }
    if (done) { this.value = this.to; this.vel = 0; }
    this.onChange && this.onChange(this.value);
    if (done) {
      this.stop();
      const r = this.onRest; this.onRest = null;
      r && r();
    }
  }
}

// Several named springs rendered through one callback.
export function springs(init, render) {
  const vals = { ...init };
  let queued = false;
  const flush = () => { queued = false; render(vals); };
  const s = {};
  for (const k of Object.keys(init)) {
    s[k] = new Spring(init[k], (v) => {
      vals[k] = v;
      if (!queued) { queued = true; queueMicrotask(flush); }
    });
  }
  return {
    vals, s,
    start(to, opts = {}) {
      const keys = Object.keys(to);
      let left = keys.length;
      for (const k of keys) {
        const o = { ...opts, config: (opts.configs && opts.configs[k]) || opts.config, onRest: () => { if (--left === 0 && opts.onRest) opts.onRest(); } };
        s[k].start(to[k], o);
      }
      return this;
    },
    set(to) { for (const k of Object.keys(to)) s[k].set(to[k]); return this; },
    stop() { for (const k in s) s[k].stop(); },
  };
}

// Timed tween 0 -> 1 on the ticker.
export function tween(duration, easing, onUpdate, onDone, delay = 0) {
  let off = null, timer = 0, t0 = 0;
  const run = () => {
    t0 = performance.now();
    off = ticker.add((now) => {
      const t = clamp((now - t0) / duration);
      onUpdate(easing(t), t);
      if (t >= 1) { off(); off = null; onDone && onDone(); }
    });
  };
  if (reduced) { onUpdate(1, 1); onDone && onDone(); return { stop() {} }; }
  if (delay > 0) timer = setTimeout(run, delay); else run();
  return { stop() { clearTimeout(timer); off && off(); off = null; } };
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
export const unit = () => rem() / 16;
