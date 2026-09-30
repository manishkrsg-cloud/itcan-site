// Team Builder: pick roles and terms, watch the team gather, send the brief by email.
import { reduced } from "../core/engine.js";
import { onView } from "../core/seen.js";

const TO = "sales@itcan.biz";
const FAM = [[236, 240, 250], [255, 51, 64], [98, 128, 255], [255, 206, 178]];
const MAX_ROLE = 20;
const FAM_NAME = ["Consulting", "Management", "Engineering", "Data, QA, support"];

export function initBuilder() {
  const form = document.querySelector("[data-builder]");
  if (!form) return;
  const rows = Array.from(form.querySelectorAll("[data-role]")).map((li) => ({
    li, id: li.dataset.role, fam: +li.dataset.fam, name: li.querySelector(".role-name").textContent.trim(),
    out: li.querySelector("output"), dec: li.querySelector("[data-dec]"), inc: li.querySelector("[data-inc]"), n: 0,
  }));
  const total = form.querySelector("[data-total]"), word = form.querySelector("[data-total-word]");
  const sum = form.querySelector("[data-sum]"), empty = form.querySelector("[data-empty]");
  const err = form.querySelector("[data-error]"), note = form.querySelector("[data-note]");
  const shows = Array.from(form.querySelectorAll("[data-show]"));
  const team = createTeam(form.querySelector("[data-team]"));

  const val = (name) => { const el = form.querySelector(`[name="${name}"]:checked`) || form.elements[name]; return el ? String(el.value || "").trim() : ""; };
  const count = () => rows.reduce((a, r) => a + r.n, 0);

  function render() {
    const n = count();
    total.textContent = String(n);
    word.textContent = n === 1 ? "person" : "people";
    empty.classList.toggle("is-off", n > 0);
    rows.forEach((r) => { r.out.textContent = String(r.n); r.li.classList.toggle("has", r.n > 0); r.dec.disabled = r.n === 0; r.inc.disabled = r.n >= MAX_ROLE; });
    sum.innerHTML = rows.filter((r) => r.n > 0).map((r) => `<li data-fam="${r.fam}"><span><i></i>${r.name}</span><b>${r.n}</b></li>`).join("");
    shows.forEach((d) => { d.textContent = val(d.dataset.show); });
    team.set(rows.flatMap((r) => Array.from({ length: r.n }, (_, k) => ({ key: `${r.id}-${k}`, fam: r.fam }))));
  }

  rows.forEach((r) => {
    r.inc.addEventListener("click", () => { if (r.n < MAX_ROLE) { r.n++; render(); hideError(); } });
    r.dec.addEventListener("click", () => { if (r.n > 0) { r.n--; render(); } });
  });
  form.addEventListener("change", (e) => { if (e.target.type === "radio") render(); });
  form.addEventListener("input", (e) => { if (e.target.getAttribute("aria-invalid")) e.target.removeAttribute("aria-invalid"); });

  function brief() {
    const n = count();
    const lines = ["Hello ITCAN sales team,", "", "I'd like to put a team together.", ""];
    if (n) { lines.push(`Team (${n} ${n === 1 ? "person" : "people"}):`); rows.filter((r) => r.n).forEach((r) => lines.push(`- ${r.n} x ${r.name}`)); lines.push(""); }
    lines.push(`How we'd like to work: ${val("model")}`, `Where: ${val("where")}`, `When: ${val("when")}`);
    const note = val("note");
    if (note) lines.push("", "More about the work:", note);
    lines.push("", `Name: ${val("name")}`, `Email: ${val("email")}`);
    if (val("company")) lines.push(`Company: ${val("company")}`);
    if (val("country")) lines.push(`Country: ${val("country")}`);
    lines.push("", "Sent from the Team Builder on itcan.biz");
    return lines.join("\n");
  }
  function subject() {
    const n = count(), c = val("company");
    return `Team brief: ${n ? `${n} ${n === 1 ? "person" : "people"}, ` : ""}${val("model")}${c ? ` (${c})` : ""}`;
  }

  function hideError() { err.hidden = true; err.textContent = ""; }
  function check() {
    const bad = [];
    const name = form.elements.name, email = form.elements.email;
    if (!name.value.trim()) bad.push([name, "your name"]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) bad.push([email, "a work email"]);
    form.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
    const needs = [];
    if (!count() && !val("note")) needs.push("at least one role, or a line about the work");
    bad.forEach(([el]) => el.setAttribute("aria-invalid", "true"));
    const parts = [...needs, ...bad.map((b) => b[1])];
    if (!parts.length) { hideError(); return true; }
    err.textContent = `Please add ${parts.join(", ").replace(/, ([^,]*)$/, " and $1")}.`;
    err.hidden = false;
    (bad[0] ? bad[0][0] : rows[0].inc).focus({ preventScroll: false });
    return false;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!check()) return;
    const href = `mailto:${TO}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(brief())}`;
    window.location.href = href;
    note.textContent = `Your email app should open now. If it did not, copy the brief and send it to ${TO}.`;
    note.classList.add("is-ok");
    form.dataset.sent = "1";
  });
  form.querySelector("[data-copy]").addEventListener("click", async () => {
    const text = `To: ${TO}\nSubject: ${subject()}\n\n${brief()}`;
    try { await navigator.clipboard.writeText(text); note.textContent = `Brief copied. Paste it into an email to ${TO}.`; }
    catch (e2) { note.textContent = `Copy did not work in this browser. Please email ${TO}.`; }
    note.classList.add("is-ok");
  });

  render();
  const stage = form.querySelector(".tb-stage");
  onView(stage, (hit) => (hit ? team.start() : team.stop()));
}

// The team canvas: one glowing dot per person, grouped by role family.
function createTeam(canvas) {
  const ctx = canvas.getContext("2d");
  let w = 1, h = 1, dpr = 1, raf = 0, on = false;
  let dots = new Map();
  const sprites = FAM.map(([r, g, b]) => {
    const c = document.createElement("canvas"); c.width = c.height = 48;
    const x = c.getContext("2d"), gr = x.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.16, `rgba(${r},${g},${b},1)`); gr.addColorStop(0.4, `rgba(${r},${g},${b},0.35)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 48, 48);
    return c;
  });
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1); w = Math.max(1, r.width); h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    layout(); draw(performance.now());
  };
  new ResizeObserver(resize).observe(canvas);

  let order = [], tags = [];
  function layout() {
    const n = order.length;
    if (!n) return;
    // one small cluster per role family, side by side
    const fams = [...new Set(order.map((d) => d.fam))];
    const cellW = w / fams.length;
    const counts = fams.map((f) => order.filter((d) => d.fam === f).length);
    let sp = 24;
    counts.forEach((c) => { sp = Math.min(sp, (Math.min(cellW, h) * 0.4) / (0.62 * Math.sqrt(c))); });
    sp = Math.max(7, sp);
    tags = [];
    fams.forEach((f, i) => {
      const cx = cellW * (i + 0.5), cy = h / 2 - 8;
      const rMax = sp * 0.62 * Math.sqrt(Math.max(...counts)) + 10;
      tags.push({ x: cx, y: Math.min(h - 12, cy + rMax + 14), text: FAM_NAME[f] });
      order.filter((d) => d.fam === f).forEach((d, j) => {
        const r = sp * 0.62 * Math.sqrt(j + 0.5), th = j * 2.399963;
        d.tx = cx + Math.cos(th) * r; d.ty = cy + Math.sin(th) * r;
        d.size = Math.max(12, Math.min(34, sp * 1.45));
      });
    });
  }
  function set(list) {
    const next = new Map();
    list.forEach((p) => {
      const d = dots.get(p.key) || { x: w / 2, y: h / 2, vx: 0, vy: 0, s: 0, fam: p.fam, born: performance.now() };
      d.gone = false; next.set(p.key, d);
    });
    dots.forEach((d, k) => { if (!next.has(k)) { d.gone = true; next.set(k, d); } });
    dots = next;
    // families together, first to last
    order = list.map((p) => dots.get(p.key)).sort((a, b) => a.fam - b.fam);
    layout();
    if (reduced || !on) { dots.forEach((d, k) => { if (d.gone) dots.delete(k); else { d.x = d.tx; d.y = d.ty; d.s = 1; } }); draw(performance.now()); }
  }
  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    dots.forEach((d, k) => {
      if (!reduced && on) {
        const tx = d.gone ? d.x : d.tx, ty = d.gone ? d.y : d.ty;
        d.vx = (d.vx + (tx - d.x) * 0.09) * 0.72; d.vy = (d.vy + (ty - d.y) * 0.09) * 0.72;
        d.x += d.vx; d.y += d.vy;
        d.s += ((d.gone ? 0 : 1) - d.s) * 0.16;
        if (d.gone && d.s < 0.02) { dots.delete(k); return; }
      }
      const bob = reduced ? 0 : Math.sin(t / 900 + d.born) * 1.2;
      const sz = (d.size || 22) * d.s;
      ctx.globalAlpha = Math.min(1, d.s);
      ctx.drawImage(sprites[d.fam], d.x - sz / 2, d.y + bob - sz / 2, sz, sz);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (dots.size) {
      ctx.font = `500 ${w < 360 ? 10 : 11}px Geist, system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "rgba(170,176,190,0.9)";
      tags.forEach((t) => ctx.fillText(t.text, t.x, t.y));
    }
  }
  const loop = (t) => { draw(t); if (on) raf = requestAnimationFrame(loop); };
  return {
    set,
    start() { if (on || reduced) { draw(performance.now()); return; } on = true; raf = requestAnimationFrame(loop); },
    stop() { on = false; cancelAnimationFrame(raf); },
  };
}
