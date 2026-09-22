/* ============ theme toggle (paper ⇄ ink) ============ */
const themeBtn = document.getElementById('themeBtn');
themeBtn.addEventListener('click', () => {
  const ink = document.documentElement.classList.toggle('ink');
  try { localStorage.setItem('hkk-theme', ink ? 'ink' : 'paper'); } catch (e) {}
});

const NS = 'http://www.w3.org/2000/svg';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============ hero wave: a line with a load on it ============
   Forward wave from the left, reflected wave from the load on the right:
     V(d,t) = cos(ωt + βd) + Γ cos(ωt − βd),  Γ = −|Γ|
   |Γ| = 1 is the old standing wave (nodes every λ/2); |Γ| = 0 is a pure
   travelling wave with a flat envelope. Mouse x picks the wavelength,
   mouse y the reflection; hovering shows the two parts and the SWR.
   A few faded copies a moment behind give it a scope's phosphor trail. */
const waveSvg = document.getElementById('waveSvg');
const waveHero = (function initWave () {
  const W = 1000, H = 130, mid = H / 2, AMAX = mid - 14;
  const TRAIL = 7, TRAIL_DT = .1;
  waveSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const fig = waveSvg.closest('.wave');
  const read = document.getElementById('waveRead');

  const el = (tag, cls, parent = waveSvg) => {
    const e = document.createElementNS(NS, tag);
    if (cls) e.setAttribute('class', cls);
    parent.appendChild(e);
    return e;
  };

  const axis = el('line', 'wave-axis');
  axis.setAttribute('x1', 0); axis.setAttribute('x2', W);
  axis.setAttribute('y1', mid); axis.setAttribute('y2', mid);

  const envTop = el('path', 'wave-env');
  const envBot = el('path', 'wave-env');
  const parts = el('g', 'wave-parts');
  const fwd = el('path', 'wave-part', parts);
  const ref = el('path', 'wave-part', parts);
  const trail = [];
  for (let n = TRAIL; n >= 1; n--) {
    const p = el('path', 'wave-trail');
    p.setAttribute('opacity', (.2 * (1 - n / (TRAIL + 1)) ** 1.6).toFixed(3));
    trail[n] = p;
  }
  const nodesG = el('g');
  const wave = el('path', 'wave-line');

  const DEF = { halfWaves: 5, g: 1 };
  const cur = { ...DEF }, tgt = { ...DEF };

  const pathFor = (fn) => {
    let d = '';
    for (let x = 0; x <= W; x += 8) d += (x ? 'L' : 'M') + x + ' ' + fn(x).toFixed(1);
    return d;
  };

  const render = (t) => {
    const k = Math.PI * cur.halfWaves / W;
    const g = cur.g, A = AMAX / (1 + g);
    const v = (x, ph) => { const d = W - x; return Math.cos(ph + k * d) - g * Math.cos(ph - k * d); };
    const env = (x) => A * Math.sqrt(Math.max(0, 1 + g * g - 2 * g * Math.cos(2 * k * (W - x))));
    envTop.setAttribute('d', pathFor(x => mid - env(x)));
    envBot.setAttribute('d', pathFor(x => mid + env(x)));
    wave.setAttribute('d', pathFor(x => mid - A * v(x, t)));
    for (let n = 1; n <= TRAIL; n++) trail[n].setAttribute('d', pathFor(x => mid - A * v(x, t - n * TRAIL_DT)));
    if (probing) {
      fwd.setAttribute('d', pathFor(x => mid - A * Math.cos(t + k * (W - x))));
      ref.setAttribute('d', pathFor(x => mid + A * g * Math.cos(t - k * (W - x))));
    }
    // voltage minima every λ/2 back from the load — true nodes only when |Γ| = 1
    const need = Math.floor(cur.halfWaves) + 1;
    while (nodesG.childNodes.length < need) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'wave-node');
      c.setAttribute('r', 3); c.setAttribute('cy', mid);
      nodesG.appendChild(c);
    }
    while (nodesG.childNodes.length > need) nodesG.removeChild(nodesG.lastChild);
    for (let n = 0; n < need; n++) {
      nodesG.childNodes[n].setAttribute('cx', (W - n * W / cur.halfWaves).toFixed(1));
    }
    nodesG.setAttribute('opacity', g.toFixed(2));
  };

  const showRead = () => {
    const swr = cur.g > .995 ? '∞' : ((1 + cur.g) / (1 - cur.g)).toFixed(1);
    read.textContent = `|Γ| ${cur.g.toFixed(2)} · SWR ${swr}`;
  };

  /* Mouse sculpting is user-driven, so it always works; only the ambient
     motion is paused for prefers-reduced-motion (and resumes on hover). */
  let probing = false;
  waveSvg.addEventListener('pointerenter', () => { probing = true; fig.classList.add('probing'); });
  waveSvg.addEventListener('pointermove', (e) => {
    probing = true; fig.classList.add('probing');
    const r = waveSvg.getBoundingClientRect();
    const fx = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    const fy = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    tgt.halfWaves = 2 + fx * 6;                    // 2 … 8 half-waves
    tgt.g = Math.min(1, Math.max(0, 1.1 - fy * 1.2)); // top: all reflected · bottom: matched
  });
  waveSvg.addEventListener('pointerleave', () => {
    probing = false; fig.classList.remove('probing');
    tgt.halfWaves = DEF.halfWaves; tgt.g = DEF.g;
  });

  let rafId = null, last = null, phase = Math.PI / 2, boost = 0;
  const frame = (ts) => {
    const dt = last === null ? 0 : Math.min(ts - last, 50);
    if (!reduced || probing) phase += dt / 480 * (1 + boost);
    boost *= .94;
    last = ts;
    cur.halfWaves += (tgt.halfWaves - cur.halfWaves) * .08;
    cur.g += (tgt.g - cur.g) * .08;
    render(phase);
    if (probing) showRead();
    rafId = requestAnimationFrame(frame);
  };
  render(phase);
  // run only while the wave is actually on screen
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && rafId === null) {
      rafId = requestAnimationFrame(frame);
    } else if (!en.isIntersecting && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null; last = null;
    }
  }).observe(waveSvg);

  // scrolling pumps the line: it runs faster for a moment, then relaxes
  return { pump: (v) => { if (!reduced) boost = Math.min(6, boost + v * .015); } };
})();

/* ============ the page is a medium ============
   The faint engineering grid behind everything is a 2-D membrane, and
   scrolling rolls waves in from the edge you are heading towards. Grid
   lines bend with the slope of the surface; crests light up blue at the
   crossings. It sleeps (one static frame, no loop) whenever it is still.
   (The pointer used to ripple it too; that was too busy.) */
const field = (function initField () {
  if (reduced) return null;
  const cvs = document.createElement('canvas');
  const ctx = cvs.getContext('2d');
  if (!ctx) return null;
  cvs.id = 'field';
  cvs.setAttribute('aria-hidden', 'true');
  document.body.prepend(cvs);
  document.documentElement.classList.add('has-field');

  const G = 28, S = 14, EDGE = 6;     // grid pitch, sim cell, absorbing border (cells)
  const STEP = 1000 / 60, K = 26, DMAX = 7;
  let W = 0, H = 0, dpr = 1, nx = 0, ny = 0, cur, prev, damp;
  let fg = '#1C1B1A', sig = '#2B59C3';
  let running = false, lastT = null, acc = 0, quiet = 0, peak = 0;

  const colors = () => {
    const cs = getComputedStyle(document.documentElement);
    fg = cs.getPropertyValue('--fg').trim() || fg;
    sig = cs.getPropertyValue('--sig').trim() || sig;
  };

  const resize = () => {
    const w = cvs.clientWidth, h = cvs.clientHeight;
    if (!w || !h || (w === W && h === H)) return;
    W = w; H = h;
    dpr = Math.min(devicePixelRatio || 1, 2);
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
    // cell (i, j) sits at pixel ((i−1)·S, (j−1)·S): one spare cell on every side
    nx = Math.ceil(W / S) + 3; ny = Math.ceil(H / S) + 3;
    cur = new Float32Array(nx * ny); prev = new Float32Array(nx * ny);
    damp = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const e = Math.min(i, j, nx - 1 - i, ny - 1 - j);
      damp[j * nx + i] = .982 * (e < EDGE ? 1 - (EDGE - e) / EDGE * .2 : 1);
    }
    draw();
  };

  // leapfrog 2-D wave equation, c² = ½, on the 9-point (isotropic) Laplacian —
  // the plain 4-neighbour one makes rings come out as rounded squares
  const step = () => {
    let m = 0;
    for (let j = 1; j < ny - 1; j++) {
      const r = j * nx;
      for (let i = 1; i < nx - 1; i++) {
        const k = r + i, c = cur[k];
        const lap = (4 * (cur[k - 1] + cur[k + 1] + cur[k - nx] + cur[k + nx]) +
                     cur[k - nx - 1] + cur[k - nx + 1] + cur[k + nx - 1] + cur[k + nx + 1] - 20 * c) / 6;
        const v = (2 * c - prev[k] + .5 * lap) * damp[k];
        prev[k] = v;
        if (v > m) m = v; else if (-v > m) m = -v;
      }
    }
    const t = cur; cur = prev; prev = t;
    return m;
  };

  const draw = (live) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = fg; ctx.globalAlpha = .05; ctx.lineWidth = 1;
    ctx.beginPath();
    const o = .5;
    if (!live) {
      for (let x = 0; x <= W; x += G) { ctx.moveTo(x + o, 0); ctx.lineTo(x + o, H); }
      for (let y = 0; y <= H; y += G) { ctx.moveTo(0, y + o); ctx.lineTo(W, y + o); }
      ctx.stroke(); ctx.globalAlpha = 1;
      return;
    }
    const d = (v) => (v > DMAX ? DMAX : v < -DMAX ? -DMAX : v);
    const cols = Math.floor(W / S), rows = Math.floor(H / S);
    for (let gy = 0; gy <= rows; gy += 2) {            // horizontal grid lines
      const r = (gy + 1) * nx;
      for (let gx = 0; gx <= cols + 1; gx++) {
        const k = r + gx + 1;
        const X = gx * S + d((cur[k + 1] - cur[k - 1]) * K) + o;
        const Y = gy * S + d((cur[k + nx] - cur[k - nx]) * K) + o;
        gx ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
    }
    for (let gx = 0; gx <= cols; gx += 2) {            // vertical grid lines
      for (let gy = 0; gy <= rows + 1; gy++) {
        const k = (gy + 1) * nx + gx + 1;
        const X = gx * S + d((cur[k + 1] - cur[k - 1]) * K) + o;
        const Y = gy * S + d((cur[k + nx] - cur[k - nx]) * K) + o;
        gy ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
    }
    ctx.stroke();
    // crests glint in blue where the lines cross
    ctx.fillStyle = sig;
    for (let gy = 0; gy <= rows; gy += 2) for (let gx = 0; gx <= cols; gx += 2) {
      const k = (gy + 1) * nx + gx + 1, h = cur[k];
      const a = ((h < 0 ? -h : h) - .16) * 2.2;
      if (a <= 0) continue;
      ctx.globalAlpha = a > .75 ? .75 : a;
      const X = gx * S + d((cur[k + 1] - cur[k - 1]) * K);
      const Y = gy * S + d((cur[k + nx] - cur[k - nx]) * K);
      ctx.fillRect(X - 1, Y - 1, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;
  };

  const loop = (t) => {
    if (lastT === null) lastT = t;
    acc = Math.min(acc + t - lastT, STEP * 3); lastT = t;
    while (acc >= STEP) { peak = step(); acc -= STEP; }
    if (peak < .004) quiet++; else quiet = 0;
    if (quiet > 20) {                                  // still again: park the loop
      running = false; cur.fill(0); prev.fill(0); draw();
      return;
    }
    draw(true);
    requestAnimationFrame(loop);
  };
  const wake = () => {
    quiet = 0;
    if (!running) { running = true; lastT = null; acc = 0; requestAnimationFrame(loop); }
  };

  colors(); resize();
  addEventListener('resize', resize);
  new MutationObserver(() => { colors(); if (!running) draw(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  return {
    // scroll: a ragged front rolls in from the edge you are scrolling towards
    roll (v, t) {
      const a = Math.min(Math.abs(v), 90) * .0022;
      const j = v > 0 ? ny - 2 - EDGE : EDGE + 1;
      for (let i = 1; i < nx - 1; i++) {
        const w = .5 + .5 * Math.sin(i * .19 + t * .0021) * Math.sin(i * .053 - t * .0013);
        cur[j * nx + i] += a * w * w;
      }
      wake();
    },
  };
})();

/* ============ section rules are strings ============
   Each heading's hairline is a 1-D string (exact at c = 1: a wave packet
   keeps its shape as it runs and reflects). Sweep the pointer across one
   and it's plucked where you crossed it, in the direction you crossed;
   scrolling it past a resting cursor plucks it too, and it's plucked once
   as its section scrolls in. */
const strings = (function initStrings () {
  if (reduced) return null;
  const N = 120, MID = 24, AMAX = 32, STEP = 1000 / 50;
  const all = [...document.querySelectorAll('.section h2 .secrule')].map(el => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${N - 1} ${MID * 2}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const base = document.createElementNS(NS, 'path');
    const hot = document.createElementNS(NS, 'path');
    base.setAttribute('class', 'str'); hot.setAttribute('class', 'str-hot');
    svg.append(base, hot);
    el.appendChild(svg); el.classList.add('is-string');
    const s = { el, base, hot, y: new Float32Array(N), p: new Float32Array(N), live: false };
    draw(s, 0);
    return s;
  });

  // smooth curve: each sample is a control point, the curve passes through midpoints
  function draw (s, e) {
    const Y = (i) => (MID + Math.max(-AMAX, Math.min(AMAX, s.y[i]))).toFixed(2);
    let d = 'M0 ' + Y(0);
    for (let i = 1; i < N - 1; i++) d += 'Q' + i + ' ' + Y(i) + ' ' + (i + .5) + ' ' + ((+Y(i) + +Y(i + 1)) / 2).toFixed(2);
    d += 'L' + (N - 1) + ' ' + Y(N - 1);
    s.base.setAttribute('d', d); s.hot.setAttribute('d', d);
    s.hot.style.opacity = Math.min(1, e / 6).toFixed(3);
  }

  let running = false, lastT = null, acc = 0;
  const loop = (t) => {
    if (lastT === null) lastT = t;
    acc = Math.min(acc + t - lastT, STEP * 3); lastT = t;
    const steps = Math.floor(acc / STEP);
    acc -= steps * STEP;
    let any = false;
    for (const s of all) {
      if (!s.live) continue;
      for (let n = 0; n < steps; n++) {
        const y = s.y, p = s.p;
        let m = 0;
        for (let i = 1; i < N - 1; i++) {
          const v = (y[i - 1] + y[i + 1] - p[i]) * .994;
          p[i] = v;
          if (v > m) m = v; else if (-v > m) m = -v;
        }
        s.y = p; s.p = y; s.peak = m;
      }
      if (s.peak < .25) { s.y.fill(0); s.p.fill(0); s.live = false; draw(s, 0); continue; }
      draw(s, s.peak);
      any = true;
    }
    if (any) requestAnimationFrame(loop); else running = false;
  };

  // a short wave packet (a few cycles under a bell), not a single bump
  const pluck = (s, f, a) => {
    a *= Math.max(.45, Math.min(1, s.el.clientWidth / 640));   // gentler on short rules
    const c = f * (N - 1), w = 9, k = .6;
    for (let i = 1; i < N - 1; i++) {
      const b = a * Math.exp(-(((i - c) / w) ** 2)) * Math.cos((i - c) * k);
      s.y[i] += b; s.p[i] += b;             // same shift in both = released from rest
    }
    s.live = true; s.peak = Math.max(s.peak || 0, Math.abs(a));
    if (!running) { running = true; lastT = null; acc = 0; requestAnimationFrame(loop); }
  };

  return {
    cross (x, y0, y1) {
      for (const s of all) {
        const r = s.el.getBoundingClientRect(), cy = r.top + r.height / 2;
        if (x < r.left || x > r.right || (y0 - cy) * (y1 - cy) >= 0) continue;
        const a = Math.max(24, Math.min(48, Math.abs(y1 - y0) * 1.5)) * Math.sign(y1 - y0);
        pluck(s, (x - r.left) / r.width, a);
      }
    },
    intro (h2) {
      const s = all.find(s => h2.contains(s.el));
      if (s) pluck(s, .1, -44);
    },
  };
})();

/* ============ one set of listeners feeds every wave on the page ============ */
const motion = new Set();   // running entrance animations — printing finishes them all
addEventListener('beforeprint', () => motion.forEach(a => a.finish()));

{
  let px = null, py = null;
  addEventListener('pointermove', (e) => {
    if (px !== null && strings) strings.cross(e.clientX, py, e.clientY);
    px = e.clientX; py = e.clientY;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { px = py = null; });

  let sy = scrollY;
  addEventListener('scroll', () => {
    const v = scrollY - sy; sy = scrollY;
    if (!v) return;
    field && field.roll(v, performance.now());
    waveHero.pump(Math.abs(v));
    // a rule scrolling past a resting cursor gets plucked too: relative to the
    // page, the cursor just moved by v
    if (px !== null && strings) strings.cross(px, py - v, py);
  }, { passive: true });
}

/* ============ reveal on scroll: things arrive like a damped oscillator ============
   Each block rises in, overshoots a hair, and settles. Blocks that enter
   together go one after another, so a screenful arrives as a wavefront.
   The animation only holds its first frame while waiting (fill: backwards),
   so once it's done nothing is left on the element — no stray stacking
   contexts to trap the hover cards. */
if (!reduced && 'IntersectionObserver' in window && Element.prototype.animate) {
  const RISE = [
    { opacity: 0, transform: 'translateY(26px)', easing: 'cubic-bezier(.2,.65,.3,1)' },
    { opacity: 1, transform: 'translateY(-4px)', offset: .55, easing: 'ease-in-out' },
    { transform: 'translateY(1.5px)', offset: .8, easing: 'ease-in-out' },
    { opacity: 1, transform: 'none' },
  ];
  const sel = '.hero h1, .hero .lede, .hero .portrait, .hero .wave, .section > h2, .section-intro,' +
              '.cv-head, .cv-block, .project, .wr, .project-slot, .port';
  const els = [...document.querySelectorAll(sel)];
  els.forEach(el => el.classList.add('rise'));

  let queue = [], pending = false;
  const flush = () => {
    pending = false;
    queue.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (ra.top - rb.top) || (ra.left - rb.left);
    });
    queue.forEach((el, i) => {
      const delay = Math.min(i, 8) * 85;
      el.classList.remove('rise');
      const a = el.animate(RISE, { duration: 950, delay, fill: 'backwards' });
      motion.add(a); a.onfinish = () => motion.delete(a);
      if (el.tagName === 'H2') setTimeout(() => strings && strings.intro(el), delay + 250);
    });
    queue = [];
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      queue.push(en.target);
    });
    if (queue.length && !pending) { pending = true; requestAnimationFrame(flush); }
  }, { rootMargin: '0px 0px -6% 0px' });
  els.forEach(el => io.observe(el));
  // printing (or anything else that needs the whole page) gets it all at once
  addEventListener('beforeprint', () => els.forEach(el => { el.classList.remove('rise'); io.unobserve(el); }));
}

/* ============ nav highlight while scrolling ============ */
const navLinks = [...document.querySelectorAll('.nav a')];
const sections = navLinks.map(a => document.querySelector(a.hash));
const spy = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    navLinks.forEach(a => a.classList.toggle('active', a.hash === '#' + en.target.id));
  });
}, { rootMargin: '-35% 0px -55% 0px' });
sections.forEach(s => s && spy.observe(s));

/* ============ CV folds open as a wave — see fold.js ============ */
const setFold = (d, open) => (window.hkkFold ? hkkFold.set(d, open) : (d.open = open));

/* ============ CV: expand / collapse all ============ */
const cvFolds = [...document.querySelectorAll('#cv details.cv-fold')];
const toggleAllBtn = document.getElementById('cvToggleAll');
const syncToggleLabel = () => {
  toggleAllBtn.textContent = cvFolds.some(d => !d.open) ? 'Expand all ▾' : 'Collapse all ▴';
};
toggleAllBtn.addEventListener('click', () => {
  const anyClosed = cvFolds.some(d => !d.open);
  cvFolds.forEach((d, i) => setTimeout(() => setFold(d, anyClosed), i * 70));
});
cvFolds.forEach(d => d.addEventListener('toggle', syncToggleLabel));
syncToggleLabel();

/* ============ hover cards: flip when they'd overflow the viewport ============
   Cards are opacity:0/pointer-events:none until hovered, but they still occupy
   layout space (their container deliberately has no overflow:hidden, so the
   card can visually escape it on desktop hover). On touch devices "hover"
   never fires, so an un-flipped card sitting past the viewport edge silently
   widens the page's scrollable area — the phone can be dragged sideways onto
   empty space even though nothing is visibly wrong. Fix: compute flip
   up front for every card (on load + resize), not just on mouseenter. */
const hcards = Array.from(document.querySelectorAll('.hcard-link')).map(link => ({
  link, card: link.querySelector('.hcard'),
})).filter(x => x.card);

function layoutHcards(){
  hcards.forEach(({ card }) => {
    card.classList.remove('flip');
    if (card.getBoundingClientRect().right > innerWidth - 10) card.classList.add('flip');
  });
}
layoutHcards();
addEventListener('resize', layoutHcards);
hcards.forEach(({ link, card }) => {
  link.addEventListener('mouseenter', () => {
    card.classList.remove('flip');
    if (card.getBoundingClientRect().right > innerWidth - 10) card.classList.add('flip');
  });
});

/* ============ print only the CV ============ */
const openDetailsForPrint = () => document.querySelectorAll('#cv details').forEach(d => d.open = true);
window.addEventListener('beforeprint', openDetailsForPrint);
document.getElementById('printBtn').addEventListener('click', () => {
  openDetailsForPrint();
  window.print();
});
