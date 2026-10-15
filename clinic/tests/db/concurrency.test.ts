// Many writers hitting the same slot / the same appointment version at the same moment:
// exactly one must win, every loser must get a clean, typed error, and the data must stay consistent.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AppointmentCancelledError,
  cancelAppointment,
  createAppointment,
  SlotTakenError,
  updateAppointment,
  VersionConflictError,
} from '../../src/server/appointments/service.js';
import { pgErrorOf } from '../../src/server/db/errors.js';
import type { Appointment, User } from '../../src/server/db/schema.js';
import { openTestDb, resetData, tehran } from '../helpers/db.js';

const N = 20;
const { pool, db } = openTestDb(N + 10);
let doctor: User;
let secretary: User;

beforeEach(async () => {
  ({ doctor, secretary } = await resetData(pool, db));
});

afterAll(async () => {
  await pool.end();
});

function split<T>(results: PromiseSettledResult<T>[]) {
  const ok = results.filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled').map((r) => r.value);
  const errors = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => r.reason);
  return { ok, errors };
}

async function activeCount(startAt: Date): Promise<number> {
  const { rows } = await pool.query(
    `select count(*)::int as n from appointments where start_at = $1 and status <> 'cancelled'`,
    [startAt],
  );
  return rows[0].n;
}

async function auditCount(action: string, entityId?: string): Promise<number> {
  const { rows } = await pool.query(
    `select count(*)::int as n from audit_log where action = $1 and ($2::text is null or entity_id = $2)`,
    [action, entityId ?? null],
  );
  return rows[0].n;
}

describe('concurrent booking of one slot', () => {
  it(`raw SQL: ${N} open transactions insert the same slot, exactly one commits`, async () => {
    const startAt = '2026-10-17 14:00:00+03:30';
    const clients = await Promise.all(Array.from({ length: N }, () => pool.connect()));
    try {
      // Every transaction is open before any insert is sent, so all N race for the index entry.
      await Promise.all(clients.map((c) => c.query('begin')));
      const results = await Promise.allSettled(
        clients.map(async (c, i) => {
          try {
            await c.query(
              `insert into appointments (start_at, patient_name, patient_phone, created_by, updated_by)
               values ($1, $2, '09121234567', $3, $3)`,
              [startAt, `بیمار ${i}`, doctor.id],
            );
            await c.query('commit');
          } catch (e) {
            await c.query('rollback');
            throw e;
          }
        }),
      );
      const { ok, errors } = split(results);
      expect(ok).toHaveLength(1);
      expect(errors).toHaveLength(N - 1);
      for (const e of errors) {
        expect(pgErrorOf(e)).toEqual({ code: '23505', constraint: 'appointments_active_slot_uq' });
      }
    } finally {
      clients.forEach((c) => c.release());
    }
    expect(await activeCount(new Date('2026-10-17T14:00:00+03:30'))).toBe(1);
  });

  it(`service: ${N} simultaneous createAppointment calls for one slot, exactly one succeeds`, async () => {
    const startAt = tehran('2026-10-17T14:30:00');
    const results = await Promise.allSettled(
      Array.from({ length: N }, (_, i) =>
        createAppointment(db, i % 2 ? doctor : secretary, {
          startAt,
          patientName: `بیمار ${i}`,
          patientPhone: `0912000${String(i).padStart(4, '0')}`,
        }),
      ),
    );
    const { ok, errors } = split(results);
    expect(ok).toHaveLength(1);
    const winner = ok[0]!;
    expect(errors).toHaveLength(N - 1);
    for (const e of errors) {
      expect(e).toBeInstanceOf(SlotTakenError);
      // Every loser is told who holds the slot, so the UI can show it.
      expect((e as SlotTakenError).existing?.id).toBe(winner.id);
      expect((e as SlotTakenError).existing?.patientName).toBe(winner.patientName);
    }
    expect(await activeCount(startAt)).toBe(1);
    expect(await auditCount('create')).toBe(1); // losers leave no audit trail behind
  });

  it('service: 8 slots × 8 racers at once, one winner per slot', async () => {
    const slots = Array.from({ length: 8 }, (_, s) => tehran(`2026-10-18T${String(14 + Math.floor(s / 2))}:${s % 2 ? '30' : '00'}:00`));
    const results = await Promise.allSettled(
      slots.flatMap((startAt) =>
        Array.from({ length: 8 }, (_, i) =>
          createAppointment(db, doctor, { startAt, patientName: `بیمار ${i}`, patientPhone: '09121234567' }),
        ),
      ),
    );
    const { ok, errors } = split(results);
    expect(ok).toHaveLength(slots.length);
    expect(new Set(ok.map((a) => a.startAt.getTime())).size).toBe(slots.length);
    expect(errors.every((e) => e instanceof SlotTakenError)).toBe(true);
    for (const s of slots) expect(await activeCount(s)).toBe(1);
  });

  it('a create and a move racing into the same free slot: exactly one wins', async () => {
    const target = tehran('2026-10-17T16:00:00');
    for (let round = 0; round < 10; round++) {
      await pool.query('truncate notifications, audit_log, appointments');
      const mover = await createAppointment(db, doctor, {
        startAt: tehran('2026-10-17T17:00:00'),
        patientName: 'جابه‌جا',
        patientPhone: '09121111111',
      });
      const results = await Promise.allSettled<Appointment>([
        createAppointment(db, secretary, { startAt: target, patientName: 'جدید', patientPhone: '09122222222' }),
        updateAppointment(db, doctor, mover.id, mover.version, { startAt: target }),
      ]);
      const { ok, errors } = split(results);
      expect(ok).toHaveLength(1);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(SlotTakenError);
      expect((errors[0] as SlotTakenError).existing?.id).toBe(ok[0]!.id);
      expect(await activeCount(target)).toBe(1);
    }
  });

  it('two appointments moved into the same free slot at once: one moves, the other stays put', async () => {
    const target = tehran('2026-10-17T18:30:00');
    const a = await createAppointment(db, doctor, {
      startAt: tehran('2026-10-17T14:00:00'),
      patientName: 'الف',
      patientPhone: '09121111111',
    });
    const b = await createAppointment(db, doctor, {
      startAt: tehran('2026-10-17T14:30:00'),
      patientName: 'ب',
      patientPhone: '09122222222',
    });
    const results = await Promise.allSettled([
      updateAppointment(db, doctor, a.id, a.version, { startAt: target }),
      updateAppointment(db, secretary, b.id, b.version, { startAt: target }),
    ]);
    const { ok, errors } = split(results);
    expect(ok).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(SlotTakenError);

    const loser = ok[0]!.id === a.id ? b : a;
    const { rows } = await pool.query(`select start_at, version from appointments where id = $1`, [loser.id]);
    expect(rows[0].start_at.getTime()).toBe(loser.startAt.getTime());
    expect(rows[0].version).toBe(1); // the failed move was rolled back entirely
    expect(await activeCount(target)).toBe(1);
  });

  it('after a cancel frees the slot, a new race for it again has exactly one winner', async () => {
    const startAt = tehran('2026-10-19T08:00:00');
    const first = await createAppointment(db, doctor, { startAt, patientName: 'اول', patientPhone: '09121234567' });
    await cancelAppointment(db, secretary, first.id, first.version);
    const results = await Promise.allSettled(
      Array.from({ length: N }, (_, i) =>
        createAppointment(db, secretary, { startAt, patientName: `بیمار ${i}`, patientPhone: '09121234567' }),
      ),
    );
    const { ok } = split(results);
    expect(ok).toHaveLength(1);
    expect(await activeCount(startAt)).toBe(1);
  });
});

describe('concurrent edits of one appointment (optimistic concurrency)', () => {
  it(`${N} simultaneous edits with the same version: one applies, the rest get the fresh row`, async () => {
    const appt = await createAppointment(db, doctor, {
      startAt: tehran('2026-10-17T15:00:00'),
      patientName: 'اصلی',
      patientPhone: '09121234567',
    });
    const results = await Promise.allSettled(
      Array.from({ length: N }, (_, i) =>
        updateAppointment(db, i % 2 ? doctor : secretary, appt.id, appt.version, { patientName: `ویرایش ${i}` }),
      ),
    );
    const { ok, errors } = split(results);
    expect(ok).toHaveLength(1);
    const winner = ok[0]!;
    expect(winner.version).toBe(2);
    expect(errors).toHaveLength(N - 1);
    for (const e of errors) {
      expect(e).toBeInstanceOf(VersionConflictError);
      const current = (e as VersionConflictError).current;
      expect(current.version).toBe(2);
      expect(current.patientName).toBe(winner.patientName);
      expect(current.updatedBy).toBe(winner.updatedBy); // lets the UI name who changed it
    }
    const { rows } = await pool.query(`select patient_name, version from appointments where id = $1`, [appt.id]);
    expect(rows[0]).toEqual({ patient_name: winner.patientName, version: 2 });
    expect(await auditCount('update', appt.id)).toBe(1);
  });

  it('cancel racing an edit on the same version: exactly one applies', async () => {
    for (let round = 0; round < 10; round++) {
      await pool.query('truncate notifications, audit_log, appointments');
      const appt = await createAppointment(db, doctor, {
        startAt: tehran('2026-10-17T15:30:00'),
        patientName: 'اصلی',
        patientPhone: '09121234567',
      });
      const results = await Promise.allSettled<Appointment>([
        cancelAppointment(db, secretary, appt.id, appt.version),
        updateAppointment(db, doctor, appt.id, appt.version, { patientPhone: '09351234567' }),
      ]);
      const { ok, errors } = split(results);
      expect(ok).toHaveLength(1);
      expect(errors).toHaveLength(1);
      const err = errors[0];
      if (ok[0]!.status === 'cancelled') {
        // The edit either saw the bumped version or the cancelled status; both are refusals.
        expect(err instanceof AppointmentCancelledError || err instanceof VersionConflictError).toBe(true);
      } else {
        expect(err).toBeInstanceOf(VersionConflictError);
      }
      const { rows } = await pool.query(`select version from appointments where id = $1`, [appt.id]);
      expect(rows[0].version).toBe(2);
    }
  });

  it('sequential edits each with the version they read all apply', async () => {
    let appt = await createAppointment(db, doctor, {
      startAt: tehran('2026-10-17T16:30:00'),
      patientName: 'اصلی',
      patientPhone: '09121234567',
    });
    for (let i = 0; i < 5; i++) {
      appt = await updateAppointment(db, i % 2 ? doctor : secretary, appt.id, appt.version, { patientName: `نسخه ${i}` });
    }
    expect(appt.version).toBe(6);
    expect(appt.patientName).toBe('نسخه 4');
  });
});
