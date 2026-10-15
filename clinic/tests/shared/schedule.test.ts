import { describe, expect, it } from 'vitest';
import {
  checkSlotAgainstHours,
  resolveDaySchedule,
  slotStarts,
  type WeeklyDay,
} from '../../src/shared/schedule.js';
import { instantAt } from '../../src/shared/time.js';

const WEEKLY: WeeklyDay[] = [
  { weekday: 6, isOpen: true, startTime: '14:00', endTime: '19:00' },
  { weekday: 0, isOpen: true, startTime: '14:00', endTime: '19:00' },
  { weekday: 1, isOpen: true, startTime: '08:00', endTime: '12:00' },
  { weekday: 4, isOpen: false, startTime: '14:00', endTime: '19:00' },
];
const SAT = '2026-10-17';
const MON = '2026-10-19';
const TUE = '2026-10-20'; // no weekly row in this fixture
const THU = '2026-10-22';

describe('resolveDaySchedule', () => {
  it('uses the weekly hours', () => {
    expect(resolveDaySchedule(SAT, WEEKLY, null)).toEqual({
      date: SAT,
      weekday: 6,
      isOpen: true,
      startTime: '14:00',
      endTime: '19:00',
      source: 'weekly',
      note: null,
    });
  });

  it('reports a closed weekday without hours', () => {
    expect(resolveDaySchedule(THU, WEEKLY, null)).toMatchObject({ isOpen: false, startTime: null, endTime: null });
  });

  it('treats a weekday with no row as closed', () => {
    expect(resolveDaySchedule(TUE, WEEKLY, null).isOpen).toBe(false);
  });

  it('lets an override close an open day or open a closed one', () => {
    const closed = resolveDaySchedule(SAT, WEEKLY, { date: SAT, isOpen: false, startTime: null, endTime: null, note: 'تعطیل رسمی' });
    expect(closed).toMatchObject({ isOpen: false, source: 'override', note: 'تعطیل رسمی' });
    const opened = resolveDaySchedule(THU, WEEKLY, { date: THU, isOpen: true, startTime: '09:00', endTime: '13:00', note: null });
    expect(opened).toMatchObject({ isOpen: true, startTime: '09:00', endTime: '13:00', source: 'override' });
  });
});

describe('slotStarts', () => {
  it('lists every 30-minute slot, the last ending at closing time', () => {
    const slots = slotStarts(resolveDaySchedule(SAT, WEEKLY, null));
    expect(slots).toHaveLength(10);
    expect(slots[0]!.getTime()).toBe(instantAt(SAT, '14:00').getTime());
    expect(slots[9]!.getTime()).toBe(instantAt(SAT, '18:30').getTime());
    expect(slotStarts(resolveDaySchedule(MON, WEEKLY, null))).toHaveLength(8);
  });

  it('is empty on a closed day', () => {
    expect(slotStarts(resolveDaySchedule(THU, WEEKLY, null))).toEqual([]);
  });

  it('handles a day open until midnight', () => {
    const late = resolveDaySchedule(THU, WEEKLY, { date: THU, isOpen: true, startTime: '22:00', endTime: '24:00', note: null });
    expect(slotStarts(late).map((d) => d.toISOString())).toEqual([
      instantAt(THU, '22:00').toISOString(),
      instantAt(THU, '22:30').toISOString(),
      instantAt(THU, '23:00').toISOString(),
      instantAt(THU, '23:30').toISOString(),
    ]);
  });
});

describe('checkSlotAgainstHours', () => {
  const sat = resolveDaySchedule(SAT, WEEKLY, null);
  it.each([
    ['14:00', null],
    ['18:30', null],
    ['13:30', 'outside_hours'],
    ['19:00', 'outside_hours'],
  ] as const)('Saturday %s → %s', (time, expected) => {
    expect(checkSlotAgainstHours(instantAt(SAT, time), sat)).toBe(expected);
  });

  it('Monday: 08:00 and 11:30 inside, 12:00 and 14:00 outside', () => {
    const mon = resolveDaySchedule(MON, WEEKLY, null);
    expect(checkSlotAgainstHours(instantAt(MON, '08:00'), mon)).toBeNull();
    expect(checkSlotAgainstHours(instantAt(MON, '11:30'), mon)).toBeNull();
    expect(checkSlotAgainstHours(instantAt(MON, '12:00'), mon)).toBe('outside_hours');
    expect(checkSlotAgainstHours(instantAt(MON, '14:00'), mon)).toBe('outside_hours');
  });

  it('a closed day rejects every slot as day_closed', () => {
    const thu = resolveDaySchedule(THU, WEEKLY, null);
    expect(checkSlotAgainstHours(instantAt(THU, '15:00'), thu)).toBe('day_closed');
  });
});
