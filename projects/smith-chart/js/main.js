"use strict";
/* App bootstrap: tab switching + chart theme toggle. */
(function () {

  function initTabs() {
    var btns = document.querySelectorAll(".tab-btn");
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        btns.forEach(function (x) { x.classList.remove("active"); });
        document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
        b.classList.add("active");
        document.getElementById("tab-" + b.dataset.tab).classList.add("active");
        var status = document.getElementById("statusHover");
        if (b.dataset.tab === "learn")
          status.textContent = "Learn mode — follow the instructions on the right.";
        else
          status.textContent = "Move the mouse over the chart to read impedances…";
      });
    });
  }

  function initTheme() {
    var btn = document.getElementById("themeToggle");
    btn.addEventListener("click", function () {
      var next = SmithRenderer.getTheme() === "paper" ? "dark" : "paper";
      SmithRenderer.setThemeAll(next);
      btn.textContent = "Chart: " + (next === "paper" ? "Paper" : "Dark");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTabs();
    initTheme();
    Explore.init();
    Lessons.init();
  });
})();
