/* PM-TI pitch — all interaction, scroll scenes and live figures.
   Data: window.PMTI_DATA (assets/data.js), exported from the thesis FEM model
   and the bench records by export_pitch_data.m — the same pipeline as the
   thesis figures.                                        H. Keshtkar, 2026 */
(function () {
'use strict';

const D = window.PMTI_DATA;
const G = D.grid;                       // E1y, E2y on NG x NG, row = y, col = x
const R = G.R, NG = G.NG, SC = G.scale;
const F1 = 2000, F2 = 2010, DF = 10, FC = 2005;
const KCOL = { 1: '--k1', 2: '--k2', 3: '--k3' };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* ------------------------------------------------------------------ theme */
const themeBtn = $('#themeBtn');
themeBtn.addEventListener('click', () => {
  const ink = !document.documentElement.classList.contains('ink');
  document.documentElement.classList.toggle('ink', ink);
  try { localStorage.setItem('hkk-theme', ink ? 'ink' : 'paper'); } catch (e) {}
  invalidateAll();
});

/* --------------------------------------------------------- field helpers */
// bilinear sample of a grid at (x, y) in mm; null outside the phantom
function sample(Z, x, y) {
  const fx = (x + R) / (2 * R) * (NG - 1), fy = (y + R) / (2 * R) * (NG - 1);
  const j = Math.floor(fx), i = Math.floor(fy);
  if (j < 0 || i < 0 || j >= NG - 1 || i >= NG - 1) return null;
  const tx = fx - j, ty = fy - i;
  const z00 = Z[i][j], z01 = Z[i][j + 1], z10 = Z[i + 1][j], z11 = Z[i + 1][j + 1];
  if (z00 == null || z01 == null || z10 == null || z11 == null) {
    // near the rim: fall back to the nearest finite node
    const c = [z00, z01, z10, z11].filter(v => v != null);
    return c.length ? c[0] * SC : null;
  }
  return (z00 * (1 - tx) * (1 - ty) + z01 * tx * (1 - ty) + z10 * (1 - tx) * ty + z11 * tx * ty) * SC;
}
const E1 = (x, y) => sample(G.E1y, x, y);
const E2 = (x, y) => sample(G.E2y, x, y);

// envelope modulation amplitude  |E_AM| = | sqrt(k^2 (a-b)^2 + 4ab) - k|a-b| |
function envK(a, b, k) {
  const d = a - b;
  return Math.abs(Math.sqrt(Math.max(k * k * d * d + 4 * a * b, 0)) - k * Math.abs(d));
}
// instantaneous envelope  sqrt(k^2 (a-b)^2 + 4ab cos^2(pi df t))
function envT(a, b, k, t) {
  const c = Math.cos(Math.PI * DF * t);
  return Math.sqrt(Math.max(k * k * (a - b) * (a - b) + 4 * a * b * c * c, 0));
}
// phi(t) = acos(cos(pi df t)/k), unwrapped so it keeps rising (k = 1 -> pi df t)
function pmPhase(t, k) {
  const th = Math.PI * DF * t;
  const r = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const p0 = Math.acos(clamp(Math.cos(r) / k, -1, 1));
  return r > Math.PI ? th - r + 2 * Math.PI - p0 : th - r + p0;
}
function sumT(a, b, k, t) {
  const ph = pmPhase(t, k), w = 2 * Math.PI * FC * t;
  return k * a * Math.cos(w - ph) + k * b * Math.cos(w + ph);
}

// colour scale is locked to the k = 1 peak of |E_AM,y|
let CL = 0;
for (let i = 0; i < NG; i++) for (let j = 0; j < NG; j++) {
  const a = G.E1y[i][j], b = G.E2y[i][j];
  if (a == null || b == null) continue;
  CL = Math.max(CL, envK(a * SC, b * SC, 1));
}

// profile along y = 0 and its FWHM
function profile(k, n) {
  n = n || 701;
  const xs = new Float64Array(n), vs = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = -R + 2 * R * i / (n - 1);
    const a = E1(x, 0), b = E2(x, 0);
    xs[i] = x; vs[i] = (a == null || b == null) ? 0 : envK(a, b, k);
  }
  return { xs, vs };
}
function fwhm(k) {
  const { xs, vs } = profile(k, 1401);
  let pk = 0; for (const v of vs) pk = Math.max(pk, v);
  let lo = -1, hi = -1;
  for (let i = 0; i < xs.length; i++) if (vs[i] >= pk / 2) { if (lo < 0) lo = i; hi = i; }
  return { w: xs[hi] - xs[lo], pk, lo: xs[lo], hi: xs[hi] };
}

/* ------------------------------------------------------------- colormap */
const MAGMA = ['#000004', '#180F3E', '#451077', '#721F81', '#9F2F7F', '#CD4071', '#F1605D', '#FD9567', '#FEC98D', '#FCFDBF']
  .map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const LUT = new Uint8ClampedArray(256 * 3);
for (let i = 0; i < 256; i++) {
  const f = i / 255 * (MAGMA.length - 1), j = Math.min(MAGMA.length - 2, Math.floor(f)), t = f - j;
  for (let c = 0; c < 3; c++) LUT[i * 3 + c] = MAGMA[j][c] + (MAGMA[j + 1][c] - MAGMA[j][c]) * t;
}
const magmaCss = (v) => { const i = clamp(Math.round(v * 255), 0, 255) * 3; return `rgb(${LUT[i]},${LUT[i + 1]},${LUT[i + 2]})`; };

/* ------------------------------------------------------------ map images */
const offCache = new Map();          // k (rounded to 0.01) -> offscreen NG x NG canvas
function fieldImage(k) {
  const key = Math.round(k * 100);
  if (offCache.has(key)) return offCache.get(key);
  const c = document.createElement('canvas'); c.width = NG; c.height = NG;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(NG, NG); const p = img.data;
  for (let i = 0; i < NG; i++) for (let j = 0; j < NG; j++) {
    const a = G.E1y[i][j], b = G.E2y[i][j];
    const o = ((NG - 1 - i) * NG + j) * 4;             // row 0 (y = -R) at the bottom
    if (a == null || b == null) { p[o + 3] = 0; continue; }
    const v = clamp(envK(a * SC, b * SC, k) / CL, 0, 1);
    const li = Math.round(v * 255) * 3;
    p[o] = LUT[li]; p[o + 1] = LUT[li + 1]; p[o + 2] = LUT[li + 2]; p[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  offCache.set(key, c);
  return c;
}

// draw the phantom: field image, rim, electrodes.  geometry: centre S/2, radius 0.40 S
function drawPhantom(cv, k, opts) {
  opts = opts || {};
  const S = cv.width, ctx = cv.getContext('2d');
  const cx = S / 2, cy = S / 2, r = S * 0.40;
  ctx.clearRect(0, 0, S, S);
  const img = opts.image || fieldImage(k);
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // the image spans the square [-R, R]^2 -> bounding box of the circle
  ctx.drawImage(img, cx - r, cy - r, 2 * r, 2 * r);
  ctx.restore();
  // rim
  ctx.lineWidth = Math.max(1.5, S * 0.006); ctx.strokeStyle = css('--fg'); ctx.globalAlpha = .55;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  // electrodes: pair 1 grey/blue at +/-168.5 deg, pair 2 at +/-11.5 deg
  const el = (deg, col) => {
    const a = deg * Math.PI / 180; ctx.strokeStyle = col; ctx.lineWidth = S * 0.02; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx + r * 1.04 * Math.cos(a), cy - r * 1.04 * Math.sin(a));
    ctx.lineTo(cx + r * 1.13 * Math.cos(a), cy - r * 1.13 * Math.sin(a)); ctx.stroke();
  };
  el(168.5, css('--e1')); el(-168.5, css('--e1')); el(11.5, css('--e2')); el(-11.5, css('--e2'));
  return { cx, cy, r, ctx };
}
const mm2px = (geo, x, y) => [geo.cx + x / R * geo.r, geo.cy - y / R * geo.r];

// measured 7x7 pixel map (normalised to `norm`)
function drawPixelMap(cv, m, norm) {
  const S = cv.width, ctx = cv.getContext('2d');
  const cx = S / 2, cy = S / 2, r = S * 0.40, cell = 10 / R * r;
  ctx.clearRect(0, 0, S, S);
  for (let ix = 0; ix < 7; ix++) for (let iy = 0; iy < 7; iy++) {
    const v = m.EAMy[ix][iy]; if (v == null) continue;
    const x = -30 + 10 * ix, y = -30 + 10 * iy;
    ctx.fillStyle = magmaCss(v / norm);
    ctx.fillRect(cx + (x - 5) / R * r, cy - (y + 5) / R * r, cell + .5, cell + .5);
  }
  ctx.lineWidth = Math.max(1.5, S * 0.006); ctx.strokeStyle = css('--fg'); ctx.globalAlpha = .55;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  const el = (deg, col) => {
    const a = deg * Math.PI / 180; ctx.strokeStyle = col; ctx.lineWidth = S * 0.02; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx + r * 1.04 * Math.cos(a), cy - r * 1.04 * Math.sin(a));
    ctx.lineTo(cx + r * 1.13 * Math.cos(a), cy - r * 1.13 * Math.sin(a)); ctx.stroke();
  };
  el(168.5, css('--e1')); el(-168.5, css('--e1')); el(11.5, css('--e2')); el(-11.5, css('--e2'));
}

/* ------------------------------------------------- responsive scope canvas */
function fitCanvas(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth || cv.parentElement.clientWidth, h = cv.clientHeight || cv.parentElement.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}
function gridLines(ctx, w, h, x0, y0, x1, y1) {
  ctx.strokeStyle = css('--fg'); ctx.globalAlpha = .08; ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) { const x = x0 + (x1 - x0) * i / 4; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
  for (let i = 1; i < 4; i++) { const y = y0 + (y1 - y0) * i / 4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
  ctx.globalAlpha = .25; ctx.beginPath(); ctx.moveTo(x0, (y0 + y1) / 2); ctx.lineTo(x1, (y0 + y1) / 2); ctx.stroke(); ctx.globalAlpha = 1;
}
// sum band + envelope of  k a cos(wt - phi) + k b cos(wt + phi)  over `T` seconds
function drawBeat(ctx, w, h, a, b, k, T, opts) {
  opts = opts || {};
  const pad = { l: opts.axis ? 40 : 10, r: 10, t: 30, b: 12 };
  const x0 = pad.l, x1 = w - pad.r, y0 = pad.t, y1 = h - pad.b, ym = (y0 + y1) / 2;
  const amp = opts.scale || Math.max(envT(a, b, k, 0), envT(a, b, k, 1 / (2 * DF)), 1e-9);
  const sy = (y1 - y0) / 2 / amp * 0.92;
  gridLines(ctx, w, h, x0, y0, x1, y1);
  if (opts.axis) {              // V/m ticks: a 1-2-5 step chosen so there are at most two ticks per half
    const raw = amp / 2, e = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / e;
    const step = (m >= 5 ? 5 : m >= 2 ? 2 : 1) * e, dec = Math.max(0, -Math.floor(Math.log10(step)));
    ctx.font = '10px "IBM Plex Mono", monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = -2; i <= 2; i++) {
      const v = i * step; if (Math.abs(v) > amp * 1.0001) continue;
      const y = ym - v * sy;
      ctx.strokeStyle = css('--fg'); ctx.globalAlpha = .18; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 - 4, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.fillStyle = css('--fg'); ctx.globalAlpha = .6; ctx.fillText(i ? v.toFixed(dec) : '0', x0 - 7, y);
    }
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
  }
  const upto = opts.upto == null ? 1 : opts.upto;
  const xe = x0 + (x1 - x0) * upto;
  const ecol = opts.envColor || css('--sig');
  // soft fill between +env and -env
  ctx.fillStyle = ecol; ctx.globalAlpha = .13; ctx.beginPath();
  { const m = Math.round(xe - x0);
    for (let i = 0; i <= m; i++) { const x = x0 + i, t = (x - x0) / (x1 - x0) * T, v = envT(a, b, k, t); i ? ctx.lineTo(x, ym - v * sy) : ctx.moveTo(x, ym - v * sy); }
    for (let i = m; i >= 0; i--) { const x = x0 + i, t = (x - x0) / (x1 - x0) * T, v = envT(a, b, k, t); ctx.lineTo(x, ym + v * sy); }
    ctx.closePath(); ctx.fill(); }
  // carrier (aliased on purpose: it is ~400 cycles wide — reads as a dense band)
  const col = opts.color || ecol;
  ctx.lineWidth = .6; ctx.strokeStyle = col; ctx.globalAlpha = .38; ctx.beginPath();
  const n = Math.round((xe - x0) * 4);
  for (let i = 0; i <= n; i++) {
    const x = x0 + (xe - x0) * i / n, t = (x - x0) / (x1 - x0) * T, v = sumT(a, b, k, t);
    i ? ctx.lineTo(x, ym - v * sy) : ctx.moveTo(x, ym - v * sy);
  }
  ctx.stroke(); ctx.globalAlpha = 1;
  // envelope
  ctx.lineWidth = 2.2; ctx.strokeStyle = ecol;
  for (const s of [1, -1]) {
    ctx.beginPath();
    const m = Math.round(xe - x0);
    for (let i = 0; i <= m; i++) {
      const x = x0 + i, t = (x - x0) / (x1 - x0) * T, v = envT(a, b, k, t) * s;
      i ? ctx.lineTo(x, ym - v * sy) : ctx.moveTo(x, ym - v * sy);
    }
    ctx.stroke();
  }
  if (opts.cursor) { ctx.strokeStyle = css('--fg'); ctx.globalAlpha = .5; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xe, y0); ctx.lineTo(xe, y1); ctx.stroke(); ctx.globalAlpha = 1; }
  return { x0, x1, y0, y1, ym, sy };
}

/* ------------------------------------------------------ animation registry */
const anims = [];                 // {el, draw(t), visible}
const io = new IntersectionObserver((es) => es.forEach(e => { const a = anims.find(x => x.el === e.target); if (a) a.visible = e.isIntersecting; }), { rootMargin: '80px' });
function register(el, draw) { const a = { el, draw, visible: false, dirty: true }; anims.push(a); io.observe(el); return a; }
let t0 = performance.now();
function loop(now) {
  const t = (now - t0) / 1000;
  for (const a of anims) if (a.visible || a.dirty) { a.draw(t); a.dirty = false; }
  requestAnimationFrame(loop);
}
function invalidateAll() { for (const a of anims) a.dirty = true; staticDraws.forEach(f => f()); }
const staticDraws = [];
window.addEventListener('resize', () => { invalidateAll(); buildSteps(); reveal(); });

/* ------------------------------------------------------------ reveal + nav */
// reveal on scroll: a plain viewport test on every scroll frame (an IntersectionObserver never fired
// for the clip-path wiped photos in Chromium, so the reveal is driven from the scroll handler instead)
let pending = $$('.rv');
function reveal() {
  if (!pending.length) return;
  const vh = innerHeight;
  pending = pending.filter(el => {
    const r = el.getBoundingClientRect();
    if (r.top < vh * .88 && r.bottom > vh * .02) { el.classList.add('in'); return false; }
    return true;
  });
}

// counters
const cIO = new IntersectionObserver((es) => es.forEach(e => {
  if (!e.isIntersecting) return; cIO.unobserve(e.target);
  const el = e.target, target = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, T = 1400, s = performance.now();
  const step = (n) => { const p = clamp((n - s) / T, 0, 1), v = target * (1 - Math.pow(1 - p, 3)); el.textContent = v.toFixed(dec); if (p < 1) requestAnimationFrame(step); };
  reduced ? (el.textContent = target.toFixed(dec)) : requestAnimationFrame(step);
}), { threshold: .6 });
$$('[data-count]').forEach(el => cIO.observe(el));

// story rail: which link of the problem -> solution chain is on screen
const rail = $('#rail'), railLinks = $$('#rail a'), railOrder = railLinks.map(a => a.dataset.s);
const stageEls = $$('section[data-stage], .pinwrap[data-stage]');
function updateRail() {
  const mid = scrollY + innerHeight * .5;
  let el = null; stageEls.forEach(e => { if (e.offsetTop <= mid) el = e; });
  let st = el ? el.dataset.stage : null;
  if (el && el.classList.contains('pinwrap')) { const on = $('.st.on', el); if (on && on.dataset.stage) st = on.dataset.stage; }
  const idx = st === 'end' ? railOrder.length : railOrder.indexOf(st);
  rail.classList.toggle('show', !!st);
  railLinks.forEach((a, i) => { a.classList.toggle('on', i === idx); a.classList.toggle('past', i < idx); });
}
railLinks.forEach(a => a.addEventListener('click', (e) => {
  if (!a.dataset.at) return;               // a step inside a pinned scene
  e.preventDefault(); const w = $(a.getAttribute('href'));
  scrollTo({ top: w.offsetTop + parseFloat(a.dataset.at) * (w.offsetHeight - innerHeight) + 2, behavior: reduced ? 'auto' : 'smooth' });
}));

// progress bar + active nav
const navLinks = $$('#nav a');
const navTargets = navLinks.map(a => $(a.getAttribute('href')));
function onScroll() {
  const sh = document.documentElement.scrollHeight - innerHeight;
  $('#progress').style.width = (100 * clamp(scrollY / sh, 0, 1)) + '%';
  let act = 0;
  navTargets.forEach((el, i) => { if (el && el.offsetTop - innerHeight * .5 <= scrollY) act = i; });
  navLinks.forEach((a, i) => a.classList.toggle('active', i === act));
  scenes.forEach(s => s.update());
  updateRail();
  reveal();
}
let ticking = false;
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });

// keyboard: -> / space / PageDown next step, <- / PageUp previous
let steps = [];
function buildSteps() {
  steps = [];
  $$('[data-step]').forEach(el => steps.push(el.offsetTop));
  $$('.pinwrap[data-scene]').forEach(w => (w.dataset.steps || '0').split(',').map(Number).forEach(f => steps.push(w.offsetTop + f * (w.offsetHeight - innerHeight))));
  steps.sort((a, b) => a - b);
}
buildSteps(); setTimeout(buildSteps, 600);
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input,textarea,button')) return;
  const fwd = ['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(e.key), back = ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key);
  if (!fwd && !back) return;
  e.preventDefault(); buildSteps();
  const y = scrollY;
  let target;
  if (fwd) target = steps.find(s => s > y + 4); else target = [...steps].reverse().find(s => s < y - 4);
  if (target != null) scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
});

/* -------------------------------------------------- auto-played sliders */
// A range input that plays by itself (period s, value = fn(phase 0..1)) while `wrap` is on screen.
// Dragging it hands control to the user; the little "auto" button hands it back.
function autoRange(input, btn, wrap, period, fn, onValue) {
  let auto = !reduced, t0 = null;
  const setAuto = (on) => { auto = on; btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on); if (on) t0 = null; };
  input.addEventListener('pointerdown', () => setAuto(false));
  input.addEventListener('input', () => { if (auto) setAuto(false); onValue(parseFloat(input.value)); });
  btn.addEventListener('click', () => setAuto(!auto));
  const an = register(wrap, (t) => {
    if (!auto || !an.visible) return;
    if (t0 == null) { // start from the slider's current value so nothing jumps
      const v0 = parseFloat(input.value); let best = 0, err = 1e9;
      for (let ph = 0; ph < 1; ph += .002) { const e = Math.abs(fn(ph) - v0); if (e < err) { err = e; best = ph; } }
      t0 = t - best * period;
    }
    const v = fn(((t - t0) / period) % 1);
    input.value = v; onValue(v);
  });
  setAuto(auto);
}

/* ------------------------------------------------------ pinned scenes */
const scenes = [];
function prepDraw(root) {
  $$('.draw', root).forEach(p => { try { const L = p.getTotalLength ? p.getTotalLength() : 1000; p.style.setProperty('--len', L); } catch (e) {} });
}
function setDraw(el, p) { const L = parseFloat(el.style.getPropertyValue('--len')) || 1000; el.style.strokeDashoffset = L * (1 - clamp(p, 0, 1)); }
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);

function makeScene(wrap, fn) {
  const txt = $$('.st', wrap);
  const ats = txt.map(s => parseFloat(s.dataset.at));
  const s = {
    wrap, p: -1,
    update() {
      const p = clamp((scrollY - wrap.offsetTop) / (wrap.offsetHeight - innerHeight), 0, 1);
      if (Math.abs(p - this.p) < 0.0005) return; this.p = p;
      let on = 0; ats.forEach((a, i) => { if (p >= a) on = i; });
      txt.forEach((el, i) => el.classList.toggle('on', i === on));
      fn(p);
    }
  };
  scenes.push(s); return s;
}

// --- DBS scene
{
  const w = $('#dbs'); prepDraw(w);
  const head = $('#headPath'), brain = $('#brainPath'), sul = $('#sulcus'), lead = $('#lead'), sh = $('#shoulders');
  const tRing = $('#tRing'), tDot = $('#tDot'), tLbl = $('#tLbl'), contacts = $('#contacts'), burr = $('#burr'), ipg = $('#ipg'), xray = $('#xray');
  const ipgPath = $('#ipg path');
  makeScene(w, (p) => {
    setDraw(head, seg(p, 0, .16)); setDraw(sh, seg(p, .12, .22)); setDraw(brain, seg(p, .08, .26)); setDraw(sul, seg(p, .2, .3));
    const t = seg(p, .22, .32); tRing.setAttribute('opacity', t); tDot.setAttribute('opacity', t); tLbl.setAttribute('opacity', t);
    setDraw(lead, seg(p, .4, .56)); contacts.setAttribute('opacity', seg(p, .55, .6));
    xray.classList.toggle('on', p >= .46);
    const g = seg(p, .62, .76); setDraw(ipgPath, g); ipg.setAttribute('opacity', g);
    burr.setAttribute('opacity', seg(p, .78, .86));
    tRing.setAttribute('r', 14 + 3 * Math.sin(p * 40));
  });
}
// --- TI scene
{
  const w = $('#ti'); prepDraw(w);
  const hd = $('#tiHead'), sk = $('#tiSkull'), br = $('#tiBrain'), fi = $('#tiFissure');
  const f1 = $$('#f1 path'), f2 = $$('#f2 path'), el1 = $('#el1'), el2 = $('#el2'), hot = $('#hotspot'), beat = $('#tiBeat');
  const sc = makeScene(w, (p) => {
    setDraw(sk, seg(p, 0, .18)); setDraw(hd, seg(p, .14, .2)); setDraw(br, seg(p, .06, .24)); setDraw(fi, seg(p, .18, .28));
    el1.setAttribute('opacity', seg(p, .3, .36)); f1.forEach((q, i) => setDraw(q, seg(p, .32 + i * .03, .48 + i * .03)));
    el2.setAttribute('opacity', seg(p, .42, .48)); f2.forEach((q, i) => setDraw(q, seg(p, .44 + i * .03, .6 + i * .03)));
    hot.setAttribute('opacity', seg(p, .66, .8)); beat.setAttribute('opacity', seg(p, .74, .82));
  });
  // hotspot breathing
  register($('#tiScene'), (t) => { const s = 1 + .07 * Math.sin(2 * Math.PI * 1.2 * t); hot.setAttribute('transform', `scale(${s} ${1 / s * s})`); });
}

/* ------------------------------------------------------------ hero wave */
{
  const cv = $('#heroWave');
  register(cv, (t) => {
    const { ctx, w, h } = fitCanvas(cv);
    ctx.clearRect(0, 0, w, h);
    const ym = h * .43, A = h * .2, n = Math.round(w / 2);
    const sig = css('--sig'), fg = css('--fg');   // plain hex in the stylesheet, so '+ alpha' works
    // two carriers with slightly different frequencies -> travelling beat
    const k1 = 2 * Math.PI * 26 / w, k2 = 2 * Math.PI * 27.2 / w, w1 = 2 * Math.PI * 1.6, w2 = 2 * Math.PI * 1.75;
    const wave = (x) => Math.cos(k1 * x - w1 * t) + Math.cos(k2 * x - w2 * t);
    const env = (x) => 2 * Math.abs(Math.cos(((k1 - k2) * x - (w1 - w2) * t) / 2));
    ctx.lineWidth = 1.2; ctx.strokeStyle = fg; ctx.globalAlpha = .16; ctx.setLineDash([5, 6]);
    for (const s of [1, -1]) { ctx.beginPath(); for (let i = 0; i <= n; i++) { const x = w * i / n; const y = ym - s * env(x) * A / 2; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, sig + '2e'); grad.addColorStop(.5, sig + '40'); grad.addColorStop(.66, sig + 'e6'); grad.addColorStop(1, sig + 'e6');
    ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.lineWidth = 2.2; ctx.strokeStyle = grad; ctx.beginPath();
    for (let i = 0; i <= n * 2; i++) { const x = w * i / (n * 2); const y = ym - wave(x) * A / 2; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.globalAlpha = .3; ctx.lineWidth = 1; ctx.strokeStyle = fg; ctx.beginPath(); ctx.moveTo(0, ym); ctx.lineTo(w, ym); ctx.stroke(); ctx.globalAlpha = 1;
  });
}

/* ------------------------------------------------------- TI scopes (eq) */
{
  const a0 = 1, b0 = 1;      // equal fields at the centre
  const single = (cv, f, col, label) => register(cv, (t) => {
    const { ctx, w, h } = fitCanvas(cv); ctx.clearRect(0, 0, w, h);
    const x0 = 10, x1 = w - 10, y0 = 30, y1 = h - 10, ym = (y0 + y1) / 2, A = (y1 - y0) / 2 * .85;
    gridLines(ctx, w, h, x0, y0, x1, y1);
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
    const T = 6 / F1, n = 300;
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, tt = T * i / n; const v = Math.cos(2 * Math.PI * f * (tt + t * 0.00025)); i ? ctx.lineTo(x, ym - v * A) : ctx.moveTo(x, ym - v * A); }
    ctx.stroke();
  });
  single($('#scE1'), F1, css('--e1')); single($('#scE2'), F2, css('--e2'));
  const sum = $('#scSum');
  register(sum, (t) => {
    const { ctx, w, h } = fitCanvas(sum); ctx.clearRect(0, 0, w, h);
    const upto = reduced ? 1 : Math.min(1, ((t % 3.2) / 2.4));
    drawBeat(ctx, w, h, a0, b0, 1, 2 / DF, { upto, cursor: upto < 1, envColor: css('--sig') });
  });
}

/* -------------------------------------------------- problem 03: wide map */
{
  const cv = $('#mapWide');
  const draw = () => {
    const geo = drawPhantom(cv, 1);
    const f = fwhm(1), ctx = geo.ctx, S = cv.width;
    const [xa, y] = mm2px(geo, f.lo, 0), [xb] = mm2px(geo, f.hi, 0);
    ctx.strokeStyle = css('--paper'); ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.globalAlpha = .9;
    ctx.beginPath(); ctx.moveTo(xa, y - S * .3); ctx.lineTo(xa, y + S * .3); ctx.moveTo(xb, y - S * .3); ctx.lineTo(xb, y + S * .3); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(xa, y + S * .28); ctx.lineTo(xb, y + S * .28); ctx.stroke();
    ctx.fillStyle = css('--paper'); ctx.font = `500 ${S * .034}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center';
    ctx.fillText(`FWHM ≈ ${f.w.toFixed(0)} mm`, (xa + xb) / 2, y + S * .28 + S * .05); ctx.globalAlpha = 1;
  };
  staticDraws.push(draw); draw();
}

/* ------------------------------------------------------- PM-TI: k slider */
{
  const cv = $('#mapK'), rng = $('#kRange'), kv = $('#kVal'), fw = $('#kFwhm');
  let k = 1;
  const draw = () => { drawPhantom(cv, k); kv.textContent = k.toFixed(2); fw.textContent = fwhm(k).w.toFixed(1); };
  staticDraws.push(draw); draw();
  // auto: k sweeps 1 -> 3 -> 1 (8 s) while the slide is on screen; touching the slider hands control over
  autoRange(rng, $('#kAuto'), $('#mapKWrap'), 8, (ph) => 1 + 2 * (ph < .5 ? ease(ph * 2) : 1 - ease((ph - .5) * 2)),
    (v) => { k = Math.round(v * 100) / 100; draw(); });
  // penalty scope: envelope at one off-centre point, three k
  const sc = $('#scPen'), imb = $('#imbRange'), iv = $('#imbVal');
  const drawPen = () => {
    const { ctx, w, h } = fitCanvas(sc); ctx.clearRect(0, 0, w, h);
    const a = 1, b = parseFloat(imb.value); iv.textContent = b.toFixed(2);
    const top = Math.max(envT(a, b, 3, 0), envT(a, b, 3, 1 / (2 * DF)), a + b);
    const x0 = 10, x1 = w - 10, y0 = 30, y1 = h - 12, ym = (y0 + y1) / 2, sy = (y1 - y0) / 2 / top * .92;
    gridLines(ctx, w, h, x0, y0, x1, y1);
    const T = 2 / DF;
    for (const kk of [3, 2, 1]) {
      ctx.strokeStyle = css(KCOL[kk]); ctx.lineWidth = 2.2; ctx.globalAlpha = .95;
      for (const s of [1, -1]) { ctx.beginPath(); for (let i = 0; i <= 300; i++) { const x = x0 + (x1 - x0) * i / 300, v = envT(a, b, kk, T * i / 300) * s; i ? ctx.lineTo(x, ym - v * sy) : ctx.moveTo(x, ym - v * sy); } ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    $('#penR').innerHTML = [1, 2, 3].map(kk => `<b class="k${kk}">k=${kk} · ${envK(a, b, kk).toFixed(2)}</b>`).join('');
  };
  staticDraws.push(drawPen); drawPen();
  // auto: the imbalance E2/E1 breathes 1 -> 0.15 -> 1 (9 s) while on screen
  autoRange(imb, $('#imbAuto'), $('#pmti'), 9, (ph) => 1 - .85 * (.5 - .5 * Math.cos(2 * Math.PI * ph)), drawPen);
}

/* -------------------------------------------------- results: three maps */
{
  const draw = () => { [1, 2, 3].forEach(kk => drawPhantom($('#mapR' + kk), kk)); };
  staticDraws.push(draw); draw();
  const sc = $('#scProf');
  const drawProf = () => {
    const { ctx, w, h } = fitCanvas(sc); ctx.clearRect(0, 0, w, h);
    const x0 = 34, x1 = w - 14, y0 = 32, y1 = h - 26; gridLines(ctx, w, h, x0, y0, x1, y1);
    ctx.fillStyle = css('--fg'); ctx.globalAlpha = .6; ctx.font = '10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
    [-30, -15, 0, 15, 30].forEach(x => ctx.fillText(x, x0 + (x + R) / (2 * R) * (x1 - x0), h - 10));
    ctx.textAlign = 'right'; ctx.fillText('1', x0 - 6, y0 + 4); ctx.fillText('½', x0 - 6, (y0 + y1) / 2 + 4); ctx.fillText('0', x0 - 6, y1 + 3); ctx.globalAlpha = 1;
    ctx.strokeStyle = css('--fg'); ctx.globalAlpha = .35; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(x0, (y0 + y1) / 2); ctx.lineTo(x1, (y0 + y1) / 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    for (const kk of [1, 2, 3]) {
      const { xs, vs } = profile(kk, 401); const pk = fwhm(kk);
      ctx.strokeStyle = css(KCOL[kk]); ctx.lineWidth = 2.4; ctx.beginPath();
      for (let i = 0; i < xs.length; i++) { const x = x0 + (xs[i] + R) / (2 * R) * (x1 - x0), y = y1 - vs[i] / pk.pk * (y1 - y0); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      // half-max bracket
      const ya = (y0 + y1) / 2, xa = x0 + (pk.lo + R) / (2 * R) * (x1 - x0), xb = x0 + (pk.hi + R) / (2 * R) * (x1 - x0);
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, ya); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xa, ya - 6); ctx.lineTo(xa, ya + 6); ctx.moveTo(xb, ya - 6); ctx.lineTo(xb, ya + 6); ctx.stroke();
      ctx.fillStyle = css(KCOL[kk]); ctx.font = '500 11px "IBM Plex Mono", monospace'; ctx.textAlign = 'right';
      ctx.fillText(`${pk.w.toFixed(1)} mm`, x1 - 4, y0 + 4 + (kk - 1) * 14);
    }
  };
  staticDraws.push(drawProf); register(sc, drawProf);
}

/* ------------------------------------------------------------- sweep */
{
  const maps = $$('.swMap'), scs = $$('.swSc'), vals = $$('.swVal'), pcts = $$('.swPct');
  const prof = $('#swProf'), xLbl = $('#swX'), play = $('#swPlay'), centre = $('#swCentre');
  let playing = !reduced, x = 0, tPause = 0, tOff = 0, drag = false;
  const XMAX = 30, PERIOD = 16;             // s for a full there-and-back
  const base = {};                            // rendered maps per k, kept for cheap redraws
  const renderBases = () => { for (const kk of [1, 2, 3]) { const c = document.createElement('canvas'); c.width = c.height = 360; drawPhantom(c, kk); base[kk] = c; } };
  renderBases(); staticDraws.push(renderBases);
  const peak1 = fwhm(1).pk;
  const profiles = { 1: profile(1, 301), 2: profile(2, 301), 3: profile(3, 301) };

  const setX = (nx) => { x = clamp(nx, -XMAX, XMAX); };
  const scrub = (cv, ev, geoFn) => {
    const r = cv.getBoundingClientRect(); const px = (ev.clientX - r.left) / r.width; setX(geoFn(px));
  };
  const mapX = (px) => (px - .5) / .8 * 2 * R;                 // map: circle spans 0.1..0.9 of width
  const profX = (px) => { const x0 = 34 / prof.clientWidth, x1 = 1 - 14 / prof.clientWidth; return -R + (px - x0) / (x1 - x0) * 2 * R; };
  const bindDrag = (cv, fn) => {
    cv.addEventListener('pointerdown', (e) => { drag = true; playing = false; play.textContent = 'Play'; cv.setPointerCapture(e.pointerId); scrub(cv, e, fn); });
    cv.addEventListener('pointermove', (e) => { if (drag) scrub(cv, e, fn); });
    cv.addEventListener('pointerup', () => { drag = false; }); cv.addEventListener('pointercancel', () => { drag = false; });
  };
  maps.forEach(m => bindDrag(m, mapX)); bindDrag(prof, profX);
  play.addEventListener('click', () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; if (playing) tOff = null; });
  centre.addEventListener('click', () => { playing = false; play.textContent = 'Play'; setX(0); });
  let lastT = 0;
  const drawAll = (t) => {
    if (playing) {
      if (tOff == null) { // resume so that the phase matches the current x
        const u = Math.acos(clamp(-x / XMAX, -1, 1)) / (2 * Math.PI); tOff = t - u * PERIOD;
      }
      x = -XMAX * Math.cos(2 * Math.PI * (t - tOff) / PERIOD);
    }
    xLbl.textContent = `x = ${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)} mm`;
    const a = E1(x, 0) || 0, b = E2(x, 0) || 0;
    // adaptive vertical scale per panel: each k is fitted to its own carrier envelope at this x, so the
    // three bands stay the same size and what differs is how deep the beat breathes (its own V/m axis says the rest)
    const scaleK = (kk) => Math.max(envT(a, b, kk, 0), envT(a, b, kk, 1 / (2 * DF)), 1e-9);
    maps.forEach((cv, i) => {
      const kk = i + 1, ctx = cv.getContext('2d'), S = cv.width; ctx.clearRect(0, 0, S, S); ctx.drawImage(base[kk], 0, 0);
      const geo = { cx: S / 2, cy: S / 2, r: S * .4 }; const [px, py] = mm2px(geo, x, 0);
      ctx.strokeStyle = css('--fg'); ctx.globalAlpha = .35; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(geo.cx - geo.r, py); ctx.lineTo(geo.cx + geo.r, py); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, S * .028, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = css('--alert'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, S * .028, 0, Math.PI * 2); ctx.stroke();
    });
    scs.forEach((cv, i) => {
      const kk = i + 1, { ctx, w, h } = fitCanvas(cv); ctx.clearRect(0, 0, w, h);
      drawBeat(ctx, w, h, a, b, kk, 2 / DF, { scale: scaleK(kk), axis: true, envColor: css(KCOL[kk]) });
    });
    [1, 2, 3].forEach((kk, i) => { const e = envK(a, b, kk); vals[i].textContent = e.toFixed(3) + ' V/m'; pcts[i].textContent = Math.round(100 * e / peak1) + ' % of peak'; });
    // profile with marker
    { const { ctx, w, h } = fitCanvas(prof); ctx.clearRect(0, 0, w, h);
      const x0 = 34, x1 = w - 14, y0 = 30, y1 = h - 24; gridLines(ctx, w, h, x0, y0, x1, y1);
      ctx.fillStyle = css('--fg'); ctx.globalAlpha = .6; ctx.font = '10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
      [-30, -15, 0, 15, 30].forEach(v => ctx.fillText(v, x0 + (v + R) / (2 * R) * (x1 - x0), h - 8)); ctx.globalAlpha = 1;
      for (const kk of [1, 2, 3]) {
        const { xs, vs } = profiles[kk]; ctx.strokeStyle = css(KCOL[kk]); ctx.lineWidth = 2.2; ctx.beginPath();
        for (let j = 0; j < xs.length; j++) { const X = x0 + (xs[j] + R) / (2 * R) * (x1 - x0), Y = y1 - vs[j] / peak1 * (y1 - y0); j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke();
      }
      const X = x0 + (x + R) / (2 * R) * (x1 - x0);
      ctx.strokeStyle = css('--alert'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X, y0); ctx.lineTo(X, y1); ctx.stroke();
      for (const kk of [1, 2, 3]) { const Y = y1 - envK(a, b, kk) / peak1 * (y1 - y0); ctx.fillStyle = css(KCOL[kk]); ctx.beginPath(); ctx.arc(X, Y, 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = css('--bg'); ctx.lineWidth = 1.5; ctx.stroke(); }
    }
  };
  register($('#sweep'), drawAll);
}

/* ------------------------------------------------ measurement vs sim */
{
  const draw = () => {
    const normS = CL;                              // simulation: k = 1 peak
    const normM = Math.max(...D.meas[0].EAMy.flat().filter(v => v != null));   // measurement: its own k = 1 peak
    [1, 2, 3].forEach(kk => { drawPhantom($('#mS' + kk), kk); drawPixelMap($('#mM' + kk), D.meas[kk - 1], normM); });
  };
  staticDraws.push(draw); draw();
  const sc = $('#scRaw'), m = D.meas[2];
  const drawRaw = () => {
    const { ctx, w, h } = fitCanvas(sc); ctx.clearRect(0, 0, w, h);
    const v = m.centre.Ey_Vpm, n = v.length; let mx = 0; for (const q of v) mx = Math.max(mx, Math.abs(q));
    const x0 = 10, x1 = w - 10, y0 = 28, y1 = h - 8, ym = (y0 + y1) / 2, sy = (y1 - y0) / 2 / mx * .95;
    ctx.strokeStyle = css('--fg'); ctx.globalAlpha = .2; ctx.beginPath(); ctx.moveTo(x0, ym); ctx.lineTo(x1, ym); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#F2A138'; ctx.lineWidth = .8; ctx.beginPath();
    for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * i / (n - 1); i ? ctx.lineTo(x, ym - v[i] * sy) : ctx.moveTo(x, ym - v[i] * sy); }
    ctx.stroke();
  };
  staticDraws.push(drawRaw); register(sc, drawRaw);
}

/* --------------------------------------------------------------- go */
onScroll(); scenes.forEach(s => { s.p = -1; s.update(); });
window.addEventListener('load', () => { onScroll(); setTimeout(onScroll, 400); });
requestAnimationFrame(loop);
})();
