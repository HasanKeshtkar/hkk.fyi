"use strict";
/* Complex arithmetic + Smith chart math + number formatting. Global namespace: SM */
var SM = (function () {

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
  function cscale(a, s) { return C(a.re * s, a.im * s); }
  function expj(t) { return C(Math.cos(t), Math.sin(t)); }

  var BIG = 1e7; // treat as "infinite" impedance (open circuit)

  function gammaFromZ(z) { return cdiv(csub(z, C(1)), cadd(z, C(1))); }

  function zFromGamma(g) {
    var den = csub(C(1), g);
    if (cabs(den) < 1e-9) return C(BIG, 0);
    return cdiv(cadd(C(1), g), den);
  }

  function clampGamma(g, max) {
    var m = cabs(g), lim = max === undefined ? 1 : max;
    if (m <= lim) return g;
    return cscale(g, lim / m);
  }

  function swrFromGamma(g) {
    var m = Math.min(cabs(g), 1);
    if (m > 0.99999) return Infinity;
    return (1 + m) / (1 - m);
  }

  function returnLossDb(g) {
    var m = cabs(g);
    if (m < 1e-9) return Infinity;
    return -20 * Math.log10(m);
  }

  function mismatchLossDb(g) {
    var m = Math.min(cabs(g), 1);
    var p = 1 - m * m;
    if (p <= 0) return Infinity;
    return -10 * Math.log10(p);
  }

  /* l in wavelengths; toward generator = clockwise on the chart */
  function rotate(g, l, towardGen) {
    var t = 4 * Math.PI * l * (towardGen ? -1 : 1);
    return cmul(g, expj(t));
  }

  /* ---------- lossy line ----------
     Propagation constant γ = α + jβ, so Γ(ℓ) = Γ_L · e^(−2γℓ).
     α is entered as a ONE-WAY attenuation in dB per wavelength:
        A_dB = alphaDb · ℓ          (one-way, ℓ in λ)
        voltage factor  = 10^(−A_dB/20)
        |Γ| factor      = 10^(−A_dB/10)   (wave goes down AND back)
     Moving toward the load undoes the loss (|Γ| grows) — clamped at 1. */

  var DB_PER_NP = 8.685889638065035;   // 20·log10(e)

  /* multiplier applied to |Γ| after travelling ℓ wavelengths */
  function attenFactor(l, towardGen, alphaDb) {
    var a = (alphaDb || 0) * l;                       // one-way dB
    if (a === 0) return 1;
    return Math.pow(10, (towardGen ? -a : a) / 10);
  }

  /* Γ after ℓ wavelengths of lossy line (spiral instead of circle) */
  function rotateLossy(g, l, towardGen, alphaDb) {
    var gr = cscale(rotate(g, l, towardGen), attenFactor(l, towardGen, alphaDb));
    return clampGamma(gr, 1);
  }

  /* Total line loss in dB: 10·log10(P_in / P_load), including the extra
     loss caused by the standing wave (SWR loss). gL = Γ at the load. */
  function lineLossDb(gL, l, alphaDb) {
    var A = (alphaDb || 0) * l;                       // one-way matched loss, dB
    if (A <= 0) return 0;
    var k = Math.pow(10, -A / 10);                    // power factor e^(−2αℓ)
    var m2 = Math.min(cabs(gL), 0.999999);
    m2 = m2 * m2;
    var num = 1 - m2 * k * k;
    var den = k * (1 - m2);
    if (den <= 0) return Infinity;
    return 10 * Math.log10(num / den);
  }

  /* wavelengths-toward-generator scale: 0 at the short-circuit point (angle 180°) */
  function wtg(g) {
    var d = 180 - carg(g) * 180 / Math.PI;
    d = ((d % 360) + 360) % 360;
    return d / 720;
  }
  function wtl(g) {
    var w = 0.5 - wtg(g);
    return w >= 0.5 ? 0 : (w < 0 ? w + 0.5 : w);
  }

  /* ---------- formatting ---------- */

  function fmt(v, sig) {
    if (!isFinite(v)) return v > 0 ? "∞" : "−∞";
    if (Math.abs(v) >= BIG * 0.9) return "∞";
    sig = sig || 4;
    if (Math.abs(v) < 1e-7) return "0";
    var a = Math.abs(v);
    if (a >= 1e5 || a < 1e-3) return v.toExponential(2).replace("-", "−").replace("e", "·10^");
    var s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace("-", "−");
  }

  function fmtComplex(c, unit) {
    if (Math.abs(c.re) >= BIG * 0.9) return "∞ (open)";
    var s = fmt(c.re) + (c.im < 0 ? " − j" : " + j") + fmt(Math.abs(c.im));
    return unit ? s + " " + unit : s;
  }

  var ENG = [
    [1e12, "T"], [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""],
    [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"], [1e-15, "f"]
  ];

  function fmtEng(v, unit) {
    if (!isFinite(v)) return "∞ " + unit;
    if (v === 0) return "0 " + unit;
    var a = Math.abs(v);
    for (var i = 0; i < ENG.length; i++) {
      if (a >= ENG[i][0] * 0.9999) {
        return fmt(v / ENG[i][0], 3) + " " + ENG[i][1] + unit;
      }
    }
    return fmt(v, 3) + " " + unit;
  }

  function fmtDeg(rad) { return fmt(rad * 180 / Math.PI, 4) + "°"; }

  /* frequency helpers */
  var FREQ_MULT = { kHz: 1e3, MHz: 1e6, GHz: 1e9 };

  /* Convert a normalized series reactance / shunt susceptance into a component value */
  function seriesComponent(xNorm, z0, w) {
    var X = xNorm * z0;
    if (X >= 0) return { kind: "Series L", value: X / w, unit: "H" };
    return { kind: "Series C", value: 1 / (w * (-X)), unit: "F" };
  }
  function shuntComponent(bNorm, z0, w) {
    var B = bNorm / z0;
    if (B >= 0) return { kind: "Shunt C", value: B / w, unit: "F" };
    return { kind: "Shunt L", value: 1 / (w * (-B)), unit: "H" };
  }

  /* L-network solutions bringing (r,x) normalized load to 1+j0.
     Returns array of {order:'series-first'|'shunt-first', X, B} (normalized). */
  function lMatchSolutions(z) {
    var sols = [];
    var r = z.re, x = z.im;
    var y = cinv(z), g = y.re, b = y.im;
    var i, s, X, B, x1, b1;

    if (r > 1e-9 && r <= 1 + 1e-9) {
      var q = Math.sqrt(Math.max(r * (1 - r), 0));
      for (i = 0; i < 2; i++) {
        s = i === 0 ? q : -q;
        X = -x + s;                       // series first: z1 = r + j·s
        b1 = -s / (r * r + s * s);        // y1 = 1 + j·b1
        B = -b1;
        if (i === 1 && q === 0) break;    // avoid duplicate when q = 0
        sols.push({ order: "series-first", X: X, B: B });
      }
    }
    if (g > 1e-9 && g <= 1 + 1e-9) {
      var p = Math.sqrt(Math.max(g * (1 - g), 0));
      for (i = 0; i < 2; i++) {
        s = i === 0 ? p : -p;
        B = -b + s;                       // shunt first: y1 = g + j·s
        x1 = -s / (g * g + s * s);        // z1 = 1 + j·x1
        X = -x1;
        if (i === 1 && p === 0) break;
        sols.push({ order: "shunt-first", X: X, B: B });
      }
    }
    return sols;
  }

  /* Input impedance of a series line: Z0line, elec length in wavelengths, ZL actual */
  function lineInput(ZL, z0line, lenLambda) {
    var bl = 2 * Math.PI * lenLambda;
    var c = Math.cos(bl), s = Math.sin(bl);
    if (Math.abs(c) < 1e-12) {  // quarter-wave (and odd multiples)
      return cdiv(C(z0line * z0line, 0), ZL);
    }
    var t = s / c;
    var num = cadd(ZL, C(0, z0line * t));
    var den = cadd(C(z0line, 0), cmul(C(0, t), ZL));
    return cscale(cdiv(num, den), z0line);
  }

  return {
    C: C, cadd: cadd, csub: csub, cmul: cmul, cdiv: cdiv, cabs: cabs,
    carg: carg, cinv: cinv, cscale: cscale, expj: expj, BIG: BIG,
    gammaFromZ: gammaFromZ, zFromGamma: zFromGamma, clampGamma: clampGamma,
    swrFromGamma: swrFromGamma, returnLossDb: returnLossDb, mismatchLossDb: mismatchLossDb,
    rotate: rotate, wtg: wtg, wtl: wtl,
    DB_PER_NP: DB_PER_NP, attenFactor: attenFactor,
    rotateLossy: rotateLossy, lineLossDb: lineLossDb,
    fmt: fmt, fmtComplex: fmtComplex, fmtEng: fmtEng, fmtDeg: fmtDeg,
    FREQ_MULT: FREQ_MULT, seriesComponent: seriesComponent, shuntComponent: shuntComponent,
    lMatchSolutions: lMatchSolutions, lineInput: lineInput
  };
})();
