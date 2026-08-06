"use strict";
/* ============================================================
   «هر نقطه یک فلش» — شکل‌های تعاملی.
   بدون هیچ کتابخانه‌ای، بدون هیچ درخواست شبکه‌ای. همه‌چیز روی
   <canvas> کشیده می‌شود، با همان سه رنگ CSS صفحه، تا با تم عوض شود.
   ============================================================ */

/* یک <canvas> استایل‌شیت نمی‌بیند، پس کاری که CSS برای فارسی می‌کند باید
   اینجا دستی انجام شود. قلم مونو جلوتر است چون عددها را می‌کشد، و یک قلم
   فارسی پشتش، چون خانوادهٔ مونواسپیس اصلاً حرف فارسی ندارد. */
var LBL_FONT = 'ui-monospace, "IBM Plex Mono", Estedad, monospace';
var FA_FONT  = 'Estedad, Shabnam, "Segoe UI", sans-serif';
var RTL_RE = /[؀-ۿ]/;
function drawLabel(ctx, text, x, y, maxW) {
  ctx.direction = RTL_RE.test(String(text)) ? 'rtl' : 'ltr';
  if (maxW === undefined) ctx.fillText(text, x, y);
  else ctx.fillText(text, x, y, maxW);
}
/* عددها در متن فارسی، فارسی */
var FA_DIG = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
function fa(n) { return String(n).replace(/[0-9]/g, function (d) { return FA_DIG[+d]; }); }

/* ---------------- تم ---------------- */
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

/* ---------------- رنگ ---------------- */
var PAL = null;
function pal() {
  if (PAL) return PAL;
  var s = getComputedStyle(document.documentElement);
  PAL = {
    fg:  (s.getPropertyValue('--fg')  || '#1C1B1A').trim(),
    bg:  (s.getPropertyValue('--bg')  || '#F4EFE4').trim(),
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
/* شفافیت در دو تم یک معنی ندارد: جوهر روشن روی مشکی در ۴۵٪ هنوز خوانده
   می‌شود، جوهر تیره روی کاغذ کرم در ۴۵٪ می‌رود روی ۲٫۷:۱ و ناخواناست. */
function lift(a) {
  if (document.documentElement.classList.contains('ink')) return a;
  return a < 0.7 ? Math.min(1, a * 1.45 + 0.1) : a;
}
var fgA  = function (a) { return rgba(pal().fg,  lift(a)); };
var sigA = function (a) { return rgba(pal().sig, lift(a)); };
var bgA  = function (a) { return rgba(pal().bg,  a); };

/* ---------------- بوم ---------------- */
var FIGS = [];
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
function clear(f) { f.ctx.clearRect(0, 0, f.w, f.h); }
function ptOf(canvas, ev) {
  var r = canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}
/* fn(t) را هر فریم اجرا کن، فقط تا وقتی که el توی صفحه دیده می‌شود */
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
/* ---------------- حافظهٔ نقاشیِ ثابت ----------------
   سایه‌روشن و خطوط تراز و نقشهٔ کرل، هرکدام چند هزار بار تابع را صدا
   می‌زنند. تا وقتی میدان و اندازه و تم عوض نشده‌اند نتیجه یکی است، پس
   یک بار روی بوم پنهان کشیده و بعد فقط کپی می‌شود — وگرنه شکل‌هایی که
   انیمیشن دارند هر فریم همان چند هزار محاسبه را تکرار می‌کنند. */
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

/* روی موبایل «هرجا را بگیری» بخشنده‌تر از «دقیقاً نقطه را بگیر» است */
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

/* ---------------- دستگاه مختصات ----------------
   دنیای هر شکل مربعی است به نیم‌بُعد L، و بوم ممکن است پهن‌تر باشد.
   مقیاس از ارتفاع گرفته می‌شود تا شکل هیچ‌وقت کشیده نشود. */
function Geo(w, h, L, pad) {
  pad = pad === undefined ? 6 : pad;
  var s = (Math.min(w, h) / 2 - pad) / L;
  return {
    s: s, cx: w / 2, cy: h / 2, L: L,
    X: function (x) { return w / 2 + x * s; },
    Y: function (y) { return h / 2 - y * s; },
    ix: function (px) { return (px - w / 2) / s; },
    iy: function (py) { return (h / 2 - py) / s; },
    /* دامنه‌ای که واقعاً روی بوم دیده می‌شود */
    x0: -(w / 2) / s, x1: (w / 2) / s,
    y0: -(h / 2) / s, y1: (h / 2) / s
  };
}

/* ---------------- ریاضی ---------------- */
function gradOf(f, x, y, h) {
  h = h || 1e-3;
  return [(f(x + h, y) - f(x - h, y)) / (2 * h), (f(x, y + h) - f(x, y - h)) / (2 * h)];
}
function divOf(F, x, y, h) {
  h = h || 1e-3;
  return (F(x + h, y)[0] - F(x - h, y)[0]) / (2 * h) + (F(x, y + h)[1] - F(x, y - h)[1]) / (2 * h);
}
function curlOf(F, x, y, h) {
  h = h || 1e-3;
  return (F(x + h, y)[1] - F(x - h, y)[1]) / (2 * h) - (F(x, y + h)[0] - F(x, y - h)[0]) / (2 * h);
}
function nf(v, p) {
  if (!isFinite(v)) return '∞';
  var s = parseFloat(v.toFixed(p === undefined ? 2 : p)).toString();
  if (s === '-0') s = '0';
  return s.replace('-', '−');
}

/* ---------------- کشیدن ---------------- */
function arrow(ctx, x0, y0, x1, y1, head) {
  var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
  if (L < 0.4) return;
  head = Math.min(head === undefined ? 5 : head, L * 0.55);
  var ux = dx / L, uy = dy / L, px = -uy, py = ux;
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ux * head + px * head * 0.5, y1 - uy * head + py * head * 0.5);
  ctx.lineTo(x1 - ux * head - px * head * 0.5, y1 - uy * head - py * head * 0.5);
  ctx.closePath();
  ctx.fill();
}
/* فلش‌های روی مرزِ حلقه، همیشه بیرونِ خطِ حلقه کشیده می‌شوند و با
   بزرگ‌ترین مقدارِ خودِ همان حلقه مقیاس می‌خورند، نه با بیشینهٔ کل میدان —
   وگرنه در میدان‌های تندی مثل «برشی» همهٔ بیست فلش به چند پیکسل جمع
   می‌شوند و شکل چیزی نشان نمی‌دهد.
   هر نقطه: x,y روی مرز، n سمتِ بیرون، t مماس، v مقدارِ علامت‌دار.
   radial یعنی فلش‌ها عمود بر مرزند (شار) و نه مماس بر آن (گردش). */
function edgeArrows(ctx, pts, rp, radial) {
  var big = 1e-9;
  pts.forEach(function (p) { big = Math.max(big, Math.abs(p.v)); });
  var maxLen = Math.min(34, Math.max(14, rp * 0.95)), GAP = radial ? 7 : 12;
  pts.forEach(function (p) {
    var L = Math.abs(p.v) / big * maxLen;
    if (L < 2) return;
    var out = p.v > 0, s = out ? 1 : -1;
    var bx = p.x + p.nx * GAP, by = p.y + p.ny * GAP;
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = out ? sigA(0.95) : fgA(0.8);
    ctx.fillStyle   = out ? sigA(0.95) : fgA(0.8);
    if (radial) {
      /* بیرون‌رو از مرز به بیرون، درون‌رو از بیرون به مرز — هر دو کاملاً
         بیرونِ دایره، تا با خودِ خطِ حلقه قاطی نشوند */
      if (out) arrow(ctx, bx, by, bx + p.nx * L, by + p.ny * L, 6);
      else     arrow(ctx, bx + p.nx * L, by + p.ny * L, bx, by, 6);
    } else {
      arrow(ctx, bx - p.tx * s * L / 2, by - p.ty * s * L / 2,
                 bx + p.tx * s * L / 2, by + p.ty * s * L / 2, 6);
    }
  });
}

/* حلقهٔ روشن زیر نقطه کشیده می‌شود نه رویش، وگرنه روی پس‌زمینهٔ پررنگ
   خودِ نقطه را می‌خورد و فقط یک دایرهٔ توخالی می‌ماند */
function dot(ctx, x, y, r, fill, ring) {
  if (ring) {
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = ring; ctx.fill();
  }
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
}
function tag(ctx, x, y, text, color) {
  ctx.font = '500 11px ' + LBL_FONT;
  var w = ctx.measureText(text).width + 12;
  ctx.fillStyle = bgA(0.9);
  ctx.fillRect(x + 9, y - 9, w, 18);
  ctx.fillStyle = color;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  drawLabel(ctx, text, x + 15, y);
}
/* برچسب فارسی، با یک تختهٔ کم‌رنگ زیرش تا روی فلش‌ها گم نشود */
function faTag(ctx, x, y, text, color, align) {
  ctx.font = '500 12px ' + FA_FONT;
  var w = ctx.measureText(text).width + 14;
  var left = align === 'right' ? x - w : x;
  ctx.fillStyle = bgA(0.86);
  ctx.fillRect(left, y - 10, w, 20);
  ctx.fillStyle = color;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  drawLabel(ctx, text, left + w / 2, y + 0.5);
}
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
   میدان‌های اسکالر — «دما در اتاق»
   ============================================================ */
function bump(x, y, cx, cy, k) {
  var dx = x - cx, dy = y - cy;
  return Math.exp(-k * (dx * dx + dy * dy));
}
var SCALARS = [
  { key: 'heater', label: 'یک شعله',
    f: function (x, y) { return 20 + 17 * bump(x, y, -0.25, 0.2, 1.1); } },
  { key: 'room', label: 'گرم و سرد',
    f: function (x, y) { return 21 + 15 * bump(x, y, -0.75, 0.5, 1.5) - 11 * bump(x, y, 0.8, -0.45, 1.9); } },
  { key: 'hills', label: 'چند تپه',
    f: function (x, y) {
      return 22 + 12 * bump(x, y, -0.9, -0.6, 2.2) + 15 * bump(x, y, 0.7, 0.7, 1.6)
                + 8 * bump(x, y, 0.1, -0.9, 3.0) - 9 * bump(x, y, -0.6, 0.85, 2.6);
    } }
];

/* بیشینه و کمینهٔ تقریبی، برای مقیاس رنگ و ترازها */
function rangeOf(f, G) {
  var lo = Infinity, hi = -Infinity, i, j, v;
  for (j = 0; j <= 24; j++) for (i = 0; i <= 24; i++) {
    v = f(G.x0 + (G.x1 - G.x0) * i / 24, G.y0 + (G.y1 - G.y0) * j / 24);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
}
/* سایه‌روشن، با بلوک‌های درشت — از ImageData ارزان‌تر است و روی موبایل
   هم روان می‌ماند */
function shade(f, fig, G, lo, hi) {
  var ctx = fig.ctx, step = 8, x, y, v, t;
  for (y = 0; y < fig.h; y += step) for (x = 0; x < fig.w; x += step) {
    v = f(G.ix(x + step / 2), G.iy(y + step / 2));
    t = (v - lo) / Math.max(hi - lo, 1e-9);
    t = Math.max(0, Math.min(1, t));
    ctx.fillStyle = sigA(0.04 + 0.44 * t * t);
    ctx.fillRect(x, y, step, step);
  }
}
/* مارچینگ اسکوئرز — خط تراز در سطح lv */
function isoSegs(f, lv, G, n) {
  var segs = [], i, j;
  var dx = (G.x1 - G.x0) / n, dy = (G.y1 - G.y0) / n;
  function ip(xa, ya, va, xb, yb, vb) {
    var t = va / (va - vb);
    return [xa + (xb - xa) * t, ya + (yb - ya) * t];
  }
  for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
    var x = G.x0 + i * dx, y = G.y0 + j * dy;
    var v0 = f(x, y) - lv, v1 = f(x + dx, y) - lv,
        v2 = f(x + dx, y + dy) - lv, v3 = f(x, y + dy) - lv;
    var m = (v0 > 0 ? 1 : 0) | (v1 > 0 ? 2 : 0) | (v2 > 0 ? 4 : 0) | (v3 > 0 ? 8 : 0);
    if (m === 0 || m === 15) continue;
    var cross = [];
    if ((v0 > 0) !== (v1 > 0)) cross.push(ip(x, y, v0, x + dx, y, v1));
    if ((v1 > 0) !== (v2 > 0)) cross.push(ip(x + dx, y, v1, x + dx, y + dy, v2));
    if ((v2 > 0) !== (v3 > 0)) cross.push(ip(x + dx, y + dy, v2, x, y + dy, v3));
    if ((v3 > 0) !== (v0 > 0)) cross.push(ip(x, y + dy, v3, x, y, v0));
    for (var k = 0; k + 1 < cross.length; k += 2) segs.push([cross[k], cross[k + 1]]);
  }
  return segs;
}
function strokeSegs(ctx, G, segs) {
  ctx.beginPath();
  segs.forEach(function (s) {
    ctx.moveTo(G.X(s[0][0]), G.Y(s[0][1]));
    ctx.lineTo(G.X(s[1][0]), G.Y(s[1][1]));
  });
  ctx.stroke();
}

/* ============================================================
   میدان‌های برداری — همان‌هایی که در معادلات ماکسول پیدایشان می‌شود
   ============================================================ */
var SOFT = 0.055;                       /* هستهٔ نرم، تا 1/r² در مرکز منفجر نشود */
var FIELDS = [
  { key: 'uniform', label: 'یکنواخت',
    f: function () { return [0.85, 0.3]; },
    fml: 'F = (0.85, 0.3)',
    note: 'میدان ثابت <span class="en">uniform field</span>: همه‌جا یک فلش، با یک اندازه و یک جهت. هر دو مشتق صفرند، پس هم <span class="q">∇·F = 0</span> و هم <span class="q">∇×F = 0</span>. کسل‌کننده‌ترین میدان ممکن، و دقیقاً به همین دلیل مبنای مقایسه.' },
  { key: 'source', label: 'چشمه',
    f: function (x, y) { return [x, y]; },
    fml: 'F = (x, y)',
    note: 'چشمهٔ خطی <span class="en">linear source</span>. <span class="q">∂P/∂x = ∂Q/∂y = 1</span>، پس <span class="q">∇·F = 2</span> در <b>تمام</b> صفحه — نه فقط در مرکز. یعنی هر نقطه‌ای از این میدان دارد چیزی تولید می‌کند. کرلش صفر است.' },
  { key: 'sink', label: 'چاهک',
    f: function (x, y) { return [-x, -y]; },
    fml: 'F = (−x, −y)',
    note: 'همان قبلی با علامت وارونه: <span class="q">∇·F = −2</span> همه‌جا. هر نقطه دارد می‌بلعد.' },
  { key: 'vortex', label: 'چرخش صلب',
    f: function (x, y) { return [-y, x]; },
    fml: 'F = (−y, x) = ω × r',
    note: 'چرخش جسم صلب <span class="en">rigid rotation</span> با <span class="q">ω = k̂</span> — مثل نقطه‌ای روی صفحهٔ گرام‌فون. <span class="q">∇·F = 0</span> ولی <span class="q">(∇×F)<sub>z</sub> = 1 − (−1) = 2</span>، یعنی دقیقاً <span class="q">2ω</span>، در تمام صفحه و نه فقط وسط.' },
  { key: 'charge', label: 'بار خطی',
    /* دو‌بعدی است، پس میدانِ درست هم دوبعدی است: مقطعِ یک بار خطیِ بی‌نهایت،
       یعنی r̂/r و نه r̂/r². هر دو همین خاصیت را دارند — دیورژانسِ صفر بیرون
       از منبع — ولی توانش در دو بعد یکی کمتر است. */
    f: function (x, y) {
      var r2 = x * x + y * y + SOFT;
      return [x / r2 * 0.8, y / r2 * 0.8];
    },
    fml: 'F = r̂ / r = (x, y)/r²',
    note: 'مقطعِ عمود بر یک بار خطیِ بی‌نهایت. با فاصله دقیقاً آن‌قدری ضعیف می‌شود که <span class="q">∇·F = 0</span> بماند — همه‌جا جز روی خود محور، که آنجا یک تکینگی است. هم سالنوئیدی است هم بی‌چرخش. همتای سه‌بعدی‌اش بار نقطه‌ای با <span class="q">r̂/r²</span> است؛ محاسبه‌اش در متن هست.' },
  { key: 'wire', label: 'گردابِ سیم',
    f: function (x, y) {
      var r2 = x * x + y * y + SOFT;
      return [-y / r2 * 0.8, x / r2 * 0.8];
    },
    fml: 'F = θ̂ / r = (−y, x)/r²',
    note: 'میدان مغناطیسی دور یک سیم حامل جریان. خطوطش دایره‌های کاملند، ولی <span class="q">∇×F = 0</span> همه‌جا جز روی خود سیم — محاسبه‌اش در متن هست. اینکه میدان دور می‌زند به معنی داشتن کرل نیست.' },
  { key: 'shear', label: 'برشی',
    f: function (x, y) { return [y * 0.9, 0]; },
    fml: 'F = (0.9y, 0)',
    note: 'جریان برشی <span class="en">shear flow</span>. کاملاً مستقیم است و هیچ‌جا دور نمی‌زند، ولی <span class="q">(∇×F)<sub>z</sub> = 0 − 0.9 = −0.9</span> همه‌جا. مهم‌ترین مثال کل مقاله: کرل از خمیدگیِ خطوط نمی‌آید، از تفاوت سرعت در عرض جریان می‌آید.' },
  { key: 'saddle', label: 'زین',
    f: function (x, y) { return [x, -y]; },
    fml: 'F = (x, −y)',
    note: 'نقطهٔ زینی <span class="en">saddle</span>: از دو طرف فشرده و از دو طرف کشیده. <span class="q">∇·F = 1 − 1 = 0</span> و <span class="q">∇×F = 0</span>. هر دو صفرند، ولی میدان بی‌خاصیت نیست — این همان «نرخ کرنش برشیِ» بخش ۷ است، تکه‌ای از ژاکوبین که نه دیورژانس می‌بیند و نه کرل.' }
];
function fieldBy(key) {
  for (var i = 0; i < FIELDS.length; i++) if (FIELDS[i].key === key) return FIELDS[i];
  return FIELDS[0];
}
/* بزرگ‌ترین طول فلش روی دامنه، برای اینکه مقیاس هر میدان خودش باشد */
function maxMag(F, G) {
  var m = 1e-6, i, j, v;
  for (j = 0; j <= 14; j++) for (i = 0; i <= 14; i++) {
    v = F(G.x0 + (G.x1 - G.x0) * i / 14, G.y0 + (G.y1 - G.y0) * j / 14);
    m = Math.max(m, Math.hypot(v[0], v[1]));
  }
  return m;
}
/* شبکهٔ فلش‌ها */
function drawArrows(ctx, G, F, nx, alpha, scale) {
  var stepX = (G.x1 - G.x0) / nx;
  var ny = Math.max(2, Math.round((G.y1 - G.y0) / stepX));
  var stepY = (G.y1 - G.y0) / ny;
  var cell = Math.min(stepX, stepY) * G.s;
  var mx = maxMag(F, G);
  var i, j;
  for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
    var x = G.x0 + (i + 0.5) * stepX, y = G.y0 + (j + 0.5) * stepY;
    var v = F(x, y), m = Math.hypot(v[0], v[1]);
    if (m < 1e-6) continue;
    /* ریشهٔ دوم، تا فلش‌های کوچک هم دیده شوند بی‌آنکه بزرگ‌ها بیرون بزنند */
    var len = cell * 0.46 * Math.sqrt(Math.min(m / mx, 1)) * (scale || 1);
    var px = G.X(x), py = G.Y(y), ux = v[0] / m, uy = -v[1] / m;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = fgA(alpha * (0.45 + 0.55 * Math.min(m / mx, 1)));
    ctx.fillStyle   = fgA(alpha * (0.45 + 0.55 * Math.min(m / mx, 1)));
    arrow(ctx, px - ux * len, py - uy * len, px + ux * len, py + uy * len, Math.max(4, len * 0.45));
  }
}
/* یک خط جریان از یک نقطه، به هر دو طرف */
function streamline(F, x, y, G, dir, steps, ds) {
  var pts = [[x, y]], i, v, m;
  for (i = 0; i < steps; i++) {
    v = F(x, y); m = Math.hypot(v[0], v[1]);
    if (m < 1e-7) break;
    /* گام نصف‌راه (RK2) — با گام ثابتِ طول، نه ثابتِ زمان */
    var hx = x + dir * ds * v[0] / m * 0.5, hy = y + dir * ds * v[1] / m * 0.5;
    var w = F(hx, hy), mw = Math.hypot(w[0], w[1]);
    if (mw < 1e-7) break;
    x += dir * ds * w[0] / mw; y += dir * ds * w[1] / mw;
    if (x < G.x0 - 0.2 || x > G.x1 + 0.2 || y < G.y0 - 0.2 || y > G.y1 + 0.2) break;
    pts.push([x, y]);
  }
  return pts;
}
function drawStreamlines(ctx, G, F, seeds, alpha) {
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = fgA(alpha);
  ctx.fillStyle = fgA(alpha);
  var ds = (G.x1 - G.x0) / 90;
  seeds.forEach(function (s) {
    var back = streamline(F, s[0], s[1], G, -1, 70, ds).reverse();
    var fwd  = streamline(F, s[0], s[1], G, 1, 70, ds);
    var pts = back.concat(fwd.slice(1));
    if (pts.length < 3) return;
    ctx.beginPath();
    pts.forEach(function (p, i) {
      var X = G.X(p[0]), Y = G.Y(p[1]);
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    });
    ctx.stroke();
    /* یک سرِ فلش وسط خط، تا جهت گم نشود */
    var k = Math.floor(pts.length * 0.55), a = pts[k], b = pts[Math.min(k + 2, pts.length - 1)];
    if (a && b) arrow(ctx, G.X(a[0]), G.Y(a[1]), G.X(b[0]), G.Y(b[1]), 6);
  });
}
function seedGrid(G, n) {
  var s = [], i, j;
  for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
    s.push([G.x0 + (G.x1 - G.x0) * (i + 0.5) / n, G.y0 + (G.y1 - G.y0) * (j + 0.5) / n]);
  }
  return s;
}
/* ذره‌های شناور — «خاک‌اره روی آب» */
function Particles(G, count) {
  var ps = [], i;
  function born() {
    return { x: G.x0 + Math.random() * (G.x1 - G.x0),
             y: G.y0 + Math.random() * (G.y1 - G.y0),
             a: Math.random() * 3, tr: [] };
  }
  for (i = 0; i < count; i++) ps.push(born());
  return {
    ps: ps,
    step: function (F, dt, norm) {
      ps.forEach(function (p) {
        var v = F(p.x, p.y), m = Math.hypot(v[0], v[1]) || 1e-9;
        var sc = dt * 0.9 / norm;
        p.x += v[0] * sc; p.y += v[1] * sc; p.a += dt;
        p.tr.push([p.x, p.y]);
        if (p.tr.length > 14) p.tr.shift();
        var out = p.x < G.x0 - 0.1 || p.x > G.x1 + 0.1 || p.y < G.y0 - 0.1 || p.y > G.y1 + 0.1;
        if (out || p.a > 3.4 || m < 1e-6) {
          var n = born(); n.a = 0; p.x = n.x; p.y = n.y; p.a = 0; p.tr.length = 0;
        }
      });
    },
    draw: function (ctx, alpha) {
      ps.forEach(function (p) {
        if (p.tr.length < 2) return;
        var fade = Math.min(1, p.a / 0.35) * Math.min(1, (3.4 - p.a) / 0.6);
        ctx.strokeStyle = sigA(alpha * 0.55 * fade);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        p.tr.forEach(function (q, i) {
          var X = G.X(q[0]), Y = G.Y(q[1]);
          if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        });
        ctx.stroke();
        dot(ctx, G.X(p.x), G.Y(p.y), 2.1, sigA(alpha * fade));
      });
    }
  };
}

/* ============================================================
   HERO — دو گرداب مخالف، با ذره‌هایی که در آن شنا می‌کنند.
   قرار نیست چیزی از آن خوانده شود؛ فقط باید نشان بدهد یک میدان
   برداری چه شکلی است.
   ============================================================ */
(function () {
  var cv = document.getElementById('figHero');
  if (!cv) return;
  function F(x, y) {
    var ax = x - 0.55, ay = y - 0.4, a2 = ax * ax + ay * ay + 0.09;
    var bx = x + 0.55, by = y + 0.4, b2 = bx * bx + by * by + 0.09;
    return [(-ay / a2 * 0.5) + (by / b2 * 0.5) + 0.12,
            ( ax / a2 * 0.5) - (bx / b2 * 0.5) + 0.05];
  }
  var parts = null;
  var f = Fig(cv, 1, function (fig) {
    var G = Geo(fig.w, fig.h, 1.45, 4);
    clear(fig);
    fig.ctx.fillStyle = fgA(0.035);
    fig.ctx.fillRect(0, 0, fig.w, fig.h);
    drawArrows(fig.ctx, G, F, 9, 0.3, 0.9);
    if (parts) parts.draw(fig.ctx, 1);
    fig.state.G = G;
  });
  animate(cv, function () {
    var G = f.state.G;
    if (!G) return;
    if (!parts) parts = Particles(G, 70);
    parts.step(F, 1 / 60, 0.9);
    f.redraw();
  }).start();
})();

/* ============================================================
   FIG 1 — یک میدان اسکالر
   ============================================================ */
(function () {
  var cv = document.getElementById('figScalar');
  if (!cv) return;
  var out = document.getElementById('scalarOut');
  var cbIso = document.getElementById('scalarIso');
  var cbFill = document.getElementById('scalarFill');
  var cur = SCALARS[1], P = { x: -0.15, y: 0.12 };
  var bg = Cache();

  var f = Fig(cv, 1.12, function (fig) {
    var G = Geo(fig.w, fig.h, 1.5, 4);
    var fn = cur.f, r = rangeOf(fn, G), lo = r[0], hi = r[1];
    clear(fig);
    fig.ctx.drawImage(
      bg(cur.key + cbIso.checked + cbFill.checked, fig.w, fig.h, function (c) {
        c.fillStyle = fgA(0.03);
        c.fillRect(0, 0, fig.w, fig.h);
        if (cbFill.checked) shade(fn, { ctx: c, w: fig.w, h: fig.h }, G, lo, hi);
        if (cbIso.checked) {
          c.lineWidth = 1;
          c.strokeStyle = fgA(0.3);
          for (var k = 1; k < 10; k++) strokeSegs(c, G, isoSegs(fn, lo + (hi - lo) * k / 10, G, 46));
        }
      }), 0, 0, fig.w, fig.h);

    /* خط ترازی که خودِ نقطه رویش ایستاده، پررنگ */
    fig.ctx.lineWidth = 2;
    fig.ctx.strokeStyle = sigA(0.75);
    fig.ctx.setLineDash([5, 4]);
    strokeSegs(fig.ctx, G, isoSegs(fn, fn(P.x, P.y), G, 54));
    fig.ctx.setLineDash([]);

    var px = G.X(P.x), py = G.Y(P.y);
    dot(fig.ctx, px, py, 6, sigA(1), bgA(1));
    tag(fig.ctx, px, py, nf(fn(P.x, P.y), 1) + ' °C', sigA(1));
    fig.state.G = G;
    ro(out, [
      ['نقطه', '(' + nf(P.x) + ' , ' + nf(P.y) + ')'],
      ['دمای اینجا', '<b>' + nf(fn(P.x, P.y), 1) + ' °C</b>'],
      ['سردترین جای نقشه', nf(lo, 1) + ' °C'],
      ['گرم‌ترین جای نقشه', nf(hi, 1) + ' °C']
    ]);
  });

  draggable(cv, function (p) {
    var G = f.state.G; if (!G) return;
    P.x = Math.max(G.x0, Math.min(G.x1, G.ix(p.x)));
    P.y = Math.max(G.y0, Math.min(G.y1, G.iy(p.y)));
    f.redraw();
  });
  cbIso.addEventListener('change', f.redraw);
  cbFill.addEventListener('change', f.redraw);
  pills(document.getElementById('scalarPresets'), SCALARS, function (it) {
    cur = it; f.redraw();
  }, 1);
})();

/* ============================================================
   FIG 2 — گرادیان
   ============================================================ */
(function () {
  var cv = document.getElementById('figGrad');
  if (!cv) return;
  var out = document.getElementById('gradOut');
  var cbField = document.getElementById('gradField');
  var rollBtn = document.getElementById('gradRoll');
  var cur = SCALARS[2], P = { x: -0.2, y: -0.15 };
  var rolling = false;
  var bg = Cache();

  var f = Fig(cv, 1.12, function (fig) {
    var G = Geo(fig.w, fig.h, 1.5, 4);
    var fn = cur.f, r = rangeOf(fn, G), lo = r[0], hi = r[1];
    var ctx = fig.ctx;
    clear(fig);
    /* همه‌چیزِ ثابت — سایه، ترازها، شبکهٔ فلش‌ها — یک‌جا از حافظه */
    ctx.drawImage(
      bg(cur.key + cbField.checked, fig.w, fig.h, function (c) {
        c.fillStyle = fgA(0.03);
        c.fillRect(0, 0, fig.w, fig.h);
        shade(fn, { ctx: c, w: fig.w, h: fig.h }, G, lo, hi);
        c.lineWidth = 1;
        c.strokeStyle = fgA(0.28);
        for (var k = 1; k < 10; k++) strokeSegs(c, G, isoSegs(fn, lo + (hi - lo) * k / 10, G, 46));
        if (cbField.checked) {
          drawArrows(c, G, function (x, y) { return gradOf(fn, x, y, 0.02); }, 10, 0.55);
        }
      }), 0, 0, fig.w, fig.h);

    /* خط تراز نقطه */
    ctx.lineWidth = 2;
    ctx.strokeStyle = fgA(0.7);
    ctx.setLineDash([5, 4]);
    strokeSegs(ctx, G, isoSegs(fn, fn(P.x, P.y), G, 40));
    ctx.setLineDash([]);

    /* خودِ گرادیان، بلند و آبی */
    var g = gradOf(fn, P.x, P.y, 0.02), m = Math.hypot(g[0], g[1]);
    var px = G.X(P.x), py = G.Y(P.y);
    if (m > 1e-4) {
      var len = Math.min(58, 12 + m * 5.5);
      ctx.lineWidth = 3;
      ctx.strokeStyle = sigA(1); ctx.fillStyle = sigA(1);
      arrow(ctx, px, py, px + g[0] / m * len, py - g[1] / m * len, 10);
    }
    dot(ctx, px, py, 6, sigA(1), bgA(1));
    fig.state.G = G;

    ro(out, [
      ['<span class="q">∂f/∂x</span>', nf(g[0])],
      ['<span class="q">∂f/∂y</span>', nf(g[1])],
      ['طول <span class="q">∇f</span>', '<b>' + nf(m) + '</b>'],
      ['شیب', m < 0.25 ? 'تقریباً صاف' : (m < 2 ? 'ملایم' : 'تند')]
    ]);
  });

  draggable(cv, function (p) {
    var G = f.state.G; if (!G) return;
    rolling = false; rollBtn.classList.remove('on');
    rollBtn.textContent = '▶ ولش کن بره بالا';
    P.x = Math.max(G.x0, Math.min(G.x1, G.ix(p.x)));
    P.y = Math.max(G.y0, Math.min(G.y1, G.iy(p.y)));
    f.redraw();
  });
  cbField.addEventListener('change', f.redraw);
  rollBtn.addEventListener('click', function () {
    rolling = !rolling;
    rollBtn.classList.toggle('on', rolling);
    rollBtn.textContent = rolling ? '❙❙ نگهش دار' : '▶ ولش کن بره بالا';
  });
  pills(document.getElementById('gradPresets'), SCALARS, function (it) {
    cur = it; f.redraw();
  }, 2);

  animate(cv, function () {
    if (!rolling) return;
    var g = gradOf(cur.f, P.x, P.y, 0.02), m = Math.hypot(g[0], g[1]);
    if (m < 0.02) {                       /* رسید به قله و ایستاد */
      rolling = false;
      rollBtn.classList.remove('on');
      rollBtn.textContent = '▶ ولش کن بره بالا';
      f.redraw();
      return;
    }
    /* گام محدود، وگرنه روی شیب تند از قله می‌پرد آن‌طرف و می‌لرزد */
    var st = Math.min(0.004, 0.014 / m);
    P.x += g[0] * st; P.y += g[1] * st;
    f.redraw();
  }).start();
})();

/* ============================================================
   FIG 3 — میدان‌شناسی
   ============================================================ */
(function () {
  var cv = document.getElementById('figField');
  if (!cv) return;
  var out = document.getElementById('fieldOut');
  var note = document.getElementById('fieldNote');
  var cur = FIELDS[1], mode = 0;          /* 0 فلش، 1 خط جریان، 2 ذره */
  var parts = null;

  function say(v, what) {
    if (Math.abs(v) < 0.02) return '<b>0</b>' + (what ? ' — ' + what : '');
    return '<b>' + nf(v) + '</b>';
  }

  var f = Fig(cv, 1.12, function (fig) {
    var G = Geo(fig.w, fig.h, 1.5, 4);
    var F = cur.f, ctx = fig.ctx;
    clear(fig);
    ctx.fillStyle = fgA(0.03);
    ctx.fillRect(0, 0, fig.w, fig.h);

    if (mode === 0) drawArrows(ctx, G, F, 11, 0.85);
    else if (mode === 1) {
      drawArrows(ctx, G, F, 11, 0.16);
      drawStreamlines(ctx, G, F, seedGrid(G, 6), 0.6);
    } else {
      drawArrows(ctx, G, F, 11, 0.16);
      if (parts) parts.draw(ctx, 1);
    }

    /* نقطهٔ ویژه، جایی که میدان تعریف‌نشده است */
    if (cur.key === 'charge' || cur.key === 'wire') {
      dot(ctx, G.X(0), G.Y(0), 5, sigA(1), bgA(1));
    }
    fig.state.G = G;

    /* دیورژانس و کرل را در یک نقطهٔ عمومی می‌سنجیم، نه در مرکز:
       برای بار نقطه‌ای و گرداب سیم، مرکز همان جایی است که همه‌چیز
       منفجر می‌شود و عددش نمایندهٔ میدان نیست. */
    var d = divOf(F, 0.62, 0.44, 0.01), c = curlOf(F, 0.62, 0.44, 0.01);
    ro(out, [
      ['فرمول', cur.fml],
      ['<span class="q">∇·F</span> (سنجش عددی)', say(d)],
      ['<span class="q">(∇×F)z</span> (سنجش عددی)', say(c)]
    ]);
    note.innerHTML = cur.note;
  });

  draggable(cv, function () {});          /* بوم را می‌گیرد تا صفحه اسکرول نشود */

  pills(document.getElementById('fieldPresets'), FIELDS, function (it) {
    cur = it; parts = null; f.redraw();
  }, 1);
  pills(document.getElementById('fieldModes'), [
    { label: 'فلش‌ها' }, { label: 'خطوط جریان' }, { label: 'ذره‌ها' }
  ], function (it, i) { mode = i; parts = null; f.redraw(); }, 0);

  animate(cv, function () {
    if (mode !== 2) return;
    var G = f.state.G; if (!G) return;
    if (!parts) parts = Particles(G, 90);
    parts.step(cur.f, 1 / 60, Math.max(0.5, maxMag(cur.f, G) * 0.55));
    f.redraw();
  }).start();
})();

/* ============================================================
   FIG 4 — دیورژانس: حلقه را بکش
   ============================================================ */
(function () {
  var cv = document.getElementById('figDiv');
  if (!cv) return;
  var out = document.getElementById('divOut');
  var note = document.getElementById('divNote');
  var slR = document.getElementById('divR');
  var lbR = document.getElementById('divRv');
  var SET = ['uniform', 'source', 'sink', 'vortex', 'charge', 'shear', 'saddle']
              .map(fieldBy);
  var cur = SET[1], P = { x: 0.55, y: 0.35 }, R = 0.30;
  var N = 40;                              /* تعداد نمونه روی مرز */

  function flux(F) {
    var s = 0, i, th, x, y, v;
    for (i = 0; i < N; i++) {
      th = (i + 0.5) / N * Math.PI * 2;
      x = P.x + R * Math.cos(th); y = P.y + R * Math.sin(th);
      v = F(x, y);
      s += (v[0] * Math.cos(th) + v[1] * Math.sin(th));
    }
    return s * (2 * Math.PI * R / N);      /* ∮ F·n ds */
  }

  var f = Fig(cv, 1.12, function (fig) {
    var G = Geo(fig.w, fig.h, 1.5, 4);
    var F = cur.f, ctx = fig.ctx;
    clear(fig);
    ctx.fillStyle = fgA(0.03);
    ctx.fillRect(0, 0, fig.w, fig.h);
    /* میدان پس‌زمینه عمداً کم‌رنگ است: فلش‌های روی مرز حرف اصلی این شکل‌اند
       و نباید با فلش‌های میدان اشتباه گرفته شوند */
    drawArrows(ctx, G, F, 11, 0.18);
    if (cur.key === 'charge') dot(ctx, G.X(0), G.Y(0), 5, fgA(0.8), bgA(1));

    /* خودِ حلقه */
    var cxp = G.X(P.x), cyp = G.Y(P.y), rp = R * G.s;
    ctx.lineWidth = 2;
    ctx.strokeStyle = fgA(0.85);
    ctx.fillStyle = bgA(0.35);
    ctx.beginPath(); ctx.arc(cxp, cyp, rp, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    /* فلش‌های عمود بر مرز: آبی یعنی بیرون‌رو، تیره یعنی درون‌رو */
    var pts = [], i;
    for (i = 0; i < 24; i++) {
      var th = i / 24 * Math.PI * 2;
      var x = P.x + R * Math.cos(th), y = P.y + R * Math.sin(th);
      var v = F(x, y);
      pts.push({
        x: G.X(x), y: G.Y(y),
        nx: Math.cos(th), ny: -Math.sin(th),
        tx: -Math.sin(th), ty: -Math.cos(th),
        v: v[0] * Math.cos(th) + v[1] * Math.sin(th)
      });
    }
    edgeArrows(ctx, pts, rp, true);
    dot(ctx, cxp, cyp, 3.5, fgA(0.9));
    fig.state.G = G;

    var Φ = flux(F), A = Math.PI * R * R;
    var exact = divOf(F, P.x, P.y, 0.01);
    ro(out, [
      ['شار خالص <span class="q">∮F·n ds</span>', '<b>' + nf(Φ) + '</b>'],
      ['مساحت حلقه', nf(A, 3)],
      ['شار ÷ مساحت', nf(Φ / A)],
      ['<span class="q">∇·F</span> در مرکز', '<b>' + nf(exact) + '</b>']
    ]);

    var msg;
    if (Math.abs(Φ) < 0.02) {
      msg = 'شار صفر است: هرچه وارد حلقه می‌شود، دقیقاً همان‌قدر هم خارج می‌شود. نه چشمه‌ای هست نه چاهکی — جریان فقط دارد رد می‌شود.';
    } else if (Φ > 0) {
      msg = 'شار مثبت است: بیشتر از آنچه وارد شده خارج می‌شود، پس داخل حلقه <b>چشمه</b> هست.';
    } else {
      msg = 'شار منفی است: کمتر از آنچه وارد شده خارج می‌شود، پس داخل حلقه <b>چاهک</b> هست.';
    }
    if (cur.key === 'charge') {
      msg += Math.hypot(P.x, P.y) < R
        ? ' — و این‌بار منبع <b>داخل</b> حلقه است.'
        : ' — منبع بیرون حلقه است؛ حلقه را ببر رویش.';
    }
    note.innerHTML = msg;
  });

  draggable(cv, function (p) {
    var G = f.state.G; if (!G) return;
    P.x = Math.max(G.x0 + R, Math.min(G.x1 - R, G.ix(p.x)));
    P.y = Math.max(G.y0 + R, Math.min(G.y1 - R, G.iy(p.y)));
    f.redraw();
  });
  slR.addEventListener('input', function () {
    R = +slR.value / 100;
    lbR.textContent = R.toFixed(2);
    f.redraw();
  });
  pills(document.getElementById('divPresets'), SET, function (it) { cur = it; f.redraw(); }, 1);
})();

/* ============================================================
   FIG 5 — کرل: چرخونک را بکش
   ============================================================ */
(function () {
  var cv = document.getElementById('figCurl');
  if (!cv) return;
  var out = document.getElementById('curlOut');
  var note = document.getElementById('curlNote');
  var cbMap = document.getElementById('curlMap');
  var SET = ['shear', 'vortex', 'wire', 'source', 'uniform', 'saddle'].map(fieldBy);
  var cur = SET[0], P = { x: 0.0, y: 0.35 }, R = 0.34, spin = 0;
  var N = 40;
  var bg = Cache();

  function circ(F) {
    var s = 0, i, th, x, y, v;
    for (i = 0; i < N; i++) {
      th = (i + 0.5) / N * Math.PI * 2;
      x = P.x + R * Math.cos(th); y = P.y + R * Math.sin(th);
      v = F(x, y);
      s += (-v[0] * Math.sin(th) + v[1] * Math.cos(th));   /* F·t */
    }
    return s * (2 * Math.PI * R / N);
  }

  var f = Fig(cv, 1.12, function (fig) {
    var G = Geo(fig.w, fig.h, 1.5, 4);
    var F = cur.f, ctx = fig.ctx;
    clear(fig);
    /* پس‌زمینه — نقشهٔ کرل و شبکهٔ فلش‌ها — با میدان ثابت عوض نمی‌شود،
       و چرخونک هر فریم می‌چرخد. پس از حافظه. */
    ctx.drawImage(
      bg(cur.key + cbMap.checked, fig.w, fig.h, function (c2) {
        c2.fillStyle = fgA(0.03);
        c2.fillRect(0, 0, fig.w, fig.h);
        if (cbMap.checked) {
          var step = 10, x, y, cz, t;
          for (y = 0; y < fig.h; y += step) for (x = 0; x < fig.w; x += step) {
            cz = curlOf(F, G.ix(x + step / 2), G.iy(y + step / 2), 0.02);
            t = Math.max(-1, Math.min(1, cz / 2.2));
            if (Math.abs(t) < 0.03) continue;
            c2.fillStyle = t > 0 ? sigA(0.42 * t) : fgA(0.34 * -t);
            c2.fillRect(x, y, step, step);
          }
        }
        drawArrows(c2, G, F, 11, cbMap.checked ? 0.34 : 0.4);
        if (cur.key === 'wire') dot(c2, G.X(0), G.Y(0), 5, fgA(0.8), bgA(1));
      }), 0, 0, fig.w, fig.h);

    var cxp = G.X(P.x), cyp = G.Y(P.y), rp = R * G.s;

    /* دایرهٔ حلقه، نازک و خط‌چین — فلش‌های مماسی باید از آن جدا دیده شوند */
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = fgA(0.45);
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(cxp, cyp, rp, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    /* فلش‌های مماس بر مرز: با جریان یا خلاف آن.
       کمی بیرون‌تر از خودِ دایره کشیده می‌شوند، وگرنه با خط حلقه یکی
       می‌شوند و کل شکل فقط یک دایرهٔ کلفت به نظر می‌رسد. */
    var pts = [], i;
    for (i = 0; i < 20; i++) {
      var th = i / 20 * Math.PI * 2;
      var x2 = P.x + R * Math.cos(th), y2 = P.y + R * Math.sin(th);
      var v = F(x2, y2);
      pts.push({
        x: G.X(x2), y: G.Y(y2),
        nx: Math.cos(th), ny: -Math.sin(th),
        tx: -Math.sin(th), ty: -Math.cos(th),
        v: -v[0] * Math.sin(th) + v[1] * Math.cos(th)
      });
    }
    edgeArrows(ctx, pts, rp, false);

    /* خودِ چرخونک: چهار پره با تیغهٔ عمودی سر هر پره */
    ctx.save();
    ctx.translate(cxp, cyp); ctx.rotate(-spin);
    ctx.lineCap = 'round';
    for (i = 0; i < 4; i++) {
      var a = i / 4 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      var tipx = ca * rp * 0.78, tipy = sa * rp * 0.78;
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = fgA(0.9);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(tipx, tipy); ctx.stroke();
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = fgA(1);
      ctx.beginPath();
      ctx.moveTo(tipx - sa * rp * 0.3, tipy + ca * rp * 0.3);
      ctx.lineTo(tipx + sa * rp * 0.3, tipy - ca * rp * 0.3);
      ctx.stroke();
    }
    ctx.restore();
    dot(ctx, cxp, cyp, 3.5, fgA(1), bgA(0.9));
    fig.state.G = G;

    var Γ = circ(F), A = Math.PI * R * R;
    var exact = curlOf(F, P.x, P.y, 0.01);
    ro(out, [
      ['گردش <span class="q">∮F·dl</span>', '<b>' + nf(Γ) + '</b>'],
      ['گردش ÷ مساحت', nf(Γ / A)],
      ['<span class="q">(∇×F)z</span> در مرکز', '<b>' + nf(exact) + '</b>'],
      ['چرخونک', Math.abs(exact) < 0.05 ? 'نمی‌چرخد'
        : (exact > 0 ? 'پادساعتگرد' : 'ساعتگرد')]
    ]);

    var msg;
    if (Math.abs(exact) < 0.05) {
      msg = 'چرخونک بی‌حرکت است: هرچه از یک طرف هلش می‌دهد، از طرف دیگر همان‌قدر برش می‌گرداند. اینجا میدان <b>بی‌چرخش</b> است.';
    } else {
      msg = 'فلش‌های <b>آبی</b> پادساعتگردند و <b>بی‌رنگ</b>ها ساعتگرد. هرکدام رویِ‌هم قوی‌تر باشند، چرخونک همان‌طرف می‌چرخد — و اینجا '
          + (exact > 0 ? 'آبی‌ها بردند.' : 'بی‌رنگ‌ها بردند.');
    }
    if (cur.key === 'shear') msg += ' حواست باشد جریان اینجا کاملاً مستقیم است — تنها چیزی که چرخونک را می‌چرخاند، تفاوتِ سرعت بین بالا و پایینِ آن است.';
    if (cur.key === 'wire') msg += ' اینجا برعکسش را می‌بینی: خطوط دایره‌اند ولی چرخونک نمی‌چرخد، چون آبِ نزدیک‌تر به مرکز آن‌قدر تندتر است که چرخش را دقیقاً خنثی می‌کند.';
    note.innerHTML = msg;
  });

  draggable(cv, function (p) {
    var G = f.state.G; if (!G) return;
    P.x = Math.max(G.x0 + R, Math.min(G.x1 - R, G.ix(p.x)));
    P.y = Math.max(G.y0 + R, Math.min(G.y1 - R, G.iy(p.y)));
    f.redraw();
  });
  cbMap.addEventListener('change', f.redraw);
  pills(document.getElementById('curlPresets'), SET, function (it) { cur = it; f.redraw(); }, 0);

  animate(cv, function () {
    var w = curlOf(cur.f, P.x, P.y, 0.01) / 2;    /* سرعت زاویه‌ای = کرل ÷ ۲ */
    spin += w / 60;
    f.redraw();
  }).start();
})();

/* ============================================================
   FIG 6 — دو دسته: دیورژانس و کرل، مستقل از هم
   ============================================================ */
(function () {
  var cv = document.getElementById('figMix');
  if (!cv) return;
  var out = document.getElementById('mixOut');
  var note = document.getElementById('mixNote');
  var slA = document.getElementById('mixA'), lbA = document.getElementById('mixAv');
  var slB = document.getElementById('mixB'), lbB = document.getElementById('mixBv');
  var a = 0.7, b = 0.0, parts = null;

  function F(x, y) { return [a * x - b * y, a * y + b * x]; }

  var f = Fig(cv, 1.12, function (fig) {
    var G = Geo(fig.w, fig.h, 1.5, 4);
    var ctx = fig.ctx;
    clear(fig);
    ctx.fillStyle = fgA(0.03);
    ctx.fillRect(0, 0, fig.w, fig.h);
    drawArrows(ctx, G, F, 11, 0.3);
    if (parts) parts.draw(ctx, 1);
    dot(ctx, G.X(0), G.Y(0), 3.5, fgA(0.6));
    fig.state.G = G;

    ro(out, [
      ['<span class="q">∇·F</span>', '<b>' + nf(2 * a) + '</b>'],
      ['<span class="q">∇×F</span>', '<b>' + nf(2 * b) + '</b>'],
      ['میدان', a >= 0 ? (b >= 0 ? 'چشمه + پادساعتگرد' : 'چشمه + ساعتگرد')
                       : (b >= 0 ? 'چاهک + پادساعتگرد' : 'چاهک + ساعتگرد')]
    ]);

    var msg;
    if (Math.abs(a) < 0.06 && Math.abs(b) < 0.06) msg = 'هر دو صفر: هیچ فلشی نمانده. میدانِ هیچ.';
    else if (Math.abs(b) < 0.06) msg = 'فقط دیورژانس. خطوط، شعاع‌های صافند — نه می‌پیچند، نه دور می‌زنند. میدان <b>بی‌چرخش</b> است.';
    else if (Math.abs(a) < 0.06) msg = 'فقط کرل. خطوط، دایره‌های بسته‌اند — هیچ ذره‌ای از مرکز دور یا به آن نزدیک نمی‌شود. میدان <b>سالنوئیدی</b> است.';
    else msg = 'هر دو با هم: مارپیچ لگاریتمی <span class=\'en\'>logarithmic spiral</span>. و باز هرکدام سرِ کار خودش است — لغزندهٔ بالا فقط <span class=\'q\'>∇·F</span> را عوض می‌کند و پایینی فقط <span class=\'q\'>∇×F</span> را.';
    note.innerHTML = msg;
  });

  function upd() {
    a = +slA.value / 100; b = +slB.value / 100;
    lbA.textContent = a.toFixed(1); lbB.textContent = b.toFixed(1);
    f.redraw();
  }
  slA.addEventListener('input', upd);
  slB.addEventListener('input', upd);
  pills(document.getElementById('mixPresets'), [
    { label: 'سرچشمهٔ خالص', a: 70, b: 0 },
    { label: 'گردابِ خالص', a: 0, b: 70 },
    { label: 'مارپیچ', a: 45, b: 65 },
    { label: 'چاهِ مارپیچ', a: -55, b: 55 }
  ], function (it) { slA.value = it.a; slB.value = it.b; upd(); }, 0);

  animate(cv, function () {
    var G = f.state.G; if (!G) return;
    if (!parts) parts = Particles(G, 80);
    parts.step(F, 1 / 60, Math.max(0.45, maxMag(F, G) * 0.5));
    f.redraw();
  }).start();
})();

/* ============================================================
   FIG 7 — لبه‌های داخلی همدیگر را می‌خورند
   ============================================================ */
(function () {
  var cv = document.getElementById('figSum');
  if (!cv) return;
  var out = document.getElementById('sumOut');
  var slN = document.getElementById('sumN'), lbN = document.getElementById('sumNv');
  var btn = document.getElementById('sumCancel');
  var n = 3, cancel = 0;                 /* ۰ = همه، ۱ = فقط مرز */

  var f = Fig(cv, 1.12, function (fig) {
    var ctx = fig.ctx;
    var pad = 22;
    var S = Math.min(fig.w, fig.h) - pad * 2;
    var x0 = (fig.w - S) / 2, y0 = (fig.h - S) / 2, c = S / n;
    clear(fig);
    ctx.fillStyle = fgA(0.03);
    ctx.fillRect(0, 0, fig.w, fig.h);

    /* شبکه */
    ctx.lineWidth = 1;
    ctx.strokeStyle = fgA(0.2);
    for (var i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo(x0 + i * c, y0); ctx.lineTo(x0 + i * c, y0 + S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, y0 + i * c); ctx.lineTo(x0 + S, y0 + i * c); ctx.stroke();
    }

    /* هر سلول، یک حلقهٔ پادساعتگرد. هر لبه یک فلش وسطش. */
    var inner = 0, edge = 0;
    var m = c * 0.30, off = c * 0.14;
    for (var r = 0; r < n; r++) for (var q = 0; q < n; q++) {
      var lx = x0 + q * c, ty = y0 + r * c;
      /* چهار لبه: [نقطهٔ وسط لبه, جهت پادساعتگرد, آیا داخلی است] */
      var E = [
        { x: lx + c / 2, y: ty + c - off, dx:  1, dy: 0, in: r < n - 1 },  /* پایین → راست */
        { x: lx + c - off, y: ty + c / 2, dx: 0, dy: -1, in: q < n - 1 },  /* راست → بالا  */
        { x: lx + c / 2, y: ty + off,     dx: -1, dy: 0, in: r > 0 },      /* بالا  → چپ   */
        { x: lx + off,   y: ty + c / 2,   dx: 0, dy:  1, in: q > 0 }       /* چپ   → پایین */
      ];
      E.forEach(function (e) {
        if (e['in']) { inner++; } else { edge++; }
        var vis = e['in'] ? (1 - cancel) : 1;
        if (vis < 0.02) return;
        var col = e['in'] ? fgA(0.55 * vis) : sigA(0.95);
        ctx.lineWidth = e['in'] ? 1.7 : 2.6;
        ctx.strokeStyle = col; ctx.fillStyle = col;
        arrow(ctx, e.x - e.dx * m, e.y - e.dy * m, e.x + e.dx * m, e.y + e.dy * m,
              e['in'] ? 5.5 : 7.5);
      });
    }
    /* مرز بیرونی، وقتی داخلی‌ها رفته‌اند */
    if (cancel > 0.6) {
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = sigA(0.5 * (cancel - 0.6) / 0.4);
      ctx.strokeRect(x0, y0, S, S);
    }

    ctx.font = '500 12px ' + FA_FONT;
    faTag(ctx, fig.w / 2, y0 - 11,
          cancel > 0.5 ? 'فقط گردشِ دورِ مرز باقی می‌ماند' : 'هر سلول، دور خودش می‌چرخد',
          fgA(0.8));

    ro(out, [
      ['سلول‌ها', fa(n) + ' × ' + fa(n) + ' = ' + fa(n * n)],
      ['لبه‌های داخلی (جفت‌به‌جفت حذف)', fa(inner)],
      ['لبه‌های مرزی (باقی‌مانده)', '<b>' + fa(edge) + '</b>']
    ]);
  });

  slN.addEventListener('input', function () {
    n = +slN.value;
    lbN.textContent = fa(n) + ' × ' + fa(n);
    f.redraw();
  });
  var target = 0;
  btn.addEventListener('click', function () {
    target = target > 0.5 ? 0 : 1;
    btn.classList.toggle('on', target > 0.5);
    btn.textContent = target > 0.5 ? 'حذفِ لبه‌های داخلی' : 'برشان گردان';
  });
  animate(cv, function () {
    if (Math.abs(cancel - target) < 0.004) return;
    cancel += (target - cancel) * 0.12;
    f.redraw();
  }).start();
})();

/* ============================================================
   هم‌رسانی — لینک‌های پلتفرم‌ها در خود HTML هستند و بدون این
   کد هم کار می‌کنند. اینجا فقط دکمهٔ کپی و شیت خود گوشی اضافه
   می‌شود.
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
      label.textContent = 'کپی لینک';
      copy.classList.remove('done');
    }, 1800);
  }
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
    flash(ok ? 'کپی شد ✓' : '⌘/Ctrl+C را بزن');
  }
  copy.addEventListener('click', function () {
    /* کلیپ‌بورد API فقط در بستر امن کار می‌کند؛ بقیه می‌روند سراغ textarea */
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () { flash('کپی شد ✓'); }, legacy);
    } else legacy();
  });
  if (navigator.share) {
    native.hidden = false;
    host.classList.add('has-native');
    native.addEventListener('click', function () {
      navigator.share({ title: title, url: url })['catch'](function () {});
    });
  }
})();

/* ============================================================
   نوار پیشرفت خواندن
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
