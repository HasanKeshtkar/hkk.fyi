// The secretary is notified of the doctor's changes, in the same transaction as the change.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  cancelAppointment,
  createAppointment,
  SlotTakenError,
  updateAppointment,
  VersionConflictError,
} from '../../src/server/appointments/service.js';
import type { Notification, User } from '../../src/server/db/schema.js';
import { listUnread, markRead } from '../../src/server/notifications/service.js';
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

const SAT_1400 = tehran('2026-10-17T14:00:00');
const SAT_1500 = tehran('2026-10-17T15:00:00');

async function count(): Promise<number> {
  const { rows } = await pool.query('select count(*)::int as n from notifications');
  return rows[0].n;
}

describe('recording', () => {
  it('each of the doctor’s changes notifies the secretary, with before/after', async () => {
    const seen: Notification[] = [];
    const hooks = { onNotification: (n: Notification) => seen.push(n) };
    const a = await createAppointment(db, doctor, { startAt: SAT_1400, patientName: 'مریم', patientPhone: '09121234567' }, hooks);
    const b = await updateAppointment(db, doctor, a.id, 1, { startAt: SAT_1500 }, hooks);
    await cancelAppointment(db, doctor, a.id, b.version, hooks);

    expect(seen.map((n) => [n.type, n.recipientId, n.appointmentId])).toEqual([
      ['created', secretary.id, a.id],
      ['updated', secretary.id, a.id],
      ['cancelled', secretary.id, a.id],
    ]);
    expect(seen[0]!.payload).toEqual({
      by: doctor.id,
      before: null,
      after: { startAt: SAT_1400.toISOString(), patientName: 'مریم', patientPhone: '09121234567' },
    });
    expect(seen[1]!.payload).toMatchObject({
      before: { startAt: SAT_1400.toISOString() },
      after: { startAt: SAT_1500.toISOString() },
    });
    expect(await count()).toBe(3);
  });

  it('the secretary’s own changes notify no one', async () => {
    const seen: Notification[] = [];
    const a = await createAppointment(
      db,
      secretary,
      { startAt: SAT_1400, patientName: 'مریم', patientPhone: '09121234567' },
      { onNotification: (n) => seen.push(n) },
    );
    await cancelAppointment(db, secretary, a.id, 1, { onNotification: (n) => seen.push(n) });
    expect(seen).toEqual([]);
    expect(await count()).toBe(0);
  });

  it('a refused or no-op change leaves no notification', async () => {
    const seen: Notification[] = [];
    const hooks = { onNotification: (n: Notification) => seen.push(n) };
    const a = await createAppointment(db, secretary, { startAt: SAT_1400, patientName: 'مریم', patientPhone: '09121234567' });
    await expect(
      createAppointment(db, doctor, { startAt: SAT_1400, patientName: 'دیگری', patientPhone: '09121234567' }, hooks),
    ).rejects.toBeInstanceOf(SlotTakenError);
    await expect(updateAppointment(db, doctor, a.id, 7, { patientName: 'x' }, hooks)).rejects.toBeInstanceOf(
      VersionConflictError,
    );
    await updateAppointment(db, doctor, a.id, 1, { patientName: 'مریم' }, hooks); // same name: no-op
    expect(seen).toEqual([]);
    expect(await count()).toBe(0);
  });
});

describe('unread list', () => {
  it('lists newest first, counts, and marks read by id or all, only for the recipient', async () => {
    const ids: string[] = [];
    for (const [i, t] of ['14:00', '14:30', '15:00'].entries()) {
      await createAppointment(
        db,
        doctor,
        { startAt: tehran(`2026-10-17T${t}:00`), patientName: `بیمار ${i}`, patientPhone: '09121234567' },
        { onNotification: (n) => ids.push(n.id) },
      );
    }
    const list = await listUnread(db, secretary.id);
    expect(list.count).toBe(3);
    expect(list.items.map((n) => n.payload.after.patientName)).toEqual(['بیمار 2', 'بیمار 1', 'بیمار 0']);
    expect((await listUnread(db, doctor.id)).count).toBe(0);

    expect(await markRead(db, doctor.id, [ids[0]!])).toEqual([]); // not the doctor's to mark
    expect(await markRead(db, secretary.id, [ids[0]!])).toEqual([ids[0]]);
    expect(await markRead(db, secretary.id, [ids[0]!])).toEqual([]); // already read
    expect((await listUnread(db, secretary.id)).count).toBe(2);
    expect((await markRead(db, secretary.id, 'all')).sort()).toEqual([ids[1], ids[2]].sort());
    expect((await listUnread(db, secretary.id)).count).toBe(0);
  });
});
