// Client copy of one day's appointments. The server is the source of truth; this store only
// keeps the screen in step with it, from three sources:
//   1. a full snapshot (GET /api/day) on open, date change, reconnect and return to foreground;
//   2. the result of the user's own writes, including the fresh row a 409 conflict returns;
//   3. (phase 4) realtime change events.
//
// Rules that keep it correct when these interleave:
//   - Every appointment carries a version. A change is applied only if it is not older than
//     the newest version already seen for that appointment, so a late or duplicated message
//     can never roll the screen back or bring back an appointment that was moved or cancelled.
//   - Changes that arrive while a snapshot request is in flight are buffered and replayed on
//     top of the snapshot, so a change committed after the snapshot was read is not lost.
//   - A response for a superseded request (the user changed day meanwhile) is dropped.
import type { AppointmentDto, DayAppointmentDto, DayResponse } from '../../shared/api';
import { checkSlotAgainstHours } from '../../shared/schedule';
import { clinicDateOf } from '../../shared/time';
import type { ApiResult } from './api';

export interface DayView {
  date: string;
  /** the last good snapshot with changes applied; null until the first load of this date */
  data: DayResponse | null;
  loading: boolean;
  /** why the last load failed, if it did; `data` keeps the previous good copy */
  error: 'network' | 'server' | null;
}

type FetchDay = (date: string) => Promise<ApiResult<DayResponse>>;

export class DayStore {
  private view: DayView;
  private listeners = new Set<() => void>();
  private seq = 0;
  private inflight: { seq: number; buffer: AppointmentDto[] } | null = null;
  /** newest version seen per appointment id, from any source */
  private seen = new Map<string, number>();

  constructor(
    private readonly fetchDay: FetchDay,
    date: string,
  ) {
    this.view = { date, data: null, loading: false, error: null };
  }

  getView = (): DayView => this.view;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private set(patch: Partial<DayView>) {
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** Shows another date (or reloads the current one when `date` is unchanged and data is missing). */
  setDate(date: string): Promise<void> {
    if (date === this.view.date && this.view.data) return Promise.resolve();
    this.set({ date, data: date === this.view.date ? this.view.data : null, error: null });
    return this.refresh();
  }

  /** Re-reads the whole day from the server. */
  async refresh(): Promise<void> {
    const seq = ++this.seq;
    const date = this.view.date;
    this.inflight = { seq, buffer: [] };
    this.set({ loading: true });
    const res = await this.fetchDay(date);
    if (seq !== this.seq) return; // superseded by a newer request
    const buffer = this.inflight?.buffer ?? [];
    this.inflight = null;
    if (!res.ok) {
      this.set({ loading: false, error: res.kind === 'network' ? 'network' : 'server' });
      return;
    }
    let data = res.data;
    for (const a of data.appointments) this.noteSeen(a);
    for (const a of buffer) data = this.merge(data, a);
    this.set({ data, loading: false, error: null });
  }

  /** Applies a newer state of one appointment (write result, conflict payload, or realtime event). */
  applyAppointment(a: AppointmentDto): void {
    if (a.version < (this.seen.get(a.id) ?? 0)) return;
    this.noteSeen(a);
    if (this.inflight) this.inflight.buffer.push(a);
    const data = this.view.data;
    if (!data) return;
    const next = this.merge(data, a);
    if (next !== data) this.set({ data: next });
  }

  private noteSeen(a: { id: string; version: number }) {
    if (a.version > (this.seen.get(a.id) ?? 0)) this.seen.set(a.id, a.version);
  }

  private merge(day: DayResponse, a: AppointmentDto): DayResponse {
    if (a.version < (this.seen.get(a.id) ?? 0)) return day;
    const existing = day.appointments.find((x) => x.id === a.id);
    if (existing && existing.version >= a.version) return day;
    const belongsHere = a.status !== 'cancelled' && clinicDateOf(new Date(a.startAt)) === day.date;
    const startMs = new Date(a.startAt).getTime();
    // The server allows one live appointment per slot: anything else we still show there is stale.
    const others = day.appointments.filter(
      (x) => x.id !== a.id && !(belongsHere && new Date(x.startAt).getTime() === startMs),
    );
    if (!belongsHere) return existing ? { ...day, appointments: others } : day;
    const placed: DayAppointmentDto = {
      ...a,
      withinHours: checkSlotAgainstHours(new Date(a.startAt), day.schedule) === null,
    };
    const appointments = [...others, placed].sort((x, y) => x.startAt.localeCompare(y.startAt));
    return { ...day, appointments };
  }
}
