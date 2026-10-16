// "Install on the home screen": Chrome offers it through a beforeinstallprompt event, which must be
// caught early (it may fire before the settings screen is ever opened) and used from a tap.
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // shown from our own button instead of a browser banner
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

export const install = {
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** Chrome is ready to install the app right now. */
  available: (): boolean => deferred !== null,
  /** Already running as an installed app. */
  installed: (): boolean => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches,
  async prompt(): Promise<void> {
    const e = deferred;
    if (!e) return;
    deferred = null;
    emit();
    await e.prompt();
  },
};
