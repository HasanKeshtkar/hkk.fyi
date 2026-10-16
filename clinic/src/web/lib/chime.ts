// A short two-note chime made with Web Audio (no sound file, nothing to download), plus vibration.
// Browsers only allow audio after the user has touched the page once; the first touch unlocks it.

let ctx: AudioContext | null = null;
let hooked = false;

function context(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  return ctx;
}

/** Call once at startup: the first tap anywhere unlocks sound for the rest of the visit. */
export function unlockSoundOnFirstTouch(): void {
  if (hooked || typeof window === 'undefined') return;
  hooked = true;
  const unlock = () => {
    void context()?.resume();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export function chime(): void {
  const c = context();
  if (c && c.state === 'running') {
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
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([200, 100, 200]);
}
