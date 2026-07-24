/* ============ theme toggle (paper ⇄ ink) ============ */
const themeBtn = document.getElementById('themeBtn');
themeBtn.addEventListener('click', () => {
  const ink = document.documentElement.classList.toggle('ink');
  try { localStorage.setItem('hkk-theme', ink ? 'ink' : 'paper'); } catch (e) {}
});

/* ============ standing wave in the hero ============
   V(z,t) = 2V0 sin(βz) sin(ωt) — a true standing wave on a
   shorted line: fixed nodes every λ/2, antinodes breathing.
   Mouse sculpts it: x picks the wavelength, y the amplitude. */
const waveSvg = document.getElementById('waveSvg');
(function initWave () {
  const W = 1000, H = 130, mid = H / 2, AMAX = mid - 14;
  waveSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, cls) => {
    const e = document.createElementNS(NS, tag);
    if (cls) e.setAttribute('class', cls);
    waveSvg.appendChild(e);
    return e;
  };

  const axis = el('line', 'wave-axis');
  axis.setAttribute('x1', 0); axis.setAttribute('x2', W);
  axis.setAttribute('y1', mid); axis.setAttribute('y2', mid);

  const envTop = el('path', 'wave-env');
  const envBot = el('path', 'wave-env');
  const nodesG = el('g');
  const wave = el('path', 'wave-line');

  const DEF = { halfWaves: 5, amp: 1 };
  const cur = { ...DEF }, tgt = { ...DEF };

  const pathFor = (fn) => {
    let d = '';
    for (let x = 0; x <= W; x += 8) d += (x ? 'L' : 'M') + x + ' ' + fn(x).toFixed(1);
    return d;
  };

  const render = (t) => {
    const k = Math.PI * cur.halfWaves / W;
    const A = AMAX * cur.amp;
    envTop.setAttribute('d', pathFor(x => mid + A * Math.sin(k * x)));
    envBot.setAttribute('d', pathFor(x => mid - A * Math.sin(k * x)));
    wave.setAttribute('d', pathFor(x => mid + A * Math.sin(t) * Math.sin(k * x)));
    // node dots wherever sin(kx) = 0 — every λ/2 from the short at x = 0
    const need = Math.floor(cur.halfWaves) + 1;
    while (nodesG.childNodes.length < need) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'wave-node');
      c.setAttribute('r', 3); c.setAttribute('cy', mid);
      nodesG.appendChild(c);
    }
    while (nodesG.childNodes.length > need) nodesG.removeChild(nodesG.lastChild);
    for (let n = 0; n < need; n++) {
      nodesG.childNodes[n].setAttribute('cx', (n * W / cur.halfWaves).toFixed(1));
    }
  };

  /* Mouse sculpting is user-driven, so it always works; only the ambient
     breathing is paused for prefers-reduced-motion (and resumes on hover). */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let hovering = false;

  waveSvg.addEventListener('pointerenter', () => { hovering = true; });
  waveSvg.addEventListener('pointermove', (e) => {
    hovering = true;
    const r = waveSvg.getBoundingClientRect();
    const fx = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    const fy = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    tgt.halfWaves = 2 + fx * 6;                    // 2 … 8 half-waves
    tgt.amp = .15 + Math.abs(fy - .5) * 1.7;       // flat near the axis, tall at the edges
  });
  waveSvg.addEventListener('pointerleave', () => {
    hovering = false;
    tgt.halfWaves = DEF.halfWaves; tgt.amp = DEF.amp;
  });

  let rafId = null, last = null, phase = Math.PI / 2;
  const frame = (ts) => {
    if (last !== null && (!reduced || hovering)) phase += (ts - last) / 480;
    last = ts;
    cur.halfWaves += (tgt.halfWaves - cur.halfWaves) * .08;
    cur.amp += (tgt.amp - cur.amp) * .08;
    render(phase);
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
})();

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

/* ============ instrument launcher (fullscreen dialog) ============ */
const launcher = document.getElementById('launcher');
const frame    = document.getElementById('launcherFrame');
const lTitle   = document.getElementById('launcherTitle');
const lExt     = document.getElementById('launcherExt');

document.querySelectorAll('[data-launch]').forEach(btn => {
  btn.addEventListener('click', () => {
    const src = btn.dataset.launch;
    if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
    lTitle.textContent = (btn.dataset.title || 'INSTRUMENT').toUpperCase() + ' · LIVE';
    lExt.href = src;
    launcher.showModal();
    document.body.style.overflow = 'hidden';
  });
});
document.getElementById('launcherClose').addEventListener('click', () => launcher.close());
launcher.addEventListener('close', () => { document.body.style.overflow = ''; });
launcher.addEventListener('click', (e) => {      // click on the backdrop closes
  if (e.target === launcher) launcher.close();
});

/* ============ CV: expand / collapse all ============ */
const cvFolds = [...document.querySelectorAll('#cv details.cv-fold')];
const toggleAllBtn = document.getElementById('cvToggleAll');
const syncToggleLabel = () => {
  toggleAllBtn.textContent = cvFolds.some(d => !d.open) ? 'Expand all ▾' : 'Collapse all ▴';
};
toggleAllBtn.addEventListener('click', () => {
  const anyClosed = cvFolds.some(d => !d.open);
  cvFolds.forEach(d => d.open = anyClosed);
  syncToggleLabel();
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
