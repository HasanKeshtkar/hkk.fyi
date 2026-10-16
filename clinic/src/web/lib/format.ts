import dayjs from 'dayjs';
import 'dayjs/locale/fa.js';
import jalaliday from 'jalaliday';
import { clinicTimeOf, type IsoDate, type WallTime } from '../../shared/time';

dayjs.extend(jalaliday);

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** ASCII digits → Persian digits, for display only. */
export function fa(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]!);
}

/** Indexed like Date#getDay(): 0 = Sunday. */
export const WEEKDAY_NAMES = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'] as const;

/** Display order of a Persian week: Saturday first. */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] as const;

function jalali(date: IsoDate) {
  return dayjs(date).calendar('jalali').locale('fa');
}

/** "شنبه ۲۵ مهر ۱۴۰۵" */
export function jalaliLongLabel(date: IsoDate): string {
  return fa(jalali(date).format('dddd D MMMM YYYY'));
}

/** "۲۵ مهر" */
export function jalaliShortLabel(date: IsoDate): string {
  return fa(jalali(date).format('D MMMM'));
}

/** "۱۴:۳۰" for an ISO instant, in clinic time. */
export function timeLabel(instantIso: string): string {
  return fa(clinicTimeOf(new Date(instantIso)));
}

/** "۱۴:۳۰" for a wall time; "24:00" reads as "۲۴:۰۰". */
export function wallTimeLabel(t: WallTime): string {
  return fa(t);
}

/** "۰۹۱۲ ۱۲۳ ۴۵۶۷" */
export function phoneLabel(phone: string): string {
  if (/^09\d{9}$/.test(phone)) return fa(`${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`);
  return fa(phone);
}
