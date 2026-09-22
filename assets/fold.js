/* ============ folds open as a wave ============
   Shared by the home page (CV, Writing) and the essays (plain-English
   side boxes). Opening a <details> eases its height open while the lines
   inside rise in one after another — the delay grows with distance from
   the fold's top / inline-start corner, so a wavefront sweeps diagonally
   across rows, list items, table rows and chips alike. Closing runs it
   backwards, quicker.

   Summary clicks are taken over for this; anything that sets .open
   directly (printing, "Expand all" without this file) still just works.
   Exposes window.hkkFold.set(details, open). No-op under reduced motion. */
(function () {
  var FOLDS = '#cv details, details.wr, details.decode';
  var ITEMS = '.cv-row, .cv-entry > p, .cv-entry > details, li, tr, .chip, ' +
              '.wr-body > *, .decode-body > :not(ul):not(ol)';
  var WAVE = [
    { opacity: 0, transform: 'translateY(16px)', easing: 'cubic-bezier(.2,.65,.3,1)' },
    { opacity: 1, transform: 'translateY(-3px)', offset: .55, easing: 'ease-in-out' },
    { transform: 'translateY(1px)', offset: .8, easing: 'ease-in-out' },
    { opacity: 1, transform: 'none' },
  ];

  var plain = function (d, open) { d.open = open; };
  window.hkkFold = { set: plain };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !Element.prototype.animate) return;

  var busy = new WeakMap();
  var running = new Set();          // printing finishes all of these
  addEventListener('beforeprint', function () { running.forEach(function (a) { a.finish(); }); });

  // lines that belong to this fold (not to one nested in it), outermost only
  function itemsOf (d) {
    var all = [].slice.call(d.querySelectorAll(ITEMS)).filter(function (el) {
      var owner = el.tagName === 'DETAILS' ? el.parentElement.closest('details') : el.closest('details');
      return owner === d;
    });
    return all.filter(function (el) {
      return !all.some(function (o) { return o !== el && o.contains(el); });
    });
  }

  function set (d, open) {
    var b = busy.get(d);
    if (b) b.finish();
    if (open === d.open) return;
    var summary = d.querySelector(':scope > summary');
    d.style.overflow = 'hidden';
    var from = d.offsetHeight;
    if (open) d.open = true;
    var border = d.offsetHeight - d.clientHeight;
    var to = open ? d.offsetHeight : summary.offsetHeight + border;
    var o = d.getBoundingClientRect();
    var rtl = getComputedStyle(d).direction === 'rtl';

    var anims = itemsOf(d).map(function (el) {
      var r = el.getBoundingClientRect();
      var across = rtl ? o.right - r.right : r.left - o.left;
      var lag = Math.min(560, (r.top - o.top) * .8 + across * .35);
      if (!open) {
        return el.animate([{ opacity: 1 }, { opacity: 0 }],
          { duration: 160, delay: Math.max(0, 140 - lag * .25), fill: 'forwards' });
      }
      var a = el.animate(WAVE, { duration: 720, delay: lag, fill: 'backwards' });
      running.add(a);
      a.onfinish = a.oncancel = function () { running.delete(a); };
      return a;
    });
    var h = d.animate([{ height: from + 'px' }, { height: to + 'px' }],
      { duration: open ? 480 : 300, delay: open ? 0 : 60, easing: 'cubic-bezier(.3,.7,.2,1)' });

    var done = false;
    var handle = { finish: function () { h.finish(); end(); } };
    function end () {
      if (done) return;
      done = true;
      if (!open) { d.open = false; anims.forEach(function (a) { a.cancel(); }); }
      d.style.overflow = '';
      running.delete(handle); busy.delete(d);
    }
    h.onfinish = end;
    running.add(handle); busy.set(d, handle);
  }

  window.hkkFold.set = set;
  document.querySelectorAll(FOLDS).forEach(function (d) {
    var summary = d.querySelector(':scope > summary');
    if (!summary) return;
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      set(d, !d.open);
    });
  });
})();
