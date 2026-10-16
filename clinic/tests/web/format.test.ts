import { describe, expect, it } from 'vitest';
import { jalaliLongLabel, phoneLabel } from '../../src/web/lib/format';
import { jalaliMonthOf, shiftJalaliMonth } from '../../src/web/lib/jalali';

describe('Jalali labels and month grids', () => {
  it('labels dates correctly, including Jan–Feb of a Gregorian leap year', () => {
    expect(jalaliLongLabel('2026-10-17')).toBe('شنبه ۲۵ مهر ۱۴۰۵');
    expect(jalaliLongLabel('2028-01-01')).toBe('شنبه ۱۱ دی ۱۴۰۶');
    expect(jalaliLongLabel('2028-02-29')).toBe('سه‌شنبه ۱۰ اسفند ۱۴۰۶');
    expect(jalaliLongLabel('2026-03-21')).toBe('شنبه ۱ فروردین ۱۴۰۵');
  });

  it('builds full month grids with the right first weekday', () => {
    const mehr = jalaliMonthOf('2026-10-17');
    expect(mehr.title).toBe('مهر ۱۴۰۵');
    expect(mehr.days).toHaveLength(30);
    expect(mehr.days[0]!.date).toBe('2026-09-23'); // a Wednesday: 4 blanks (ش ی د س)
    expect(mehr.leadingBlanks).toBe(4);
    const dey1406 = jalaliMonthOf('2028-01-01');
    expect(dey1406.days).toHaveLength(30);
    expect(jalaliMonthOf('2028-02-01').days).toHaveLength(30); // Bahman 1406
  });

  it('steps across year ends', () => {
    expect(shiftJalaliMonth('2027-03-10', 1)).toBe('2027-03-21'); // Esfand 1405 → Farvardin 1406
    expect(shiftJalaliMonth('2026-03-25', -1)).toBe('2026-02-20'); // Farvardin 1405 → Esfand 1404
  });

  it('keeps phone digit groups left-to-right inside Persian text', () => {
    expect(phoneLabel('09121234567')).toBe('⁦۰۹۱۲ ۱۲۳ ۴۵۶۷⁩');
  });
});
