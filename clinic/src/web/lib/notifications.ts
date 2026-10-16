// The secretary's unread notifications. The list lives in the database: it is re-read on every
// (re)connect, so nothing announced while the phone was away is lost; live ones are added as
// they arrive.
import type { NotificationDto } from '../../shared/api';
import { api } from './api';

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

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  get = () => this.snapshot;

  private emit() {
    this.snapshot = { items: this.items, count: this.count };
    this.listeners.forEach((l) => l());
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
    const res = await api.notifications();
    if (seq !== this.loadSeq) return this.latestLoad; // a newer re-read decides
    const arrived = this.arrivedDuringLoad;
    this.arrivedDuringLoad = null;
    if (!res.ok) return false;
    const known = new Set(res.data.items.map((n) => n.id));
    const extra = arrived.filter((n) => !known.has(n.id) && !this.read.has(n.id));
    const items = res.data.items.filter((n) => !this.read.has(n.id));
    this.items = [...extra, ...items];
    this.count = Math.max(0, res.data.count + extra.length - (res.data.items.length - items.length));
    this.emit();
    return true;
  }

  /** Adds a live notification; false if it was already known. */
  add(n: NotificationDto): boolean {
    if (this.read.has(n.id) || this.items.some((x) => x.id === n.id)) return false;
    this.arrivedDuringLoad?.push(n);
    this.items = [n, ...this.items];
    this.count += 1;
    this.emit();
    return true;
  }

  /** Read on this phone or on another one of the same user (each id counts once). */
  removeRead(ids: string[]): void {
    const fresh = [...new Set(ids)].filter((id) => !this.read.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => this.read.add(id));
    this.items = this.items.filter((x) => !this.read.has(x.id));
    this.count = Math.max(0, this.count - fresh.length);
    this.emit();
  }

  async markRead(ids: string[] | 'all'): Promise<void> {
    // Everything listed now is read once the server answers (by this request, or already by
    // another phone); one that arrives after the server's update stays unread.
    const asked = ids === 'all' ? this.items.map((n) => n.id) : ids;
    const res = await api.markNotificationsRead(ids === 'all' ? { all: true } : { ids });
    if (res.ok) this.removeRead([...asked, ...res.data.ids]);
  }

  clear(): void {
    this.loadSeq++;
    this.arrivedDuringLoad = null;
    this.read.clear();
    this.items = [];
    this.count = 0;
    this.emit();
  }
}

export const notificationStore = new NotificationStore();
