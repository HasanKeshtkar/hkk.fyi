// The secretary's unread notifications. The list lives in the database: it is re-read on every
// (re)connect, so nothing announced while the phone was away is lost; live ones are added as
// they arrive. The store lives for the whole visit (it survives moving between screens) and is
// cleared only when the user signs out.
import type { NotificationDto } from '../../shared/api';
import { api } from './api';
import { connection } from './connection';

class NotificationStore {
  private items: NotificationDto[] = [];
  private count = 0;
  private listeners = new Set<() => void>();
  private snapshot = { items: this.items, count: this.count };
  /** ids known to be read; a read is applied once, however many times it is reported */
  private read = new Set<string>();
  private loadSeq = 0;
  private latestLoad: Promise<boolean> = Promise.resolve(true);
  /** live notifications received while a re-read is in flight (its answer may predate them) */
  private arrivedDuringLoad: NotificationDto[] | null = null;
  /** a read was applied while a re-read was in flight (its answer may predate the read) */
  private readDuringLoad = false;
  /** live notifications not announced yet (none of the screens was mounted to announce them) */
  private unannounced: NotificationDto[] = [];
  private announcer: ((n: NotificationDto) => void) | null = null;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  get = () => this.snapshot;

  private emit() {
    this.snapshot = { items: this.items, count: this.count };
    this.listeners.forEach((l) => l());
  }

  /** The screen's way of announcing a new notification (sound, vibration, message); null when none is shown. */
  setAnnouncer(fn: ((n: NotificationDto) => void) | null): void {
    this.announcer = fn;
    if (fn) this.unannounced.splice(0).forEach((n) => fn(n));
  }

  /**
   * Re-reads the unread list; resolves true when this phone is in step with the server (if a
   * newer re-read supersedes this one, with that one's outcome).
   */
  load(): Promise<boolean> {
    const p = this.fetchList();
    this.latestLoad = p;
    return p;
  }

  private async fetchList(): Promise<boolean> {
    const seq = ++this.loadSeq;
    this.arrivedDuringLoad = [];
    this.readDuringLoad = false;
    const res = await api.notifications();
    if (seq !== this.loadSeq) return this.latestLoad; // a newer re-read (or sign-out) decides
    // A read applied meanwhile may not be in this answer, and the count also covers unread ones
    // beyond the listed 50, which cannot be matched up: read again rather than guess.
    if (res.ok && this.readDuringLoad) return this.load();
    const arrived = this.arrivedDuringLoad;
    this.arrivedDuringLoad = null;
    if (!res.ok) return false;
    const known = new Set(res.data.items.map((n) => n.id));
    const extra = arrived.filter((n) => !known.has(n.id) && !this.read.has(n.id));
    this.items = [...extra, ...res.data.items];
    this.count = res.data.count + extra.length;
    this.emit();
    return true;
  }

  /** Adds a live notification and has it announced; false if it was already known. */
  add(n: NotificationDto): boolean {
    if (this.read.has(n.id) || this.items.some((x) => x.id === n.id)) return false;
    this.arrivedDuringLoad?.push(n);
    this.items = [n, ...this.items];
    this.count += 1;
    this.emit();
    if (this.announcer) this.announcer(n);
    else this.unannounced.push(n);
    return true;
  }

  /** Read on this phone or on another one of the same user (each id counts once). */
  removeRead(ids: string[]): void {
    const fresh = [...new Set(ids)].filter((id) => !this.read.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => this.read.add(id));
    if (this.arrivedDuringLoad !== null) this.readDuringLoad = true;
    this.unannounced = this.unannounced.filter((n) => !this.read.has(n.id));
    // Count down only what is counted here: the listed ones, plus unread beyond the list.
    const before = this.items.length;
    const beyondList = Math.max(0, this.count - before);
    this.items = this.items.filter((x) => !this.read.has(x.id));
    const listed = before - this.items.length;
    this.count = Math.max(0, this.count - listed - Math.min(beyondList, fresh.length - listed));
    this.emit();
  }

  async markRead(ids: string[] | 'all'): Promise<void> {
    // 'all' is everything listed here, i.e. what she has seen: one that came in meanwhile and is
    // not listed yet stays unread (the server is sent ids, never "all").
    const asked = ids === 'all' ? this.items.map((n) => n.id) : ids;
    for (let i = 0; i < asked.length; i += 200) {
      const part = asked.slice(i, i + 200);
      const res = await api.markNotificationsRead({ ids: part });
      if (res.ok) this.removeRead([...part, ...res.data.ids]);
    }
  }

  /** Sign-out: forget everything (the next user starts empty). */
  clear(): void {
    this.loadSeq++;
    this.latestLoad = Promise.resolve(false); // a re-read cut short by sign-out brought nothing in step
    this.arrivedDuringLoad = null;
    this.readDuringLoad = false;
    this.read.clear();
    this.unannounced = [];
    this.items = [];
    this.count = 0;
    this.emit();
  }
}

export const notificationStore = new NotificationStore();

// Listen for the whole visit, not per screen: a change that arrives while moving between screens
// is still counted, and announced as soon as the next screen is up. Only the secretary is sent these.
connection.on('notification', (n) => void notificationStore.add(n));
connection.on('notifications:read', (e) => notificationStore.removeRead(e.ids));
