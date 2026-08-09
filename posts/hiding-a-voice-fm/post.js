"use strict";
/* ============================================================
   "Hiding a voice inside a wave" — part two, FM.
   Interactive figures. No dependencies, no network. Everything draws to
   <canvas> using the page's three CSS hues so it follows the theme, and
   everything you can hear is synthesised on the spot from the same maths
   the picture is drawn from.
   ============================================================ */

/* ---------------- i18n + canvas text ----------------
   tr() reads a label out of i18n.js, falling back to the key so a missing
   string is loud rather than invisible.

   A <canvas> gets no stylesheet, so the two things CSS does for Persian in
   the page body have to be done by hand here. LBL_FONT keeps the mono face
   in front — it carries the numbers and keeps the axis labels lined up —
   with a Persian face behind it, because a monospace family has no Persian
   glyphs at all and the browser would otherwise pick one that does not join
   the letters up.

   drawLabel() sets ctx.direction from the string itself. Setting the whole
   canvas to 'rtl' would turn a Latin label like "−0.5" into "0.5−": the
   leading sign is bidi-neutral and drifts to the other end. */
function tr(key) {
  try {
    if (typeof window !== 'undefined' && typeof window.t === 'function') return window.t(key);
  } catch (e) {}
  return key;
}
var LBL_FONT = 'ui-monospace, "IBM Plex Mono", Estedad, monospace';
var RTL_RE = /[\u0600-\u06FF]/;
function drawLabel(ctx, text, x, y, maxW) {
  ctx.direction = RTL_RE.test(String(text)) ? 'rtl' : 'ltr';
  if (maxW === undefined) ctx.fillText(text, x, y);
  else ctx.fillText(text, x, y, maxW);
}

/* ---------------- theme toggle (this page only) ---------------- */
(function () {
  var btn = document.getElementById('themeBtn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var ink = document.documentElement.classList.toggle('ink');
    try { localStorage.setItem('hkk-theme', ink ? 'ink' : 'paper'); } catch (e) {}
    PAL = null;
    FIGS.forEach(function (f) { f.redraw(); });
  });
})();

/* ---------------- palette ---------------- */
var PAL = null;
function pal() {
  if (PAL) return PAL;
  var s = getComputedStyle(document.documentElement);
  PAL = {
    fg:  (s.getPropertyValue('--fg') || '#1C1B1A').trim(),
    bg:  (s.getPropertyValue('--bg') || '#F4EFE4').trim(),
    sig: (s.getPropertyValue('--sig') || '#2B59C3').trim()
  };
  return PAL;
}
function rgba(hex, a) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  var n = parseInt(hex, 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
/* Alpha does not mean the same thing in both themes. Light ink at 45% over
   near-black still reads; dark ink at 45% over paper washes out to about
   2.7:1 and the chart labels become unreadable. Lift the faint end in the
   light theme only, and leave anything already strong alone. */
function lift(a) {
  if (document.documentElement.classList.contains('ink')) return a;
  return a < 0.7 ? Math.min(1, a * 1.45 + 0.1) : a;
}
var fgA  = function (a) { return rgba(pal().fg, lift(a)); };
var sigA = function (a) { return rgba(pal().sig, lift(a)); };

/* ---------------- number formatting ---------------- */
function nf(v, p) {
  if (!isFinite(v)) return '∞';
  var s = parseFloat(v.toPrecision(p || 3)).toString();
  return s.replace('-', '−');
}
function fix(v, d) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(d); }
/* frequencies run from a few hertz to tens of kilohertz across these figures */
function hz(v) {
  if (Math.abs(v) >= 1e6) return nf(v / 1e6) + ' MHz';
  if (Math.abs(v) >= 1e3) return nf(v / 1e3) + ' kHz';
  return nf(v) + ' Hz';
}
function db(v, d) { return fix(v, d === undefined ? 1 : d) + ' dB'; }
/* Persian digits, for whatever the figures draw themselves. The English
   edition leaves numbers Latin. */
var FA_DIG = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
function fa(n) {
  if (!document.documentElement.classList.contains('lang-fa')) return String(n);
  return String(n).replace(/[0-9]/g, function (d) { return FA_DIG[+d]; });
}

/* ============================================================
   Figure engine
   ============================================================ */
var FIGS = [];
/* `ar` is width/height — a number, or a function of the width for figures
   whose useful height does not scale with how wide the column happens to be */
function Fig(canvas, ar, draw) {
  var ctx = canvas.getContext('2d');
  var self = { canvas: canvas, ctx: ctx, w: 0, h: 0, state: {}, redraw: redraw };
  var lastW = -1, lastDpr = -1;

  function resize() {
    var host = canvas.parentElement;
    var cssW = host.clientWidth;
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (!cssW) return;
    if (cssW === lastW && dpr === lastDpr) { draw(self); return; }
    lastW = cssW; lastDpr = dpr;
    var cssH = Math.round(cssW / (typeof ar === 'function' ? ar(cssW) : ar));
    canvas.style.height = cssH + 'px';
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    self.w = cssW; self.h = cssH;
    draw(self);
  }
  function redraw() { if (!self.w) resize(); else draw(self); }

  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas.parentElement);
  else window.addEventListener('resize', resize);
  resize();
  FIGS.push(self);
  return self;
}

/* pointer position in CSS pixels */
function ptOf(canvas, ev) {
  var r = canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

/* run fn(t) each frame, only while `el` is on screen */
function animate(el, fn) {
  var id = null, t0 = null, on = false;
  function frame(ts) {
    if (t0 === null) t0 = ts;
    fn((ts - t0) / 1000);
    id = requestAnimationFrame(frame);
  }
  var api = {
    start: function () { if (id === null && on) id = requestAnimationFrame(frame); },
    stop:  function () { if (id !== null) { cancelAnimationFrame(id); id = null; } }
  };
  new IntersectionObserver(function (e) {
    on = e[0].isIntersecting;
    if (on) api.start(); else api.stop();
  }).observe(el);
  return api;
}

/* Offscreen-canvas cache, keyed on size + theme class. These figures redraw
   on every slider frame and half of what they draw — axes, ticks, the grid —
   does not depend on the slider at all. Painting that once and blitting it is
   the difference between a smooth drag and a stuttering one. */
function Cache() {
  var cv = document.createElement('canvas'), key = null, cw = 0, ch = 0;
  return function (k, w, h, paint) {
    k = k + '|' + w + '|' + h + '|' + document.documentElement.className;
    if (key !== k || cw !== w || ch !== h) {
      var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      var c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      paint(c);
      key = k; cw = w; ch = h;
    }
    return cv;
  };
}

/* "grab anywhere" is kinder than "grab exactly the handle" on a phone */
function draggable(canvas, move) {
  var on = false;
  canvas.addEventListener('pointerdown', function (ev) {
    on = true;
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
    move(ptOf(canvas, ev)); ev.preventDefault();
  });
  canvas.addEventListener('pointermove', function (ev) {
    if (!on) return;
    move(ptOf(canvas, ev)); ev.preventDefault();
  });
  canvas.addEventListener('pointerup',     function () { on = false; });
  canvas.addEventListener('pointercancel', function () { on = false; });
}

/* ============================================================
   Plot furniture
   ============================================================ */
function clear(f) { f.ctx.clearRect(0, 0, f.w, f.h); }

/* A rectangle on the canvas plus the two maps into it. Every figure below
   works in real units — hertz, volts, decibels — and lets this do the
   arithmetic, so nothing has a magic pixel number in it. */
function Plot(x0, y0, x1, y1, xa, xb, ya, yb) {
  return {
    x0: x0, y0: y0, x1: x1, y1: y1, xa: xa, xb: xb, ya: ya, yb: yb,
    w: x1 - x0, h: y1 - y0,
    X: function (x) { return x0 + (x - xa) / (xb - xa) * (x1 - x0); },
    Y: function (y) { return y1 - (y - ya) / (yb - ya) * (y1 - y0); },
    ix: function (px) { return xa + (px - x0) / (x1 - x0) * (xb - xa); },
    clip: function (ctx) { ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip(); }
  };
}

/* The horizontal zero line every scope in this post sits on. */
function baseline(ctx, P, a) {
  ctx.strokeStyle = fgA(a === undefined ? 0.22 : a);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(P.x0, P.Y(0)); ctx.lineTo(P.x1, P.Y(0)); ctx.stroke();
}

function frame(ctx, P, a) {
  ctx.strokeStyle = fgA(a === undefined ? 0.16 : a);
  ctx.lineWidth = 1;
  ctx.strokeRect(P.x0 + 0.5, P.y0 + 0.5, P.w - 1, P.h - 1);
}

/* ys is sampled uniformly across [xa, xb] */
function trace(ctx, P, ys, color, lw) {
  var n = ys.length, i, x, y, started = false;
  ctx.beginPath();
  for (i = 0; i < n; i++) {
    x = P.x0 + i / (n - 1) * P.w;
    y = P.Y(ys[i]);
    /* a value far outside the box would otherwise draw a spike across it */
    if (y < P.y0 - 4000 || y > P.y1 + 4000) { started = false; continue; }
    if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true; }
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw === undefined ? 1.6 : lw;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.stroke();
}

/* A vertical spectral line with a cap, the way a spectrum analyser draws a
   tone: these spectra are all discrete, so drawing them as a continuum would
   be inventing energy that is not there. */
function stem(ctx, P, x, y, color, lw, capR) {
  var px = P.X(x), py = P.Y(y), pz = P.Y(0);
  ctx.strokeStyle = color; ctx.lineWidth = lw === undefined ? 2 : lw;
  ctx.beginPath(); ctx.moveTo(px, pz); ctx.lineTo(px, py); ctx.stroke();
  if (capR) { ctx.beginPath(); ctx.arc(px, py, capR, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
}

function dot(ctx, x, y, r, fill, ring) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  if (ring) { ctx.lineWidth = 2; ctx.strokeStyle = ring; ctx.stroke(); }
}

/* a small label with the page background punched in behind it, so it stays
   readable wherever a trace happens to run underneath */
function tag(ctx, x, y, text, color, align) {
  ctx.font = '500 11px ' + LBL_FONT;
  var w = ctx.measureText(text).width + 10;
  var lx = align === 'left' ? x - w - 9 : x + 9;
  ctx.fillStyle = rgba(pal().bg, 0.88);
  ctx.fillRect(lx, y - 9, w, 17);
  ctx.fillStyle = color;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  drawLabel(ctx, text, lx + 5, y);
}

/* the caption that names a lane in a stacked figure */
function laneName(ctx, P, text, color) {
  ctx.font = '500 10.5px ' + LBL_FONT;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = color || fgA(0.55);
  drawLabel(ctx, text, P.x0 + 5, P.y0 + 4);
}

/* x-axis ticks in hertz */
function xticks(ctx, P, vals, fmt) {
  ctx.font = '500 10px ' + LBL_FONT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  vals.forEach(function (v) {
    var x = P.X(v);
    ctx.strokeStyle = fgA(0.2); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, P.y1); ctx.lineTo(x, P.y1 + 4); ctx.stroke();
    ctx.fillStyle = fgA(0.55);
    drawLabel(ctx, fmt ? fmt(v) : fa(String(v)), x, P.y1 + 6);
  });
}

/* ---------------- DOM helpers ---------------- */
function ro(el, rows) {
  var h = '';
  rows.forEach(function (r) { h += '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; });
  el.innerHTML = h;
}
function pills(host, items, onPick, initial) {
  if (!host) return [];
  host.innerHTML = '';
  var btns = items.map(function (it, i) {
    var b = document.createElement('button');
    b.className = 'pill' + (i === initial ? ' on' : '');
    b.type = 'button';
    b.textContent = it.label;
    b.addEventListener('click', function () {
      btns.forEach(function (o) { o.classList.remove('on'); });
      b.classList.add('on');
      onPick(it, i);
    });
    host.appendChild(b);
    return b;
  });
  return btns;
}
/* Wire a range input to a readout and a callback. `live` fires on every
   pixel of the drag and repaints; `settled` fires when the drag ends, which
   is where anything expensive — re-rendering three seconds of audio — goes. */
function slider(id, valId, fmt, live, settled) {
  var el = document.getElementById(id);
  if (!el) return null;
  var out = valId ? document.getElementById(valId) : null;
  function show() { if (out) out.textContent = fmt(parseFloat(el.value)); }
  el.addEventListener('input', function () { show(); if (live) live(parseFloat(el.value)); });
  el.addEventListener('change', function () { if (settled) settled(parseFloat(el.value)); });
  show();
  return el;
}
function check(id, fn) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('change', function () { fn(el.checked); });
  return el;
}

/* ============================================================
   Signals
   ------------------------------------------------------------
   Everything below is a real signal computed sample by sample — there is no
   drawing that fakes a shape it has not calculated. Two consequences worth
   knowing: the spectra are line spectra because every message here is a sum
   of tones, so they are drawn as lines rather than as a smeared FFT that
   would invent energy between them; and the audio comes out of exactly the
   same functions as the picture, so what you hear is what you are looking at.
   ============================================================ */

/* --- messages ---
   A message is a list of tones plus a peak normalisation, so that x(t) always
   swings between −1 and +1 and the modulation index means what it says. */
function Msg(tones) {
  var peak = 0, ipeak = 0, pwr = 0, i, k, N = 4096, t, v, u, per = 1 / gcdFreq(tones);
  for (i = 0; i < N; i++) {
    t = i / N * per;
    v = 0; u = 0;
    for (k = 0; k < tones.length; k++) {
      v += tones[k].a * Math.cos(2 * Math.PI * tones[k].f * t + (tones[k].p || 0));
      u += tones[k].a / tones[k].f * Math.sin(2 * Math.PI * tones[k].f * t + (tones[k].p || 0));
    }
    if (Math.abs(v) > peak) peak = Math.abs(v);
    if (Math.abs(u) > ipeak) ipeak = Math.abs(u);
    pwr += v * v;
  }
  if (!peak) peak = 1;
  if (!ipeak) ipeak = 1;
  return {
    tones: tones,
    peak: peak,
    /* mean square of the normalised message. Half for a tone, and rather
       less for anything with a realistic crest factor — which is the whole
       reason a broadcaster's modulation meter is not a power meter. */
    power: pwr / N / (peak * peak),
    /* Peak of the normalised message divided by the peak of its normalised
       integral, in hertz. Frequency modulation is specified by how far the
       carrier is pushed, not by how far its phase turns, and for anything but
       a single tone those two are not the same shape — this is the number
       that converts between them, so that β keeps meaning Δf over the top of
       the message band whatever the message is. */
    devK: peak / ipeak,
    /* the normalised message at time t */
    at: function (t) {
      var s = 0;
      for (var k = 0; k < tones.length; k++) s += tones[k].a * Math.cos(2 * Math.PI * tones[k].f * t + (tones[k].p || 0));
      return s / peak;
    },
    /* Its integral — the thing that separates a frequency modulator from a
       phase one — scaled to a peak of exactly 1, so that β always means the
       peak phase swing in radians whatever shape the message is. For a single
       tone that also makes β the familiar Δf/fm. */
    integral: function (t) {
      var s = 0;
      for (var k = 0; k < tones.length; k++) {
        s += tones[k].a / (tones[k].f) * Math.sin(2 * Math.PI * tones[k].f * t + (tones[k].p || 0));
      }
      return s / ipeak;
    },
    /* the normalised line spectrum, one entry per tone */
    lines: function () {
      var self = this;
      return tones.map(function (o) { return { f: o.f, a: o.a / self.peak }; });
    },
    top: function () {
      var m = 0;
      tones.forEach(function (o) { if (o.f > m) m = o.f; });
      return m;
    }
  };
}
/* The repeat period of the tone set, so the peak search above sees the worst
   case rather than an arbitrary slice. Floored at a fiftieth of the lowest
   tone: two frequencies that are very nearly incommensurate have a true
   period of minutes, and sampling that in 4096 points would miss the peak
   by more than sampling one beat of it does. */
function gcdFreq(tones) {
  function g(a, b) { return b < 1e-6 ? a : g(b, a % b); }
  var lo = tones[0].f, r = tones[0].f, i;
  for (i = 1; i < tones.length; i++) { r = g(r, tones[i].f); if (tones[i].f < lo) lo = tones[i].f; }
  return Math.max(r, lo / 50, 1);
}

/* Fourier series of a square and a triangle, truncated where the harmonics
   stop mattering. Truncating is not a cheat: a real transmitter's input
   filter does the same thing, and drawing an ideal square would promise a
   spectrum that no amount of bandwidth could actually carry. */
function squareMsg(f0, n) {
  var t = [];
  for (var k = 1; k <= (n || 15); k += 2) t.push({ f: f0 * k, a: 1 / k, p: -Math.PI / 2 });
  return Msg(t);
}
function triMsg(f0, n) {
  var t = [];
  for (var k = 1, s = 1; k <= (n || 11); k += 2, s = -s) t.push({ f: f0 * k, a: s / (k * k), p: -Math.PI / 2 });
  return Msg(t);
}
function toneMsg(f0) { return Msg([{ f: f0, a: 1, p: -Math.PI / 2 }]); }
function twoToneMsg(f0, f1) { return Msg([{ f: f0, a: 1, p: -Math.PI / 2 }, { f: f1, a: 1, p: -Math.PI / 2 }]); }
/* four harmonics with the upper ones weak — near enough a vowel to read as a
   voice on a scope, and it has a genuinely uneven peak, which is what makes
   the overmodulation figure honest */
function voiceMsg(f0) {
  return Msg([
    { f: f0,     a: 1.00, p: -Math.PI / 2 },
    { f: f0 * 2, a: 0.55, p: 0.7 },
    { f: f0 * 3, a: 0.32, p: 2.1 },
    { f: f0 * 5, a: 0.16, p: 1.2 }
  ]);
}

/* --- modulators ---
   All take a message, a carrier frequency and a time, and return the
   instantaneous transmitted voltage with a peak carrier amplitude of 1. */
function amAt(msg, fc, m, t)     { return (1 + m * msg.at(t)) * Math.cos(2 * Math.PI * fc * t); }
function dsbAt(msg, fc, m, t)    { return m * msg.at(t) * Math.cos(2 * Math.PI * fc * t); }
function pmAt(msg, fc, beta, t)  { return Math.cos(2 * Math.PI * fc * t + beta * msg.at(t)); }
function fmAt(msg, fc, beta, t)  { return Math.cos(2 * Math.PI * fc * t + beta * msg.integral(t)); }
/* The general form: the complex envelope c(t), from which the transmitted
   voltage is Re{c(t)·e^{j2πf꜀t}} and the shape a diode would follow is |c(t)|.
   Writing all four schemes this way is what makes the single-sideband result
   fall out instead of having to be asserted — for one tone, c(t) is a point
   going round a circle at a constant radius, so there is no envelope left to
   detect, and that is exactly why an SSB receiver needs an oscillator of its
   own.

   Doing single sideband tone by tone is also exact. cos(a)cos(b) is half the
   sum plus half the difference; throwing one of the two away is the entire
   idea, and there is no Hilbert transform or filter shape to argue about. */
function bb(msg, m, mode, t) {
  if (mode === 'am')  return { re: 1 + m * msg.at(t), im: 0 };
  if (mode === 'dsb') return { re: m * msg.at(t), im: 0 };
  var sgn = mode === 'lsb' ? -1 : 1, re = 0, im = 0, k, o, a, ph;
  for (k = 0; k < msg.tones.length; k++) {
    o = msg.tones[k];
    a = m * (o.a / msg.peak) / 2;
    ph = sgn * (2 * Math.PI * o.f * t + (o.p || 0));
    re += a * Math.cos(ph); im += a * Math.sin(ph);
  }
  return { re: re, im: im };
}
function bbWave(c, fc, t) {
  var w = 2 * Math.PI * fc * t;
  return c.re * Math.cos(w) - c.im * Math.sin(w);
}
function bbEnv(c) { return Math.sqrt(c.re * c.re + c.im * c.im); }
/* the line spectrum of each scheme, as {f, a} pairs */
function bbLines(msg, fc, m, mode) {
  var out = [], ls = msg.lines();
  if (mode === 'am') out.push({ f: fc, a: 1, carrier: true });
  ls.forEach(function (L) {
    var a = m * L.a / 2;
    if (mode === 'am' || mode === 'dsb' || mode === 'usb') out.push({ f: fc + L.f, a: a });
    if (mode === 'am' || mode === 'dsb' || mode === 'lsb') out.push({ f: fc - L.f, a: a });
  });
  return out;
}

/* fill `out` with a modulated waveform over [0, out.length/fs) */
function render(out, fs, fn) {
  for (var i = 0; i < out.length; i++) out[i] = fn(i / fs);
  return out;
}
function buf(n) { return new Float32Array(n); }

/* --- noise ---
   Seeded, so a figure looks the same on every redraw and a screenshot of it
   is reproducible. A slider that reshuffles the noise on every frame makes it
   impossible to see what the slider itself did. */
function Rng(seed) {
  var s = (seed || 1) >>> 0;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}
function gaussFill(out, rng, sd) {
  for (var i = 0; i < out.length; i += 2) {
    var u = Math.max(rng(), 1e-12), v = rng();
    var r = Math.sqrt(-2 * Math.log(u)), th = 2 * Math.PI * v;
    out[i] = r * Math.cos(th) * sd;
    if (i + 1 < out.length) out[i + 1] = r * Math.sin(th) * sd;
  }
  return out;
}

/* --- receivers --- */

/* The envelope detector, as built: a diode that can only charge the capacitor
   upwards, and a resistor that lets it leak back down. Attack is one sample
   because the diode conducts instantly; decay is the RC. Getting this
   asymmetry right is what makes the overmodulation figure fail the way a real
   detector fails, rather than the way a drawing of one would. */
function EnvDet(fs, tau) {
  var y = 0, d = Math.exp(-1 / (fs * tau));
  return function (x) {
    var a = Math.abs(x);
    y = a > y ? a : y * d;
    return y;
  };
}

/* one-pole low-pass */
function LP1(fs, fc) {
  var y = 0, a = 1 - Math.exp(-2 * Math.PI * fc / fs);
  return function (x) { y += a * (x - y); return y; };
}
/* Three of them, for stripping the carrier ripple off a detector output.
   One pole is not enough and the shortfall is visible: the capacitor sags
   measurably between carrier peaks, and a single pole leaves several percent
   of that sawtooth in the audio, which then shows up in the distortion
   reading as though the detector had done something wrong. It had not. Three
   poles put the ripple below a tenth of a percent and leave the figure
   measuring what it claims to measure. */
function LP3(fs, fc) {
  var a = LP1(fs, fc), b = LP1(fs, fc), c = LP1(fs, fc);
  return function (x) { return c(b(a(x))); };
}
/* and a DC block, because the carrier leaves a large constant behind that is
   not part of anybody's message */
function DCBlock(fs, fc) {
  var lp = LP1(fs, fc === undefined ? 20 : fc);
  return function (x) { return x - lp(x); };
}

/* Resonator: the tuned circuit at the front of every receiver in this post.
   RBJ constant-peak-gain biquad bandpass, `n` of them in cascade.

   One section is a very poor radio — a single tuned circuit rolls off at
   6 dB/octave and the station next door walks straight through it. Three in
   a row is about what a 1930s superhet's IF strip managed, and it is the
   difference between the tuning figure showing separation and showing mud.

   Cascading also means the skirts are no longer the textbook shape, so the
   figure does not draw the textbook shape: `mag()` returns the response of
   the actual cascade, and the drawn passband is measured off that. */
function BPBank(fs, f0, bw, n) {
  n = n || 3;
  var w0 = 2 * Math.PI * clamp(f0, 1, fs / 2 - 1) / fs;
  var Q = clamp(f0 / Math.max(bw, 1e-3), 0.4, 400);
  var alpha = Math.sin(w0) / (2 * Q);
  var b0 = alpha, b1 = 0, b2 = -alpha;
  var a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  var st = [], i;
  for (i = 0; i < n; i++) st.push({ x1: 0, x2: 0, y1: 0, y2: 0 });

  function run(x) {
    for (var k = 0; k < n; k++) {
      var s = st[k];
      var y = b0 * x + b1 * s.x1 + b2 * s.x2 - a1 * s.y1 - a2 * s.y2;
      s.x2 = s.x1; s.x1 = x; s.y2 = s.y1; s.y1 = y;
      x = y;
    }
    return x;
  }
  /* |H(e^{jw})| of one section, to the power n */
  run.mag = function (f) {
    var w = 2 * Math.PI * f / fs;
    var c1 = Math.cos(w), c2 = Math.cos(2 * w), s1 = Math.sin(w), s2 = Math.sin(2 * w);
    var nr = b0 + b1 * c1 + b2 * c2, ni = -(b1 * s1 + b2 * s2);
    var dr = 1 + a1 * c1 + a2 * c2, di = -(a1 * s1 + a2 * s2);
    var d = dr * dr + di * di;
    if (d < 1e-30) return 0;
    return Math.pow(Math.sqrt((nr * nr + ni * ni) / d), n);
  };
  /* The −3 dB width of the whole cascade. Above f0 the response only falls,
     so bisection finds the edge in twenty-odd evaluations rather than the
     thousands a linear walk would need on every frame of a drag. */
  run.f0 = f0;
  run.bw3 = function () {
    var target = run.mag(f0) * Math.SQRT1_2;
    var lo = f0, hi = Math.min(f0 * 4 + bw * 4, fs / 2 * 0.999), mid, i;
    if (run.mag(hi) > target) return 2 * (hi - f0);
    for (i = 0; i < 26; i++) {
      mid = (lo + hi) / 2;
      if (run.mag(mid) > target) lo = mid; else hi = mid;
    }
    return 2 * (lo - f0);
  };
  return run;
}

/* What section bandwidth makes a cascade of `n` of them come out `want` wide
   overall? Three tuned circuits in a row are much sharper than any one of
   them, and by a factor that also depends on how close f0 is to half the
   sample rate — so rather than quoting a textbook constant that would be
   wrong here, solve it. It runs once per move of the tuning dial, not once
   per frame, and it is what lets the slider's label and the measured width in
   the readout agree with each other. */
function bwFor(fs, f0, want, n) {
  var lo = want, hi = want * 10, mid = want, i;
  for (i = 0; i < 22; i++) {
    mid = (lo + hi) / 2;
    if (BPBank(fs, f0, mid, n).bw3() < want) lo = mid; else hi = mid;
  }
  return mid;
}

/* --- small numerical odds and ends --- */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, k) { return a + (b - a) * k; }
/* peak of an array, for autoscaling a recovered trace without letting one
   noise spike flatten everything else */
function pk(a, from, to) {
  var m = 0;
  for (var i = from || 0; i < (to === undefined ? a.length : to); i++) if (Math.abs(a[i]) > m) m = Math.abs(a[i]);
  return m || 1;
}
function rms(a) {
  var s = 0;
  for (var i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s / a.length);
}

/* How close is `got` to `want`, once you allow it any gain it likes?

   Both the overmodulation figure and the static one need to score a recovered
   waveform against the message that went in, and neither should be penalised
   for coming out quieter — a detector that halves everything has lost nothing.
   So fit the best single scale factor first, and measure only what that fit
   cannot account for. What is left is distortion in one figure and noise in
   the other, which is the honest way round: they are the same measurement. */
/* Every filter in a receiver delays what it passes, and three tuned circuits
   plus a detector plus a low-pass add up to a delay you can see. It is real —
   but it is not an error, and drawing the recovered trace half a cycle to the
   right of the message it came from would blame the receiver for something
   nobody has ever complained about. So find the delay and take it out before
   comparing, which is also what stops it from being counted as distortion. */
function bestLag(got, want, maxLag) {
  var n = Math.min(got.length, want.length), best = 0, bs = -Infinity, L, i, s;
  for (L = 0; L <= maxLag; L++) {
    s = 0;
    for (i = 0; i + L < n; i++) s += got[i + L] * want[i];
    if (s > bs) { bs = s; best = L; }
  }
  return best;
}

function fitErr(got, want) {
  var n = Math.min(got.length, want.length), i, x, sxy = 0, sxx = 0, err = 0, sig = 0;
  for (i = 0; i < n; i++) { sxy += want[i] * got[i]; sxx += want[i] * want[i]; }
  if (sxx < 1e-14) return { k: 0, ratio: 0 };
  var k = sxy / sxx;
  for (i = 0; i < n; i++) {
    x = k * want[i];
    err += (got[i] - x) * (got[i] - x);
    sig += x * x;
  }
  return { k: k, ratio: sig < 1e-14 ? 0 : Math.sqrt(err / sig) };
}

/* ============================================================
   Sound
   ------------------------------------------------------------
   Half of what this article claims is about how something sounds, and a
   drawing of a waveform is a poor substitute for hearing it. So several
   figures can play themselves.

   Three rules, and they are not negotiable:
     · nothing ever makes a noise without a click on a button that says so
     · only one figure plays at a time
     · a figure that scrolls off the screen shuts up, the same way the
       animated ones stop asking for frames

   What comes out of the speaker is not a sound effect. It is the same
   modulator, the same channel and the same detector the picture is drawn
   from, run at the sample rate of the audio hardware instead of at whatever
   resolution the canvas happens to be. When the detector tears, you are
   hearing the tear.
   ============================================================ */
var AUDIO = (function () {
  var Ctor = window.AudioContext || window.webkitAudioContext;
  var ac = null, cur = null, subs = [];
  var FADE = 0.02;

  function ctx() {
    if (!Ctor) return null;
    if (!ac) { try { ac = new Ctor(); } catch (e) { return null; } }
    /* browsers hand back a suspended context until a gesture unlocks it, and
       every call into here is already inside a click handler */
    if (ac.state === 'suspended' && ac.resume) { try { ac.resume(); } catch (e) {} }
    return ac;
  }
  function emit() {
    var k = cur ? cur.key : null;
    subs.forEach(function (f) { try { f(k); } catch (e) {} });
  }
  function fadeOut(v) {
    var now = v.ac.currentTime;
    try {
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setValueAtTime(v.gain.gain.value, now);
      v.gain.gain.linearRampToValueAtTime(0.0001, now + FADE);
      v.src.stop(now + FADE + 0.01);
    } catch (e) { try { v.src.stop(); } catch (e2) {} }
  }

  return {
    available: function () { return !!Ctor; },
    playing: function () { return cur ? cur.key : null; },
    subscribe: function (f) { subs.push(f); f(cur ? cur.key : null); },

    /* render(fs) returns a mono Float32Array that loops seamlessly */
    play: function (key, render) {
      var a = ctx();
      if (!a) return false;
      var data;
      try { data = render(a.sampleRate); } catch (e) { return false; }
      if (!data || !data.length) return false;

      /* Normalise to a common loudness, and do it by RMS rather than by peak.

         Peak normalisation would be a disaster on exactly the figure that
         needs this most: below the FM threshold the output is a quiet
         programme with occasional enormous clicks in it, and scaling the
         peak to a safe level would push the programme down to nothing and
         leave the reader listening to silence interrupted by ticks. Setting
         the average instead keeps every figure at the same listening level
         and lets the clicks clip — which is what they do in a real receiver,
         and what they sound like. */
      var g = 0.12 / Math.max(rms(data), 1e-6);
      for (var i = 0; i < data.length; i++) data[i] = clamp(data[i] * g, -0.9, 0.9);

      var old = cur;
      var gain = a.createGain();
      gain.gain.setValueAtTime(0.0001, a.currentTime);
      gain.gain.linearRampToValueAtTime(1, a.currentTime + FADE);
      gain.connect(a.destination);

      var b = a.createBuffer(1, data.length, a.sampleRate);
      if (b.copyToChannel) b.copyToChannel(data, 0);
      else b.getChannelData(0).set(data);
      var src = a.createBufferSource();
      src.buffer = b; src.loop = true;
      src.connect(gain);
      src.start();

      cur = { key: key, src: src, gain: gain, ac: a };
      if (old) fadeOut(old);
      emit();
      return true;
    },

    stop: function () {
      if (!cur) return;
      fadeOut(cur);
      cur = null;
      emit();
    }
  };
})();

/* Wire one 🔊 button to one figure. `render` is called fresh every time,
   so a figure whose sliders have moved plays what it now shows. */
function listen(btnId, hostEl, render) {
  var btn = document.getElementById(btnId);
  var api = { refresh: function () {}, stop: function () {} };
  if (!btn) return api;
  if (!AUDIO.available()) { btn.hidden = true; return api; }

  var key = btnId;
  var lbl = btn.querySelector('.lbl');
  var note = btn.parentElement ? btn.parentElement.querySelector('.audio-note') : null;

  btn.addEventListener('click', function () {
    if (AUDIO.playing() === key) { AUDIO.stop(); return; }
    if (!AUDIO.play(key, render) && note) note.textContent = tr('js.audio.failed');
  });
  AUDIO.subscribe(function (k) {
    var on = k === key;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (lbl) lbl.textContent = on ? tr('js.audio.stop') : tr('js.audio.listen');
  });
  if (hostEl && window.IntersectionObserver) {
    new IntersectionObserver(function (e) {
      if (!e[0].isIntersecting && AUDIO.playing() === key) AUDIO.stop();
    }).observe(hostEl);
  }

  api.refresh = function () { if (AUDIO.playing() === key) AUDIO.play(key, render); };
  api.stop    = function () { if (AUDIO.playing() === key) AUDIO.stop(); };
  return api;
}

/* Two and a half seconds is long enough not to sound like a loop and short
   enough that regenerating it on every slider release costs nothing. */
var AUDIO_SECONDS = 2.5;
/* Nudge a frequency to one whose period is a whole number of samples. Build
   the message out of harmonics of that, and the buffer can be cut at a period
   boundary — so the loop joins where the waveform already was, instead of
   clicking once every two and a half seconds. */
function snap(fs, f) { return fs / Math.max(Math.round(fs / f), 2); }
function loopLen(fs, fundamental) {
  var per = Math.max(Math.round(fs / fundamental), 2);
  return Math.max(Math.round(AUDIO_SECONDS * fs / per), 4) * per;
}
/* Noise has no period to cut on, so where a figure adds any, fold the tail
   back over the head instead. Ten milliseconds is inaudible as a fade and
   long enough to hide the seam. */
function seam(a, fs) {
  var m = Math.min(Math.round(0.01 * fs), a.length >> 2), i, k;
  for (i = 0; i < m; i++) {
    k = i / m;
    a[i] = a[i] * k + a[a.length - m + i] * (1 - k);
  }
  return a.subarray(0, a.length - m);
}

/* ============================================================
   What part two needs on top of part one
   ============================================================ */

/* Butterworth low-pass of even order, as `order/2` biquad sections.

   Part one got away with cascading one-pole filters. Part two cannot, and the
   reason is worth stating: after an FM discriminator the noise is not flat —
   its power rises with the square of frequency, because the discriminator
   differentiates and differentiation is a rising gain. A gentle filter that
   leaks a little above the message band therefore leaks the very loudest part
   of the noise, and it does so by about six decibels. That is a quarter of the
   whole effect this article is about, thrown away by a filter shape.

   Butterworth is flat where the message is and steep where the noise is, which
   is precisely what is needed for a figure that claims to be measuring
   something. */
function Butter(fs, fc, order) {
  var k = Math.max(Math.round(order / 2), 1), i, st = [];
  var w0 = 2 * Math.PI * clamp(fc, 1, fs * 0.49) / fs, cw = Math.cos(w0), sw = Math.sin(w0);
  for (i = 0; i < k; i++) {
    var Q = 1 / (2 * Math.cos((2 * i + 1) * Math.PI / (4 * k)));
    var al = sw / (2 * Q);
    var a0 = 1 + al;
    st.push({
      b0: (1 - cw) / 2 / a0, b1: (1 - cw) / a0, b2: (1 - cw) / 2 / a0,
      a1: (-2 * cw) / a0, a2: (1 - al) / a0,
      x1: 0, x2: 0, y1: 0, y2: 0
    });
  }
  return function (x) {
    for (var j = 0; j < k; j++) {
      var s = st[j];
      var y = s.b0 * x + s.b1 * s.x1 + s.b2 * s.x2 - s.a1 * s.y1 - s.a2 * s.y2;
      s.x2 = s.x1; s.x1 = x; s.y2 = s.y1; s.y1 = y;
      x = y;
    }
    return x;
  };
}

/* ---------------- Bessel ----------------
   J_n(β) for n = 0…nmax, by Miller's downward recurrence.

   Upward recurrence is the obvious way and it is useless: J_n gets very small
   as n runs past β, and the rounding error does not, so after a dozen orders
   you are amplifying noise. Downward is stable — start absurdly high with a
   guess of 1, run the recurrence backwards, and the true solution crowds out
   whatever you started with. The catch is that the answers come out scaled by
   an unknown constant, which is what the identity J₀ + 2J₂ + 2J₄ + … = 1 is
   for. */
function besselAll(x, nmax) {
  var out = new Float64Array(nmax + 1), i;
  if (Math.abs(x) < 1e-9) { out[0] = 1; return out; }
  var ax = Math.abs(x);
  var m = 2 * Math.floor((nmax + Math.round(Math.sqrt(40 * (nmax + 1)))) / 2) + 20;
  var tox = 2 / ax, bj = 1, bjp = 0, sum = 0, bjm, j;
  var BIG = 1e10, SMALL = 1e-10;
  for (j = m; j > 0; j--) {
    bjm = j * tox * bj - bjp;
    bjp = bj;
    bj = bjm;                                   /* bj is now J_{j−1} */
    if (Math.abs(bj) > BIG) {
      bj *= SMALL; bjp *= SMALL; sum *= SMALL;
      for (i = 0; i <= nmax; i++) out[i] *= SMALL;
    }
    if ((j - 1) % 2 === 0 && j > 1) sum += 2 * bj;
    if (j - 1 <= nmax) out[j - 1] = bj;
  }
  sum += bj;                                    /* the J₀ term */
  for (i = 0; i <= nmax; i++) out[i] /= sum;
  /* odd orders of J_n(−x) flip sign; nothing here uses negative β, but a
     silently wrong answer is worse than a cheap guard */
  if (x < 0) for (i = 1; i <= nmax; i += 2) out[i] = -out[i];
  return out;
}

/* ============================================================
   The channel, in complex baseband
   ------------------------------------------------------------
   Part one simulated the carrier itself, because part one was about a diode
   that can only see the carrier. Part two is about noise, and for that the
   carrier is dead weight: every figure below would have to run at ten times
   the sample rate to carry a wave nobody looks at.

   So drop it. Write the transmitted signal as its complex envelope z(t),
   where the real signal is Re{z(t)·e^{j2πf꜀t}}. Amplitude modulation moves
   z along the real axis; angle modulation walks it around the unit circle.
   Noise becomes a complex number added to z. Nothing is approximated — this
   is the same simulation, with a term that cancels removed.

   γ is the channel signal-to-noise ratio, S/(N₀W): received power over the
   noise in one message bandwidth. It is the fair yardstick, because it does
   not care how much bandwidth the scheme chose to spend — which is the entire
   argument of this article, and it would be circular to measure it any other
   way.
   ============================================================ */

/* Both schemes normalised to the same transmitted power, so the comparison is
   between the two ideas rather than between two power bills. */
function cxLink(n, fs, skip, cfg) {
  var msg = cfg.msg, W = cfg.W, kind = cfg.kind;
  var BT = cfg.BT, gamma = cfg.gamma;
  /* Complex white noise at variance σ² per component carries a passband
     power of σ² spread over a bandwidth of fs, so N₀ = σ²/fs. The received
     power is ½ for both schemes, which makes γ = fs / (2σ²W). */
  var sd = (gamma > 0 && isFinite(gamma)) ? Math.sqrt(fs / (2 * gamma * W)) : 0;

  var lpI = Butter(fs, BT / 2, 8), lpQ = Butter(fs, BT / 2, 8);
  var lpO = Butter(fs, W, 8), dc = DCBlock(fs, 20);
  var lpIc, lpQc, lpOc, dcC;
  if (cfg.clean) { lpIc = Butter(fs, BT / 2, 8); lpQc = Butter(fs, BT / 2, 8); lpOc = Butter(fs, W, 8); dcC = DCBlock(fs, 20); }

  /* AM at m = 1, scaled so its mean power matches FM's */
  var amG = 1 / Math.sqrt(1 + msg.power);
  /* peak phase deviation that puts the peak frequency deviation at β·W */
  var D = cfg.beta * W / msg.devK;

  var rng = Rng(cfg.seed || 4041);
  var out = buf(n), clean = cfg.clean ? buf(n) : null;
  var iq = cfg.iq ? { re: buf(n), im: buf(n) } : null;
  var i, t, zr, zi, u, r, th, nr, ni, have = false, spare = 0;
  var pr = 0, pi = 0, prc = 0, pic = 0, first = true;
  var vr, vi, vrc, vic, ph, phc, thc, dcv, d;

  for (i = -skip; i < n; i++) {
    t = i / fs;
    if (kind === 'am') { zr = amG * (1 + msg.at(t)); zi = 0; }
    else { ph = D * msg.integral(t); zr = Math.cos(ph); zi = Math.sin(ph); }

    /* one Box–Muller pair feeds both quadratures */
    if (have) { nr = spare; have = false; }
    else {
      u = Math.max(rng(), 1e-12); r = Math.sqrt(-2 * Math.log(u)); th = 2 * Math.PI * rng();
      nr = r * Math.cos(th); spare = r * Math.sin(th); have = true;
    }
    if (have) { ni = spare; have = false; }
    else {
      u = Math.max(rng(), 1e-12); r = Math.sqrt(-2 * Math.log(u)); th = 2 * Math.PI * rng();
      ni = r * Math.cos(th); spare = r * Math.sin(th); have = true;
    }

    vr = lpI(zr + sd * nr); vi = lpQ(zi + sd * ni);
    if (cfg.clean) { vrc = lpIc(zr); vic = lpQc(zi); }

    if (kind === 'am') {
      d  = dc(lpO(Math.sqrt(vr * vr + vi * vi)));
      if (cfg.clean) phc = dcC(lpOc(Math.sqrt(vrc * vrc + vic * vic)));
    } else {
      /* The discriminator: how far the phasor turned since the last sample.
         Wrapping that difference into ±π is the whole of it — and it is also
         where the clicks come from. Below threshold the noise occasionally
         drags the phasor the wrong way round the origin, the wrapped
         difference jumps by a whole turn, and the output gets a spike that no
         amount of filtering afterwards can put back. */
      th = Math.atan2(vi, vr);
      d = first ? 0 : th - pr;
      while (d >  Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      pr = th;
      d = dc(lpO(d * fs / (2 * Math.PI)));
      if (cfg.clean) {
        thc = Math.atan2(vic, vrc);
        dcv = first ? 0 : thc - prc;
        while (dcv >  Math.PI) dcv -= 2 * Math.PI;
        while (dcv < -Math.PI) dcv += 2 * Math.PI;
        prc = thc;
        phc = dcC(lpOc(dcv * fs / (2 * Math.PI)));
      }
      first = false;
    }
    if (i >= 0) {
      out[i] = d;
      if (cfg.clean) clean[i] = phc;
      if (iq) { iq.re[i] = vr; iq.im[i] = vi; }
    }
  }
  return { out: out, clean: clean, iq: iq };
}

/* Output signal-to-noise, measured the same way part one measured it: run the
   receiver twice, once with the storm and once without, and call the
   difference noise. Everything the receiver does to the signal on its own —
   delay, roll-off, the discriminator's own scaling — happens identically in
   both runs and cancels. */
function outSNR(L) {
  var n = L.out.length, i, d, e = 0, p = 0;
  for (i = 0; i < n; i++) { d = L.out[i] - L.clean[i]; e += d * d; p += L.clean[i] * L.clean[i]; }
  if (p < 1e-18) return -99;
  if (e < 1e-20) return 99;
  return clamp(10 * Math.log10(p / e), -30, 99);
}
/* ============================================================
   HERO — the phasor keeps its length
   ------------------------------------------------------------
   Dots dropped at equal intervals of time as the phasor goes round. In
   amplitude modulation they would march in and out along a spoke; here they
   stay on the rim and bunch up instead. The bunching is the message.
   ============================================================ */
(function () {
  var cv = document.getElementById('figHero');
  if (!cv) return;
  var msg = toneMsg(1), BETA = 2.6, S = { t: 0 };

  var f = Fig(cv, 1.05, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var cx = w / 2, cy = h * 0.46, R = Math.min(w, h * 0.9) / 2 - 22;

    ctx.strokeStyle = fgA(0.22); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = fgA(0.12);
    ctx.beginPath(); ctx.moveTo(cx - R - 8, cy); ctx.lineTo(cx + R + 8, cy);
    ctx.moveTo(cx, cy - R - 8); ctx.lineTo(cx, cy + R + 8); ctx.stroke();

    /* one dot per equal step of time, over the last stretch of history */
    var N = 96, i, tt, ph, x, y, k;
    for (i = 0; i < N; i++) {
      tt = S.t - (N - 1 - i) * 0.012;
      ph = 2 * Math.PI * 7 * tt + BETA * msg.integral(tt);
      x = cx + R * Math.cos(ph); y = cy - R * Math.sin(ph);
      k = i / (N - 1);
      dot(ctx, x, y, 1.6 + 1.4 * k, sigA(0.1 + 0.8 * k * k));
    }
    ph = 2 * Math.PI * 7 * S.t + BETA * msg.integral(S.t);
    ctx.strokeStyle = sigA(1); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * Math.cos(ph), cy - R * Math.sin(ph)); ctx.stroke();
    dot(ctx, cx + R * Math.cos(ph), cy - R * Math.sin(ph), 4.5, pal().sig, rgba(pal().bg, 1));

    /* the wave it makes, along the bottom */
    var P = Plot(6, h - 44, w - 6, h - 6, 0, 1, -1.25, 1.25);
    var M = Math.max(Math.round(w * 4), 600), ys = buf(M), j, t2;
    for (j = 0; j < M; j++) {
      t2 = S.t - 1.15 + j / (M - 1) * 1.15;
      ys[j] = Math.cos(2 * Math.PI * 7 * t2 + BETA * msg.integral(t2));
    }
    baseline(ctx, P, 0.14);
    trace(ctx, P, ys, sigA(0.85), 1.2);
  });

  animate(cv, function (t) { S.t = t * 0.34; f.redraw(); });
})();

/* ============================================================
   FIG 1 — β, and the carrier that disappears
   ------------------------------------------------------------
   Every sideband pair's height is a Bessel function of the modulation index,
   and the carrier's own height is J₀. J₀ has zeros. Drag β to 2.405 and the
   thing the whole transmitter is built around is simply not there.
   ============================================================ */
(function () {
  var cv = document.getElementById('figBeta');
  if (!cv) return;

  var FC = 1200, FM = 100, NMAX = 26;
  var S = { beta: 2 };
  var out = document.getElementById('betaOut');
  var cache = Cache();
  /* the first four zeros of J₀ — the ones a deviation meter is calibrated on */
  var NULLS = [2.4048, 5.5201, 8.6537, 11.7915];

  var f = Fig(cv, 2.15, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var P = Plot(30, 40, w - 12, h - 30, 0, 2700, 0, 1.05);
    var J = besselAll(S.beta, NMAX);

    ctx.drawImage(cache('g', w, h, function (c) {
      frame(c, P, 0.13);
      xticks(c, P, [0, 500, 1000, 1500, 2000, 2500], function (v) { return fa(v); });
      c.font = '500 10px ' + LBL_FONT;
      c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = fgA(0.5);
      drawLabel(c, tr('js.beta.xaxis'), (P.x0 + P.x1) / 2, P.y1 + 17);
      c.save();
      c.translate(11, (P.y0 + P.y1) / 2); c.rotate(-Math.PI / 2);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      drawLabel(c, tr('js.beta.yaxis'), 0, 0);
      c.restore();
    }), 0, 0, w, h);

    /* Carson's rule, drawn as the bracket it is */
    var B = 2 * (S.beta + 1) * FM;
    var lo = Math.max(FC - B / 2, P.xa), hi = Math.min(FC + B / 2, P.xb);
    ctx.fillStyle = sigA(0.07);
    ctx.fillRect(P.X(lo), P.y0, P.X(hi) - P.X(lo), P.h);
    ctx.strokeStyle = sigA(0.4); ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(P.X(lo), P.y0); ctx.lineTo(P.X(lo), P.y1);
    ctx.moveTo(P.X(hi), P.y0); ctx.lineTo(P.X(hi), P.y1);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.font = '500 10px ' + LBL_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = sigA(0.85);
    drawLabel(ctx, tr('js.beta.carson') + '  ' + hz(Math.round(B)), (P.X(lo) + P.X(hi)) / 2, P.y0 - 6);

    /* the lines */
    var n, a, ff, big = 0;
    ctx.save(); P.clip(ctx);
    for (n = NMAX; n >= 0; n--) {
      a = Math.abs(J[n]);
      if (a < 0.004) continue;
      if (n > 0) {
        ff = FC + n * FM; if (ff <= P.xb) stem(ctx, P, ff, a, sigA(0.95), 2, 2.2);
        ff = FC - n * FM; if (ff >= P.xa) stem(ctx, P, ff, a, sigA(0.95), 2, 2.2);
        big = n;
      }
    }
    /* the carrier, in ink rather than blue, so its absence reads as absence */
    var j0 = Math.abs(J[0]);
    ctx.setLineDash([3, 4]);
    stem(ctx, P, FC, 1, fgA(0.2), 1.4);
    ctx.setLineDash([]);
    if (j0 > 0.004) stem(ctx, P, FC, j0, fgA(0.85), 3, 3.2);
    ctx.restore();

    if (j0 < 0.03) {
      ctx.font = '600 11px ' + LBL_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = fgA(0.9);
      drawLabel(ctx, tr('js.beta.gone'), P.X(FC), P.Y(0.30));
    }

    if (!out) return;
    var pwr = J[0] * J[0], sig = 0;
    for (n = 1; n <= NMAX; n++) { pwr += 2 * J[n] * J[n]; if (Math.abs(J[n]) >= 0.01) sig = n; }
    ro(out, [
      [tr('js.beta.ro_b'),   '<b>β = ' + fix(S.beta, 3) + '</b>'],
      [tr('js.beta.ro_dev'), '±' + hz(Math.round(S.beta * FM))],
      [tr('js.beta.ro_j0'),  '<b>' + fix(J[0], 3) + '</b>'],
      [tr('js.beta.ro_pairs'), fa(sig)],
      [tr('js.beta.ro_carson'), hz(Math.round(B))],
      [tr('js.beta.ro_sum'), fix(pwr, 4)]
    ]);
  });

  var sl = slider('betaB', 'betaBv', function (v) { return 'β = ' + fix(v, 3); },
    function (v) { S.beta = v; f.redraw(); }, function () { audio.refresh(); });

  pills(document.getElementById('betaNulls'), NULLS.map(function (b, i) {
    return { label: tr('js.beta.null') + ' ' + fa(i + 1), b: b };
  }).concat([{ label: tr('js.beta.narrow'), b: 0.3 }, { label: tr('js.beta.wide'), b: 5 }]),
    function (it) {
      S.beta = it.b;
      if (sl) { sl.value = String(it.b); sl.dispatchEvent(new Event('input', { bubbles: true })); }
      f.redraw(); audio.refresh();
    }, -1);

  var audio = listen('betaPlay', cv, function (fs) {
    var n = loopLen(fs, FM), o = buf(n), i, t;
    for (i = 0; i < n; i++) {
      t = i / fs;
      o[i] = Math.cos(2 * Math.PI * FC * t + S.beta * Math.sin(2 * Math.PI * FM * t));
    }
    return o;
  });
})();

/* ============================================================
   FIG 2 — noise, as a phasor
   ------------------------------------------------------------
   The geometry the whole bargain rests on. The noise phasor's length does not
   care how far the signal's own angle is swinging, so the further you swing
   it, the smaller the same wobble looks by comparison.
   ============================================================ */
(function () {
  var cv = document.getElementById('figPhasor');
  if (!cv) return;

  var S = { beta: 3, cn: 20, t: 0 };
  var out = document.getElementById('phOut');

  var f = Fig(cv, 2.05, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var cx = w * 0.27, cy = h / 2, R = Math.min(w * 0.24, h * 0.44);
    var an = Math.pow(10, -S.cn / 20);                 /* noise / signal */

    /* the circle the signal never leaves */
    ctx.strokeStyle = fgA(0.18); ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = fgA(0.1);
    ctx.beginPath(); ctx.moveTo(cx - R * 1.25, cy); ctx.lineTo(cx + R * 1.25, cy);
    ctx.moveTo(cx, cy - R * 1.25); ctx.lineTo(cx, cy + R * 1.25); ctx.stroke();

    /* the signal, wobbling by ±β */
    var ps = S.beta * Math.sin(2 * Math.PI * 0.22 * S.t);
    var sx = cx + R * Math.cos(ps), sy = cy - R * Math.sin(ps);

    /* The swing, drawn as a spiral rather than an arc. Broadcast FM runs a
       peak phase deviation of five radians, which is most of a turn each way,
       and an arc that laps itself just looks like a ring — the one number the
       figure exists to show would be the one thing you could not see. Winding
       it outwards keeps every radian visible. */
    var TURN = 22, r0 = R * 0.34, st, k2, aa, rr;
    ctx.strokeStyle = sigA(0.3); ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    st = 160;
    for (k2 = 0; k2 <= st; k2++) {
      aa = -S.beta + 2 * S.beta * k2 / st;
      rr = r0 + (aa + S.beta) / (2 * Math.PI) * TURN;
      if (k2) ctx.lineTo(cx + rr * Math.cos(aa), cy - rr * Math.sin(aa));
      else ctx.moveTo(cx + rr * Math.cos(aa), cy - rr * Math.sin(aa));
    }
    ctx.stroke(); ctx.lineCap = 'butt';

    ctx.strokeStyle = sigA(0.9); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sx, sy); ctx.stroke();

    /* the noise, a small circle of possibilities on the end of it */
    ctx.strokeStyle = fgA(0.4); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(sx, sy, R * an, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    var pn = 2 * Math.PI * 3.1 * S.t;
    var nx = sx + R * an * Math.cos(pn), ny = sy - R * an * Math.sin(pn);
    ctx.strokeStyle = fgA(0.75); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(nx, ny); ctx.stroke();

    /* and the sum, which is all the receiver ever sees */
    ctx.strokeStyle = fgA(0.85); ctx.lineWidth = 1.4; ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();
    ctx.setLineDash([]);
    dot(ctx, nx, ny, 4, pal().fg, rgba(pal().bg, 1));
    dot(ctx, sx, sy, 3.5, pal().sig, rgba(pal().bg, 1));

    /* how much angle the noise stole */
    var err = Math.atan2(ny - cy, nx - cx) * -1 - Math.atan2(sy - cy, sx - cx) * -1;
    while (err >  Math.PI) err -= 2 * Math.PI;
    while (err < -Math.PI) err += 2 * Math.PI;

    /* The same two quantities as two bars, against a fixed scale — not against
       each other. Normalising them to the larger of the two would show the
       right ratio and the wrong story: the noise bar would appear to shrink
       when you widen the swing, and the noise is precisely the thing that is
       not changing. */
    var BX = w * 0.63, BW = w * 0.28, bh = 16, FULL = 8;
    var y0 = h * 0.30, y1 = h * 0.30 + bh + 40;
    ctx.font = '500 10px ' + LBL_FONT;
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = fgA(0.6);
    drawLabel(ctx, tr('js.ph.bar1'), BX, y0 - 6);
    ctx.fillStyle = sigA(0.85);
    ctx.fillRect(BX, y0, Math.max(BW * clamp(S.beta / FULL, 0, 1), 1.5), bh);
    ctx.fillStyle = fgA(0.6);
    drawLabel(ctx, tr('js.ph.bar2'), BX, y1 - 6);
    ctx.fillStyle = fgA(0.55);
    ctx.fillRect(BX, y1, Math.max(BW * clamp((an / Math.SQRT2) / FULL, 0, 1), 1.5), bh);
    /* the track they run in, so a very short bar still reads as a short bar */
    ctx.strokeStyle = fgA(0.16); ctx.lineWidth = 1;
    ctx.strokeRect(BX + 0.5, y0 + 0.5, BW - 1, bh - 1);
    ctx.strokeRect(BX + 0.5, y1 + 0.5, BW - 1, bh - 1);
    ctx.textBaseline = 'middle'; ctx.fillStyle = fgA(0.75);
    ctx.font = '500 11px ' + LBL_FONT;
    ctx.textAlign = 'left';
    drawLabel(ctx, fix(S.beta, 2) + ' rad', BX + BW + 9, y0 + bh / 2);
    drawLabel(ctx, fix(an / Math.SQRT2, 3) + ' rad', BX + BW + 9, y1 + bh / 2);

    if (an > 0.45) {
      ctx.font = '600 10.5px ' + LBL_FONT;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = fgA(0.9);
      drawLabel(ctx, tr('js.ph.click'), BX, y1 + bh + 22, w - BX - 10);
    }

    if (!out) return;
    var ratio = 20 * Math.log10(S.beta / Math.max(an / Math.SQRT2, 1e-6));
    /* The drawn circle is where the noise sits on average, but the noise is
       Rayleigh — it is longer than that a good fraction of the time, and it
       only has to be longer than the signal once to cost a click. For a
       complex Gaussian of that rms, the chance of overshooting the carrier is
       exp(−1/a²), which is nothing at all until it is suddenly everything. */
    var pEnc = Math.exp(-1 / Math.max(an * an, 1e-9)) * 100;
    ro(out, [
      [tr('js.ph.ro_swing'), '<b>' + fix(S.beta, 2) + ' rad</b>'],
      [tr('js.ph.ro_noise'), fix(an / Math.SQRT2, 4) + ' rad'],
      [tr('js.ph.ro_ratio'), '<b>' + db(ratio, 0) + '</b>'],
      [tr('js.ph.ro_enc'),   pEnc < 0.01 ? tr('js.ph.never') : '<b>' + fix(pEnc, 1) + ' %</b>']
    ]);
  });

  slider('phBeta', 'phBetav', function (v) { return fix(v, 2) + ' rad'; },
    function (v) { S.beta = v; f.redraw(); });
  slider('phCN', 'phCNv', function (v) { return db(v, 0); },
    function (v) { S.cn = v; f.redraw(); });

  animate(cv, function (t) { S.t = t; f.redraw(); });
})();

/* ============================================================
   FIG 3 — quiet, bought
   ------------------------------------------------------------
   The same message, the same transmitter power, the same noise, into two
   receivers. Part one's figure 6 is the top lane, and it has not got any
   better; what has changed is the lane underneath it.
   ============================================================ */
var LINK = { FS: 48000, W: 500, msg: voiceMsg(90) };
LINK.BT = function (beta) { return 2 * (beta + 1) * LINK.W; };

(function () {
  var cv = document.getElementById('figQuiet');
  if (!cv) return;

  var S = { gamma: 26, beta: 5 };
  var out = document.getElementById('quietOut');
  var cache = Cache();

  function run(kind, n, fs, skip) {
    return cxLink(n, fs, skip, {
      kind: kind, msg: LINK.msg, W: LINK.W, beta: S.beta,
      BT: kind === 'am' ? 2 * LINK.W : LINK.BT(S.beta),
      gamma: Math.pow(10, S.gamma / 10), clean: true, seed: 4041
    });
  }

  var f = Fig(cv, 1.75, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var top = Math.round(h * 0.5);
    var A = Plot(8, 10, w - 8, top - 8, 0, 1, -1.35, 1.35);
    var B = Plot(8, top + 10, w - 8, h - 10, 0, 1, -1.35, 1.35);

    ctx.drawImage(cache('g', w, h, function (c) { frame(c, A, 0.13); frame(c, B, 0.13); }), 0, 0, w, h);

    var N = Math.round(LINK.FS * 3 / 90), i;
    var am = run('am', N, LINK.FS, 6000), fm = run('fm', N, LINK.FS, 6000);

    /* Each is drawn against its own quiet run, scaled the same way, so the
       two lanes are directly comparable however differently the two
       demodulators happen to be geared. */
    function lane(P, L, key) {
      var p = Math.max(pk(L.clean), 1e-9), j, a = buf(N), b = buf(N);
      for (j = 0; j < N; j++) { a[j] = L.clean[j] / p; b[j] = L.out[j] / p; }
      ctx.save(); P.clip(ctx);
      ctx.setLineDash([5, 4]);
      trace(ctx, P, a, fgA(0.45), 1.4);
      ctx.setLineDash([]);
      trace(ctx, P, b, sigA(1), 1.6);
      ctx.restore();
      laneName(ctx, P, tr(key), fgA(0.6));
    }
    lane(A, am, 'js.quiet.l_am');
    lane(B, fm, 'js.quiet.l_fm');

    if (!out) return;
    var sa = outSNR(am), sf = outSNR(fm);
    ro(out, [
      [tr('js.quiet.ro_g'),  '<b>' + db(S.gamma, 0) + '</b>'],
      [tr('js.quiet.ro_bw'), fa(Math.round(LINK.BT(S.beta) / (2 * LINK.W))) + '×'],
      [tr('js.quiet.ro_am'), db(sa, 0)],
      [tr('js.quiet.ro_fm'), '<b>' + db(sf, 0) + '</b>'],
      [tr('js.quiet.ro_win'), (sf > sa ? '+' : '') + db(sf - sa, 0)]
    ]);
  });

  slider('quietG', 'quietGv', function (v) { return db(v, 0); },
    function (v) { S.gamma = v; f.redraw(); },
    function () { aAm.refresh(); aFm.refresh(); });

  pills(document.getElementById('quietBeta'), [1, 3, 5, 8].map(function (b) {
    return { label: 'β = ' + fa(b), b: b };
  }), function (it) { S.beta = it.b; f.redraw(); aAm.refresh(); aFm.refresh(); }, 2);

  var aAm = listen('quietPlayAm', cv, function (fs) {
    return seam(run('am', loopLen(fs, 90), fs, Math.round(0.06 * fs)).out, fs);
  });
  var aFm = listen('quietPlayFm', cv, function (fs) {
    return seam(run('fm', loopLen(fs, 90), fs, Math.round(0.06 * fs)).out, fs);
  });
})();

/* ============================================================
   FIG 4 — the cliff
   ------------------------------------------------------------
   Not a formula plotted: twenty-six runs of the same receiver at twenty-six
   noise levels, measured. The knee is where it lands on its own.
   ============================================================ */
(function () {
  var cv = document.getElementById('figCliff');
  if (!cv) return;

  var S = { beta: 5, gamma: 22 };
  var out = document.getElementById('cliffOut');
  var cache = Cache();
  var GS = [], i;
  for (i = 0; i <= 25; i++) GS.push(2 + i * 1.72);        /* γ from 2 to 45 dB */
  var CURVES = {};                                        /* keyed on kind|β */

  function curve(kind, beta) {
    var key = kind + '|' + beta;
    if (CURVES[key]) return CURVES[key];
    var ys = GS.map(function (g) {
      return outSNR(cxLink(12288, LINK.FS, 4000, {
        kind: kind, msg: LINK.msg, W: LINK.W, beta: beta,
        BT: kind === 'am' ? 2 * LINK.W : LINK.BT(beta),
        gamma: Math.pow(10, g / 10), clean: true, seed: 4041
      }));
    });
    CURVES[key] = ys;
    return ys;
  }
  function at(ys, g) {
    var k = clamp((g - GS[0]) / (GS[1] - GS[0]), 0, GS.length - 1.001);
    var i0 = Math.floor(k);
    return lerp(ys[i0], ys[i0 + 1], k - i0);
  }

  var f = Fig(cv, 1.6, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var P = Plot(44, 14, w - 14, h - 34, 0, 46, -5, 70);

    ctx.drawImage(cache('g', w, h, function (c) {
      frame(c, P, 0.13);
      c.strokeStyle = fgA(0.08); c.lineWidth = 1;
      [0, 10, 20, 30, 40, 50, 60, 70].forEach(function (v) {
        c.beginPath(); c.moveTo(P.x0, P.Y(v)); c.lineTo(P.x1, P.Y(v)); c.stroke();
      });
      c.font = '500 10px ' + LBL_FONT;
      c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillStyle = fgA(0.5);
      [0, 20, 40, 60].forEach(function (v) { drawLabel(c, fa(v), P.x0 - 6, P.Y(v)); });
      xticks(c, P, [0, 10, 20, 30, 40], function (v) { return fa(v); });
      c.textAlign = 'center'; c.textBaseline = 'top';
      drawLabel(c, tr('js.cliff.xaxis'), (P.x0 + P.x1) / 2, P.y1 + 18);
      c.save(); c.translate(12, (P.y0 + P.y1) / 2); c.rotate(-Math.PI / 2);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      drawLabel(c, tr('js.cliff.yaxis'), 0, 0);
      c.restore();
    }), 0, 0, w, h);

    function draw(ys, color, lw, dash) {
      ctx.save(); P.clip(ctx);
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      GS.forEach(function (g, k) {
        var x = P.X(g), y = P.Y(ys[k]);
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      });
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round';
      ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }

    var amY = curve('am', 1), fmY = curve('fm', S.beta);
    draw(amY, fgA(0.6), 1.8, [5, 4]);
    draw(fmY, sigA(1), 2.2);

    ctx.font = '500 10.5px ' + LBL_FONT;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = fgA(0.65);
    drawLabel(ctx, tr('js.cliff.am'), P.X(41), P.Y(at(amY, 41)) + 12);
    ctx.fillStyle = sigA(1);
    drawLabel(ctx, 'FM β = ' + fa(S.beta), P.X(30), P.Y(at(fmY, 30)) - 12);

    var ga = at(amY, S.gamma), gf = at(fmY, S.gamma);
    ctx.strokeStyle = fgA(0.35); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(P.X(S.gamma), P.y0); ctx.lineTo(P.X(S.gamma), P.y1); ctx.stroke();
    ctx.setLineDash([]);
    dot(ctx, P.X(S.gamma), P.Y(ga), 4.5, pal().fg, rgba(pal().bg, 1));
    dot(ctx, P.X(S.gamma), P.Y(gf), 5.5, pal().sig, rgba(pal().bg, 1));

    if (!out) return;
    /* where the knee is: the last point going down at which FM is still
       within 3 dB of the straight line it follows when it is behaving */
    var kn = GS[0], k;
    for (k = GS.length - 1; k > 0; k--) {
      if (fmY[k] - fmY[k - 1] > 1.6 * (GS[k] - GS[k - 1])) { kn = GS[k]; break; }
    }
    ro(out, [
      [tr('js.cliff.ro_g'),   '<b>' + db(S.gamma, 0) + '</b>'],
      [tr('js.cliff.ro_am'),  db(ga, 0)],
      [tr('js.cliff.ro_fm'),  '<b>' + db(gf, 0) + '</b>'],
      [tr('js.cliff.ro_win'), (gf > ga ? '+' : '') + db(gf - ga, 0)],
      [tr('js.cliff.ro_bw'),  fa(Math.round(LINK.BT(S.beta) / (2 * LINK.W))) + '×'],
      [tr('js.cliff.ro_knee'), db(kn, 0)],
      [tr('js.cliff.ro_st'),  tr(S.gamma >= kn ? 'js.cliff.above' : 'js.cliff.below')]
    ]);
  });

  pills(document.getElementById('cliffBeta'), [1, 3, 5, 8].map(function (b) {
    return { label: 'β = ' + fa(b), b: b };
  }), function (it) { S.beta = it.b; f.redraw(); audio.refresh(); }, 2);

  slider('cliffG', 'cliffGv', function (v) { return db(v, 0); },
    function (v) { S.gamma = v; f.redraw(); }, function () { audio.refresh(); });

  draggable(cv, function (p) {
    var P = Plot(44, 14, f.w - 14, 1, 0, 46, 0, 1);
    S.gamma = Math.round(clamp(P.ix(p.x), 2, 45));
    var el = document.getElementById('cliffG');
    if (el) { el.value = String(S.gamma); el.dispatchEvent(new Event('input', { bubbles: true })); }
    f.redraw();
  });
  cv.style.cursor = 'ew-resize';

  var audio = listen('cliffPlay', cv, function (fs) {
    return seam(cxLink(loopLen(fs, 90), fs, Math.round(0.06 * fs), {
      kind: 'fm', msg: LINK.msg, W: LINK.W, beta: S.beta, BT: LINK.BT(S.beta),
      gamma: Math.pow(10, S.gamma / 10), seed: 4041
    }).out, fs);
  });
})();

/* ============================================================
   FIG 5 — the multiplex
   ------------------------------------------------------------
   Stereo, added in 1961 to a service with millions of mono receivers already
   in the field, none of which were allowed to notice. Everything above
   15 kHz is the part the old sets cannot hear.
   ============================================================ */
(function () {
  var cv = document.getElementById('figMpx');
  if (!cv) return;

  var S = { l: 0.9, r: 0.35, mono: false };
  var out = document.getElementById('mpxOut');
  var cache = Cache();
  var FL = 400, FR = 700;                 /* left is a low note, right a high one */

  function comp(t) {
    var L = S.l * Math.sin(2 * Math.PI * FL * t), R = S.r * Math.sin(2 * Math.PI * FR * t);
    return 0.5 * (L + R)
         + 0.09 * Math.sin(2 * Math.PI * 19000 * t)
         + 0.5 * (L - R) * Math.sin(2 * Math.PI * 38000 * t);
  }

  var f = Fig(cv, 2.15, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var top = Math.round(h * 0.55);
    /* a clear strip above the frame, so the annotation for the old receiver's
       hearing range has somewhere to live that is not on top of a band label */
    var P = Plot(16, 46, w - 12, top - 22, 0, 62000, 0, 1.1);
    var T = Plot(16, top + 12, w - 12, h - 16, 0, 1, -1.15, 1.15);

    ctx.drawImage(cache('g', w, h, function (c) {
      frame(c, P, 0.13); frame(c, T, 0.13);
      c.strokeStyle = fgA(0.2); c.lineWidth = 1;
      c.beginPath(); c.moveTo(T.x0, T.Y(0)); c.lineTo(T.x1, T.Y(0)); c.stroke();
      xticks(c, P, [0, 15000, 19000, 23000, 38000, 53000, 57000], function (v) { return fa(v / 1000); });
      c.font = '500 10px ' + LBL_FONT;
      c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = fgA(0.5);
      drawLabel(c, tr('js.mpx.xaxis'), (P.x0 + P.x1) / 2, P.y1 + 18);
      /* where a 1961 receiver stopped listening */
      c.strokeStyle = fgA(0.3); c.setLineDash([4, 3]); c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(P.X(15000), P.y0); c.lineTo(P.X(15000), P.y1); c.stroke();
      c.setLineDash([]);
    }), 0, 0, w, h);

    var sum = 0.5 * (S.l + S.r), dif = 0.5 * Math.abs(S.l - S.r);
    function band(a, b, hgt, col, label) {
      var x0 = P.X(a), x1 = P.X(b), y = P.Y(Math.max(hgt, 0.012));
      ctx.fillStyle = col;
      ctx.fillRect(x0, y, Math.max(x1 - x0, 2), P.Y(0) - y);
      if (!label) return;
      ctx.font = '500 9.5px ' + LBL_FONT;
      ctx.textAlign = 'center';
      /* A tall block has no room above it, so the label goes inside in the
         page colour. A short one has nowhere inside, so it goes above. */
      if (P.Y(0) - y > 30 && x1 - x0 > 60) {
        ctx.textBaseline = 'top'; ctx.fillStyle = rgba(pal().bg, 0.95);
        drawLabel(ctx, label, (x0 + x1) / 2, y + 6, x1 - x0 - 10);
      } else {
        ctx.textBaseline = 'bottom'; ctx.fillStyle = fgA(0.62);
        drawLabel(ctx, label, (x0 + x1) / 2, y - 5);
      }
    }
    var live = S.mono ? fgA(0.2) : sigA(0.75);
    band(30, 15000, sum, sigA(0.75), tr('js.mpx.sum'));
    band(18800, 19200, 0.09, S.mono ? fgA(0.25) : sigA(0.9), tr('js.mpx.pilot'));
    band(23000, 38000, dif, live, null);
    band(38000, 53000, dif, live, tr('js.mpx.dif'));
    band(56700, 57300, 0.05, S.mono ? fgA(0.2) : fgA(0.5), tr('js.mpx.rds'));
    if (S.mono) {
      ctx.font = '600 10.5px ' + LBL_FONT;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = fgA(0.85);
      drawLabel(ctx, tr('js.mpx.deaf'), P.X(24000), P.Y(0.62), P.x1 - P.X(24000) - 8);
    }
    /* the old receiver's hearing, bracketed above the frame */
    var bx0 = P.X(0), bx1 = P.X(15000), by = P.y0 - 12;
    ctx.strokeStyle = fgA(0.32); ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx0 + 0.5, by + 5); ctx.lineTo(bx0 + 0.5, by);
    ctx.lineTo(bx1 - 0.5, by); ctx.lineTo(bx1 - 0.5, by + 5);
    ctx.stroke();
    ctx.font = '500 9.5px ' + LBL_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = fgA(0.5);
    drawLabel(ctx, tr('js.mpx.oldset'), (bx0 + bx1) / 2, by - 4, bx1 - bx0 - 8);

    /* the composite, in time */
    var N = Math.max(Math.round(w * 6), 1400), ys = buf(N), j, SPAN = 2 / FL;
    for (j = 0; j < N; j++) ys[j] = comp(j / (N - 1) * SPAN);
    ctx.save(); T.clip(ctx);
    if (S.mono) {
      var mono = buf(N);
      for (j = 0; j < N; j++) {
        var t = j / (N - 1) * SPAN;
        mono[j] = 0.5 * (S.l * Math.sin(2 * Math.PI * FL * t) + S.r * Math.sin(2 * Math.PI * FR * t));
      }
      trace(ctx, T, ys, fgA(0.22), 1);
      trace(ctx, T, mono, sigA(1), 1.9);
    } else {
      trace(ctx, T, ys, sigA(0.9), 1.3);
    }
    ctx.restore();
    laneName(ctx, T, tr(S.mono ? 'js.mpx.l_mono' : 'js.mpx.l_comp'), fgA(0.6));

    if (!out) return;
    ro(out, [
      [tr('js.mpx.ro_l'),   fix(S.l, 2)],
      [tr('js.mpx.ro_r'),   fix(S.r, 2)],
      [tr('js.mpx.ro_sum'), '<b>' + fix(sum, 2) + '</b>'],
      [tr('js.mpx.ro_dif'), fix(dif, 2)],
      [tr('js.mpx.ro_hear'), tr(S.mono ? 'js.mpx.h_mono' : 'js.mpx.h_st')]
    ]);
  });

  slider('mpxL', 'mpxLv', function (v) { return fix(v, 2); }, function (v) { S.l = v; f.redraw(); });
  slider('mpxR', 'mpxRv', function (v) { return fix(v, 2); }, function (v) { S.r = v; f.redraw(); });
  check('mpxMono', function (v) { S.mono = v; f.redraw(); });
})();

/* ============================================================
   FIG 6 — everything, in one plane
   ------------------------------------------------------------
   Plot the complex envelope and every scheme in this two-part article is a
   different way of moving one point around. That is not a metaphor; it is
   how a modern radio is actually built.
   ============================================================ */
(function () {
  var cv = document.getElementById('figIQ');
  if (!cv) return;

  var msg = toneMsg(1);
  var MODES = [
    { k: 'js.iq.am',  v: 'am',  note: 'js.iq.n_am' },
    { k: 'js.iq.pm',  v: 'pm',  note: 'js.iq.n_pm' },
    { k: 'js.iq.fm',  v: 'fm',  note: 'js.iq.n_fm' },
    { k: 'js.iq.ssb', v: 'ssb', note: 'js.iq.n_ssb' },
    { k: 'js.iq.qam', v: 'qam', note: 'js.iq.n_qam' }
  ];
  var S = { mode: 'am', t: 0 };
  var out = document.getElementById('iqOut');
  /* a repeatable little hop sequence, so the constellation is the same
     picture on every redraw */
  var HOP = [], rh = Rng(19830523), i;
  for (i = 0; i < 64; i++) HOP.push([(Math.floor(rh() * 4) * 2 - 3) / 3, (Math.floor(rh() * 4) * 2 - 3) / 3]);

  function z(mode, t) {
    if (mode === 'am')  { var e = 0.55 + 0.42 * msg.at(t); return [e, 0]; }
    if (mode === 'pm')  { var p = 2.2 * msg.at(t); return [0.9 * Math.cos(p), 0.9 * Math.sin(p)]; }
    if (mode === 'fm')  { var q = 2.6 * msg.integral(t); return [0.9 * Math.cos(q), 0.9 * Math.sin(q)]; }
    if (mode === 'ssb') { var a = 2 * Math.PI * t; return [0.72 * Math.cos(a), 0.72 * Math.sin(a)]; }
    /* 16-QAM: hold each point for a symbol, then jump */
    var k = Math.floor(t * 6), f2 = clamp((t * 6 - k) * 3.2, 0, 1);
    var A = HOP[((k % HOP.length) + HOP.length) % HOP.length];
    var B = HOP[(((k + 1) % HOP.length) + HOP.length) % HOP.length];
    return [lerp(A[0], B[0], f2) * 0.85, lerp(A[1], B[1], f2) * 0.85];
  }

  var f = Fig(cv, 1.85, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var R = Math.min(w * 0.30, h * 0.42);
    var cx = R + 26, cy = h / 2;
    var P = Plot(cx + R + 34, 16, w - 12, h - 16, 0, 1, -1.15, 1.15);

    /* the plane */
    ctx.strokeStyle = fgA(0.13); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R * 1.22, cy); ctx.lineTo(cx + R * 1.22, cy);
    ctx.moveTo(cx, cy - R * 1.22); ctx.lineTo(cx, cy + R * 1.22); ctx.stroke();
    ctx.font = '500 10px ' + LBL_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = fgA(0.45);
    drawLabel(ctx, 'I', cx + R * 1.22 - 4, cy + 4);
    ctx.textBaseline = 'bottom';
    drawLabel(ctx, 'Q', cx + 9, cy - R * 1.22 + 12);

    if (S.mode === 'qam') {
      var gx, gy;
      for (gx = -3; gx <= 3; gx += 2) for (gy = -3; gy <= 3; gy += 2) {
        dot(ctx, cx + gx / 3 * 0.85 * R, cy - gy / 3 * 0.85 * R, 2.4, fgA(0.28));
      }
    }

    /* where the point has been */
    var N = 150, k, tt, p, x, y;
    ctx.beginPath();
    for (k = 0; k < N; k++) {
      tt = S.t - (N - 1 - k) * 0.008;
      p = z(S.mode, tt);
      x = cx + p[0] * R; y = cy - p[1] * R;
      if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = sigA(0.35); ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.stroke();

    p = z(S.mode, S.t);
    ctx.strokeStyle = sigA(0.7); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + p[0] * R, cy - p[1] * R); ctx.stroke();
    dot(ctx, cx + p[0] * R, cy - p[1] * R, 5, pal().sig, rgba(pal().bg, 1));

    /* and the wave it comes out as */
    var M = Math.max(Math.round(P.w * 5), 500), ys = buf(M), j, t2, q2;
    for (j = 0; j < M; j++) {
      t2 = S.t - 1.1 + j / (M - 1) * 1.1;
      q2 = z(S.mode, t2);
      ys[j] = q2[0] * Math.cos(2 * Math.PI * 15 * t2) - q2[1] * Math.sin(2 * Math.PI * 15 * t2);
    }
    frame(ctx, P, 0.12);
    baseline(ctx, P, 0.14);
    ctx.save(); P.clip(ctx);
    trace(ctx, P, ys, sigA(0.9), 1.2);
    ctx.restore();
    laneName(ctx, P, tr('js.iq.wave'), fgA(0.55));

    if (!out) return;
    var m = MODES.filter(function (o) { return o.v === S.mode; })[0];
    ro(out, [
      [tr('js.iq.ro_path'), '<b>' + tr(m.note) + '</b>'],
      [tr('js.iq.ro_amp'),  tr(S.mode === 'am' || S.mode === 'qam' ? 'js.yes' : 'js.no')],
      [tr('js.iq.ro_ang'),  tr(S.mode === 'am' ? 'js.no' : 'js.yes')]
    ]);
  });

  pills(document.getElementById('iqMode'), MODES.map(function (o) {
    return { label: tr(o.k), v: o.v };
  }), function (it) { S.mode = it.v; f.redraw(); }, 0);

  animate(cv, function (t) { S.t = t * 0.5; f.redraw(); });
})();
/* ============================================================
   Share row
   ============================================================ */
(function () {
  var host = document.getElementById('share');
  if (!host) return;

  /* prefer the canonical URL: this page is also reachable as /index.html,
     and a shared link should always be the one form */
  var canon = document.querySelector('link[rel=canonical]');
  var url = (canon && canon.href) || location.href.split('#')[0];
  var title = (document.querySelector('meta[property="og:title"]') || {}).content
              || document.title;

  var copy = document.getElementById('shareCopy');
  var label = document.getElementById('shareCopyLabel');
  var native = document.getElementById('shareNative');

  function flash(msg) {
    var was = label.textContent;
    label.textContent = msg;
    copy.classList.add('done');
    clearTimeout(copy._t);
    copy._t = setTimeout(function () {
      label.textContent = was === msg ? tr('js.share.copy_link') : was;
      copy.classList.remove('done');
    }, 1800);
  }

  copy.addEventListener('click', function () {
    /* clipboard API needs a secure context; file:// and plain http get the
       textarea fallback rather than a dead button */
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () { flash(tr('js.share.copied')); },
                                             function () { legacy(); });
    } else legacy();
  });

  function legacy() {
    var ta = document.createElement('textarea');
    ta.value = url;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    flash(ok ? tr('js.share.copied') : tr('js.share.press'));
  }

  if (navigator.share) {
    native.hidden = false;
    host.classList.add('has-native');
    native.addEventListener('click', function () {
      navigator.share({ title: title, url: url })['catch'](function () {});
    });
  }
})();

/* ============================================================
   Reading progress bar
   ============================================================ */
(function () {
  var bar = document.getElementById('prog');
  if (!bar) return;
  function upd() {
    var d = document.documentElement;
    var p = d.scrollTop / Math.max(d.scrollHeight - d.clientHeight, 1);
    bar.style.transform = 'scaleX(' + Math.min(Math.max(p, 0), 1) + ')';
  }
  addEventListener('scroll', upd, { passive: true });
  upd();
})();
