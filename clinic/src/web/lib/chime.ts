// A short two-note chime made with Web Audio (no sound file, nothing to download), plus vibration.
// Browsers allow audio only after the user has interacted with the page. On a touch screen that
// permission comes with the end of a tap (pointerup/touchend/click), not with pointerdown, so
// sound is unlocked on those, and every tap tries again until it actually runs.

let ctx: AudioContext | null = null;
let hooked = false;
/** A chime asked for while sound was still locked plays only if unlocking follows at once. */
const LATE_CHIME_MS = 1_500;
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;

function context(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  return ctx;
}

/** Call once at startup: taps unlock sound for the rest of the visit. */
export function unlockSoundOnFirstTouch(): void {
  if (hooked || typeof window === 'undefined') return;
  hooked = true;
  const unlock = () => {
    const c = context();
    if (!c) return stop();
    if (c.state === 'running') return stop();
    void c.resume().then(() => {
      if (c.state === 'running') stop();
    }, () => {});
  };
  const stop = () => UNLOCK_EVENTS.forEach((e) => window.removeEventListener(e, unlock, true));
  UNLOCK_EVENTS.forEach((e) => window.addEventListener(e, unlock, true));
}

function play(c: AudioContext): void {
  const now = c.currentTime;
  [880, 1318.5].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = now + i * 0.18;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}

export function chime(): void {
  const c = context();
  if (c?.state === 'running') {
    play(c);
  } else if (c) {
    // Suspended (e.g. the phone woke the page, or the unlock tap came before activation): ask
    // again; a page the user has interacted with is allowed to resume.
    const asked = performance.now();
    void c.resume().then(() => {
      if (c.state === 'running' && performance.now() - asked < LATE_CHIME_MS) play(c);
    }, () => {});
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([200, 100, 200]);
}
