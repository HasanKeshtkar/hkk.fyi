// Sound unlocking under the browser's rule for touch screens (HTML spec, as Android Chrome does
// it): a tap grants permission on pointerup/touchend, not on pointerdown; once granted, the page
// may start or resume audio for the rest of the visit.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let sticky = false; // the page has been interacted with
let listeners: Map<string, Set<() => void>>;
let notes = 0;
let contexts: FakeAudioContext[] = [];

/** How resume() behaves; a test may replace it. */
let resume: (ctx: FakeAudioContext) => Promise<void>;
/** Without permission the promise stays pending (as in Chromium); with it, audio starts. */
const browserResume = (ctx: FakeAudioContext): Promise<void> => {
  if (!sticky) return new Promise(() => {});
  ctx.state = 'running';
  return Promise.resolve();
};

class FakeAudioContext {
  state: 'suspended' | 'running' = 'suspended';
  currentTime = 0;
  destination = {};
  constructor() {
    contexts.push(this);
  }
  resume(): Promise<void> {
    return resume(this);
  }
  createOscillator() {
    return { type: '', frequency: { value: 0 }, connect: (n: unknown) => n, start: () => void notes++, stop: () => {} };
  }
  createGain() {
    const gain = { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} };
    return { gain, connect: (n: unknown) => n };
  }
}

function fire(type: string) {
  if (type === 'pointerup' || type === 'touchend' || type === 'click' || type === 'keydown') sticky = true;
  [...(listeners.get(type) ?? [])].forEach((l) => l());
}

async function freshChime() {
  vi.resetModules();
  return import('../../src/web/lib/chime');
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  resume = browserResume;
  sticky = false;
  notes = 0;
  contexts = [];
  listeners = new Map();
  vi.stubGlobal('window', {
    AudioContext: FakeAudioContext,
    addEventListener: (t: string, l: () => void) => {
      if (!listeners.has(t)) listeners.set(t, new Set());
      listeners.get(t)!.add(l);
    },
    removeEventListener: (t: string, l: () => void) => listeners.get(t)?.delete(l),
  });
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('navigator', { vibrate: () => true });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chime', () => {
  it('a plain tap (pointerdown, then pointerup) unlocks sound for later chimes', async () => {
    const { unlockSoundOnFirstTouch, chime } = await freshChime();
    unlockSoundOnFirstTouch();
    fire('pointerdown'); // no permission yet
    fire('pointerup');
    fire('touchend');
    fire('click');
    await flush();
    expect(contexts[0]!.state).toBe('running');
    chime();
    expect(notes).toBe(2);
  });

  it('stops listening only once sound actually runs', async () => {
    const { unlockSoundOnFirstTouch } = await freshChime();
    unlockSoundOnFirstTouch();
    fire('pointerdown');
    await flush();
    expect(listeners.get('pointerup')?.size).toBe(1);
    fire('pointerup');
    await flush();
    expect([...listeners.values()].every((s) => s.size === 0)).toBe(true);
  });

  it('a chime while sound is suspended asks to resume and plays if the page was interacted with', async () => {
    const { chime } = await freshChime();
    sticky = true; // e.g. Android suspended audio while the app was in the background
    chime();
    await flush();
    expect(notes).toBe(2);
  });

  it('without any interaction there is no sound (vibration only)', async () => {
    const { chime } = await freshChime();
    chime(); // no permission: the request stays pending
    await flush();
    expect(notes).toBe(0);
  });

  it('never plays a chime late, long after it was due', async () => {
    const { chime } = await freshChime();
    let clock = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    let allow!: () => void;
    resume = (ctx) =>
      new Promise<void>((r) => {
        allow = () => {
          ctx.state = 'running';
          r();
        };
      });
    chime();
    clock = 5_000; // permission only came much later
    allow();
    await flush();
    expect(notes).toBe(0);
    vi.restoreAllMocks();
  });
});
