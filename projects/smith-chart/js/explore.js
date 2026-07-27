"use strict";
/* Explore tab: free interactive Smith chart with synced inputs and readouts. */
var Explore = (function () {

  var state = {
    z0: 50,
    freqHz: 1e9,
    gamma: SM.gammaFromZ(SM.C(0.5, -1)),   // 25 - j50 over 50Ω
    dir: "gen",
    len: 0,
    alphaDb: 0        // one-way attenuation, dB per wavelength
  };

  var R, els = {};

  function $(id) { return document.getElementById(id); }

  function init() {
    els.z0 = $("exZ0"); els.freq = $("exFreq"); els.funit = $("exFreqUnit");
    els.R = $("exR"); els.X = $("exX"); els.r = $("exr"); els.x = $("exx");
    els.gm = $("exGm"); els.ga = $("exGa");
    els.preset = $("exPreset");
    els.len = $("exLen"); els.lenNum = $("exLenNum");
    els.alpha = $("exAlpha"); els.alphaUnit = $("exAlphaUnit"); els.alphaTotal = $("exAlphaTotal");
    els.readouts = $("exReadouts"); els.lineReadouts = $("exLineReadouts");
    els.status = $("statusHover");

    R = new SmithRenderer.Renderer($("exploreCanvas"), {
      point: state.gamma,
      onPointChange: function (g) { state.gamma = g; refresh("chart"); },
      onHover: hoverStatus
    });

    ["z0", "freq"].forEach(function (k) {
      els[k].addEventListener("input", function () { readSystem(); refresh("system"); });
    });
    els.funit.addEventListener("change", function () { readSystem(); refresh("system"); });

    els.R.addEventListener("input", function () { fromZ(); });
    els.X.addEventListener("input", function () { fromZ(); });
    els.r.addEventListener("input", function () { fromz(); });
    els.x.addEventListener("input", function () { fromz(); });
    els.gm.addEventListener("input", function () { fromG(); });
    els.ga.addEventListener("input", function () { fromG(); });

    els.preset.addEventListener("change", function () {
      if (!this.value) return;
      var p = this.value.split(",");
      var z = SM.C(parseFloat(p[0]) / state.z0, parseFloat(p[1]) / state.z0);
      state.gamma = SM.clampGamma(SM.gammaFromZ(z), 1);
      this.value = "";
      refresh("preset");
    });

    document.querySelectorAll("input[name=exDir]").forEach(function (rb) {
      rb.addEventListener("change", function () { state.dir = this.value; refresh("line"); });
    });
    els.len.addEventListener("input", function () {
      state.len = parseFloat(this.value) || 0;
      els.lenNum.value = this.value;
      refresh("line");
    });
    els.lenNum.addEventListener("input", function () {
      var v = Math.min(2, Math.max(0, parseFloat(this.value) || 0));
      state.len = v;
      els.len.value = v;
      refresh("line");
    });
    els.alpha.addEventListener("input", function () { readAlpha(); refresh("alpha"); });
    els.alphaUnit.addEventListener("change", function () { readAlpha(); refresh("alpha"); });
    $("exApplyLine").addEventListener("click", function () {
      state.gamma = rotated();
      state.len = 0;
      els.len.value = 0; els.lenNum.value = 0;
      refresh("apply");
    });
    $("exResetLine").addEventListener("click", function () {
      state.len = 0;
      els.len.value = 0; els.lenNum.value = 0;
      refresh("line");
    });

    ["opZGrid", "opYGrid", "opSWR", "opYPoint", "opScales", "opHover"].forEach(function (id) {
      $(id).addEventListener("change", applyDisplay);
    });

    readSystem();
    readAlpha();
    refresh("init");
  }

  function readSystem() {
    state.z0 = Math.max(0.001, parseFloat(els.z0.value) || 50);
    var f = parseFloat(els.freq.value) || 1;
    state.freqHz = f * SM.FREQ_MULT[els.funit.value];
  }

  /* α is stored internally in dB per wavelength (one-way) */
  function readAlpha() {
    var v = Math.max(0, parseFloat(els.alpha.value) || 0);
    state.alphaDb = els.alphaUnit.value === "npl" ? v * SM.DB_PER_NP : v;
  }

  function num(el) { var v = parseFloat(el.value); return isNaN(v) ? null : v; }

  function fromZ() {
    var Rv = num(els.R), Xv = num(els.X);
    if (Rv === null || Xv === null) return;
    state.gamma = SM.clampGamma(SM.gammaFromZ(SM.C(Math.max(0, Rv) / state.z0, Xv / state.z0)), 1);
    refresh("Z");
  }
  function fromz() {
    var rv = num(els.r), xv = num(els.x);
    if (rv === null || xv === null) return;
    state.gamma = SM.clampGamma(SM.gammaFromZ(SM.C(Math.max(0, rv), xv)), 1);
    refresh("z");
  }
  function fromG() {
    var m = num(els.gm), a = num(els.ga);
    if (m === null || a === null) return;
    m = Math.min(1, Math.max(0, m));
    state.gamma = SM.cscale(SM.expj(a * Math.PI / 180), m);
    refresh("G");
  }

  function rotated() {
    return SM.rotateLossy(state.gamma, state.len, state.dir === "gen", state.alphaDb);
  }

  function applyDisplay() {
    R.opts.zGrid = $("opZGrid").checked;
    R.opts.yGrid = $("opYGrid").checked;
    R.opts.swrCircle = $("opSWR").checked;
    R.opts.yPoint = $("opYPoint").checked;
    R.opts.scales = $("opScales").checked;
    R.opts.hoverGuides = $("opHover").checked;
    R.render();
  }

  function row(dt, dd, em) {
    return "<dt>" + dt + "</dt><dd" + (em ? " class='em'" : "") + ">" + dd + "</dd>";
  }

  function refresh(src) {
    var g = state.gamma;
    var z = SM.zFromGamma(g);
    var Z = SM.cscale(z, state.z0);
    var y = SM.cinv(z);
    var Y = SM.cscale(y, 1000 / state.z0); // mS
    var swr = SM.swrFromGamma(g);
    var m = SM.cabs(g), ang = SM.carg(g) * 180 / Math.PI;

    function set(el, v) { if (document.activeElement !== el) el.value = v; }
    set(els.R, round(Z.re)); set(els.X, round(Z.im));
    set(els.r, round(z.re)); set(els.x, round(z.im));
    set(els.gm, round(m)); set(els.ga, round(ang));

    els.readouts.innerHTML =
      row("Z", SM.fmtComplex(Z, "Ω"), true) +
      row("z (norm.)", SM.fmtComplex(z)) +
      row("Y", Z.re >= SM.BIG * 0.9 ? "0 mS" : SM.fmtComplex(Y, "mS")) +
      row("y (norm.)", SM.fmtComplex(y)) +
      row("Γ", SM.fmt(m) + " ∠ " + SM.fmt(ang) + "°", true) +
      row("Γ (rect.)", SM.fmtComplex(g)) +
      row("SWR", isFinite(swr) ? SM.fmt(swr) : "∞", true) +
      row("Return loss", isFinite(SM.returnLossDb(g)) ? SM.fmt(SM.returnLossDb(g)) + " dB" : "∞") +
      row("Mismatch loss", isFinite(SM.mismatchLossDb(g)) ? SM.fmt(SM.mismatchLossDb(g)) + " dB" : "∞") +
      row("Refl. power", SM.fmt(m * m * 100, 3) + " %") +
      row("WTG", SM.fmt(SM.wtg(g), 4) + " λ") +
      row("WTL", SM.fmt(SM.wtl(g), 4) + " λ");

    // transmission line section
    var gr = rotated();
    var zin = SM.zFromGamma(gr);
    var Zin = SM.cscale(zin, state.z0);
    var lossy = state.alphaDb > 1e-9;
    var matchedLoss = state.alphaDb * state.len;          // one-way, dB
    var swrIn = SM.swrFromGamma(gr);

    els.alphaTotal.value = SM.fmt(matchedLoss, 3) + " dB";

    var html =
      row("Electrical length", SM.fmt(state.len * 720, 4) + "°") +
      row("Z<sub>in</sub>", SM.fmtComplex(Zin, "Ω"), true) +
      row("z<sub>in</sub>", SM.fmtComplex(zin));

    if (!lossy) {
      html += row("SWR (unchanged)", isFinite(swr) ? SM.fmt(swr) : "∞");
    } else {
      // whichever end is the load end of the section we just traversed
      var gLoadEnd = state.dir === "gen" ? g : gr;
      var totalLoss = SM.lineLossDb(gLoadEnd, state.len, state.alphaDb);
      html +=
        row("|Γ<sub>in</sub>|", SM.fmt(SM.cabs(gr), 4) +
            "  (load " + SM.fmt(m, 4) + ")") +
        row("SWR at input", isFinite(swrIn) ? SM.fmt(swrIn) : "∞", true) +
        row("SWR at load", isFinite(swr) ? SM.fmt(swr) : "∞") +
        row("Matched-line loss", SM.fmt(matchedLoss, 3) + " dB") +
        row("Total line loss", isFinite(totalLoss) ? SM.fmt(totalLoss, 3) + " dB" : "∞") +
        row("Added by SWR", isFinite(totalLoss) ?
            SM.fmt(Math.max(0, totalLoss - matchedLoss), 3) + " dB" : "∞") +
        row("Power to load", isFinite(totalLoss) ?
            SM.fmt(Math.pow(10, -totalLoss / 10) * 100, 3) + " %" : "0 %");
      if (state.dir === "load" && SM.cabs(gr) > 0.9999 && m > 0.0001) {
        html += row("Note", "|Γ| clipped at 1 — de-embedding past the physical line");
      }
    }
    els.lineReadouts.innerHTML = html;

    R.opts.point = g;
    R.opts.ghost = state.len > 0.0005 ? gr : null;
    R.opts.rotation = state.len > 0.0005 ?
      { from: g, lenLambda: state.len, towardGen: state.dir === "gen", alphaDb: state.alphaDb } : null;
    R.render();
  }

  function round(v) {
    if (!isFinite(v)) return "";
    if (Math.abs(v) >= SM.BIG * 0.9) return "";
    return Math.abs(v) >= 100 ? v.toFixed(1) : +v.toFixed(4);
  }

  function hoverStatus(g) {
    if (!g) {
      els.status.textContent = "Move the mouse over the chart to read impedances…";
      return;
    }
    var z = SM.zFromGamma(g);
    var Z = SM.cscale(z, state.z0);
    var swr = SM.swrFromGamma(g);
    els.status.textContent =
      "z = " + SM.fmtComplex(z) +
      "   |   Z = " + SM.fmtComplex(Z, "Ω") +
      "   |   Γ = " + SM.fmt(SM.cabs(g), 3) + " ∠ " + SM.fmt(SM.carg(g) * 180 / Math.PI, 3) + "°" +
      "   |   SWR = " + (isFinite(swr) ? SM.fmt(swr, 3) : "∞") +
      "   |   WTG = " + SM.fmt(SM.wtg(g), 3) + " λ";
  }

  return { init: init };
})();
