import { JALALI_MONTH_NAMES, jalaliMonthLength, toGregorian, toJalali } from '../../shared/jalali';
import { weekdayOf, type IsoDate } from '../../shared/time';
import { fa } from './format';

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
  const { jy, jm } = toJalali(date);
  const days = Array.from({ length: jalaliMonthLength(jy, jm) }, (_, i) => ({ date: toGregorian(jy, jm, i + 1), day: i + 1 }));
  // getDay(): Saturday = 6 → column 0, Sunday = 0 → column 1, …
  const leadingBlanks = (weekdayOf(days[0]!.date) + 1) % 7;
  return { year: jy, month: jm, title: `${JALALI_MONTH_NAMES[jm - 1]} ${fa(jy)}`, days, leadingBlanks };
}

/** Day 1 of the Jalali month `months` before/after the one containing `date`. */
export function shiftJalaliMonth(date: IsoDate, months: number): IsoDate {
  const { jy, jm } = toJalali(date);
  const index = jy * 12 + (jm - 1) + months;
  return toGregorian(Math.floor(index / 12), (index % 12) + 1, 1);
}

export const WEEKDAY_INITIALS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;
