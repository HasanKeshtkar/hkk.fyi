"use strict";
/* Canvas Smith chart renderer. Global: SmithRenderer */
var SmithRenderer = (function () {

  var R_MINOR = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 4, 5, 6, 8, 10, 20];
  var R_MAJOR = [0.2, 0.5, 1, 2, 5];
  var R_LABELS = [0.2, 0.5, 1, 2, 3, 5, 10];
  var X_LABELS = [0.2, 0.5, 1, 2, 5];

  var THEMES = {
    paper: {
      outer: "#ece7d8", chartFill: "#f9f6ec",
      zGrid: "#8b8574", zMajor: "#5f5a4c", axis: "#5f5a4c",
      yGrid: "#7fa8c9", yMajor: "#4a7fae",
      rim: "#3f3a30", text: "#5a5443", scaleText: "#6b6553",
      swr: "#c2761f", point: "#d92f14", pointHalo: "rgba(217,47,20,0.18)",
      ghost: "#7a3fb8", yPoint: "#1f7ac2", target: "#1d9e63",
      hover: "#c2273f", halo: "#f9f6ec"
    },
    dark: {
      outer: "#0c1016", chartFill: "#131a23",
      zGrid: "#39465c", zMajor: "#5a6c88", axis: "#5a6c88",
      yGrid: "#2e5648", yMajor: "#3f8069",
      rim: "#8598b5", text: "#8598b5", scaleText: "#6c7d99",
      swr: "#e0a53d", point: "#ff5d4d", pointHalo: "rgba(255,93,77,0.20)",
      ghost: "#b57ee8", yPoint: "#54a8f0", target: "#3ecf8e",
      hover: "#ff9d94", halo: "#131a23"
    }
  };

  var themeName = "dark";
  var instances = [];

  function setThemeAll(name) {
    themeName = name;
    instances.forEach(function (r) { r.render(); });
  }

  function Renderer(canvas, opts) {
    var self = this;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.opts = Object.assign({
      zGrid: true, yGrid: false, scales: true, labels: true,
      swrCircle: true, yPoint: false, hoverGuides: true,
      point: null,               // Γ of the main (draggable) point
      pointDraggable: true,
      clickMovesPoint: true,
      ghost: null,               // Γ of secondary point (line rotation)
      rotation: null,            // {from:Γ, lenLambda, towardGen}
      arcs: [],                  // [{pts:[Γ...], color, width, arrow}]
      markers: [],               // [{g, style:'target'|'dot'|'ring', color, label}]
      onPointChange: null, onHover: null, onChartClick: null
    }, opts || {});

    this.hoverG = null;
    this._drag = false;

    try {
      this.ro = new ResizeObserver(function () { self._resize(); });
      this.ro.observe(canvas.parentElement);
    } catch (e) { /* fall back to window resize below */ }
    window.addEventListener("resize", function () { self._resize(); });
    // poll as a safety net: hidden tabs get their size when first shown
    this._sizeTimer = setInterval(function () {
      var p = canvas.parentElement;
      var w = p.clientWidth - 16, h = p.clientHeight - 16;
      if (w > 40 && h > 40 &&
          (Math.abs(canvas.width / (self.dpr || 1) - w) > 2 ||
           Math.abs(canvas.height / (self.dpr || 1) - h) > 2)) {
        self._resize();
      }
    }, 300);

    canvas.addEventListener("pointerdown", function (e) { self._down(e); });
    canvas.addEventListener("pointermove", function (e) { self._move(e); });
    window.addEventListener("pointerup", function () { self._drag = false; });
    canvas.addEventListener("pointerleave", function () {
      self.hoverG = null;
      if (self.opts.onHover) self.opts.onHover(null);
      self.render();
    });
    canvas.addEventListener("keydown", function (e) { self._key(e); });

    instances.push(this);
    this._resize();
  }

  Renderer.prototype._resize = function () {
    var c = this.canvas, p = c.parentElement;
    var dpr = window.devicePixelRatio || 1;
    var w = p.clientWidth - 16, h = p.clientHeight - 16;
    if (w < 40 || h < 40) return;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    c.style.width = w + "px";
    c.style.height = h + "px";
    this.dpr = dpr;
    this.render();
  };

  Renderer.prototype._geom = function () {
    var w = this.canvas.width / this.dpr, h = this.canvas.height / this.dpr;
    var margin = this.opts.scales ? 74 : 26;
    return { w: w, h: h, cx: w / 2, cy: h / 2, R: Math.max(20, Math.min(w, h) / 2 - margin) };
  };

  Renderer.prototype.g2xy = function (g) {
    var G = this._geom();
    return { x: G.cx + g.re * G.R, y: G.cy - g.im * G.R };
  };

  Renderer.prototype.xy2g = function (x, y) {
    var G = this._geom();
    return SM.C((x - G.cx) / G.R, -(y - G.cy) / G.R);
  };

  Renderer.prototype._evtG = function (e) {
    var r = this.canvas.getBoundingClientRect();
    return this.xy2g(e.clientX - r.left, e.clientY - r.top);
  };

  Renderer.prototype._down = function (e) {
    this.canvas.focus({ preventScroll: true });
    var g = this._evtG(e);
    if (this.opts.point && this.opts.pointDraggable) {
      var p = this.g2xy(this.opts.point);
      var r = this.canvas.getBoundingClientRect();
      var dx = (e.clientX - r.left) - p.x, dy = (e.clientY - r.top) - p.y;
      if (Math.hypot(dx, dy) < 16) {
        this._drag = true;
        this.canvas.setPointerCapture(e.pointerId);
        return;
      }
    }
    if (SM.cabs(g) <= 1.02) {
      if (this.opts.clickMovesPoint && this.opts.pointDraggable && this.opts.onPointChange) {
        this.opts.onPointChange(SM.clampGamma(g, 1));
      }
      if (this.opts.onChartClick) this.opts.onChartClick(SM.clampGamma(g, 1));
    }
  };

  Renderer.prototype._move = function (e) {
    var g = this._evtG(e);
    if (this._drag && this.opts.onPointChange) {
      this.opts.onPointChange(SM.clampGamma(g, 1));
      return;
    }
    var inside = SM.cabs(g) <= 1.005;
    this.hoverG = inside ? g : null;
    this.canvas.style.cursor = "crosshair";
    if (this.opts.point && this.opts.pointDraggable) {
      var p = this.g2xy(this.opts.point);
      var r = this.canvas.getBoundingClientRect();
      if (Math.hypot((e.clientX - r.left) - p.x, (e.clientY - r.top) - p.y) < 16)
        this.canvas.style.cursor = "grab";
    }
    if (this.opts.onHover) this.opts.onHover(this.hoverG);
    this.render();
  };

  Renderer.prototype._key = function (e) {
    if (!this.opts.point || !this.opts.pointDraggable || !this.opts.onPointChange) return;
    var s = e.shiftKey ? 0.02 : 0.005, g = this.opts.point, d = null;
    if (e.key === "ArrowLeft") d = SM.C(g.re - s, g.im);
    else if (e.key === "ArrowRight") d = SM.C(g.re + s, g.im);
    else if (e.key === "ArrowUp") d = SM.C(g.re, g.im + s);
    else if (e.key === "ArrowDown") d = SM.C(g.re, g.im - s);
    if (d) { e.preventDefault(); this.opts.onPointChange(SM.clampGamma(d, 1)); }
  };

  /* ---------------- drawing ---------------- */

  Renderer.prototype.render = function () {
    var ctx = this.ctx, G = this._geom(), T = THEMES[themeName], o = this.opts;
    if (!G || G.R < 20) return;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, G.w, G.h);
    ctx.fillStyle = T.outer;
    ctx.fillRect(0, 0, G.w, G.h);

    if (o.scales) this._drawScales(ctx, G, T);

    // chart disc
    ctx.beginPath();
    ctx.arc(G.cx, G.cy, G.R, 0, 2 * Math.PI);
    ctx.fillStyle = T.chartFill;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(G.cx, G.cy, G.R + 0.5, 0, 2 * Math.PI);
    ctx.clip();

    if (o.yGrid) this._drawGrid(ctx, G, T, -1);
    if (o.zGrid) this._drawGrid(ctx, G, T, +1);

    // horizontal axis
    ctx.strokeStyle = T.axis;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(G.cx - G.R, G.cy);
    ctx.lineTo(G.cx + G.R, G.cy);
    ctx.stroke();

    if (o.hoverGuides && this.hoverG) this._drawHoverGuides(ctx, G, T);
    if (o.swrCircle && o.point) this._drawSWRCircle(ctx, G, T, o.point);
    if (o.rotation) this._drawRotation(ctx, G, T, o.rotation);

    var i;
    for (i = 0; i < o.arcs.length; i++) this._drawArc(ctx, G, o.arcs[i]);

    ctx.restore(); // unclip

    // rim
    ctx.strokeStyle = T.rim;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(G.cx, G.cy, G.R, 0, 2 * Math.PI);
    ctx.stroke();

    if (o.labels) this._drawLabels(ctx, G, T);

    for (i = 0; i < o.markers.length; i++) this._drawMarker(ctx, G, T, o.markers[i]);
    if (o.yPoint && o.point) this._drawYPoint(ctx, G, T, o.point);
    if (o.ghost) this._drawGhost(ctx, G, T, o.ghost);
    if (o.point) this._drawPoint(ctx, G, T, o.point);

    ctx.restore();
  };

  Renderer.prototype._drawGrid = function (ctx, G, T, sign) {
    var minor = sign > 0 ? T.zGrid : T.yGrid;
    var major = sign > 0 ? T.zMajor : T.yMajor;
    var alpha = sign > 0 ? 1 : 0.75;
    ctx.save();
    ctx.globalAlpha = alpha;
    var i, v, isMaj;
    // constant resistance/conductance circles: center (sign·v/(1+v), 0), radius 1/(1+v)
    for (i = 0; i < R_MINOR.length; i++) {
      v = R_MINOR[i];
      isMaj = R_MAJOR.indexOf(v) >= 0;
      ctx.strokeStyle = isMaj ? major : minor;
      ctx.lineWidth = isMaj ? 1.05 : 0.55;
      ctx.beginPath();
      ctx.arc(G.cx + sign * (v / (1 + v)) * G.R, G.cy, G.R / (1 + v), 0, 2 * Math.PI);
      ctx.stroke();
    }
    // constant reactance/susceptance arcs: center (sign, ±1/v), radius 1/v
    for (i = 0; i < R_MINOR.length; i++) {
      v = R_MINOR[i];
      isMaj = R_MAJOR.indexOf(v) >= 0;
      ctx.strokeStyle = isMaj ? major : minor;
      ctx.lineWidth = isMaj ? 1.05 : 0.55;
      var rr = G.R / v;
      ctx.beginPath();
      ctx.arc(G.cx + sign * G.R, G.cy - rr, rr, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(G.cx + sign * G.R, G.cy + rr, rr, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  };

  Renderer.prototype._drawLabels = function (ctx, G, T) {
    var self = this;
    ctx.font = "10px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    function halo(txt, x, y, color) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = T.halo;
      ctx.strokeText(txt, x, y);
      ctx.fillStyle = color;
      ctx.fillText(txt, x, y);
    }

    var i, v;
    if (this.opts.zGrid) {
      for (i = 0; i < R_LABELS.length; i++) {
        v = R_LABELS[i];
        var gx = (v - 1) / (v + 1);
        halo(String(v), G.cx + gx * G.R + 9, G.cy - 8, T.text);
      }
      for (i = 0; i < X_LABELS.length; i++) {
        v = X_LABELS[i];
        var g = SM.gammaFromZ(SM.C(0, v));
        var th = Math.atan2(g.im, g.re);
        var rr = G.R - 13;
        halo("+j" + v, G.cx + rr * Math.cos(th), G.cy - rr * Math.sin(th), T.text);
        halo("−j" + v, G.cx + rr * Math.cos(-th), G.cy - rr * Math.sin(-th), T.text);
      }
      halo("0", G.cx - G.R + 10, G.cy - 8, T.text);
      halo("∞", G.cx + G.R - 10, G.cy - 8, T.text);
    }
  };

  Renderer.prototype._drawScales = function (ctx, G, T) {
    var i, th, x1, y1, x2, y2;
    ctx.strokeStyle = T.scaleText;
    ctx.fillStyle = T.scaleText;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    function tick(thRad, r1, r2, w) {
      ctx.lineWidth = w;
      x1 = G.cx + r1 * Math.cos(thRad); y1 = G.cy - r1 * Math.sin(thRad);
      x2 = G.cx + r2 * Math.cos(thRad); y2 = G.cy - r2 * Math.sin(thRad);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    // ring circles
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = 0.8;
    [G.R + 8, G.R + 30, G.R + 52].forEach(function (r) {
      ctx.beginPath(); ctx.arc(G.cx, G.cy, r, 0, 2 * Math.PI); ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // inner ring: angle of Γ in degrees, ticks every 10°, labels every 30°
    ctx.font = "8.5px 'Segoe UI', sans-serif";
    for (i = -180; i < 180; i += 10) {
      th = i * Math.PI / 180;
      tick(th, G.R + 2, G.R + 8, i % 30 === 0 ? 1 : 0.6);
      if (i % 30 === 0) {
        ctx.fillText(String(i), G.cx + (G.R + 17) * Math.cos(th), G.cy - (G.R + 17) * Math.sin(th));
      }
    }

    // middle ring: wavelengths toward LOAD (counter-clockwise from 180°)
    // outer ring:  wavelengths toward GENERATOR (clockwise from 180°)
    for (i = 0; i < 100; i++) {          // ticks every 0.005λ
      var lam = i * 0.005;
      var thG = Math.PI - lam * 4 * Math.PI;   // wtg: clockwise
      var thL = Math.PI + lam * 4 * Math.PI;   // wtl: counter-clockwise
      var big = i % 10 === 0;
      tick(thG, G.R + 46, G.R + 52, big ? 1 : 0.5);
      tick(thL, G.R + 24, G.R + 30, big ? 1 : 0.5);
      if (big) {
        var txt = lam.toFixed(2);
        ctx.fillText(txt, G.cx + (G.R + 61) * Math.cos(thG), G.cy - (G.R + 61) * Math.sin(thG));
        ctx.fillText(txt, G.cx + (G.R + 38) * Math.cos(thL), G.cy - (G.R + 38) * Math.sin(thL));
      }
    }
  };

  Renderer.prototype._drawSWRCircle = function (ctx, G, T, g) {
    var m = Math.min(SM.cabs(g), 1);
    if (m < 0.004) return;
    ctx.strokeStyle = T.swr;
    ctx.lineWidth = 1.3;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(G.cx, G.cy, m * G.R, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  Renderer.prototype._drawRotation = function (ctx, G, T, rot) {
    var m = Math.min(SM.cabs(rot.from), 1);
    if (m < 0.004 || rot.lenLambda <= 0) return;
    var th0 = SM.carg(rot.from);
    var dth = 4 * Math.PI * rot.lenLambda * (rot.towardGen ? -1 : 1);
    var steps = Math.max(8, Math.ceil(Math.abs(dth) / 0.05));
    ctx.strokeStyle = T.ghost;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var th = th0 + dth * i / steps;
      var x = G.cx + m * G.R * Math.cos(th), y = G.cy - m * G.R * Math.sin(th);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // arrowhead
    var thE = th0 + dth, dir = rot.towardGen ? -1 : 1;
    var tx = -Math.sin(thE) * dir, ty = -Math.cos(thE) * dir; // screen-space tangent
    var ex = G.cx + m * G.R * Math.cos(thE), ey = G.cy - m * G.R * Math.sin(thE);
    ctx.fillStyle = T.ghost;
    ctx.beginPath();
    ctx.moveTo(ex + tx * 11, ey + ty * 11);
    ctx.lineTo(ex - tx * 3 + ty * 5, ey - ty * 3 - tx * 5);
    ctx.lineTo(ex - tx * 3 - ty * 5, ey - ty * 3 + tx * 5);
    ctx.closePath();
    ctx.fill();
  };

  Renderer.prototype._drawArc = function (ctx, G, arc) {
    if (!arc.pts || arc.pts.length < 2) return;
    ctx.strokeStyle = arc.color;
    ctx.lineWidth = arc.width || 2.4;
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (var i = 0; i < arc.pts.length; i++) {
      var p = arc.pts[i];
      var x = G.cx + p.re * G.R, y = G.cy - p.im * G.R;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (arc.arrow && arc.pts.length >= 2) {
      var a = arc.pts[arc.pts.length - 2], b = arc.pts[arc.pts.length - 1];
      var bx = G.cx + b.re * G.R, by = G.cy - b.im * G.R;
      var dx = (b.re - a.re) * G.R, dy = -(b.im - a.im) * G.R;
      var L = Math.hypot(dx, dy);
      if (L > 0.01) {
        dx /= L; dy /= L;
        ctx.fillStyle = arc.color;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - dx * 10 + dy * 4.5, by - dy * 10 - dx * 4.5);
        ctx.lineTo(bx - dx * 10 - dy * 4.5, by - dy * 10 + dx * 4.5);
        ctx.closePath();
        ctx.fill();
      }
    }
  };

  Renderer.prototype._drawHoverGuides = function (ctx, G, T) {
    var z = SM.zFromGamma(this.hoverG);
    if (z.re < 0 || z.re > 1e6) return;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = T.hover;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    var r = z.re;
    ctx.beginPath();
    ctx.arc(G.cx + (r / (1 + r)) * G.R, G.cy, G.R / (1 + r), 0, 2 * Math.PI);
    ctx.stroke();
    var x = z.im;
    if (Math.abs(x) > 0.002) {
      var rr = G.R / Math.abs(x);
      ctx.beginPath();
      ctx.arc(G.cx + G.R, x > 0 ? G.cy - rr : G.cy + rr, rr, 0, 2 * Math.PI);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(G.cx - G.R, G.cy);
      ctx.lineTo(G.cx + G.R, G.cy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  };

  Renderer.prototype._drawPoint = function (ctx, G, T, g) {
    var p = this.g2xy(g);
    ctx.fillStyle = T.pointHalo;
    ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = T.point;
    ctx.strokeStyle = T.halo;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.font = "bold 11px 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.lineWidth = 3; ctx.strokeStyle = T.halo;
    ctx.strokeText("Z", p.x + 9, p.y - 7);
    ctx.fillText("Z", p.x + 9, p.y - 7);
  };

  Renderer.prototype._drawGhost = function (ctx, G, T, g) {
    var p = this.g2xy(g);
    ctx.strokeStyle = T.ghost;
    ctx.lineWidth = 2.4;
    ctx.fillStyle = T.halo;
    ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.font = "bold 11px 'Segoe UI', sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillStyle = T.ghost;
    ctx.lineWidth = 3; ctx.strokeStyle = T.halo;
    ctx.strokeText("Zin", p.x + 9, p.y - 7);
    ctx.fillText("Zin", p.x + 9, p.y - 7);
  };

  Renderer.prototype._drawYPoint = function (ctx, G, T, g) {
    var p = this.g2xy(SM.C(-g.re, -g.im));
    ctx.strokeStyle = T.yPoint;
    ctx.lineWidth = 2.2;
    ctx.fillStyle = T.halo;
    ctx.beginPath();
    ctx.rect(p.x - 5, p.y - 5, 10, 10);
    ctx.fill(); ctx.stroke();
    ctx.font = "bold 11px 'Segoe UI', sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillStyle = T.yPoint;
    ctx.lineWidth = 3; ctx.strokeStyle = T.halo;
    ctx.strokeText("Y", p.x + 9, p.y - 7);
    ctx.fillText("Y", p.x + 9, p.y - 7);
  };

  Renderer.prototype._drawMarker = function (ctx, G, T, mk) {
    var p = this.g2xy(mk.g);
    var color = mk.color || T.target;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    if (mk.style === "target") {
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 2 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, 2 * Math.PI); ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(p.x - 14, p.y); ctx.lineTo(p.x - 5, p.y);
      ctx.moveTo(p.x + 5, p.y); ctx.lineTo(p.x + 14, p.y);
      ctx.moveTo(p.x, p.y - 14); ctx.lineTo(p.x, p.y - 5);
      ctx.moveTo(p.x, p.y + 5); ctx.lineTo(p.x, p.y + 14);
      ctx.stroke();
    } else if (mk.style === "ring") {
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI); ctx.fill();
    }
    if (mk.label) {
      ctx.font = "bold 11px 'Segoe UI', sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.lineWidth = 3; ctx.strokeStyle = THEMES[themeName].halo;
      ctx.strokeText(mk.label, p.x + 11, p.y - 8);
      ctx.fillStyle = color;
      ctx.fillText(mk.label, p.x + 11, p.y - 8);
    }
  };

  return { Renderer: Renderer, setThemeAll: setThemeAll, themes: THEMES,
           getTheme: function () { return themeName; } };
})();
