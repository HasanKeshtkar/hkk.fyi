// Booking, editing, moving, cancelling: the rules hold on the server whatever the phone sends.
import { beforeEach, describe, expect, it } from 'vitest';
import { at, book, call, login, reset, sql } from '../helpers/worker';

let doc: string;
let sec: string;
let ids: { doctor: { id: string }; secretary: { id: string } };

beforeEach(async () => {
  ids = await reset();
  doc = await login('doctor');
  sec = await login('secretary');
});

describe('booking', () => {
  it('books a slot, normalizing Persian digits and spacing', async () => {
    const res = await book(sec, '14:00', '  مريم   احمدي ', '۰۹۱۲ ۱۲۳ ۴۵۶۷');
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      startAt: at('14:00'),
      patientName: 'مریم احمدی',
      patientPhone: '09121234567',
      status: 'scheduled',
      version: 1,
      createdBy: ids.secretary.id,
    });
  });

  it.each([
    [{ patientPhone: '12345' }, 'patientPhone'],
    [{ patientName: '   ' }, 'patientName'],
    [{ startAt: '2026-10-17T10:45:00.000Z' }, 'startAt'],
  ])('refuses invalid input %j', async (over, field) => {
    const res = await call(doc, 'POST', '/api/appointments', { startAt: at('14:00'), patientName: 'x', patientPhone: '09121234567', ...over });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'validation', field });
  });

  it('refuses a slot outside the hours or on a closed day', async () => {
    expect((await book(doc, '13:30')).body).toEqual({ error: 'outside_hours' });
    expect((await book(doc, '19:00')).status).toBe(422); // the last slot starts 18:30
    expect((await book(doc, '14:00', 'x', '09121234567', '2026-10-15')).body).toEqual({ error: 'day_closed' }); // Thursday
  });

  it('one live appointment per slot: the second is told who holds it', async () => {
    const first = await book(doc, '14:00');
    const second = await book(sec, '14:00', 'علی');
    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({ error: 'slot_taken', existing: { id: first.body.id, patientName: 'مریم احمدی' } });
  });

  it('the database itself refuses a second live appointment in a slot, and a start off the half hour', async () => {
    await book(doc, '14:00');
    const insert = (start: number) =>
      sql(
        "INSERT INTO appointments (id, start_at, patient_name, patient_phone, status, created_by, updated_by, version, created_at, updated_at) VALUES (?, ?, 'x', '09121234567', 'scheduled', ?, ?, 1, 0, 0)",
        crypto.randomUUID(),
        start,
        ids.doctor.id,
        ids.doctor.id,
      );
    await expect(insert(new Date(at('14:00')).getTime())).rejects.toThrow();
    await expect(insert(new Date(at('15:00')).getTime() + 60_000)).rejects.toThrow();
  });
});

describe('editing, moving, cancelling', () => {
  it('edits and moves with the version, and audits each change with before and after', async () => {
    const a = (await book(sec, '14:00')).body;
    const edited = await call(sec, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientName: 'مریم رضایی' });
    expect(edited.body).toMatchObject({ patientName: 'مریم رضایی', version: 2 });
    const moved = await call(doc, 'PATCH', `/api/appointments/${a.id}`, { version: 2, startAt: at('16:30') });
    expect(moved.body).toMatchObject({ startAt: at('16:30'), version: 3, updatedBy: ids.doctor.id });
    const cancelled = await call(doc, 'POST', `/api/appointments/${a.id}/cancel`, { version: 3 });
    expect(cancelled.body).toMatchObject({ status: 'cancelled', version: 4 });
    // The slot is free again.
    expect((await book(sec, '16:30', 'علی')).status).toBe(201);

    const audit = await sql<{ action: string; before: string | null; after: string }>(
      "SELECT action, before, after FROM audit_log WHERE entity = 'appointment' AND entity_id = ? ORDER BY id",
      a.id,
    );
    expect(audit.map((r) => r.action)).toEqual(['create', 'update', 'update', 'cancel']);
    expect(JSON.parse(audit[2]!.before!)).toMatchObject({ startAt: at('14:00'), version: 2 });
    expect(JSON.parse(audit[2]!.after)).toMatchObject({ startAt: at('16:30'), version: 3 });
  });

  it('a stale edit is refused with the current data and who changed it', async () => {
    const a = (await book(sec, '14:00')).body;
    await call(doc, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientPhone: '09351234567' });
    const stale = await call(sec, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientName: 'دیگر' });
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ error: 'version_conflict', current: { version: 2, patientPhone: '09351234567', updatedBy: ids.doctor.id } });
  });

  it('a cancelled appointment cannot be changed; an unknown one is not found', async () => {
    const a = (await book(sec, '14:00')).body;
    await call(sec, 'POST', `/api/appointments/${a.id}/cancel`, { version: 1 });
    expect((await call(doc, 'PATCH', `/api/appointments/${a.id}`, { version: 2, patientName: 'x' })).body).toMatchObject({ error: 'cancelled' });
    expect((await call(doc, 'POST', '/api/appointments/00000000-0000-4000-8000-000000000000/cancel', { version: 1 })).status).toBe(404);
    expect((await call(doc, 'POST', '/api/appointments/not-a-uuid/cancel', { version: 1 })).status).toBe(404);
  });

  it('moving into a taken slot is refused; saving without a change changes nothing', async () => {
    const a = (await book(sec, '14:00')).body;
    const b = (await book(sec, '15:00', 'علی')).body;
    const res = await call(doc, 'PATCH', `/api/appointments/${a.id}`, { version: 1, startAt: at('15:00') });
    expect(res.body).toMatchObject({ error: 'slot_taken', existing: { id: b.id } });
    const same = await call(doc, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientName: 'مریم احمدی' });
    expect(same.body.version).toBe(1);
  });

  it('shorter hours never delete an appointment: it is flagged, and its details can still be corrected', async () => {
    const a = (await book(sec, '18:30')).body;
    await call(doc, 'PUT', '/api/schedule/weekly/6', { isOpen: true, startTime: '14:00', endTime: '18:00', version: 1 });
    const day = (await call(sec, 'GET', '/api/day?date=2026-10-17')).body;
    expect(day.slots).toHaveLength(8);
    expect(day.appointments).toEqual([expect.objectContaining({ id: a.id, withinHours: false })]);
    expect((await call(sec, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientName: 'تصحیح' })).status).toBe(200);
    expect((await call(sec, 'PATCH', `/api/appointments/${a.id}`, { version: 2, startAt: at('18:30', '2026-10-18') })).status).toBe(200);
  });
});

describe('at the same moment', () => {
  it('ten people booking one slot at once: exactly one wins', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => book(i % 2 ? doc : sec, '14:00', `بیمار ${i}`)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409 && r.body.error === 'slot_taken')).toHaveLength(9);
    expect(await sql("SELECT id FROM appointments WHERE status = 'scheduled'")).toHaveLength(1);
  });

  it('two edits of one version at once: one wins, the other gets the winner', async () => {
    const a = (await book(sec, '14:00')).body;
    const [x, y] = await Promise.all([
      call(doc, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientName: 'از دکتر' }),
      call(sec, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientName: 'از منشی' }),
    ]);
    const statuses = [x.status, y.status].sort();
    expect(statuses).toEqual([200, 409]);
    const winner = x.status === 200 ? x.body : y.body;
    const loser = x.status === 409 ? x.body : y.body;
    expect(loser.current).toMatchObject({ version: 2, patientName: winner.patientName });
  });

  it('two moves crossing into each other’s slot: no deadlock, a clean answer each', async () => {
    const a = (await book(sec, '14:00')).body;
    const b = (await book(sec, '15:00', 'علی')).body;
    const [x, y] = await Promise.all([
      call(doc, 'PATCH', `/api/appointments/${a.id}`, { version: 1, startAt: at('15:00') }),
      call(sec, 'PATCH', `/api/appointments/${b.id}`, { version: 1, startAt: at('14:00') }),
    ]);
    expect([x.status, y.status]).toEqual([409, 409]);
  });
});
