import { JALALI_MONTH_NAMES, toJalali } from '../../shared/jalali';
import { clinicTimeOf, weekdayOf, type IsoDate, type WallTime } from '../../shared/time';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** ASCII digits → Persian digits, for display only. */
export function fa(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]!);
}

/** Indexed like Date#getDay(): 0 = Sunday. */
export const WEEKDAY_NAMES = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'] as const;

/** Display order of a Persian week: Saturday first. */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] as const;

/** "شنبه ۲۵ مهر ۱۴۰۵" */
export function jalaliLongLabel(date: IsoDate): string {
  const { jy, jm, jd } = toJalali(date);
  return `${WEEKDAY_NAMES[weekdayOf(date)]} ${fa(jd)} ${JALALI_MONTH_NAMES[jm - 1]} ${fa(jy)}`;
}

/** "۲۵ مهر" */
export function jalaliShortLabel(date: IsoDate): string {
  const { jm, jd } = toJalali(date);
  return `${fa(jd)} ${JALALI_MONTH_NAMES[jm - 1]}`;
}

/** "۱۴:۳۰" for an ISO instant, in clinic time. */
export function timeLabel(instantIso: string): string {
  return fa(clinicTimeOf(new Date(instantIso)));
}

/** "۱۴:۳۰" for a wall time; "24:00" reads as "۲۴:۰۰". */
export function wallTimeLabel(t: WallTime): string {
  return fa(t);
}

/**
 * "۰۹۱۲ ۱۲۳ ۴۵۶۷", wrapped in a left-to-right isolate (U+2066 … U+2069) so the digit groups keep
 * their order inside right-to-left Persian text, wherever the label is placed.
 */
export function phoneLabel(phone: string): string {
  const text = /^09\d{9}$/.test(phone) ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
  return `⁦${fa(text)}⁩`;
}
