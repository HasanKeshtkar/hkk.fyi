"use strict";
/* ============================================================
   "Hiding a voice inside a wave" — part one, AM.
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
   Layout that follows the width
   ------------------------------------------------------------
   A figure is not one picture that gets smaller. It is a stack of lanes, each
   of which needs a minimum height to be a lane at all, and labels that need a
   minimum size to be legible. Holding one aspect ratio across every screen
   breaks both: on a 340-pixel column a two-lane scope drawn at 2:1 is 170
   pixels tall, which leaves each lane about the height of the label sitting
   on it, and the labels themselves — sized in fixed pixels — run off the ends
   and collide with the traces.

   So the aspect ratio is a function of the width, and everything inside is
   measured against the same reading of it. Narrow screens get taller figures
   with smaller type, shorter labels and thinner gutters; where a figure is two
   panels side by side, `narrow` is the signal to stack them instead.
   ============================================================ */
function LAY(w) {
  var narrow = w < 560, tiny = w < 430;
  return {
    w: w, narrow: narrow, tiny: tiny,
    f:  tiny ? 9 : 10,            /* axis ticks and lane names */
    f2: tiny ? 10 : 11,           /* the odd emphasised label  */
    p:  tiny ? 5 : 9,             /* generic breathing room    */
    gut: tiny ? 18 : (narrow ? 26 : 38),   /* left gutter for a y axis */
    lane: tiny ? 8 : 12           /* gap between stacked lanes */
  };
}
/* one aspect ratio for a roomy column, a taller one for a phone */
function AR(wide, narrow) {
  return function (w) { return w < 560 ? narrow : wide; };
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

/* The caption that names a lane in a stacked figure.

   Sized from the plot it sits on, and always given a maximum width: on a
   phone these run the full width of the lane, and a label that overruns its
   own plot lands on top of the trace and then off the edge of the canvas. */
function laneName(ctx, P, text, color) {
  var fz = P.w < 330 ? 9 : (P.w < 520 ? 9.5 : 10.5);
  ctx.font = '500 ' + fz + 'px ' + LBL_FONT;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  /* Punch the page colour in behind it first. On a phone the lanes are short
     and the trace runs right under the caption; without a plate the two
     interleave and neither is readable. */
  var maxW = P.w - 10;
  var tw = Math.min(ctx.measureText(text).width, maxW);
  ctx.fillStyle = rgba(pal().bg, 0.82);
  ctx.fillRect(P.x0 + 2, P.y0 + 2, tw + 6, fz + 5);
  ctx.fillStyle = color || fgA(0.55);
  drawLabel(ctx, text, P.x0 + 5, P.y0 + 4, maxW);
}

/* X-axis ticks. Below about 380 px there is not room for a label every tick,
   so the ticks all stay — they carry the scale — and every other label goes.
   Thinning the ticks instead would change what the axis says. */
function xticks(ctx, P, vals, fmt) {
  var fz = P.w < 330 ? 9 : 10;
  var skip = P.w / Math.max(vals.length, 1) < 52 ? 2 : 1;
  ctx.font = '500 ' + fz + 'px ' + LBL_FONT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  vals.forEach(function (v, i) {
    var x = P.X(v);
    ctx.strokeStyle = fgA(0.2); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, P.y1); ctx.lineTo(x, P.y1 + 4); ctx.stroke();
    if (i % skip) return;
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

/* ---------------- a recording, as a message ----------------
   Same interface as Msg, so the figures take it without knowing the
   difference: at(), integral(), power, top(). Two things are genuinely
   different and both matter.

   A tone has a line spectrum and a recording does not, so anything that draws
   spectral lines takes a Msg and only a Msg — bbLines() would have nothing to
   draw from a clip, and inventing something would be a lie.

   And the integral of real audio wanders. A tone's integral is another tone;
   a recording's is a random walk, and normalising it to a peak of 1 would
   scale the whole thing by whatever the worst excursion happened to be. So
   nothing that carries a clip uses integral() for frequency modulation —
   those paths accumulate phase from the instantaneous frequency instead,
   which is both the definition and the only form that survives real audio. */
function Clip(rate, b64, bandHz) {
  /* base64 in, bytes out, then µ-law out of the bytes. Skipping the first of
     those two steps is a mistake that does not announce itself: the page still
     plays something, and what it plays is the ASCII of the base64 read as
     audio — which sounds exactly like the noise these figures are about. */
  var mu = atob(b64), n = mu.length, i, x = new Float32Array(n), MU = 255, y;
  for (i = 0; i < n; i++) {
    y = mu.charCodeAt(i) / 127.5 - 1;
    x[i] = (y < 0 ? -1 : 1) * (Math.pow(1 + MU, Math.abs(y)) - 1) / MU;
  }
  /* Band-limit to whatever the figure's geometry can actually carry. A real
     AM channel is about 4.5 kHz wide and these carriers are audio frequencies
     rather than radio ones, so the ceiling here is lower still — which is not
     a compromise so much as the point: this is what the scheme delivers. */
  if (bandHz && bandHz < rate / 2) {
    var lp = LPtwo(rate, bandHz), k;
    for (k = 0; k < 3; k++) {
      for (i = 0; i < n; i++) x[i] = lp(x[i]);          /* forwards … */
      for (i = n - 1; i >= 0; i--) x[i] = lp(x[i]);     /* … and back, for flat phase */
    }
  }
  var peak = 0, pwr = 0, dc = 0;
  for (i = 0; i < n; i++) dc += x[i];
  dc /= n;
  for (i = 0; i < n; i++) { x[i] -= dc; if (Math.abs(x[i]) > peak) peak = Math.abs(x[i]); }
  if (!peak) peak = 1;
  for (i = 0; i < n; i++) { x[i] /= peak; pwr += x[i] * x[i]; }

  var dur = n / rate;
  return {
    tones: null,                       /* no line spectrum: see above */
    clip: true,
    dur: dur,
    power: pwr / n,
    top: function () { return bandHz || rate / 2; },
    /* Catmull-Rom between the stored samples, wrapping at the end.

       Straight lines between eight-kilohertz samples would be audible: the
       corners are broken, and a broken corner is a spray of harmonics that
       were never in the recording. Fitting a curve through four points costs
       a few multiplies and puts them below anything the receive filters
       downstream would pass on. */
    at: function (t) {
      var u = t / dur;
      u = (u - Math.floor(u)) * n;
      var k = u | 0, fr = u - k;
      var p0 = x[(k - 1 + n) % n], p1 = x[k], p2 = x[(k + 1) % n], p3 = x[(k + 2) % n];
      var a0 = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
      var a1 = p0 - 2.5 * p1 + 2 * p2 - 0.5 * p3;
      var a2 = -0.5 * p0 + 0.5 * p2;
      return ((a0 * fr + a1) * fr + a2) * fr + p1;
    }
  };
}
/* a one-pole used inside Clip, before LP1 has anything to do with a figure */
function LPtwo(fs, fc) {
  var y = 0, a = 1 - Math.exp(-2 * Math.PI * fc / fs);
  return function (v) { y += a * (v - y); return y; };
}

/* An oscillator as a rotating unit vector.

   Three carriers at a quarter of a million samples a second is a million
   calls to Math.cos per second of audio, and that is most of the time the
   listen button takes. Turning the phasor by a fixed angle each sample is
   four multiplies, and the slow drift in its length is fixed by pulling it
   back onto the unit circle every few thousand steps. */
function Osc(fs, f) {
  var dr = Math.cos(2 * Math.PI * f / fs), di = Math.sin(2 * Math.PI * f / fs);
  var re = 1, im = 0, k = 0;
  return function () {
    var r = re * dr - im * di, i2 = re * di + im * dr;
    re = r; im = i2;
    if ((++k & 2047) === 0) { var m = 1 / Math.sqrt(re * re + im * im); re *= m; im *= m; }
    return re;
  };
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
/* Butterworth low-pass of even order, as `order/2` biquad sections.

   Cascading one-pole sections is cheap and it lies about where its corner is:
   three of them labelled 3 kHz pass 1.5. That was tolerable while every
   message here was a few hundred hertz of synthesised buzz. It is not
   tolerable now that the message can be music, where the difference between
   a 3 kHz ceiling and a 1.5 kHz one is the difference between a radio and a
   telephone. Butterworth is flat up to its corner and steep after it. */
function Butter(fs, fc, order) {
  var k = Math.max(Math.round(order / 2), 1), i, st = [];
  var w0 = 2 * Math.PI * clamp(fc, 1, fs * 0.49) / fs, cw = Math.cos(w0), sw = Math.sin(w0);
  for (i = 0; i < k; i++) {
    var Q = 1 / (2 * Math.cos((2 * i + 1) * Math.PI / (4 * k)));
    var al = sw / (2 * Q), a0 = 1 + al;
    st.push({
      b0: (1 - cw) / 2 / a0, b1: (1 - cw) / a0, b2: (1 - cw) / 2 / a0,
      a1: (-2 * cw) / a0, a2: (1 - al) / a0,
      x1: 0, x2: 0, y1: 0, y2: 0
    });
  }
  return function (x) {
    for (var j = 0; j < k; j++) {
      var q = st[j];
      var y = q.b0 * x + q.b1 * q.x1 + q.b2 * q.x2 - q.a1 * q.y1 - q.a2 * q.y2;
      q.x2 = q.x1; q.x1 = x; q.y2 = q.y1; q.y1 = y;
      x = y;
    }
    return x;
  };
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

    /* Unlocking has to happen inside the click, before any of the work: a
       context created later, off the back of a timer, is not attributable to
       a gesture and some browsers will refuse to start it. */
    unlock: function () { return !!ctx(); },
    rate: function () { var a = ctx(); return a ? a.sampleRate : 48000; },

    /* start(key, data) — the buffer is already built by the time we get here */
    start: function (key, data) {
      var a = ctx();
      if (!a || !data || !data.length) return false;

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

/* ============================================================
   Building the sound a slice at a time
   ------------------------------------------------------------
   Thirty seconds of music pushed through a whole radio at four times the
   output rate is nearly six million samples. Doing that between one line and
   the next locks the browser up for well over a second, and a page that stops
   answering is worse than one that is slow.

   So a figure does not hand back a buffer any more. It hands back a plan: how
   many samples, how much settling to run first, how many to keep out of each
   group, and a step() that produces them strictly in order. The display pulls
   a few thousand from the same step() in one go; the listen button pulls the
   lot in slices, giving the browser its turn between each one so the button
   can say how far along it is.
   ============================================================ */
function pull(step, n, skip, os) {
  var O = os || 1, out = buf(Math.ceil(n / O)), i, k = 0, v;
  for (i = -skip; i < n; i++) {
    v = step(i);
    if (i >= 0 && (i % O) === 0) out[k++] = v;
  }
  return out.subarray(0, k);
}
/* The last few finished renders, kept because the interesting comparisons are
   all A-then-B: amplitude against frequency, above the knee against below it.
   Making the reader wait again to hear the thing they just heard is the one
   delay with no excuse. */
var RENDERED = [];
function cacheGet(key) {
  for (var i = 0; i < RENDERED.length; i++) if (RENDERED[i].key === key) return RENDERED[i].data;
  return null;
}
function cachePut(key, data) {
  RENDERED.unshift({ key: key, data: data });
  if (RENDERED.length > 4) RENDERED.pop();
}

function runPlan(p, onProgress, onDone) {
  var hit = p.key ? cacheGet(p.key) : null;
  if (hit) { setTimeout(function () { onDone(hit); }, 0); return; }

  var O = p.os || 1, out = buf(Math.ceil(p.n / O)), i = -p.skip, k = 0;
  /* Aim at about a frame and a half of work per slice, and adjust after each
     one. Too small and the four-millisecond floor a browser puts under
     setTimeout dominates — three hundred slices is more than a second spent
     waiting for nothing. Too large and the page stops answering, which is the
     thing this exists to avoid. Measuring beats guessing, and it is the only
     version that behaves on a slow phone as well as on this desk. */
  var slice = 32768, TARGET = 24;
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function tick() {
    var t0 = now(), end = Math.min(i + slice, p.n), v;
    try {
      for (; i < end; i++) {
        v = p.step(i);
        if (i >= 0 && (i % O) === 0) out[k++] = v;
      }
    } catch (e) {
      /* Whatever went wrong, the button must not be left saying "building"
         for the rest of the session. Hand back what there is and let the
         caller decide; a short clip is a visible failure, a wedged control
         is an invisible one. */
      onDone(out.subarray(0, k));
      return;
    }
    var dt = now() - t0;
    slice = clamp(Math.round(slice * (dt > 1 ? TARGET / dt : 4)), 8192, 1 << 21);
    if (i < p.n) {
      onProgress((i + p.skip) / (p.n + p.skip));
      setTimeout(tick, 0);
    } else {
      /* joined here rather than by the caller, so what lands in the cache is
         the finished thing and a repeat click is genuinely free */
      var done = seam(out.subarray(0, k), p.sim / O);
      if (p.key) cachePut(p.key, done);
      onDone(done);
    }
  }
  setTimeout(tick, 0);
}

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

  var busy = false;
  btn.addEventListener('click', function () {
    if (busy) return;
    if (AUDIO.playing() === key) { AUDIO.stop(); return; }
    if (!AUDIO.unlock()) { btn.hidden = true; return; }
    busy = true;
    if (lbl) lbl.textContent = tr('js.audio.wait');
    var p;
    try { p = render(AUDIO.rate()); }
    catch (e) { busy = false; if (lbl) lbl.textContent = tr('js.audio.listen');
                if (note) note.textContent = tr('js.audio.failed'); return; }
    runPlan(p,
      function (frac) {
        if (lbl) lbl.textContent = tr('js.audio.wait') + ' ' + fa(Math.round(frac * 100)) + '%';
      },
      function (data) {
        busy = false;
        if (lbl) lbl.textContent = tr('js.audio.listen');
        if (!AUDIO.start(key, data) && note) note.textContent = tr('js.audio.failed');
      });
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

  api.refresh = function () { if (AUDIO.playing() === key) { AUDIO.stop(); btn.click(); } };
  api.stop    = function () { if (AUDIO.playing() === key) AUDIO.stop(); };
  return api;
}

/* Two and a half seconds is long enough not to sound like a loop and short
   enough that regenerating it on every slider release costs nothing. */
var AUDIO_SECONDS = 2.5;
/* the recording gets its whole length: it is a piece of music, not a sample */
var MUSIC_SECONDS = 30;
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
   HERO — a voice, riding
   ------------------------------------------------------------
   The whole article in one picture: a fast carrier whose height is being
   pushed around by a slow message, and the message readable along the top
   of it as a shape rather than as a wave.
   ============================================================ */
(function () {
  var cv = document.getElementById('figHero');
  if (!cv) return;
  /* time is measured in message periods here, so the numbers are ratios and
     nothing depends on a sample rate */
  var msg = voiceMsg(1), FC = 21, M = 0.72;
  var S = { t0: 0 };

  var f = Fig(cv, AR(1.18, 1.18), function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var P = Plot(4, 8, w - 4, h - 8, 0, 2, -1.95, 1.95);
    var N = Math.max(Math.round(w * 5), 700), i, t, e;
    var ys = buf(N), up = buf(N), dn = buf(N);
    for (i = 0; i < N; i++) {
      t = S.t0 + i / (N - 1) * 2;
      e = 1 + M * msg.at(t);
      ys[i] = e * Math.cos(2 * Math.PI * FC * t);
      up[i] = e; dn[i] = -e;
    }
    baseline(ctx, P, 0.16);
    trace(ctx, P, ys, fgA(0.42), 1);
    trace(ctx, P, dn, sigA(0.4), 1.4);
    trace(ctx, P, up, sigA(1), 2.2);
  });

  animate(cv, function (t) { S.t0 = t * 0.22; f.redraw(); });
})();

/* ============================================================
   FIG 1 — the crowded band
   ------------------------------------------------------------
   Three stations, first all shouting at once in the same few kilohertz, then
   each lifted onto its own carrier. The point is not that the carrier version
   looks tidier; it is that in the tidy one there is somewhere to put a filter,
   and you can drag it.

   The frequencies here are audio frequencies, not radio ones — a carrier at
   16 kHz rather than at 1 MHz — because the figure has to be able to play
   itself through a speaker. Every ratio in it is the same as a real band's,
   and the arithmetic does not know the difference.
   ============================================================ */
(function () {
  var cv = document.getElementById('figBand');
  if (!cv) return;

  /* Four times the output rate. A real carrier needs the detector to see it
     as much faster than the message, and at ordinary audio rates a 48 kHz
     carrier does not fit. Everything below runs oversampled and the audio is
     decimated at the very end, where the output is already band-limited and
     the decimation costs nothing. */
  var OS = 4, DISP = 48000 * OS, MDEPTH = 0.85;
  var WMUS = 2500;                        /* what one of these channels carries */

  var VOICES = [voiceMsg(120), voiceMsg(165), voiceMsg(95)];
  var MUSIC = null;                       /* built on first use — see srcOf() */
  var ST = [
    { fc: 16000, name: 'js.band.s1', warp: 1.00, off: 0.0 },
    { fc: 32000, name: 'js.band.s2', warp: 1.28, off: 2.6 },
    { fc: 48000, name: 'js.band.s3', warp: 0.82, off: 5.1 }
  ];
  /* One clip, three stations. Playing it back at three speeds shifts the
     pitch as well as the pace, which is all it takes for three neighbours on
     a dial to be told apart by ear. */
  function warped(c, k, off) {
    return { clip: true, tones: null, dur: c.dur / k, power: c.power,
             top: function () { return c.top() * k; },
             at: function (t) { return c.at(t * k + off); } };
  }
  function srcOf(i) {
    if (!S.music) return VOICES[i];
    if (!MUSIC) {
      var base = Clip(CLIP_RATE, CLIP_MU, WMUS);
      MUSIC = ST.map(function (o) { return warped(base, o.warp, o.off); });
    }
    return MUSIC[i];
  }
  function bandOf(i) { return S.music ? WMUS * ST[i].warp : VOICES[i].top(); }

  /* `bw` is the width the reader asked for; `sec` is what each of the three
     tuned circuits has to be set to in order to deliver it */
  var S = { carriers: true, music: false, ft: 32000, bw: 6000, sec: 6000 };
  function resolve() { S.sec = bwFor(DISP, S.ft, S.bw, 3); }
  resolve();

  var out = document.getElementById('bandOut');
  var cache = Cache();

  /* which station the dial is actually sitting on, or null between them */
  function tuned() {
    var best = -1, bd = 1e9;
    ST.forEach(function (o, i) {
      var d = Math.abs(o.fc - S.ft);
      if (d < bd) { bd = d; best = i; }
    });
    return bd < 5000 ? best : -1;
  }

  /* The whole band, and one receiver pointed at part of it — built once, then
     pulled from. The picture takes a few thousand samples in one go; the
     listen button takes millions in slices. Same step(), same radio. */
  function buildReceive(fs) {
    var sec = fs === DISP ? S.sec : bwFor(fs, S.ft, S.bw, 3);
    var flt = BPBank(fs, S.ft, sec, 3);
    var det = EnvDet(fs, 3 / Math.max(S.ft, 500));
    var dc = DCBlock(fs, 30), lp = Butter(fs, 3200, 6);
    var osc = ST.map(function (o) { return Osc(fs, o.fc); });
    var src = [srcOf(0), srcOf(1), srcOf(2)];
    var carriers = S.carriers;
    return function (i) {
      var t = i / fs, air = 0, k;
      for (k = 0; k < 3; k++) {
        var c = osc[k]();
        air += carriers ? (1 + MDEPTH * src[k].at(t)) * c : src[k].at(t);
      }
      return lp(dc(det(flt(air))));
    };
  }
  function receive(n, fs, skip) { return pull(buildReceive(fs), n, skip, 1); }

  var f = Fig(cv, AR(2.05, 0.98), function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var L = LAY(w);
    var top = Math.round(h * 0.58);
    var XMAX = S.carriers ? 58000 : 4200;
    var SP = Plot(L.gut, 16 + L.f, w - 10, top - 18, 0, XMAX, 0, 1.12);
    f.state.SP = SP;                     /* the drag handler reads this back */
    var TL = Plot(L.gut, top + L.lane, w - 10, h - 22, 0, 1, -1.15, 1.15);

    ctx.drawImage(cache((S.carriers ? 'c' : 'b') + (S.music ? 'm' : 'v'), w, h, function (c) {
      c.font = '500 ' + L.f + 'px ' + LBL_FONT;
      frame(c, SP, 0.14); frame(c, TL, 0.14);
      c.strokeStyle = fgA(0.22); c.lineWidth = 1;
      c.beginPath(); c.moveTo(TL.x0, TL.Y(0)); c.lineTo(TL.x1, TL.Y(0)); c.stroke();
      xticks(c, SP, S.carriers ? [0, 16000, 32000, 48000] : [0, 1000, 2000, 3000, 4000],
             function (v) { return fa(v / 1000) + 'k'; });
      if (!L.tiny) {
        c.save();
        c.translate(L.gut - 26, (SP.y0 + SP.y1) / 2); c.rotate(-Math.PI / 2);
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fgA(0.5);
        drawLabel(c, tr('js.band.axis'), 0, 0, SP.y1 - SP.y0);
        c.restore();
      }
    }), 0, 0, w, h);

    laneName(ctx, SP, tr(S.carriers ? 'js.band.lane1c' : 'js.band.lane1b'));
    laneName(ctx, TL, tr(S.carriers ? 'js.band.lane2c' : 'js.band.lane2b'));

    var ti = tuned(), flt = null;

    /* --- the filter, drawn as the shape it actually is --- */
    if (S.carriers) {
      flt = BPBank(DISP, S.ft, S.sec, 3);
      var N = 300, i, ff, ys = [], best = 0;
      for (i = 0; i <= N; i++) {
        ff = SP.xa + i / N * (SP.xb - SP.xa);
        ys.push(flt.mag(ff));
        if (ys[i] > best) best = ys[i];
      }
      ctx.save(); SP.clip(ctx);
      ctx.beginPath();
      ctx.moveTo(SP.X(SP.xa), SP.Y(0));
      for (i = 0; i <= N; i++) {
        ff = SP.xa + i / N * (SP.xb - SP.xa);
        ctx.lineTo(SP.X(ff), SP.Y(ys[i] / (best || 1) * 1.06));
      }
      ctx.lineTo(SP.X(SP.xb), SP.Y(0));
      ctx.closePath();
      ctx.fillStyle = sigA(0.13); ctx.fill();
      ctx.strokeStyle = sigA(0.55); ctx.lineWidth = 1.3; ctx.stroke();
      ctx.restore();
    }

    /* --- the stations ---
       Tones get lines because tones are lines. A recording does not have a
       line spectrum, so in music mode each station is drawn as the band it
       actually occupies — the honest shape, and the one that makes the
       carrier's isolation at the top of it obvious. */
    ctx.save(); SP.clip(ctx);
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.font = '500 ' + L.f + 'px ' + LBL_FONT;
    ST.forEach(function (o, i) {
      var on = S.carriers && ti === i;
      var col = on ? sigA(1) : fgA(S.carriers ? 0.42 : 0.5);
      var band = bandOf(i), src = srcOf(i);
      if (S.carriers) {
        if (S.music) {
          ctx.fillStyle = on ? sigA(0.32) : fgA(0.16);
          ctx.beginPath();
          for (var q = -1; q <= 1; q += 2) {
            ctx.moveTo(SP.X(o.fc), SP.Y(0));
            for (var u = 0; u <= 1; u += 0.04) {
              ctx.lineTo(SP.X(o.fc + q * u * band), SP.Y(0.44 * Math.pow(1 - u, 0.8)));
            }
            ctx.lineTo(SP.X(o.fc + q * band), SP.Y(0));
          }
          ctx.fill();
        } else {
          src.lines().forEach(function (Ln) {
            var a = MDEPTH * Ln.a / 2;
            stem(ctx, SP, o.fc - Ln.f, a, col, on ? 1.8 : 1.3);
            stem(ctx, SP, o.fc + Ln.f, a, col, on ? 1.8 : 1.3);
          });
        }
        stem(ctx, SP, o.fc, 1, col, on ? 2.4 : 1.8, on ? 2.6 : 0);
      } else if (S.music) {
        ctx.fillStyle = fgA([0.24, 0.18, 0.13][i]);
        ctx.beginPath();
        ctx.moveTo(SP.X(0), SP.Y(0));
        for (var u2 = 0; u2 <= 1; u2 += 0.03) ctx.lineTo(SP.X(u2 * band), SP.Y(0.8 * Math.pow(1 - u2, 0.7)));
        ctx.lineTo(SP.X(band), SP.Y(0));
        ctx.fill();
      } else {
        /* Three stations, three sets of lines, all in the same few hundred
           hertz. Different weights so you can see there are three of them —
           not different positions, because that is exactly the problem. */
        var a3 = [0.62, 0.42, 0.26][i];
        src.lines().forEach(function (Ln) { stem(ctx, SP, Ln.f, Ln.a * 0.9, fgA(a3), 2.2); });
      }
    });
    ctx.restore();
    if (S.carriers) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ST.forEach(function (o, i) {
        ctx.fillStyle = ti === i ? sigA(1) : fgA(0.5);
        drawLabel(ctx, tr(o.name), SP.X(o.fc), SP.Y(1) - 7);
      });
    }

    /* --- the dial --- */
    if (S.carriers) {
      var dx = SP.X(S.ft);
      ctx.strokeStyle = sigA(0.9); ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(dx, SP.y0); ctx.lineTo(dx, SP.y1); ctx.stroke();
      ctx.setLineDash([]);
      dot(ctx, dx, SP.y1, 4.5, pal().sig, rgba(pal().bg, 1));
    }

    /* --- what comes out of the speaker --- */
    var SPAN = S.music ? 0.03 : 0.025;
    var M = Math.round(SPAN * DISP), rec, i2;
    if (S.carriers) {
      rec = receive(M, DISP, Math.round(0.02 * DISP));
      /* Fixed scale, deliberately not auto-ranged. Tune between two stations
         and the trace should go quiet; normalising it would fill the lane
         with amplified nothing and hide the one thing worth seeing. */
      for (i2 = 0; i2 < M; i2++) rec[i2] *= 1.15;
    } else {
      rec = buf(M);
      var sA = srcOf(0), sB = srcOf(1), sC = srcOf(2);
      for (i2 = 0; i2 < M; i2++) {
        var tt = i2 / DISP;
        rec[i2] = sA.at(tt) + sB.at(tt) + sC.at(tt);
      }
      var pp = pk(rec);
      for (i2 = 0; i2 < M; i2++) rec[i2] /= pp;
    }

    ctx.save(); TL.clip(ctx);
    if (S.carriers && ti >= 0) {
      var ref = buf(M), lag, i3, wanted = srcOf(ti);
      for (i3 = 0; i3 < M; i3++) ref[i3] = wanted.at(i3 / DISP);
      /* slide the sent message along to meet the receiver's own delay */
      lag = bestLag(rec, ref, 400);
      for (i3 = 0; i3 < M; i3++) ref[i3] = wanted.at((i3 - lag) / DISP);
      ctx.setLineDash([5, 4]);
      trace(ctx, TL, ref, fgA(0.42), 1.4);
      ctx.setLineDash([]);
    }
    trace(ctx, TL, rec, sigA(1), 1.6);
    ctx.restore();

    /* --- readout --- */
    if (!out) return;
    if (!S.carriers) {
      ro(out, [
        [tr('js.band.ro_state'), '<b>' + tr('js.band.ro_mush') + '</b>'],
        [tr('js.band.ro_span'), fa(0) + ' – ' + hz(Math.round(Math.max(bandOf(0), bandOf(1), bandOf(2))))],
        [tr('js.band.ro_pick'), tr('js.band.ro_no')]
      ]);
      return;
    }
    var wanted2 = ti >= 0 ? flt.mag(ST[ti].fc) : 0, worst = 0;
    ST.forEach(function (o, i) { if (i !== ti) worst = Math.max(worst, flt.mag(o.fc)); });
    var rej = (wanted2 > 1e-9 && worst > 1e-12) ? 20 * Math.log10(wanted2 / worst) : null;
    ro(out, [
      [tr('js.band.ro_dial'), '<b>' + hz(Math.round(S.ft / 100) * 100) + '</b>'],
      [tr('js.band.ro_bw'), hz(Math.round(flt.bw3()))],
      [tr('js.band.ro_state'), ti >= 0 ? '<b>' + tr(ST[ti].name) + '</b>' : tr('js.band.ro_between')],
      [tr('js.band.ro_rej'), ti >= 0 ? (rej === null ? '∞' : db(rej, 0)) : '—']
    ]);
  });

  /* --- controls --- */
  pills(document.getElementById('bandMode'), [
    { label: tr('js.band.mode_b'), c: false },
    { label: tr('js.band.mode_c'), c: true }
  ], function (it) { S.carriers = it.c; f.redraw(); audio.refresh(); }, 1);

  pills(document.getElementById('bandSrc'), [
    { label: tr('js.src.voice'), m: false },
    { label: tr('js.src.music'), m: true }
  ], function (it) { S.music = it.m; f.redraw(); audio.refresh(); }, 0);

  slider('bandBW', 'bandBWv', function (v) { return hz(v); },
    function (v) { S.bw = v; resolve(); f.redraw(); }, function () { audio.refresh(); });

  draggable(cv, function (p) {
    if (!S.carriers || !f.state.SP) return;
    S.ft = clamp(f.state.SP.ix(p.x), 8000, 56000);
    resolve(); f.redraw();
  });
  cv.style.cursor = 'ew-resize';
  /* the dial has to be reachable without a mouse too */
  cv.tabIndex = 0;
  cv.addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowLeft' ? -800 : (e.key === 'ArrowRight' ? 800 : 0);
    if (!d || !S.carriers) return;
    S.ft = clamp(S.ft + d, 8000, 56000); resolve(); f.redraw(); audio.refresh(); e.preventDefault();
  });

  var audio = listen('bandPlay', cv, function (fs) {
    /* Three stations at three speeds are never all periodic together, so
       there is no clean loop length to find — the crossfade in seam() is what
       joins it. */
    var sim = fs * OS, secs = S.music ? MUSIC_SECONDS : AUDIO_SECONDS;
    return { sim: sim, os: OS, skip: Math.round(0.04 * sim),
             key: ['band', fs, S.music ? 'm' : 'v', S.carriers, Math.round(S.ft), Math.round(S.bw)].join('|'),
             n: Math.round(secs * sim), step: buildReceive(sim) };
  });
})();

/* ============================================================
   FIG 2 — three knobs, one message
   ------------------------------------------------------------
   The same message driving all three modulators at once, so the family
   resemblance is visible: AM changes the height, PM changes where the wave
   is in its cycle, FM changes how fast it is going. Switch the message to a
   square and FM turns into two whistles — which is FSK, and which is every
   modem there has ever been.
   ============================================================ */
(function () {
  var cv = document.getElementById('figKnobs');
  if (!cv) return;

  /* time in message periods; the carrier is a ratio, not a frequency */
  var FC = 26, SPAN = 2;
  var MSGS = [
    { k: 'js.knobs.m_tone', m: toneMsg(1) },
    { k: 'js.knobs.m_sq',   m: squareMsg(1, 21) },
    { k: 'js.knobs.m_tri',  m: triMsg(1, 13) },
    { k: 'js.knobs.m_voice', m: voiceMsg(1) }
  ];
  var S = { msg: MSGS[0].m, depth: 0.6 };
  var cache = Cache();

  var LANES = [
    { k: 'js.knobs.l_msg', s: 1.6, f: function (msg, d, t) { return msg.at(t); }, slow: true },
    { k: 'js.knobs.l_am',  s: 1,   f: function (msg, d, t) { return amAt(msg, FC, d, t); } },
    { k: 'js.knobs.l_fm',  s: 1.6, f: function (msg, d, t) { return fmAt(msg, FC, d * 7, t); } },
    { k: 'js.knobs.l_pm',  s: 1.6, f: function (msg, d, t) { return pmAt(msg, FC, d * 7, t); } }
  ];

  var f = Fig(cv, AR(1.55, 0.82), function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var L = LAY(w), pad = L.tiny ? 5 : 8, gap = L.lane, n = LANES.length;
    var lh = (h - pad * 2 - gap * (n - 1)) / n;
    var N = Math.max(Math.round(w * 5), 900);

    ctx.drawImage(cache('g', w, h, function (c) {
      for (var i = 0; i < n; i++) {
        var P = Plot(6, pad + i * (lh + gap), w - 6, pad + i * (lh + gap) + lh, 0, SPAN, -2.1, 2.1);
        frame(c, P, 0.12);
      }
    }), 0, 0, w, h);

    LANES.forEach(function (L, i) {
      var P = Plot(6, pad + i * (lh + gap), w - 6, pad + i * (lh + gap) + lh, 0, SPAN, -2.1, 2.1);
      var ys = buf(N), j;
      for (j = 0; j < N; j++) ys[j] = L.s * L.f(S.msg, S.depth, j / (N - 1) * SPAN);
      baseline(ctx, P, 0.15);
      ctx.save(); P.clip(ctx);
      if (L.slow) {
        trace(ctx, P, ys, sigA(1), 2.1);
      } else {
        /* the message, ghosted behind each carrier, so it is obvious that all
           three lanes are being driven by the same thing */
        var g = buf(N);
        for (j = 0; j < N; j++) g[j] = S.msg.at(j / (N - 1) * SPAN) * 1.55;
        trace(ctx, P, g, fgA(0.16), 1.2);
        trace(ctx, P, ys, sigA(0.95), 1.35);
      }
      ctx.restore();
      laneName(ctx, P, tr(L.k), fgA(0.6));
    });
  });

  pills(document.getElementById('knobsMsg'), MSGS.map(function (o) {
    return { label: tr(o.k), m: o.m };
  }), function (it) { S.msg = it.m; f.redraw(); }, 0);

  slider('knobsDepth', 'knobsDepthv', function (v) {
    return tr('js.knobs.d_am') + ' ' + fix(v, 2) + ' · ' + tr('js.knobs.d_ang') + ' ' + fix(v * 7, 1) + ' rad';
  }, function (v) { S.depth = v; f.redraw(); });
})();

/* ============================================================
   FIG 3 — depth, and breaking it
   ------------------------------------------------------------
   Push m past 1 and the envelope tries to go negative. It cannot: the
   detector is a diode, and a diode has no opinion about sign. What comes out
   is the fold, and the fold is not the message.
   ============================================================ */
(function () {
  var cv = document.getElementById('figDepth');
  if (!cv) return;

  /* Oversampled for the same reason FIG 1 is: a 20 kHz carrier carrying music
     up to 2.5 kHz needs headroom that an ordinary audio rate does not have. */
  var OS = 4, DISP = 48000 * OS, FC = 20000, WMUS = 2500;
  var CLIPMSG = null;
  function music() {
    if (!CLIPMSG) CLIPMSG = Clip(CLIP_RATE, CLIP_MU, WMUS);
    return CLIPMSG;
  }
  var MSGS = [
    { k: 'js.depth.m_tone',  get: function () { return toneMsg(150); } },
    { k: 'js.depth.m_voice', get: function () { return voiceMsg(120); } },
    { k: 'js.src.music',     get: music }
  ];
  MSGS[0].m = MSGS[0].get(); MSGS[1].m = MSGS[1].get();
  var S = { m: 0.7, msg: MSGS[0].m };
  /* how long a slice of time the top lane should show */
  function span() { return S.msg.clip ? 0.006 : 3 / S.msg.tones[0].f; }
  var out = document.getElementById('depthOut');
  var cache = Cache();

  /* The receiver, exactly as section four describes it: rectify, hold, leak.

     Alongside it runs a second copy fed the envelope directly, skipping the
     diode — the answer a detector would give if it could see signs. That is
     the dashed line in the lower lane and the yardstick the distortion figure
     is measured against, and running it through the same two audio filters is
     what keeps the comparison fair: both are delayed and rolled off by the
     same amount, so the only thing left between them is the rectifier. */
  function buildDetect(fs, want) {
    var det = EnvDet(fs, 3 / FC), dc = DCBlock(fs, 25), lp = Butter(fs, 3200, 6);
    var dcI = want ? DCBlock(fs, 25) : null, lpI = want ? Butter(fs, 3200, 6) : null;
    var osc = Osc(fs, FC), m = S.m, msg = S.msg;
    var api = { ideal: 0, step: function (i) {
      var t = i / fs, env = 1 + m * msg.at(t);
      var v = lp(dc(det(env * osc())));
      if (want) api.ideal = lpI(dcI(env));
      return v;
    } };
    return api;
  }
  function detect(n, fs, skip, want) {
    var b = buildDetect(fs, want), o = buf(n), id = want ? buf(n) : null, i, v;
    for (i = -skip; i < n; i++) {
      v = b.step(i);
      if (i >= 0) { o[i] = v; if (want) id[i] = b.ideal; }
    }
    return want ? { rx: o, ideal: id } : o;
  }

  var f = Fig(cv, AR(1.75, 0.95), function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var L = LAY(w), top = Math.round(h * 0.56);
    var TX = Plot(8, 10, w - 8, top - L.lane / 2, 0, 1, -2.7, 2.7);
    var RX = Plot(8, top + L.lane / 2, w - 8, h - 10, 0, 1, -1.35, 1.35);

    ctx.drawImage(cache('g', w, h, function (c) {
      frame(c, TX, 0.13); frame(c, RX, 0.13);
    }), 0, 0, w, h);

    /* --- transmitted --- */
    var N = Math.max(Math.round(w * 6), 1200), i, t, e;
    var SPAN = span();
    var ys = buf(N), up = buf(N), dn = buf(N);
    var crosses = false;
    for (i = 0; i < N; i++) {
      t = i / (N - 1) * SPAN;
      e = 1 + S.m * S.msg.at(t);
      if (e < -0.002) crosses = true;   /* an exact graze at m = 1 is not a fold */
      ys[i] = e * Math.cos(2 * Math.PI * FC * t);
      up[i] = e; dn[i] = -e;
    }
    ctx.save(); TX.clip(ctx);
    trace(ctx, TX, ys, fgA(0.4), 1);
    trace(ctx, TX, dn, crosses ? fgA(0.35) : sigA(0.4), 1.3);
    trace(ctx, TX, up, crosses ? fgA(0.75) : sigA(1), 2);
    if (crosses) {
      /* what the diode will actually follow, once the envelope has folded */
      var fold = buf(N);
      for (i = 0; i < N; i++) fold[i] = Math.abs(up[i]);
      trace(ctx, TX, fold, sigA(1), 2);
    }
    ctx.restore();
    laneName(ctx, TX, tr('js.depth.l_tx'), fgA(0.6));

    /* --- received --- */
    var M = Math.round(SPAN * DISP);
    var D = detect(M, DISP, Math.round(0.01 * DISP), true);
    var rec = D.rx, ref = D.ideal;
    ctx.save(); RX.clip(ctx);
    ctx.setLineDash([5, 4]);
    trace(ctx, RX, ref, fgA(0.45), 1.4);
    ctx.setLineDash([]);
    trace(ctx, RX, rec, sigA(1), 1.8);
    ctx.restore();
    laneName(ctx, RX, tr('js.depth.l_rx'), fgA(0.6));

    if (!out) return;
    var d = fitErr(rec, ref).ratio * 100;
    ro(out, [
      [tr('js.depth.ro_m'),    '<b>' + fix(S.m, 2) + '</b>' + (S.m > 1 ? ' · ' + fa(Math.round(S.m * 100)) + '%' : '')],
      [tr('js.depth.ro_zero'), crosses ? '<b>' + tr('js.yes') + '</b>' : tr('js.no')],
      [tr('js.depth.ro_dist'), '<b>' + fix(d, 1) + ' %</b>'],
      [tr('js.depth.ro_state'), tr(crosses ? 'js.depth.ro_broken' : (S.m > 0.95 ? 'js.depth.ro_edge' : 'js.depth.ro_ok'))]
    ]);
  });

  pills(document.getElementById('depthMsg'), MSGS.map(function (o) {
    return { label: tr(o.k), o: o };
  }), function (it) { S.msg = it.o.m || (it.o.m = it.o.get()); f.redraw(); audio.refresh(); }, 0);

  slider('depthM', 'depthMv', function (v) { return 'm = ' + fix(v, 2); },
    function (v) { S.m = v; f.redraw(); }, function () { audio.refresh(); });

  var audio = listen('depthPlay', cv, function (fs) {
    var sim = fs * OS;
    var n = S.msg.clip ? Math.round(S.msg.dur * sim) : loopLen(sim, S.msg.tones[0].f);
    return { sim: sim, os: OS, skip: Math.round(0.02 * sim), n: n,
             key: ['depth', fs, MSGS.map(function (o) { return o.m === S.msg; }).indexOf(true), S.m.toFixed(3)].join('|'),
             step: buildDetect(sim, false).step };
  });
})();

/* ============================================================
   FIG 4 — where the power goes
   ------------------------------------------------------------
   The bill for a receiver made of a diode and a coil. The carrier is a
   constant: it says nothing, it changes with nothing, and at full modulation
   it is still eating two thirds of the transmitter.
   ============================================================ */
(function () {
  var cv = document.getElementById('figPower');
  if (!cv) return;

  var MSGS = [
    { k: 'js.pw.m_tone',  m: toneMsg(150) },
    { k: 'js.pw.m_voice', m: voiceMsg(120) },
    { k: 'js.pw.m_sq',    m: squareMsg(150, 21) }
  ];
  var S = { m: 1, msg: MSGS[0].m };
  var out = document.getElementById('powerOut');
  var cache = Cache();

  /* the fraction of the transmitted power that is doing any work */
  function eff(m, msg) { var s = m * m * msg.power; return s / (1 + s); }

  var f = Fig(cv, AR(2.3, 1.15), function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var L = LAY(w);
    var barTop = 16, barH = L.tiny ? 30 : 40;
    var BAR = Plot(10, barTop, w - 10, barTop + barH, 0, 1, 0, 1);
    var CV  = Plot(L.tiny ? 30 : 44, barTop + barH + (L.tiny ? 26 : 34), w - 12,
                   h - (L.tiny ? 30 : 36), 0, 1.5, 0, 1);

    ctx.drawImage(cache('g', w, h, function (c) {
      frame(c, CV, 0.13);
      c.font = '500 ' + L.f + 'px ' + LBL_FONT;
      xticks(c, CV, [0, 0.5, 1, 1.5], function (v) { return fa(v.toFixed(1)); });
      /* the two thirds line, so the number in the prose has somewhere to land */
      c.strokeStyle = fgA(0.25); c.lineWidth = 1; c.setLineDash([3, 3]);
      c.beginPath(); c.moveTo(CV.x0, CV.Y(1 / 3)); c.lineTo(CV.x1, CV.Y(1 / 3)); c.stroke();
      c.setLineDash([]);
      c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillStyle = fgA(0.5);
      drawLabel(c, fa('1/3'), CV.x0 - 6, CV.Y(1 / 3));
      drawLabel(c, fa('0'),   CV.x0 - 6, CV.Y(0));
      drawLabel(c, fa('1'),   CV.x0 - 6, CV.Y(1));
      c.textAlign = 'center'; c.textBaseline = 'top';
      drawLabel(c, tr('js.pw.xaxis'), (CV.x0 + CV.x1) / 2, CV.y1 + 18, CV.w);
    }), 0, 0, w, h);

    /* --- the split, as one bar --- */
    var e = eff(S.m, S.msg), xc = BAR.X(1 - e);
    ctx.fillStyle = fgA(0.18);
    ctx.fillRect(BAR.x0, BAR.y0, xc - BAR.x0, barH);
    ctx.fillStyle = sigA(0.85);
    ctx.fillRect(xc, BAR.y0, BAR.x1 - xc, barH);
    ctx.strokeStyle = fgA(0.3); ctx.lineWidth = 1;
    ctx.strokeRect(BAR.x0 + 0.5, BAR.y0 + 0.5, BAR.w - 1, barH - 1);

    ctx.font = '500 ' + L.f2 + 'px ' + LBL_FONT;
    ctx.textBaseline = 'middle';
    var my = BAR.y0 + barH / 2;
    if (xc - BAR.x0 > 90) {
      ctx.textAlign = 'left'; ctx.fillStyle = fgA(0.8);
      drawLabel(ctx, tr('js.pw.carrier') + '  ' + fa(Math.round((1 - e) * 100)) + '%', BAR.x0 + 9, my);
    }
    if (BAR.x1 - xc > 90) {
      ctx.textAlign = 'right'; ctx.fillStyle = rgba(pal().bg, 1);
      drawLabel(ctx, fa(Math.round(e * 100)) + '%  ' + tr('js.pw.sidebands'), BAR.x1 - 9, my);
    }

    /* --- efficiency against depth --- */
    var N = 200, ys = buf(N + 1), i;
    for (i = 0; i <= N; i++) ys[i] = eff(i / N * 1.5, S.msg);
    ctx.save(); CV.clip(ctx);
    trace(ctx, CV, ys, sigA(0.9), 2);
    /* beyond m = 1 the curve keeps rising and the signal stops being
       recoverable, so the useful part of it stops there */
    ctx.fillStyle = fgA(0.07);
    ctx.fillRect(CV.X(1), CV.y0, CV.x1 - CV.X(1), CV.h);
    ctx.strokeStyle = fgA(0.3); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(CV.X(1), CV.y0); ctx.lineTo(CV.X(1), CV.y1); ctx.stroke();
    ctx.setLineDash([]);
    dot(ctx, CV.X(S.m), CV.Y(e), 5, pal().sig, rgba(pal().bg, 1));
    ctx.restore();
    ctx.font = '500 ' + L.f + 'px ' + LBL_FONT;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = fgA(0.45);
    drawLabel(ctx, tr('js.pw.overmod'), CV.X(1) + 6, CV.y0 + 5, CV.x1 - CV.X(1) - 10);

    if (!out) return;
    ro(out, [
      [tr('js.pw.ro_m'),    '<b>' + fix(S.m, 2) + '</b>'],
      [tr('js.pw.ro_mean'), fix(S.msg.power, 3)],
      [tr('js.pw.ro_car'),  fa(Math.round((1 - e) * 100)) + ' %'],
      [tr('js.pw.ro_side'), '<b>' + fa(Math.round(e * 100)) + ' %</b>'],
      [tr('js.pw.ro_ssb'),  fa('100') + ' %']
    ]);
  });

  pills(document.getElementById('powerMsg'), MSGS.map(function (o) {
    return { label: tr(o.k), m: o.m };
  }), function (it) { S.msg = it.m; f.redraw(); }, 0);

  slider('powerM', 'powerMv', function (v) { return 'm = ' + fix(v, 2); },
    function (v) { S.m = v; f.redraw(); });
})();

/* ============================================================
   FIG 5 — two sidebands, and a spike that says nothing
   ------------------------------------------------------------
   Take the carrier away and the envelope stops being the message. Take one
   sideband away as well and, for a single tone, the envelope stops existing:
   what is left is a plain sine wave at the wrong frequency. Everything the
   receiver needs to put it right has to come from inside the receiver.
   ============================================================ */
(function () {
  var cv = document.getElementById('figSide');
  if (!cv) return;

  /* m = 1, so the sidebands are as tall as amplitude modulation ever lets
     them be and the gap where the carrier used to stand is unmissable */
  var FC = 10000, M = 1;
  var MODES = [
    { k: 'js.side.am',  v: 'am'  },
    { k: 'js.side.dsb', v: 'dsb' },
    { k: 'js.side.usb', v: 'usb' },
    { k: 'js.side.lsb', v: 'lsb' }
  ];
  /* Every preset is scaled so that its highest note still lands inside the
     window at the top of the pitch slider. A sideband drawn off the edge of
     the plot is a sideband the reader is entitled to think is not there. */
  var KINDS = [
    { k: 'js.side.k_one', f: function (f0) { return toneMsg(f0); } },
    { k: 'js.side.k_two', f: function (f0) { return twoToneMsg(f0, f0 * 1.6); } },
    { k: 'js.side.k_voice', f: function (f0) { return voiceMsg(f0 * 0.28); } }
  ];
  var S = { mode: 'am', kind: KINDS[0], f0: 1200, msg: null };
  function rebuild() { S.msg = S.kind.f(S.f0); }
  rebuild();

  var out = document.getElementById('sideOut');
  var cache = Cache();

  var f = Fig(cv, AR(1.95, 0.95), function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var L = LAY(w);
    var top = Math.round(h * 0.56);
    var SP = Plot(L.tiny ? 14 : 30, 14, w - 12, top - 22, FC - 4200, FC + 4200, 0, 1.14);
    var TL = Plot(L.tiny ? 14 : 30, top + L.lane, w - 12, h - 16, 0, 1, -2.1, 2.1);

    ctx.drawImage(cache('g', w, h, function (c) {
      frame(c, SP, 0.13); frame(c, TL, 0.13);
      c.strokeStyle = fgA(0.2); c.lineWidth = 1;
      c.beginPath(); c.moveTo(TL.x0, TL.Y(0)); c.lineTo(TL.x1, TL.Y(0)); c.stroke();
      xticks(c, SP, [FC - 4000, FC - 2000, FC, FC + 2000, FC + 4000], function (v) {
        var d = v - FC;
        return d === 0 ? tr('js.side.fc') : (d > 0 ? '+' : '−') + fa(Math.abs(d) / 1000) + 'k';
      });
      /* the carrier's own position, marked whether or not anything is there —
         the empty slot is the point of the DSB-SC case */
      c.strokeStyle = fgA(0.18); c.setLineDash([2, 4]); c.lineWidth = 1;
      c.beginPath(); c.moveTo(SP.X(FC), SP.y0); c.lineTo(SP.X(FC), SP.y1); c.stroke();
      c.setLineDash([]);
    }), 0, 0, w, h);

    laneName(ctx, SP, tr('js.side.l_spec'), fgA(0.6));
    laneName(ctx, TL, tr('js.side.l_time'), fgA(0.6));

    /* --- spectrum --- */
    var lines = bbLines(S.msg, FC, M, S.mode);
    ctx.save(); SP.clip(ctx);
    if (S.mode !== 'am') {
      /* the ghost of the carrier: where it stood, and how big it was next to
         everything else. Without it the suppressed-carrier modes look like a
         quieter picture rather than the same picture with the expensive part
         taken out. */
      ctx.setLineDash([3, 4]);
      stem(ctx, SP, FC, 1, fgA(0.28), 2);
      ctx.setLineDash([]);
    }
    lines.forEach(function (L) {
      stem(ctx, SP, L.f, L.a, L.carrier ? fgA(0.75) : sigA(1), L.carrier ? 2.4 : 2, L.carrier ? 3 : 2.4);
    });
    ctx.restore();
    if (S.mode !== 'am') {
      ctx.font = '500 ' + L.f + 'px ' + LBL_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = fgA(0.5);
      drawLabel(ctx, tr('js.side.nocarrier'), SP.X(FC), SP.Y(1) + 6, SP.w * 0.6);
    }

    /* --- time, with the shape a diode would follow --- */
    var N = Math.max(Math.round(w * 6), 1400), i, t, c, SPAN = 3 / S.f0;
    var ys = buf(N), up = buf(N), dn = buf(N);
    for (i = 0; i < N; i++) {
      t = i / (N - 1) * SPAN;
      c = bb(S.msg, M, S.mode, t);
      ys[i] = bbWave(c, FC, t);
      up[i] = bbEnv(c); dn[i] = -up[i];
    }
    ctx.save(); TL.clip(ctx);
    trace(ctx, TL, ys, fgA(0.42), 1);
    trace(ctx, TL, dn, sigA(0.4), 1.3);
    trace(ctx, TL, up, sigA(1), 2);
    ctx.restore();

    if (!out) return;
    var span = S.msg.top();
    ro(out, [
      [tr('js.side.ro_lines'), '<b>' + fa(lines.length) + '</b>'],
      [tr('js.side.ro_bw'),    '<b>' + hz(S.mode === 'usb' || S.mode === 'lsb' ? span : 2 * span) + '</b>'],
      [tr('js.side.ro_car'),   tr(S.mode === 'am' ? 'js.yes' : 'js.no')],
      [tr('js.side.ro_env'),   tr(S.mode === 'am' ? 'js.side.env_yes'
                                  : (S.mode === 'dsb' ? 'js.side.env_rect' : 'js.side.env_no'))],
      [tr('js.side.ro_rx'),    tr(S.mode === 'am' ? 'js.side.rx_diode' : 'js.side.rx_lo')]
    ]);
  });

  pills(document.getElementById('sideMode'), MODES.map(function (o) {
    return { label: tr(o.k), v: o.v };
  }), function (it) { S.mode = it.v; f.redraw(); }, 0);

  pills(document.getElementById('sideKind'), KINDS.map(function (o) {
    return { label: tr(o.k), o: o };
  }), function (it) { S.kind = it.o; rebuild(); f.redraw(); }, 0);

  slider('sideFm', 'sideFmv', function (v) { return hz(v); },
    function (v) { S.f0 = v; rebuild(); f.redraw(); });
})();

/* ============================================================
   FIG 6 — static
   ------------------------------------------------------------
   The case against AM, in one slider. Nature writes in amplitude, AM's
   message *is* amplitude, and the detector has no way of telling which of the
   two it is looking at — so it passes both on faithfully.
   ============================================================ */
(function () {
  var cv = document.getElementById('figStatic');
  if (!cv) return;

  var OS = 4, DISP = 48000 * OS, FC = 20000, WMUS = 2500, M = 0.8;
  var VOICE = voiceMsg(120), CLIPMSG = null;
  function music() {
    if (!CLIPMSG) CLIPMSG = Clip(CLIP_RATE, CLIP_MU, WMUS);
    return CLIPMSG;
  }
  var S = { cn: 26, music: false };
  function msgNow() { return S.music ? music() : VOICE; }
  /* the receiver's own front end: wide enough for the message it is carrying */
  function bwNow() { return S.music ? 2 * WMUS * 1.15 : 2600; }
  var out = document.getElementById('staticOut');
  var cache = Cache();

  /* How loud is white noise once the receiver's own filter has had it? Push
     unit-variance noise through a copy of the front end and measure. Doing it
     rather than deriving it means the number is right whatever the filter is,
     and the decibels on the slider are decibels a meter would agree with. */
  var NR = {};
  function noiseRef(fs, bw) {
    var key = fs + '|' + Math.round(bw);
    if (NR[key]) return NR[key];
    var flt = BPBank(fs, FC, bw, 3), rng = Rng(7), n = 32768, tmp = buf(n), i;
    gaussFill(tmp, rng, 1);
    for (i = 0; i < n; i++) tmp[i] = flt(tmp[i]);
    NR[key] = Math.max(rms(tmp.subarray(n >> 2)), 1e-9);
    return NR[key];
  }

  /* The whole radio: transmitter, sky, receiver — run twice side by side, once
     with the storm and once without.

     The quiet copy is what makes the measurement mean anything. A receiver's
     filters delay and colour everything they pass, storm or no storm, and
     scoring the noisy output against the raw message would charge all of that
     to the noise: at a carrier forty decibels clear of the interference the
     figure would still read "gone". Comparing the two runs isolates exactly
     the part the slider is responsible for, and it is what the dashed line in
     the lower lane is too. */
  function buildLink(fs, cn, quiet) {
    var msg = msgNow(), BW = bwNow();
    /* an unmodulated carrier of unit height has an rms of 1/√2 — that is the
       C the carrier-to-noise ratio is named after */
    var g = (Math.SQRT1_2 / Math.pow(10, cn / 20)) / noiseRef(fs, BW);
    var AF = Math.min(BW / 2, 3200);
    var fN = BPBank(fs, FC, BW, 3), dN = EnvDet(fs, 3 / FC), cN = DCBlock(fs, 25), lN = Butter(fs, AF, 6);
    var fQ, dQ, cQ, lQ;
    if (quiet) { fQ = BPBank(fs, FC, BW, 3); dQ = EnvDet(fs, 3 / FC); cQ = DCBlock(fs, 25); lQ = Butter(fs, AF, 6); }
    var oscN = Osc(fs, FC), oscQ = quiet ? Osc(fs, FC) : null;
    var rng = Rng(20260809);
    var api = { air: 0, clean: 0 };
    var u, v, r, th, z = 0, have = false, nz, s;
    api.step = function (i) {
      /* Box–Muller, one pair at a time, so the noise stream does not depend
         on how long the buffer happens to be */
      if (have) { nz = z; have = false; }
      else {
        u = Math.max(rng(), 1e-12); r = Math.sqrt(-2 * Math.log(u)); th = 2 * Math.PI * rng();
        nz = r * Math.cos(th); z = r * Math.sin(th); have = true;
      }
      s = (1 + M * msg.at(i / fs)) * oscN();
      v = fN(s + g * nz);
      u = lN(cN(dN(v)));
      if (quiet) api.clean = lQ(cQ(dQ(fQ(s))));
      api.air = v;
      return u;
    };
    return api;
  }
  function link(n, fs, skip, cn, quiet) {
    var b = buildLink(fs, cn, quiet);
    var rx = buf(n), air = buf(n), cl = quiet ? buf(n) : null, i, v;
    for (i = -skip; i < n; i++) {
      v = b.step(i);
      if (i >= 0) { rx[i] = v; air[i] = b.air; if (quiet) cl[i] = b.clean; }
    }
    return { air: air, rx: rx, clean: cl };
  }

  var f = Fig(cv, AR(1.8, 0.95), function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var L = LAY(w), top = Math.round(h * 0.5);
    var TX = Plot(8, 10, w - 8, top - L.lane / 2, 0, 1, -2.4, 2.4);
    var RX = Plot(8, top + L.lane / 2, w - 8, h - 10, 0, 1, -1.3, 1.3);

    ctx.drawImage(cache('g', w, h, function (c) {
      frame(c, TX, 0.13); frame(c, RX, 0.13);
    }), 0, 0, w, h);

    var SPAN = S.music ? 0.02 : 3 / 120, N = Math.round(SPAN * DISP), i;
    var L2 = link(N, DISP, Math.round(0.012 * DISP), S.cn, true);
    var ref = L2.clean;

    ctx.save(); TX.clip(ctx);
    trace(ctx, TX, L2.air, fgA(0.5), 1);
    ctx.restore();
    laneName(ctx, TX, tr('js.static.l_air'), fgA(0.6));

    ctx.save(); RX.clip(ctx);
    ctx.setLineDash([5, 4]);
    trace(ctx, RX, ref, fgA(0.45), 1.4);
    ctx.setLineDash([]);
    trace(ctx, RX, L2.rx, sigA(1), 1.6);
    ctx.restore();
    laneName(ctx, RX, tr('js.static.l_rx'), fgA(0.6));

    if (!out) return;
    /* the message that got through, against the noise that came with it */
    var e = 0, p = 0, d;
    for (i = 0; i < N; i++) { d = L2.rx[i] - ref[i]; e += d * d; p += ref[i] * ref[i]; }
    var snr = (e < 1e-14 || p < 1e-16) ? 99 : clamp(10 * Math.log10(p / e), -20, 99);
    var verdict = snr > 26 ? 'js.static.v_clean'
                : snr > 15 ? 'js.static.v_hiss'
                : snr > 5  ? 'js.static.v_rough'
                :            'js.static.v_gone';
    ro(out, [
      [tr('js.static.ro_cn'),  '<b>' + db(S.cn, 0) + '</b>'],
      [tr('js.static.ro_snr'), '<b>' + db(Math.min(snr, 99), 0) + '</b>'],
      [tr('js.static.ro_gain'), fix(snr - S.cn, 1) + ' dB'],
      [tr('js.static.ro_v'),   tr(verdict)]
    ]);
  });

  slider('staticCN', 'staticCNv', function (v) { return db(v, 0); },
    function (v) { S.cn = v; f.redraw(); }, function () { audio.refresh(); });

  pills(document.getElementById('staticSrc'), [
    { label: tr('js.src.voice'), m: false },
    { label: tr('js.src.music'), m: true }
  ], function (it) { S.music = it.m; f.redraw(); audio.refresh(); }, 0);

  var audio = listen('staticPlay', cv, function (fs) {
    var sim = fs * OS;
    var n = S.music ? Math.round(music().dur * sim) : loopLen(sim, 120);
    return { sim: sim, os: OS, skip: Math.round(0.03 * sim), n: n,
             key: ['static', fs, S.music ? 'm' : 'v', S.cn].join('|'),
             step: buildLink(sim, S.cn, false).step };
  });
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
