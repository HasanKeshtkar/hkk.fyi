import { describe, expect, it } from 'vitest';
import {
  addDays,
  clinicDateOf,
  clinicTimeOf,
  instantAt,
  isHalfHourTime,
  isIsoDate,
  minutesOf,
  wallTimeFromDb,
  wallTimeOf,
  weekdayOf,
} from '../../src/shared/time.js';

describe('clinic time helpers (Asia/Tehran)', () => {
  it('converts Tehran wall-clock times to instants', () => {
    expect(instantAt('2026-10-17', '14:00').toISOString()).toBe('2026-10-17T10:30:00.000Z');
    expect(instantAt('2026-10-17', '00:00').toISOString()).toBe('2026-10-16T20:30:00.000Z');
    expect(instantAt('2026-10-17', '24:00').toISOString()).toBe('2026-10-17T20:30:00.000Z');
    expect(instantAt('2027-03-21', '08:30').toISOString()).toBe('2027-03-21T05:00:00.000Z'); // no DST since 2022
  });

  it('finds the Tehran calendar date and time of an instant', () => {
    expect(clinicDateOf(new Date('2026-10-17T20:29:59Z'))).toBe('2026-10-17');
    expect(clinicDateOf(new Date('2026-10-17T20:30:00Z'))).toBe('2026-10-18');
    expect(clinicTimeOf(new Date('2026-10-17T15:00:00Z'))).toBe('18:30');
  });

  it('knows the weekday (0 = Sunday … 6 = Saturday)', () => {
    expect(weekdayOf('2026-10-17')).toBe(6);
    expect(weekdayOf('2026-10-18')).toBe(0);
    expect(weekdayOf('2026-10-19')).toBe(1);
    expect(weekdayOf('2026-10-23')).toBe(5);
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('validates dates', () => {
    expect(isIsoDate('2026-10-17')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
    for (const bad of ['2026-02-30', '2026-13-01', '2026-1-1', '1999-12-31', '2100-01-01', '2026-10-17T00:00', '']) {
      expect(isIsoDate(bad), bad).toBe(false);
    }
  });

  it('validates half-hour times', () => {
    expect(isHalfHourTime('00:00')).toBe(true);
    expect(isHalfHourTime('23:30')).toBe(true);
    expect(isHalfHourTime('14:15')).toBe(false);
    expect(isHalfHourTime('7:00')).toBe(false);
    expect(isHalfHourTime('24:00')).toBe(false);
    expect(isHalfHourTime('24:00', { allowEndOfDay: true })).toBe(true);
    expect(isHalfHourTime('24:30', { allowEndOfDay: true })).toBe(false);
  });

  it('converts between wall times and minutes', () => {
    expect(minutesOf('14:30')).toBe(870);
    expect(minutesOf('24:00')).toBe(1440);
    expect(wallTimeOf(870)).toBe('14:30');
    expect(wallTimeFromDb('19:00:00')).toBe('19:00');
    expect(wallTimeFromDb('24:00:00')).toBe('24:00');
  });
});
