import { asc, eq, gte } from 'drizzle-orm';
import {
  resolveDaySchedule,
  type DateOverride,
  type DaySchedule,
  type WeeklyDay,
} from '../../shared/schedule.js';
import { isHalfHourTime, isIsoDate, minutesOf, wallTimeFromDb, type IsoDate, type WallTime } from '../../shared/time.js';
import type { Db, Queryable } from '../db/client.js';
import { pgErrorOf, sanitizeDbError } from '../db/errors.js';
import { auditLog, dateOverrides, weeklySchedule, type DateOverrideRow, type WeeklyScheduleRow } from '../db/schema.js';

export const OVERRIDE_NOTE_MAX = 200;

export class ScheduleValidationError extends Error {
  constructor(readonly field: 'weekday' | 'date' | 'startTime' | 'endTime' | 'note') {
    super(`invalid ${field}`);
  }
}

export class OverrideNotFoundError extends Error {
  constructor() {
    super('override not found');
  }
}

interface Actor {
  id: string;
}

export interface HoursInput {
  isOpen: boolean;
  startTime: WallTime;
  endTime: WallTime;
}

export interface OverrideInput {
  isOpen: boolean;
  startTime?: WallTime | null;
  endTime?: WallTime | null;
  note?: string | null;
}

function weeklyFromRow(r: WeeklyScheduleRow): WeeklyDay {
  return {
    weekday: r.weekday,
    isOpen: r.isOpen,
    startTime: wallTimeFromDb(r.startTime),
    endTime: wallTimeFromDb(r.endTime),
  };
}

function overrideFromRow(r: DateOverrideRow): DateOverride {
  return {
    date: r.date,
    isOpen: r.isOpen,
    startTime: r.startTime === null ? null : wallTimeFromDb(r.startTime),
    endTime: r.endTime === null ? null : wallTimeFromDb(r.endTime),
    note: r.note,
  };
}

function validHours(startTime: WallTime, endTime: WallTime): void {
  if (!isHalfHourTime(startTime)) throw new ScheduleValidationError('startTime');
  if (!isHalfHourTime(endTime, { allowEndOfDay: true })) throw new ScheduleValidationError('endTime');
  if (minutesOf(endTime) <= minutesOf(startTime)) throw new ScheduleValidationError('endTime');
}

const NOTE_CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

function validNote(note: string | null | undefined): string | null {
  if (note === null || note === undefined) return null;
  if (NOTE_CONTROL.test(note)) throw new ScheduleValidationError('note');
  const n = note.replace(/\s+/g, ' ').trim();
  if (n.length > OVERRIDE_NOTE_MAX) throw new ScheduleValidationError('note');
  return n === '' ? null : n;
}

export async function getWeekly(db: Queryable): Promise<WeeklyDay[]> {
  const rows = await db.select().from(weeklySchedule).orderBy(asc(weeklySchedule.weekday));
  return rows.map(weeklyFromRow);
}

export async function getOverride(db: Queryable, date: IsoDate): Promise<DateOverride | null> {
  const [row] = await db.select().from(dateOverrides).where(eq(dateOverrides.date, date));
  return row ? overrideFromRow(row) : null;
}

export async function listOverrides(db: Queryable, fromDate: IsoDate): Promise<DateOverride[]> {
  const rows = await db
    .select()
    .from(dateOverrides)
    .where(gte(dateOverrides.date, fromDate))
    .orderBy(asc(dateOverrides.date))
    .limit(366);
  return rows.map(overrideFromRow);
}

export async function getDaySchedule(db: Queryable, date: IsoDate): Promise<DaySchedule> {
  const [weekly, override] = await Promise.all([getWeekly(db), getOverride(db, date)]);
  return resolveDaySchedule(date, weekly, override);
}

/** Runs a schedule write; retries once when two first-time inserts race for the same key. */
async function runScheduleWrite<T>(write: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await write();
    } catch (err) {
      if (err instanceof ScheduleValidationError || err instanceof OverrideNotFoundError) throw err;
      const pg = pgErrorOf(err);
      const retryable = pg && (pg.code === '23505' || pg.code === '40P01' || pg.code === '40001');
      if (retryable && attempt < 3) continue;
      throw sanitizeDbError(err);
    }
  }
}

/** Sets one weekday's hours. Existing appointments are never touched. Audited. */
export async function setWeeklyDay(db: Db, actor: Actor, weekday: number, input: HoursInput): Promise<WeeklyDay> {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new ScheduleValidationError('weekday');
  validHours(input.startTime, input.endTime);
  const values = { isOpen: input.isOpen, startTime: input.startTime, endTime: input.endTime };

  return runScheduleWrite(() =>
    db.transaction(async (tx) => {
      const [beforeRow] = await tx.select().from(weeklySchedule).where(eq(weeklySchedule.weekday, weekday)).for('update');
      const before = beforeRow ? weeklyFromRow(beforeRow) : null;
      if (
        before &&
        before.isOpen === values.isOpen &&
        before.startTime === values.startTime &&
        before.endTime === values.endTime
      ) {
        return before;
      }
      const [row] = beforeRow
        ? await tx
            .update(weeklySchedule)
            .set({ ...values, updatedBy: actor.id, updatedAt: new Date() })
            .where(eq(weeklySchedule.weekday, weekday))
            .returning()
        : await tx
            .insert(weeklySchedule)
            .values({ weekday, ...values, updatedBy: actor.id })
            .returning();
      const after = weeklyFromRow(row!);
      await tx.insert(auditLog).values({
        userId: actor.id,
        entity: 'weekly_schedule',
        entityId: String(weekday),
        action: before ? 'update' : 'create',
        before,
        after,
      });
      return after;
    }),
  );
}

/** Closes a date, or opens it with its own hours, overriding the weekly hours. Audited. */
export async function upsertOverride(db: Db, actor: Actor, date: IsoDate, input: OverrideInput): Promise<DateOverride> {
  if (!isIsoDate(date)) throw new ScheduleValidationError('date');
  let startTime: WallTime | null = null;
  let endTime: WallTime | null = null;
  if (input.isOpen) {
    if (!input.startTime) throw new ScheduleValidationError('startTime');
    if (!input.endTime) throw new ScheduleValidationError('endTime');
    validHours(input.startTime, input.endTime);
    startTime = input.startTime;
    endTime = input.endTime;
  }
  const note = validNote(input.note);
  const values = { isOpen: input.isOpen, startTime, endTime, note };

  return runScheduleWrite(() =>
    db.transaction(async (tx) => {
      const [beforeRow] = await tx.select().from(dateOverrides).where(eq(dateOverrides.date, date)).for('update');
      const before = beforeRow ? overrideFromRow(beforeRow) : null;
      if (
        before &&
        before.isOpen === values.isOpen &&
        before.startTime === values.startTime &&
        before.endTime === values.endTime &&
        before.note === values.note
      ) {
        return before;
      }
      const [row] = beforeRow
        ? await tx
            .update(dateOverrides)
            .set({ ...values, updatedBy: actor.id, updatedAt: new Date() })
            .where(eq(dateOverrides.date, date))
            .returning()
        : await tx
            .insert(dateOverrides)
            .values({ date, ...values, updatedBy: actor.id })
            .returning();
      const after = overrideFromRow(row!);
      await tx.insert(auditLog).values({
        userId: actor.id,
        entity: 'date_override',
        entityId: date,
        action: before ? 'update' : 'create',
        before,
        after,
      });
      return after;
    }),
  );
}

/** Removes a date's override so the weekly hours apply again. Audited. */
export async function deleteOverride(db: Db, actor: Actor, date: IsoDate): Promise<void> {
  if (!isIsoDate(date)) throw new ScheduleValidationError('date');
  await runScheduleWrite(() =>
    db.transaction(async (tx) => {
      const [beforeRow] = await tx.delete(dateOverrides).where(eq(dateOverrides.date, date)).returning();
      if (!beforeRow) throw new OverrideNotFoundError();
      await tx.insert(auditLog).values({
        userId: actor.id,
        entity: 'date_override',
        entityId: date,
        action: 'delete',
        before: overrideFromRow(beforeRow),
        after: null,
      });
    }),
  );
}
