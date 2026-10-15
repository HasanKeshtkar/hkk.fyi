import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);

/** All wall-clock times (working hours, slot labels, "which day") are in this zone. */
export const CLINIC_TZ = 'Asia/Tehran';
export const SLOT_MINUTES = 30;
export const SLOT_MS = SLOT_MINUTES * 60_000;

/** A Gregorian calendar date in the clinic's zone, 'YYYY-MM-DD'. */
export type IsoDate = string;
/** A wall-clock time 'HH:MM' on the half hour; '24:00' is allowed as an end time. */
export type WallTime = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HALF_HOUR = /^(?:[01]\d|2[0-3]):(?:00|30)$/;

/** True for a real calendar date between 2000-01-01 and 2099-12-31. */
export function isIsoDate(s: string): boolean {
  const m = ISO_DATE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 2000 || y > 2099) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isHalfHourTime(s: string, { allowEndOfDay = false } = {}): boolean {
  return HALF_HOUR.test(s) || (allowEndOfDay && s === '24:00');
}

/** 'HH:MM' → minutes since midnight ('24:00' → 1440). */
export function minutesOf(t: WallTime): number {
  const [h, m] = t.split(':');
  return Number(h) * 60 + Number(m);
}

export function wallTimeOf(minutes: number): WallTime {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Postgres `time` comes back as 'HH:MM:SS'; the app works in 'HH:MM'. */
export function wallTimeFromDb(t: string): WallTime {
  return t.slice(0, 5);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Day of week of a calendar date, as Date#getDay(): 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: IsoDate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** The clinic-zone calendar date an instant falls on. */
export function clinicDateOf(instant: Date): IsoDate {
  return dayjs(instant).tz(CLINIC_TZ).format('YYYY-MM-DD');
}

/** The clinic-zone wall-clock time of an instant, 'HH:MM'. */
export function clinicTimeOf(instant: Date): WallTime {
  return dayjs(instant).tz(CLINIC_TZ).format('HH:mm');
}

/** The instant at which the clinic's wall clock shows `time` on `date`. '24:00' is the next midnight. */
export function instantAt(date: IsoDate, time: WallTime): Date {
  if (time === '24:00') return instantAt(addDays(date, 1), '00:00');
  return dayjs.tz(`${date} ${time}`, CLINIC_TZ).toDate();
}

export function clinicToday(now: Date = new Date()): IsoDate {
  return clinicDateOf(now);
}
