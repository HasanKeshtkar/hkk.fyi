import dayjs from 'dayjs';
import jalaliday from 'jalaliday';
import type { IsoDate } from '../../shared/time';
import { fa } from './format';

dayjs.extend(jalaliday);

export interface JalaliMonth {
  year: number;
  /** 1–12 */
  month: number;
  title: string; // "مهر ۱۴۰۵"
  /** Gregorian dates of each day, in order */
  days: { date: IsoDate; day: number }[];
  /** empty cells before day 1 in a Saturday-first week */
  leadingBlanks: number;
}

/** The Jalali month that contains `date`, laid out for a Saturday-first calendar grid. */
export function jalaliMonthOf(date: IsoDate): JalaliMonth {
  const first = dayjs(date).calendar('jalali').locale('fa').startOf('month');
  const count = first.daysInMonth();
  const days = Array.from({ length: count }, (_, i) => {
    const d = first.add(i, 'day');
    return { date: d.calendar('gregory').format('YYYY-MM-DD'), day: i + 1 };
  });
  // getDay(): Saturday = 6 → column 0, Sunday = 0 → column 1, …
  const leadingBlanks = (first.day() + 1) % 7;
  return {
    year: first.year(),
    month: first.month() + 1,
    title: fa(first.format('MMMM YYYY')),
    days,
    leadingBlanks,
  };
}

/** A date in the Jalali month before/after the one containing `date` (day 1 of that month). */
export function shiftJalaliMonth(date: IsoDate, months: number): IsoDate {
  return dayjs(date)
    .calendar('jalali')
    .startOf('month')
    .add(months, 'month')
    .calendar('gregory')
    .format('YYYY-MM-DD');
}

export const WEEKDAY_INITIALS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;
