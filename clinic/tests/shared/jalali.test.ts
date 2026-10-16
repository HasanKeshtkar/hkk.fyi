import { describe, expect, it } from 'vitest';
import { isJalaliLeapYear, jalaliMonthLength, toGregorian, toJalali } from '../../src/shared/jalali.js';
import { addDays } from '../../src/shared/time.js';

// ICU's persian calendar (what Chrome on Android uses) as the independent reference.
const icu = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

function icuJalali(date: string) {
  const parts = icu.formatToParts(new Date(`${date}T12:00:00Z`));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { jy: get('year'), jm: get('month'), jd: get('day') };
}

describe('Jalali conversion', () => {
  it('matches ICU for every day of 2000–2099 and round-trips', () => {
    let date = '2000-01-01';
    let checked = 0;
    while (date < '2100-01-01') {
      const j = toJalali(date);
      const ref = icuJalali(date);
      if (j.jy !== ref.jy || j.jm !== ref.jm || j.jd !== ref.jd) {
        throw new Error(`${date}: got ${j.jy}/${j.jm}/${j.jd}, ICU says ${ref.jy}/${ref.jm}/${ref.jd}`);
      }
      if (toGregorian(j.jy, j.jm, j.jd) !== date) throw new Error(`${date} does not round-trip`);
      date = addDays(date, 1);
      checked++;
    }
    expect(checked).toBe(36525);
  });

  it('gets the dates jalaliday got wrong', () => {
    expect(toJalali('2028-01-01')).toEqual({ jy: 1406, jm: 10, jd: 11 });
    expect(toJalali('2028-02-29')).toEqual({ jy: 1406, jm: 12, jd: 10 });
    expect(toJalali('2028-03-01')).toEqual({ jy: 1406, jm: 12, jd: 11 });
    expect(jalaliMonthLength(1406, 10)).toBe(30);
    expect(jalaliMonthLength(1406, 11)).toBe(30);
  });

  it('knows month lengths and leap years (Esfand has 30 days only in leap years)', () => {
    expect(jalaliMonthLength(1405, 1)).toBe(31);
    expect(jalaliMonthLength(1405, 7)).toBe(30);
    // 1403 was a leap year (1403-12-30 = 2025-03-20); 1404 is not.
    expect(isJalaliLeapYear(1403)).toBe(true);
    expect(isJalaliLeapYear(1404)).toBe(false);
    expect(toGregorian(1403, 12, 30)).toBe('2025-03-20');
    expect(toGregorian(1405, 1, 1)).toBe('2026-03-21');
    for (let jy = 1379; jy <= 1478; jy++) {
      const days = Array.from({ length: 12 }, (_, i) => jalaliMonthLength(jy, i + 1)).reduce((a, b) => a + b);
      const start = toGregorian(jy, 1, 1);
      expect(addDays(start, days)).toBe(toGregorian(jy + 1, 1, 1));
    }
  });
});
