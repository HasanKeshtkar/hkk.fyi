// Working hours: weekly per weekday, and per-date overrides (closed, or other hours).
// Both people may edit; each row carries a version, and a save based on an older version is
// refused with what is saved now. Every change is audited.
import {
  resolveDaySchedule,
  type DateOverrideRecord,
  type DaySchedule,
  type WeeklyDayRecord,
} from '../shared/schedule';
import { isHalfHourTime, isIsoDate, minutesOf, type IsoDate, type WallTime } from '../shared/time';
import { all, one, type Sql } from './db/sql';
import { HttpError } from './http';

export const OVERRIDE_NOTE_MAX = 200;

type WeeklyRow = {
  weekday: number;
  is_open: number;
  start_time: string;
  end_time: string;
  version: number;
  updated_by: string | null;
  updated_at: number;
};
type OverrideRow = {
  date: string;
  is_open: number;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
  version: number;
  updated_by: string | null;
  updated_at: number;
};

const invalid = (field: string) => new HttpError(400, { error: 'validation', field });
const conflict = (current: WeeklyDayRecord | DateOverrideRecord | null) =>
  new HttpError(409, { error: 'schedule_conflict', currentSchedule: current });

function weeklyRecord(r: WeeklyRow): WeeklyDayRecord {
  return {
    weekday: r.weekday,
    isOpen: r.is_open === 1,
    startTime: r.start_time,
    endTime: r.end_time,
    version: r.version,
    updatedBy: r.updated_by,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function overrideRecord(r: OverrideRow): DateOverrideRecord {
  return {
    date: r.date,
    isOpen: r.is_open === 1,
    startTime: r.start_time,
    endTime: r.end_time,
    note: r.note,
    version: r.version,
    updatedBy: r.updated_by,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

const weeklySnapshot = (w: WeeklyDayRecord) => ({
  weekday: w.weekday,
  isOpen: w.isOpen,
  startTime: w.startTime,
  endTime: w.endTime,
  version: w.version,
});
const overrideSnapshot = (o: DateOverrideRecord) => ({
  date: o.date,
  isOpen: o.isOpen,
  startTime: o.startTime,
  endTime: o.endTime,
  note: o.note,
  version: o.version,
});

function audit(sql: Sql, userId: string, entity: string, entityId: string, action: string, before: unknown, after: unknown) {
  sql.exec(
    'INSERT INTO audit_log (user_id, entity, entity_id, action, before, after, at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    userId,
    entity,
    entityId,
    action,
    before === null ? null : JSON.stringify(before),
    after === null ? null : JSON.stringify(after),
    Date.now(),
  );
}

function validHours(startTime: WallTime, endTime: WallTime): void {
  if (!isHalfHourTime(startTime)) throw invalid('startTime');
  if (!isHalfHourTime(endTime, { allowEndOfDay: true })) throw invalid('endTime');
  if (minutesOf(endTime) <= minutesOf(startTime)) throw invalid('endTime');
}

const NOTE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;

/** Tabs and line breaks become spaces; other control characters are refused. */
function validNote(note: string | null | undefined): string | null {
  if (note === null || note === undefined) return null;
  if (NOTE_CONTROL.test(note)) throw invalid('note');
  const n = note.replace(/\s+/g, ' ').trim();
  if (n.length > OVERRIDE_NOTE_MAX) throw invalid('note');
  return n === '' ? null : n;
}

export function getWeekly(sql: Sql): WeeklyDayRecord[] {
  return all<WeeklyRow>(sql, 'SELECT * FROM weekly_schedule ORDER BY weekday').map(weeklyRecord);
}

export function getOverride(sql: Sql, date: IsoDate): DateOverrideRecord | null {
  const r = one<OverrideRow>(sql, 'SELECT * FROM date_overrides WHERE date = ?', date);
  return r ? overrideRecord(r) : null;
}

export function listOverrides(sql: Sql, fromDate: IsoDate): DateOverrideRecord[] {
  return all<OverrideRow>(sql, 'SELECT * FROM date_overrides WHERE date >= ? ORDER BY date LIMIT 366', fromDate).map(
    overrideRecord,
  );
}

export function getDaySchedule(sql: Sql, date: IsoDate): DaySchedule {
  return resolveDaySchedule(date, getWeekly(sql), getOverride(sql, date));
}

/**
 * Sets one weekday's hours if the row is still at `expectedVersion` (null: the caller saw no row).
 * Asking for the hours already saved succeeds without a change. Appointments are never touched.
 */
export function setWeeklyDay(
  storage: DurableObjectStorage,
  userId: string,
  weekday: number,
  input: { isOpen: boolean; startTime: WallTime; endTime: WallTime },
  expectedVersion: number | null,
): WeeklyDayRecord {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw invalid('weekday');
  validHours(input.startTime, input.endTime);
  const sql = storage.sql;
  return storage.transactionSync(() => {
    const row = one<WeeklyRow>(sql, 'SELECT * FROM weekly_schedule WHERE weekday = ?', weekday);
    const before = row ? weeklyRecord(row) : null;
    if (before && before.isOpen === input.isOpen && before.startTime === input.startTime && before.endTime === input.endTime) {
      return before;
    }
    if ((before?.version ?? null) !== expectedVersion) throw conflict(before);
    const now = Date.now();
    if (before) {
      sql.exec(
        'UPDATE weekly_schedule SET is_open = ?, start_time = ?, end_time = ?, version = version + 1, updated_by = ?, updated_at = ? WHERE weekday = ?',
        input.isOpen ? 1 : 0,
        input.startTime,
        input.endTime,
        userId,
        now,
        weekday,
      );
    } else {
      sql.exec(
        'INSERT INTO weekly_schedule (weekday, is_open, start_time, end_time, version, updated_by, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
        weekday,
        input.isOpen ? 1 : 0,
        input.startTime,
        input.endTime,
        userId,
        now,
      );
    }
    const after = weeklyRecord(one<WeeklyRow>(sql, 'SELECT * FROM weekly_schedule WHERE weekday = ?', weekday)!);
    audit(sql, userId, 'weekly_schedule', String(weekday), before ? 'update' : 'create', before && weeklySnapshot(before), weeklySnapshot(after));
    return after;
  });
}

function nextOverrideVersion(sql: Sql): number {
  sql.exec(
    "INSERT INTO counters (name, value) VALUES ('override_version', 1) ON CONFLICT(name) DO UPDATE SET value = value + 1",
  );
  return one<{ value: number }>(sql, "SELECT value FROM counters WHERE name = 'override_version'")!.value;
}

/** Closes a date, or opens it with its own hours. `expectedVersion`: the override the caller saw, or null. */
export function upsertOverride(
  storage: DurableObjectStorage,
  userId: string,
  date: IsoDate,
  input: { isOpen: boolean; startTime?: WallTime | null; endTime?: WallTime | null; note?: string | null },
  expectedVersion: number | null,
): DateOverrideRecord {
  if (!isIsoDate(date)) throw invalid('date');
  let startTime: WallTime | null = null;
  let endTime: WallTime | null = null;
  if (input.isOpen) {
    if (!input.startTime) throw invalid('startTime');
    if (!input.endTime) throw invalid('endTime');
    validHours(input.startTime, input.endTime);
    startTime = input.startTime;
    endTime = input.endTime;
  }
  const note = validNote(input.note);
  const sql = storage.sql;
  return storage.transactionSync(() => {
    const before = getOverride(sql, date);
    if (before && before.isOpen === input.isOpen && before.startTime === startTime && before.endTime === endTime && before.note === note) {
      return before;
    }
    if ((before?.version ?? null) !== expectedVersion) throw conflict(before);
    const version = nextOverrideVersion(sql);
    sql.exec(
      `INSERT INTO date_overrides (date, is_open, start_time, end_time, note, version, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET is_open = excluded.is_open, start_time = excluded.start_time,
         end_time = excluded.end_time, note = excluded.note, version = excluded.version,
         updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
      date,
      input.isOpen ? 1 : 0,
      startTime,
      endTime,
      note,
      version,
      userId,
      Date.now(),
    );
    const after = getOverride(sql, date)!;
    audit(sql, userId, 'date_override', date, before ? 'update' : 'create', before && overrideSnapshot(before), overrideSnapshot(after));
    return after;
  });
}

/** Removes a date's override, if still at `expectedVersion`, so the weekly hours apply again. */
export function deleteOverride(storage: DurableObjectStorage, userId: string, date: IsoDate, expectedVersion: number): void {
  if (!isIsoDate(date)) throw invalid('date');
  const sql = storage.sql;
  storage.transactionSync(() => {
    const before = getOverride(sql, date);
    if (!before) throw new HttpError(404, { error: 'not_found' });
    if (before.version !== expectedVersion) throw conflict(before);
    sql.exec('DELETE FROM date_overrides WHERE date = ?', date);
    audit(sql, userId, 'date_override', date, 'delete', overrideSnapshot(before), null);
  });
}
