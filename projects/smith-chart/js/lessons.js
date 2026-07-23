"use strict";
/* Learn tab: guided interactive lessons with tasks, quizzes and rotation exercises. */
var Lessons = (function () {

  function z(re, im) { return SM.C(re, im); }

  /* ------------------------------------------------------------------ */
  /*  LESSON CONTENT                                                     */
  /* ------------------------------------------------------------------ */
  var LESSONS = [

    { id: "basics", title: "1 · What is the Smith chart?", steps: [
      { html: "<p>Welcome! The <b>Smith chart</b> is the most famous tool in RF engineering. " +
              "It is simply a clever map of the <b>reflection coefficient</b> Γ drawn inside a circle of radius 1.</p>" +
              "<p>Every point inside the circle represents one possible impedance. The distance from the " +
              "center is <code>|Γ|</code> and the angle around the center is <code>∠Γ</code>.</p>" +
              "<p>Move your mouse over the chart and watch the status bar at the bottom — it reads the chart for you.</p>",
        setup: { point: null, zGrid: true } },
      { html: "<p>The <b>center of the chart</b> is the most important point: there Γ = 0, meaning " +
              "<i>no reflection at all</i>. The load is perfectly matched to the line " +
              "(z = 1, i.e. Z = Z<sub>0</sub>).</p>",
        task: { type: "click", targetZ: z(1, 0), tol: 0.09,
          text: "Click the exact center of the chart (the matched point, z = 1 + j0).",
          success: "That's the matched condition: all power is delivered to the load. Everything we do in matching aims at this point.",
          hint: "The center is where the horizontal axis crosses the r = 1 circle." } },
      { html: "<p>Now the two extreme points. A <b>short circuit</b> (Z = 0) reflects everything with a phase " +
              "flip: Γ = −1. It sits on the <i>left edge</i> of the chart.</p>",
        task: { type: "click", targetG: z(-1, 0), tol: 0.1,
          text: "Click the short-circuit point (z = 0, left edge of the horizontal axis).",
          success: "Correct — Γ = −1 ∠180°. |Γ| = 1 means total reflection.",
          hint: "It is the leftmost point of the big circle, on the horizontal axis." } },
      { html: "<p>An <b>open circuit</b> (Z = ∞) also reflects everything, but without the phase flip: Γ = +1. " +
              "It sits on the <i>right edge</i>.</p>",
        task: { type: "click", targetG: z(1, 0), tol: 0.1,
          text: "Click the open-circuit point (z = ∞, right edge of the horizontal axis).",
          success: "Correct — Γ = +1 ∠0°. Short and open are mirror images across the center.",
          hint: "Rightmost point of the chart, on the horizontal axis." } },
      { html: "<p>One more key fact: the chart splits into two halves.</p>" +
              "<ul><li><b>Upper half</b> — inductive region (x &gt; 0)</li>" +
              "<li><b>Lower half</b> — capacitive region (x &lt; 0)</li></ul>",
        task: { type: "quiz",
          text: "A load measures Z = 30 − j40 Ω. Where does it sit on the chart?",
          options: ["Upper half (inductive)", "Lower half (capacitive)", "Exactly on the horizontal axis", "Outside the chart"],
          answer: 1,
          explain: "X = −40 Ω is negative → capacitive → lower half of the chart." } },
      { html: "<p>🎉 <b>Lesson complete!</b> You now know the geography of the chart: center = matched, " +
              "rim = total reflection, left = short, right = open, top = inductive, bottom = capacitive.</p>" +
              "<p>Next: how to actually read impedances from the grid.</p>" }
    ]},

    { id: "grid", title: "2 · Reading the grid", steps: [
      { html: "<p>The curved grid is what makes the chart work. It has two families:</p>" +
              "<ul><li><b>Circles of constant r</b> — all touch the right edge; big circle is r = 0, tiny ones near the right are large r.</li>" +
              "<li><b>Arcs of constant x</b> — bend up (+jx, inductive) or down (−jx, capacitive).</li></ul>" +
              "<p>Any impedance z = r + jx is the <i>intersection</i> of one circle and one arc. " +
              "Hover over the chart — the red dashed guides show the r-circle and x-arc under your cursor.</p>",
        setup: { hoverGuides: true } },
      { html: "<p>Let's practice. Remember: find the <b>r = 1</b> circle (it passes through the center), " +
              "then walk up along it to the <b>x = +1</b> arc.</p>",
        task: { type: "click", targetZ: z(1, 1), tol: 0.09,
          text: "Click the point z = 1 + j1.",
          success: "Exactly. z = 1 + j1 → Γ = 0.447 ∠63.4°, SWR ≈ 2.62.",
          hint: "Start at the chart center and slide up-right along the r = 1 circle to the +j1 label." } },
      { html: "<p>Now a capacitive one — the lower half.</p>",
        task: { type: "click", targetZ: z(0.5, -0.5), tol: 0.09,
          text: "Click the point z = 0.5 − j0.5.",
          success: "Nice. With Z₀ = 50 Ω this is Z = 25 − j25 Ω.",
          hint: "The r = 0.5 circle is left of center; go down to the −j0.5 arc." } },
      { html: "<p>And a high-impedance point, close to the open-circuit side.</p>",
        task: { type: "click", targetZ: z(2, 2), tol: 0.1,
          text: "Click the point z = 2 + j2.",
          success: "Correct! Notice how the grid gets crowded toward the right edge — that is why big impedances are hard to read on paper charts.",
          hint: "The r = 2 circle is right of center; climb to the +j2 arc." } },
      { html: "",
        task: { type: "quiz",
          text: "With Z₀ = 50 Ω, the physical impedance Z = 100 + j50 Ω corresponds to which normalized point?",
          options: ["z = 100 + j50", "z = 2 + j1", "z = 0.5 + j1", "z = 2 − j1"],
          answer: 1,
          explain: "Always normalize first: z = Z / Z₀ = (100 + j50)/50 = 2 + j1." } },
      { html: "<p>🎉 <b>Lesson complete!</b> You can now place any impedance on the chart. " +
              "The golden rule: <b>always divide by Z₀ first</b>.</p>" }
    ]},

    { id: "swr", title: "3 · Γ, SWR and reflection", steps: [
      { html: "<p>Every mismatched load creates a <b>standing wave</b> on the line. Its strength is measured by " +
              "<code>SWR = (1 + |Γ|)/(1 − |Γ|)</code>.</p>" +
              "<p>Since |Γ| is just the distance from the chart center, <b>all points at the same distance " +
              "have the same SWR</b>. They form the dashed <b>SWR circle</b> you see around the red point.</p>",
        setup: { point: z(2, 0), swrCircle: true, draggable: true } },
      { html: "<p>The SWR circle crosses the horizontal axis at two special places: on the right at " +
              "<code>r = SWR</code> and on the left at <code>r = 1/SWR</code>. " +
              "That is how you read SWR directly off the chart!</p>",
        task: { type: "quiz",
          text: "A load z = 3 + j0 sits on the axis right of center. What is its SWR?",
          options: ["1.5", "2", "3", "9"],
          answer: 2,
          explain: "On the right half of the axis, SWR = r. Check: Γ = (3−1)/(3+1) = 0.5 → SWR = 1.5/0.5 = 3." } },
      { html: "<p>Try it yourself — the point is draggable.</p>",
        setup: { point: z(1, 0.5), swrCircle: true, draggable: true },
        task: { type: "click", targetZ: z(2, 0), tol: 0.07,
          text: "Place the point where SWR = 2 and the impedance is purely resistive and greater than Z₀ (that is z = 2 + j0).",
          success: "Perfect: on the axis at r = 2 the SWR is exactly 2.",
          hint: "Purely resistive means on the horizontal axis; right of center at the r = 2 circle." } },
      { html: "",
        task: { type: "quiz",
          text: "|Γ| = 0.2 for a load. How much of the incident power is reflected?",
          options: ["20 %", "8 %", "4 %", "0.2 %"],
          answer: 2,
          explain: "Reflected power fraction = |Γ|² = 0.04 = 4 %. Power goes with the square of the reflection coefficient." } },
      { html: "<p>🎉 <b>Lesson complete!</b> Distance from center ↔ |Γ| ↔ SWR. " +
              "The SWR circle will be the highway for the next lesson: moving along the line.</p>" }
    ]},

    { id: "admittance", title: "4 · Admittance: the mirror trick", steps: [
      { html: "<p>Shunt (parallel) elements are painful with impedances but trivial with <b>admittance</b> " +
              "y = 1/z = g + jb, because parallel admittances simply add.</p>" +
              "<p>The chart has a beautiful property: <b>y sits diametrically opposite z</b> — rotate the point " +
              "180° around the center and you are reading admittance.</p>" +
              "<p>The blue square on the chart is the admittance point of the red z point. Drag the red point and watch its mirror.</p>",
        setup: { point: z(1, 1), yPoint: true, draggable: true } },
      { html: "",
        task: { type: "quiz",
          text: "z = 1 + j1. What is y (normalized admittance)?",
          options: ["1 + j1", "1 − j1", "0.5 − j0.5", "2 − j2"],
          answer: 2,
          explain: "y = 1/(1+j1) = (1−j1)/2 = 0.5 − j0.5. On the chart: the mirrored point across the center." } },
      { html: "<p>Now find an admittance point geometrically.</p>",
        setup: { point: z(0.5, 0.5), yPoint: false, draggable: false, clickTask: true },
        task: { type: "click", targetGFromZMirror: z(0.5, 0.5), tol: 0.09,
          text: "The red point is z = 0.5 + j0.5. Click where its admittance point y lies.",
          success: "Correct — straight through the center, same distance on the other side. y = 1 − j1.",
          hint: "Draw a line from the point through the center and continue the same distance." } },
      { html: "<p>The green <b>admittance grid</b> (the mirrored circles) lets you read g and b directly. " +
              "Real paper charts often print both grids on top of each other.</p>",
        setup: { point: z(0.5, 0.5), yGrid: true, yPoint: true, draggable: true },
        task: { type: "quiz",
          text: "When two components are connected in PARALLEL, which quantities add directly?",
          options: ["Impedances z", "Admittances y", "Reflection coefficients Γ", "SWR values"],
          answer: 1,
          explain: "Parallel → admittances add (series → impedances add). This is why matching networks constantly hop between the two grids." } },
      { html: "<p>🎉 <b>Lesson complete!</b> The 180° mirror trick turns every shunt problem into simple addition. " +
              "Every real matching problem leans on it.</p>" }
    ]},

    { id: "line", title: "5 · Moving along the line", steps: [
      { html: "<p>Here is the superpower of the Smith chart. As you move a distance ℓ along a lossless line, " +
              "the reflection coefficient keeps its magnitude but its phase rotates:</p>" +
              "<p><code>Γ(ℓ) = Γ<sub>L</sub> · e<sup>−j·4πℓ/λ</sup></code></p>" +
              "<ul><li>Moving <b>toward the generator</b> → rotate <b>clockwise</b></li>" +
              "<li>Moving <b>toward the load</b> → rotate counter-clockwise</li>" +
              "<li>One full turn = <b>half a wavelength</b> (0.5 λ)</li></ul>" +
              "<p>The point travels along its SWR circle — the SWR itself never changes on a lossless line.</p>",
        setup: { point: z(2, 1), swrCircle: true, draggable: true } },
      { html: "<p>Use the slider below to rotate the load <code>z<sub>L</sub> = 2 + j1</code> toward the generator. " +
              "Watch the purple arc travel clockwise along the SWR circle.</p>",
        task: { type: "rotate", startZ: z(2, 1), target: 0.125, tol: 0.006,
          text: "Rotate exactly 0.125 λ toward the generator (one quarter-turn of the chart, i.e. 90°).",
          success: "0.125 λ = 90° of electrical length = a quarter of the full chart turn. The input impedance is now completely different — yet SWR is unchanged!",
          hint: "0.5 λ is a full turn (360°), so 0.125 λ is a quarter turn." } },
      { html: "",
        task: { type: "quiz",
          text: "A line is exactly 0.5 λ long. What is its input impedance if the load is z = 2 + j1?",
          options: ["1 + j0 (matched)", "2 + j1 (same as the load)", "0.4 − j0.2", "2 − j1"],
          answer: 1,
          explain: "0.5 λ = one complete rotation → you land exactly where you started. Impedance repeats every half wavelength." } },
      { html: "<p>The outer rings of the chart exist exactly for this: the <b>wavelengths-toward-generator</b> (WTG) " +
              "scale starts at 0 on the left (short circuit) and increases clockwise to 0.5.</p>",
        task: { type: "quiz",
          text: "A short circuit is transformed by a 0.25 λ line. What appears at the input?",
          options: ["Still a short circuit", "An open circuit", "A matched load", "SWR becomes 1"],
          answer: 1,
          explain: "0.25 λ = half a turn: the short (left edge) rotates to the right edge — an open! This is the famous quarter-wave inversion." } },
      { html: "<p>🎉 <b>Lesson complete!</b> Rotation along the SWR circle replaces pages of hyperbolic-tangent " +
              "algebra. Try the <b>Transmission line</b> panel in the Explore tab to play more.</p>" }
    ]},

    { id: "quarter", title: "6 · Quarter-wave transformer", steps: [
      { html: "<p>A line exactly <b>λ/4 long</b> with characteristic impedance Z₁ inverts impedances:</p>" +
              "<p><code>Z<sub>in</sub> = Z₁² / Z<sub>L</sub></code></p>" +
              "<p>Choose Z₁ wisely and a real load R<sub>L</sub> lands exactly on Z₀:</p>" +
              "<p><code>Z₁ = √(Z₀ · R<sub>L</sub>)</code></p>",
        setup: { point: z(2, 0), swrCircle: true } },
      { html: "",
        task: { type: "quiz",
          text: "You must match a 100 Ω antenna to a 50 Ω line with a quarter-wave section. What Z₁ do you need?",
          options: ["50 Ω", "70.7 Ω", "75 Ω", "141 Ω"],
          answer: 1,
          explain: "Z₁ = √(50 × 100) = √5000 ≈ 70.7 Ω. On the chart the λ/4 section rotates z = 2 half a turn (on the Z₁-normalized chart) onto the center." } },
      { html: "",
        task: { type: "quiz",
          text: "Why does a quarter-wave transformer only work directly on REAL (resistive) loads?",
          options: [
            "Because complex loads reflect too much power",
            "Because Z₁²/Z_L is only real (=Z₀) when Z_L is real",
            "Because reactive loads burn the line",
            "It works equally well on any load"],
          answer: 1,
          explain: "Z₁ is real, so Z₁²/Z_L can only equal the real Z₀ when Z_L is real. For complex loads you first rotate along the line until the impedance becomes real, then insert the λ/4 section." } },
      { html: "<p>🎉 <b>Lesson complete!</b> Recipe for any complex load: <i>walk along the line to a purely real point " +
              "(the SWR circle crossing the axis), then quarter-wave transform it.</i> " +
              "Use the <b>Transmission line</b> panel in the Explore tab to find that purely real point yourself.</p>" }
    ]},

    { id: "lmatch", title: "7 · L-network matching", steps: [
      { html: "<p>The classic two-element <b>L-network</b> uses one series and one shunt reactance. " +
              "On the chart each element moves the point along a specific family of circles:</p>" +
              "<ul><li><b>Series L / C</b> → moves along a <b>constant-r circle</b> (up for L, down for C)</li>" +
              "<li><b>Shunt L / C</b> → moves along a <b>constant-g circle</b> of the mirrored grid (down for L, up for C)</li></ul>",
        setup: { point: z(0.4, -0.6), yGrid: true } },
      { html: "<p>The strategy: hop between two special circles.</p>" +
              "<ul><li>The <b>r = 1 circle</b> passes through the center — a series element can finish the job from there.</li>" +
              "<li>The <b>g = 1 circle</b> (its mirror image) — a shunt element can finish from there.</li></ul>" +
              "<p>So: <i>element 1 lands you on one of these circles, element 2 slides you along it into the center.</i></p>",
        setup: { point: z(0.4, -0.6), yGrid: true },
        task: { type: "quiz",
          text: "Your point currently sits ON the r = 1 circle at z = 1 + j1.6. Which single element finishes the match?",
          options: ["Series capacitor with x = −1.6", "Series inductor with x = +1.6", "Shunt capacitor", "A 0.25 λ line"],
          answer: 0,
          explain: "On the r = 1 circle you need to cancel the reactance: add a series x = −1.6, i.e. a capacitor. You slide down the r = 1 circle right into the center." } },
      { html: "",
        task: { type: "quiz",
          text: "Which loads can be matched with a SHUNT-first L-network (shunt element, then series element)?",
          options: ["Only loads with r ≤ 1", "Only loads with g ≤ 1", "Any load whatsoever", "Only purely resistive loads"],
          answer: 1,
          explain: "The shunt element moves along a constant-g circle, which must intersect the r = 1 circle. That happens when g ≤ 1 (the region outside the mirrored g = 1 circle)." } },
      { html: "<p>🎉 <b>All lessons complete — congratulations!</b></p>" +
              "<p>Head back to the <b>Explore</b> tab and practice: pick any load, read its SWR circle, " +
              "rotate it along the line, and sketch how a series and a shunt element would walk it " +
              "into the center. The chart is yours now!</p>" }
    ]}
  ];

  /* ------------------------------------------------------------------ */
  /*  ENGINE                                                             */
  /* ------------------------------------------------------------------ */
  var R, els = {};
  var cur = { lesson: 0, step: 0, done: false, attempts: 0 };
  var progress = {};

  function $(id) { return document.getElementById(id); }

  function loadProgress() {
    try { progress = JSON.parse(localStorage.getItem("scs-progress") || "{}"); }
    catch (e) { progress = {}; }
  }
  function saveProgress() {
    try { localStorage.setItem("scs-progress", JSON.stringify(progress)); } catch (e) {}
  }

  function init() {
    els.nav = $("lessonNav"); els.header = $("lessonHeader");
    els.body = $("lessonBody"); els.task = $("lessonTask");
    els.feedback = $("lessonFeedback"); els.controls = $("lessonControls");
    els.progress = $("lessonProgress");

    R = new SmithRenderer.Renderer($("learnCanvas"), {
      pointDraggable: false, clickMovesPoint: false, swrCircle: false, scales: false,
      onChartClick: function (g) { onChartClick(g); },
      onHover: function (g) {
        var st = $("statusHover");
        if (!g) { st.textContent = "Learn mode — follow the instructions on the right."; return; }
        var zz = SM.zFromGamma(g);
        st.textContent = "z = " + SM.fmtComplex(zz) + "   |   Γ = " + SM.fmt(SM.cabs(g), 3) +
          " ∠ " + SM.fmt(SM.carg(g) * 180 / Math.PI, 3) + "°   |   SWR = " + SM.fmt(SM.swrFromGamma(g), 3);
      }
    });

    loadProgress();
    buildNav();
    $("lessonResetProgress").addEventListener("click", function () {
      progress = {}; saveProgress(); buildNav();
    });
    openLesson(0);
  }

  function buildNav() {
    els.nav.innerHTML = "";
    LESSONS.forEach(function (L, i) {
      var li = document.createElement("li");
      li.innerHTML = "<span class='tick'>✔</span><span>" + L.title + "</span>";
      if (progress[L.id]) li.classList.add("done");
      if (i === cur.lesson) li.classList.add("active");
      li.addEventListener("click", function () { openLesson(i); });
      els.nav.appendChild(li);
    });
  }

  function openLesson(i) {
    cur.lesson = i; cur.step = 0;
    buildNav();
    openStep(0);
  }

  function openStep(s) {
    var L = LESSONS[cur.lesson];
    cur.step = s;
    cur.done = false;
    cur.attempts = 0;
    var st = L.steps[s];

    els.header.innerHTML = "<div class='l-title'>" + L.title + "</div>" +
      "<div class='l-step'>Step " + (s + 1) + " of " + L.steps.length + "</div>";
    els.body.innerHTML = st.html || "";
    els.feedback.textContent = "";
    els.feedback.className = "feedback";

    setupChart(st);
    buildTask(st);
    buildControls(st);
    buildDots(L, s);
  }

  function setupChart(st) {
    var su = st.setup || {};
    R.opts.zGrid = su.zGrid !== undefined ? su.zGrid : true;
    R.opts.yGrid = !!su.yGrid;
    R.opts.yPoint = !!su.yPoint;
    R.opts.swrCircle = !!su.swrCircle;
    R.opts.hoverGuides = su.hoverGuides !== undefined ? !!su.hoverGuides : true;
    R.opts.scales = false;
    R.opts.markers = [];
    R.opts.arcs = [];
    R.opts.ghost = null;
    R.opts.rotation = null;
    R.opts.pointDraggable = !!su.draggable;
    R.opts.clickMovesPoint = !!su.draggable;
    R.opts.point = su.point !== undefined && su.point !== null ? SM.gammaFromZ(su.point) : null;
    R.opts.onPointChange = su.draggable ? function (g) {
      R.opts.point = g; R.render(); checkDragTask(g);
    } : null;
    R.render();
  }

  /* ---------- tasks ---------- */
  function buildTask(st) {
    els.task.innerHTML = "";
    if (!st.task) return;
    var t = st.task;
    var box = document.createElement("div");
    box.className = "task-box";
    box.innerHTML = "<div class='task-label'>Your task</div><div style='margin-top:5px'>" + t.text + "</div>";

    if (t.type === "quiz") {
      var wrap = document.createElement("div");
      wrap.className = "quiz-opts";
      t.options.forEach(function (opt, i) {
        var b = document.createElement("button");
        b.textContent = String.fromCharCode(65 + i) + ".  " + opt;
        b.addEventListener("click", function () {
          if (cur.done) return;
          if (i === t.answer) {
            b.classList.add("correct");
            success(t.explain);
          } else {
            b.classList.add("wrong");
            fail("Not quite — think again." + (cur.attempts >= 1 ? " Hint: " + t.explain.split(".")[0] + "." : ""));
          }
        });
        wrap.appendChild(b);
      });
      box.appendChild(wrap);
    }

    if (t.type === "rotate") {
      var g0 = SM.gammaFromZ(t.startZ);
      R.opts.point = g0;
      R.opts.swrCircle = true;
      R.render();
      var rowEl = document.createElement("div");
      rowEl.className = "slider-row";
      rowEl.style.marginTop = "10px";
      rowEl.innerHTML = "<input type='range' min='0' max='0.5' step='0.001' value='0'>" +
        "<span class='unit' style='font-family:var(--mono)'>0.000 λ</span>";
      var slider = rowEl.querySelector("input");
      var lab = rowEl.querySelector("span");
      slider.addEventListener("input", function () {
        var len = parseFloat(this.value);
        lab.textContent = len.toFixed(3) + " λ";
        R.opts.ghost = len > 0.0005 ? SM.rotate(g0, len, true) : null;
        R.opts.rotation = len > 0.0005 ? { from: g0, lenLambda: len, towardGen: true } : null;
        R.render();
        if (!cur.done && Math.abs(len - t.target) <= t.tol) {
          success(t.success);
        }
      });
      box.appendChild(rowEl);
    }

    els.task.appendChild(box);
  }

  function onChartClick(g) {
    var st = LESSONS[cur.lesson].steps[cur.step];
    if (!st.task || cur.done) return;
    var t = st.task;
    if (t.type !== "click") return;

    var target = t.targetG ? t.targetG :
      t.targetGFromZMirror ? SM.cscale(SM.gammaFromZ(t.targetGFromZMirror), -1) :
      SM.gammaFromZ(t.targetZ);

    // clicking task on a draggable point: point itself moves, we check its position
    var probe = g;
    var d = SM.cabs(SM.csub(probe, target));
    if (d <= t.tol) {
      R.opts.markers = [{ g: target, style: "target", label: "✔" }];
      R.render();
      success(t.success);
    } else {
      cur.attempts++;
      R.opts.markers = [{ g: probe, style: "ring", color: "#e05555" }];
      R.render();
      var msg = "Not there yet (off by " + SM.fmt(d, 2) + " on the Γ plane). " + (t.hint || "");
      if (cur.attempts >= 3) {
        msg += "  Need help?";
        showAnswerButton(target);
      }
      fail(msg);
    }
  }

  function checkDragTask(g) {
    var st = LESSONS[cur.lesson].steps[cur.step];
    if (!st.task || st.task.type !== "click" || cur.done) return;
    var t = st.task;
    var target = t.targetG ? t.targetG : SM.gammaFromZ(t.targetZ);
    if (SM.cabs(SM.csub(g, target)) <= t.tol) {
      R.opts.markers = [{ g: target, style: "target", label: "✔" }];
      R.render();
      success(t.success);
    }
  }

  function showAnswerButton(target) {
    if (els.controls.querySelector(".show-ans")) return;
    var b = document.createElement("button");
    b.className = "small-btn ghost show-ans";
    b.textContent = "Show me";
    b.addEventListener("click", function () {
      R.opts.markers = [{ g: target, style: "target", label: "here" }];
      R.render();
      els.feedback.textContent = "The target is marked on the chart — click it to continue.";
      els.feedback.className = "feedback";
    });
    els.controls.insertBefore(b, els.controls.firstChild);
  }

  function success(msg) {
    cur.done = true;
    els.feedback.innerHTML = "✔ " + (msg || "Correct!");
    els.feedback.className = "feedback ok";
    var next = els.controls.querySelector(".next-btn");
    if (next) next.disabled = false;
    var L = LESSONS[cur.lesson];
    if (cur.step === L.steps.length - 1) markLessonDone();
  }

  function fail(msg) {
    els.feedback.textContent = "✘ " + msg;
    els.feedback.className = "feedback no";
  }

  function markLessonDone() {
    progress[LESSONS[cur.lesson].id] = true;
    saveProgress();
    buildNav();
  }

  function buildControls(st) {
    els.controls.innerHTML = "";
    var L = LESSONS[cur.lesson];

    var back = document.createElement("button");
    back.className = "small-btn ghost";
    back.textContent = "← Back";
    back.disabled = cur.step === 0;
    back.addEventListener("click", function () { openStep(cur.step - 1); });
    els.controls.appendChild(back);

    var last = cur.step === L.steps.length - 1;
    var next = document.createElement("button");
    next.className = "small-btn next-btn";
    if (!last) {
      next.textContent = "Next →";
      next.disabled = !!st.task;               // must finish the task first
      next.addEventListener("click", function () { openStep(cur.step + 1); });
    } else {
      next.textContent = cur.lesson < LESSONS.length - 1 ? "Next lesson ⇒" : "Finish";
      next.disabled = !!st.task;
      next.addEventListener("click", function () {
        markLessonDone();
        if (cur.lesson < LESSONS.length - 1) openLesson(cur.lesson + 1);
      });
    }
    els.controls.appendChild(next);

    if (!st.task) {
      // pure info step: completing the last info step finishes the lesson
      if (last) markLessonDone();
    }
  }

  function buildDots(L, s) {
    els.progress.innerHTML = "";
    L.steps.forEach(function (_, i) {
      var d = document.createElement("span");
      if (i < s) d.classList.add("done");
      if (i === s) d.classList.add("cur");
      els.progress.appendChild(d);
    });
  }

  return { init: init };
})();
