// Connection state shown at the top of every screen. Writes are allowed only while 'online'.
//
// Until the realtime channel exists (phase 4) the signal is: the browser's online/offline events,
// the outcome of every API call, and a light heartbeat to /healthz.

export type ConnectionStatus = 'online' | 'connecting' | 'offline';

type Listener = () => void;

const HEARTBEAT_MS = 20_000;
const RETRY_MS = 3_000;

class Connection {
  private status: ConnectionStatus = 'connecting';
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private started = false;
  /** called whenever the connection comes back, so screens can re-read their data */
  private reconnectHandlers = new Set<() => void>();

  get(): ConnectionStatus {
    return this.status;
  }

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  onReconnect(fn: () => void): () => void {
    this.reconnectHandlers.add(fn);
    return () => this.reconnectHandlers.delete(fn);
  }

  private set(next: ConnectionStatus) {
    if (next === this.status) return;
    const wasDown = this.status !== 'online';
    this.status = next;
    this.listeners.forEach((l) => l());
    if (next === 'online' && wasDown) this.reconnectHandlers.forEach((h) => h());
  }

  reportReachable(): void {
    this.set('online');
    this.schedule(HEARTBEAT_MS);
  }

  reportNetworkFailure(): void {
    this.set(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'connecting');
    this.schedule(RETRY_MS);
  }

  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    window.addEventListener('online', () => {
      this.set('connecting');
      void this.probe();
    });
    window.addEventListener('offline', () => this.set('offline'));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.probe();
    });
    void this.probe();
  }

  private schedule(ms: number) {
    if (!this.started) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.probe(), ms);
  }

  private async probe(): Promise<void> {
    if (document.visibilityState !== 'visible') {
      this.schedule(HEARTBEAT_MS);
      return;
    }
    try {
      const res = await fetch('/healthz', { cache: 'no-store' });
      if (res.ok) this.reportReachable();
      else this.reportNetworkFailure();
    } catch {
      this.reportNetworkFailure();
    }
  }
}

export const connection = new Connection();
