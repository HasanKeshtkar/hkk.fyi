import { instantAt, minutesOf, SLOT_MINUTES, SLOT_MS, weekdayOf, type IsoDate, type WallTime } from './time.js';

export interface WeeklyDay {
  weekday: number;
  isOpen: boolean;
  startTime: WallTime;
  endTime: WallTime;
}

export interface DateOverride {
  date: IsoDate;
  isOpen: boolean;
  startTime: WallTime | null;
  endTime: WallTime | null;
  note: string | null;
}

/** Stored rows as the API returns them: `version` must be sent back with an edit. */
export interface WeeklyDayRecord extends WeeklyDay {
  version: number;
  updatedBy: string | null;
  updatedAt: string;
}

export interface DateOverrideRecord extends DateOverride {
  version: number;
  updatedBy: string | null;
  updatedAt: string;
}

/** The working hours that actually apply on one date. */
export interface DaySchedule {
  date: IsoDate;
  weekday: number;
  isOpen: boolean;
  /** null when closed */
  startTime: WallTime | null;
  endTime: WallTime | null;
  source: 'weekly' | 'override';
  note: string | null;
}

/** A per-date override wins over the weekly hours. A weekday with no row counts as closed. */
export function resolveDaySchedule(date: IsoDate, weekly: readonly WeeklyDay[], override: DateOverride | null): DaySchedule {
  const weekday = weekdayOf(date);
  if (override) {
    return {
      date,
      weekday,
      isOpen: override.isOpen,
      startTime: override.isOpen ? override.startTime : null,
      endTime: override.isOpen ? override.endTime : null,
      source: 'override',
      note: override.note,
    };
  }
  const w = weekly.find((d) => d.weekday === weekday);
  const isOpen = w?.isOpen ?? false;
  return {
    date,
    weekday,
    isOpen,
    startTime: isOpen ? w!.startTime : null,
    endTime: isOpen ? w!.endTime : null,
    source: 'weekly',
    note: null,
  };
}

/** Start instants of every bookable 30-minute slot on the day (the last one ends at closing time). */
export function slotStarts(day: DaySchedule): Date[] {
  if (!day.isOpen || !day.startTime || !day.endTime) return [];
  const out: Date[] = [];
  const first = instantAt(day.date, day.startTime).getTime();
  const count = (minutesOf(day.endTime) - minutesOf(day.startTime)) / SLOT_MINUTES;
  for (let i = 0; i < count; i++) out.push(new Date(first + i * SLOT_MS));
  return out;
}

export type HoursRejection = 'day_closed' | 'outside_hours';

/**
 * Why `startAt` cannot be booked under `day`'s hours, or null if it can.
 * `day` must be the schedule of the clinic-zone date that `startAt` falls on.
 */
export function checkSlotAgainstHours(startAt: Date, day: DaySchedule): HoursRejection | null {
  if (!day.isOpen || !day.startTime || !day.endTime) return 'day_closed';
  const open = instantAt(day.date, day.startTime).getTime();
  const close = instantAt(day.date, day.endTime).getTime();
  const t = startAt.getTime();
  return t >= open && t + SLOT_MS <= close ? null : 'outside_hours';
}
