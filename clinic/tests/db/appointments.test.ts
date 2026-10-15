import { inspect } from 'node:util';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AppointmentCancelledError,
  AppointmentNotFoundError,
  AppointmentValidationError,
  cancelAppointment,
  createAppointment,
  findActiveAt,
  SlotTakenError,
  updateAppointment,
  VersionConflictError,
} from '../../src/server/appointments/service.js';
import { DatabaseError } from '../../src/server/db/errors.js';
import type { User } from '../../src/server/db/schema.js';
import { openTestDb, resetData, tehran } from '../helpers/db.js';

const { pool, db } = openTestDb(5);
let doctor: User;
let secretary: User;

beforeEach(async () => {
  ({ doctor, secretary } = await resetData(pool, db));
});

afterAll(async () => {
  await pool.end();
});

async function auditRows(entityId: string) {
  const { rows } = await pool.query(
    `select user_id, entity, action, before, after from audit_log where entity_id = $1 order by id`,
    [entityId],
  );
  return rows;
}

const slot = tehran('2026-10-17T14:00:00');

describe('createAppointment', () => {
  it('normalizes name and phone and writes an audit row', async () => {
    const a = await createAppointment(db, secretary, {
      startAt: slot,
      patientName: '  علي   كاظمي ',
      patientPhone: '۰۹۱۲ ۱۲۳ ۴۵۶۷',
    });
    expect(a).toMatchObject({
      patientName: 'علی کاظمی',
      patientPhone: '09121234567',
      status: 'scheduled',
      version: 1,
      createdBy: secretary.id,
      updatedBy: secretary.id,
    });
    expect(a.startAt.toISOString()).toBe('2026-10-17T10:30:00.000Z');
    expect(await auditRows(a.id)).toEqual([
      {
        user_id: secretary.id,
        entity: 'appointment',
        action: 'create',
        before: null,
        after: {
          startAt: '2026-10-17T10:30:00.000Z',
          patientName: 'علی کاظمی',
          patientPhone: '09121234567',
          status: 'scheduled',
          version: 1,
        },
      },
    ]);
  });

  it.each([
    ['startAt', { startAt: tehran('2026-10-17T14:10:00') }],
    ['startAt', { startAt: new Date('invalid') }],
    ['patientName', { patientName: '   ' }],
    ['patientPhone', { patientPhone: '02112345678' }],
  ] as const)('rejects invalid %s before touching the database', async (field, override) => {
    const err = await createAppointment(db, doctor, {
      startAt: slot,
      patientName: 'علی',
      patientPhone: '09121234567',
      ...override,
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppointmentValidationError);
    expect((err as AppointmentValidationError).field).toBe(field);
    const { rows } = await pool.query('select count(*)::int as n from appointments');
    expect(rows[0].n).toBe(0);
  });

  it('refuses a taken slot and reports who holds it', async () => {
    const first = await createAppointment(db, doctor, { startAt: slot, patientName: 'اول', patientPhone: '09121234567' });
    const err = await createAppointment(db, secretary, {
      startAt: slot,
      patientName: 'دوم',
      patientPhone: '09351234567',
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SlotTakenError);
    expect((err as SlotTakenError).existing).toMatchObject({ id: first.id, patientName: 'اول', createdBy: doctor.id });
  });
});

describe('updateAppointment', () => {
  it('edits name/phone, bumps the version and audits before/after', async () => {
    const a = await createAppointment(db, doctor, { startAt: slot, patientName: 'علی', patientPhone: '09121234567' });
    const b = await updateAppointment(db, secretary, a.id, 1, { patientName: 'علی رضایی', patientPhone: '+989351234567' });
    expect(b).toMatchObject({ patientName: 'علی رضایی', patientPhone: '09351234567', version: 2, updatedBy: secretary.id });
    expect(b.updatedAt.getTime()).toBeGreaterThanOrEqual(a.updatedAt.getTime());
    const audit = await auditRows(a.id);
    expect(audit[1]).toMatchObject({
      user_id: secretary.id,
      action: 'update',
      before: { patientName: 'علی', patientPhone: '09121234567', version: 1 },
      after: { patientName: 'علی رضایی', patientPhone: '09351234567', version: 2 },
    });
  });

  it('moves to a free slot and frees the old one', async () => {
    const a = await createAppointment(db, doctor, { startAt: slot, patientName: 'علی', patientPhone: '09121234567' });
    const target = tehran('2026-10-18T15:30:00');
    const moved = await updateAppointment(db, doctor, a.id, 1, { startAt: target });
    expect(moved.startAt.getTime()).toBe(target.getTime());
    expect(moved.version).toBe(2);
    expect(await findActiveAt(db, slot)).toBeNull();
    await createAppointment(db, secretary, { startAt: slot, patientName: 'جدید', patientPhone: '09121234567' });
    const audit = await auditRows(a.id);
    expect(audit[1].before.startAt).toBe(slot.toISOString());
    expect(audit[1].after.startAt).toBe(target.toISOString());
  });

  it('refuses a move into a taken slot and leaves the appointment unchanged', async () => {
    const a = await createAppointment(db, doctor, { startAt: slot, patientName: 'علی', patientPhone: '09121234567' });
    const target = tehran('2026-10-17T14:30:00');
    const b = await createAppointment(db, doctor, { startAt: target, patientName: 'رضا', patientPhone: '09121234567' });
    const err = await updateAppointment(db, doctor, a.id, 1, { startAt: target, patientName: 'تغییر' }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(SlotTakenError);
    expect((err as SlotTakenError).existing?.id).toBe(b.id);
    const { rows } = await pool.query('select patient_name, version from appointments where id = $1', [a.id]);
    expect(rows[0]).toEqual({ patient_name: 'علی', version: 1 });
    expect(await auditRows(a.id)).toHaveLength(1);
  });

  it('a no-op edit does not bump the version or write an audit row', async () => {
    const a = await createAppointment(db, doctor, { startAt: slot, patientName: 'علی', patientPhone: '09121234567' });
    const same = await updateAppointment(db, doctor, a.id, 1, {
      patientName: ' علی ',
      patientPhone: '۰۹۱۲۱۲۳۴۵۶۷',
      startAt: new Date(slot),
    });
    expect(same.version).toBe(1);
    expect(await auditRows(a.id)).toHaveLength(1);
  });

  it('refuses a stale version with the current row and who changed it', async () => {
    const a = await createAppointment(db, doctor, { startAt: slot, patientName: 'علی', patientPhone: '09121234567' });
    await updateAppointment(db, doctor, a.id, 1, { patientName: 'دکتر عوض کرد' });
    const err = await updateAppointment(db, secretary, a.id, 1, { patientName: 'منشی عوض کرد' }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(VersionConflictError);
    expect((err as VersionConflictError).current).toMatchObject({
      patientName: 'دکتر عوض کرد',
      version: 2,
      updatedBy: doctor.id,
    });
  });

  it('refuses an unknown id', async () => {
    const err = await updateAppointment(db, doctor, '00000000-0000-4000-8000-000000000000', 1, {
      patientName: 'x',
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppointmentNotFoundError);
  });
});

describe('cancelAppointment', () => {
  it('cancels, bumps the version, audits, and frees the slot', async () => {
    const a = await createAppointment(db, doctor, { startAt: slot, patientName: 'علی', patientPhone: '09121234567' });
    const c = await cancelAppointment(db, secretary, a.id, 1);
    expect(c).toMatchObject({ status: 'cancelled', version: 2, updatedBy: secretary.id });
    expect(await findActiveAt(db, slot)).toBeNull();
    const audit = await auditRows(a.id);
    expect(audit[1]).toMatchObject({
      action: 'cancel',
      before: { status: 'scheduled' },
      after: { status: 'cancelled', version: 2 },
    });
  });

  it('refuses to edit or re-cancel a cancelled appointment', async () => {
    const a = await createAppointment(db, doctor, { startAt: slot, patientName: 'علی', patientPhone: '09121234567' });
    await cancelAppointment(db, doctor, a.id, 1);
    const edit = await updateAppointment(db, doctor, a.id, 2, { patientName: 'x' }).catch((e: unknown) => e);
    expect(edit).toBeInstanceOf(AppointmentCancelledError);
    const again = await cancelAppointment(db, doctor, a.id, 2).catch((e: unknown) => e);
    expect(again).toBeInstanceOf(AppointmentCancelledError);
    expect((again as AppointmentCancelledError).current.status).toBe('cancelled');
  });

  it('refuses a stale version', async () => {
    const a = await createAppointment(db, doctor, { startAt: slot, patientName: 'علی', patientPhone: '09121234567' });
    await updateAppointment(db, doctor, a.id, 1, { patientName: 'تغییر' });
    const err = await cancelAppointment(db, secretary, a.id, 1).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(VersionConflictError);
  });
});

describe('error hygiene: no patient data in errors, typed errors for bad input', () => {
  const name = 'مریم احمدی';
  const phone = '09121234567';

  function expectNoPatientData(err: unknown) {
    const dumps = [
      String(err),
      (err as Error).stack ?? '',
      JSON.stringify(err),
      inspect(err, { depth: 5 }),
    ].join('\n');
    expect(dumps).not.toContain('مریم');
    expect(dumps).not.toContain(phone);
  }

  it('turns a NUL in the name into a validation error on create and update', async () => {
    const err = await createAppointment(db, doctor, {
      startAt: slot,
      patientName: 'مریم\u0000 احمدی',
      patientPhone: phone,
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppointmentValidationError);
    const a = await createAppointment(db, doctor, { startAt: slot, patientName: name, patientPhone: phone });
    const upd = await updateAppointment(db, doctor, a.id, 1, { patientName: 'x\u0000' }).catch((e: unknown) => e);
    expect(upd).toBeInstanceOf(AppointmentValidationError);
  });

  it.each([new Date(Date.UTC(10000, 0, 1)), new Date(Date.UTC(1999, 11, 31, 23, 30))])(
    'rejects an out-of-range start %s as a validation error',
    async (startAt) => {
      const err = await createAppointment(db, doctor, { startAt, patientName: name, patientPhone: phone }).catch(
        (e: unknown) => e,
      );
      expect(err).toBeInstanceOf(AppointmentValidationError);
    },
  );

  it('treats a malformed id as not found', async () => {
    for (const id of ['not-a-uuid', '', "1' or '1'='1", 'ABCDEF00-0000-4000-8000-000000000000']) {
      expect(await updateAppointment(db, doctor, id, 1, { patientName: 'x' }).catch((e: unknown) => e)).toBeInstanceOf(
        AppointmentNotFoundError,
      );
      expect(await cancelAppointment(db, doctor, id, 1).catch((e: unknown) => e)).toBeInstanceOf(
        AppointmentNotFoundError,
      );
    }
  });

  it('a database failure surfaces as DatabaseError carrying only the SQLSTATE', async () => {
    const ghost = { id: '00000000-0000-4000-8000-000000000000' }; // no such user: FK violation
    const err = await createAppointment(db, ghost, { startAt: slot, patientName: name, patientPhone: phone }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(DatabaseError);
    expect(err).toMatchObject({ code: '23503', constraint: 'appointments_created_by_users_id_fk' });
    expect((err as Error).cause).toBeUndefined();
    expectNoPatientData(err);
  });

  it('domain errors expose the conflicting row to code but not to loggers or JSON', async () => {
    const a = await createAppointment(db, doctor, { startAt: slot, patientName: name, patientPhone: phone });
    const taken = await createAppointment(db, secretary, {
      startAt: slot,
      patientName: 'دیگری',
      patientPhone: '09350000000',
    }).catch((e: unknown) => e);
    expect((taken as SlotTakenError).existing?.patientName).toBe(name);
    expectNoPatientData(taken);

    await updateAppointment(db, doctor, a.id, 1, { patientName: 'مریم احمدی‌نژاد' });
    const stale = await updateAppointment(db, secretary, a.id, 1, { patientName: 'x' }).catch((e: unknown) => e);
    expect((stale as VersionConflictError).current.patientPhone).toBe(phone);
    expectNoPatientData(stale);
  });

  it('audit rows use the canonical appointment id', async () => {
    const a = await createAppointment(db, doctor, { startAt: slot, patientName: name, patientPhone: phone });
    await updateAppointment(db, doctor, a.id, 1, { patientName: 'تغییر' });
    await cancelAppointment(db, doctor, a.id, 2);
    expect((await auditRows(a.id)).map((r) => r.action)).toEqual(['create', 'update', 'cancel']);
  });
});
