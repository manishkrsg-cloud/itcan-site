/* ITCAN site — interactions. No dependencies. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  window.addEventListener('error', () => document.documentElement.classList.add('reveal-all'));
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- year ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- nav: scrolled state + current section ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const navLinks = $$('.nav-links a');
  const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + e.target.id));
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => io.observe(s));
  }

  /* ---------- mobile menu ---------- */
  const menuBtn = $('#menuBtn');
  const mobileMenu = $('#mobileMenu');
  const setMenu = open => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobileMenu.hidden = !open;
    document.body.classList.toggle('no-scroll', open);
    nav.classList.toggle('is-scrolled', open || window.scrollY > 12);
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  $$('a', mobileMenu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('resize', () => { if (window.innerWidth > 960 && !mobileMenu.hidden) setMenu(false); });

  /* ---------- split headings into words for a rise-in reveal ---------- */
  const splitWords = el => {
    let n = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.textContent = part;
            i.style.transitionDelay = (n++ * 55) + 'ms';
            w.appendChild(i); frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    el.classList.add('split');
  };
  $$('.hero h1, .sec-head h2, .about-copy h2, .contact-copy h2').forEach(splitWords);

  /* ---------- reveal on scroll ---------- */
  const revealAll = () => $$('.reveal, .split').forEach(el => el.classList.add('is-in'));
  if (!('IntersectionObserver' in window)) {
    revealAll();
  } else {
    const rio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const sibs = $$('.reveal', e.target.parentElement);
          const i = Math.max(0, sibs.indexOf(e.target));
          if (e.target.classList.contains('reveal')) e.target.style.transitionDelay = Math.min(i * 80, 480) + 'ms';
          e.target.classList.add('is-in');
          rio.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    $$('.reveal, .split').forEach(el => rio.observe(el));
    // safety net: whatever sits on screen when scrolling stops is shown
    const sweep = () => $$('.reveal:not(.is-in), .split:not(.is-in)').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
    });
    let sweepTimer = null;
    window.addEventListener('scroll', () => { clearTimeout(sweepTimer); sweepTimer = setTimeout(sweep, 180); }, { passive: true });
    setTimeout(sweep, 2200);
  }
  // hero plays its entrance on load
  requestAnimationFrame(() => document.body.classList.add('is-loaded'));

  /* ---------- scroll progress bar ---------- */
  const progress = $('#scrollProgress');
  let progTick = false;
  const setProgress = () => {
    progTick = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
  };
  window.addEventListener('scroll', () => { if (!progTick) { progTick = true; requestAnimationFrame(setProgress); } }, { passive: true });
  setProgress();

  /* ---------- typed chip ---------- */
  const typed = $('#typed');
  if (typed) {
    const full = typed.dataset.text;
    let i = 0;
    typed.textContent = '';
    const tick = () => {
      typed.textContent = full.slice(0, ++i);
      if (i < full.length) setTimeout(tick, 38 + Math.random() * 40);
    };
    setTimeout(tick, 700);
  }

  /* ---------- hero field: WebGL particle wave with glow (2D fallback) ---------- */
  const canvas = $('#heroCanvas');
  const hero = $('.hero');
  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0 };
  if (hero) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      pointer.tx = (e.clientX - r.left) / r.width;
      pointer.ty = (e.clientY - r.top) / r.height;
      pointer.active = 1;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { pointer.active = 0; });
  }
  const speed = reduceMotion ? 0.35 : 1;

  const startGL = () => {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl) return false;
    const vs = `
      attribute vec2 aGrid;
      uniform float uTime; uniform vec2 uMouse; uniform float uMouseOn; uniform float uAspect; uniform float uDpr;
      varying float vAlpha; varying float vMix; varying float vGlow;
      vec2 project(float x, float y, float z) {
        float depth = 1.1 + z * 3.4;
        vec2 p = vec2(x * 4.2 / depth, (y - 0.55) / depth * 2.2 - 0.02);
        p.x /= max(uAspect, 0.6) * 0.62;
        return p;
      }
      void main() {
        float x = aGrid.x;            // -1..1 across
        float z = aGrid.y;            // 0 near .. 1 far
        float t = uTime;
        float y = sin(x * 3.2 + t * 0.9) * 0.11 + cos(z * 7.0 - t * 0.7) * 0.08 + sin((x + z) * 5.0 + t * 0.5) * 0.05;
        vec2 p0 = project(x, y, z);
        vec2 m = vec2(uMouse.x * 2.0 - 1.0, 1.0 - uMouse.y * 2.0);
        vec2 dd = (p0 - m) * vec2(uAspect, 1.0);
        float d = length(dd);
        float ripple = exp(-d * d * 9.0) * uMouseOn;
        y += ripple * (0.14 + 0.05 * sin(d * 24.0 - t * 5.0));
        gl_Position = vec4(project(x, y, z), 0.0, 1.0);
        gl_PointSize = (3.2 + ripple * 5.0) * uDpr / (0.5 + z * 0.9);
        vAlpha = (0.3 + (1.0 - z) * 0.7) * smoothstep(-1.02, -0.8, x) * (1.0 - smoothstep(0.8, 1.02, x)) * smoothstep(1.0, 0.7, z) + ripple * 0.7;
        vMix = clamp(0.5 + x * 0.5 + y * 1.2, 0.0, 1.0);
        vGlow = ripple + clamp(y * 3.0, 0.0, 0.6);
      }`;
    const fs = `
      precision mediump float;
      varying float vAlpha; varying float vMix; varying float vGlow;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c);
        if (r > 0.5) discard;
        float core = smoothstep(0.5, 0.0, r);
        vec3 red = vec3(1.0, 0.25, 0.30);
        vec3 blue = vec3(0.43, 0.53, 1.0);
        vec3 grey = vec3(0.78, 0.82, 0.92);
        vec3 col = mix(grey, mix(red, blue, vMix), clamp(0.35 + vGlow, 0.0, 1.0));
        gl_FragColor = vec4(col * (0.85 + vGlow), core * vAlpha * (0.8 + vGlow));
      }`;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; };
    const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return false;
    const prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    const small = window.innerWidth < 700;
    const COLS = small ? 90 : 150, ROWS = small ? 46 : 70;
    const pts = new Float32Array(COLS * ROWS * 2);
    let k = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { pts[k++] = (c / (COLS - 1)) * 2 - 1; pts[k++] = r / (ROWS - 1); }
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aGrid'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(prog, n);
    const uTime = U('uTime'), uMouse = U('uMouse'), uOn = U('uMouseOn'), uAspect = U('uAspect'), uDpr = U('uDpr');
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
    let dpr = 1, raf = 0, visible = true, on = 0;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uAspect, r.width / Math.max(1, r.height)); gl.uniform1f(uDpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    const t0 = performance.now();
    const frame = now => {
      pointer.x += (pointer.tx - pointer.x) * 0.08; pointer.y += (pointer.ty - pointer.y) * 0.08;
      on += (pointer.active - on) * 0.05;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, (now - t0) / 1000 * speed);
      gl.uniform2f(uMouse, pointer.x, pointer.y); gl.uniform1f(uOn, on);
      gl.drawArrays(gl.POINTS, 0, COLS * ROWS);
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const run = () => { cancelAnimationFrame(raf); if (visible && !document.hidden) raf = requestAnimationFrame(frame); };
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); }).observe(hero);
    document.addEventListener('visibilitychange', run);
    run();
    canvas.classList.add('is-gl');
    return true;
  };

  const start2D = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0, dpr = 1, dots = [], raf = 0, visible = true;
    const t0 = performance.now(), GAP = 26;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let y = GAP / 2; y < h; y += GAP) for (let x = GAP / 2; x < w; x += GAP) dots.push({ x, y, s: Math.random() });
    };
    const draw = now => {
      const t = (now - t0) / 1000 * speed;
      pointer.x += (pointer.tx - pointer.x) * 0.1; pointer.y += (pointer.ty - pointer.y) * 0.1;
      const mx = pointer.active ? pointer.x * w : -9999, my = pointer.active ? pointer.y * h : -9999;
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        const dist = Math.hypot(d.x - mx, d.y - my);
        const near = Math.max(0, 1 - dist / 240);
        const wave = 0.5 + 0.5 * Math.sin(t * 0.8 + d.x * 0.012 + d.y * 0.008 + d.s * 6);
        const a = (0.07 + wave * 0.1 + near * 0.6) * Math.max(0, Math.min(1, (h - d.y) / 180));
        if (a < 0.02) continue;
        ctx.fillStyle = near > 0.05 ? `rgba(255, ${Math.round(110 - near * 60)}, ${Math.round(120 - near * 50)}, ${a})` : `rgba(210, 216, 232, ${a})`;
        const r = 0.9 + near * 1.4;
        ctx.fillRect(d.x - r / 2, d.y - r / 2, r, r);
      }
      if (visible && !document.hidden) raf = requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener('resize', resize);
    const run = () => { cancelAnimationFrame(raf); if (visible && !document.hidden) raf = requestAnimationFrame(draw); };
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); }).observe(hero);
    document.addEventListener('visibilitychange', run);
    run();
  };
  if (canvas) { let ok = false; try { ok = startGL(); } catch { ok = false; } if (!ok) start2D(); }

  /* ---------- hero glow follows the pointer ---------- */
  const glow = $('.hero-glow');
  if (glow && window.matchMedia('(pointer: fine)').matches) {
    const moveGlow = () => {
      glow.style.setProperty('--gx', ((pointer.x - 0.5) * 120).toFixed(1) + 'px');
      glow.style.setProperty('--gy', ((pointer.y - 0.5) * 80).toFixed(1) + 'px');
      requestAnimationFrame(moveGlow);
    };
    requestAnimationFrame(moveGlow);
  }

  /* ---------- hero flow panel: scale to fit, tilt on pointer, flatten on scroll ---------- */
  $$('[data-flow-w]').forEach(wrap => {
    const inner = $('[data-flow]', wrap);
    const base = Number(wrap.dataset.flowW);
    const fit = () => { if (wrap.clientWidth) inner.style.setProperty('--k', (wrap.clientWidth / base).toFixed(4)); };
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(wrap);
    else window.addEventListener('resize', fit);
  });
  const flowWrap = $('#flowWrap');
  const flowTilt = $('#flowTilt');
  if (flowWrap && flowTilt && !reduceMotion) {
    const fine = window.matchMedia('(pointer: fine)').matches;
    let px = 0, py = 0, sp = 0, cur = { y: -16, x: 7, ty: 0, s: 1 };
    if (fine) {
      hero.addEventListener('pointermove', e => {
        const r = flowWrap.getBoundingClientRect();
        px = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        py = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      }, { passive: true });
      hero.addEventListener('pointerleave', () => { px = 0; py = 0; });
    }
    const loop = () => {
      sp = Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight)));
      const target = { y: -16 + px * 12 + sp * 10, x: 7 - py * 9 + sp * 14, ty: sp * -40, s: 1 - sp * 0.06 };
      cur.y += (target.y - cur.y) * 0.08; cur.x += (target.x - cur.x) * 0.08; cur.ty += (target.ty - cur.ty) * 0.12; cur.s += (target.s - cur.s) * 0.12;
      flowTilt.style.transform = `translateY(${cur.ty.toFixed(1)}px) scale(${cur.s.toFixed(3)}) rotateY(${cur.y.toFixed(2)}deg) rotateX(${cur.x.toFixed(2)}deg) rotateZ(-1deg)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- 3D tilt on cards + magnetic buttons (desktop) ---------- */
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    $$('.svc, .sol, .office, .quote, .culture, .press, .vmv').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-3px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
    $$('.btn-primary').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1)}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- office network map ---------- */
  const mapSvg = $('#officeMap');
  if (mapSvg) {
    const NS = 'http://www.w3.org/2000/svg', XL = 'http://www.w3.org/1999/xlink';
    const el = (tag, attrs = {}, parent = mapSvg) => { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => k === 'href' ? (n.setAttribute('href', v), n.setAttributeNS(XL, 'xlink:href', v)) : n.setAttribute(k, v)); parent.appendChild(n); return n; };
    const proj = (lat, lon) => [30 + (lon - 68) * 10.44, 20 + (36 - lat) * 5];
    const offices = [
      { id: 'sg', name: 'Singapore', tag: 'HQ', lat: 1.29, lon: 103.85, tz: 'Asia/Singapore', lx: 16, ly: 8, anchor: 'start' },
      { id: 'kl', name: 'Kuala Lumpur', lat: 3.14, lon: 101.69, tz: 'Asia/Kuala_Lumpur', lx: -14, ly: -6, anchor: 'end' },
      { id: 'jk', name: 'Jakarta', lat: -6.19, lon: 106.82, tz: 'Asia/Jakarta', lx: 14, ly: 20, anchor: 'start' },
      { id: 'hk', name: 'Hong Kong', lat: 22.3, lon: 114.18, tz: 'Asia/Hong_Kong', lx: 14, ly: 6, anchor: 'start' },
      { id: 'dl', name: 'New Delhi', lat: 28.63, lon: 77.22, tz: 'Asia/Kolkata', lx: 14, ly: 6, anchor: 'start' },
      { id: 'sy', name: 'Sydney', lat: -33.87, lon: 151.08, tz: 'Australia/Sydney', lx: -14, ly: -8, anchor: 'end' },
    ];
    const defs = el('defs');
    const pat = el('pattern', { id: 'mapDots', width: 16, height: 16, patternUnits: 'userSpaceOnUse' }, defs);
    el('circle', { cx: 2, cy: 2, r: 1.1, fill: 'rgba(255,255,255,.10)' }, pat);
    const lg = el('linearGradient', { id: 'arcGrad', x1: 0, x2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#ff3340' }, lg); el('stop', { offset: 1, 'stop-color': '#6d88ff' }, lg);
    const f = el('filter', { id: 'mapGlow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: 5, result: 'b' }, f);
    const fm = el('feMerge', {}, f); el('feMergeNode', { in: 'b' }, fm); el('feMergeNode', { in: 'SourceGraphic' }, fm);
    const rg = el('radialGradient', { id: 'hqHalo' }, defs);
    el('stop', { offset: 0, 'stop-color': 'rgba(255,51,64,.45)' }, rg); el('stop', { offset: 1, 'stop-color': 'rgba(255,51,64,0)' }, rg);
    el('rect', { x: 0, y: 0, width: 1000, height: 420, fill: 'url(#mapDots)' });
    for (let lat = 30; lat >= -30; lat -= 15) { const [, y] = proj(lat, 0); el('line', { x1: 0, x2: 1000, y1: y, y2: y, class: 'grid' }); }
    for (let lon = 80; lon <= 150; lon += 15) { const [x] = proj(0, lon); el('line', { x1: x, x2: x, y1: 0, y2: 420, class: 'grid' }); }
    const [hx, hy] = proj(offices[0].lat, offices[0].lon);
    el('circle', { cx: hx, cy: hy, r: 120, fill: 'url(#hqHalo)' });
    const arcs = el('g', { filter: 'url(#mapGlow)' });
    offices.slice(1).forEach((o, i) => {
      const [x, y] = proj(o.lat, o.lon);
      const mx = (hx + x) / 2, my = (hy + y) / 2, dx = x - hx, dy = y - hy, len = Math.hypot(dx, dy);
      const bend = Math.min(140, 40 + len * 0.35);
      const cx = mx + (-dy / len) * bend * (x > hx ? 1 : -1), cy = my + (dx / len) * bend * (x > hx ? -1 : 1);
      const d = `M${hx.toFixed(1)} ${hy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
      el('path', { id: 'arc-' + o.id, d, class: 'arc' }, arcs);
      el('path', { d, class: 'arc-dash' }, arcs);
      const dot = el('circle', { r: 3.6, class: i % 2 ? 'arc-dot blue' : 'arc-dot' }, arcs);
      const am = el('animateMotion', { dur: (2.4 + i * 0.35) + 's', begin: (i * 0.45) + 's', repeatCount: 'indefinite' }, dot);
      el('mpath', { href: '#arc-' + o.id }, am);
    });
    offices.forEach(o => {
      const [x, y] = proj(o.lat, o.lon);
      const g = el('g', { class: 'pin' + (o.tag ? ' hq' : ''), transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
      const ring = el('circle', { r: 6, class: 'ring' }, g);
      el('animate', { attributeName: 'r', values: '6;22', dur: '2.4s', repeatCount: 'indefinite', begin: (Math.random() * 2).toFixed(2) + 's' }, ring);
      el('animate', { attributeName: 'opacity', values: '.9;0', dur: '2.4s', repeatCount: 'indefinite', begin: ring.lastChild.getAttribute('begin') }, ring);
      el('circle', { r: o.tag ? 7 : 5, class: 'core' }, g);
      const t = el('text', { x: o.lx, y: o.ly, 'text-anchor': o.anchor, class: 'lbl' }, g);
      t.textContent = o.name + (o.tag ? ' · ' + o.tag : '');
      const tm = el('text', { x: o.lx, y: o.ly + 20, 'text-anchor': o.anchor, class: 'lbl-t', 'data-tz': o.tz }, g);
      tm.textContent = '--:--';
    });
  }

  /* ---------- clocks (hero log + office cards) ---------- */
  const fmtCache = {};
  const fmt = (tz, seconds) => {
    const key = tz + seconds;
    if (!fmtCache[key]) {
      try {
        fmtCache[key] = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: seconds ? '2-digit' : undefined, hour12: false });
      } catch { fmtCache[key] = null; }
    }
    return fmtCache[key];
  };
  const clockTargets = [
    ...$$('.flow-log li[data-tz]').map(li => ({ el: $('time', li), tz: li.dataset.tz, s: true })),
    ...$$('.office').map(o => ({ el: $('.clock', o), tz: o.dataset.tz, s: false })),
    ...$$('#officeMap .lbl-t').map(t => ({ el: t, tz: t.getAttribute('data-tz'), s: false, bare: true })),
  ].filter(c => c.el && c.tz);
  const updateClocks = () => {
    const now = new Date();
    clockTargets.forEach(c => {
      const f = fmt(c.tz, c.s);
      if (f) {
        const txt = f.format(now);
        c.el.textContent = c.s || c.bare ? txt : txt + ' local';
        if (!c.bare) c.el.setAttribute('datetime', now.toISOString());
      }
    });
  };
  updateClocks();
  setInterval(updateClocks, 1000);

  /* ---------- count-up stats ---------- */
  const counters = $$('.num[data-count]');
  const runCount = el => {
    const end = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dur = 1800, start = performance.now();
    const step = now => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * eased).toLocaleString('en-US') + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); }
    }), { threshold: 0.6 });
    counters.forEach(c => cio.observe(c));
  }

  /* ---------- card spotlight follows pointer ---------- */
  document.addEventListener('pointermove', e => {
    const card = e.target.closest && e.target.closest('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ---------- how we work: auto-cycle active step + progress line ---------- */
  const steps = $$('#steps .step');
  const stepsEl = $('#steps');
  if (steps.length) {
    let active = 0, timer = null;
    const setActive = i => {
      steps.forEach((s, j) => { s.classList.toggle('is-active', j === i); s.classList.toggle('is-done', j < i); });
      stepsEl.style.setProperty('--p', (i / (steps.length - 1)).toFixed(3));
    };
    const start = () => { if (!timer) timer = setInterval(() => { active = (active + 1) % steps.length; setActive(active); }, 2400); };
    const stop = () => { clearInterval(timer); timer = null; };
    steps.forEach((s, i) => s.addEventListener('pointerenter', () => { stop(); active = i; setActive(i); }));
    stepsEl.addEventListener('pointerleave', start);
    setActive(0);
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(stepsEl);
    else start();
  }

  /* ---------- tabs: vision / mission / values ---------- */
  const tabs = $$('.seg [role="tab"]');
  const selectTab = tab => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next); next.focus();
    });
  });

  /* ---------- modal helpers (focus trap, esc, scroll lock) ---------- */
  let lastFocus = null;
  const focusables = el => $$('button, [href], iframe, [tabindex]:not([tabindex="-1"])', el).filter(n => !n.hidden && n.offsetParent !== null);
  const openModal = (el, onClose) => {
    lastFocus = document.activeElement;
    el.hidden = false;
    document.body.classList.add('no-scroll');
    const f = focusables(el);
    (f.find(n => n.matches('.lb-close')) || f[0])?.focus();
    const onKey = e => {
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'Tab') {
        const list = focusables(el);
        if (!list.length) return;
        const first = list[0], last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      el._onKey2 && el._onKey2(e);
    };
    const onClick = e => { if (e.target.closest('[data-close]')) close(); };
    const close = () => {
      el.hidden = true;
      document.body.classList.remove('no-scroll');
      document.removeEventListener('keydown', onKey);
      el.removeEventListener('click', onClick);
      onClose && onClose();
      lastFocus && lastFocus.focus && lastFocus.focus();
    };
    document.addEventListener('keydown', onKey);
    el.addEventListener('click', onClick);
    return close;
  };

  /* ---------- video modal ---------- */
  const vm = $('#videoModal');
  const vmFrame = $('#vmFrame');
  $$('[data-video]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.video;
    const title = btn.dataset.title || 'Video';
    vmFrame.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    iframe.title = title;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    vmFrame.appendChild(iframe);
    $('#vmTitle').textContent = title;
    $('#vmLink').href = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    openModal(vm, () => { vmFrame.innerHTML = ''; });
  }));

  /* ---------- awards gallery + lightbox ---------- */
  const grid = $('#awardGrid');
  let gridSeen = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { gridSeen = true; grid.classList.add('in-view'); o.disconnect(); } }, { threshold: 0.08 }).observe(grid);
  } else { gridSeen = true; }
  const CAT = { e50: 'Enterprise 50', brand: 'Brand & leadership', ent: 'Entrepreneurship', exc: 'Excellence' };
  let awards = [];
  let shown = [];
  let lbIndex = 0;

  const imgFor = (a, small) => `/awards/${a.slug}${small ? '-sm' : ''}.jpg`;

  const render = filter => {
    shown = filter === 'all' ? awards : filter.startsWith('y:') ? awards.filter(a => a.year === Number(filter.slice(2))) : awards.filter(a => a.cat === filter);
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    shown.forEach((a, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'award' + (i === 0 ? ' feature' : '') + (a.h > a.w ? ' portrait' : '');
      b.style.animationDelay = Math.min(i * 45, 700) + 'ms';
      b.setAttribute('aria-label', `${a.year} ${a.title}, view photo`);
      const img = document.createElement('img');
      img.alt = `${a.year} ${a.title}`;
      img.loading = i < 5 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.width = a.w; img.height = a.h;
      img.src = imgFor(a, i !== 0);
      img.addEventListener('load', () => b.classList.add('loaded'));
      const sh = document.createElement('span'); sh.className = 'shimmer';
      const cap = document.createElement('span'); cap.className = 'cap';
      cap.innerHTML = `<span class="yr">${a.year}</span><span class="ttl"></span>`;
      cap.querySelector('.ttl').textContent = a.title;
      b.append(img, sh, cap);
      b.addEventListener('click', () => openLightbox(i));
      frag.appendChild(b);
    });
    grid.appendChild(frag);
    fillLastRow();
    if (gridSeen) grid.classList.add('in-view');
  };

  // Stretch the last tile so the final row has no empty cells.
  const fillLastRow = () => {
    const tiles = $$('.award', grid);
    if (!tiles.length) return;
    tiles.forEach(t => t.style.gridColumn = '');
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    const cells = tiles.length - 1 + (tiles[0].classList.contains('feature') ? Math.min(4, cols * 2) : 1);
    const empty = (cols - (cells % cols)) % cols;
    if (empty > 0) tiles[tiles.length - 1].style.gridColumn = `span ${empty + 1}`;
  };
  let fillTimer = null;
  window.addEventListener('resize', () => { clearTimeout(fillTimer); fillTimer = setTimeout(fillLastRow, 120); });

  const lb = $('#lightbox');
  const lbImg = $('#lbImg');
  const showLb = i => {
    lbIndex = (i + shown.length) % shown.length;
    const a = shown[lbIndex];
    lbImg.src = imgFor(a, false);
    lbImg.alt = `${a.year} ${a.title}`;
    $('#lbYear').textContent = a.year;
    $('#lbTitle').textContent = a.title;
    $('#lbMeta').textContent = `${CAT[a.cat]} · ${lbIndex + 1} / ${shown.length}`;
    // preload neighbours
    [lbIndex + 1, lbIndex - 1].forEach(j => { const n = shown[(j + shown.length) % shown.length]; const p = new Image(); p.src = imgFor(n, false); });
  };
  const openLightbox = i => {
    showLb(i);
    lb._onKey2 = e => {
      if (e.key === 'ArrowRight') showLb(lbIndex + 1);
      if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
    };
    openModal(lb, () => { lb._onKey2 = null; });
  };
  $('#lbPrev').addEventListener('click', () => showLb(lbIndex - 1));
  $('#lbNext').addEventListener('click', () => showLb(lbIndex + 1));
  // swipe
  let sx = null;
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 45) showLb(lbIndex + (dx < 0 ? 1 : -1));
    sx = null;
  });

  const filterBtns = $$('#awardFilters button');
  const chart = $('#awardChart');
  const setBarActive = y => $$('button', chart).forEach(b => b.classList.toggle('is-active', Number(b.dataset.year) === y));
  filterBtns.forEach(btn => btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.setAttribute('aria-selected', String(b === btn)));
    setBarActive(null);
    render(btn.dataset.filter);
  }));
  const buildChart = () => {
    if (!chart) return;
    const years = [];
    for (let y = 2007; y <= 2023; y++) years.push(y);
    const counts = Object.fromEntries(years.map(y => [y, awards.filter(a => a.year === y).length]));
    const max = Math.max(...Object.values(counts));
    chart.innerHTML = '';
    years.forEach((y, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bar' + (counts[y] ? '' : ' empty');
      b.dataset.year = y;
      b.style.setProperty('--h', (counts[y] / max).toFixed(3));
      b.style.setProperty('--d', (i * 45) + 'ms');
      b.disabled = !counts[y];
      b.setAttribute('aria-label', `${y}: ${counts[y]} award${counts[y] === 1 ? '' : 's'}`);
      b.innerHTML = `<span class="bar-val mono">${counts[y] || ''}</span><span class="bar-fill"></span><span class="bar-yr mono">${String(y).slice(2)}</span>`;
      b.addEventListener('click', () => {
        const on = b.classList.contains('is-active');
        filterBtns.forEach(f => f.setAttribute('aria-selected', String(on && f.dataset.filter === 'all')));
        setBarActive(on ? null : y);
        render(on ? 'all' : 'y:' + y);
        $('#awardChartHint').textContent = on ? 'tap a bar to see that year' : `${y} · ${counts[y]} award${counts[y] === 1 ? '' : 's'} · tap again for all`;
      });
      chart.appendChild(b);
    });
  };

  fetch('/data/awards.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(list => { awards = list.sort((a, b) => b.year - a.year); render('all'); buildChart(); })
    .catch(() => { grid.innerHTML = '<p class="muted">Award photos could not load. Please refresh the page.</p>'; });

  /* ---------- mobile carousels with dots ---------- */
  const mqMobile = window.matchMedia('(max-width: 760px)');
  $$('[data-carousel]').forEach(track => {
    const items = Array.from(track.children);
    if (items.length < 2) return;
    const dots = document.createElement('div');
    dots.className = 'dots';
    dots.setAttribute('role', 'tablist');
    dots.setAttribute('aria-label', (track.getAttribute('aria-label') || 'Slides') + ' slides');
    items.forEach((item, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', `Slide ${i + 1} of ${items.length}`);
      d.setAttribute('aria-selected', String(i === 0));
      d.addEventListener('click', () => {
        const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        track.scrollTo({ left: item.offsetLeft - track.offsetLeft - pad, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
      dots.appendChild(d);
    });
    track.after(dots);
    let ticking = false;
    const update = () => {
      ticking = false;
      if (!mqMobile.matches) return;
      const center = track.scrollLeft + track.clientWidth * 0.35;
      let best = 0, bestDist = Infinity;
      items.forEach((it, i) => {
        const dist = Math.abs((it.offsetLeft - track.offsetLeft) - center);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) best = items.length - 1;
      $$('button', dots).forEach((d, i) => d.setAttribute('aria-selected', String(i === best)));
    };
    track.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  });

  /* ---------- mobile action bar ---------- */
  const mbar = $('#mbar');
  if (mbar && 'IntersectionObserver' in window) {
    const state = { hero: true, contact: false, footer: false };
    const sync = () => {
      const on = !state.hero && !state.contact && !state.footer && mobileMenu.hidden;
      mbar.classList.toggle('is-on', on);
      mbar.setAttribute('aria-hidden', String(!on));
      $$('a', mbar).forEach(a => { a.tabIndex = on ? 0 : -1; });
    };
    const watch = (el, key, margin) => el && new IntersectionObserver(([e]) => { state[key] = e.isIntersecting; sync(); }, { rootMargin: margin }).observe(el);
    watch($('.hero'), 'hero', '0px 0px -35% 0px');
    watch($('#contact'), 'contact', '0px 0px -20% 0px');
    watch($('.footer'), 'footer', '0px');
    menuBtn.addEventListener('click', () => setTimeout(sync, 0));
  }

  /* ---------- contact form → routed email ---------- */
  const form = $('#briefForm');
  if (form) {
    const ROUTE = { job: 'jobs@itcan.biz', other: 'info@itcan.biz' };
    const LABEL = { consulting: 'Business consulting', custom: 'A customized solution', outsourcing: 'An outsourced team', managed: 'Application support', job: 'A job at ITCAN', other: 'Something else' };
    const err = $('#formError');
    const done = $('#formDone');
    let lastBody = '';
    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const problems = [];
      $$('.invalid', form).forEach(n => n.classList.remove('invalid'));
      const mark = (name, msg) => { form.elements[name].classList.add('invalid'); problems.push(msg); };
      if (!data.name.trim()) mark('name', 'your name');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email.trim())) mark('email', 'a valid email');
      if (!data.need) mark('need', 'what you need');
      if (data.message.trim().length < 10) mark('message', 'a short brief (10+ characters)');
      if (problems.length) {
        err.textContent = 'Please add ' + problems.join(', ') + '.';
        err.hidden = false;
        form.querySelector('.invalid').focus();
        return;
      }
      err.hidden = true;
      const to = ROUTE[data.need] || 'sales@itcan.biz';
      const subject = `${LABEL[data.need]}: brief from ${data.name.trim()}${data.company.trim() ? ' (' + data.company.trim() + ')' : ''}`;
      lastBody = [
        `Name: ${data.name.trim()}`,
        `Email: ${data.email.trim()}`,
        data.company.trim() ? `Company: ${data.company.trim()}` : null,
        `Need: ${LABEL[data.need]}`,
        '',
        data.message.trim(),
        '',
        '— Sent from the ITCAN website',
      ].filter(v => v !== null).join('\n');
      const doneTo = $('#doneTo');
      doneTo.textContent = to;
      doneTo.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lastBody)}`;
      $('#donePreview').textContent = `To: ${to}\nSubject: ${subject}\n\n${lastBody}`;
      done.hidden = false;
      window.location.href = doneTo.href;
    });
    $('#copyBrief').addEventListener('click', async () => {
      const text = $('#donePreview').textContent;
      const btn = $('#copyBrief');
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied';
      } catch {
        const r = document.createRange(); r.selectNodeContents($('#donePreview'));
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        btn.textContent = 'Selected, press Ctrl/Cmd + C';
      }
      setTimeout(() => { btn.textContent = 'Copy brief'; }, 2200);
    });
    $('#newBrief').addEventListener('click', () => { form.reset(); done.hidden = true; form.elements.name.focus(); });
  }
})();
