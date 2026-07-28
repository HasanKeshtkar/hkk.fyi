"use strict";
/* ============================================================
   "Folding infinity into a circle" — interactive figures.
   No dependencies, no network. Everything draws to <canvas>
   using the page's three CSS hues so it follows the theme.
   ============================================================ */

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

/* ---------------- complex ---------------- */
function C(re, im) { return { re: re, im: im === undefined ? 0 : im }; }
function cadd(a, b) { return C(a.re + b.re, a.im + b.im); }
function csub(a, b) { return C(a.re - b.re, a.im - b.im); }
function cmul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
function cdiv(a, b) {
  var d = b.re * b.re + b.im * b.im;
  if (d === 0) return C(1e12, 0);
  return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
}
function cabs(a) { return Math.hypot(a.re, a.im); }
function carg(a) { return Math.atan2(a.im, a.re); }
function cinv(a) { return cdiv(C(1), a); }
function expj(t) { return C(Math.cos(t), Math.sin(t)); }

var Z0 = 50;
function gOf(z) { return cdiv(csub(z, C(1)), cadd(z, C(1))); }          // z normalized
function zOf(g) {
  var d = csub(C(1), g);
  if (cabs(d) < 1e-9) return C(1e9, 0);
  return cdiv(cadd(C(1), g), d);
}
function swrOf(g) { var m = Math.min(cabs(g), 1); return m > 0.99999 ? Infinity : (1 + m) / (1 - m); }
function rlOf(g)  { var m = cabs(g); return m < 1e-9 ? Infinity : -20 * Math.log10(m); }

/* ---------------- number formatting ---------------- */
function nf(v, p) {
  if (!isFinite(v)) return '∞';
  if (Math.abs(v) >= 1e6) return '∞';
  var s = parseFloat(v.toPrecision(p || 3)).toString();
  return s.replace('-', '−');
}
function nz(z, unit) {                                   // complex, engineering style
  if (Math.abs(z.re) >= 1e6) return '∞';
  return nf(z.re) + (z.im < 0 ? ' − j' : ' + j') + nf(Math.abs(z.im)) + (unit ? ' ' + unit : '');
}
function eng(v, unit) {
  if (!isFinite(v)) return '∞ ' + unit;
  var t = [[1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']], a = Math.abs(v), i;
  if (a >= 1) return nf(v) + ' ' + unit;
  for (i = 0; i < t.length; i++) if (a >= t[i][0] * 0.999) return nf(v / t[i][0]) + ' ' + t[i][1] + unit;
  return nf(v / 1e-15) + ' f' + unit;
}

/* ---------------- canvas plumbing ---------------- */
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

/* ============================================================
   Smith chart primitives — everything in Γ units, radius 1
   ============================================================ */
function Geo(w, h, pad) {
  var R = Math.min(w, h) / 2 - (pad === undefined ? 16 : pad);
  return { cx: w / 2, cy: h / 2, R: R,
    X: function (g) { return w / 2 + g.re * R; },
    Y: function (g) { return h / 2 - g.im * R; },
    inv: function (x, y) { return C((x - w / 2) / R, (h / 2 - y) / R); } };
}

var R_MAJOR = [0.2, 0.5, 1, 2, 5];
var R_MINOR = [0.1, 0.3, 0.4, 0.6, 0.8, 1.5, 3, 10, 20];
var X_MAJOR = [0.2, 0.5, 1, 2, 5];
var X_MINOR = [0.1, 0.3, 0.4, 0.6, 0.8, 1.5, 3, 10, 20];

function arcR(ctx, G, r, flip) {
  var s = flip ? -1 : 1;
  ctx.beginPath();
  ctx.arc(G.cx + s * G.R * r / (1 + r), G.cy, G.R / (1 + r), 0, Math.PI * 2);
  ctx.stroke();
}
function arcX(ctx, G, x, flip) {
  if (Math.abs(x) < 1e-9) return;
  var s = flip ? -1 : 1;
  ctx.beginPath();
  ctx.arc(G.cx + s * G.R, G.cy - G.R / x, G.R / Math.abs(x), 0, Math.PI * 2);
  ctx.stroke();
}

/* full grid. flip = true → admittance grid (mirrored) */
function grid(ctx, G, flip, strong) {
  var i;
  ctx.save();
  ctx.beginPath(); ctx.arc(G.cx, G.cy, G.R, 0, Math.PI * 2); ctx.clip();

  ctx.lineWidth = 0.7;
  ctx.strokeStyle = flip ? sigA(strong ? 0.28 : 0.16) : fgA(strong ? 0.20 : 0.12);
  for (i = 0; i < R_MINOR.length; i++) arcR(ctx, G, R_MINOR[i], flip);
  for (i = 0; i < X_MINOR.length; i++) { arcX(ctx, G, X_MINOR[i], flip); arcX(ctx, G, -X_MINOR[i], flip); }

  ctx.lineWidth = 1;
  ctx.strokeStyle = flip ? sigA(strong ? 0.5 : 0.3) : fgA(strong ? 0.42 : 0.26);
  for (i = 0; i < R_MAJOR.length; i++) arcR(ctx, G, R_MAJOR[i], flip);
  for (i = 0; i < X_MAJOR.length; i++) { arcX(ctx, G, X_MAJOR[i], flip); arcX(ctx, G, -X_MAJOR[i], flip); }
  ctx.restore();

  /* the real axis and the rim */
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = fgA(0.45);
  ctx.beginPath(); ctx.moveTo(G.cx - G.R, G.cy); ctx.lineTo(G.cx + G.R, G.cy); ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = fgA(0.75);
  ctx.beginPath(); ctx.arc(G.cx, G.cy, G.R, 0, Math.PI * 2); ctx.stroke();
}

function labelsR(ctx, G) {
  ctx.font = '500 10px ui-monospace, "IBM Plex Mono", monospace';
  ctx.fillStyle = fgA(0.55);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  [0.2, 0.5, 1, 2, 5].forEach(function (r) {
    var x = G.X(C((r - 1) / (r + 1), 0));
    ctx.fillText(String(r), x, G.cy + 4);
  });
}
function landmarks(ctx, G) {
  ctx.font = '500 10px ui-monospace, "IBM Plex Mono", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fgA(0.55);
  /* clear of the real axis by enough that a marker parked on the short- or
     open-circuit point does not stack its own readout on top of these */
  ctx.textAlign = 'left';  ctx.fillText('SHORT', G.cx - G.R + 5, G.cy - 17);
  ctx.textAlign = 'right'; ctx.fillText('OPEN',  G.cx + G.R - 5, G.cy - 17);
  ctx.textAlign = 'center';
  ctx.fillStyle = fgA(0.4);
  ctx.fillText('INDUCTIVE  +jX', G.cx, G.cy - G.R * 0.72);
  ctx.fillText('CAPACITIVE −jX', G.cx, G.cy + G.R * 0.72);
}
function dot(ctx, x, y, r, fill, ring) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  if (ring) { ctx.lineWidth = 2; ctx.strokeStyle = ring; ctx.stroke(); }
}
function tag(ctx, x, y, text, color) {
  ctx.font = '500 11px ui-monospace, "IBM Plex Mono", monospace';
  var w = ctx.measureText(text).width + 10;
  ctx.fillStyle = rgba(pal().bg, 0.88);
  ctx.fillRect(x + 9, y - 9, w, 17);
  ctx.fillStyle = color;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 14, y);
}
/* One small number printed radially, the way a real chart's rim scales are
   set: reading outward from the centre, and flipped on the left half so it
   never ends up upside down. `th` is a Γ-plane angle (maths convention,
   anticlockwise), so the canvas rotation is its negative. */
function radialText(ctx, G, rr, th, txt) {
  ctx.save();
  ctx.translate(G.cx + rr * Math.cos(th), G.cy - rr * Math.sin(th));
  ctx.rotate(-th + (Math.cos(th) < 0 ? Math.PI : 0));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, 0, 0);
  ctx.restore();
}
function clear(f) {
  f.ctx.clearRect(0, 0, f.w, f.h);
}

/* small helper: write a <dl class=ro> */
function ro(el, rows) {
  var h = '';
  rows.forEach(function (r) { h += '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; });
  el.innerHTML = h;
}
function pills(host, items, onPick, initial) {
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

/* ============================================================
   HERO — the chart as it actually ships: dense, and covered in
   numbers. The lede promises "numbers crawling around the edge",
   so they have to be there. Nobody is meant to read them at this
   size — being unreadably crowded is the whole point.
   ============================================================ */
(function () {
  var cv = document.getElementById('figHero');
  if (!cv) return;
  var DENSE = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
               1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 4, 5, 7, 10, 15, 20];
  var HEAVY = [0.2, 0.5, 1, 2, 5, 10];
  /* resistances printed along the real axis, and reactances printed where
     their arcs land on the rim — the two families a printed chart labels */
  var R_TEXT = [0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5, 10];
  var X_TEXT = [0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5, 10];

  /* a constant-reactance arc meets |Γ| = 1 at arg Γ = π − 2·atan(x) */
  function rimAngle(x) { return Math.PI - 2 * Math.atan(x); }

  Fig(cv, 1.0, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h, i, a;
    clear(f);
    /* the bezel has to hold a ring of numbers now, so the padding grows with
       the canvas instead of sitting at a fixed 22 px — capped, or a wide
       canvas just gets a fat empty margin outside the scale */
    var G = Geo(w, h, Math.min(Math.max(26, w * 0.095), 40));
    var fs = Math.max(6, Math.min(9, G.R / 21));
    var mono = function () {
      ctx.font = '500 ' + fs.toFixed(1) + 'px ui-monospace, "IBM Plex Mono", monospace';
    };
    var rTick = G.R + 3,                       // inner edge of the tick band
        rTickL = rTick + fs * 1.5,             // where the long ticks stop
        rNum  = rTickL + fs * 0.95,            // centre-line of the number ring
        rEdge = rNum + fs * 0.95;              // outermost ring

    ctx.save();
    ctx.beginPath(); ctx.arc(G.cx, G.cy, G.R, 0, Math.PI * 2); ctx.clip();
    ctx.lineWidth = 0.6; ctx.strokeStyle = fgA(0.17);
    for (i = 0; i < DENSE.length; i++) arcR(ctx, G, DENSE[i], false);
    for (i = 0; i < DENSE.length; i++) { arcX(ctx, G, DENSE[i], false); arcX(ctx, G, -DENSE[i], false); }
    ctx.lineWidth = 1.1; ctx.strokeStyle = fgA(0.4);
    for (i = 0; i < HEAVY.length; i++) arcR(ctx, G, HEAVY[i], false);
    for (i = 0; i < HEAVY.length; i++) { arcX(ctx, G, HEAVY[i], false); arcX(ctx, G, -HEAVY[i], false); }

    /* reactance labels, riding just inside the rim on their own arcs */
    mono(); ctx.fillStyle = fgA(0.5);
    X_TEXT.forEach(function (x) {
      var t = rimAngle(x), s = String(x);
      radialText(ctx, G, G.R - fs * 1.3,  t, s);
      radialText(ctx, G, G.R - fs * 1.3, -t, '−' + s);
    });
    ctx.restore();

    ctx.lineWidth = 1.2; ctx.strokeStyle = fgA(0.5);
    ctx.beginPath(); ctx.moveTo(G.cx - G.R, G.cy); ctx.lineTo(G.cx + G.R, G.cy); ctx.stroke();

    /* resistance labels, sitting under the real axis */
    mono(); ctx.fillStyle = fgA(0.55);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    R_TEXT.forEach(function (r) {
      ctx.fillText(String(r), G.X(C((r - 1) / (r + 1), 0)), G.cy + 3);
    });

    ctx.lineWidth = 2.2; ctx.strokeStyle = pal().sig;
    ctx.beginPath(); ctx.arc(G.cx, G.cy, G.R, 0, Math.PI * 2); ctx.stroke();

    /* the outer wavelength scale — half the reason it looks intimidating */
    ctx.lineWidth = 1; ctx.strokeStyle = fgA(0.35);
    [rTick, rTickL, rEdge].forEach(function (r) {
      ctx.beginPath(); ctx.arc(G.cx, G.cy, r, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.lineWidth = 0.8; ctx.strokeStyle = fgA(0.3);
    for (i = 0; i < 100; i++) {
      a = i / 100 * Math.PI * 2;
      var long = i % 5 === 0;
      ctx.beginPath();
      ctx.moveTo(G.cx + Math.cos(a) * rTick, G.cy + Math.sin(a) * rTick);
      ctx.lineTo(G.cx + Math.cos(a) * (long ? rTickL : rTick + (rTickL - rTick) * 0.55),
                 G.cy + Math.sin(a) * (long ? rTickL : rTick + (rTickL - rTick) * 0.55));
      ctx.stroke();
    }

    /* wavelengths toward the generator: 0 at the short circuit, one full turn
       per half wavelength, which is why the ring runs 0 … 0.50 and no further */
    mono(); ctx.fillStyle = fgA(0.5);
    for (i = 0; i < 25; i++) {
      var wl = i * 0.02;
      radialText(ctx, G, rNum, Math.PI - 4 * Math.PI * wl,
                 i ? '.' + ('0' + Math.round(wl * 100)).slice(-2) : '0');
    }
  });
})();

/* ============================================================
   FIGURE 1 — two metres of wire, frequency swept.

   The curve is the *instantaneous* voltage v(x,t) = cos(βd)·cos(ωt),
   so it swings above and below the axis the way a wave really does,
   rather than the |V| envelope (which is always positive and reads as
   a row of bumps). At 50 Hz cos(βd) ≈ 1 everywhere, so the whole line
   rises and falls as one solid bar — which is exactly the point of the
   figure. The dashed pair is the envelope, and the nodes it pins to
   zero are marked, because "this spot never moves" is the thing a
   reader should walk away with.
   ============================================================ */
(function () {
  var cv = document.getElementById('figScale');
  if (!cv) return;
  var CLIGHT = 299792458, LEN = 2;          // metres of cable
  var FMIN = 50, FMAX = 3e9;
  var S = { f: FMIN, phase: 0, running: true };

  var sl   = document.getElementById('scaleF');
  var lbl  = document.getElementById('scaleFv');
  var out  = document.getElementById('scaleOut');
  var note = document.getElementById('scaleNote');
  var play = document.getElementById('scalePlay');

  function fFromT(t) { return FMIN * Math.pow(FMAX / FMIN, t / 1000); }
  function tFromF(v) { return 1000 * Math.log(v / FMIN) / Math.log(FMAX / FMIN); }

  function fmtHz(v) {
    if (v >= 1e9) return nf(v / 1e9, 3) + ' GHz';
    if (v >= 1e6) return nf(v / 1e6, 3) + ' MHz';
    if (v >= 1e3) return nf(v / 1e3, 3) + ' kHz';
    return nf(v, 3) + ' Hz';
  }
  function fmtM(v) {
    if (v >= 1000) return nf(v / 1000, 3) + ' km';
    if (v >= 1)    return nf(v, 3) + ' m';
    if (v >= 0.01) return nf(v * 100, 3) + ' cm';
    return nf(v * 1000, 3) + ' mm';
  }

  var presetHost = document.getElementById('scalePresets');
  pills(presetHost, [
    { label: '50 Hz mains',   f: 50 },
    { label: '1 MHz AM',      f: 1e6 },
    { label: '100 MHz FM',    f: 100e6 },
    { label: '900 MHz',       f: 900e6 },
    { label: '2.4 GHz Wi-Fi', f: 2.4e9 }
  ], function (it) {
    S.f = it.f; sl.value = Math.round(tFromF(it.f)); apply();
  }, 0);

  sl.addEventListener('input', function () {
    S.f = fFromT(+sl.value);
    /* dragging the slider means no preset describes it any more */
    for (var i = 0; i < presetHost.children.length; i++) presetHost.children[i].classList.remove('on');
    apply();
  });

  if (play) play.addEventListener('click', function () {
    S.running = !S.running;
    play.textContent = S.running ? '❙❙ Pause' : '▶ Play';
    play.classList.toggle('on', S.running);
  });

  function apply() { lbl.textContent = fmtHz(S.f); fig.redraw(); }

  var fig = Fig(cv, function (w) { return w / (w < 520 ? 250 : 235); }, function (fc) {
    var ctx = fc.ctx, w = fc.w, h = fc.h, i;
    clear(fc);
    var x0 = 52, x1 = w - 30, span = x1 - x0;
    var wTop = 34, wBot = h - 80;
    var midY = (wTop + wBot) / 2, amp = (wBot - wTop) / 2;
    var wireY = h - 56;
    var lam = CLIGHT / S.f, beta = 2 * Math.PI / lam;
    var ratio = LEN / lam;
    var swing = Math.cos(S.phase);
    var mono = function (s) { ctx.font = '500 ' + s + 'px ui-monospace, "IBM Plex Mono", monospace'; };

    /* signed standing-wave shape, measured back from the open end at x1 */
    function shapeAt(px) { return Math.cos(beta * ((x1 - px) / span * LEN)); }
    function yOf(v) { return midY - v * amp; }

    /* the rails it can never pass, and the zero line it swings about */
    ctx.setLineDash([3, 5]); ctx.lineWidth = 1; ctx.strokeStyle = fgA(0.16);
    [1, -1].forEach(function (s) {
      ctx.beginPath(); ctx.moveTo(x0, yOf(s)); ctx.lineTo(x1, yOf(s)); ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.lineWidth = 1; ctx.strokeStyle = fgA(0.32);
    ctx.beginPath(); ctx.moveTo(x0, midY); ctx.lineTo(x1, midY); ctx.stroke();

    /* envelope — how far the voltage ever gets at each point */
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.strokeStyle = sigA(0.42);
    [1, -1].forEach(function (s) {
      ctx.beginPath();
      for (i = 0; i <= span; i += 2) {
        var x = x0 + i, y = yOf(s * Math.abs(shapeAt(x)));
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);

    /* the live wave, filled back to the zero line */
    ctx.beginPath();
    ctx.moveTo(x0, midY);
    for (i = 0; i <= span; i++) ctx.lineTo(x0 + i, yOf(shapeAt(x0 + i) * swing));
    ctx.lineTo(x1, midY); ctx.closePath();
    ctx.fillStyle = sigA(0.09); ctx.fill();

    ctx.beginPath();
    for (i = 0; i <= span; i++) {
      var x = x0 + i, y = yOf(shapeAt(x) * swing);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.lineWidth = 2.4; ctx.strokeStyle = pal().sig; ctx.lineJoin = 'round';
    ctx.stroke();

    /* nodes — the points that never move. Only worth drawing when they are far
       enough apart to read as individual spots rather than a grey smear. */
    var nodes = [], dn;
    for (i = 0; ; i++) {
      dn = lam / 4 + i * lam / 2;
      if (dn > LEN) break;
      nodes.push(dn);
      if (nodes.length > 400) break;
    }
    var nodeGap = (lam / 2) / LEN * span;
    if (nodes.length && nodeGap > 7) {
      nodes.forEach(function (d) {
        var xn = x1 - d / LEN * span;
        dot(ctx, xn, midY, 3, rgba(pal().bg, 1), fgA(0.7));
      });
      if (nodes.length <= 6) {
        mono(9);
        var lx = x1 - nodes[0] / LEN * span, lw = ctx.measureText('DEAD SPOT').width;
        /* the envelope climbs steeply either side of a node — punch a hole in
           it rather than letting the dashes run through the letters */
        ctx.fillStyle = rgba(pal().bg, 0.9);
        ctx.fillRect(lx - lw / 2 - 4, midY - 22, lw + 8, 14);
        ctx.fillStyle = fgA(0.6);
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('DEAD SPOT', lx, midY - 9);
      }
    }

    /* left-hand scale */
    mono(9); ctx.fillStyle = fgA(0.5); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('+MAX', x0 - 6, yOf(1));
    ctx.fillText('0', x0 - 6, midY);
    ctx.fillText('−MAX', x0 - 6, yOf(-1));
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'left';
    ctx.fillText('VOLTAGE RIGHT NOW', x0, wTop - 10);

    /* the cable itself, brightness = how hard that point ever swings.
       Stepped by 2 px: this now runs every animation frame, and at 1 px the
       overlapping translucent slices also stack into a blotchy bar. */
    for (i = 0; i <= span; i += 2) {
      ctx.fillStyle = sigA(0.10 + 0.8 * Math.abs(shapeAt(x0 + i)));
      ctx.fillRect(x0 + i, wireY - 6, 2, 12);
    }
    ctx.lineWidth = 1.4; ctx.strokeStyle = fgA(0.55);
    ctx.strokeRect(x0, wireY - 6, span, 12);

    /* ends */
    mono(9); ctx.fillStyle = fgA(0.55); ctx.textBaseline = 'top';
    ctx.textAlign = 'left';  ctx.fillText('DRIVEN', x0, wireY + 12);
    ctx.textAlign = 'right'; ctx.fillText('OPEN END', x1, wireY + 12);

    /* metre ruler */
    ctx.textAlign = 'center'; ctx.fillStyle = fgA(0.4);
    for (i = 0; i <= 4; i++) {
      var m = i * 0.5, xm = x0 + (m / LEN) * span;
      ctx.strokeStyle = fgA(0.25); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xm, wireY + 7); ctx.lineTo(xm, wireY + 11); ctx.stroke();
      if (i % 2 === 0) ctx.fillText(m + ' m', xm, wireY + 24);
    }

    var lo = ratio < 0.25 ? Math.abs(Math.cos(beta * LEN)) : 0;
    var drop = (1 - lo) * 100;
    ro(out, [
      ['frequency',    '<b>' + fmtHz(S.f) + '</b>'],
      ['wavelength λ', fmtM(lam)],
      ['cable length', LEN + ' m'],
      ['that is',      '<b>' + (ratio < 0.001 ? '≈ 0' : nf(ratio, 3)) + ' λ</b>'],
      ['end-to-end change', (drop < 0.1 ? '&lt; 0.1' : nf(drop, 3)) + ' %'],
      ['dead spots',   '<b>' + nodes.length + '</b>']
    ]);

    note.innerHTML =
      ratio < 0.01  ? 'The whole cable rises and falls <b>together</b>, like one solid bar. Every point is at the same voltage at the same moment, so the cable may as well not be there. <b>A wire is just a wire.</b>' :
      ratio < 0.1   ? 'The bar is starting to bend — one end now swings a little harder than the other. You are close to the one-tenth-of-a-wavelength line where ordinary circuit theory quietly stops being true.' :
      ratio < 0.5   ? '<b>Now watch the middle.</b> Parts of the copper swing hard while other parts barely move. Two points on the same wire, different voltages, same instant. That is a transmission line.' :
                      '<b>Dead spots.</b> The marked points never move at all — they sit at zero forever — while the voltage a few centimetres away swings between both extremes. Nothing about the cable changed. Only the frequency did.';
  });

  apply();

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    S.running = false;
    if (play) { play.textContent = '▶ Play'; play.classList.remove('on'); }
  }
  animate(cv, function (sec) {
    if (!S.running) return;
    S.phase = sec * 2.4;
    fig.redraw();
  }).start();
})();

/* ============================================================
   FIGURE 7 — the chart as it was printed
   ============================================================ */
(function () {
  var cv = document.getElementById('figPrint');
  if (!cv) return;
  Fig(cv, 1.6, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    var INK = '#3a3128', PAPER = '#efe6d2', RED = '#a8443a';
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h);

    /* leave room above the circle for the printed heading */
    var R = Math.min(w * 0.42, h * 0.36), cx = w / 2, cy = h * 0.53;
    var G = { cx: cx, cy: cy, R: R,
      X: function (g) { return cx + g.re * R; }, Y: function (g) { return cy - g.im * R; } };
    var i;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

    /* dense hand-drafted-looking grid */
    var fine = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.4,
                1.6, 1.8, 2, 2.5, 3, 4, 5, 7, 10, 15, 20, 30, 50];
    ctx.lineWidth = 0.45; ctx.strokeStyle = 'rgba(58,49,40,.42)';
    for (i = 0; i < fine.length; i++) arcR(ctx, G, fine[i], false);
    for (i = 0; i < fine.length; i++) { arcX(ctx, G, fine[i], false); arcX(ctx, G, -fine[i], false); }
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(58,49,40,.8)';
    [0.2, 0.5, 1, 2, 5, 10].forEach(function (r) { arcR(ctx, G, r, false); });
    [0.2, 0.5, 1, 2, 5, 10].forEach(function (x) { arcX(ctx, G, x, false); arcX(ctx, G, -x, false); });
    ctx.restore();

    ctx.lineWidth = 1; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(58,49,40,.55)';
    ctx.beginPath(); ctx.arc(cx, cy, R + 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R + 20, 0, Math.PI * 2); ctx.stroke();

    /* rim ticks — the wavelength scales */
    for (i = 0; i < 100; i++) {
      var a = i / 100 * Math.PI * 2;
      var long = i % 5 === 0;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (R + 9), cy + Math.sin(a) * (R + 9));
      ctx.lineTo(cx + Math.cos(a) * (R + (long ? 20 : 15)), cy + Math.sin(a) * (R + (long ? 20 : 15)));
      ctx.stroke();
    }

    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.font = '700 13px "IBM Plex Mono", ui-monospace, monospace';
    ctx.fillText('TRANSMISSION LINE CALCULATOR', cx, h * 0.075);
    ctx.font = '400 10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(58,49,40,.75)';
    ctx.fillText('IMPEDANCE  OR  ADMITTANCE  COORDINATES', cx, h * 0.075 + 16);
    ctx.textAlign = 'left';
    ctx.fillText('P. H. SMITH', 16, h - 14);
    ctx.textAlign = 'right';
    ctx.fillStyle = RED;
    ctx.fillText('ELECTRONICS · JANUARY 1939', w - 16, h - 14);
  });
})();

/* ============================================================
   FIGURE 2 — one number describes the load
   ============================================================ */
(function () {
  var cv = document.getElementById('figWave');
  if (!cv) return;
  var S = { R: 25, X: -50, showParts: false, running: true, phase: 0 };

  var sR = document.getElementById('waveR'), sX = document.getElementById('waveX');
  var vR = document.getElementById('waveRv'), vX = document.getElementById('waveXv');
  var out = document.getElementById('waveOut');
  var chk = document.getElementById('waveParts');
  var play = document.getElementById('wavePlay');

  var LOADS = [
    { label: 'Matched 50 Ω', R: 50,  X: 0 },
    { label: 'Short',        R: 0,   X: 0 },
    { label: 'Open',         R: 1e7, X: 0 },
    { label: '25 Ω',         R: 25,  X: 0 },
    { label: '100 Ω',        R: 100, X: 0 },
    { label: '25 − j50 Ω',   R: 25,  X: -50 },
    { label: '100 + j80 Ω',  R: 100, X: 80 }
  ];
  pills(document.getElementById('wavePresets'), LOADS, function (it) {
    S.R = it.R; S.X = it.X; syncInputs(); f.redraw();
  }, 5);

  function syncInputs() {
    sR.value = Math.min(S.R, 200); sX.value = S.X;
    vR.textContent = (S.R >= 1e6 ? '∞' : nf(S.R)) + ' Ω';
    vX.textContent = nf(S.X) + ' Ω';
  }
  sR.addEventListener('input', function () { S.R = +sR.value; syncInputs(); f.redraw(); });
  sX.addEventListener('input', function () { S.X = +sX.value; syncInputs(); f.redraw(); });
  chk.addEventListener('change', function () { S.showParts = chk.checked; f.redraw(); });
  play.addEventListener('click', function () {
    S.running = !S.running;
    play.textContent = S.running ? '❙❙ Pause' : '▶ Play';
    play.classList.toggle('on', S.running);
  });

  var LAM = 1.5;                                   // wavelengths of line shown

  var f = Fig(cv, 2.45, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h, i;
    clear(f);
    var mL = 54, mR = 96;
    var x0 = mL, x1 = w - mR, lw = x1 - x0;
    var mid = h * 0.5;
    var ZL = C(S.R, S.X);
    var g = cdiv(csub(ZL, C(Z0)), cadd(ZL, C(Z0)));
    var gm = Math.min(cabs(g), 1), ga = carg(g);
    var A = (h * 0.34) / (1 + gm);
    var t = S.phase;

    /* line rails */
    ctx.strokeStyle = fgA(0.30); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x1, mid); ctx.stroke();

    function env(d) { return cabs(cadd(C(1), cmul(g, expj(-2 * 2 * Math.PI * d)))); }
    function inst(d) {
      var v = cmul(cadd(expj(2 * Math.PI * d), cmul(g, expj(-2 * Math.PI * d))), expj(t));
      return v.re;
    }
    function dAt(x) { return (x1 - x) / lw * LAM; }

    /* envelope */
    ctx.setLineDash([4, 5]); ctx.lineWidth = 1.2; ctx.strokeStyle = sigA(0.45);
    [1, -1].forEach(function (s) {
      ctx.beginPath();
      for (i = 0; i <= lw; i += 3) {
        var x = x0 + i, y = mid - s * A * env(dAt(x));
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);

    /* the two travelling waves */
    if (S.showParts) {
      ctx.lineWidth = 1.1;
      [['inc', fgA(0.30)], ['ref', sigA(0.42)]].forEach(function (p) {
        ctx.strokeStyle = p[1];
        ctx.beginPath();
        for (i = 0; i <= lw; i += 3) {
          var x = x0 + i, d = dAt(x), v;
          v = p[0] === 'inc'
            ? cmul(expj(2 * Math.PI * d), expj(t)).re
            : cmul(cmul(g, expj(-2 * Math.PI * d)), expj(t)).re;
          var y = mid - A * v;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
    }

    /* the standing wave */
    ctx.lineWidth = 2.4; ctx.strokeStyle = pal().sig; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (i = 0; i <= lw; i += 2) {
      var x = x0 + i, y = mid - A * inst(dAt(x));
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();

    /* nodes / antinodes */
    ctx.fillStyle = fgA(0.5);
    for (var n = -4; n < 8; n++) {
      var dmin = (ga + Math.PI + 2 * Math.PI * n) / (4 * Math.PI);
      if (dmin < 0 || dmin > LAM) continue;
      var xm = x1 - dmin / LAM * lw;
      if (gm > 0.02) { ctx.beginPath(); ctx.arc(xm, mid, 2.6, 0, 7); ctx.fill(); }
    }

    /* source + load boxes */
    ctx.fillStyle = fgA(0.10);
    ctx.fillRect(6, mid - 26, 40, 52);
    ctx.strokeStyle = fgA(0.5); ctx.lineWidth = 1.2;
    ctx.strokeRect(6, mid - 26, 40, 52);
    ctx.fillStyle = fgA(0.7);
    ctx.font = '500 10px ui-monospace, "IBM Plex Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SOURCE', 26, mid);

    ctx.fillStyle = sigA(0.12);
    ctx.fillRect(x1 + 4, mid - 30, 62, 60);
    ctx.strokeStyle = pal().sig; ctx.lineWidth = 1.6;
    ctx.strokeRect(x1 + 4, mid - 30, 62, 60);
    ctx.fillStyle = pal().sig;
    ctx.fillText('LOAD', x1 + 35, mid - 14);
    ctx.font = '500 11px ui-monospace, "IBM Plex Mono", monospace';
    ctx.fillText(S.R >= 1e6 ? '∞' : nf(S.R) + 'Ω', x1 + 35, mid + 2);
    ctx.fillText((S.X >= 0 ? '+j' : '−j') + nf(Math.abs(S.X)), x1 + 35, mid + 16);

    /* scale ticks */
    ctx.font = '500 9px ui-monospace, "IBM Plex Mono", monospace';
    ctx.fillStyle = fgA(0.45); ctx.textBaseline = 'top';
    for (var k = 0; k <= 3; k++) {
      var dd = k * 0.5, xx = x1 - dd / LAM * lw;
      ctx.strokeStyle = fgA(0.22); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xx, h - 22); ctx.lineTo(xx, h - 17); ctx.stroke();
      ctx.fillText(dd === 0 ? '0' : dd + 'λ', xx, h - 15);
    }
    ctx.textAlign = 'left';
    ctx.fillText('DISTANCE FROM THE LOAD', x0, 6);

    ro(out, [
      ['Γ',            '<b>' + nf(gm, 3) + ' ∠ ' + nf(ga * 180 / Math.PI, 4) + '°</b>'],
      ['power back',   nf(gm * gm * 100, 3) + ' %'],
      ['SWR',          isFinite(swrOf(g)) ? nf(swrOf(g), 3) + ' : 1' : '∞ : 1'],
      ['return loss',  isFinite(rlOf(g)) ? nf(rlOf(g), 3) + ' dB' : '∞ dB']
    ]);
  });

  syncInputs();
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { S.running = false; play.textContent = '▶ Play'; play.classList.remove('on'); }
  animate(cv, function (sec) {
    if (!S.running) return;
    S.phase = sec * 3.2;
    f.redraw();
  }).start();
})();

/* ============================================================
   FIGURE 3 — folding the impedance plane into a disk
   ============================================================ */
(function () {
  var cv = document.getElementById('figFold');
  if (!cv) return;
  var S = { t: 0 };
  var sl = document.getElementById('foldT'), lbl = document.getElementById('foldTv');
  var btn = document.getElementById('foldPlay');

  /* flat rendering of the whole right half-plane, squashed into a square:
     u = (r−1)/(r+1) ∈ [−1,1)     v = x/(1+|x|) ∈ (−1,1)
     — chosen because u is exactly Re Γ on the real axis, so the resistance
       axis does not move at all during the fold.                      */
  function flat(r, x) { return C((r - 1) / (r + 1), x / (1 + Math.abs(x))); }
  function lerp(a, b, t) { return C(a.re + (b.re - a.re) * t, a.im + (b.im - a.im) * t); }
  function pos(r, x, t) { return lerp(flat(r, x), gOf(C(r, x)), t); }

  var FOLD_MINOR = [0.1, 0.3, 0.4, 0.6, 0.8, 1.5, 3, 7, 15, 40, 150];
  var N = 220;
  function xFromV(v) { return v / (1 - Math.abs(v)); }
  function rFromU(u) { return (1 + u) / (1 - u); }

  function polyR(ctx, G, r, t) {                     // constant resistance
    ctx.beginPath();
    for (var i = 0; i <= N; i++) {
      var v = -0.998 + 1.996 * i / N, p = pos(r, xFromV(v), t);
      i ? ctx.lineTo(G.X(p), G.Y(p)) : ctx.moveTo(G.X(p), G.Y(p));
    }
    ctx.stroke();
  }
  function polyX(ctx, G, x, t) {                     // constant reactance
    ctx.beginPath();
    for (var i = 0; i <= N; i++) {
      var u = -1 + 1.998 * i / N, p = pos(rFromU(u), x, t);
      i ? ctx.lineTo(G.X(p), G.Y(p)) : ctx.moveTo(G.X(p), G.Y(p));
    }
    ctx.stroke();
  }

  var MARKS = [
    { r: 1,   x: 0,    lb: '50 Ω' },
    { r: 0,   x: 0,    lb: 'short' },
    { r: 400, x: 0,    lb: 'open' },
    { r: 0.5, x: 0.5,  lb: '25+j25' },
    { r: 2,   x: -1.6, lb: '100−j80' }
  ];

  var f = Fig(cv, 1.0, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h, t = S.t, i;
    clear(f);
    var G = Geo(w, h, 20);

    ctx.save();
    ctx.beginPath();
    ctx.rect(G.cx - G.R - 2, G.cy - G.R - 2, (G.R + 2) * 2, (G.R + 2) * 2);
    ctx.clip();

    /* denser than a working chart, and carried much further out (r = 150),
       so the crowding towards the edges reads as "this runs off to infinity"
       — and so the fold visibly squeezes all of it into one point */
    ctx.lineWidth = 0.8; ctx.strokeStyle = fgA(0.16);
    FOLD_MINOR.forEach(function (r) { polyR(ctx, G, r, t); });
    FOLD_MINOR.forEach(function (x) { polyX(ctx, G, x, t); polyX(ctx, G, -x, t); });

    ctx.lineWidth = 1.1; ctx.strokeStyle = fgA(0.34);
    R_MAJOR.forEach(function (r) { if (r !== 1) polyR(ctx, G, r, t); });
    X_MAJOR.forEach(function (x) { polyX(ctx, G, x, t); polyX(ctx, G, -x, t); });

    /* r = 0 — the boundary. A straight edge at t=0, the unit circle at t=1. */
    ctx.lineWidth = 2.2; ctx.strokeStyle = fgA(0.8);
    polyR(ctx, G, 0, t);
    /* r = 1 — becomes the circle through the centre */
    ctx.lineWidth = 1.8; ctx.strokeStyle = sigA(0.75);
    polyR(ctx, G, 1, t);
    /* x = 0 — never moves */
    ctx.lineWidth = 1.6; ctx.strokeStyle = fgA(0.55);
    polyX(ctx, G, 0, t);
    ctx.restore();

    /* landmark points riding the fold */
    MARKS.forEach(function (m) {
      var p = pos(m.r, m.x, t);
      var X = G.X(p), Y = G.Y(p);
      dot(ctx, X, Y, 4.5, pal().sig, rgba(pal().bg, 1));
      ctx.font = '500 10px ui-monospace, "IBM Plex Mono", monospace';
      ctx.fillStyle = fgA(0.7);
      /* "open" sits hard against the right edge at every stage of the fold —
         flip its label inboard so it is never clipped */
      var right = X + ctx.measureText(m.lb).width + 12 > w;
      ctx.textAlign = right ? 'right' : 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.lb, X + (right ? -8 : 8), Y - 9);
    });

    /* stage caption */
    ctx.font = '500 10px ui-monospace, "IBM Plex Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = fgA(0.55);
    ctx.fillText(t < 0.02 ? 'THE IMPEDANCE PLANE — INFINITE'
              : t > 0.98 ? 'THE Γ PLANE — A DISK OF RADIUS 1'
              : 'FOLDING…', w / 2, h - 4);
  });

  function setT(v) { S.t = v; lbl.textContent = Math.round(v * 100) + ' %'; f.redraw(); }
  sl.addEventListener('input', function () { setT(+sl.value / 100); });
  btn.addEventListener('click', function () {
    var from = S.t > 0.5 ? 1 : 0, to = from ? 0 : 1, t0 = performance.now();
    (function step(ts) {
      var k = Math.min((ts - t0) / 1400, 1);
      var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // easeInOutQuad
      var v = from + (to - from) * e;
      sl.value = Math.round(v * 100); setT(v);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  });
  setT(0);
})();

/* ============================================================
   FIGURE 4 — reading the chart (drag the point)
   ============================================================ */
(function () {
  var cv = document.getElementById('figRead');
  if (!cv) return;
  var S = { g: gOf(C(0.5, 0.5)) };
  var out = document.getElementById('readOut');

  var LM = [
    { label: '50 Ω match', z: C(1, 0) },
    { label: 'Short',      z: C(0, 0) },
    { label: 'Open',       z: C(400, 0) },
    { label: '25 + j25',   z: C(0.5, 0.5) },
    { label: '100 − j80',  z: C(2, -1.6) },
    { label: '15 + j60',   z: C(0.3, 1.2) }
  ];
  pills(document.getElementById('readPresets'), LM, function (it) {
    S.g = gOf(it.z); f.redraw();
  }, 3);

  var f = Fig(cv, 1.0, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var G = Geo(w, h, 20);
    grid(ctx, G, false, false);

    var g = S.g, z = zOf(g), m = cabs(g);

    /* the constant-r circle and constant-x arc through the point */
    ctx.save();
    ctx.beginPath(); ctx.arc(G.cx, G.cy, G.R, 0, Math.PI * 2); ctx.clip();
    ctx.lineWidth = 2; ctx.strokeStyle = sigA(0.85);
    if (z.re < 1e5) arcR(ctx, G, Math.max(z.re, 0), false);
    if (Math.abs(z.im) > 1e-4 && Math.abs(z.im) < 1e5) arcX(ctx, G, z.im, false);
    else { ctx.beginPath(); ctx.moveTo(G.cx - G.R, G.cy); ctx.lineTo(G.cx + G.R, G.cy); ctx.stroke(); }
    ctx.restore();

    /* SWR circle + Γ vector */
    ctx.setLineDash([5, 5]); ctx.lineWidth = 1.3; ctx.strokeStyle = fgA(0.5);
    ctx.beginPath(); ctx.arc(G.cx, G.cy, m * G.R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1.6; ctx.strokeStyle = fgA(0.6);
    ctx.beginPath(); ctx.moveTo(G.cx, G.cy); ctx.lineTo(G.X(g), G.Y(g)); ctx.stroke();

    labelsR(ctx, G);
    landmarks(ctx, G);
    dot(ctx, G.cx, G.cy, 3, fgA(0.5));
    dot(ctx, G.X(g), G.Y(g), 6.5, pal().sig, rgba(pal().bg, 1));
    tag(ctx, G.X(g), G.Y(g), nz(z), pal().sig);

    var Z = C(z.re * Z0, z.im * Z0);
    ro(out, [
      ['z = Z/Z₀',   '<b>' + nz(z) + '</b>'],
      ['Z',          nz(Z, 'Ω')],
      ['Γ',          nf(m, 3) + ' ∠ ' + nf(carg(g) * 180 / Math.PI, 4) + '°'],
      ['SWR',        isFinite(swrOf(g)) ? nf(swrOf(g), 3) + ' : 1' : '∞ : 1'],
      ['return loss', isFinite(rlOf(g)) ? nf(rlOf(g), 3) + ' dB' : '∞ dB'],
      ['character',  z.im > 0.02 ? 'inductive' : z.im < -0.02 ? 'capacitive' : 'purely resistive']
    ]);
  });

  /* drag */
  var down = false;
  function put(ev) {
    var p = ptOf(cv, ev);
    var G = Geo(f.w, f.h, 20);
    var g = G.inv(p.x, p.y), mm = cabs(g);
    if (mm > 1) g = C(g.re / mm * 0.9995, g.im / mm * 0.9995);
    S.g = g; f.redraw();
  }
  cv.addEventListener('pointerdown', function (e) { down = true; cv.setPointerCapture(e.pointerId); put(e); });
  cv.addEventListener('pointermove', function (e) { if (down) put(e); });
  cv.addEventListener('pointerup',   function () { down = false; });
  cv.style.cursor = 'crosshair';
})();

/* ============================================================
   FIGURE 5 — length becomes rotation
   ============================================================ */
(function () {
  var cv = document.getElementById('figRot');
  if (!cv) return;
  var S = { zL: C(0, 0), len: 0 };
  var sl = document.getElementById('rotLen'), lbl = document.getElementById('rotLenv');
  var out = document.getElementById('rotOut'), note = document.getElementById('rotNote');

  var LOADS = [
    { label: 'Short',      z: C(0, 0) },
    { label: 'Open',       z: C(400, 0) },
    { label: '25 Ω',       z: C(0.5, 0) },
    { label: '25 − j50',   z: C(0.5, -1) },
    { label: '100 + j80',  z: C(2, 1.6) }
  ];
  pills(document.getElementById('rotPresets'), LOADS, function (it) {
    S.zL = it.z; f.redraw();
  }, 0);

  var f = Fig(cv, 1.0, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h, i;
    clear(f);
    var G = Geo(w, h, 20);
    grid(ctx, G, false, false);

    var gL = gOf(S.zL), m = cabs(gL), a0 = carg(gL);
    var gIn = cmul(gL, expj(-4 * Math.PI * S.len));

    /* SWR circle — the whole point: it never changes radius */
    ctx.lineWidth = 1.6; ctx.strokeStyle = fgA(0.45); ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.arc(G.cx, G.cy, m * G.R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    /* the swept arc */
    if (S.len > 0.0005) {
      ctx.lineWidth = 3.4; ctx.strokeStyle = sigA(0.75); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(G.cx, G.cy, m * G.R, -a0, -a0 + 4 * Math.PI * S.len, false);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    labelsR(ctx, G);
    landmarks(ctx, G);
    dot(ctx, G.cx, G.cy, 3, fgA(0.5));
    dot(ctx, G.X(gL), G.Y(gL), 5, fgA(0.75), rgba(pal().bg, 1));
    ctx.font = '500 10px ui-monospace, "IBM Plex Mono", monospace';
    ctx.fillStyle = fgA(0.6); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('LOAD', G.X(gL) + 9, G.Y(gL) + 10);

    dot(ctx, G.X(gIn), G.Y(gIn), 6.5, pal().sig, rgba(pal().bg, 1));
    var zIn = zOf(gIn);
    tag(ctx, G.X(gIn), G.Y(gIn), nz(C(zIn.re * Z0, zIn.im * Z0), 'Ω'), pal().sig);

    ro(out, [
      ['line length',  '<b>' + nf(S.len, 3) + ' λ</b>'],
      ['rotated',      nf(S.len * 720, 3) + '°'],
      ['Z at the input', nz(C(zIn.re * Z0, zIn.im * Z0), 'Ω')],
      ['|Γ|',          nf(cabs(gIn), 3) + '  (unchanged)'],
      ['SWR',          isFinite(swrOf(gIn)) ? nf(swrOf(gIn), 3) + ' : 1' : '∞ : 1']
    ]);

    var msg = '';
    if (Math.abs(S.len - 0.25) < 0.006) msg = '<b>Quarter wavelength.</b> Half of the circle — you are now on the opposite side of the chart. A short circuit looks like an open circuit.';
    else if (S.len > 0.494) msg = '<b>Half a wavelength.</b> One full circle: the line is electrically invisible. Z is back where it started.';
    else if (Math.abs(cabs(gIn) - 0) < 0.02) msg = '<b>Matched.</b>';
    else if (Math.abs(zOf(gIn).im) < 0.03 && S.len > 0.005) msg = 'You crossed the real axis. The input now looks like a <b>pure resistance</b>. This is where a voltage maximum or minimum sits on the line.';
    note.innerHTML = msg || 'Move the slider. Watch the radius: it never changes.';
  });

  sl.addEventListener('input', function () {
    S.len = +sl.value / 1000;
    lbl.textContent = nf(S.len, 3) + ' λ';
    f.redraw();
  });
  lbl.textContent = '0 λ';
})();

/* ============================================================
   FIGURE 6 — matching: line stub or lumped L-C
   ============================================================ */
(function () {
  var cv = document.getElementById('figMatch');
  if (!cv) return;
  var FREQ = 1e9;
  var S = { zL: C(0.5, -1), mode: 'stub', sol: 0, sols: [], showY: true, k: 1, stubShort: false };
  var out = document.getElementById('matchOut'), note = document.getElementById('matchNote');
  var solHost = document.getElementById('matchSols');
  var stubHost = document.getElementById('matchStub');
  var chk = document.getElementById('matchY');

  var LOADS = [
    { label: '25 − j50 Ω', z: C(0.5, -1) },
    { label: '25 Ω',       z: C(0.5, 0) },
    { label: '100 Ω',      z: C(2, 0) },
    { label: '100 + j80',  z: C(2, 1.6) },
    { label: '15 + j60',   z: C(0.3, 1.2) },
    { label: '150 − j40',  z: C(3, -0.8) }
  ];

  function solve(z) {
    var s = [], i, q, p, sgn, X, B, b1, x1;
    var r = z.re, x = z.im, y = cinv(z), gg = y.re, b = y.im;
    if (r > 1e-9 && r <= 1 + 1e-9) {
      q = Math.sqrt(Math.max(r * (1 - r), 0));
      for (i = 0; i < 2; i++) {
        sgn = i === 0 ? q : -q;
        if (i === 1 && q < 1e-9) break;
        X = -x + sgn; b1 = -sgn / (r * r + sgn * sgn); B = -b1;
        s.push({ order: 'series', X: X, B: B });
      }
    }
    if (gg > 1e-9 && gg <= 1 + 1e-9) {
      p = Math.sqrt(Math.max(gg * (1 - gg), 0));
      for (i = 0; i < 2; i++) {
        sgn = i === 0 ? p : -p;
        if (i === 1 && p < 1e-9) break;
        B = -b + sgn; x1 = -sgn / (gg * gg + sgn * sgn); X = -x1;
        s.push({ order: 'shunt', X: X, B: B });
      }
    }
    return s;
  }

  /* ---------- single shunt stub ----------
     Rotate along the constant-|Γ| circle until y has unit conductance — in Γ
     terms, until the point crosses the circle |Γ + ½| = ½. With Γ = m·e^{jφ}
     that reduces to cos φ = −m, so there are exactly two landings per half
     wavelength. A stub of open or shorted line then cancels what susceptance
     is left over. */
  function solveStub(z) {
    var g = gOf(z), m = cabs(g), th = carg(g);
    if (m < 1e-6 || m > 0.999999) return [];       // already matched, or lossless-unreachable
    var res = [], phi = Math.acos(-m);
    [phi, -phi].forEach(function (p) {
      var d = (th - p) / (4 * Math.PI);
      d = ((d % 0.5) + 0.5) % 0.5;
      var gj = cmul(g, expj(-4 * Math.PI * d));
      var y = cdiv(csub(C(1), gj), cadd(C(1), gj));
      res.push({ d: d, b: y.im });
    });
    res.sort(function (a, b) { return a.d - b.d; });
    return res;
  }
  /* length of stub whose input susceptance is −b (normalized), in wavelengths */
  function stubLen(b, shorted) {
    var t;
    if (shorted) t = Math.PI / 2 - Math.atan(b);   // arccot(b) ∈ (0, π)
    else { t = Math.atan(-b); if (t <= 1e-12) t += Math.PI; }
    return t / (2 * Math.PI);
  }

  function refreshSols() {
    S.sols = S.mode === 'stub' ? solveStub(S.zL) : solve(S.zL);
    S.sol = Math.min(S.sol, S.sols.length - 1);
    if (S.sol < 0) S.sol = 0;
    var items = S.sols.map(function (s, i) {
      return { label: 'Solution ' + (i + 1) + ' · ' +
        (S.mode === 'stub' ? 'd = ' + nf(s.d, 3) + ' λ'
                           : (s.order === 'series' ? 'series first' : 'shunt first')) };
    });
    if (!items.length) items = [{ label: S.mode === 'stub' ? 'already matched' : 'no L-network' }];
    pills(solHost, items, function (it, i) { S.sol = i; S.k = 0; anim(); fckt.redraw(); }, S.sol);
    stubHost.style.display = S.mode === 'stub' ? '' : 'none';
    fckt.redraw();
  }

  pills(document.getElementById('matchMode'), [
    { label: 'Line stub', mode: 'stub' },
    { label: 'Lumped L–C', mode: 'lc' }
  ], function (it) { S.mode = it.mode; S.sol = 0; refreshSols(); S.k = 0; anim(); }, 0);

  pills(document.getElementById('matchPresets'), LOADS, function (it) {
    S.zL = it.z; S.sol = 0; refreshSols(); S.k = 0; anim();
  }, 0);

  pills(stubHost, [
    { label: 'Open stub', shorted: false },
    { label: 'Shorted stub', shorted: true }
  ], function (it) { S.stubShort = it.shorted; f.redraw(); fckt.redraw(); }, 0);

  chk.addEventListener('change', function () { S.showY = chk.checked; f.redraw(); });

  /* the two-leg path, in Γ, as a function of progress 0…1 */
  function pathStub(sol, k) {
    var pts = [], i, n = 90, g = gOf(S.zL);
    var half = Math.min(k, 0.5) * 2, second = Math.max(k - 0.5, 0) * 2;
    /* leg 1: pure line — rotate clockwise at constant radius */
    for (i = 0; i <= n; i++) pts.push(cmul(g, expj(-4 * Math.PI * sol.d * (i / n) * half)));
    /* leg 2: the stub — slide along g = 1 by cancelling the susceptance */
    if (second > 0) {
      for (i = 0; i <= n; i++) {
        var y = C(1, sol.b * (1 - (i / n) * second));
        pts.push(cdiv(csub(C(1), y), cadd(C(1), y)));
      }
    }
    return { pts: pts };
  }

  function path(sol, k) {
    if (S.mode === 'stub') return pathStub(sol, k);
    var pts = [], i, n = 90, z = S.zL, half = Math.min(k, 0.5) * 2, second = Math.max(k - 0.5, 0) * 2;
    var zMid, yMid;
    if (sol.order === 'series') {
      for (i = 0; i <= n; i++) pts.push(gOf(C(z.re, z.im + sol.X * (i / n) * half)));
      zMid = C(z.re, z.im + sol.X);
      yMid = cinv(zMid);
      if (second > 0)
        for (i = 0; i <= n; i++) pts.push(gOf(cinv(C(yMid.re, yMid.im + sol.B * (i / n) * second))));
    } else {
      var y = cinv(z);
      for (i = 0; i <= n; i++) pts.push(gOf(cinv(C(y.re, y.im + sol.B * (i / n) * half))));
      yMid = C(y.re, y.im + sol.B);
      zMid = cinv(yMid);
      if (second > 0)
        for (i = 0; i <= n; i++) pts.push(gOf(C(zMid.re, zMid.im + sol.X * (i / n) * second)));
    }
    return { pts: pts, zMid: zMid };
  }

  var f = Fig(cv, 1.0, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h, i;
    clear(f);
    var G = Geo(w, h, 20);
    if (S.showY) grid(ctx, G, true, false);
    grid(ctx, G, false, false);
    labelsR(ctx, G);

    var gL = gOf(S.zL);
    dot(ctx, G.cx, G.cy, 5, 'transparent', fgA(0.6));
    ctx.font = '500 10px ui-monospace, "IBM Plex Mono", monospace';
    ctx.fillStyle = fgA(0.6); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('50 Ω', G.cx, G.cy + 8);

    var sol = S.sols[S.sol];

    /* stub matching runs on two specific circles — show them both */
    if (S.mode === 'stub') {
      var mL = cabs(gL);
      ctx.setLineDash([5, 5]); ctx.lineWidth = 1.4; ctx.strokeStyle = fgA(0.45);
      ctx.beginPath(); ctx.arc(G.cx, G.cy, mL * G.R, 0, Math.PI * 2); ctx.stroke();
      ctx.save();
      ctx.beginPath(); ctx.arc(G.cx, G.cy, G.R, 0, Math.PI * 2); ctx.clip();
      ctx.lineWidth = 2; ctx.strokeStyle = sigA(0.45);
      arcR(ctx, G, 1, true);                       // the g = 1 circle
      ctx.restore();
      ctx.setLineDash([]);
    }

    if (sol) {
      var P = path(sol, S.k);
      ctx.lineWidth = 3.2; ctx.strokeStyle = sigA(0.85); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      for (i = 0; i < P.pts.length; i++) {
        var X = G.X(P.pts[i]), Y = G.Y(P.pts[i]);
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.stroke();
      ctx.lineCap = 'butt';
      var last = P.pts[P.pts.length - 1];
      dot(ctx, G.X(last), G.Y(last), 6, pal().sig, rgba(pal().bg, 1));

      if (S.mode === 'stub') {
        var Ls = stubLen(sol.b, S.stubShort);
        ro(out, [
          ['load',         '<b>' + nz(C(S.zL.re * Z0, S.zL.im * Z0), 'Ω') + '</b>'],
          ['step 1 · line', 'd = &nbsp;<b>' + nf(sol.d, 3) + ' λ</b>'],
          ['y there',      '1 ' + (sol.b < 0 ? '− j' : '+ j') + nf(Math.abs(sol.b))],
          ['step 2 · stub', (S.stubShort ? 'shorted' : 'open') + ' &nbsp;<b>ℓ = ' + nf(Ls, 3) + ' λ</b>'],
          ['result',       '50 + j0 Ω · SWR 1 : 1'],
          ['every line',   'Z₀ = 50 Ω']
        ]);
        note.innerHTML = 'Step 1 is <b>only line</b>: rotate clockwise at the same radius until you reach the dashed <b>g = 1</b> circle. That is the only place where a parallel element can finish the job. Step 2 is the stub: a dead-end piece of the same 50 Ω line, cut to the exact length whose susceptance cancels what is left. No components at all — only copper.';
      } else {
        var w0 = 2 * Math.PI * FREQ;
        var Xa = sol.X * Z0, Ba = sol.B / Z0;
        var c1 = Xa >= 0 ? { k: 'series L', v: eng(Xa / w0, 'H') } : { k: 'series C', v: eng(1 / (w0 * -Xa), 'F') };
        var c2 = Ba >= 0 ? { k: 'shunt C',  v: eng(Ba / w0, 'F') } : { k: 'shunt L',  v: eng(1 / (w0 * -Ba), 'H') };
        var first = sol.order === 'series' ? c1 : c2, secondC = sol.order === 'series' ? c2 : c1;
        ro(out, [
          ['load',       '<b>' + nz(C(S.zL.re * Z0, S.zL.im * Z0), 'Ω') + '</b>'],
          ['step 1',     first.k + ' &nbsp;<b>' + first.v + '</b>'],
          ['step 2',     secondC.k + ' &nbsp;<b>' + secondC.v + '</b>'],
          ['result',     '50 + j0 Ω · SWR 1 : 1'],
          ['at',         '1 GHz, Z₀ = 50 Ω']
        ]);
        note.innerHTML = sol.order === 'series'
          ? 'Step 1 slides along a <b>constant-resistance</b> circle, because a series part can only change X. Step 2 slides along a <b>constant-conductance</b> circle of the blue admittance grid, because a parallel part can only change B. Two moves, and you are in the centre.'
          : 'Step 1 slides along a <b>constant-conductance</b> circle of the blue admittance grid, because a parallel part can only change B. Step 2 slides along a <b>constant-resistance</b> circle, because a series part can only change X. Two moves, and you are in the centre.';
      }
    } else {
      ro(out, [['load', nz(C(S.zL.re * Z0, S.zL.im * Z0), 'Ω')], ['', 'nothing to match']]);
      note.textContent = '';
    }

    dot(ctx, G.X(gL), G.Y(gL), 5.5, pal().bg, fgA(0.8));
    ctx.font = '500 10px ui-monospace, "IBM Plex Mono", monospace';
    ctx.fillStyle = fgA(0.7); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('LOAD', G.X(gL) + 9, G.Y(gL) + 11);
  });

  /* ---------- the schematic underneath ----------
     Drawn left to right the way the signal arrives: feed line, then the two
     elements, then the load. Note that step 1 (the first move on the chart)
     is the element nearest the LOAD, so it is the rightmost one here. */
  function coilH(ctx, xc, y, half) {          // series coil, humps upward
    var n = 4, r = half / n, i;
    ctx.beginPath();
    for (i = 0; i < n; i++) ctx.arc(xc - half + r * (2 * i + 1), y, r, Math.PI, 0, false);
    ctx.stroke();
  }
  function coilV(ctx, x, yc, half) {          // shunt coil, humps to the right
    var n = 4, r = half / n, i;
    ctx.beginPath();
    for (i = 0; i < n; i++) ctx.arc(x, yc - half + r * (2 * i + 1), r, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();
  }
  function line(ctx, ax, ay, bx, by) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }

  /* dimension lines with arrowheads, so a length reads as a length */
  function head(ctx, x, y, dx, dy) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - dx * 6 - dy * 3, y - dy * 6 - dx * 3);
    ctx.lineTo(x - dx * 6 + dy * 3, y - dy * 6 + dx * 3);
    ctx.closePath(); ctx.fill();
  }
  function dimH(ctx, xa, xb, y, label, col) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.1;
    line(ctx, xa, y, xb, y);
    line(ctx, xa, y - 5, xa, y + 5); line(ctx, xb, y - 5, xb, y + 5);
    head(ctx, xa, y, -1, 0); head(ctx, xb, y, 1, 0);
    ctx.font = '500 10px ui-monospace, "IBM Plex Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    var tw = ctx.measureText(label).width;
    /* a short segment cannot carry its own label without swallowing the
       arrowheads — lift it clear instead of blanking them out */
    if (tw + 10 > xb - xa) {
      ctx.fillStyle = col;
      ctx.fillText(label, (xa + xb) / 2, y - 6);
      return;
    }
    ctx.fillStyle = rgba(pal().bg, 1);
    ctx.fillRect((xa + xb) / 2 - tw / 2 - 4, y - 7, tw + 8, 12);
    ctx.fillStyle = col;
    ctx.fillText(label, (xa + xb) / 2, y + 4);
  }
  function dimV(ctx, x, ya, yb, label, col, side) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.1;
    line(ctx, x, ya, x, yb);
    line(ctx, x - 5, ya, x + 5, ya); line(ctx, x - 5, yb, x + 5, yb);
    head(ctx, x, ya, 0, -1); head(ctx, x, yb, 0, 1);
    ctx.font = '500 10px ui-monospace, "IBM Plex Mono", monospace';
    ctx.textAlign = side < 0 ? 'right' : 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + (side < 0 ? -8 : 8), (ya + yb) / 2);
  }
  function ground(ctx, x, y) {
    ctx.lineWidth = 1.6;
    line(ctx, x - 9, y, x + 9, y);
    line(ctx, x - 5.5, y + 4, x + 5.5, y + 4);
    line(ctx, x - 2.5, y + 8, x + 2.5, y + 8);
  }

  /* ---------- single-line (microstrip) view of the stub match ---------- */
  function drawStub(fc, narrow, dw, ox) {
    var ctx = fc.ctx, h = fc.h;
    var mono = function (s) { ctx.font = '500 ' + s + 'px ui-monospace, "IBM Plex Mono", monospace'; };
    var sol = S.sols[S.sol];
    var lineY = 74;
    var x0 = ox + 16, xLoad = ox + dw - 34;
    var boxL = xLoad - 18;

    /* the load, sitting at the end of the line */
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.8; ctx.strokeStyle = fgA(0.75);
    ctx.fillStyle = rgba(pal().bg, 1);
    ctx.fillRect(boxL, lineY - 16, 36, 32);
    ctx.strokeRect(boxL, lineY - 16, 36, 32);
    line(ctx, xLoad, lineY + 16, xLoad, lineY + 30);
    ctx.strokeStyle = fgA(0.6); ground(ctx, xLoad, lineY + 30);
    ctx.fillStyle = fgA(0.85); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    mono(12); ctx.fillText('Z', xLoad - 3, lineY);
    mono(9);  ctx.fillText('L', xLoad + 5, lineY + 4);

    mono(10); ctx.fillStyle = fgA(0.55); ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('LOAD', xLoad + 18, h - 30);
    ctx.fillText(nz(C(S.zL.re * Z0, S.zL.im * Z0), 'Ω'), xLoad + 18, h - 17);

    /* the through line */
    ctx.lineWidth = 2.4; ctx.strokeStyle = fgA(0.8);
    line(ctx, x0, lineY, boxL, lineY);
    ctx.lineWidth = 1.4; ctx.strokeStyle = fgA(0.5);
    line(ctx, x0, lineY - 7, x0, lineY + 7);

    /* looking-in marker */
    ctx.strokeStyle = pal().sig; ctx.fillStyle = pal().sig; ctx.lineWidth = 1.4;
    line(ctx, x0 + 4, 22, x0 + 32, 22);
    head(ctx, x0 + 32, 22, 1, 0);
    mono(10); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('SEES 50 + j0 Ω', x0 + 38, 22);

    if (!sol) {
      ctx.fillStyle = fgA(0.6); ctx.textAlign = 'center';
      ctx.fillText('this load needs no stub', (x0 + boxL) / 2, lineY - 24);
      return;
    }

    /* where the stub taps in, and how long it is — both drawn to scale */
    var Ls = stubLen(sol.b, S.stubShort);
    var segMax = boxL - (x0 + 46);
    var dPx = Math.min(36 + (sol.d / 0.5) * (segMax - 36), segMax);
    var xJ = boxL - dPx;
    var sPx = 34 + (Ls / 0.5) * 58;

    ctx.lineWidth = 2.4; ctx.strokeStyle = pal().sig;
    line(ctx, xJ, lineY, xJ, lineY + sPx);
    dot(ctx, xJ, lineY, 3.4, pal().sig);

    if (S.stubShort) {
      ctx.strokeStyle = pal().sig;
      line(ctx, xJ, lineY + sPx, xJ, lineY + sPx + 4);
      ground(ctx, xJ, lineY + sPx + 4);
    } else {
      ctx.lineWidth = 2.4;                       // open end: a bare pad
      line(ctx, xJ - 8, lineY + sPx, xJ + 8, lineY + sPx);
    }
    mono(10); ctx.fillStyle = pal().sig;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(S.stubShort ? 'SHORTED' : 'OPEN', xJ, lineY + sPx + (S.stubShort ? 20 : 8));

    dimH(ctx, xJ, boxL, lineY - 26, 'd = ' + nf(sol.d, 3) + ' λ', fgA(0.7));
    dimV(ctx, xJ - 26, lineY, lineY + sPx, 'ℓ = ' + nf(Ls, 3) + ' λ', sigA(0.9), -1);

    mono(10); ctx.fillStyle = fgA(0.5);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('ALL LINES Z₀ = 50 Ω', x0, h - 17);
  }

  function seriesEl(ctx, xc, y, isL) {
    if (isL) { coilH(ctx, xc, y, 24); return; }
    line(ctx, xc - 24, y, xc - 6, y);
    line(ctx, xc + 6, y, xc + 24, y);
    line(ctx, xc - 6, y - 12, xc - 6, y + 12);
    line(ctx, xc + 6, y - 12, xc + 6, y + 12);
  }
  function shuntEl(ctx, x, yTop, yBot, isL) {
    var ym = (yTop + yBot) / 2;
    if (isL) {
      line(ctx, x, yTop, x, ym - 24); line(ctx, x, ym + 24, x, yBot);
      coilV(ctx, x, ym, 24); return;
    }
    line(ctx, x, yTop, x, ym - 6); line(ctx, x, ym + 6, x, yBot);
    line(ctx, x - 13, ym - 6, x + 13, ym - 6);
    line(ctx, x - 13, ym + 6, x + 13, ym + 6);
  }

  /* height is driven by the schematic itself, not by the column width, and the
     drawing is capped and centred so it never stretches into a thin ribbon */
  var fckt = Fig(document.getElementById('figMatchCkt'),
                 function (w) { return w / (w < 520 ? 245 : 225); },
                 function (fc) {
    var ctx = fc.ctx, w = fc.w, h = fc.h, i;
    clear(fc);
    var narrow = w < 520;
    var dw = Math.min(w, 660), ox = (w - dw) / 2;
    if (S.mode === 'stub') { drawStub(fc, narrow, dw, ox); return; }
    var railY = 50, gndY = h - 84;
    var x0 = ox + 14, xEnd = ox + dw - 26;
    var tlW = Math.min(120, (xEnd - x0) * 0.26);
    var regL = x0 + tlW + 26, regR = xEnd - 40;
    var slotA = regL + (regR - regL) * 0.24, slotB = regL + (regR - regL) * 0.76;
    var sol = S.sols[S.sol];
    var mono = function (s) { ctx.font = '500 ' + s + 'px ui-monospace, "IBM Plex Mono", monospace'; };

    ctx.lineWidth = 1.7; ctx.strokeStyle = fgA(0.75); ctx.lineCap = 'round';
    line(ctx, x0, railY, xEnd, railY);
    line(ctx, x0, gndY, xEnd, gndY);
    line(ctx, xEnd, railY, xEnd, gndY);

    /* the 50 Ω feed, as a hatched section of two-conductor line */
    ctx.lineWidth = 1; ctx.strokeStyle = fgA(0.28);
    for (i = 0; i <= 9; i++) {
      var xa = x0 + 10 + (tlW - 10) * i / 9;
      line(ctx, xa, railY + 2, xa - 10, gndY - 2);
    }
    ctx.lineWidth = 1.4; ctx.strokeStyle = fgA(0.5);
    line(ctx, x0 + tlW, railY - 6, x0 + tlW, railY + 6);
    line(ctx, x0 + tlW, gndY - 6, x0 + tlW, gndY + 6);

    mono(10); ctx.fillStyle = fgA(0.55);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('50 Ω FEED', x0 + tlW / 2, gndY + 10);
    if (!narrow) ctx.fillText('now matched,', x0 + tlW / 2, gndY + 23);
    ctx.fillText(narrow ? '(invisible)' : 'so invisible', x0 + tlW / 2, gndY + (narrow ? 23 : 36));

    /* looking-in arrow */
    ctx.strokeStyle = pal().sig; ctx.lineWidth = 1.4;
    line(ctx, x0 + 4, railY - 22, x0 + 34, railY - 22);
    ctx.beginPath();
    ctx.moveTo(x0 + 34, railY - 22); ctx.lineTo(x0 + 28, railY - 25); ctx.lineTo(x0 + 28, railY - 19);
    ctx.closePath(); ctx.fillStyle = pal().sig; ctx.fill();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = pal().sig;
    ctx.fillText('SEES 50 + j0 Ω', x0 + 40, railY - 22);

    /* the load */
    ctx.lineWidth = 1.7; ctx.strokeStyle = fgA(0.75);
    var ym = (railY + gndY) / 2;
    ctx.fillStyle = rgba(pal().bg, 1);
    ctx.fillRect(xEnd - 17, ym - 24, 34, 48);
    ctx.strokeRect(xEnd - 17, ym - 24, 34, 48);
    ctx.fillStyle = fgA(0.85); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    mono(12); ctx.fillText('Z', xEnd - 2, ym);
    mono(9);  ctx.fillText('L', xEnd + 6, ym + 4);
    mono(10); ctx.fillStyle = fgA(0.6); ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('LOAD', xEnd + 17, gndY + 10);
    ctx.fillText(nz(C(S.zL.re * Z0, S.zL.im * Z0), 'Ω'), xEnd + 17, gndY + 23);

    if (!sol) {
      ctx.fillStyle = fgA(0.6); ctx.textAlign = 'center';
      ctx.fillText('no two-element solution for this load', (regL + regR) / 2, railY - 30);
      return;
    }

    /* which element goes where. Step 1 is always the one touching the load. */
    var w0 = 2 * Math.PI * FREQ, Xa = sol.X * Z0, Ba = sol.B / Z0;
    var ser = { isL: Xa >= 0, txt: (Xa >= 0 ? 'L ' + eng(Xa / w0, 'H') : 'C ' + eng(1 / (w0 * -Xa), 'F')) };
    var shu = { isL: Ba < 0,  txt: (Ba >= 0 ? 'C ' + eng(Ba / w0, 'F') : 'L ' + eng(1 / (w0 * -Ba), 'H')) };
    var seriesFirst = sol.order === 'series';
    var atLoad  = seriesFirst ? 'series' : 'shunt';   // step 1, right-hand slot
    var atSource = seriesFirst ? 'shunt' : 'series';  // step 2, left-hand slot

    /* three short stacked lines, so the two labels never collide on a phone */
    function place(kind, x, step) {
      var isSer = kind === 'series', el = isSer ? ser : shu;
      ctx.lineWidth = 2.1; ctx.strokeStyle = pal().sig;
      if (isSer) seriesEl(ctx, x, railY, ser.isL);
      else       shuntEl(ctx, x, railY, gndY, shu.isL);
      mono(10); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = pal().sig;
      ctx.fillText((isSer ? 'SERIES ' : 'SHUNT ') + el.txt.charAt(0), x, gndY + 10);
      ctx.fillText(el.txt.slice(2), x, gndY + 23);
      ctx.fillStyle = fgA(0.5);
      ctx.fillText('step ' + step, x, gndY + 36);
    }
    place(atSource, slotA, 2);
    place(atLoad,   slotB, 1);
  });

  var raf = null, safety = null;
  function anim() {
    if (raf) cancelAnimationFrame(raf);
    if (safety) clearTimeout(safety);
    var t0 = performance.now();
    /* if rAF is throttled (background tab, reduced power) the route would be
       left drawn half-finished — land it on the answer regardless */
    safety = setTimeout(function () {
      if (S.k < 1) { if (raf) cancelAnimationFrame(raf); raf = null; S.k = 1; f.redraw(); }
    }, 2200);
    (function step(ts) {
      S.k = Math.min((ts - t0) / 1500, 1);
      f.redraw();
      if (S.k < 1) raf = requestAnimationFrame(step); else raf = null;
    })(t0);
  }
  refreshSols();
  S.k = 0; anim();
})();

/* ============================================================
   Timeline
   ============================================================ */
(function () {
  var host = document.getElementById('tlTrack'), body = document.getElementById('tlBody');
  if (!host) return;
  var ITEMS = [
    { yr: '1876', lb: 'The telephone',
      h: 'Long wires, first trouble',
      p: 'Bell\'s telephone works well across a room. Across a country it does not. The line itself starts changing the signal. Engineers need a theory of what a wire does to a wave.' },
    { yr: '1885', lb: 'Telegrapher\'s equations',
      h: 'Heaviside writes it down',
      p: 'Oliver Heaviside turns Maxwell\'s work into the transmission-line equations, and gives us the idea of characteristic impedance. Now the physics is known. But the math it asks for is very hard to do by hand.' },
    { yr: '1920s', lb: 'Bell Labs long lines',
      h: 'The math becomes a full-time job',
      p: 'Carrier telephony pushes frequencies higher and lines longer. Somebody at Bell Labs must solve a complex tangent expression, with a slide rule, hundreds of times a week.' },
    { yr: '1929', lb: 'Deal Beach, NJ',
      h: 'A field, an antenna, a stub tuner',
      p: 'Phillip Smith, fresh from Tufts and newly hired at the Bell Labs radio station, spends his days on a slow job that needs two people: one engineer moves a tuning stub by hand, the other reads standing-wave numbers from a test set far away and shouts them back. He had done the amateur version of this in his own backyard for years. Now it was his job.' },
    { yr: '1931', lb: 'Smith\'s first chart',
      h: 'A rectangular first try',
      p: 'Smith draws a chart to save himself the arithmetic. It works, but he draws it on rectangular coordinates, so it can only show a small range of impedances. Infinity does not fit on paper.' },
    { yr: '1937', lb: 'Mizuhashi, Japan',
      h: 'The same idea, somewhere else',
      p: 'Tosaku Mizuhashi publishes a very similar chart in Japan. The problem existed everywhere, so the solution was found more than once.' },
    { yr: '1939', lb: 'Published',
      h: '“Transmission Line Calculator”',
      p: 'Smith moves to the reflection-coefficient plane, where every passive impedance fits inside a circle of radius 1. He publishes it in Electronics, January 1939. The same year, in the Soviet Union, Amiel Volpert finds the same construction.' },
    { yr: '1944', lb: 'The improved chart',
      h: 'The version you know',
      p: '“An Improved Transmission Line Calculator” adds the outer wavelength scales and the radial rulers for SWR and return loss. This is the chart that is still printed today.' },
    { yr: '1969', lb: 'The book',
      h: 'Electronic Applications of the Smith Chart',
      p: 'Thirty years after inventing it, Smith writes the main book about his own chart. He retires from Bell Labs soon after.' },
    { yr: 'now', lb: 'Every VNA',
      h: 'Still on the screen',
      p: 'Computers made the calculation free, and changed nothing about the chart. Open any vector network analyser, any RF simulator, any antenna datasheet: the circles are there, doing the one job software still cannot do for you — showing you which way to move.' }
  ];
  var btns = ITEMS.map(function (it, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tl-item';
    b.innerHTML = '<span class="yr">' + it.yr + '</span><span class="lb">' + it.lb + '</span>';
    b.addEventListener('click', function () { pick(i); });
    host.appendChild(b);
    return b;
  });
  function pick(i) {
    btns.forEach(function (b, j) { b.classList.toggle('on', i === j); });
    body.innerHTML = '<h4>' + ITEMS[i].yr + ' — ' + ITEMS[i].h + '</h4><p>' + ITEMS[i].p + '</p>';
  }
  pick(6);            // open on 1939 — the publication the article is about
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
