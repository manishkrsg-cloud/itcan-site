// "Seen" rules shared by every entrance and loop.
//  - entrances: once, when the element is on screen after the page is released
//  - loops: arm when the element crosses the -12% line, disarm when fully off screen

const html = document.documentElement;
let released = !html.hasAttribute("data-preload");
const releaseCbs = [];
export const isReleased = () => released;
export function whenReleased(cb) { if (released) cb(); else releaseCbs.push(cb); }
export function release() {
  if (released) return;
  released = true;
  releaseCbs.splice(0).forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
}

const observers = new Map();
function observer(margin) {
  let o = observers.get(margin);
  if (o) return o;
  const map = new Map();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const list = map.get(e.target);
      if (list) list.slice().forEach((fn) => fn(e.isIntersecting, e));
    }
  }, { rootMargin: margin });
  o = {
    add(el, fn) {
      let l = map.get(el);
      if (!l) { l = []; map.set(el, l); io.observe(el); }
      l.push(fn);
      return () => {
        const i = l.indexOf(fn);
        if (i >= 0) l.splice(i, 1);
        if (!l.length) { map.delete(el); io.unobserve(el); }
      };
    },
  };
  observers.set(margin, o);
  return o;
}

// Fires cb once, the first time el is on screen after release.
export function onSeen(el, cb, margin = "0px 0px 5% 0px") {
  if (!el) return () => {};
  let done = false, off = null;
  const go = () => {
    off = observer(margin).add(el, (hit) => {
      if (!hit || done || !released) return;
      done = true;
      off && off();
      cb();
    });
  };
  whenReleased(go);
  return () => { done = true; off && off(); };
}

// Plain visibility, reported on every change.
export function onView(el, cb, margin = "0px") {
  if (!el) return () => {};
  return observer(margin).add(el, (hit) => cb(hit));
}

// Loop arming: arm on the -12% line, disarm only when fully off screen.
export function watchLoop(el, { arm, disarm }, margin = "0px 0px -12% 0px") {
  if (!el) return () => {};
  let armed = false;
  const offA = observer(margin).add(el, (hit) => {
    if (hit && !armed && released) { armed = true; arm && arm(); }
  });
  const offB = observer("0px").add(el, (hit) => {
    if (!hit && armed) { armed = false; disarm && disarm(); }
  });
  whenReleased(() => {
    const r = el.getBoundingClientRect();
    if (!armed && r.top < innerHeight * 0.88 && r.bottom > 0) { armed = true; arm && arm(); }
  });
  return () => { offA(); offB(); };
}
