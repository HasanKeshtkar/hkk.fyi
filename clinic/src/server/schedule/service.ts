import { asc, eq, gte, sql } from 'drizzle-orm';
import {
  resolveDaySchedule,
  type DateOverrideRecord,
  type DaySchedule,
  type WeeklyDayRecord,
} from '../../shared/schedule.js';
import { isHalfHourTime, isIsoDate, minutesOf, wallTimeFromDb, type IsoDate, type WallTime } from '../../shared/time.js';
import type { Db, Queryable } from '../db/client.js';
import { pgErrorOf, sanitizeDbError } from '../db/errors.js';
import { auditLog, dateOverrides, weeklySchedule, type DateOverrideRow, type WeeklyScheduleRow } from '../db/schema.js';

export const OVERRIDE_NOTE_MAX = 200;

export class ScheduleValidationError extends Error {
  constructor(readonly field: 'weekday' | 'date' | 'startTime' | 'endTime' | 'note' | 'version') {
    super(`invalid ${field}`);
  }
}

export class OverrideNotFoundError extends Error {
  constructor() {
    super('override not found');
  }
}

/**
 * The hours were changed by someone else since the caller loaded them. `current` is what is saved
 * now (null: the override the caller saw has been removed). Nothing was written.
 */
export class ScheduleConflictError extends Error {
  constructor(readonly current: WeeklyDayRecord | DateOverrideRecord | null) {
    super('schedule conflict');
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

function weeklyFromRow(r: WeeklyScheduleRow): WeeklyDayRecord {
  return {
    weekday: r.weekday,
    isOpen: r.isOpen,
    startTime: wallTimeFromDb(r.startTime),
    endTime: wallTimeFromDb(r.endTime),
    version: r.version,
    updatedBy: r.updatedBy,
    updatedAt: r.updatedAt.toISOString(),
  };
}

function overrideFromRow(r: DateOverrideRow): DateOverrideRecord {
  return {
    date: r.date,
    isOpen: r.isOpen,
    startTime: r.startTime === null ? null : wallTimeFromDb(r.startTime),
    endTime: r.endTime === null ? null : wallTimeFromDb(r.endTime),
    note: r.note,
    version: r.version,
    updatedBy: r.updatedBy,
    updatedAt: r.updatedAt.toISOString(),
  };
}

/** What the audit log keeps: the values and the version, not the bookkeeping columns it already records. */
function weeklySnapshot(w: WeeklyDayRecord) {
  return { weekday: w.weekday, isOpen: w.isOpen, startTime: w.startTime, endTime: w.endTime, version: w.version };
}

function overrideSnapshot(o: DateOverrideRecord) {
  return { date: o.date, isOpen: o.isOpen, startTime: o.startTime, endTime: o.endTime, note: o.note, version: o.version };
}

function validHours(startTime: WallTime, endTime: WallTime): void {
  if (!isHalfHourTime(startTime)) throw new ScheduleValidationError('startTime');
  if (!isHalfHourTime(endTime, { allowEndOfDay: true })) throw new ScheduleValidationError('endTime');
  if (minutesOf(endTime) <= minutesOf(startTime)) throw new ScheduleValidationError('endTime');
}

function validVersion(v: number | null): void {
  if (v !== null && (!Number.isInteger(v) || v < 1)) throw new ScheduleValidationError('version');
}

const NOTE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;

/** Tabs and line breaks become spaces; other control characters are refused. */
function validNote(note: string | null | undefined): string | null {
  if (note === null || note === undefined) return null;
  if (NOTE_CONTROL.test(note)) throw new ScheduleValidationError('note');
  const n = note.replace(/\s+/g, ' ').trim();
  if (n.length > OVERRIDE_NOTE_MAX) throw new ScheduleValidationError('note');
  return n === '' ? null : n;
}

export async function getWeekly(db: Queryable): Promise<WeeklyDayRecord[]> {
  const rows = await db.select().from(weeklySchedule).orderBy(asc(weeklySchedule.weekday));
  return rows.map(weeklyFromRow);
}

export async function getOverride(db: Queryable, date: IsoDate): Promise<DateOverrideRecord | null> {
  const [row] = await db.select().from(dateOverrides).where(eq(dateOverrides.date, date));
  return row ? overrideFromRow(row) : null;
}

export async function listOverrides(db: Queryable, fromDate: IsoDate): Promise<DateOverrideRecord[]> {
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

/** Runs a schedule write; retries when two first-time inserts race for the same key, or on deadlock. */
async function runScheduleWrite<T>(write: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await write();
    } catch (err) {
      if (
        err instanceof ScheduleValidationError ||
        err instanceof OverrideNotFoundError ||
        err instanceof ScheduleConflictError
      ) {
        throw err;
      }
      const pg = pgErrorOf(err);
      const retryable = pg && (pg.code === '23505' || pg.code === '40P01' || pg.code === '40001');
      if (retryable && attempt < 3) continue;
      throw sanitizeDbError(err);
    }
  }
}

/**
 * Sets one weekday's hours if the row is still at `expectedVersion`: the version the caller loaded,
 * or null if the caller saw no row for that weekday (the seed creates all seven, so normally never).
 * Asking for the hours that are already saved always succeeds without a change.
 * Existing appointments are never touched. Audited.
 */
export async function setWeeklyDay(
  db: Db,
  actor: Actor,
  weekday: number,
  input: HoursInput,
  expectedVersion: number | null,
): Promise<WeeklyDayRecord> {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new ScheduleValidationError('weekday');
  validHours(input.startTime, input.endTime);
  validVersion(expectedVersion);
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
      if ((before?.version ?? null) !== expectedVersion) throw new ScheduleConflictError(before);
      const [row] = before
        ? await tx
            .update(weeklySchedule)
            .set({ ...values, version: before.version + 1, updatedBy: actor.id, updatedAt: new Date() })
            .where(eq(weeklySchedule.weekday, weekday))
            .returning()
        : await tx
            .insert(weeklySchedule)
            .values({ weekday, ...values, updatedBy: actor.id })
            .onConflictDoNothing()
            .returning();
      if (!row) {
        // The weekday row was missing (seed always creates all seven) and someone else created it
        // just now: the caller never saw that row, so this is a conflict, not a retry.
        const [current] = await tx.select().from(weeklySchedule).where(eq(weeklySchedule.weekday, weekday));
        throw new ScheduleConflictError(current ? weeklyFromRow(current) : null);
      }
      const after = weeklyFromRow(row);
      await tx.insert(auditLog).values({
        userId: actor.id,
        entity: 'weekly_schedule',
        entityId: String(weekday),
        action: before ? 'update' : 'create',
        before: before ? weeklySnapshot(before) : null,
        after: weeklySnapshot(after),
      });
      return after;
    }),
  );
}

/**
 * Closes a date, or opens it with its own hours, overriding the weekly hours.
 * `expectedVersion` is the version of the override the caller saw, or null if it saw none.
 * Versions are opaque: unique and increasing, not consecutive.
 * Audited.
 */
export async function upsertOverride(
  db: Db,
  actor: Actor,
  date: IsoDate,
  input: OverrideInput,
  expectedVersion: number | null,
): Promise<DateOverrideRecord> {
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
  validVersion(expectedVersion);
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
      if ((before?.version ?? null) !== expectedVersion) throw new ScheduleConflictError(before);
      const [row] = before
        ? await tx
            .update(dateOverrides)
            .set({ ...values, version: sql`nextval('date_overrides_version_seq')`, updatedBy: actor.id, updatedAt: new Date() })
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
        before: before ? overrideSnapshot(before) : null,
        after: overrideSnapshot(after),
      });
      return after;
    }),
  );
}

/** Removes a date's override, if still at `expectedVersion`, so the weekly hours apply again. Audited. */
export async function deleteOverride(db: Db, actor: Actor, date: IsoDate, expectedVersion: number): Promise<void> {
  if (!isIsoDate(date)) throw new ScheduleValidationError('date');
  validVersion(expectedVersion);
  await runScheduleWrite(() =>
    db.transaction(async (tx) => {
      const [beforeRow] = await tx.select().from(dateOverrides).where(eq(dateOverrides.date, date)).for('update');
      if (!beforeRow) throw new OverrideNotFoundError();
      const before = overrideFromRow(beforeRow);
      if (before.version !== expectedVersion) throw new ScheduleConflictError(before);
      await tx.delete(dateOverrides).where(eq(dateOverrides.date, date));
      await tx.insert(auditLog).values({
        userId: actor.id,
        entity: 'date_override',
        entityId: date,
        action: 'delete',
        before: overrideSnapshot(before),
        after: null,
      });
    }),
  );
}
