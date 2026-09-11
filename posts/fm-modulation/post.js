"use strict";
/* ============================================================
   "FM Modulation" — interactive figures.
   No dependencies, no network. Everything draws to <canvas>
   using the page's three CSS hues, so it follows the theme.

   The scaffolding below — palette, canvas plumbing, audio, the
   plotting helpers — is the same set the AM essay uses, minus its
   bilingual layer: this post is English only, so labels are written
   where they are drawn.
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

/* ============================================================
   Sound
   ------------------------------------------------------------
   Three of these figures are about things the ear reads faster than
   the eye: an envelope folded through zero, a detector that cannot
   keep up, two stations inside one filter. Web Audio, no files, and
   nothing makes a sound until it is asked to — one figure at a time,
   and never while it is off screen.

   Every generator returns one loop holding a whole number of cycles,
   so the seam is silent, and every loop has its mean removed: the
   audio side of a receiver is AC-coupled, and a buffer with a DC
   offset in it starts and ends with a click.
   ============================================================ */
var AUDIO = (function () {
  var ac = null, cur = null, owner = null, onEnd = null, pend = null, last = 0;
  var LEVEL = 0.16, FADE = 0.05;

  function context() {
    if (!ac) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ac = new C();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function attach(data) {
    var buf = ac.createBuffer(1, data.length, ac.sampleRate);
    if (buf.copyToChannel) buf.copyToChannel(data, 0);
    else buf.getChannelData(0).set(data);
    var src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = buf; src.loop = true;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(LEVEL, ac.currentTime + FADE);
    src.connect(g); g.connect(ac.destination); src.start();
    return { src: src, gain: g };
  }
  function release(n) {
    if (!n) return;
    var t = ac.currentTime;
    n.gain.gain.cancelScheduledValues(t);
    n.gain.gain.setValueAtTime(Math.max(n.gain.gain.value, 0.0001), t);
    n.gain.gain.exponentialRampToValueAtTime(0.0001, t + FADE);
    try { n.src.stop(t + FADE * 1.6); } catch (e) {}
  }

  var api = {
    supported: function () { return !!(window.AudioContext || window.webkitAudioContext); },
    playing: function (id) { return owner === id; },

    /* one loop of a periodic signal, holding an exact whole number of cycles */
    periodic: function (sr, freq, seconds, fn) {
      var cycles = Math.max(1, Math.round(freq * seconds));
      var len = Math.max(2, Math.round(sr * cycles / freq));
      var out = new Float32Array(len), i;
      for (i = 0; i < len; i++) out[i] = fn(cycles * i / len);
      return out;
    },
    centre: function (buf, scale) {
      var i, m = 0, k = scale === undefined ? 1 : scale;
      for (i = 0; i < buf.length; i++) m += buf[i];
      m /= buf.length;
      for (i = 0; i < buf.length; i++) buf[i] = (buf[i] - m) * k;
      return buf;
    },

    start: function (id, build, whenStopped) {
      api.stop();
      var c = context();
      if (!c) return false;
      cur = attach(build(c.sampleRate));
      owner = id; onEnd = whenStopped || null; last = Date.now();
      return true;
    },
    /* a control moved while the sound was running. Rebuilding a buffer costs
       under a millisecond, but a drag fires far more often than anyone can
       hear, so the crossfades are thinned to about eight a second. */
    retune: function (id, build) {
      if (owner !== id || !ac) return;
      clearTimeout(pend);
      var go = function () {
        if (owner !== id || !ac) return;
        last = Date.now();
        var old = cur;
        cur = attach(build(ac.sampleRate));
        release(old);
      };
      var since = Date.now() - last;
      if (since > 120) go(); else pend = setTimeout(go, 120 - since);
    },
    stop: function () {
      clearTimeout(pend);
      if (!owner) return;
      release(cur); cur = null;
      var f = onEnd; owner = null; onEnd = null;
      if (f) f();
    }
  };
  return api;
})();

/* wire a Listen button to a generator, and hand back a handle the figure uses
   to follow its own controls */
function listenBtn(btnId, build, label) {
  var btn = document.getElementById(btnId);
  if (!btn) return { retune: function () {} };
  if (!AUDIO.supported()) { btn.hidden = true; return { retune: function () {} }; }
  var word = label || 'LISTEN';

  /* the generator hangs off the button so a test can render a loop and measure
     it, instead of anyone having to judge these by ear */
  btn._build = build;

  function paint(on) {
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = on ? '■ STOP' : '▶ ' + word;
  }
  btn.addEventListener('click', function () {
    if (AUDIO.playing(btnId)) { AUDIO.stop(); return; }
    if (AUDIO.start(btnId, build, function () { paint(false); })) paint(true);
  });
  paint(false);

  /* reading somewhere else should not leave a tone playing behind you */
  var fig = btn.closest('figure') || btn;
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (e) {
      if (!e[0].isIntersecting && AUDIO.playing(btnId)) AUDIO.stop();
    }, { threshold: 0.05 }).observe(fig);
  }
  return { retune: function () { AUDIO.retune(btnId, build); } };
}
document.addEventListener('visibilitychange', function () {
  if (document.hidden) AUDIO.stop();
});

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
/* A carrier has more cycles than the panel has pixels — on a phone, many more.
   Joining evenly spaced samples with straight lines then draws a line that
   misses most of the peaks, and what you see is a moiré pattern rather than
   the signal. So sample every column and paint it from the smallest value in
   that column to the largest, the way an oscilloscope renders a fast trace:
   correct at any width, and it degrades into an honest solid band instead of
   into a lie. Column ranges share their end points, so the trace stays joined
   where the wave is slow. */
function denseCurve(ctx, p, fn, style, lw, samples) {
  var cols = Math.max(2, Math.round(p.w));
  var per = Math.max(2, Math.ceil((samples || cols * 10) / cols));
  var cw = p.w / cols, wpx = lw || 1.3;
  var i, k, v, lo, hi, x, yh, yl, hh;
  ctx.fillStyle = style;
  for (i = 0; i < cols; i++) {
    lo = Infinity; hi = -Infinity;
    for (k = 0; k <= per; k++) {
      v = fn((i + k / per) / cols);
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    x = p.x + i * cw;
    yh = p.mid - hi * p.amp;
    yl = p.mid - lo * p.amp;
    hh = yl - yh;
    if (hh < wpx) { yh -= (wpx - hh) / 2; hh = wpx; }
    ctx.fillRect(x, yh, Math.max(cw, wpx), hh);
  }
}
/* With one language there is nothing to switch fonts for, so these are the
   bare canvas calls under the names the plotting helpers already use. */
function drawLabel(ctx, text, x, y, maxW) {
  if (maxW === undefined) ctx.fillText(text, x, y);
  else ctx.fillText(text, x, y, maxW);
}
function labelWidth(ctx, text) { return ctx.measureText(text).width; }

function mono(ctx, size, weight) {
  ctx.font = (weight || 500) + ' ' + size + 'px ' + LBL_FONT;
}
/* a small caption pinned to the top-left of a panel */
function panelLabel(ctx, p, text, color) {
  mono(ctx, 9.5);
  ctx.fillStyle = color || fgA(0.55);
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  drawLabel(ctx, text, p.x, p.mid - p.amp - 4);
}
/* end ticks align inwards, so the first and last labels stay on the canvas */
function alignAt(ctx, x, x0, x1) {
  ctx.textAlign = x <= x0 + 2 ? 'left' : (x >= x1 - 2 ? 'right' : 'center');
}
/* text on an opaque plate, so it never fights with a line underneath */
function plate(ctx, x, y, text, color, align) {
  mono(ctx, 10);
  var w = labelWidth(ctx, text) + 10;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  var x0 = align === 'right' ? x - w : x;
  ctx.fillStyle = rgba(pal().bg, 0.9);
  ctx.fillRect(x0, y - 8, w, 16);
  ctx.fillStyle = color;
  drawLabel(ctx, text, x0 + 5, y);
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
   The FM core
   ------------------------------------------------------------
   Everything here counts in CYCLES ACROSS THE DRAWING WINDOW rather
   than in hertz, so one piece of code serves both a picture and a
   sound. Every window holds a whole number of message periods, which
   makes it periodic: audio loops without a click, and the ideal
   low-pass below has nothing to leak.
   ============================================================ */

/* J_n(x) = (1/pi) * integral over 0..pi of cos(n*th - x*sin th) d(th).
   Simpson, with the sample count growing with n + x because that is how
   fast the integrand turns. No recurrence, so nothing to go unstable at
   high order — checked against a 60-digit power series to 11 places. */
function besselJ(n, x) {
  var N = 2 * Math.ceil(60 + 8 * (Math.abs(n) + Math.abs(x)));
  var h = Math.PI / N, s = 0, i, th, w;
  for (i = 0; i <= N; i++) {
    th = i * h;
    w = (i === 0 || i === N) ? 1 : (i % 2 ? 4 : 2);
    s += w * Math.cos(n * th - x * Math.sin(th));
  }
  return s * h / 3 / Math.PI;
}

/* Running integral of the message across the window, tabulated once and
   interpolated. The phase of an FM wave is this integral — never the
   message itself — so every figure needs it. */
function integrator(shape, cycles, n) {
  var N = n || 8192, tab = new Float64Array(N + 1), f = SHAPES[shape];
  var i, acc = 0, du = 1 / N;
  for (i = 1; i <= N; i++) {
    acc += (f(cycles * (i - 1) * du) + f(cycles * i * du)) * 0.5 * du;
    tab[i] = acc;
  }
  return function (u) {
    u -= Math.floor(u);
    var s = u * N, k = s | 0;
    return tab[k] + (tab[k + 1] - tab[k]) * (s - k);
  };
}

/* phase(u) = 2*pi*[ nc*u + beta*nm*I(u) ], which puts d(phase)/dt exactly
   on fc + dev*x(t) */
function fmPhase(nc, beta, nm, I) {
  return function (u) { return 2 * Math.PI * (nc * u + beta * nm * I(u)); };
}

/* Deterministic noise spread evenly over one band.

   Generating it inside the receiver's passband is the same thing as
   generating it everywhere and then filtering, and it costs nothing — which
   is why there is no IF filter anywhere else in this file. It also keeps the
   comparison in figure 1 honest: an FM receiver needs a passband (β+1) times
   wider than an AM one, so at the same noise density it admits sqrt(β+1)
   times the noise amplitude, and the figure makes it pay that.

   Incommensurate cosines rather than Math.random, so a redraw shows the same
   noise instead of reshuffling it and a drag shows the noise growing. Unit
   RMS. */
function noiseFn(centre, halfWidth, seed) {
  var K = 64, w = [], p = [], i, s = (seed || 1) | 0;
  for (i = 0; i < K; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    w.push(2 * Math.PI * (centre - halfWidth + 2 * halfWidth * (i + 0.5) / K));
    p.push(2 * Math.PI * (s / 0x7fffffff));
  }
  var norm = Math.sqrt(K / 2);
  return function (u) {
    var v = 0, k;
    for (k = 0; k < K; k++) v += Math.cos(w[k] * u + p[k]);
    return v / norm;
  };
}

/* The audio filter that follows every detector, as a brick wall: keep the
   first K harmonics of the window and drop the rest. It has to sit at the
   message bandwidth — that is what makes FM's wide IF free rather than
   expensive, and it is the bandwidth the textbook figure of merit assumes.
   The window is periodic, so this costs O(M*K) and shifts nothing. */
function lowpass(a, M, K) {
  var out = new Float64Array(M), k, i, c, s, th, dc = 0;
  for (i = 0; i < M; i++) dc += a[i];
  dc /= M;
  for (i = 0; i < M; i++) out[i] = dc;
  for (k = 1; k <= K; k++) {
    c = 0; s = 0;
    for (i = 0; i < M; i++) {
      th = 2 * Math.PI * k * i / M;
      c += a[i] * Math.cos(th); s += a[i] * Math.sin(th);
    }
    c *= 2 / M; s *= 2 / M;
    for (i = 0; i < M; i++) {
      th = 2 * Math.PI * k * i / M;
      out[i] += c * Math.cos(th) + s * Math.sin(th);
    }
  }
  return out;
}

/* A zero-crossing discriminator, which is what a limiter feeds in a modern
   set: read the instantaneous frequency off the spacing of the crossings.
   Doing it this way rather than differentiating a phase we already know
   means the threshold effect appears on its own — noise that manufactures an
   extra crossing writes a false frequency, exactly as it does on the bench. */
function discriminate(sig, N) {
  var prev = sig(0), cur, i, u, pu = 0, t0 = null, frac, tc;
  var ts = [], fs = [];
  for (i = 1; i <= N; i++) {
    u = i / N;
    cur = sig(u);
    if ((prev <= 0 && cur > 0) || (prev >= 0 && cur < 0)) {
      frac = prev === cur ? 0.5 : prev / (prev - cur);
      tc = pu + (u - pu) * frac;
      if (t0 !== null && tc > t0) { ts.push((t0 + tc) / 2); fs.push(0.5 / (tc - t0)); }
      t0 = tc;
    }
    prev = cur; pu = u;
  }
  return { t: ts, f: fs };
}
/* put the irregular crossing estimates on the uniform output grid */
function toGrid(d, M) {
  var out = new Float64Array(M), i, j = 0, u, t0, t1, w;
  if (!d.t.length) return out;
  for (i = 0; i < M; i++) {
    u = i / M;
    while (j < d.t.length - 1 && d.t[j + 1] < u) j++;
    if (j >= d.t.length - 1) { out[i] = d.f[d.f.length - 1]; continue; }
    t0 = d.t[j]; t1 = d.t[j + 1];
    w = t1 > t0 ? (u - t0) / (t1 - t0) : 0;
    out[i] = d.f[j] + (d.f[j + 1] - d.f[j]) * (w < 0 ? 0 : (w > 1 ? 1 : w));
  }
  return out;
}

/* A limiter, and the bandpass that always follows one in a real set.
   Clipping a sine produces something close to a square wave; the tuned
   circuit after it passes the fundamental and drops the harmonics, handing
   the next stage a wave of constant height. Its bandwidth has to cover
   Carson's band, or the resonator would trim the sidebands and turn some of
   the frequency swing back into the amplitude swing we just removed. */
function limiter(sig, N, nc, bw) {
  var buf = new Float64Array(N), i, x, y, pass;
  var Q = Math.max(0.7, nc / Math.max(bw * 2, nc / 12));
  var w0 = 2 * Math.PI * nc / N;
  var al = Math.sin(w0) / (2 * Q), c = Math.cos(w0);
  var a0 = 1 + al, b0 = al / a0, b2 = -al / a0, a1 = -2 * c / a0, a2 = (1 - al) / a0;
  var x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  /* two laps: the resonator starts cold, so the first one exists only to
     leave the state where the second should begin */
  for (pass = 0; pass < 2; pass++) {
    for (i = 0; i < N; i++) {
      x = sig(i / N);
      x = x > 0 ? 1 : (x < 0 ? -1 : 0);
      y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      if (pass) buf[i] = y;
    }
  }
  var peak = 0;
  for (i = 0; i < N; i++) if (Math.abs(buf[i]) > peak) peak = Math.abs(buf[i]);
  if (peak > 0) for (i = 0; i < N; i++) buf[i] /= peak;
  return buf;
}

/* The diode, resistor and capacitor from the AM essay: the capacitor charges
   to each positive peak and leaks between them, so RC sits between the
   carrier period and the message period. Returns the raw detector output on
   the output grid — the audio filter is the caller's job. */
function envelope(sample, N, M, nc, nm) {
  var rc = Math.sqrt((1 / nc) * (1 / nm)) * 0.5;
  var decay = Math.exp(-(1 / N) / rc);
  var v = 0, i, x, out = new Float64Array(M), per = N / M;
  for (i = 0; i < N; i++) { x = sample(i / N); v = x > v ? x : v * decay; }   /* prime */
  for (i = 0; i < N; i++) {
    x = sample(i / N);
    v = x > v ? x : v * decay;
    if (i % per < 1) out[Math.min(M - 1, Math.round(i / per))] = v;
  }
  return out;
}

/* The slope detector of section 7: differentiate, then envelope-detect.
   d/dt of Ac·cos(φ) is −Ac·φ′·sin(φ), so the height of the derivative follows
   the instantaneous frequency — FM turned into AM, then read with the same
   diode and capacitor. Anything still varying the height when it arrives
   here, noise included, is read as frequency: which is what the limiter in
   front of it is for. */
function slopeDetect(buf, N, M, nc, nm) {
  var d = new Float64Array(N), i, peak = 0;
  for (i = 1; i < N - 1; i++) d[i] = (buf[i + 1] - buf[i - 1]) * N * 0.5;
  d[0] = d[1]; d[N - 1] = d[N - 2];
  for (i = 0; i < N; i++) if (d[i] > peak) peak = d[i];
  if (peak > 0) for (i = 0; i < N; i++) d[i] /= peak;
  return envelope(function (u) {
    return d[Math.min(N - 1, Math.max(0, Math.round(u * N)))];
  }, N, M, nc, nm);
}

/* strip the mean and scale to unit peak: the AC coupling and the volume
   control, so two detector outputs can be drawn against each other */
function acNorm(a, M) {
  var out = new Float64Array(M), i, m = 0, p = 0;
  for (i = 0; i < M; i++) m += a[i];
  m /= M;
  for (i = 0; i < M; i++) { out[i] = a[i] - m; if (Math.abs(out[i]) > p) p = Math.abs(out[i]); }
  if (p > 0) for (i = 0; i < M; i++) out[i] /= p;
  return out;
}

/* sample an array back as a function of u, for the plotting helpers */
function asFn(a, M) {
  return function (u) {
    u -= Math.floor(u);
    var s = u * M, k = s | 0;
    return a[k] + (a[(k + 1) % M] - a[k]) * (s - k);
  };
}
/* how far the recovered trace is from the message it should be, in dB */
function snrDb(got, want, M) {
  var s = 0, r = 0, i;
  for (i = 0; i < M; i++) { s += (got[i] - want[i]) * (got[i] - want[i]); r += want[i] * want[i]; }
  if (s <= 0) return 99;
  return Math.max(-20, Math.min(99, -10 * Math.log10(s / Math.max(r, 1e-12))));
}

/* ============================================================
   HERO — an FM wave, running.
   ============================================================ */
(function () {
  var cv = document.getElementById('figHero');
  if (!cv) return;
  var NC = 26, NM = 1, BETA = 5;
  var I = integrator('sine', NM), ph = fmPhase(NC, BETA, NM, I);
  var t = 0;

  var fig = Fig(cv, 1.25, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var p = panel(6, w - 12, h / 2, h * 0.34);
    /* the flat envelope, which is the whole point of the picture */
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.strokeStyle = fgA(0.4);
    ctx.beginPath();
    ctx.moveTo(p.x, p.mid - p.amp); ctx.lineTo(p.x + p.w, p.mid - p.amp);
    ctx.moveTo(p.x, p.mid + p.amp); ctx.lineTo(p.x + p.w, p.mid + p.amp);
    ctx.stroke(); ctx.setLineDash([]);
    denseCurve(ctx, p, function (u) { return Math.cos(ph(u + t)); },
               sigA(0.9), 1.4, Math.max(4000, p.w * 14));
  });

  if (!REDUCED) animate(cv, function (sec) { t = sec * 0.06; fig.redraw(); }).start();
})();

/* ============================================================
   FIG 1 — the same noise through an AM receiver and an FM one.

   Both sides get the same noise density. Each gets the IF bandwidth its
   own signal needs, so FM pays for its width in admitted noise, and the
   ~19 dB it still wins by is the (3/2)β² of section 8 rather than an
   assertion. Measured, not asserted: the readout reports the SNR of each
   recovered trace against the message it should have been.
   ============================================================ */
(function () {
  var cv = document.getElementById('figNoise');
  if (!cv) return;
  var NC = 96, NM = 2, BETA = 4, MI = 0.9;
  var N = 1 << 14, M = 256;
  var S = { level: 0.10, hear: 'am' };

  var sl = document.getElementById('nzLevel'), lb = document.getElementById('nzLevelv');
  var out = document.getElementById('nzOut'), note = document.getElementById('nzNote');

  var I = integrator('sine', NM), ph = fmPhase(NC, BETA, NM, I);
  var amHalf = NM, fmHalf = (BETA + 1) * NM;
  var nA = noiseFn(NC, amHalf, 11), nF = noiseFn(NC, fmHalf, 11);
  var msg = new Float64Array(M), i;
  for (i = 0; i < M; i++) msg[i] = Math.sin(2 * Math.PI * NM * i / M);

  function amSig(u) {
    return (1 + MI * Math.sin(2 * Math.PI * NM * u)) * Math.cos(2 * Math.PI * NC * u)
           + S.level * Math.sqrt(amHalf) * nA(u);
  }
  function fmSig(u) {
    return Math.cos(ph(u)) + S.level * Math.sqrt(fmHalf) * nF(u);
  }
  function amOut() { return acNorm(lowpass(envelope(amSig, N, M, NC, NM), M, NM), M); }
  function fmOut() { return acNorm(lowpass(toGrid(discriminate(fmSig, N), M), M, NM), M); }

  pills(document.getElementById('nzHear'), [
    { label: 'hear the AM side', k: 'am' },
    { label: 'hear the FM side', k: 'fm' }
  ], function (it) { S.hear = it.k; audio.retune(); }, 0);

  sl.addEventListener('input', function () { S.level = +sl.value / 100; apply(); });

  /* One loop of whichever side is selected, scaled into hearing range. The
     ratios that matter — noise to signal, message to carrier — are the ones
     on screen. */
  var audio = listenBtn('nzPlay', function (sr) {
    var fm0 = 300, secs = 0.5;
    var cyc = Math.max(1, Math.round(fm0 * secs / NM));
    var len = Math.max(2, Math.round(sr * cyc * NM / fm0));
    var buf = new Float64Array(len), k, u, v;
    var det = S.hear === 'am' ? amOut() : fmOut();
    var f = asFn(det, M);
    for (k = 0; k < len; k++) {
      u = cyc * k / len;
      v = f(u);
      buf[k] = v;
    }
    return AUDIO.centre(buf, 0.8);
  });

  function apply() {
    lb.textContent = fix(S.level, 2);
    fig.redraw();
    audio.retune();
  }

  var fig = Fig(cv, function (w) { return w / (w < 560 ? 340 : 290); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var gap = 14, half = (w - 12 - gap) / 2;
    var a = amOut(), b = fmOut();
    var sides = [
      { x: 6,               t: 'AM', sig: amSig, det: a, tint: fgA(0.75) },
      { x: 6 + half + gap,  t: 'FM', sig: fmSig, det: b, tint: sigA(0.9) }
    ];
    var topMid = h * 0.30, topAmp = h * 0.21;
    var botMid = h * 0.76, botAmp = h * 0.16;

    sides.forEach(function (s) {
      var pw = panel(s.x, half, topMid, topAmp);
      var pd = panel(s.x, half, botMid, botAmp);
      /* what arrives at the antenna */
      zeroLine(ctx, pw, 0.18);
      denseCurve(ctx, pw, function (u) { return s.sig(u) / 2.1; },
                 s.tint, 1.1, Math.max(3500, pw.w * 12));
      panelLabel(ctx, pw, s.t + ' — AS IT ARRIVES', s.tint);
      /* what comes out of the detector, against what was sent */
      zeroLine(ctx, pd, 0.18);
      curve(ctx, pd, function (u) { return Math.sin(2 * Math.PI * NM * u); },
            fgA(0.4), 1.4, [4, 4]);
      curve(ctx, pd, asFn(s.det, M), s.tint, 2.1, null, 420);
      panelLabel(ctx, pd, 'RECOVERED AUDIO', s.tint);
    });

    /* the divider, so the two halves read as two receivers */
    ctx.strokeStyle = fgA(0.18); ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(6 + half + gap / 2, 12); ctx.lineTo(6 + half + gap / 2, h - 8);
    ctx.stroke();

    var sAM = snrDb(a, msg, M), sFM = snrDb(b, msg, M);
    var adv = sFM - sAM;
    ro(out, [
      ['noise density', fix(S.level, 2)],
      ['AM filter width', '2B = ' + nf(2 * amHalf, 2)],
      ['FM filter width', '2(β+1)B = ' + nf(2 * fmHalf, 2)],
      ['AM output SNR', '<b>' + fix(sAM, 1) + ' dB</b>'],
      ['FM output SNR', '<b>' + fix(sFM, 1) + ' dB</b>'],
      ['FM ahead by', '<b>' + fix(adv, 1) + ' dB</b>']
    ]);

    if (S.level < 0.005) {
      verdict(note, '', 'No noise at all. Both receivers recover the message perfectly — ' +
        'there is nothing yet to tell them apart.');
    } else if (adv > 6) {
      verdict(note, 'good', 'FM is <b>' + fix(adv, 1) + ' dB</b> ahead. The theory in section 8 ' +
        'predicts (3/2)β² over AM, about 19 dB at these settings — and that is with FM already ' +
        'paying for an IF filter ' + nf(fmHalf / amHalf, 2) + '× wider.');
    } else if (adv > -2) {
      verdict(note, '', 'The two are close now. FM is at the top of its threshold: a little ' +
        'more noise and the advantage will not just shrink, it will invert.');
    } else {
      verdict(note, 'bad', 'Past threshold. The noise is now large enough to swing the ' +
        'resultant all the way around zero, and each time it does the discriminator reads a ' +
        'whole false cycle. AM has degraded gently; FM has fallen off a cliff.');
    }
  });

  apply();
})();

/* ============================================================
   FIG 2 — the carrier bends. Message, the instantaneous frequency it
   asks for, and the wave that comes out.
   ============================================================ */
(function () {
  var cv = document.getElementById('figBend');
  if (!cv) return;
  var NC = 40;                                    /* carrier cycles in the window */
  var S = { shape: 'sine', dev: 12, fm: 3, env: true };

  var slD = document.getElementById('bendDev'), lbD = document.getElementById('bendDevv');
  var slF = document.getElementById('bendFm'), lbF = document.getElementById('bendFmv');
  var ck = document.getElementById('bendEnv'), out = document.getElementById('bendOut');

  pills(document.getElementById('bendShape'), [
    { label: 'one tone', k: 'sine' },
    { label: 'two tones', k: 'two' },
    { label: 'pulse', k: 'pulse' }
  ], function (it) { S.shape = it.k; apply(); }, 0);

  slD.addEventListener('input', function () { S.dev = +slD.value; apply(); });
  slF.addEventListener('input', function () { S.fm = +slF.value; apply(); });
  ck.addEventListener('change', function () { S.env = ck.checked; apply(); });

  function apply() {
    lbD.textContent = nf(S.dev, 3) + ' kHz';
    lbF.textContent = nf(S.fm, 3) + ' kHz';
    fig.redraw();
  }

  var fig = Fig(cv, function (w) { return w / (w < 560 ? 300 : 260); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var x0 = 8, pw = w - 16;
    /* two message periods on screen, whatever the message frequency, so the
       shape stays readable and only the carrier's response changes */
    var NM = 2;
    var beta = S.fm > 0 ? S.dev / S.fm : 0;
    var I = integrator(S.shape, NM);
    var ph = fmPhase(NC, beta, NM, I);
    var msg = function (u) { return SHAPES[S.shape](NM * u); };

    var pMsg = panel(x0, pw, h * 0.155, h * 0.085);
    var pFi  = panel(x0, pw, h * 0.465, h * 0.105);
    var pTx  = panel(x0, pw, h * 0.82,  h * 0.14);

    /* the message */
    zeroLine(ctx, pMsg, 0.2);
    curve(ctx, pMsg, msg, sigA(0.85), 2, null, 600);
    panelLabel(ctx, pMsg, 'MESSAGE  x(t)', sigA(0.8));

    /* the instantaneous frequency it asks for */
    zeroLine(ctx, pFi, 0.35);
    mono(ctx, 9); ctx.fillStyle = fgA(0.5);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    drawLabel(ctx, 'fc', x0 + pw, pFi.mid);
    fillCurve(ctx, pFi, msg, sigA(0.14), 400);
    curve(ctx, pFi, msg, sigA(0.8), 2, null, 600);
    panelLabel(ctx, pFi, 'INSTANTANEOUS FREQUENCY  fi(t) = fc + Δf·x(t)', sigA(0.8));
    /* the deviation, marked */
    if (S.dev > 0.4) {
      var yTop = pFi.mid - pFi.amp, yBot = pFi.mid + pFi.amp;
      ctx.strokeStyle = fgA(0.3); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x0, yTop); ctx.lineTo(x0 + pw, yTop);
      ctx.moveTo(x0, yBot); ctx.lineTo(x0 + pw, yBot);
      ctx.stroke(); ctx.setLineDash([]);
      plate(ctx, x0 + pw - 4, yTop, '+' + nf(S.dev, 3) + ' kHz', fgA(0.6), 'right');
      plate(ctx, x0 + pw - 4, yBot, '−' + nf(S.dev, 3) + ' kHz', fgA(0.6), 'right');
    }

    /* the transmitted wave */
    zeroLine(ctx, pTx, 0.18);
    if (S.env) {
      ctx.setLineDash([4, 4]); ctx.lineWidth = 1.3; ctx.strokeStyle = fgA(0.45);
      ctx.beginPath();
      ctx.moveTo(pTx.x, pTx.mid - pTx.amp); ctx.lineTo(pTx.x + pTx.w, pTx.mid - pTx.amp);
      ctx.moveTo(pTx.x, pTx.mid + pTx.amp); ctx.lineTo(pTx.x + pTx.w, pTx.mid + pTx.amp);
      ctx.stroke(); ctx.setLineDash([]);
    }
    denseCurve(ctx, pTx, function (u) { return Math.cos(ph(u)); },
               sigA(0.9), 1.2, Math.max(6000, pTx.w * 16));
    panelLabel(ctx, pTx, 'TRANSMITTED  s(t)' + (S.env ? '  —  envelope flat, and empty' : ''), sigA(0.8));

    var bw = 2 * (S.dev + S.fm);
    ro(out, [
      ['deviation Δf', '<b>' + nf(S.dev, 3) + ' kHz</b>'],
      ['message f<sub>m</sub>', nf(S.fm, 3) + ' kHz'],
      ['index β = Δf/f<sub>m</sub>', '<b>' + fix(beta, 2) + '</b>'],
      ['regime', beta < 0.3 ? 'narrowband' : (beta > 1 ? 'wideband' : 'in between')],
      ['Carson BW', nf(bw, 3) + ' kHz'],
      ['envelope', 'constant']
    ]);
  });

  apply();
})();

/* ============================================================
   FIG 3 — the message, its running integral, and the wave that
   integral produces. With the wrong version available to overlay,
   because seeing it is the fastest way to stop writing it.
   ============================================================ */
(function () {
  var cv = document.getElementById('figInt');
  if (!cv) return;
  var NC = 40, NM = 2, BETA = 4;
  var S = { shape: 'sine', wrong: false };

  var ck = document.getElementById('intWrong');
  var out = document.getElementById('intOut'), note = document.getElementById('intNote');

  pills(document.getElementById('intShape'), [
    { label: 'one tone', k: 'sine' },
    { label: 'triangle', k: 'tri' },
    { label: 'pulse', k: 'pulse' }
  ], function (it) { S.shape = it.k; apply(); }, 0);
  ck.addEventListener('change', function () { S.wrong = ck.checked; apply(); });

  function apply() { fig.redraw(); }

  var fig = Fig(cv, function (w) { return w / (w < 560 ? 300 : 255); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h, i;
    clear(f);
    var x0 = 8, pw = w - 16;
    var I = integrator(S.shape, NM), ph = fmPhase(NC, BETA, NM, I);
    var msg = function (u) { return SHAPES[S.shape](NM * u); };

    /* scale the integral to fill its panel; its size in radians is the
       readout's business, not the drawing's */
    var peak = 0;
    for (i = 0; i <= 400; i++) peak = Math.max(peak, Math.abs(I(i / 400) - I(0)));
    var mean = 0;
    for (i = 0; i < 400; i++) mean += I(i / 400);
    mean /= 400;
    var span = 0;
    for (i = 0; i <= 400; i++) span = Math.max(span, Math.abs(I(i / 400) - mean));
    span = span || 1;

    var pMsg = panel(x0, pw, h * 0.155, h * 0.085);
    var pInt = panel(x0, pw, h * 0.465, h * 0.105);
    var pTx  = panel(x0, pw, h * 0.82,  h * 0.14);

    zeroLine(ctx, pMsg, 0.2);
    fillCurve(ctx, pMsg, msg, sigA(0.13), 400);
    curve(ctx, pMsg, msg, sigA(0.85), 2, null, 700);
    panelLabel(ctx, pMsg, 'MESSAGE  x(t)  —  shaded is the area it accumulates', sigA(0.8));

    zeroLine(ctx, pInt, 0.2);
    curve(ctx, pInt, function (u) { return (I(u) - mean) / span; }, sigA(0.85), 2, null, 700);
    panelLabel(ctx, pInt, 'ITS RUNNING INTEGRAL  —  the extra phase', sigA(0.8));

    zeroLine(ctx, pTx, 0.18);
    denseCurve(ctx, pTx, function (u) { return Math.cos(ph(u)); },
               sigA(0.9), 1.2, Math.max(5000, pTx.w * 14));
    if (S.wrong) {
      /* cos(2*pi*fi(t)*t): the frequency of this is fc + 2*dev*x, and it runs
         away with t, which is why it is not an FM signal at all */
      denseCurve(ctx, pTx, function (u) {
        return Math.cos(2 * Math.PI * (NC + BETA * NM * msg(u)) * u);
      }, badCol(), 1.1, Math.max(5000, pTx.w * 14));
    }
    panelLabel(ctx, pTx, 'TRANSMITTED  s(t)', sigA(0.8));

    var devRad = BETA * NM * span * 2 * Math.PI;
    ro(out, [
      ['message', S.shape === 'sine' ? 'one tone' : (S.shape === 'tri' ? 'triangle' : 'pulse')],
      ['index β', fix(BETA, 2)],
      ['peak phase swing', '<b>±' + fix(devRad, 1) + ' rad</b>'],
      ['that is', fix(devRad / (2 * Math.PI), 2) + ' cycles'],
      ['integral jumps?', '<b>never</b>'],
      ['wrong version', S.wrong ? 'drawn, in red' : 'hidden']
    ]);

    if (S.wrong) {
      verdict(note, 'bad', 'The red trace is cos(2πf' + 'ᵢ' + '(t)·t). It is not a small ' +
        'error and it is not an FM signal: multiplying the whole angle by t means its frequency ' +
        'is f<sub>c</sub> + 2Δf·x(t), and it keeps drifting as the window goes on. ' +
        'Frequency is the <b>slope</b> of the phase, not a factor in it.');
    } else if (S.shape === 'pulse') {
      verdict(note, '', 'The message slams between −1 and +1, and the phase answers with straight ' +
        'ramps and sharp corners. An integral can bend instantly. It can never jump — which is ' +
        'why an FM signal is continuous no matter how brutal the message is.');
    } else {
      verdict(note, '', 'The middle trace lags the top one by a quarter cycle, which is what ' +
        'integrating a sine does. That quarter-cycle shift is the whole difference between FM ' +
        'and phase modulation.');
    }
  });

  apply();
})();

/* ============================================================
   FIG 4 — the Bessel spectrum, and the carrier nulls.
   ============================================================ */
(function () {
  var cv = document.getElementById('figBessel');
  if (!cv) return;
  var NMAX = 16;                                   /* sidebands drawn each side */
  var S = { beta: 2.4 };

  var sl = document.getElementById('bsBeta'), lb = document.getElementById('bsBetav');
  var out = document.getElementById('bsOut'), note = document.getElementById('bsNote');
  var NULLS = [2.405, 5.520, 8.654, 11.792];

  pills(document.getElementById('bsPreset'), [
    { label: 'narrowband  β = 0.2', b: 0.2 },
    { label: 'first null  β = 2.405', b: 2.405 },
    { label: 'broadcast  β = 5', b: 5 },
    { label: 'β = 10', b: 10 }
  ], function (it) { S.beta = it.b; sl.value = Math.round(it.b * 100); apply(); }, 1);

  sl.addEventListener('input', function () {
    S.beta = +sl.value / 100;
    clearPills(document.getElementById('bsPreset'));
    apply();
  });

  /* A single-tone FM signal, played straight. The pitch never moves — only
     the timbre, because all that changes is how the power is spread. */
  var audio = listenBtn('bsPlay', function (sr) {
    var fm0 = 220, secs = 0.4;
    var cyc = Math.max(1, Math.round(fm0 * secs));
    var len = Math.max(2, Math.round(sr * cyc / fm0));
    var buf = new Float64Array(len), k, u;
    var ratio = 9;                                  /* carrier : message */
    for (k = 0; k < len; k++) {
      u = cyc * k / len;                            /* message cycles elapsed */
      buf[k] = Math.cos(2 * Math.PI * ratio * u + S.beta * Math.sin(2 * Math.PI * u));
    }
    return AUDIO.centre(buf, 0.7);
  });

  function apply() {
    lb.textContent = fix(S.beta, 2);
    fig.redraw();
    audio.retune();
  }

  var fig = Fig(cv, function (w) { return w / (w < 560 ? 230 : 200); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h, n, i;
    clear(f);
    var x0 = 26, x1 = w - 14, sw = x1 - x0;
    var base = h - 68, top = 26;
    var HH = base - top;
    var X = function (k) { return x0 + (k + NMAX) / (2 * NMAX) * sw; };

    var b = S.beta;
    var J = [], tot = 0, inside = 0;
    for (n = -NMAX; n <= NMAX; n++) {
      var v = besselJ(Math.abs(n), b);
      J.push(v);
      tot += v * v;
    }
    /* Carson keeps |n| <= beta + 1 */
    var keep = Math.floor(b + 1);
    for (n = -keep; n <= keep; n++) inside += besselJ(Math.abs(n), b) * besselJ(Math.abs(n), b);
    var frac = tot > 0 ? inside / 1 : 0;            /* sum over all n is exactly 1 */

    /* Carson's band, as two edges and a bracket rather than a wash: a filled
       area behind the spectrum is the only solid region in the figure and
       reads louder than the lines it is meant to be describing. */
    var cx0 = X(-keep - 0.5), cx1 = X(keep + 0.5);
    ctx.strokeStyle = sigA(0.4); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx0, top + 14); ctx.lineTo(cx0, base);
    ctx.moveTo(cx1, top + 14); ctx.lineTo(cx1, base);
    ctx.stroke(); ctx.setLineDash([]);

    /* the axis */
    ctx.strokeStyle = fgA(0.5); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, base); ctx.lineTo(x1, base); ctx.stroke();

    /* the sidebands */
    var narrow = w < 620;
    for (n = -NMAX; n <= NMAX; n++) {
      var a = Math.abs(J[n + NMAX]);
      if (a < 0.004) continue;
      var x = X(n), hh = a * HH;
      var isC = n === 0;
      ctx.lineWidth = isC ? 3.4 : 2.6;
      ctx.strokeStyle = isC ? fgA(0.85) : sigA(0.85);
      ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - hh); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, base - hh, isC ? 2.8 : 2.2, 0, Math.PI * 2);
      ctx.fillStyle = isC ? fgA(0.85) : sigA(0.85); ctx.fill();
    }

    /* ticks, in multiples of the message frequency */
    mono(ctx, 9); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var step = narrow ? 8 : 4;
    for (n = -NMAX; n <= NMAX; n += step) {
      var xt = X(n);
      ctx.strokeStyle = fgA(0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xt, base); ctx.lineTo(xt, base + 4); ctx.stroke();
      ctx.fillStyle = fgA(0.45);
      alignAt(ctx, xt, x0, x1);
      drawLabel(ctx, n === 0 ? 'fc' : (n > 0 ? '+' + n : String(n)), xt, base + 6);
    }
    mono(ctx, 9); ctx.fillStyle = fgA(0.4); ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    drawLabel(ctx, 'n  ( × fm from the carrier )', x1, base + 34);

    /* Carson's bracket, under the frequency ticks */
    var yb = base + 22;
    ctx.lineWidth = 1.3; ctx.strokeStyle = sigA(0.75);
    ctx.beginPath();
    ctx.moveTo(cx0, yb - 4); ctx.lineTo(cx0, yb);
    ctx.lineTo(cx1, yb); ctx.lineTo(cx1, yb - 4);
    ctx.stroke();
    plate(ctx, (cx0 + cx1) / 2, yb + 9, 'CARSON  —  ' + fix(100 * frac, 1) + ' %',
          sigA(0.9), 'center');

    /* the carrier, called out when it is nearly gone */
    var j0 = Math.abs(besselJ(0, b));
    if (j0 < 0.05) {
      plate(ctx, X(0), base - 26, 'CARRIER ≈ 0', badCol(), 'center');
    }

    /* how many pairs actually matter */
    var sig = 0;
    for (n = 1; n <= NMAX; n++) if (Math.abs(besselJ(n, b)) > 0.01) sig = n;

    ro(out, [
      ['index β', '<b>' + fix(b, 2) + '</b>'],
      ['carrier J<sub>0</sub>(β)', '<b>' + fix(besselJ(0, b), 3) + '</b>'],
      ['carrier power', fix(100 * j0 * j0, 1) + ' %'],
      ['pairs above 1 %', '<b>' + sig + '</b>'],
      ['Carson keeps', '|n| ≤ ' + keep],
      ['power inside', '<b>' + fix(100 * frac, 1) + ' %</b>']
    ]);

    var near = null, d;
    for (i = 0; i < NULLS.length; i++) {
      d = Math.abs(b - NULLS[i]);
      if (d < 0.06) near = NULLS[i];
    }
    if (near) {
      verdict(note, 'good', 'Carrier null at <b>β = ' + fix(near, 3) + '</b>. The transmitter is ' +
        'putting out full power and nothing at all on its own centre frequency — every watt is in ' +
        'the sidebands. Tune a receiver to f<sub>c</sub> here and you hear the null, which is how ' +
        'deviation meters are calibrated.');
    } else if (b < 0.3) {
      verdict(note, '', 'Narrowband. One pair of sidebands carries essentially everything, so the ' +
        'spectrum is the same shape as AM and takes the same 2f<sub>m</sub> of room — and buys ' +
        'almost none of FM\'s noise advantage.');
    } else if (b < 1.2) {
      verdict(note, '', 'The second and third pairs are coming up and the carrier is falling. ' +
        'Nothing is breaking: the power that leaves the carrier is not lost, it is in the ' +
        'sidebands. The total is always 1.');
    } else {
      verdict(note, '', 'Wideband. The energy has marched outward into ' + sig + ' pairs, and the ' +
        'bandwidth is now set mostly by the deviation rather than by the message frequency. ' +
        'Carson still catches ' + fix(100 * frac, 1) + ' % of it.');
    }
  });

  apply();
})();

/* ============================================================
   FIG 5 — Carson's rule, against the channel grid it produced.
   ============================================================ */
(function () {
  var cv = document.getElementById('figCarson');
  if (!cv) return;
  var S = { dev: 75, fm: 15, grid: true };
  var SPAN = 260;                                  /* kHz shown either side of fc */

  var slD = document.getElementById('csDev'), lbD = document.getElementById('csDevv');
  var slF = document.getElementById('csFm'), lbF = document.getElementById('csFmv');
  var ck = document.getElementById('csGrid');
  var out = document.getElementById('csOut'), note = document.getElementById('csNote');

  pills(document.getElementById('csPreset'), [
    { label: 'broadcast FM', d: 75, m: 15 },
    { label: 'narrowband radio', d: 2.5, m: 3 },
    { label: 'TV sound', d: 50, m: 15 },
    { label: 'β = 1', d: 15, m: 15 }
  ], function (it) {
    S.dev = it.d; S.fm = it.m;
    slD.value = it.d; slF.value = it.m;
    apply();
  }, 0);

  slD.addEventListener('input', function () {
    S.dev = +slD.value; clearPills(document.getElementById('csPreset')); apply();
  });
  slF.addEventListener('input', function () {
    S.fm = +slF.value; clearPills(document.getElementById('csPreset')); apply();
  });
  ck.addEventListener('change', function () { S.grid = ck.checked; apply(); });

  function apply() {
    lbD.textContent = nf(S.dev, 3) + ' kHz';
    lbF.textContent = nf(S.fm, 3) + ' kHz';
    fig.redraw();
  }

  var fig = Fig(cv, function (w) { return w / (w < 560 ? 270 : 230); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h, n;
    clear(f);
    var x0 = 14, x1 = w - 14, sw = x1 - x0;
    var base = h - 50, top = 26, HH = base - top;
    var X = function (kHz) { return x0 + (kHz + SPAN) / (2 * SPAN) * sw; };

    var beta = S.fm > 0 ? S.dev / S.fm : 0;
    var bw = 2 * (S.dev + S.fm);
    var keep = Math.floor(beta + 1);
    var inside = 0;
    for (n = -keep; n <= keep; n++) inside += besselJ(Math.abs(n), beta) * besselJ(Math.abs(n), beta);

    /* the 200 kHz channel grid, behind everything */
    if (S.grid) {
      for (n = -1; n <= 1; n++) {
        var gx0 = X(n * 200 - 100), gx1 = X(n * 200 + 100);
        ctx.strokeStyle = fgA(0.22); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gx0, top - 6); ctx.lineTo(gx0, base); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gx1, top - 6); ctx.lineTo(gx1, base); ctx.stroke();
        if (n === 0) {
          mono(ctx, 8.5); ctx.fillStyle = fgA(0.4);
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          drawLabel(ctx, '200 kHz channel', (gx0 + gx1) / 2, top - 18);
        }
      }
    }

    /* Carson's band */
    var cx0 = X(-bw / 2), cx1 = X(bw / 2);
    var fits = bw <= 200;
    ctx.fillStyle = fits ? rgba(pal().sig, 0.05) : rgba(badCol(), 0.07);
    ctx.fillRect(cx0, top, Math.max(cx1 - cx0, 1), base - top);
    ctx.strokeStyle = fits ? sigA(0.5) : badCol(); ctx.lineWidth = 1.3;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx0, top); ctx.lineTo(cx0, base);
    ctx.moveTo(cx1, top); ctx.lineTo(cx1, base);
    ctx.stroke(); ctx.setLineDash([]);

    /* axis */
    ctx.strokeStyle = fgA(0.5); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, base); ctx.lineTo(x1, base); ctx.stroke();

    /* the sidebands, at n * fm out from the carrier */
    var NMAX = Math.min(90, Math.ceil(SPAN / Math.max(S.fm, 0.5)));
    var lw = Math.max(1, Math.min(3, sw / (2 * NMAX + 1) * 0.55));
    for (n = -NMAX; n <= NMAX; n++) {
      var a = Math.abs(besselJ(Math.abs(n), beta));
      if (a < 0.004) continue;
      var x = X(n * S.fm);
      if (x < x0 || x > x1) continue;
      ctx.lineWidth = n === 0 ? Math.max(lw, 2.4) : lw;
      ctx.strokeStyle = n === 0 ? fgA(0.85) : sigA(0.8);
      ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - a * HH); ctx.stroke();
    }

    /* ticks */
    mono(ctx, 9); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (n = -200; n <= 200; n += 100) {
      var xt = X(n);
      ctx.strokeStyle = fgA(0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xt, base); ctx.lineTo(xt, base + 4); ctx.stroke();
      ctx.fillStyle = fgA(0.45);
      alignAt(ctx, xt, x0, x1);
      drawLabel(ctx, n === 0 ? 'fc' : (n > 0 ? '+' + n : String(n)), xt, base + 6);
    }
    mono(ctx, 9); ctx.fillStyle = fgA(0.4); ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    drawLabel(ctx, 'kHz from the carrier', x1, base + 22);

    /* the bracket */
    var ya = base + 2;
    plate(ctx, (cx0 + cx1) / 2, top + 10,
          'BW = 2(' + nf(S.dev, 3) + ' + ' + nf(S.fm, 3) + ') = ' + nf(bw, 3) + ' kHz',
          fits ? sigA(0.9) : badCol(), 'center');

    ro(out, [
      ['deviation Δf', nf(S.dev, 3) + ' kHz'],
      ['top message f<sub>m</sub>', nf(S.fm, 3) + ' kHz'],
      ['index β', '<b>' + fix(beta, 2) + '</b>'],
      ['Carson BW', '<b>' + nf(bw, 3) + ' kHz</b>'],
      ['pairs kept', '|n| ≤ ' + keep],
      ['power inside Carson', '<b>' + fix(100 * inside, 1) + ' %</b>'],
      ['AM channels this wide', fix(bw / 10, 1)],
      ['fits a 200 kHz channel', fits ? 'yes' : '<b>no</b>']
    ]);

    if (!fits) {
      verdict(note, 'bad', 'This needs <b>' + nf(bw, 3) + ' kHz</b> and a broadcast channel is ' +
        '200. The sidebands are over the line and into the neighbours — which is what the ' +
        '75 kHz deviation limit exists to prevent.');
    } else if (beta < 0.3) {
      verdict(note, 'good', 'Narrowband: β = ' + fix(beta, 2) + ', so Carson gives about ' +
        '2f<sub>m</sub> — the same room an AM station takes. The whole signal is a carrier and ' +
        'one pair, and a receiver for it can be cheap.');
    } else {
      verdict(note, 'good', 'β = ' + fix(beta, 2) + ', BW = ' + nf(bw, 3) + ' kHz, holding ' +
        fix(100 * inside, 1) + ' % of the power. That is <b>' + fix(bw / 10, 1) + ' AM channels</b> ' +
        'for one station — the bill for section 8.');
    }
  });

  apply();
})();

/* ============================================================
   FIG 6 — limit first, then differentiate.

   The chain is simulated rather than asserted: hard clip, the tuned
   circuit that always follows a limiter, a differentiator, and the same
   diode-and-capacitor envelope detector as the AM essay. Untick the
   limiter and the amplitude noise reaches the differentiator, which
   cannot tell a change in height from a change in pace.
   ============================================================ */
(function () {
  var cv = document.getElementById('figDisc');
  if (!cv) return;
  var NC = 60, NM = 2, BETA = 6;
  var BW = 2 * (BETA + 1) * NM;
  var N = 1 << 14, M = 256;
  var S = { noise: 0.25, limit: true };

  var sl = document.getElementById('dsNoise'), lb = document.getElementById('dsNoisev');
  var ck = document.getElementById('dsLimit');
  var out = document.getElementById('dsOut'), note = document.getElementById('dsNote');

  var I = integrator('sine', NM), ph = fmPhase(NC, BETA, NM, I);
  var nz = noiseFn(NC, BW / 2, 5);
  var msg = new Float64Array(M), i;
  for (i = 0; i < M; i++) msg[i] = Math.sin(2 * Math.PI * NM * i / M);

  function arriving(u) { return Math.cos(ph(u)) + S.noise * nz(u); }

  function chain() {
    var buf, k;
    if (S.limit) buf = limiter(arriving, N, NC, BW);
    else { buf = new Float64Array(N); for (k = 0; k < N; k++) buf[k] = arriving(k / N); }
    return { buf: buf, det: acNorm(lowpass(slopeDetect(buf, N, M, NC, NM), M, NM), M) };
  }

  sl.addEventListener('input', function () { S.noise = +sl.value / 100; apply(); });
  ck.addEventListener('change', function () { S.limit = ck.checked; apply(); });

  var audio = listenBtn('dsPlay', function (sr) {
    var fm0 = 300, secs = 0.5;
    var cyc = Math.max(1, Math.round(fm0 * secs / NM));
    var len = Math.max(2, Math.round(sr * cyc * NM / fm0));
    var buf = new Float64Array(len), k, f = asFn(chain().det, M);
    for (k = 0; k < len; k++) buf[k] = f(cyc * k / len);
    return AUDIO.centre(buf, 0.8);
  });

  function apply() {
    lb.textContent = fix(S.noise, 2);
    fig.redraw();
    audio.retune();
  }

  var fig = Fig(cv, function (w) { return w / (w < 560 ? 300 : 250); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var x0 = 8, pw = w - 16;
    var c = chain();
    var lim = asFn(c.buf, N);

    var pIn  = panel(x0, pw, h * 0.18, h * 0.105);
    var pLim = panel(x0, pw, h * 0.48, h * 0.10);
    var pOut = panel(x0, pw, h * 0.81, h * 0.13);

    zeroLine(ctx, pIn, 0.18);
    denseCurve(ctx, pIn, function (u) { return arriving(u) / 2.2; },
               fgA(0.7), 1.1, Math.max(4000, pIn.w * 12));
    panelLabel(ctx, pIn, 'AS IT ARRIVES  —  noise and all', fgA(0.6));

    zeroLine(ctx, pLim, 0.18);
    denseCurve(ctx, pLim, lim, S.limit ? sigA(0.9) : fgA(0.45), 1.1,
               Math.max(4000, pLim.w * 12));
    panelLabel(ctx, pLim, S.limit ? 'AFTER THE LIMITER  —  one height, always'
                                  : 'NO LIMITER  —  the height still varies',
               S.limit ? sigA(0.8) : badCol());

    zeroLine(ctx, pOut, 0.18);
    curve(ctx, pOut, function (u) { return Math.sin(2 * Math.PI * NM * u); }, fgA(0.4), 1.4, [4, 4]);
    curve(ctx, pOut, asFn(c.det, M), sigA(0.9), 2.1, null, 420);
    panelLabel(ctx, pOut, 'RECOVERED MESSAGE  —  dashed is what was sent', sigA(0.8));

    var s = snrDb(c.det, msg, M);
    ro(out, [
      ['noise added', fix(S.noise, 2)],
      ['limiter', S.limit ? '<b>on</b>' : '<b>off</b>'],
      ['index β', fix(BETA, 2)],
      ['carrier : message', nf(NC / NM, 3) + ' : 1'],
      ['output SNR', '<b>' + fix(s, 1) + ' dB</b>']
    ]);

    if (!S.limit) {
      verdict(note, 'bad', 'No limiter. Every wobble in the height reaches the differentiator, ' +
        'and the differentiator reads height as frequency — so the noise is now written into the ' +
        'message. Tick the box and the same noise disappears.');
    } else if (s > 12) {
      verdict(note, 'good', 'The limiter has flattened the wave to one height, and the noise ' +
        'that was riding on that height went with it. The zero crossings are untouched, and the ' +
        'zero crossings are where the message is.');
    } else if (s > 4) {
      verdict(note, '', 'The limiter is still helping, but the noise is now big enough to shift ' +
        'the crossings as well as the height — and a shifted crossing is a genuine frequency ' +
        'error that no later stage can undo.');
    } else {
      verdict(note, 'bad', 'Past threshold. The noise is creating <b>extra zero crossings</b>, ' +
        'and each one is read as an enormous momentary frequency — the clicks of section 8. ' +
        'Limiting cannot help: the false crossings are in the part of the signal it keeps.');
    }
  });

  apply();
})();

/* ============================================================
   FIG 7 — two stations on one frequency, and what AM would have done.

   The share of each station is measured out of the recovered audio by
   projecting it onto that station's own note, rather than asserted.
   ============================================================ */
(function () {
  var cv = document.getElementById('figCapture');
  if (!cv) return;
  var NC = 96, NMA = 2, NMB = 3, BETA = 4;
  var N = 1 << 14, M = 256;
  var S = { db: 0 };

  var sl = document.getElementById('cpRatio'), lb = document.getElementById('cpRatiov');
  var out = document.getElementById('cpOut'), note = document.getElementById('cpNote');

  var IA = integrator('sine', NMA), IB = integrator('sine', NMB);
  var phA = fmPhase(NC, BETA, NMA, IA), phB = fmPhase(NC, BETA, NMB, IB);

  pills(document.getElementById('cpPreset'), [
    { label: 'dead heat  0 dB', d: 0 },
    { label: '3 dB', d: 3 },
    { label: 'captured  6 dB', d: 6 },
    { label: '14 dB', d: 14 }
  ], function (it) { S.db = it.d; sl.value = Math.round(it.d * 10); apply(); }, 0);

  sl.addEventListener('input', function () {
    S.db = +sl.value / 10;
    clearPills(document.getElementById('cpPreset'));
    apply();
  });

  function amp() { return Math.pow(10, S.db / 20); }
  function both(u) { return amp() * Math.cos(phA(u)) + Math.cos(phB(u)); }

  function fmOut() {
    return acNorm(lowpass(toGrid(discriminate(both, N), M), M, NMB + 1), M);
  }
  /* the same two transmitters, but amplitude-modulated and envelope-detected:
     the straight mix an AM receiver would have given you */
  function amOut() {
    var A = amp();
    var s = function (u) {
      return (A * (1 + 0.8 * Math.sin(2 * Math.PI * NMA * u))
              + (1 + 0.8 * Math.sin(2 * Math.PI * NMB * u))) * Math.cos(2 * Math.PI * NC * u);
    };
    return acNorm(lowpass(envelope(s, N, M, NC, NMA), M, NMB + 1), M);
  }
  /* how much of one station's note is present in a recovered trace */
  function tone(o, cyc) {
    var s = 0, c = 0, i, th;
    for (i = 0; i < M; i++) {
      th = 2 * Math.PI * cyc * i / M;
      s += o[i] * Math.sin(th); c += o[i] * Math.cos(th);
    }
    return 2 * Math.sqrt(s * s + c * c) / M;
  }

  var audio = listenBtn('cpPlay', function (sr) {
    var f0 = 200, secs = 0.5;
    var cyc = Math.max(1, Math.round(f0 * secs));
    var len = Math.max(2, Math.round(sr * cyc / f0));
    var buf = new Float64Array(len), k, f = asFn(fmOut(), M);
    for (k = 0; k < len; k++) buf[k] = f(cyc * k / len);
    return AUDIO.centre(buf, 0.8);
  });

  function apply() {
    lb.textContent = fix(S.db, 1) + ' dB';
    fig.redraw();
    audio.retune();
  }

  var fig = Fig(cv, function (w) { return w / (w < 560 ? 300 : 250); }, function (f) {
    var ctx = f.ctx, w = f.w, h = f.h;
    clear(f);
    var x0 = 8, pw = w - 16;
    var o = fmOut(), oa = amOut();
    var a = tone(o, NMA), b = tone(o, NMB);
    var sa = a / (a + b + 1e-12), sb = 1 - sa;
    var aa = tone(oa, NMA), ab = tone(oa, NMB);
    var ma = aa / (aa + ab + 1e-12);

    /* the recovered audio */
    var pOut = panel(x0, pw, h * 0.27, h * 0.19);
    zeroLine(ctx, pOut, 0.18);
    curve(ctx, pOut, function (u) { return Math.sin(2 * Math.PI * NMA * u); },
          fgA(0.35), 1.3, [4, 4]);
    curve(ctx, pOut, asFn(o, M), sigA(0.9), 2.1, null, 420);
    panelLabel(ctx, pOut, 'WHAT YOU HEAR  —  dashed is station A alone', sigA(0.8));

    /* the two shares, as bars */
    var by = h * 0.60, bh = 26, bx = x0 + 74, bw2 = pw - 84;
    function bar(y, frac, label, colour, amLine) {
      mono(ctx, 9.5); ctx.fillStyle = fgA(0.6);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      drawLabel(ctx, label, bx - 8, y + bh / 2);
      ctx.fillStyle = fgA(0.10);
      ctx.fillRect(bx, y, bw2, bh);
      ctx.fillStyle = colour;
      ctx.fillRect(bx, y, Math.max(1, bw2 * frac), bh);
      mono(ctx, 10);
      ctx.textAlign = 'left'; ctx.fillStyle = fgA(0.75);
      drawLabel(ctx, fix(100 * frac, 0) + ' %', bx + Math.max(1, bw2 * frac) + 6, y + bh / 2);
      if (amLine !== undefined) {
        ctx.strokeStyle = fgA(0.55); ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(bx + bw2 * amLine, y - 3); ctx.lineTo(bx + bw2 * amLine, y + bh + 3);
        ctx.stroke(); ctx.setLineDash([]);
      }
    }
    bar(by, sa, 'STATION A', sigA(0.8), ma);
    bar(by + bh + 10, sb, 'STATION B', fgA(0.45), 1 - ma);

    mono(ctx, 8.5); ctx.fillStyle = fgA(0.45);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    drawLabel(ctx, 'dotted: where an AM receiver would have put the line', bx, by + 2 * bh + 26);

    ro(out, [
      ['A stronger by', '<b>' + fix(S.db, 1) + ' dB</b>'],
      ['that is', fix(Math.pow(10, S.db / 10), 2) + '× the power'],
      ['A in the output', '<b>' + fix(100 * sa, 0) + ' %</b>'],
      ['B in the output', '<b>' + fix(100 * sb, 0) + ' %</b>'],
      ['AM would give A', fix(100 * ma, 0) + ' %']
    ]);

    if (S.db < 0.5) {
      verdict(note, 'bad', 'A dead heat. Neither station is strong enough to take the ' +
        'discriminator, so it follows first one and then the other and the output belongs to ' +
        'neither of them. This is the worst place on the slider, and on a real road it is a ' +
        'few hundred metres wide.');
    } else if (sa > 0.9) {
      verdict(note, 'good', 'Captured. Station A has <b>' + fix(100 * sa, 0) + ' %</b> of the ' +
        'output on an advantage of only ' + fix(S.db, 1) + ' dB — an AM receiver would still be ' +
        'giving B ' + fix(100 * (1 - ma), 0) + ' %. The weaker station has not faded out. It has ' +
        'been switched off.');
    } else {
      verdict(note, '', 'A is pulling ahead fast. Notice how much steeper this is than the ' +
        'dotted AM line: a decibel or two decides the whole output, where AM would have divided ' +
        'it in proportion.');
    }
  });

  apply();
})();

/* ============================================================
   Share row — the copy button and the phone's native sheet, added on
   top of the plain links that are already in the markup.
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
