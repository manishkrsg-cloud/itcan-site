/* ITCAN site — interactions. No dependencies. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
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

  /* ---------- reveal on scroll ---------- */
  const revealAll = () => $$('.reveal').forEach(el => el.classList.add('is-in'));
  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealAll();
  } else {
    const rio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const sibs = $$('.reveal', e.target.parentElement);
          const i = Math.max(0, sibs.indexOf(e.target));
          e.target.style.transitionDelay = Math.min(i * 60, 360) + 'ms';
          e.target.classList.add('is-in');
          rio.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    $$('.reveal').forEach(el => rio.observe(el));
    // safety net: never leave content hidden
    setTimeout(() => $$('.reveal:not(.is-in)').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) el.classList.add('is-in');
    }), 2500);
  }

  /* ---------- typed chip ---------- */
  const typed = $('#typed');
  if (typed && !reduceMotion) {
    const full = typed.dataset.text;
    let i = 0;
    typed.textContent = '';
    const tick = () => {
      typed.textContent = full.slice(0, ++i);
      if (i < full.length) setTimeout(tick, 38 + Math.random() * 40);
    };
    setTimeout(tick, 500);
  }

  /* ---------- hero canvas: dot field with cursor glow ---------- */
  const canvas = $('#heroCanvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, dots = [], mouse = { x: -9999, y: -9999 }, raf = 0, visible = true, t0 = performance.now();
    const GAP = 26;
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
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        const dx = d.x - mouse.x, dy = d.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const near = Math.max(0, 1 - dist / 220);
        const wave = 0.5 + 0.5 * Math.sin(t * 0.8 + d.x * 0.012 + d.y * 0.008 + d.s * 6);
        const fadeY = Math.min(1, (h - d.y) / 180);
        const a = (0.07 + wave * 0.09 + near * 0.55) * Math.max(0, fadeY);
        if (a < 0.02) continue;
        ctx.fillStyle = near > 0.05 ? `rgba(255, ${Math.round(110 - near * 60)}, ${Math.round(120 - near * 50)}, ${a})` : `rgba(210, 216, 232, ${a})`;
        const r = 0.8 + near * 1.1;
        ctx.fillRect(d.x - r / 2, d.y - r / 2, r, r);
      }
      if (!reduceMotion && visible) raf = requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener('resize', () => { resize(); if (reduceMotion) draw(performance.now()); });
    const hero = canvas.parentElement;
    hero.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        cancelAnimationFrame(raf);
        if (visible) raf = requestAnimationFrame(draw);
      }).observe(hero);
    }
    raf = requestAnimationFrame(draw);
  }

  /* ---------- hero flow panel: scale to fit + tilt on pointer ---------- */
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
  if (flowWrap && flowTilt) {
    if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
      const base = { y: -16, x: 7 };
      flowWrap.closest('.hero').addEventListener('pointermove', e => {
        const r = flowWrap.getBoundingClientRect();
        const px = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        const py = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        flowTilt.style.transform = `rotateY(${base.y + px * 10}deg) rotateX(${base.x - py * 8}deg) rotateZ(-1deg)`;
      });
      flowWrap.closest('.hero').addEventListener('pointerleave', () => { flowTilt.style.transform = ''; });
    }
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
  ].filter(c => c.el && c.tz);
  const updateClocks = () => {
    const now = new Date();
    clockTargets.forEach(c => {
      const f = fmt(c.tz, c.s);
      if (f) {
        const txt = f.format(now);
        c.el.textContent = c.s ? txt : txt + ' local';
        c.el.setAttribute('datetime', now.toISOString());
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
    if (reduceMotion) { el.textContent = end.toLocaleString('en-US') + suffix; return; }
    const dur = 1400, start = performance.now();
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

  /* ---------- how we work: auto-cycle active step ---------- */
  const steps = $$('#steps .step');
  if (steps.length && !reduceMotion) {
    let active = 0, timer = null;
    const setActive = i => steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
    const start = () => { if (!timer) timer = setInterval(() => { active = (active + 1) % steps.length; setActive(active); }, 2600); };
    const stop = () => { clearInterval(timer); timer = null; };
    steps.forEach((s, i) => s.addEventListener('pointerenter', () => { stop(); active = i; setActive(i); }));
    $('#steps').addEventListener('pointerleave', start);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe($('#steps'));
    } else start();
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
  const CAT = { e50: 'Enterprise 50', brand: 'Brand & leadership', ent: 'Entrepreneurship', exc: 'Excellence' };
  let awards = [];
  let shown = [];
  let lbIndex = 0;

  const imgFor = (a, small) => `/awards/${a.slug}${small ? '-sm' : ''}.jpg`;

  const render = filter => {
    shown = filter === 'all' ? awards : awards.filter(a => a.cat === filter);
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    shown.forEach((a, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'award' + (i === 0 ? ' feature' : '') + (a.h > a.w ? ' portrait' : '');
      b.style.animationDelay = Math.min(i * 30, 420) + 'ms';
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
  filterBtns.forEach(btn => btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.setAttribute('aria-selected', String(b === btn)));
    render(btn.dataset.filter);
  }));

  fetch('/data/awards.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(list => { awards = list.sort((a, b) => b.year - a.year); render('all'); })
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
