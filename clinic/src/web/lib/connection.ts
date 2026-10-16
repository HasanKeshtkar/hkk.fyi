// The connection shown at the top of every screen, and the realtime channel behind it.
//
// Status rules:
//   - 'online' only while the socket is connected AND every screen has re-read its data from the
//     server since that connection was made (so nothing changed while away is still on screen);
//   - 'connecting' while (re)connecting or re-reading; 'offline' when the phone has no network.
// Writes are allowed only while 'online'. There is no offline queue.
import { io, type Socket } from 'socket.io-client';
import type { ServerEvents } from '../../shared/api';

export type ConnectionStatus = 'online' | 'connecting' | 'offline';

type EventName = keyof ServerEvents;
type Payload<E extends EventName> = Parameters<ServerEvents[E]>[0];
/** Re-reads one screen's data; resolves false if that failed. */
type Resync = () => Promise<boolean> | boolean | void;

const EVENTS: EventName[] = ['appointment', 'schedule', 'notification', 'notifications:read'];
const RESYNC_RETRY_MS = 3_000;

class Connection {
  private status: ConnectionStatus = 'connecting';
  private listeners = new Set<() => void>();
  private socket: Socket | null = null;
  private resyncs = new Set<Resync>();
  private handlers = new Map<EventName, Set<(p: never) => void>>();
  private resyncRun = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private onUnauthorized: (() => void) | null = null;
  private windowHooked = false;

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
    if (this.socket) {
      if (!this.socket.connected) this.socket.connect();
      return;
    }
    this.hookWindow();
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
      timeout: 10_000,
    });
    this.socket = socket;
    for (const event of EVENTS) {
      socket.on(event as string, (payload: unknown) => this.handlers.get(event)?.forEach((h) => h(payload as never)));
    }
    socket.on('connect', () => void this.resync());
    socket.on('disconnect', (reason) => {
      this.resyncRun++;
      this.set(this.networkDown() ? 'offline' : 'connecting');
      // The server closed it (e.g. this session was logged out): try once more; an invalid
      // session then fails the handshake and sends the user to the login screen.
      if (reason === 'io server disconnect') setTimeout(() => socket.connect(), 1_000);
    });
    socket.on('connect_error', (err) => {
      this.set(this.networkDown() ? 'offline' : 'connecting');
      if (err.message === 'unauthorized') {
        socket.disconnect();
        this.onUnauthorized?.();
      }
    });
  }

  /** Closes the channel (logout). */
  stop(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.set('connecting');
  }

  /** An API call failed for lack of a connection: writes stop until the channel is confirmed. */
  reportNetworkFailure(): void {
    if (this.status === 'online') this.set(this.networkDown() ? 'offline' : 'connecting');
    // A fetch failed while the socket still looked fine: re-check it right away.
    if (this.socket?.connected) {
      this.socket.disconnect().connect();
    }
  }

  reportReachable(): void {
    // The socket, not individual requests, decides when we are back online.
  }

  /** Re-reads everything on screen, then declares the connection usable. */
  private async resync(): Promise<void> {
    const run = ++this.resyncRun;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.set('connecting');
    const results = await Promise.all([...this.resyncs].map(async (fn) => (await fn()) !== false));
    if (run !== this.resyncRun || !this.socket?.connected) return; // superseded or dropped meanwhile
    if (results.every(Boolean)) {
      this.set('online');
    } else {
      this.retryTimer = setTimeout(() => {
        if (this.socket?.connected) void this.resync();
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
      if (!this.socket) return;
      // The socket may have survived the outage or not: either way, re-read before going online.
      if (this.socket.connected) void this.resync();
      else {
        this.set('connecting');
        this.socket.connect();
      }
    });
    // Back in the foreground: Android may have frozen the socket while the app was in the
    // background. Re-read everything either way (the screens listen to this too).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !this.socket) return;
      if (this.socket.connected) void this.resync();
      else this.socket.connect();
    });
  }
}

export const connection = new Connection();
