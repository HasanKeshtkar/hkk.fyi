// Server-side working-hours enforcement and the audited schedule service.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createAppointment,
  findActiveAt,
  OutsideHoursError,
  updateAppointment,
} from '../../src/server/appointments/service.js';
import type { User } from '../../src/server/db/schema.js';
import {
  deleteOverride,
  getDaySchedule,
  OverrideNotFoundError,
  ScheduleConflictError,
  ScheduleValidationError,
  setWeeklyDay,
  upsertOverride,
} from '../../src/server/schedule/service.js';
import { checkSlotAgainstHours } from '../../src/shared/schedule.js';
import { instantAt } from '../../src/shared/time.js';
import { openTestDb, resetData } from '../helpers/db.js';

const { pool, db } = openTestDb(15);
let doctor: User;
let secretary: User;

// Default seed: Sat/Sun/Tue/Wed 14:00–19:00, Mon 08:00–12:00, Thu/Fri closed.
const SAT = '2026-10-17';
const MON = '2026-10-19';
const THU = '2026-10-22';
const FRI = '2026-10-23';

beforeEach(async () => {
  ({ doctor, secretary } = await resetData(pool, db));
});

afterAll(async () => {
  await pool.end();
});

const book = (date: string, time: string, actor: User = doctor) =>
  createAppointment(db, actor, { startAt: instantAt(date, time), patientName: 'بیمار', patientPhone: '09121234567' });

async function reason(p: Promise<unknown>) {
  const e = await p.then(
    () => null,
    (err: unknown) => err,
  );
  expect(e).toBeInstanceOf(OutsideHoursError);
  return (e as OutsideHoursError).reason;
}

async function auditRows(entity: string) {
  const { rows } = await pool.query(
    `select user_id, entity_id, action, before, after from audit_log where entity = $1 order by id`,
    [entity],
  );
  return rows;
}

describe('booking is checked against the working hours', () => {
  it.each([
    [SAT, '14:00'],
    [SAT, '18:30'],
    [MON, '08:00'],
    [MON, '11:30'],
  ])('accepts %s %s', async (date, time) => {
    await book(date, time);
  });

  it.each([
    [SAT, '13:30'],
    [SAT, '19:00'],
    [MON, '12:00'],
    [MON, '14:00'],
  ])('rejects %s %s as outside_hours', async (date, time) => {
    expect(await reason(book(date, time))).toBe('outside_hours');
  });

  it.each([
    [THU, '15:00'],
    [FRI, '10:00'],
  ])('rejects %s %s as day_closed', async (date, time) => {
    expect(await reason(book(date, time))).toBe('day_closed');
  });

  it('honours a closing override and an opening override', async () => {
    await upsertOverride(db, doctor, SAT, { isOpen: false, note: 'تعطیل رسمی' }, null);
    expect(await reason(book(SAT, '15:00'))).toBe('day_closed');

    await upsertOverride(db, secretary, THU, { isOpen: true, startTime: '09:00', endTime: '13:00' }, null);
    await book(THU, '09:00');
    await book(THU, '12:30');
    expect(await reason(book(THU, '13:00'))).toBe('outside_hours');
    expect(await reason(book(THU, '15:00'))).toBe('outside_hours');
  });

  it('follows a changed weekly end time', async () => {
    await setWeeklyDay(db, doctor, 6, { isOpen: true, startTime: '14:00', endTime: '18:00' }, 1);
    await book(SAT, '17:30');
    expect(await reason(book(SAT, '18:00'))).toBe('outside_hours');
  });

  it('checks moves too, and leaves the appointment unchanged when refused', async () => {
    const a = await book(SAT, '15:00');
    expect(await reason(updateAppointment(db, doctor, a.id, 1, { startAt: instantAt(THU, '15:00') }))).toBe('day_closed');
    expect(await reason(updateAppointment(db, doctor, a.id, 1, { startAt: instantAt(SAT, '19:00') }))).toBe(
      'outside_hours',
    );
    const moved = await updateAppointment(db, doctor, a.id, 1, { startAt: instantAt(MON, '08:30') });
    expect(moved.version).toBe(2);
  });
});

describe('changing the hours never removes appointments', () => {
  it('keeps appointments that fall outside new hours, flagged by the hours check', async () => {
    const late = await book(SAT, '18:30');
    const onClosedDay = await book(SAT, '15:00');
    await setWeeklyDay(db, doctor, 6, { isOpen: true, startTime: '14:00', endTime: '18:00' }, 1);
    await upsertOverride(db, doctor, MON, { isOpen: false }, null);
    const mon = await book('2026-10-26', '08:00'); // the Monday after: still open

    expect(await findActiveAt(db, late.startAt)).toMatchObject({ id: late.id, status: 'scheduled' });
    const sat = await getDaySchedule(db, SAT);
    expect(checkSlotAgainstHours(late.startAt, sat)).toBe('outside_hours');
    expect(checkSlotAgainstHours(onClosedDay.startAt, sat)).toBeNull();

    await setWeeklyDay(db, doctor, 6, { isOpen: false, startTime: '14:00', endTime: '18:00' }, 2);
    expect(await findActiveAt(db, onClosedDay.startAt)).toMatchObject({ id: onClosedDay.id });
    expect(checkSlotAgainstHours(onClosedDay.startAt, await getDaySchedule(db, SAT))).toBe('day_closed');
    expect(mon.status).toBe('scheduled');
  });

  it('still lets you edit the name/phone of an appointment the hours no longer cover', async () => {
    const a = await book(SAT, '18:30');
    await setWeeklyDay(db, doctor, 6, { isOpen: false, startTime: '14:00', endTime: '19:00' }, 1);
    const edited = await updateAppointment(db, secretary, a.id, 1, { patientName: 'نام جدید' });
    expect(edited).toMatchObject({ patientName: 'نام جدید', version: 2 });
  });
});

describe('schedule service', () => {
  it('audits a weekly change with before/after and who made it', async () => {
    await setWeeklyDay(db, secretary, 6, { isOpen: true, startTime: '14:00', endTime: '18:00' }, 1);
    expect(await auditRows('weekly_schedule')).toEqual([
      {
        user_id: secretary.id,
        entity_id: '6',
        action: 'update',
        before: { weekday: 6, isOpen: true, startTime: '14:00', endTime: '19:00', version: 1 },
        after: { weekday: 6, isOpen: true, startTime: '14:00', endTime: '18:00', version: 2 },
      },
    ]);
    const { rows } = await pool.query(`select updated_by from weekly_schedule where weekday = 6`);
    expect(rows[0].updated_by).toBe(secretary.id);
  });

  it('writes no audit row for a no-op change', async () => {
    await setWeeklyDay(db, doctor, 6, { isOpen: true, startTime: '14:00', endTime: '19:00' }, 1);
    expect(await auditRows('weekly_schedule')).toEqual([]);
  });

  it('creates a missing weekday row', async () => {
    await pool.query('delete from weekly_schedule where weekday = 2');
    const tue = await setWeeklyDay(db, doctor, 2, { isOpen: true, startTime: '10:00', endTime: '24:00' }, 1);
    expect(tue).toMatchObject({ weekday: 2, isOpen: true, startTime: '10:00', endTime: '24:00', version: 1, updatedBy: doctor.id });
    expect((await auditRows('weekly_schedule'))[0]).toMatchObject({ action: 'create', before: null });
  });

  it('audits override create, update and delete', async () => {
    await upsertOverride(db, doctor, SAT, { isOpen: false, note: '  تعطیل   رسمی ' }, null);
    await upsertOverride(db, secretary, SAT, { isOpen: true, startTime: '10:00', endTime: '13:00', note: '' }, 1);
    await deleteOverride(db, doctor, SAT, 2);
    const rows = await auditRows('date_override');
    expect(rows.map((r) => [r.action, r.user_id])).toEqual([
      ['create', doctor.id],
      ['update', secretary.id],
      ['delete', doctor.id],
    ]);
    expect(rows[0].after).toEqual({ date: SAT, isOpen: false, startTime: null, endTime: null, note: 'تعطیل رسمی', version: 1 });
    expect(rows[1].after).toEqual({ date: SAT, isOpen: true, startTime: '10:00', endTime: '13:00', note: null, version: 2 });
    expect(rows[2].after).toBeNull();
    expect((await getDaySchedule(db, SAT)).source).toBe('weekly');
  });

  it('refuses to delete an override that does not exist', async () => {
    await expect(deleteOverride(db, doctor, SAT, 1)).rejects.toBeInstanceOf(OverrideNotFoundError);
  });

  it('survives ten simultaneous first-time writes of the same override', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        upsertOverride(db, i % 2 ? doctor : secretary, THU, { isOpen: true, startTime: '09:00', endTime: '12:00' }, null),
      ),
    );
    expect(results.filter((r) => r.status === 'rejected')).toEqual([]);
    const { rows } = await pool.query(`select count(*)::int as n from date_overrides`);
    expect(rows[0].n).toBe(1);
    expect((await auditRows('date_override')).map((r) => r.action)).toEqual(['create']);
  });

  it('refuses a weekly edit made from a stale screen, returning what is saved now', async () => {
    await setWeeklyDay(db, secretary, 6, { isOpen: true, startTime: '14:00', endTime: '18:00' }, 1);
    const err = await setWeeklyDay(db, doctor, 6, { isOpen: true, startTime: '15:00', endTime: '19:00' }, 1).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ScheduleConflictError);
    expect((err as ScheduleConflictError).current).toMatchObject({ endTime: '18:00', version: 2, updatedBy: secretary.id });
    expect((await getDaySchedule(db, SAT)).endTime).toBe('18:00'); // the secretary's change was not undone
    expect(await auditRows('weekly_schedule')).toHaveLength(1);
  });

  it('a stale edit that asks for exactly what is saved succeeds as a no-op', async () => {
    await setWeeklyDay(db, secretary, 6, { isOpen: true, startTime: '14:00', endTime: '18:00' }, 1);
    const same = await setWeeklyDay(db, doctor, 6, { isOpen: true, startTime: '14:00', endTime: '18:00' }, 1);
    expect(same.version).toBe(2);
  });

  it('refuses override writes and deletes based on a stale view', async () => {
    await upsertOverride(db, secretary, SAT, { isOpen: false, note: 'مرخصی' }, null);
    // The doctor did not see that override and tries to create a different one.
    const create = await upsertOverride(db, doctor, SAT, { isOpen: true, startTime: '09:00', endTime: '12:00' }, null).catch(
      (e: unknown) => e,
    );
    expect(create).toBeInstanceOf(ScheduleConflictError);
    expect((create as ScheduleConflictError).current).toMatchObject({ isOpen: false, note: 'مرخصی', version: 1 });

    await upsertOverride(db, secretary, SAT, { isOpen: false, note: 'تعطیل رسمی' }, 1);
    const del = await deleteOverride(db, doctor, SAT, 1).catch((e: unknown) => e);
    expect(del).toBeInstanceOf(ScheduleConflictError);
    await deleteOverride(db, doctor, SAT, 2);

    // An edit of an override someone else already removed.
    const gone = await upsertOverride(db, secretary, SAT, { isOpen: false, note: 'x' }, 2).catch((e: unknown) => e);
    expect(gone).toBeInstanceOf(ScheduleConflictError);
    expect((gone as ScheduleConflictError).current).toBeNull();
  });

  it('turns line breaks and tabs in a note into spaces', async () => {
    const o = await upsertOverride(db, doctor, SAT, { isOpen: false, note: 'تعطیل\r\nرسمی\tعید' }, null);
    expect(o.note).toBe('تعطیل رسمی عید');
  });

  it.each([
    ['weekday 7', () => setWeeklyDay(db, doctor, 7, { isOpen: true, startTime: '14:00', endTime: '19:00' }, 1), 'weekday'],
    ['14:15 start', () => setWeeklyDay(db, doctor, 6, { isOpen: true, startTime: '14:15', endTime: '19:00' }, 1), 'startTime'],
    ['end before start', () => setWeeklyDay(db, doctor, 6, { isOpen: true, startTime: '14:00', endTime: '13:00' }, 1), 'endTime'],
    ['end equal start', () => setWeeklyDay(db, doctor, 6, { isOpen: true, startTime: '14:00', endTime: '14:00' }, 1), 'endTime'],
    ['24:00 start', () => setWeeklyDay(db, doctor, 6, { isOpen: true, startTime: '24:00', endTime: '24:00' }, 1), 'startTime'],
    ['bad date', () => upsertOverride(db, doctor, '2026-02-30', { isOpen: false }, null), 'date'],
    ['open without hours', () => upsertOverride(db, doctor, SAT, { isOpen: true }, null), 'startTime'],
    ['note with control char', () => upsertOverride(db, doctor, SAT, { isOpen: false, note: 'a\u0000b' }, null), 'note'],
    ['note too long', () => upsertOverride(db, doctor, SAT, { isOpen: false, note: 'ا'.repeat(201) }, null), 'note'],
  ])('rejects %s', async (_label, run, field) => {
    const err = await run().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ScheduleValidationError);
    expect((err as ScheduleValidationError).field).toBe(field);
  });
});
