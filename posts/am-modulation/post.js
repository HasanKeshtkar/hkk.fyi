"use strict";
/* ============================================================
   "AM Modulation" — interactive figures.
   No dependencies, no network. Everything draws to <canvas>
   using the page's three CSS hues, so it follows the theme.
   ============================================================ */

var LBL_FONT = 'ui-monospace, "IBM Plex Mono", monospace';

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
/* Alpha does not mean the same thing in both themes: dark ink at 45 % over
   cream washes out to about 2.7:1, while light ink at 45 % over near-black
   still reads. Lift the faint end in the light theme only. */
function lift(a) {
  if (document.documentElement.classList.contains('ink')) return a;
  return a < 0.7 ? Math.min(1, a * 1.45 + 0.1) : a;
}
var fgA  = function (a) { return rgba(pal().fg, lift(a)); };
var sigA = function (a) { return rgba(pal().sig, lift(a)); };
/* the one non-theme colour on the page: something is wrong */
function badCol() { return document.documentElement.classList.contains('ink') ? '#E8705A' : '#C8452F'; }

/* ---------------- numbers ---------------- */
function nf(v, p) {
  if (!isFinite(v)) return '∞';
  var s = parseFloat(v.toPrecision(p || 3)).toString();
  return s.replace('-', '−');
}
function fix(v, d) { return v.toFixed(d).replace('-', '−'); }
function grp(v) {                                   // 33000 → 33,000
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
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

/* ---------------- canvas plumbing ---------------- */
var FIGS = [];
/* `ar` is width/height — a number, or a function of the width for figures
   whose useful height does not scale with the column width */
function Fig(canvas, ar, draw) {
  var ctx = canvas.getContext('2d');
  var self = { canvas: canvas, ctx: ctx, w: 0, h: 0, redraw: redraw };
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
function clear(f) { f.ctx.clearRect(0, 0, f.w, f.h); }

/* run fn(seconds) each frame, only while `el` is on screen */
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
var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- small DOM helpers ---------------- */
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
function clearPills(host) {
  for (var i = 0; i < host.children.length; i++) host.children[i].classList.remove('on');
}
function verdict(el, kind, text) {
  el.className = 'verdict' + (kind ? ' ' + kind : '');
  el.innerHTML = text;
}

/* ---------------- plotting helpers ----------------
   A `panel` is one strip of the canvas: x/w give the horizontal extent,
   mid is the zero line, amp is how far ±1 reaches from it. */
function panel(x, w, mid, amp) { return { x: x, w: w, mid: mid, amp: amp }; }

function zeroLine(ctx, p, alpha) {
  ctx.lineWidth = 1; ctx.strokeStyle = fgA(alpha === undefined ? 0.3 : alpha);
  ctx.beginPath(); ctx.moveTo(p.x, p.mid); ctx.lineTo(p.x + p.w, p.mid); ctx.stroke();
}
/* fn(u) with u running 0…1 across the panel, returning a value in ±1 */
function curve(ctx, p, fn, style, lw, dash, steps) {
  var n = steps || Math.max(240, Math.round(p.w * 2)), i, u, y;
  ctx.save();
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  for (i = 0; i <= n; i++) {
    u = i / n;
    y = p.mid - fn(u) * p.amp;
    i ? ctx.lineTo(p.x + u * p.w, y) : ctx.moveTo(p.x + u * p.w, y);
  }
  ctx.lineWidth = lw || 1.8; ctx.strokeStyle = style; ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}
function fillCurve(ctx, p, fn, style, steps) {
  var n = steps || Math.max(240, Math.round(p.w * 2)), i, u;
  ctx.beginPath();
  ctx.moveTo(p.x, p.mid);
  for (i = 0; i <= n; i++) { u = i / n; ctx.lineTo(p.x + u * p.w, p.mid - fn(u) * p.amp); }
  ctx.lineTo(p.x + p.w, p.mid);
  ctx.closePath();
  ctx.fillStyle = style; ctx.fill();
}
function mono(ctx, size, weight) {
  ctx.font = (weight || 500) + ' ' + size + 'px ' + LBL_FONT;
}
/* a small caption pinned to the top-left of a panel */
function panelLabel(ctx, p, text, color) {
  mono(ctx, 9.5);
  ctx.fillStyle = color || fgA(0.55);
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillText(text, p.x, p.mid - p.amp - 4);
}
/* end ticks align inwards, so the first and last labels stay on the canvas */
function alignAt(ctx, x, x0, x1) {
  ctx.textAlign = x <= x0 + 2 ? 'left' : (x >= x1 - 2 ? 'right' : 'center');
}
/* text on an opaque plate, so it never fights with a line underneath */
function plate(ctx, x, y, text, color, align) {
  mono(ctx, 10);
  var w = ctx.measureText(text).width + 10;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  var x0 = align === 'right' ? x - w : x;
  ctx.fillStyle = rgba(pal().bg, 0.9);
  ctx.fillRect(x0, y - 8, w, 16);
  ctx.fillStyle = color;
  ctx.fillText(text, x0 + 5, y);
}

/* ---------------- message shapes ----------------
   Every message here is normalised to ±1 so that the modulation index
   means what section 4 says it means. */
var SHAPES = {
  sine:  function (ph) { return Math.sin(2 * Math.PI * ph); },
  two:   function (ph) { return 0.62 * Math.sin(2 * Math.PI * ph) + 0.38 * Math.sin(2 * Math.PI * 2.5 * ph + 0.7); },
  pulse: function (ph) { return Math.tanh(5 * Math.sin(2 * Math.PI * ph)) / Math.tanh(5); },
  tri:   function (ph) { var u = ph - Math.floor(ph); return 4 * Math.abs(u - 0.5) - 1; }
};

/* ============================================================
   HERO — an AM wave, running.
   ============================================================ */
(function () {
  var cv = document.getElementById('figHero');
  if (!cv) return;
  var t = 0;

  var fig = Fig(cv, 1.25, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var p = panel(10, w - 20, h / 2, h * 0.36);
    var m = 0.85, cyc = 2.2, ratio = 18;

    zeroLine(ctx, p, 0.22);
    var env = function (u) { return 1 + m * Math.sin(2 * Math.PI * (cyc * u + t)); };
    var sig = function (u) { return env(u) / (1 + m) * Math.cos(2 * Math.PI * ratio * cyc * u); };

    fillCurve(ctx, p, function (u) { return sig(u); }, sigA(0.10));
    curve(ctx, p, sig, pal().sig, 1.6, null, 1400);
    [1, -1].forEach(function (s) {
      curve(ctx, p, function (u) { return s * env(u) / (1 + m); }, fgA(0.5), 1.3, [4, 4], 500);
    });
  });

  if (!REDUCED) animate(cv, function (sec) { t = -sec * 0.22; fig.redraw(); }).start();
})();

/* ============================================================
   FIG 1 — how tall the antenna would have to be.
   A logarithmic ruler from 1 cm to 100 km, with things the reader
   already has a size for printed on it, and a quarter-wave marker
   that slides along as the frequency changes.
   ============================================================ */
(function () {
  var cv = document.getElementById('figAnt');
  if (!cv) return;
  var C = 3e8, FMIN = 100, FMAX = 5e9;
  var LMIN = 0.01, LMAX = 1e5;                 // metres, the ends of the ruler
  var S = { f: 3000 };

  var sl = document.getElementById('antF');
  var lbl = document.getElementById('antFv');
  var out = document.getElementById('antOut');
  var note = document.getElementById('antNote');
  var host = document.getElementById('antPresets');

  function fFromT(v) { return FMIN * Math.pow(FMAX / FMIN, v / 1000); }
  function tFromF(v) { return 1000 * Math.log(v / FMIN) / Math.log(FMAX / FMIN); }

  var DECADES = [
    [0.01, '1 cm'], [0.1, '10 cm'], [1, '1 m'], [10, '10 m'],
    [100, '100 m'], [1e3, '1 km'], [1e4, '10 km'], [1e5, '100 km']
  ];
  var REFS = [
    { v: 0.085, t: 'bank card' },
    { v: 1.7,   t: 'a person' },
    { v: 8,     t: 'two-storey house' },
    { v: 300,   t: 'Eiffel Tower' },
    { v: 8849,  t: 'Mount Everest' }
  ];

  pills(host, [
    { label: 'VOICE 3 kHz', f: 3e3 },
    { label: 'MUSIC 15 kHz', f: 15e3 },
    { label: 'AM 1 MHz', f: 1e6 },
    { label: 'FM 100 MHz', f: 100e6 },
    { label: 'WI-FI 2.4 GHz', f: 2.4e9 }
  ], function (it) { S.f = it.f; sl.value = Math.round(tFromF(it.f)); apply(); }, 0);

  sl.value = Math.round(tFromF(S.f));
  sl.addEventListener('input', function () {
    S.f = fFromT(+sl.value); clearPills(host); apply();
  });

  function apply() { lbl.textContent = fmtHz(S.f); fig.redraw(); }

  var fig = Fig(cv, function (w) { return w / (w < 520 ? 250 : 205); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h, i;
    clear(f);
    var x0 = 34, x1 = w - 22, span = x1 - x0;
    var axisY = h - 52;
    var lam = C / S.f, L = lam / 4;

    function X(v) {
      var u = (Math.log10(v) - Math.log10(LMIN)) / (Math.log10(LMAX) - Math.log10(LMIN));
      return x0 + Math.max(0, Math.min(1, u)) * span;
    }

    /* the ruler */
    ctx.lineWidth = 1.6; ctx.strokeStyle = fgA(0.5);
    ctx.beginPath(); ctx.moveTo(x0, axisY); ctx.lineTo(x1, axisY); ctx.stroke();
    var everyOther = w < 620;                    // eight labels will not fit on a phone
    mono(ctx, 9.5); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (i = 0; i < DECADES.length; i++) {
      var dx = X(DECADES[i][0]);
      ctx.lineWidth = 1.2; ctx.strokeStyle = fgA(0.4);
      ctx.beginPath(); ctx.moveTo(dx, axisY); ctx.lineTo(dx, axisY + 6); ctx.stroke();
      if (everyOther && i % 2) continue;
      ctx.fillStyle = fgA(0.55);
      alignAt(ctx, dx, x0, x1);
      ctx.fillText(DECADES[i][1], dx, axisY + 10);
    }
    /* half-decade ticks, so the log scale reads as a scale */
    ctx.lineWidth = 0.9; ctx.strokeStyle = fgA(0.22);
    for (i = -2; i <= 5; i++) {
      var hx = X(Math.pow(10, i) * 3.1623);
      ctx.beginPath(); ctx.moveTo(hx, axisY); ctx.lineTo(hx, axisY + 3.5); ctx.stroke();
    }
    mono(ctx, 9.5); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = fgA(0.45);
    ctx.fillText('LENGTH OF A QUARTER-WAVE ANTENNA →', x0, axisY + 26);

    /* things the reader already has a size for */
    REFS.forEach(function (r, k) {
      if (w < 620 && (k === 0 || k === 3)) return;
      var rx = X(r.v), top = 26 + (k % 2) * 15;
      ctx.lineWidth = 1; ctx.strokeStyle = fgA(0.22);
      ctx.beginPath(); ctx.moveTo(rx, top + 10); ctx.lineTo(rx, axisY - 2); ctx.stroke();
      mono(ctx, 9);
      ctx.fillStyle = fgA(0.5);
      ctx.textBaseline = 'middle';
      /* keep the label inside the canvas at both ends */
      var tw = ctx.measureText(r.t).width;
      ctx.textAlign = rx + tw / 2 + 6 > w ? 'right' : (rx - tw / 2 - 6 < 0 ? 'left' : 'center');
      ctx.fillText(r.t, rx, top);
    });

    /* the marker */
    var mx = X(L), off = L > LMAX;
    ctx.lineWidth = 2.2; ctx.strokeStyle = pal().sig;
    ctx.beginPath(); ctx.moveTo(mx, axisY + 1); ctx.lineTo(mx, 62); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx, axisY - 1); ctx.lineTo(mx - 6, axisY - 12); ctx.lineTo(mx + 6, axisY - 12);
    ctx.closePath(); ctx.fillStyle = pal().sig; ctx.fill();

    /* the tag sits beside the marker line, never across it: to the left once
       the marker has travelled past the middle of the ruler */
    mono(ctx, 11, 700);
    var txt = (off ? '≥ ' : '') + fmtM(L);
    var sub = 'AT ' + fmtHz(S.f).toUpperCase();
    var lw = ctx.measureText(txt).width;
    mono(ctx, 9.5);
    var lw2 = ctx.measureText(sub).width;
    var bw = Math.max(lw, lw2) + 12;
    var left = mx > (x0 + x1) / 2;
    var tx = left ? mx - 8 - bw : mx + 8;
    tx = Math.min(Math.max(tx, x0), x1 - bw);
    ctx.fillStyle = rgba(pal().bg, 0.92);
    ctx.fillRect(tx, 50, bw, 30);
    mono(ctx, 11, 700);
    ctx.fillStyle = pal().sig; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, tx + 6, 60);
    mono(ctx, 9.5);
    ctx.fillStyle = fgA(0.55); ctx.textBaseline = 'top';
    ctx.fillText(sub, tx + 6, 68);

    if (off) {
      mono(ctx, 9.5);
      ctx.fillStyle = badCol(); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText('off the scale →', x1, 40);
    }

    ro(out, [
      ['frequency',      '<b>' + fmtHz(S.f) + '</b>'],
      ['wavelength λ',   fmtM(lam)],
      ['antenna λ/4',    '<b>' + fmtM(L) + '</b>'],
      ['vs a 1.7 m person', (L / 1.7 >= 1 ? grp(L / 1.7) + ' ×' : nf(1.7 / L, 2) + ' × smaller')]
    ]);

    note.className = 'verdict' + (L > 1000 ? ' bad' : (L < 5 ? ' good' : ''));
    note.innerHTML =
      L > 20000 ? 'Twenty-five kilometres of antenna, for one voice tone. This is the problem, in one number.' :
      L > 1000  ? 'Taller than any structure ever built. Not an engineering challenge — an impossibility.' :
      L > 60    ? 'A real broadcast mast. Expensive, but these exist: this is the AM band.' :
      L > 5     ? 'A large but ordinary antenna — a mast on a roof.' :
      L > 0.3   ? 'A normal rod antenna, the kind on a car or a router.' :
                  'Small enough to be a copper track on a circuit board.';
  });

  apply();
})();

/* ============================================================
   FIG 2 — message, carrier, and the two multiplied together.
   ============================================================ */
(function () {
  var cv = document.getElementById('figAM');
  if (!cv) return;
  var S = { shape: 'sine', fm: 1, fc: 40, env: true, run: true, t: 0 };
  var M = 0.7;                                   // fixed here; fig 3 owns the index

  var slM = document.getElementById('amFm'), lbM = document.getElementById('amFmv');
  var slC = document.getElementById('amFc'), lbC = document.getElementById('amFcv');
  var chk = document.getElementById('amEnv');
  var play = document.getElementById('amPlay');
  var out = document.getElementById('amOut');

  pills(document.getElementById('amShape'), [
    { label: 'ONE TONE', s: 'sine' },
    { label: 'TWO TONES', s: 'two' },
    { label: 'PULSE', s: 'pulse' }
  ], function (it) { S.shape = it.s; fig.redraw(); }, 0);

  slM.addEventListener('input', function () { S.fm = +slM.value; apply(); });
  slC.addEventListener('input', function () { S.fc = +slC.value; apply(); });
  chk.addEventListener('change', function () { S.env = chk.checked; fig.redraw(); });
  play.addEventListener('click', function () {
    S.run = !S.run;
    play.textContent = S.run ? '❙❙ Pause' : '▶ Play';
    play.classList.toggle('on', S.run);
  });

  function apply() {
    lbM.textContent = nf(S.fm, 3) + ' kHz';
    lbC.textContent = Math.round(S.fc) + ' kHz';
    fig.redraw();
  }

  var fig = Fig(cv, function (w) { return w / (w < 520 ? 290 : 350); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var x0 = 12, x1 = w - 12, sw = x1 - x0;
    var WIN = 1;                                  // one millisecond across the width
    var msg = SHAPES[S.shape];

    var top = 24, gap = 30, foot = 30;            // foot leaves room for the time ruler
    var free = h - top - gap * 2 - foot;
    var hMsg = free * 0.24, hCar = free * 0.24, hAM = free * 0.52;

    var pM = panel(x0, sw, top + hMsg / 2, hMsg / 2);
    var pC = panel(x0, sw, top + hMsg + gap + hCar / 2, hCar / 2);
    var pA = panel(x0, sw, top + hMsg + gap + hCar + gap + hAM / 2, hAM / 2);

    var mFn = function (u) { return msg(S.fm * WIN * u + S.t * S.fm); };
    var cFn = function (u) { return Math.cos(2 * Math.PI * (S.fc * WIN * u + S.t * S.fc)); };

    /* 1 — the message */
    zeroLine(ctx, pM, 0.25);
    curve(ctx, pM, mFn, sigA(0.75), 1.8);
    panelLabel(ctx, pM, 'THE MESSAGE  x(t)');

    /* 2 — the bare carrier */
    zeroLine(ctx, pC, 0.25);
    curve(ctx, pC, cFn, fgA(0.55), 1.2, null, 1800);
    var nar = w < 620;
    panelLabel(ctx, pC, nar ? 'THE CARRIER  cos(2π fc·t)'
                            : 'THE CARRIER  cos(2π fc·t)  — always the same height');

    /* 3 — the two of them multiplied */
    var envFn = function (u) { return (1 + M * mFn(u)) / (1 + M); };
    zeroLine(ctx, pA, 0.25);
    curve(ctx, pA, function (u) { return envFn(u) * cFn(u); }, pal().sig, 1.5, null, 2400);
    if (S.env) {
      [1, -1].forEach(function (s) {
        curve(ctx, pA, function (u) { return s * envFn(u); }, fgA(0.6), 1.4, [5, 4], 600);
      });
      mono(ctx, 9.5);
      ctx.fillStyle = fgA(0.6); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText('envelope', x1, pA.mid - pA.amp - 3);
    }
    panelLabel(ctx, pA, nar ? 'TRANSMITTED  s(t)'
                            : 'TRANSMITTED  s(t) = Ac[1 + m·x(t)]·cos(2π fc·t)', sigA(0.85));

    /* the time ruler */
    mono(ctx, 9);
    ctx.fillStyle = fgA(0.45); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var yr = pA.mid + pA.amp + 8;
    for (var k = 0; k <= 4; k++) {
      var xk = x0 + sw * k / 4;
      ctx.strokeStyle = fgA(0.25); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xk, yr); ctx.lineTo(xk, yr + 4); ctx.stroke();
      alignAt(ctx, xk, x0, x1);
      ctx.fillText(nf(k * 0.25, 2) + ' ms', xk, yr + 6);
    }

    ro(out, [
      ['message f<sub>m</sub>', '<b>' + nf(S.fm, 3) + ' kHz</b>'],
      ['carrier f<sub>c</sub>', '<b>' + Math.round(S.fc) + ' kHz</b>'],
      ['ratio f<sub>c</sub> / f<sub>m</sub>', nf(S.fc / S.fm, 3) + ' : 1'],
      ['index m', fix(M, 2)],
      ['envelope high', fix(1 + M, 2) + ' A<sub>c</sub>'],
      ['envelope low', fix(1 - M, 2) + ' A<sub>c</sub>']
    ]);
  });

  apply();
  if (REDUCED) { S.run = false; play.textContent = '▶ Play'; play.classList.remove('on'); }
  animate(cv, function (sec) {
    if (!S.run) return;
    S.t = -sec * 0.00035;                          // seconds of signal time, slowed right down
    fig.redraw();
  }).start();
})();

/* ============================================================
   FIG 3 — the modulation index, and over-modulation.
   Upper: the transmitted wave with Vmax / Vmin marked.
   Lower: |1 + m·x| — what an envelope detector actually recovers —
   against the message it was supposed to be.
   ============================================================ */
(function () {
  var cv = document.getElementById('figIdx');
  if (!cv) return;
  var S = { m: 0.6 };
  var sl = document.getElementById('idxM'), lbl = document.getElementById('idxMv');
  var out = document.getElementById('idxOut'), note = document.getElementById('idxNote');
  var host = document.getElementById('idxPresets');

  pills(host, [
    { label: 'm = 0', m: 0 },
    { label: 'm = 0.5', m: 0.5 },
    { label: 'm = 1  FULL', m: 1 },
    { label: 'm = 1.4  BROKEN', m: 1.4 }
  ], function (it) { S.m = it.m; sl.value = Math.round(it.m * 100); apply(); }, null);

  sl.addEventListener('input', function () { S.m = +sl.value / 100; clearPills(host); apply(); });
  function apply() { lbl.textContent = fix(S.m, 2); fig.redraw(); }

  var fig = Fig(cv, function (w) { return w / (w < 520 ? 300 : 290); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var x0 = 46, x1 = w - 62, sw = x1 - x0;
    var cyc = 2, ratio = 22, m = S.m;
    var top = 18, gap = 30, foot = 22;
    var free = h - top - gap - foot;
    var hTop = free * 0.6, hBot = free * 0.4;
    var pT = panel(x0, sw, top + hTop / 2, hTop / 2);
    /* the recovered signal is never negative, so its zero line sits on the
       floor of its band and the whole band is used for 0…1 */
    var pB = panel(x0, sw, top + hTop + gap + hBot, hBot * 0.8);

    /* everything is scaled by the largest envelope this figure can produce, so
       the wave does not resize under the reader as they drag the slider */
    var SC = 1 / 2.45;
    var xm = function (u) { return Math.sin(2 * Math.PI * cyc * u); };
    var env = function (u) { return 1 + m * xm(u); };

    /* ---- upper: the transmitted wave ---- */
    zeroLine(ctx, pT, 0.25);
    curve(ctx, pT, function (u) { return env(u) * Math.cos(2 * Math.PI * ratio * cyc * u) * SC; },
          pal().sig, 1.4, null, 2400);
    [1, -1].forEach(function (s) {
      curve(ctx, pT, function (u) { return s * Math.abs(env(u)) * SC; }, fgA(0.55), 1.3, [5, 4], 700);
    });
    panelLabel(ctx, pT, 'WHAT IS TRANSMITTED', sigA(0.85));

    var vmax = 1 + m, vmin = Math.max(0, 1 - m);
    ctx.save(); ctx.setLineDash([2, 4]); ctx.lineWidth = 1; ctx.strokeStyle = fgA(0.4);
    [vmax, vmin].forEach(function (v) {
      var y = pT.mid - v * SC * pT.amp;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1 + 6, y); ctx.stroke();
    });
    ctx.restore();
    mono(ctx, 9.5); ctx.fillStyle = fgA(0.6); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('V' + 'ₘₐₓ', x1 + 9, pT.mid - vmax * SC * pT.amp);
    ctx.fillText('V' + 'ₘᵢₙ', x1 + 9, pT.mid - vmin * SC * pT.amp);

    /* ---- lower: what comes back out ---- */
    zeroLine(ctx, pB, 0.25);
    var want = function (u) { return (1 + Math.min(m, 1) * xm(u)) / 2.2; };
    var got  = function (u) { return Math.abs(env(u)) / 2.2; };
    fillCurve(ctx, pB, got, m > 1 ? rgba(badCol(), 0.10) : sigA(0.08));
    curve(ctx, pB, want, fgA(0.5), 1.4, [5, 4], 600);
    curve(ctx, pB, got, m > 1 ? badCol() : pal().sig, 2, null, 900);
    panelLabel(ctx, pB, 'WHAT THE RECEIVER RECOVERS  |1 + m·x(t)|', m > 1 ? badCol() : sigA(0.85));

    mono(ctx, 9); ctx.fillStyle = fgA(0.45); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('0', x0 - 6, pB.mid);
    ctx.fillText('0', x0 - 6, pT.mid);
    ctx.fillText('1', x0 - 6, pB.mid - pB.amp / 2.2);

    if (m > 1.001) {
      mono(ctx, 9.5); ctx.fillStyle = badCol(); ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('folded — this shape is not the message', x1, pB.mid + 6);
    }

    var meas = (vmax - vmin) / (vmax + vmin);
    ro(out, [
      ['index m', '<b>' + fix(m, 2) + '</b>'],
      ['V<sub>max</sub>', fix(vmax, 2) + ' A<sub>c</sub>'],
      ['V<sub>min</sub>', fix(vmin, 2) + ' A<sub>c</sub>'],
      ['m from the screen', '<b>' + fix(meas, 2) + '</b>'],
      ['power in sidebands', fix(100 * (m * m / 2) / (1 + m * m / 2), 1) + ' %']
    ]);

    verdict(note,
      m > 1.001 ? 'bad' : (m > 0.35 ? 'good' : ''),
      m < 0.02 ? 'No modulation at all. A pure carrier: the transmitter is on, and it is saying nothing.' :
      m < 0.4  ? 'Under-modulated. It works, but most of the power is in the carrier and the message is quiet.' :
      m <= 1.001 ? 'Healthy. The envelope stays above zero, so the recovered shape matches the message exactly.' :
      'Over-modulated. The envelope has folded through zero, the recovered shape has kinks that were never sent, ' +
      'and the extra harmonics spill into the neighbouring channels.');
  });

  apply();
})();

/* ============================================================
   FIG 4 — the same signal in frequency.
   Both axes are drawn at the same kHz per pixel, so "the message
   moved up and made a copy" is something you can see rather than
   something you have to take on trust.
   ============================================================ */
(function () {
  var cv = document.getElementById('figSpec');
  if (!cv) return;
  var FC = 1000;                                   // kHz — a station in the middle of the AM band
  var HALF = 20;                                   // kHz shown either side of the carrier
  var S = { kind: 'tone', fm: 3, m: 0.7 };

  var slF = document.getElementById('specFm'), lbF = document.getElementById('specFmv');
  var slM = document.getElementById('specM'), lbM = document.getElementById('specMv');
  var lblF = document.getElementById('specFmLbl');
  var out = document.getElementById('specOut');

  pills(document.getElementById('specKind'), [
    { label: 'ONE TONE', k: 'tone' },
    { label: 'SPEECH BAND', k: 'band' }
  ], function (it) { S.kind = it.k; apply(); }, 0);

  slF.addEventListener('input', function () { S.fm = +slF.value; apply(); });
  slM.addEventListener('input', function () { S.m = +slM.value / 100; apply(); });

  function apply() {
    lblF.textContent = S.kind === 'tone' ? 'MESSAGE FREQUENCY' : 'HIGHEST FREQUENCY B';
    lbF.textContent = nf(S.fm, 3) + ' kHz';
    lbM.textContent = fix(S.m, 2);
    fig.redraw();
  }

  var fig = Fig(cv, function (w) { return w / (w < 520 ? 320 : 300); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h, i;
    clear(f);
    var x0 = 30, x1 = w - 16, sw = x1 - x0;
    var kHzPerPx = (2 * HALF) / sw;
    var yTop = 30, hTop = h * 0.44;
    var baseTop = yTop + hTop;                     // baseline of the transmitted spectrum
    var yBot = baseTop + 64, hBot = h - yBot - 34;
    var baseBot = yBot + hBot;
    var Xt = function (fk) { return x0 + (fk - (FC - HALF)) / kHzPerPx; };   // transmitted axis
    var Xb = function (fk) { return x0 + fk / kHzPerPx; };                   // message axis, from 0

    var B = S.fm, m = S.m;
    var HC = hTop - 12;                            // carrier spike height

    function axis(y, label) {
      ctx.lineWidth = 1.5; ctx.strokeStyle = fgA(0.5);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      mono(ctx, 9.5); ctx.fillStyle = fgA(0.5);
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText(label, x0, y - hTop - 8);
    }
    function narrow() { return w < 620; }
    function spike(x, hh, color, lw) {
      ctx.lineWidth = lw || 3; ctx.strokeStyle = color;
      ctx.beginPath(); ctx.moveTo(x, baseTop); ctx.lineTo(x, baseTop - hh); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, baseTop - hh, (lw || 3) * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    }
    /* a message band drawn as a triangle: loudest near the bottom of the band */
    function tri(xa, xb, hh, color, base) {
      ctx.beginPath();
      ctx.moveTo(xa, base);
      ctx.lineTo(xa + (xb - xa) * 0.16, base - hh);
      ctx.lineTo(xb, base);
      ctx.closePath();
      ctx.fillStyle = color; ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = color; ctx.stroke();
    }

    /* ---------- transmitted spectrum ---------- */
    axis(baseTop, narrow() ? 'TRANSMITTED — AROUND 1000 kHz'
                        : 'TRANSMITTED — AROUND THE CARRIER AT 1000 kHz');
    if (S.kind === 'tone') {
      spike(Xt(FC - B), HC * m / 2, sigA(0.85), 3);
      spike(Xt(FC + B), HC * m / 2, sigA(0.85), 3);
    } else {
      tri(Xt(FC), Xt(FC + B), HC * m / 2, sigA(0.5), baseTop);
      tri(Xt(FC), Xt(FC - B), HC * m / 2, sigA(0.5), baseTop);
    }
    spike(Xt(FC), HC, fgA(0.8), 3.4);

    mono(ctx, 9.5); ctx.textBaseline = 'bottom';
    ctx.fillStyle = fgA(0.7); ctx.textAlign = 'center';
    ctx.fillText('carrier', Xt(FC), baseTop - HC - 7);
    ctx.fillStyle = sigA(0.85);
    ctx.textAlign = 'right'; ctx.fillText('LSB', Xt(FC - B) - 4, baseTop - HC * m / 2 - 7);
    ctx.textAlign = 'left';  ctx.fillText('USB', Xt(FC + B) + 4, baseTop - HC * m / 2 - 7);

    /* frequency ticks */
    mono(ctx, 9); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (i = -HALF; i <= HALF; i += (narrow() ? 20 : 10)) {
      var xk = Xt(FC + i);
      ctx.strokeStyle = fgA(0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xk, baseTop); ctx.lineTo(xk, baseTop + 4); ctx.stroke();
      ctx.fillStyle = fgA(0.45);
      alignAt(ctx, xk, x0, x1);
      ctx.fillText(grp(FC + i), xk, baseTop + 6);
    }

    /* the bandwidth bracket */
    var ya = baseTop + 24;
    ctx.lineWidth = 1.3; ctx.strokeStyle = sigA(0.75);
    ctx.beginPath();
    ctx.moveTo(Xt(FC - B), ya - 4); ctx.lineTo(Xt(FC - B), ya);
    ctx.lineTo(Xt(FC + B), ya); ctx.lineTo(Xt(FC + B), ya - 4);
    ctx.stroke();
    plate(ctx, (Xt(FC - B) + Xt(FC + B)) / 2, ya + 9,
          'BW = 2 × ' + nf(B, 3) + ' = ' + nf(2 * B, 3) + ' kHz', sigA(0.9));

    /* ---------- the message, where it started ---------- */
    ctx.lineWidth = 1.5; ctx.strokeStyle = fgA(0.5);
    ctx.beginPath(); ctx.moveTo(x0, baseBot); ctx.lineTo(x1, baseBot); ctx.stroke();
    mono(ctx, 9.5); ctx.fillStyle = fgA(0.5); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(narrow() ? 'THE MESSAGE, AT ITS OWN FREQUENCY'
                          : 'THE MESSAGE — WHERE IT STARTS, NEXT TO ZERO',
                 x1, baseBot - hBot - 8);

    var hb = Math.min(hBot - 10, HC * 0.55);
    if (S.kind === 'tone') {
      ctx.lineWidth = 3; ctx.strokeStyle = sigA(0.85);
      ctx.beginPath(); ctx.moveTo(Xb(B), baseBot); ctx.lineTo(Xb(B), baseBot - hb); ctx.stroke();
      ctx.beginPath(); ctx.arc(Xb(B), baseBot - hb, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = sigA(0.85); ctx.fill();
    } else {
      tri(Xb(0), Xb(B), hb, sigA(0.5), baseBot);
    }
    mono(ctx, 9); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (i = 0; i <= 40; i += (narrow() ? 20 : 10)) {
      var xb = Xb(i);
      ctx.strokeStyle = fgA(0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xb, baseBot); ctx.lineTo(xb, baseBot + 4); ctx.stroke();
      ctx.fillStyle = fgA(0.45);
      alignAt(ctx, xb, x0, x1);
      ctx.fillText(i + (i === 40 ? ' kHz' : ''), xb, baseBot + 6);
    }

    /* one line, instead of a pair of arrows that had to cross the bandwidth
       bracket and the axis labels to get where they were going */
    if (!narrow()) {
      mono(ctx, 9.5); ctx.fillStyle = sigA(0.8);
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('↑ the same shape, copied to both sides of the carrier',
                   x0, baseBot - hBot - 8);
    }

    var pctSb = 100 * (m * m / 2) / (1 + m * m / 2);
    ro(out, [
      ['carrier f<sub>c</sub>', '<b>1000 kHz</b>'],
      [S.kind === 'tone' ? 'message f<sub>m</sub>' : 'message band B', nf(B, 3) + ' kHz'],
      ['lower sideband', grp(FC - B) + ' kHz'],
      ['upper sideband', grp(FC + B) + ' kHz'],
      ['bandwidth', '<b>' + nf(2 * B, 3) + ' kHz</b>'],
      ['each sideband', 'm/2 = ' + fix(m / 2, 2) + ' A<sub>c</sub>'],
      ['power in sidebands', fix(pctSb, 1) + ' %']
    ]);
  });

  apply();
})();

/* ============================================================
   FIG 5 — where the power goes.
   ============================================================ */
(function () {
  var cv = document.getElementById('figPow');
  if (!cv) return;
  var S = { m: 1, pc: 50 };
  var slM = document.getElementById('powM'), lbM = document.getElementById('powMv');
  var slP = document.getElementById('powPc'), lbP = document.getElementById('powPcv');
  var out = document.getElementById('powOut'), note = document.getElementById('powNote');

  slM.addEventListener('input', function () { S.m = +slM.value / 100; apply(); });
  slP.addEventListener('input', function () { S.pc = +slP.value; apply(); });
  function apply() {
    lbM.textContent = fix(S.m, 2);
    lbP.textContent = S.pc + ' kW';
    fig.redraw();
  }

  var fig = Fig(cv, function (w) { return w / (w < 520 ? 300 : 265); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var x0 = 14, x1 = w - 14, sw = x1 - x0;
    var m = S.m, Pc = S.pc;
    var Psb = Pc * m * m / 4, Pt = Pc + 2 * Psb;
    var eff = (m * m) / (2 + m * m);

    /* ---------- the bar ---------- */
    var barY = 34, barH = 30, full = Pc * 1.5;     // full scale = the most AM can total
    var wC = sw * Pc / full, wS = sw * Psb / full;

    mono(ctx, 9.5); ctx.fillStyle = fgA(0.5); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('TOTAL TRANSMITTED POWER', x0, barY - 7);

    ctx.fillStyle = fgA(0.22);
    ctx.fillRect(x0, barY, wC, barH);
    ctx.fillStyle = sigA(0.85);
    ctx.fillRect(x0 + wC, barY, wS, barH);
    ctx.fillRect(x0 + wC + wS, barY, wS, barH);
    ctx.lineWidth = 1; ctx.strokeStyle = fgA(0.45);
    ctx.strokeRect(x0, barY, wC + 2 * wS, barH);
    ctx.save();
    ctx.setLineDash([2, 3]); ctx.lineWidth = 1; ctx.strokeStyle = fgA(0.28);
    ctx.strokeRect(x0, barY, sw, barH);
    ctx.restore();
    mono(ctx, 9); ctx.fillStyle = fgA(0.4);
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('full scale: the most AM can total, at m = 1', x0 + sw, barY - 7);

    mono(ctx, 10);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    if (wC > 90) {
      ctx.fillStyle = fgA(0.8);
      ctx.fillText('CARRIER — NO INFORMATION', x0 + wC / 2, barY + barH / 2);
    }
    mono(ctx, 9.5); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = fgA(0.55);
    ctx.fillText(nf(Pc, 3) + ' kW', x0 + 2, barY + barH + 6);
    if (Psb > 0.02) {
      ctx.fillStyle = sigA(0.9);
      ctx.fillText('sidebands ' + nf(2 * Psb, 3) + ' kW — the message', x0 + wC + 2, barY + barH + 6);
    }

    /* ---------- the efficiency curve ---------- */
    var cy0 = barY + barH + 46, cyH = h - cy0 - 26;
    var cx0 = 22, cx1 = w - 22, cxW = cx1 - cx0;
    var EMAX = 0.4;                                 // 40 % of the vertical axis is plenty
    var EY = function (e) { return cy0 + cyH - (e / EMAX) * cyH; };
    var EX = function (mm) { return cx0 + mm * cxW; };

    ctx.lineWidth = 1.3; ctx.strokeStyle = fgA(0.45);
    ctx.beginPath(); ctx.moveTo(cx0, cy0 - 6); ctx.lineTo(cx0, cy0 + cyH); ctx.lineTo(cx1, cy0 + cyH); ctx.stroke();

    ctx.save(); ctx.setLineDash([2, 4]); ctx.lineWidth = 1; ctx.strokeStyle = fgA(0.25);
    ctx.beginPath(); ctx.moveTo(cx0, EY(1 / 3)); ctx.lineTo(cx1, EY(1 / 3)); ctx.stroke();
    ctx.restore();
    mono(ctx, 9); ctx.fillStyle = fgA(0.5); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('33.3 % — the ceiling, at m = 1', cx1, EY(1 / 3) - 4);

    ctx.beginPath();
    for (var i = 0; i <= 100; i++) {
      var mm = i / 100, e = mm * mm / (2 + mm * mm);
      i ? ctx.lineTo(EX(mm), EY(e)) : ctx.moveTo(EX(mm), EY(e));
    }
    ctx.lineWidth = 2; ctx.strokeStyle = sigA(0.85); ctx.stroke();

    ctx.beginPath(); ctx.arc(EX(m), EY(eff), 4.5, 0, Math.PI * 2);
    ctx.fillStyle = pal().sig; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = pal().bg; ctx.stroke();

    mono(ctx, 9); ctx.fillStyle = fgA(0.45);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('m = 0', cx0 + 3, cy0 + cyH + 5);
    ctx.textAlign = 'right';
    ctx.fillText('m = 1', cx1, cy0 + cyH + 5);
    mono(ctx, 9.5); ctx.fillStyle = fgA(0.5);
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('EFFICIENCY η — THE SHARE OF POWER THAT CARRIES THE MESSAGE', cx0, cy0 - 6);

    ro(out, [
      ['carrier P<sub>c</sub>', nf(Pc, 3) + ' kW'],
      ['each sideband', nf(Psb, 3) + ' kW'],
      ['total P<sub>t</sub>', '<b>' + nf(Pt, 4) + ' kW</b>'],
      ['useful part', nf(2 * Psb, 3) + ' kW'],
      ['wasted on carrier', '<b>' + nf(Pc, 3) + ' kW</b>'],
      ['efficiency η', '<b>' + fix(100 * eff, 1) + ' %</b>']
    ]);

    verdict(note, m > 0.95 ? 'good' : '',
      m < 0.05 ? 'Nothing but carrier. Full power out of the antenna, zero information in it.' :
      m < 0.5  ? 'Quiet modulation: over ' + fix(100 * (1 - eff), 0) + ' % of the power is doing nothing at all.' :
      m < 0.95 ? 'Typical broadcast territory. Still more than three quarters of the power in the carrier.' :
                 'Full modulation — the best standard AM can do. One third useful, two thirds heat and carrier.');
  });

  apply();
})();

/* ============================================================
   FIG 6 — the envelope detector, simulated peak by peak.

   The capacitor charges instantly to the incoming voltage whenever the
   diode conducts (input above the capacitor), and otherwise decays with
   the time constant RC. That is the whole model, and it reproduces both
   failure modes honestly: ripple when RC is too small, diagonal clipping
   when RC is too large.
   ============================================================ */
(function () {
  var cv = document.getElementById('figDet');
  if (!cv) return;
  var FC = 400e3, FM = 5e3, M = 0.5;
  var RCMIN = 0.5e-6, RCMAX = 600e-6;
  var S = { rc: 25e-6, ideal: true };

  var sl = document.getElementById('detRC'), lbl = document.getElementById('detRCv');
  var chk = document.getElementById('detIdeal');
  var out = document.getElementById('detOut'), note = document.getElementById('detNote');
  var host = document.getElementById('detPresets');

  function rcFromT(v) { return RCMIN * Math.pow(RCMAX / RCMIN, v / 1000); }
  function tFromRC(v) { return 1000 * Math.log(v / RCMIN) / Math.log(RCMAX / RCMIN); }

  pills(host, [
    { label: 'TOO FAST', rc: 1.5e-6 },
    { label: 'JUST RIGHT', rc: 25e-6 },
    { label: 'TOO SLOW', rc: 300e-6 }
  ], function (it) { S.rc = it.rc; sl.value = Math.round(tFromRC(it.rc)); apply(); }, 1);

  sl.value = Math.round(tFromRC(S.rc));
  sl.addEventListener('input', function () { S.rc = rcFromT(+sl.value); clearPills(host); apply(); });
  chk.addEventListener('change', function () { S.ideal = chk.checked; fig.redraw(); });

  function fmtS(v) {
    if (v >= 1e-3) return nf(v * 1e3, 3) + ' ms';
    if (v >= 1e-6) return nf(v * 1e6, 3) + ' µs';
    return nf(v * 1e9, 3) + ' ns';
  }
  function apply() { lbl.textContent = fmtS(S.rc); fig.redraw(); }

  var fig = Fig(cv, function (w) { return w / (w < 520 ? 240 : 225); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h, i;
    clear(f);
    var x0 = 16, x1 = w - 16, sw = x1 - x0;
    var TWIN = 2 / FM;                              // two cycles of the message
    var N = Math.max(1200, Math.round(sw * 4));
    var dt = TWIN / N;
    var p = panel(x0, sw, h * 0.54 + 6, h * 0.42 - 6);

    /* the simulation. One message cycle is run first and thrown away, so the
       plot starts from a settled capacitor instead of an arbitrary one. */
    var vc = 1 - M, det = new Float64Array(N + 1), inp = new Float64Array(N + 1), t, u, env;
    for (i = -Math.round(N / 2); i < 0; i++) {
      t = i * dt;
      env = 1 + M * Math.sin(2 * Math.PI * FM * t - Math.PI / 2);
      u = env * Math.cos(2 * Math.PI * FC * t);
      vc = u > vc ? u : vc * Math.exp(-dt / S.rc);
    }
    for (i = 0; i <= N; i++) {
      t = i * dt;
      env = 1 + M * Math.sin(2 * Math.PI * FM * t - Math.PI / 2);
      u = env * Math.cos(2 * Math.PI * FC * t);
      inp[i] = u;
      if (u > vc) vc = u;                            // diode conducts: follow the input
      else vc = vc * Math.exp(-dt / S.rc);           // diode off: leak through R
      det[i] = vc;
    }
    var SC = 1 / (1 + M);

    zeroLine(ctx, p, 0.25);
    /* what arrives */
    curve(ctx, p, function (uu) { return inp[Math.round(uu * N)] * SC; }, fgA(0.22), 1, null, N);
    /* what the message was */
    if (S.ideal) {
      curve(ctx, p, function (uu) {
        return (1 + M * Math.sin(2 * Math.PI * FM * uu * TWIN - Math.PI / 2)) * SC;
      }, fgA(0.5), 1.4, [5, 4], 400);
    }
    /* what the capacitor does */
    /* the two ends of the window: ripple below, diagonal clipping above.
       The upper bound is the standard one, RC ≤ √(1 − m²) / (m·2π·fm). */
    var RCMAXOK = Math.sqrt(1 - M * M) / (M * 2 * Math.PI * FM);
    var RCMINOK = 4 / FC;
    var bad = S.rc > RCMAXOK || S.rc < RCMINOK;
    curve(ctx, p, function (uu) { return det[Math.round(uu * N)] * SC; },
          bad ? badCol() : pal().sig, 2, null, N);

    panelLabel(ctx, p, 'VOLTAGE ON THE CAPACITOR', bad ? badCol() : sigA(0.85));
    mono(ctx, 9); ctx.fillStyle = fgA(0.45);
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('faint line: the AM signal arriving   ·   dashed: the original message',
                 x1, p.mid - p.amp - 4);

    /* how far the output strayed from the envelope it should have traced */
    var err = 0, ref = 0, e2;
    for (i = 0; i <= N; i++) {
      env = 1 + M * Math.sin(2 * Math.PI * FM * i * dt - Math.PI / 2);
      e2 = det[i] - env;
      err += e2 * e2; ref += (env - 1) * (env - 1);
    }
    var rel = Math.sqrt(err / ref) * 100;

    ro(out, [
      ['carrier f<sub>c</sub>', '400 kHz'],
      ['message f<sub>m</sub>', '5 kHz'],
      ['RC', '<b>' + fmtS(S.rc) + '</b>'],
      ['RC × f<sub>c</sub>', '<b>' + nf(S.rc * FC, 3) + '</b> (want ≫ 1)'],
      ['RC × f<sub>m</sub>', '<b>' + nf(S.rc * FM, 3) + '</b> (want ≪ 1)'],
      ['upper limit', fmtS(RCMAXOK)],
      ['error vs message', fix(Math.min(rel, 999), 1) + ' %']
    ]);

    verdict(note, bad ? 'bad' : 'good',
      S.rc < RCMINOK ? 'Too fast. The capacitor empties between carrier peaks, so the output is chasing the carrier instead of the envelope — that is the ripple.' :
      S.rc > RCMAXOK ? 'Too slow. The capacitor cannot fall as quickly as the envelope does, so the output cuts straight across the corners: diagonal clipping.' :
                     'In the window: slow enough to ignore the carrier, fast enough to follow the message.');
  });

  /* ---- the circuit underneath ---- */
  var ck = document.getElementById('figDetCkt');
  if (ck) Fig(ck, function (w) { return w / (w < 520 ? 120 : 105); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var y = h * 0.4, gnd = h - 20;
    var xa = 28, xd = w * 0.36, xn = w * 0.58, xo = w - 34;
    ctx.lineWidth = 1.6; ctx.strokeStyle = fgA(0.7); ctx.lineCap = 'round';

    function wire(x1, y1, x2, y2) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    /* in */
    wire(xa, y, xd - 12, y);
    /* diode */
    ctx.beginPath();
    ctx.moveTo(xd - 12, y - 9); ctx.lineTo(xd - 12, y + 9); ctx.lineTo(xd + 8, y);
    ctx.closePath();
    ctx.fillStyle = sigA(0.85); ctx.fill();
    ctx.strokeStyle = sigA(0.85); ctx.stroke();
    ctx.strokeStyle = fgA(0.7);
    wire(xd + 8, y - 10, xd + 8, y + 10);
    wire(xd + 8, y, xn, y);
    /* node out */
    wire(xn, y, xo, y);
    ctx.beginPath(); ctx.arc(xn, y, 3, 0, Math.PI * 2); ctx.fillStyle = fgA(0.7); ctx.fill();
    /* capacitor */
    wire(xn, y, xn, y + 18);
    wire(xn - 12, y + 18, xn + 12, y + 18);
    wire(xn - 12, y + 25, xn + 12, y + 25);
    wire(xn, y + 25, xn, gnd);
    /* resistor */
    var xr = xn + 62;
    wire(xr, y, xr, y + 12);
    ctx.beginPath();
    ctx.moveTo(xr, y + 12);
    for (var k = 0; k < 6; k++) ctx.lineTo(xr + (k % 2 ? 7 : -7), y + 16 + k * 5);
    ctx.lineTo(xr, y + 46);
    ctx.stroke();
    wire(xr, y + 46, xr, gnd);
    wire(xn, y, xr, y);
    /* ground rail */
    wire(xa, gnd, xo, gnd);
    /* input source */
    ctx.beginPath(); ctx.arc(xa, (y + gnd) / 2, 13, 0, Math.PI * 2);
    ctx.strokeStyle = fgA(0.7); ctx.stroke();
    wire(xa, y, xa, (y + gnd) / 2 - 13);
    wire(xa, (y + gnd) / 2 + 13, xa, gnd);
    ctx.beginPath();
    for (var q = -8; q <= 8; q++) {
      var yy = (y + gnd) / 2 - 5 * Math.sin(q / 8 * Math.PI);
      q === -8 ? ctx.moveTo(xa + q, yy) : ctx.lineTo(xa + q, yy);
    }
    ctx.strokeStyle = sigA(0.8); ctx.stroke();

    mono(ctx, 9.5); ctx.fillStyle = fgA(0.55);
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('AM in', xa, y - 12);
    ctx.fillText('diode', xd, y - 14);
    ctx.textBaseline = 'top';
    ctx.fillText('C', xn - 22, y + 16);
    ctx.fillText('R', xr + 20, y + 24);
    ctx.textBaseline = 'bottom'; ctx.textAlign = 'right';
    ctx.fillStyle = sigA(0.9);
    ctx.fillText('the message, out', xo, y - 12);
  });

  apply();
})();

/* ============================================================
   FIG 7 — four stations sharing a band, and one tunable filter.
   The recovered audio is each station's message weighted by how
   much of it fits inside the filter window, which is a crude model
   of a real receiver and exactly right for the point being made.
   ============================================================ */
(function () {
  var cv = document.getElementById('figDial');
  if (!cv) return;
  var F0 = 950, F1 = 1050;                          // kHz shown
  var STATIONS = [
    { f: 965,  b: 5, name: 'ALPHA', shape: 'sine',  fm: 1.0 },
    { f: 995,  b: 5, name: 'BRAVO', shape: 'two',   fm: 0.8 },
    { f: 1022, b: 5, name: 'CHARLIE', shape: 'tri', fm: 1.4 },
    { f: 1032, b: 5, name: 'DELTA', shape: 'pulse', fm: 0.6 }
  ];
  var S = { f: 995, bw: 10 };

  var slF = document.getElementById('dialF'), lbF = document.getElementById('dialFv');
  var slB = document.getElementById('dialBW'), lbB = document.getElementById('dialBWv');
  var out = document.getElementById('dialOut'), note = document.getElementById('dialNote');
  var host = document.getElementById('dialPresets');

  slF.min = F0; slF.max = F1; slF.step = 0.5; slF.value = S.f;
  slF.addEventListener('input', function () { S.f = +slF.value; clearPills(host); apply(); });
  slB.addEventListener('input', function () { S.bw = +slB.value; apply(); });

  pills(host, STATIONS.map(function (st) {
    return { label: st.name + ' ' + st.f, f: st.f };
  }), function (it) { S.f = it.f; slF.value = it.f; apply(); }, 1);

  function apply() {
    lbF.textContent = nf(S.f, 5) + ' kHz';
    lbB.textContent = S.bw + ' kHz';
    fig.redraw();
  }

  /* how much of a station falls inside the filter window */
  function weight(st) {
    var a = Math.max(st.f - st.b, S.f - S.bw / 2);
    var b = Math.min(st.f + st.b, S.f + S.bw / 2);
    var frac = Math.max(0, b - a) / (2 * st.b);
    /* an envelope detector needs the carrier itself, so a station whose
       carrier is outside the window barely comes through at all */
    var carrierIn = Math.abs(st.f - S.f) <= S.bw / 2 ? 1 : 0.15;
    return frac * carrierIn;
  }

  var fig = Fig(cv, function (w) { return w / (w < 520 ? 310 : 285); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h, i;
    clear(f);
    var x0 = 16, x1 = w - 16, sw = x1 - x0;
    var X = function (fk) { return x0 + (fk - F0) / (F1 - F0) * sw; };
    var specTop = 34, specBase = specTop + h * 0.42;
    var audTop = specBase + 54, audH = h - audTop - 18;
    var pA = panel(x0, sw, audTop + audH / 2, audH / 2);
    var HC = specBase - specTop - 6;

    /* the filter window, drawn behind everything */
    var wx0 = X(S.f - S.bw / 2), wx1 = X(S.f + S.bw / 2);
    ctx.fillStyle = sigA(0.13);
    ctx.fillRect(wx0, specTop - 12, wx1 - wx0, specBase - specTop + 12);
    ctx.lineWidth = 1.4; ctx.strokeStyle = sigA(0.6);
    ctx.save(); ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(wx0, specBase); ctx.lineTo(wx0, specTop - 12);
    ctx.lineTo(wx1, specTop - 12); ctx.lineTo(wx1, specBase);
    ctx.stroke(); ctx.restore();
    mono(ctx, 9.5); ctx.fillStyle = sigA(0.9);
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('THE FILTER', (wx0 + wx1) / 2, specTop - 18);

    /* the band */
    ctx.lineWidth = 1.5; ctx.strokeStyle = fgA(0.5);
    ctx.beginPath(); ctx.moveTo(x0, specBase); ctx.lineTo(x1, specBase); ctx.stroke();
    mono(ctx, 9); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (i = F0; i <= F1; i += (w < 620 ? 25 : 10)) {
      ctx.strokeStyle = fgA(0.28); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(i), specBase); ctx.lineTo(X(i), specBase + 4); ctx.stroke();
      ctx.fillStyle = fgA(0.45);
      alignAt(ctx, X(i), x0, x1);
      ctx.fillText(i + (i === F1 ? ' kHz' : ''), X(i), specBase + 6);
    }

    STATIONS.forEach(function (st) {
      var wgt = weight(st), on = wgt > 0.05;
      var col = on ? sigA(0.8) : fgA(0.35);
      /* sidebands */
      ctx.beginPath();
      ctx.moveTo(X(st.f - st.b), specBase);
      ctx.lineTo(X(st.f - st.b * 0.15), specBase - HC * 0.42);
      ctx.lineTo(X(st.f + st.b * 0.15), specBase - HC * 0.42);
      ctx.lineTo(X(st.f + st.b), specBase);
      ctx.closePath();
      ctx.fillStyle = on ? sigA(0.28) : fgA(0.12); ctx.fill();
      /* carrier */
      ctx.lineWidth = 2.6; ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(X(st.f), specBase); ctx.lineTo(X(st.f), specBase - HC); ctx.stroke();
      mono(ctx, 9); ctx.fillStyle = on ? sigA(0.95) : fgA(0.45);
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(w < 620 ? st.name.charAt(0) : st.name, X(st.f), specBase - HC - 4);
    });

    /* ---------- what comes out of the detector ---------- */
    var heard = STATIONS.filter(function (st) { return weight(st) > 0.05; });
    var norm = 0;
    heard.forEach(function (st) { norm += weight(st); });
    var aud = function (u) {
      var v = 0;
      heard.forEach(function (st) { v += weight(st) * SHAPES[st.shape](st.fm * 2 * u); });
      return norm > 0 ? v / Math.max(norm, 1) : 0;
    };

    zeroLine(ctx, pA, 0.25);
    if (heard.length) {
      fillCurve(ctx, pA, aud, heard.length > 1 ? rgba(badCol(), 0.10) : sigA(0.10));
      curve(ctx, pA, aud, heard.length > 1 ? badCol() : pal().sig, 2, null, 900);
    } else {
      /* nothing tuned in: the receiver still hears its own noise */
      curve(ctx, pA, function (u) {
        return 0.05 * Math.sin(u * 941) + 0.04 * Math.sin(u * 613 + 1.7) + 0.03 * Math.sin(u * 2213);
      }, fgA(0.4), 1.2, null, 1200);
    }
    panelLabel(ctx, pA, 'WHAT YOU HEAR', heard.length > 1 ? badCol() : sigA(0.85));

    var names = heard.map(function (st) { return st.name; }).join(' + ');
    ro(out, [
      ['tuned to', '<b>' + nf(S.f, 5) + ' kHz</b>'],
      ['filter width', S.bw + ' kHz'],
      ['station needs', '2B = 10 kHz'],
      ['stations inside', '<b>' + heard.length + '</b>'],
      ['you hear', names || '—']
    ]);

    verdict(note, heard.length === 1 ? 'good' : (heard.length > 1 ? 'bad' : ''),
      heard.length === 0 ? 'Between stations. The filter is sitting on empty spectrum, so nothing reaches the detector but noise.' :
      heard.length === 1 ? 'Tuned to ' + names + '. One station inside the window, everything else thrown away — this is what a tuning knob is for.' :
      'Two stations inside one window: ' + names + '. Their sidebands both reach the detector and you hear them mixed together. ' +
      'This is why channels are spaced at least 2B apart, and why the filter must not be wider than one channel.');
  });

  apply();
})();

/* ============================================================
   Share row — the platform links are plain <a> in the markup and
   work without any of this. All that is added here is the copy
   button and, where the browser has one, the native share sheet.
   ============================================================ */
(function () {
  var host = document.querySelector('.share');
  if (!host) return;

  var canon = document.querySelector('link[rel=canonical]');
  var url = (canon && canon.href) || location.href.split('#')[0];
  var title = (document.querySelector('meta[property="og:title"]') || {}).content || document.title;

  var copy = document.getElementById('shareCopy');
  var label = document.getElementById('shareCopyLabel');
  var native = document.getElementById('shareNative');

  function flash(msg) {
    label.textContent = msg;
    copy.classList.add('done');
    clearTimeout(copy._t);
    copy._t = setTimeout(function () {
      label.textContent = 'Copy link';
      copy.classList.remove('done');
    }, 1800);
  }

  copy.addEventListener('click', function () {
    /* the clipboard API needs a secure context; file:// and plain http fall
       back to the textarea trick rather than a dead button */
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () { flash('Copied'); }, legacy);
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
    flash(ok ? 'Copied' : 'Press ⌘/Ctrl + C');
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
