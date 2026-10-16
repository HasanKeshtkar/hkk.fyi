// The connection shown at the top of every screen, and the realtime channel behind it (a plain
// WebSocket to /api/live).
//
// Status rules:
//   - 'online' only while the socket is open AND every screen has re-read its data from the
//     server since that connection was made (so nothing changed while away is still on screen);
//   - 'connecting' while (re)connecting or re-reading; 'offline' when the phone has no network.
// Writes are allowed only while 'online'. There is no offline queue.
import type { ServerEvents } from '../../shared/api';

export type ConnectionStatus = 'online' | 'connecting' | 'offline';

type EventName = keyof ServerEvents;
type Payload<E extends EventName> = Parameters<ServerEvents[E]>[0];
/** Re-reads one screen's data; resolves false if that failed. */
type Resync = () => Promise<boolean> | boolean | void;

const RESYNC_RETRY_MS = 3_000;
/** Forced re-checks after a failed request are at most this frequent. */
const FORCED_RECHECK_MIN_MS = 5_000;
/** Reconnect delays after a drop: quick at first, then every 5 s. */
const RECONNECT_DELAYS_MS = [1_000, 2_000, 3_000, 5_000];
/** A keep-alive every 10 s; no answer within 5 s means the connection is dead. */
const PING_EVERY_MS = 10_000;
const PONG_WITHIN_MS = 5_000;
/** The server's close codes: no valid session (go to login), foreign page. */
const CLOSE_UNAUTHORIZED = 4401;

class Connection {
  private status: ConnectionStatus = 'connecting';
  private listeners = new Set<() => void>();
  private ws: WebSocket | null = null;
  /** Bumped for every new socket: events of an older socket are ignored. */
  private generation = 0;
  private started = false;
  private attempt = 0;
  private resyncs = new Set<Resync>();
  private handlers = new Map<string, Set<(p: never) => void>>();
  private resyncRun = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private recheckTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private onUnauthorized: (() => void) | null = null;
  private windowHooked = false;
  private lastForcedRecheck = 0;

  get(): ConnectionStatus {
    return this.status;
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private set(next: ConnectionStatus) {
    if (next === this.status) return;
    this.status = next;
    this.listeners.forEach((l) => l());
  }

  /** Registers a screen's re-read, run on every (re)connect before the status turns 'online'. */
  onResync(fn: Resync): () => void {
    this.resyncs.add(fn);
    return () => this.resyncs.delete(fn);
  }

  /** Listens to a realtime event from the server. */
  on<E extends EventName>(event: E, fn: (payload: Payload<E>) => void): () => void {
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    set.add(fn as (p: never) => void);
    return () => set.delete(fn as (p: never) => void);
  }

  /** Opens the realtime channel (once signed in). */
  start(onUnauthorized: () => void): void {
    this.onUnauthorized = onUnauthorized;
    this.started = true;
    this.hookWindow();
    if (!this.ws) this.open();
  }

  /** Closes the channel (logout, or the session was rejected); a later start() opens a new one. */
  stop(): void {
    this.started = false;
    this.resyncRun++;
    for (const t of [this.retryTimer, this.reconnectTimer, this.recheckTimer]) if (t) clearTimeout(t);
    this.retryTimer = this.reconnectTimer = this.recheckTimer = null;
    this.closeSocket();
    this.set('connecting');
  }

  /** An API call failed for lack of a connection: writes stop until the channel is confirmed. */
  reportNetworkFailure(): void {
    if (this.status === 'online') this.set(this.networkDown() ? 'offline' : 'connecting');
    this.scheduleRecheck();
  }

  reportReachable(): void {
    // The socket, not individual requests, decides when we are back online.
  }

  private isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private open(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const generation = ++this.generation;
    this.set(this.networkDown() ? 'offline' : 'connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/live`);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      if (generation !== this.generation) return;
      this.attempt = 0;
      this.startPing();
      void this.resync();
    };
    ws.onmessage = (e: MessageEvent) => {
      if (generation !== this.generation || typeof e.data !== 'string') return;
      if (e.data === 'pong') {
        if (this.pongTimer) clearTimeout(this.pongTimer);
        this.pongTimer = null;
        return;
      }
      let msg: { type?: unknown; data?: unknown };
      try {
        msg = JSON.parse(e.data) as typeof msg;
      } catch {
        return;
      }
      // A backup was restored: everything on screen may have changed.
      if (msg.type === 'restored') return void this.resync();
      if (typeof msg.type === 'string') this.handlers.get(msg.type)?.forEach((h) => h(msg.data as never));
    };
    ws.onclose = (e: CloseEvent) => {
      if (generation !== this.generation) return;
      this.ws = null;
      this.stopPing();
      this.resyncRun++;
      this.set(this.networkDown() ? 'offline' : 'connecting');
      if (e.code === CLOSE_UNAUTHORIZED) {
        // The session is gone (logged out elsewhere, password changed, expired): sign in again.
        this.onUnauthorized?.();
        return;
      }
      if (this.started) this.scheduleReconnect();
    };
    ws.onerror = () => {
      // A close event follows.
    };
  }

  private closeSocket(): void {
    this.generation++;
    this.stopPing();
    const ws = this.ws;
    this.ws = null;
    try {
      ws?.close(1000);
    } catch {
      // already closed
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.started) return;
    const delay = RECONNECT_DELAYS_MS[Math.min(this.attempt, RECONNECT_DELAYS_MS.length - 1)]!;
    this.attempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.started) this.open();
    }, delay);
  }

  /** Drops the current socket (if any) and connects again at once. */
  private reconnectNow(): void {
    if (!this.started) return;
    this.closeSocket();
    this.attempt = 0;
    this.open();
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => this.ping(), PING_EVERY_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.pongTimer) clearTimeout(this.pongTimer);
    this.pingTimer = this.pongTimer = null;
  }

  /** Asks the server for a 'pong'; without one soon, the connection is dead: reconnect. */
  private ping(): void {
    if (!this.isOpen() || this.pongTimer) return;
    try {
      this.ws!.send('ping');
    } catch {
      return this.reconnectNow();
    }
    this.pongTimer = setTimeout(() => {
      this.pongTimer = null;
      this.reconnectNow();
    }, PONG_WITHIN_MS);
  }

  /**
   * A fetch failed while the socket still looked fine: reconnect it, which re-reads everything
   * and turns the status back to 'online'. At most once per FORCED_RECHECK_MIN_MS; a later one
   * is postponed, never dropped (nothing else would lift the status while the socket stays up).
   */
  private scheduleRecheck(): void {
    if (!this.isOpen() || this.recheckTimer) return;
    const run = () => {
      this.recheckTimer = null;
      // Not needed if the socket dropped (it reconnects and re-reads by itself) or is back online.
      if (!this.isOpen() || this.status === 'online') return;
      this.lastForcedRecheck = Date.now();
      this.reconnectNow();
    };
    const wait = this.lastForcedRecheck + FORCED_RECHECK_MIN_MS - Date.now();
    if (wait <= 0) run();
    else this.recheckTimer = setTimeout(run, wait);
  }

  /** Re-reads everything on screen, then declares the connection usable. */
  private async resync(): Promise<void> {
    const run = ++this.resyncRun;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.set('connecting');
    const results = await Promise.all(
      [...this.resyncs].map(async (fn) => {
        try {
          return (await fn()) !== false;
        } catch {
          return false; // a screen that failed to re-read is retried like any other failure
        }
      }),
    );
    if (run !== this.resyncRun || !this.isOpen()) return; // superseded or dropped meanwhile
    if (results.every(Boolean)) {
      this.set('online');
    } else {
      this.retryTimer = setTimeout(() => {
        if (this.isOpen()) void this.resync();
      }, RESYNC_RETRY_MS);
    }
  }

  private networkDown(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }

  private hookWindow() {
    if (this.windowHooked || typeof window === 'undefined') return;
    this.windowHooked = true;
    window.addEventListener('offline', () => this.set('offline'));
    window.addEventListener('online', () => {
      if (!this.started) return;
      // The socket may have survived the outage or not: either way, re-read before going online.
      if (this.isOpen()) {
        this.ping();
        void this.resync();
      } else this.reconnectNow();
    });
    // Back in the foreground: Android may have frozen the socket while the app was in the
    // background. Check it, and re-read everything either way (the screens listen to this too).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !this.started) return;
      if (this.isOpen()) {
        this.ping();
        void this.resync();
      } else this.reconnectNow();
    });
  }
}

export const connection = new Connection();
