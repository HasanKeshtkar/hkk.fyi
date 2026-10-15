import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { User } from '../../src/server/db/schema.js';
import { addDays, clinicToday, instantAt } from '../../src/shared/time.js';
import { openTestDb, resetData } from '../helpers/db.js';
import { call, login, makeApp, setRealPasswords } from '../helpers/app.js';

const { pool, db } = openTestDb(10);
let app: FastifyInstance;
let doctor: User;
let doc: string;
let sec: string;

const SAT = '2026-10-17';
const THU = '2026-10-22';

beforeEach(async () => {
  ({ doctor } = await resetData(pool, db));
  await setRealPasswords(pool);
  ({ app } = await makeApp(db));
  doc = await login(app, 'doctor');
  sec = await login(app, 'secretary');
});

afterEach(async () => {
  await app.close();
});

afterAll(async () => {
  await pool.end();
});

const book = (date: string, time: string, name = 'بیمار') =>
  call(app, doc, 'POST', '/api/appointments', {
    startAt: instantAt(date, time).toISOString(),
    patientName: name,
    patientPhone: '09121234567',
  });

/** Bypasses the hours check, for appointments that exist from before an hours change. */
async function insertRaw(startAt: Date, status = 'scheduled') {
  await pool.query(
    `insert into appointments (start_at, patient_name, patient_phone, status, created_by, updated_by)
     values ($1, 'قدیمی', '09121234567', $2, $3, $3)`,
    [startAt, status, doctor.id],
  );
}

const day = async (date: string, cookie = sec) => {
  const res = await call(app, cookie, 'GET', `/api/day?date=${date}`);
  expect(res.statusCode).toBe(200);
  return res.json();
};

describe('GET /api/day', () => {
  it('returns the hours, every slot, and that day’s live appointments', async () => {
    await book(SAT, '14:00', 'اول');
    await book(SAT, '18:30', 'آخر');
    await book('2026-10-18', '14:00', 'فردا');
    const cancelled = (await book(SAT, '15:00', 'لغو')).json();
    await call(app, doc, 'POST', `/api/appointments/${cancelled.id}/cancel`, { version: 1 });

    const d = await day(SAT);
    expect(d.schedule).toEqual({
      date: SAT,
      weekday: 6,
      isOpen: true,
      startTime: '14:00',
      endTime: '19:00',
      source: 'weekly',
      note: null,
    });
    expect(d.slots).toHaveLength(10);
    expect(d.slots[0]).toBe('2026-10-17T10:30:00.000Z');
    expect(d.slots[9]).toBe('2026-10-17T15:00:00.000Z');
    expect(d.appointments.map((a: { patientName: string }) => a.patientName)).toEqual(['اول', 'آخر']);
    expect(d.appointments.every((a: { withinHours: boolean }) => a.withinHours)).toBe(true);
  });

  it('cuts days at Tehran midnight, not UTC midnight', async () => {
    await insertRaw(instantAt(SAT, '23:30'));
    await insertRaw(instantAt('2026-10-18', '00:00'));
    await insertRaw(instantAt(SAT, '00:00'));
    const d = await day(SAT);
    expect(d.appointments.map((a: { startAt: string }) => a.startAt)).toEqual([
      instantAt(SAT, '00:00').toISOString(),
      instantAt(SAT, '23:30').toISOString(),
    ]);
  });

  it('shows a closed day with no slots but still lists (and flags) appointments on it', async () => {
    await insertRaw(instantAt(THU, '15:00'));
    const d = await day(THU);
    expect(d.schedule).toMatchObject({ isOpen: false, startTime: null, endTime: null });
    expect(d.slots).toEqual([]);
    expect(d.appointments).toHaveLength(1);
    expect(d.appointments[0].withinHours).toBe(false);
  });

  it('after the hours shrink, the appointment stays and is flagged', async () => {
    const late = (await book(SAT, '18:30')).json();
    const put = await call(app, sec, 'PUT', '/api/schedule/weekly/6', { isOpen: true, startTime: '14:00', endTime: '18:00', version: 1 });
    expect(put.statusCode).toBe(200);
    const d = await day(SAT);
    expect(d.slots).toHaveLength(8);
    expect(d.appointments).toHaveLength(1);
    expect(d.appointments[0]).toMatchObject({ id: late.id, withinHours: false, status: 'scheduled' });
  });

  it('reflects a date override and its note', async () => {
    await call(app, doc, 'PUT', `/api/schedule/overrides/${SAT}`, { isOpen: false, note: 'تعطیل رسمی', version: null });
    const d = await day(SAT);
    expect(d.schedule).toMatchObject({ isOpen: false, source: 'override', note: 'تعطیل رسمی' });
  });

  it.each(['', '2026-02-30', '17-10-2026', '2026-10-17%27%20or%201=1'])('rejects date=%j with 400', async (date) => {
    const res = await call(app, sec, 'GET', `/api/day?date=${date}`);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation');
  });
});

describe('schedule API (both roles may edit)', () => {
  it('GET returns the seven weekdays and only today’s and future overrides', async () => {
    const today = clinicToday();
    await pool.query(`insert into date_overrides (date, is_open) values ($1, false), ($2, false), ($3, false)`, [
      addDays(today, -1),
      today,
      addDays(today, 30),
    ]);
    const res = await call(app, sec, 'GET', '/api/schedule');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.weekly).toHaveLength(7);
    expect(body.weekly.find((w: { weekday: number }) => w.weekday === 1)).toMatchObject({
      weekday: 1,
      isOpen: true,
      startTime: '08:00',
      endTime: '12:00',
      version: 1,
    });
    expect(body.overrides.map((o: { date: string }) => o.date)).toEqual([today, addDays(today, 30)]);
  });

  it('PUT weekly as the secretary, with audit', async () => {
    const res = await call(app, sec, 'PUT', '/api/schedule/weekly/4', { isOpen: true, startTime: '09:00', endTime: '12:30', version: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ weekday: 4, isOpen: true, startTime: '09:00', endTime: '12:30', version: 2 });
    const { rows } = await pool.query(`select u.role from audit_log a join users u on u.id = a.user_id where a.entity = 'weekly_schedule'`);
    expect(rows).toEqual([{ role: 'secretary' }]);
  });

  it.each([
    ['/api/schedule/weekly/7', { isOpen: true, startTime: '09:00', endTime: '12:00', version: 1 }, 'weekday'],
    ['/api/schedule/weekly/', { isOpen: true, startTime: '09:00', endTime: '12:00', version: 1 }, 'weekday'],
    ['/api/schedule/weekly/0x6', { isOpen: true, startTime: '09:00', endTime: '12:00', version: 1 }, 'weekday'],
    ['/api/schedule/weekly/1', { isOpen: true, startTime: '09:00', endTime: '12:00' }, 'version'],
    ['/api/schedule/weekly/1', { isOpen: true, startTime: '09:15', endTime: '12:00', version: 1 }, 'startTime'],
    ['/api/schedule/weekly/1', { isOpen: true, startTime: '12:00', endTime: '09:00', version: 1 }, 'endTime'],
    ['/api/schedule/weekly/1', { isOpen: 'yes', startTime: '09:00', endTime: '12:00', version: 1 }, 'isOpen'],
  ])('PUT %s %j → 400 (%s)', async (url, body, field) => {
    const res = await call(app, doc, 'PUT', url, body);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'validation', field });
  });

  it('two people editing the same weekday: the stale save gets 409 with the saved hours and who saved them', async () => {
    const ok = await call(app, sec, 'PUT', '/api/schedule/weekly/6', { isOpen: true, startTime: '14:00', endTime: '18:00', version: 1 });
    expect(ok.statusCode).toBe(200);
    const stale = await call(app, doc, 'PUT', '/api/schedule/weekly/6', { isOpen: true, startTime: '15:00', endTime: '19:00', version: 1 });
    expect(stale.statusCode).toBe(409);
    const body = stale.json();
    expect(body.error).toBe('schedule_conflict');
    expect(body.currentSchedule).toMatchObject({ weekday: 6, endTime: '18:00', version: 2 });
    const me = (await call(app, doc, 'GET', '/api/me')).json();
    expect(me.users.find((u: { id: string }) => u.id === body.currentSchedule.updatedBy).role).toBe('secretary');
    expect((await book(SAT, '18:30')).statusCode).toBe(422); // the 18:00 close still holds
  });

  it('override: create, change, delete, and 404 when already gone', async () => {
    const url = `/api/schedule/overrides/${THU}`;
    const open = await call(app, doc, 'PUT', url, { isOpen: true, startTime: '09:00', endTime: '13:00', note: 'جبرانی', version: null });
    expect(open.statusCode).toBe(200);
    expect(open.json()).toMatchObject({ date: THU, isOpen: true, startTime: '09:00', endTime: '13:00', note: 'جبرانی', version: 1 });
    expect((await book(THU, '09:00')).statusCode).toBe(201);

    const closed = await call(app, sec, 'PUT', url, { isOpen: false, startTime: null, endTime: null, note: null, version: 1 });
    expect(closed.json()).toMatchObject({ date: THU, isOpen: false, startTime: null, endTime: null, note: null, version: 2 });
    const d = await day(THU);
    expect(d.appointments[0].withinHours).toBe(false); // the 09:00 booking survives the closure

    expect((await call(app, doc, 'DELETE', `${url}?version=1`)).statusCode).toBe(409);
    expect((await call(app, doc, 'DELETE', url)).statusCode).toBe(400); // version is required
    expect((await call(app, doc, 'DELETE', `${url}?version=2`)).statusCode).toBe(204);
    expect((await call(app, doc, 'DELETE', `${url}?version=2`)).statusCode).toBe(404);
  });
});
