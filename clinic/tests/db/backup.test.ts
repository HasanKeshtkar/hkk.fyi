// Backups and restores with the real PostgreSQL tools against the test database: a restore brings
// back exactly what was backed up (removing anything newer), keeps a copy of what it replaced, and
// changes nothing at all when it fails.
import { mkdtemp, readdir, rm, truncate, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  backupFileName,
  dropUnknownSettings,
  isBackupName,
  listBackups,
  pgTarget,
  restoreBackup,
  runBackup,
} from '../../src/server/backup/backup.js';
import { needsCatchUp, nextRunAt } from '../../src/server/backup/schedule.js';
import { createAppointment } from '../../src/server/appointments/service.js';
import { TEST_DATABASE_URL } from '../helpers/env.js';
import { openTestDb, resetData, tehran } from '../helpers/db.js';

const { pool, db } = openTestDb(5);
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'clinic-backup-test-'));
});
afterAll(async () => {
  await pool.end();
});

/** Everything a restore must bring back, in a comparable form. */
async function snapshot() {
  const q = async (sql: string) => (await pool.query(sql)).rows;
  return {
    users: await q('select id, role, name, password_hash from users order by role'),
    appointments: await q('select id, start_at, patient_name, patient_phone, status, version from appointments order by start_at'),
    weekly: await q('select weekday, is_open, start_time, end_time, version from weekly_schedule order by weekday'),
    audit: await q('select entity, entity_id, action from audit_log order by id'),
    migrations: await q('select hash from drizzle.__drizzle_migrations order by id'),
  };
}

async function seed() {
  const { doctor, secretary } = await resetData(pool, db);
  await createAppointment(db, { id: doctor.id, role: 'doctor' }, {
    startAt: tehran('2026-10-17T14:00'),
    patientName: 'مریم احمدی',
    patientPhone: '09121234567',
  });
  await createAppointment(db, { id: secretary.id, role: 'secretary' }, {
    startAt: tehran('2026-10-17T15:30'),
    patientName: 'علی رضایی',
    patientPhone: '09351234567',
  });
  return { doctor, secretary };
}

describe('backup and restore', () => {
  it('restores exactly what was backed up, removes anything newer, and keeps the replaced data', async () => {
    const { doctor } = await seed();
    const before = await snapshot();
    const backup = await runBackup({ databaseUrl: TEST_DATABASE_URL, dir, keep: 30 });
    expect(isBackupName(backup.name)).toBe(true);
    expect(backup.bytes).toBeGreaterThan(1000);

    // Life goes on after the backup: more bookings, a cancellation, and a table from a newer version.
    await createAppointment(db, { id: doctor.id, role: 'doctor' }, {
      startAt: tehran('2026-10-17T16:00'),
      patientName: 'بعد از پشتیبان',
      patientPhone: '09121111111',
    });
    await pool.query("update appointments set status = 'cancelled', version = version + 1 where patient_name = 'مریم احمدی'");
    await pool.query('create table public.from_a_newer_version (x int)');
    const after = await snapshot();

    const { safetyBackup } = await restoreBackup({ databaseUrl: TEST_DATABASE_URL, file: path.join(dir, backup.name), dir });
    expect(await snapshot()).toEqual(before);
    const leftover = await pool.query("select 1 from pg_tables where tablename = 'from_a_newer_version'");
    expect(leftover.rowCount).toBe(0);
    // The constraints came back too: the slot rule still holds.
    await expect(
      pool.query("insert into appointments (start_at, patient_name, patient_phone, created_by, updated_by) select start_at, 'x', '09120000000', created_by, created_by from appointments limit 1"),
    ).rejects.toThrow(/appointments_active_slot_uq/);

    // The data that was replaced is not lost.
    expect(safetyBackup.name).toMatch(/^pre-restore-/);
    await restoreBackup({ databaseUrl: TEST_DATABASE_URL, file: path.join(dir, safetyBackup.name), dir });
    const back = await snapshot();
    expect(back.appointments).toEqual(after.appointments);
  });

  it('a damaged backup changes nothing', async () => {
    await seed();
    const backup = await runBackup({ databaseUrl: TEST_DATABASE_URL, dir, keep: 30 });
    const file = path.join(dir, backup.name);
    const before = await snapshot();

    await truncate(file, Math.floor(backup.bytes * 0.6)); // cut off mid-way
    await expect(restoreBackup({ databaseUrl: TEST_DATABASE_URL, file, dir })).rejects.toThrow(/pg_restore/);
    expect(await snapshot()).toEqual(before);

    const junk = path.join(dir, 'clinic-2026-01-01_0300.dump');
    await writeFile(junk, 'not a backup');
    await expect(restoreBackup({ databaseUrl: TEST_DATABASE_URL, file: junk, dir })).rejects.toThrow(/pg_restore/);
    expect(await snapshot()).toEqual(before);
  });

  it('a failure half-way through loading rolls everything back', async () => {
    await seed();
    const backup = await runBackup({ databaseUrl: TEST_DATABASE_URL, dir, keep: 30 });
    await pool.query("update appointments set patient_name = 'تغییر بعد از پشتیبان'");
    const before = await snapshot();
    // Fails the restore after the old tables were dropped and some new ones created.
    await pool.query('create schema test_hooks');
    await pool.query(`create function test_hooks.fail_restore() returns event_trigger language plpgsql as $$
      begin
        if exists (select 1 from pg_event_trigger_ddl_commands() where object_identity = 'public.notifications') then
          raise exception 'simulated failure half-way';
        end if;
      end $$`);
    await pool.query('create event trigger fail_restore on ddl_command_end execute function test_hooks.fail_restore()');
    try {
      await expect(restoreBackup({ databaseUrl: TEST_DATABASE_URL, file: path.join(dir, backup.name), dir })).rejects.toThrow(
        /psql exited.*simulated failure/,
      );
    } finally {
      await pool.query('drop event trigger fail_restore');
      await pool.query('drop schema test_hooks cascade');
    }
    expect(await snapshot()).toEqual(before);
  });

  it('keeps the newest daily backups and never prunes the pre-restore ones', async () => {
    await seed();
    const at = (h: string) => tehran(`2026-10-${h}`);
    for (const d of ['10T03:00', '11T03:00', '12T03:00', '13T03:00']) {
      await runBackup({ databaseUrl: TEST_DATABASE_URL, dir, keep: 2, now: at(d) });
    }
    await runBackup({ databaseUrl: TEST_DATABASE_URL, dir, keep: 2, prefix: 'pre-restore-', now: at('09T10:00') });
    // A leftover from a backup cut off long ago is cleared; a fresh one (in progress) is not.
    const old = path.join(dir, 'clinic-2026-10-01_0300.dump.123.partial');
    const fresh = path.join(dir, 'clinic-2026-10-14_0300.dump.456.partial');
    await writeFile(old, '');
    await writeFile(fresh, '');
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    await utimes(old, twoDaysAgo, twoDaysAgo);
    await runBackup({ databaseUrl: TEST_DATABASE_URL, dir, keep: 2, now: at('14T03:00') });

    expect((await readdir(dir)).sort()).toEqual([
      'clinic-2026-10-13_0300.dump',
      'clinic-2026-10-14_0300.dump',
      'clinic-2026-10-14_0300.dump.456.partial',
      'pre-restore-2026-10-09_1000.dump',
    ]);
    expect((await listBackups(dir)).map((b) => b.name)).toContain('pre-restore-2026-10-09_1000.dump');
    await rm(dir, { recursive: true, force: true });
  });

  it('a backup that cannot be written leaves no file that looks complete', async () => {
    const bad = new URL(TEST_DATABASE_URL);
    bad.pathname = '/no_such_database_test';
    await expect(runBackup({ databaseUrl: bad.toString(), dir, keep: 30 })).rejects.toThrow(/pg_dump exited/);
    expect(await readdir(dir)).toEqual([]);
  });
});

describe('backup details', () => {
  it('keeps the password off the command line', () => {
    const t = pgTarget('postgres://clinic:s%40cret@db.internal:5432/clinic?sslmode=require');
    expect(t.uri).toBe('postgres://clinic@db.internal:5432/clinic?sslmode=require');
    expect(t.env.PGPASSWORD).toBe('s@cret');
  });

  it('names files by the clinic’s local time and accepts only its own names', () => {
    expect(backupFileName('clinic-', tehran('2026-10-16T03:00'))).toBe('clinic-2026-10-16_0300.dump');
    expect(isBackupName('clinic-2026-10-16_0300-2.dump')).toBe(true);
    for (const bad of ['../clinic-2026-10-16_0300.dump', 'clinic-2026-10-16_0300.dump.1.partial', 'x.dump', '.env']) {
      expect(isBackupName(bad)).toBe(false);
    }
  });

  it('drops only settings the server does not know, and never touches table data', () => {
    const sql = [
      'SET statement_timeout = 0;',
      'SET transaction_timeout = 0;',
      "SET client_encoding = 'UTF8';",
      'COPY public.appointments (id, patient_name) FROM stdin;',
      'SET transaction_timeout = 0;\tنام عجیب',
      '\\.',
      'SET default_table_access_method = heap;',
    ].join('\n');
    const known = new Set(['statement_timeout', 'client_encoding', 'default_table_access_method']);
    expect(dropUnknownSettings(sql, known).split('\n')).toEqual([
      'SET statement_timeout = 0;',
      "SET client_encoding = 'UTF8';",
      'COPY public.appointments (id, patient_name) FROM stdin;',
      'SET transaction_timeout = 0;\tنام عجیب',
      '\\.',
      'SET default_table_access_method = heap;',
    ]);
  });

  it('runs daily at the configured hour of the clinic’s day', () => {
    expect(nextRunAt(tehran('2026-10-16T02:59'), 3)).toEqual(tehran('2026-10-16T03:00'));
    expect(nextRunAt(tehran('2026-10-16T03:00'), 3)).toEqual(tehran('2026-10-17T03:00'));
    expect(nextRunAt(tehran('2026-10-16T23:30'), 0)).toEqual(tehran('2026-10-17T00:00'));
  });

  it('catches up after start-up when the newest daily backup is more than a day old', () => {
    const now = tehran('2026-10-16T12:00');
    const b = (name: string, at: string) => ({ name, bytes: 1, at: tehran(at) });
    expect(needsCatchUp([], now)).toBe(true);
    expect(needsCatchUp([b('clinic-2026-10-16_0300.dump', '2026-10-16T03:00')], now)).toBe(false);
    expect(needsCatchUp([b('clinic-2026-10-15_0300.dump', '2026-10-15T03:00')], now)).toBe(true);
    // A pre-restore backup is not a daily one.
    expect(needsCatchUp([b('pre-restore-2026-10-16_1000.dump', '2026-10-16T10:00')], now)).toBe(true);
  });
});
