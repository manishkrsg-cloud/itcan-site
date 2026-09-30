// The page-long particle stream: one fixed viewport canvas, a ribbon of motes and
// glowing filaments laid out in document space and pushed along by the scroll.
// Shaders are carried over verbatim from the Relay source.
import {
  WebGLRenderer, PerspectiveCamera, Scene, BufferGeometry, BufferAttribute, ShaderMaterial,
  AdditiveBlending, Points, LineSegments, DataTexture, RGBAFormat, FloatType, NearestFilter,
  Vector2, Vector3, Color, CatmullRomCurve3, PlaneGeometry, Mesh,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const CONFIG = {
  particles: 28000, lowShare: 0.5, strands: 44, flowPx: 90, scrollFlow: 1.25,
  spread: 8, spreadEnds: 190, turnHold: 0.5, pinchReach: 300,
  breath: 0.35, breathWavelength: 900, breathSpeed: 0.6,
  spraySpread: 2.4, bokehSpread: 3.2, dustSpread: 5.5, wobble: 4,
  size: 2.1, focal: 0.15, dof: 0.55, dofSize: 2.2, twinkle: 2.4,
  brightness: 0.79, heat: 1.2, altShare: 0.45, altStrands: 0.32,
  lineBase: 0.16, lineSpread: 0.9, lineWavelength: 1560, lineWaveAmp: 0.22, lineWaveSpeed: 0.25,
  pulseSpacing: 1130, pulseSpeed: 205, pulseGain: 1.4, pulseSharp: 9,
  parallax: 0.22, revealPx: 2600, revealMs: 2200,
  bloomStr: 0.68, bloomRadius: 0.57, bloomThresh: 0.07,
};
const SAMPLES = 2048;
const SEGMENTS = 1400;
const CAM_Z = 6, FOV = 35, DAMP = 3.2;
const TURN_BASE = 12, TURN_HOLD = 28, TURN_SMOOTH = 48, TURN_OPEN = 1e4;
const REVEALED = 1e7;
const DPR = { full: 1, low: 0.85 };
const HALF_H = CAM_Z * Math.tan(((FOV / 2) * Math.PI) / 180);

// Waypoints: x share of the page column, y share of the anchored block, z toward camera.
const HERO = {
  1440: [{ at: "hero", x: 1.14, y: -0.46, z: -2.6 }, { at: "hero", x: 0.84, y: 0.02, z: -1.8 }, { at: "hero", x: 0.5, y: 0.3, z: -0.9 }, { at: "hero", x: 0.22, y: 0.66, z: 0, pinch: 1 }],
  1024: [{ at: "hero", x: 1.08, y: -0.4, z: -2.6 }, { at: "hero", x: 0.86, y: 0.03, z: -1.8 }, { at: "hero", x: 0.5, y: 0.35, z: -0.9 }, { at: "hero", x: 0.22, y: 0.7, z: 0, pinch: 1 }],
  768: [{ at: "hero", x: 1.08, y: 0.12, z: -2.4 }, { at: "hero", x: 0.8, y: 0.4, z: -1.6 }, { at: "hero", x: 0.3, y: 0.6, z: -0.8 }, { at: "hero", x: -0.02, y: 0.8, z: 0, pinch: 1 }],
  390: [{ at: "hero", x: 1.1, y: 0.2, z: -2.4 }, { at: "hero", x: 0.75, y: 0.45, z: -1.6 }, { at: "hero", x: 0.25, y: 0.65, z: -0.8 }, { at: "hero", x: -0.02, y: 0.84, z: 0, pinch: 1 }],
};
const TAIL = [
  { at: "integrations", x: 0.48, y: -0.25, z: 0 },
  { at: "integrations", x: 0.605, y: 0.54, z: -0.2 },
  { at: "product", x: 0.5, y: 0.12, z: 0.2 },
  { at: "product", x: -0.06, y: 0.5, z: 0.2, pinch: 1 },
  { at: "statement", x: 0.5, y: 0.3, z: -0.5 },
  { at: "scale", x: 0.92, y: 0.6, z: 0.2, pinch: 1 },
  { at: "signals", x: 0.4, y: 0.5, z: -0.4 },
  { at: "proof", x: -0.06, y: 0.6, z: 0.2, pinch: 1 },
  { at: "about", x: 0.9, y: 0.5, z: 0 },
  { at: "media", x: 0.12, y: 0.55, z: -0.2 },
  { at: "pricing", x: 0.46, y: -0.1, z: -0.2 },
  { at: "pricing", x: 0.96, y: 0.35, z: 0.1, pinch: 0.8 },
  { at: "pricing", x: 0.48, y: 0.85, z: 0 },
  { at: "contact", x: -0.49, y: 0.7, z: 0 },
];
const SHIFT = 200 / 1440;

const PRELUDE = /* glsl */ `
uniform sampler2D uCurve;
uniform float uHalfH, uCamZ, uPx, uLen;
uniform vec3 uView; // half viewport width, half height (CSS px), scrollY
vec4 curveRow(float u, float row) {
float x = clamp(u, 0.0, 1.0) * 2047.0;
float i = floor(x);
float v = (row + 0.5) / 2.0;
vec4 a = texture2D(uCurve, vec2((i + 0.5) / 2048.0, v));
vec4 b = texture2D(uCurve, vec2((min(i + 1.0, 2047.0) + 0.5) / 2048.0, v));
return mix(a, b, x - i);
}
vec3 onSpine(float u, vec2 o) {
vec4 p = curveRow(u, 0.0);
vec2 n = curveRow(u, 1.0).xy;
vec2 page = p.xy + n * o.x * uPx * uView.y;
return vec3((page.x - uView.x) / uView.y, (uView.y - (page.y - uView.z)) / uView.y, p.z + o.y * uPx);
}
uniform float uTurnHold, uBreath, uBreathWave, uBreathSpeed, uTimeS;
float widthAt(float u, float pinch, float narrow, float wide) {
float a = u * uLen;
float swell = 1.0 + uBreath * sin(a / uBreathWave * 6.2831 - uTimeS * uBreathSpeed);
float w = mix(wide, narrow, pinch) * swell;
float r = max(curveRow(u, 1.0).z * uTurnHold, 1.0);
return w * r / pow(pow(w, 4.0) + pow(r, 4.0), 0.25);
}
vec3 toWorld(vec3 s) { float k = (uCamZ - s.z) / uCamZ; return vec3(s.x * uHalfH * k, s.y * uHalfH * k, s.z); }
`;

const POINTS_VERT = PRELUDE + /* glsl */ `
attribute float aU; attribute float aSeed; attribute float aSize; attribute float aKind; attribute vec2 aOff;
uniform float uTime, uFlow, uScrollU, uRevealPx, uFadeIn, uFadeOut, uSpread, uSpreadEnds, uSpray, uBokeh, uDust, uWobble, uSize, uScale, uFocal, uDof, uDofSize, uTwinkle, uHeat, uAltShare;
uniform vec3 uColMain, uColAlt, uColCore, uColDeep, uColSpark;
varying vec3 vColor; varying float vBlur;
void main() {
float ph = aSeed * 6.2831;
float speed = (aKind < 1.5 ? 1.0 : 0.3) * (0.65 + 0.7 * fract(aSeed * 7.13));
float u = fract(aU + uTime * uFlow * speed + uScrollU);
float pinch = curveRow(u, 0.0).w;
float spread = widthAt(u, pinch, uSpread, uSpreadEnds);
if (aKind > 2.5) spread *= uDust; else if (aKind > 1.5) spread *= uBokeh; else if (aKind > 0.5) spread *= uSpray;
vec2 o = aOff * spread + vec2(sin(uTime * 0.7 + ph), cos(uTime * 0.6 + ph * 1.3)) * uWobble;
vec3 s = onSpine(u, o);
s.z += position.z;
float a = u * uLen;
float fade = smoothstep(0.0, uFadeIn, a) * smoothstep(uLen, uLen - uFadeOut, a) * smoothstep(uRevealPx, uRevealPx - 220.0, a);
float heat = pinch * (aKind < 1.5 ? 1.0 : 0.3);
vec3 hue = fract(aSeed * 3.77) < uAltShare ? uColAlt : uColMain;
vec3 base = mix(uColDeep, hue, 0.55 + 0.45 * fract(aSeed * 5.31));
vec4 mv = modelViewMatrix * vec4(toWorld(s), 1.0);
float depth = -mv.z;
float blur = clamp(abs(depth - (uCamZ - uFocal)) * uDof, 0.0, 1.0);
if (aKind > 1.5 && aKind < 2.5) blur = max(blur, 0.8);
vBlur = blur;
float tw = 0.55 + 0.45 * sin(uTime * uTwinkle + ph);
vec3 c = mix(base, uColCore, clamp(heat * 0.85, 0.0, 1.0)) * (1.0 + heat * uHeat);
if (fract(aSeed * 13.7) < 0.05) c = uColSpark * 1.3;
float spreadOut = 1.0 + blur * uDofSize;
vColor = c * fade * tw / (spreadOut * spreadOut);
gl_PointSize = uSize * aSize * uScale * (uCamZ / depth) * spreadOut;
gl_Position = projectionMatrix * mv;
}
`;

const POINTS_FRAG = /* glsl */ `
uniform float uBright; varying vec3 vColor; varying float vBlur;
void main() {
float r = length(gl_PointCoord - 0.5) * 2.0;
if (r > 1.0) discard;
float glint = exp(-r * r * 6.0);
float disc = smoothstep(1.0, 0.6, r) * 0.5 + smoothstep(0.5, 0.92, r) * (1.0 - smoothstep(0.9, 1.0, r)) * 0.55;
gl_FragColor = vec4(vColor * mix(glint, disc, vBlur) * uBright, 1.0);
}
`;

const LINES_VERT = PRELUDE + /* glsl */ `
attribute float aU; attribute vec4 aStrand;
uniform float uTime, uRevealPx, uFadeIn, uFadeOut, uSpread, uSpreadEnds, uLineSpread, uLineWavelength, uLineWaveAmp, uLineWaveSpeed, uPulseGain, uLineBase, uHeat, uAltStrands;
uniform vec3 uColMain, uColAlt, uColCore, uColDeep;
varying vec3 vColor; varying vec3 vPulse; varying float vA; varying float vPhase;
void main() {
float u = aU; float a = u * uLen;
float pinch = curveRow(u, 0.0).w;
float spread = widthAt(u, pinch, uSpread, uSpreadEnds) * uLineSpread;
float wave = sin(a / uLineWavelength * 6.2831 + aStrand.z + uTime * uLineWaveSpeed) * uLineWaveAmp;
vec3 s = onSpine(u, vec2(aStrand.x + wave, aStrand.y) * spread);
float fade = smoothstep(0.0, uFadeIn, a) * smoothstep(uLen * aStrand.w, uLen * aStrand.w - uFadeOut, a) * smoothstep(uRevealPx, uRevealPx - 260.0, a);
vec3 hue = fract(aStrand.z * 1.618) < uAltStrands ? uColAlt : uColMain;
vec3 c = mix(mix(uColDeep, hue, 0.75), uColCore, pinch * 0.6);
vColor = c * fade * uLineBase * (1.0 + pinch * uHeat);
vPulse = c * fade * uPulseGain;
vA = a; vPhase = aStrand.z;
gl_Position = projectionMatrix * modelViewMatrix * vec4(toWorld(s), 1.0);
}
`;

const LINES_FRAG = /* glsl */ `
uniform float uBright, uPulseSpacing, uPulseShift, uPulseSharp;
varying vec3 vColor; varying vec3 vPulse; varying float vA; varying float vPhase;
void main() {
float p = fract((vA - uPulseShift) / uPulseSpacing + vPhase) - 0.5;
float pulse = exp(-p * p * uPulseSharp * uPulseSharp);
gl_FragColor = vec4((vColor + vPulse * pulse) * uBright, 1.0);
}
`;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const idle = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 120 }) : setTimeout(r, 0)));

function frameOf(w) { return w <= 580 ? 390 : w <= 900 ? 768 : w <= 1200 ? 1024 : 1440; }
function docTop(el) { let t = 0; for (let e = el; e; e = e.offsetParent) t += e.offsetTop; return t; }
function cssColor(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new Color(v || fallback);
}
function slideMin(a, r) { const n = a.length, o = new Float32Array(n); for (let i = 0; i < n; i++) { let m = Infinity; for (let j = Math.max(0, i - r); j <= Math.min(n - 1, i + r); j++) if (a[j] < m) m = a[j]; o[i] = m; } return o; }
function slideMean(a, r) {
  const n = a.length, o = new Float32Array(n), pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + a[i];
  for (let i = 0; i < n; i++) { const lo = Math.max(0, i - r), hi = Math.min(n - 1, i + r); o[i] = (pre[hi + 1] - pre[lo]) / (hi - lo + 1); }
  return o;
}

export async function createStream(canvas, { reduced = false, coarse = false, onFrameGap } = {}) {
  let forceLow = false;
  let tier = coarse || innerWidth <= 900 ? "low" : "full";
  let unit = 1, w = 0, h = 0, frame = frameOf(innerWidth);
  let scrollPx = 0, lastScroll = 0, scrollY = 0;
  let revealStart = -1, lastTime = -1;
  const pointer = new Vector2(), look = new Vector2();

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 1);
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  camera.position.set(0, 0, CAM_Z);
  await idle();

  // ---- spine texture
  const data = new Float32Array(SAMPLES * 2 * 4);
  const tex = new DataTexture(data, SAMPLES, 2, RGBAFormat, FloatType);
  tex.minFilter = tex.magFilter = NearestFilter;
  tex.needsUpdate = true;

  const U = {
    uCurve: { value: tex }, uHalfH: { value: HALF_H }, uCamZ: { value: CAM_Z }, uPx: { value: 1 }, uLen: { value: 1 },
    uView: { value: new Vector3(1, 1, 0) }, uTime: { value: 0 }, uTimeS: { value: 0 },
    uTurnHold: { value: CONFIG.turnHold }, uBreath: { value: CONFIG.breath }, uBreathWave: { value: CONFIG.breathWavelength }, uBreathSpeed: { value: CONFIG.breathSpeed },
    uRevealPx: { value: 0 }, uFadeIn: { value: 120 }, uFadeOut: { value: 400 },
    uSpread: { value: CONFIG.spread }, uSpreadEnds: { value: CONFIG.spreadEnds }, uHeat: { value: CONFIG.heat }, uBright: { value: CONFIG.brightness },
    uColMain: { value: cssColor("--stream-main", "#ff3b47") }, uColAlt: { value: cssColor("--stream-alt", "#6d88ff") },
    uAltShare: { value: CONFIG.altShare }, uColCore: { value: cssColor("--stream-core", "#ffd6d9") },
    uColDeep: { value: cssColor("--stream-deep", "#4d0b12") }, uColSpark: { value: cssColor("--stream-spark", "#ffffff") },
  };
  const PU = {
    ...U, uFlow: { value: 0 }, uScrollU: { value: 0 }, uSpray: { value: CONFIG.spraySpread }, uBokeh: { value: CONFIG.bokehSpread },
    uDust: { value: CONFIG.dustSpread }, uWobble: { value: CONFIG.wobble }, uSize: { value: CONFIG.size }, uScale: { value: 1 },
    uFocal: { value: CONFIG.focal }, uDof: { value: CONFIG.dof }, uDofSize: { value: CONFIG.dofSize }, uTwinkle: { value: CONFIG.twinkle },
  };
  const LU = {
    ...U, uPulseShift: { value: 0 }, uPulseSharp: { value: CONFIG.pulseSharp }, uAltStrands: { value: CONFIG.altStrands },
    uLineSpread: { value: CONFIG.lineSpread }, uLineWavelength: { value: CONFIG.lineWavelength }, uLineWaveAmp: { value: CONFIG.lineWaveAmp },
    uLineWaveSpeed: { value: CONFIG.lineWaveSpeed }, uPulseSpacing: { value: CONFIG.pulseSpacing }, uPulseGain: { value: CONFIG.pulseGain }, uLineBase: { value: CONFIG.lineBase },
  };
  const matOpts = { blending: AdditiveBlending, transparent: true, depthTest: false, depthWrite: false };

  // ---- points
  {
    const N = CONFIG.particles, rand = mulberry32(0x5eed1e);
    const kinds = new Float32Array(N);
    const nSpray = Math.round(N * 0.14), nBokeh = Math.round(N * 0.03), nDust = Math.round(N * 0.04);
    for (let i = 0; i < N; i++) kinds[i] = i < nSpray ? 1 : i < nSpray + nBokeh ? 2 : i < nSpray + nBokeh + nDust ? 3 : 0;
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = kinds[i]; kinds[i] = kinds[j]; kinds[j] = t; }
    const pos = new Float32Array(N * 3), aU = new Float32Array(N), aSeed = new Float32Array(N), aOff = new Float32Array(N * 2), aSize = new Float32Array(N);
    const gauss = () => rand() + rand() + rand() + rand() - 2;
    for (let i = 0; i < N; i++) {
      aU[i] = rand(); aSeed[i] = rand(); aOff[i * 2] = gauss() * 0.5; aOff[i * 2 + 1] = gauss() * 0.5;
      const k = kinds[i];
      if (k === 0) aSize[i] = 0.35 + Math.pow(rand(), 4) * 2.4;
      else if (k === 1) aSize[i] = 0.3 + rand() * 0.6;
      else if (k === 2) { aSize[i] = 1.2 + rand() * 1.6; pos[i * 3 + 2] = 1.0 + rand() * 1.4; }
      else { aSize[i] = 0.25 + rand() * 0.4; pos[i * 3 + 2] = -1.2 + rand() * 1.0; }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aU", new BufferAttribute(aU, 1));
    g.setAttribute("aSeed", new BufferAttribute(aSeed, 1));
    g.setAttribute("aOff", new BufferAttribute(aOff, 2));
    g.setAttribute("aSize", new BufferAttribute(aSize, 1));
    g.setAttribute("aKind", new BufferAttribute(kinds, 1));
    var points = new Points(g, new ShaderMaterial({ uniforms: PU, vertexShader: POINTS_VERT, fragmentShader: POINTS_FRAG, ...matOpts }));
    points.frustumCulled = false;
    scene.add(points);
  }
  await idle();
  // ---- lines
  {
    const S = CONFIG.strands, V = SEGMENTS + 1, rand = mulberry32(0xf11a);
    const aU = new Float32Array(S * V), aStrand = new Float32Array(S * V * 4), pos = new Float32Array(S * V * 3);
    const idx = new Uint32Array(S * SEGMENTS * 2);
    let q = 0;
    for (let s = 0; s < S; s++) {
      const nx = (rand() - 0.5) * 2, nz = (rand() - 0.5) * 1.2, phase = rand() * Math.PI * 2, end = 0.93 + rand() * 0.07;
      for (let i = 0; i < V; i++) {
        const v = s * V + i;
        aU[v] = i / SEGMENTS;
        aStrand.set([nx, nz, phase, end], v * 4);
        if (i < SEGMENTS) { idx[q++] = v; idx[q++] = v + 1; }
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aU", new BufferAttribute(aU, 1));
    g.setAttribute("aStrand", new BufferAttribute(aStrand, 4));
    g.setIndex(new BufferAttribute(idx, 1));
    var lines = new LineSegments(g, new ShaderMaterial({ uniforms: LU, vertexShader: LINES_VERT, fragmentShader: LINES_FRAG, ...matOpts }));
    lines.frustumCulled = false;
    scene.add(lines);
  }
  await idle();

  // ---- composer
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(1, 1), CONFIG.bloomStr, CONFIG.bloomRadius, CONFIG.bloomThresh);
  composer.addPass(bloom);
  const output = new OutputPass();
  composer.addPass(output);

  // ---- spine bake
  function bake() {
    const main = document.querySelector("main");
    if (!main) return;
    const col = main.getBoundingClientRect();
    const colLeft = col.left + window.scrollX;
    const pts = [], pinched = [];
    for (const wp of [...HERO[frame], ...TAIL]) {
      const sec = document.getElementById(wp.at);
      if (!sec || !sec.offsetParent) continue;
      let block = sec;
      for (let a = sec.parentElement; a && a !== main; a = a.parentElement) {
        if (getComputedStyle(a).position === "sticky") { block = a.parentElement; break; }
      }
      const x = colLeft + (wp.x + SHIFT) * col.width;
      const y = docTop(block) + wp.y * block.offsetHeight;
      if (pts.length && y <= pts[pts.length - 1].y) continue;
      pts.push(new Vector3(x, y, wp.z));
      if (wp.pinch) pinched.push({ i: pts.length - 1, pinch: wp.pinch });
    }
    if (pts.length < 2) return;
    const curve = new CatmullRomCurve3(pts, false, "centripetal");
    const length = Math.max(1, curve.getLength());
    const step = length / (SAMPLES - 1);
    const P = curve.getSpacedPoints(SAMPLES - 1);
    const ang = new Float32Array(SAMPLES);
    for (let i = 0; i < SAMPLES; i++) {
      const t = curve.getTangentAt(i / (SAMPLES - 1));
      ang[i] = Math.atan2(t.y, t.x);
    }
    const r = new Float32Array(SAMPLES);
    for (let i = 0; i < SAMPLES; i++) {
      const a = ang[Math.min(SAMPLES - 1, i + TURN_BASE)], b = ang[Math.max(0, i - TURN_BASE)];
      let turn = Math.abs(a - b);
      if (turn > Math.PI) turn = Math.PI * 2 - turn;
      r[i] = Math.min(TURN_OPEN, (2 * TURN_BASE * step) / Math.max(1e-4, turn) / unit);
    }
    const held = slideMean(slideMean(slideMin(r, TURN_HOLD), TURN_SMOOTH), TURN_SMOOTH);
    // pinch peaks: nearest sample to each pinched waypoint
    const peaks = pinched.map(({ i, pinch }) => {
      const wp = pts[i];
      let best = 0, bd = Infinity;
      for (let s = 0; s < SAMPLES; s++) { const d = (P[s].x - wp.x) ** 2 + (P[s].y - wp.y) ** 2; if (d < bd) { bd = d; best = s; } }
      return { at: best / (SAMPLES - 1), pinch };
    });
    for (let s = 0; s < SAMPLES; s++) {
      const at = s / (SAMPLES - 1);
      let p = 0;
      for (const pk of peaks) { const d = ((at - pk.at) * length) / (CONFIG.pinchReach * unit); p = Math.max(p, pk.pinch * Math.exp(-d * d)); }
      data[s * 4] = P[s].x; data[s * 4 + 1] = P[s].y; data[s * 4 + 2] = P[s].z; data[s * 4 + 3] = p;
      const o = (SAMPLES + s) * 4;
      data[o] = -Math.sin(ang[s]); data[o + 1] = Math.cos(ang[s]); data[o + 2] = held[s]; data[o + 3] = 0;
    }
    tex.needsUpdate = true;
    U.uLen.value = length;
    U.uFadeOut.value = Math.min(length / 4, 400 * unit);
    PU.uFlow.value = (CONFIG.flowPx * unit) / length;
  }

  function retune() {
    points.geometry.setDrawRange(0, Math.floor(CONFIG.particles * (tier === "low" ? CONFIG.lowShare : 1)));
    lines.geometry.setDrawRange(0, Math.ceil(CONFIG.strands * (tier === "low" ? 0.6 : 1)) * SEGMENTS * 2);
  }
  function resize(force) {
    const nw = canvas.clientWidth || innerWidth, nh = canvas.clientHeight || innerHeight;
    const nt = forceLow || coarse || innerWidth <= 900 ? "low" : "full";
    const nf = frameOf(innerWidth);
    const sizeChanged = force || nw !== w || nh !== h || nt !== tier || nf !== frame;
    if (!sizeChanged) { bake(); return; }
    w = nw; h = nh; tier = nt; frame = nf;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR[tier]);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    // bloom is a soft glow: half resolution looks the same and costs a quarter
    bloom.setSize(Math.ceil(w * dpr * 0.5), Math.ceil(h * dpr * 0.5));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    unit = (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16;
    PU.uScale.value = unit * dpr;
    U.uPx.value = unit / (h / 2);
    U.uFadeIn.value = 120 * unit;
    LU.uLineWavelength.value = CONFIG.lineWavelength * unit;
    LU.uPulseSpacing.value = CONFIG.pulseSpacing * unit;
    U.uBreathWave.value = CONFIG.breathWavelength * unit;
    retune();
    bake();
  }
  resize(true);

  // ---- prewarm: compile everything before the page is live
  try {
    if (renderer.compileAsync) {
      await renderer.compileAsync(scene, camera);
      const mats = [bloom.materialHighPassFilter, ...(bloom.separableBlurMaterials || []), bloom.compositeMaterial, bloom.blendMaterial, output.material, composer.copyPass && composer.copyPass.material].filter(Boolean);
      const warm = new Scene();
      const plane = new PlaneGeometry(2, 2);
      mats.forEach((m) => warm.add(new Mesh(plane, m)));
      await renderer.compileAsync(warm, camera);
      plane.dispose();
    }
  } catch (e) { /* compile lazily */ }

  function render(now) {
    const dt = lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    look.lerp(pointer, 1 - Math.exp(-DAMP * dt));
    camera.position.set(-look.x * CONFIG.parallax, look.y * CONFIG.parallax, CAM_Z);
    camera.lookAt(0, 0, 0);
    const t = revealStart < 0 ? 0 : Math.min(1, (now - revealStart) / CONFIG.revealMs);
    U.uRevealPx.value = t >= 1 ? REVEALED : easeOutCubic(t) * CONFIG.revealPx * unit;
    U.uTime.value = now / 1000;
    U.uTimeS.value = (now / 1000) % 1000;
    U.uView.value.set(w / 2, h / 2, scrollY);
    PU.uScrollU.value = (scrollPx / U.uLen.value) % 1;
    const spacing = CONFIG.pulseSpacing * unit;
    LU.uPulseShift.value = ((now / 1000) * CONFIG.pulseSpeed * unit + scrollPx) % spacing;
    composer.render(dt);
  }
  // first frame, so nothing allocates once live
  render(performance.now());

  return {
    render,
    resize,
    bake,
    tier: () => tier,
    // drop to the light tier when the device cannot keep up
    degrade() { if (tier === "low") return false; forceLow = true; resize(true); return true; },
    setScroll(y) { scrollPx += Math.abs(y - lastScroll) * CONFIG.scrollFlow; lastScroll = y; scrollY = y; },
    setPointer(x, y) { pointer.set(x, y); },
    reveal(now, instant) { revealStart = instant ? now - CONFIG.revealMs : now; },
    dispose() { renderer.dispose(); },
  };
}
