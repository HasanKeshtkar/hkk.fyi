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

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  get = () => this.snapshot;

  private emit() {
    this.snapshot = { items: this.items, count: this.count };
    this.listeners.forEach((l) => l());
  }

  async load(): Promise<boolean> {
    const res = await api.notifications();
    if (!res.ok) return false;
    this.items = res.data.items;
    this.count = res.data.count;
    this.emit();
    return true;
  }

  /** Adds a live notification; false if it was already known. */
  add(n: NotificationDto): boolean {
    if (this.items.some((x) => x.id === n.id)) return false;
    this.items = [n, ...this.items];
    this.count += 1;
    this.emit();
    return true;
  }

  /** Read on this phone or on another one of the same user. */
  removeRead(ids: string[]): void {
    const before = this.items.length;
    this.items = this.items.filter((x) => !ids.includes(x.id));
    this.count = Math.max(0, this.count - Math.max(ids.length, before - this.items.length));
    this.emit();
  }

  async markRead(ids: string[] | 'all'): Promise<void> {
    const res = await api.markNotificationsRead(ids === 'all' ? { all: true } : { ids });
    if (!res.ok) return;
    if (ids === 'all') {
      this.items = [];
      this.count = 0;
      this.emit();
    } else {
      this.removeRead(res.data.ids);
    }
  }

  clear(): void {
    this.items = [];
    this.count = 0;
    this.emit();
  }
}

export const notificationStore = new NotificationStore();
