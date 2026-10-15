// The server must survive the database connection dying under an in-flight write.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createAppointment, SlotTakenError, updateAppointment } from '../../src/server/appointments/service.js';
import { DatabaseError } from '../../src/server/db/errors.js';
import type { User } from '../../src/server/db/schema.js';
import { openTestDb, resetData, tehran } from '../helpers/db.js';

const { pool, db } = openTestDb(10);
const holderPool = openTestDb(2).pool; // a separate pool, so killing the service's backend cannot touch it
let doctor: User;

beforeEach(async () => {
  ({ doctor } = await resetData(pool, db));
});

afterAll(async () => {
  await pool.end();
  await holderPool.end();
});

async function waitForLockWaiter(excludePid: number): Promise<number> {
  for (let i = 0; i < 100; i++) {
    const { rows } = await holderPool.query(
      `select pid from pg_stat_activity
        where datname = current_database() and wait_event_type = 'Lock' and pid <> $1`,
      [excludePid],
    );
    if (rows[0]) return rows[0].pid;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('service transaction never blocked');
}

describe('connection lost mid-transaction', () => {
  it('rejects the write with DatabaseError and keeps the process and the pool alive', async () => {
    const uncaught: unknown[] = [];
    const onUncaught = (e: unknown) => uncaught.push(e);
    process.on('uncaughtException', onUncaught);

    const startAt = tehran('2026-10-17T14:00:00');
    const holder = await holderPool.connect();
    try {
      const { rows } = await holder.query('select pg_backend_pid() as pid');
      await holder.query('begin');
      await holder.query(
        `insert into appointments (start_at, patient_name, patient_phone, created_by, updated_by)
         values ($1, 'نگهدار', '09121234567', $2, $2)`,
        [startAt, doctor.id],
      );

      // The service's insert now waits on the holder's uncommitted index entry.
      const pending = createAppointment(db, doctor, { startAt, patientName: 'مریم', patientPhone: '09121234567' }).then(
        () => null,
        (e: unknown) => e,
      );
      const victim = await waitForLockWaiter(rows[0].pid);
      await holderPool.query('select pg_terminate_backend($1)', [victim]);

      const err = await pending;
      expect(err).toBeInstanceOf(DatabaseError);
      expect(String((err as Error).stack)).not.toContain('مریم');
      await holder.query('rollback');
    } finally {
      holder.release();
    }

    await new Promise((r) => setTimeout(r, 50)); // let any stray 'error' event fire
    process.off('uncaughtException', onUncaught);
    expect(uncaught).toEqual([]);

    // The pool replaced the dead connection; the slot is still bookable.
    const a = await createAppointment(db, doctor, { startAt, patientName: 'بعدی', patientPhone: '09121234567' });
    expect(a.version).toBe(1);
  });
});

describe('crossing moves (A→B\'s slot while B→A\'s slot)', () => {
  it('always ends in two clean SlotTakenErrors, never a raw deadlock error', async () => {
    const s1 = tehran('2026-10-17T15:00:00');
    const s2 = tehran('2026-10-17T15:30:00');
    for (let round = 0; round < 150; round++) {
      await pool.query('truncate notifications, audit_log, appointments');
      const a = await createAppointment(db, doctor, { startAt: s1, patientName: 'الف', patientPhone: '09121111111' });
      const b = await createAppointment(db, doctor, { startAt: s2, patientName: 'ب', patientPhone: '09122222222' });
      const results = await Promise.allSettled([
        updateAppointment(db, doctor, a.id, 1, { startAt: s2 }),
        updateAppointment(db, doctor, b.id, 1, { startAt: s1 }),
      ]);
      for (const r of results) {
        expect(r.status).toBe('rejected');
        expect((r as PromiseRejectedResult).reason).toBeInstanceOf(SlotTakenError);
      }
      const { rows } = await pool.query(`select id, start_at, version from appointments order by start_at`);
      expect(rows.map((r) => [r.id, r.version])).toEqual([
        [a.id, 1],
        [b.id, 1],
      ]);
    }
  });
});
