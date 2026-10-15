import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { User } from '../../src/server/db/schema.js';
import { openTestDb, resetData } from '../helpers/db.js';
import { call, login, makeApp, setRealPasswords } from '../helpers/app.js';

const { pool, db } = openTestDb(30);
let app: FastifyInstance;
let doctor: User;
let secretary: User;
let doc: string; // doctor's cookie
let sec: string; // secretary's cookie

beforeEach(async () => {
  ({ doctor, secretary } = await resetData(pool, db));
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

const SAT_1400 = '2026-10-17T14:00:00+03:30';
const SAT_1430 = '2026-10-17T14:30:00+03:30';

const create = (cookie: string, startAt: string, patientName = 'علی رضایی', patientPhone = '09121234567') =>
  call(app, cookie, 'POST', '/api/appointments', { startAt, patientName, patientPhone });

describe('POST /api/appointments', () => {
  it('creates, normalizing name and phone', async () => {
    const res = await create(sec, SAT_1400, ' علي  رضايي ', '۰۹۱۲-۱۲۳-۴۵۶۷');
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      startAt: '2026-10-17T10:30:00.000Z',
      patientName: 'علی رضایی',
      patientPhone: '09121234567',
      status: 'scheduled',
      version: 1,
      createdBy: secretary.id,
      updatedBy: secretary.id,
    });
  });

  it('accepts the same instant written in UTC', async () => {
    expect((await create(doc, '2026-10-17T10:30:00Z')).statusCode).toBe(201);
    expect((await create(doc, SAT_1400)).statusCode).toBe(409);
  });

  it.each([
    [{ startAt: '2026-10-17T14:10:00+03:30' }, 'startAt'],
    [{ startAt: 'tomorrow' }, 'startAt'],
    [{ startAt: '2026-10-17T14:00:00' }, 'startAt'], // no offset: ambiguous, refused
    [{ patientName: '   ' }, 'patientName'],
    [{ patientPhone: '02112345678' }, 'patientPhone'],
    [{ patientPhone: 12 }, 'patientPhone'],
  ])('rejects %j with 400 naming the field', async (override, field) => {
    const res = await call(app, doc, 'POST', '/api/appointments', {
      startAt: SAT_1400,
      patientName: 'علی',
      patientPhone: '09121234567',
      ...override,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'validation', field });
  });

  it('rejects outside the working hours (422) with the reason', async () => {
    const outside = await create(doc, '2026-10-17T19:00:00+03:30');
    expect(outside.statusCode).toBe(422);
    expect(outside.json()).toEqual({ error: 'outside_hours' });
    const closed = await create(doc, '2026-10-22T15:00:00+03:30'); // Thursday
    expect(closed.statusCode).toBe(422);
    expect(closed.json()).toEqual({ error: 'day_closed' });
  });

  it('refuses a taken slot (409) and returns who holds it', async () => {
    const first = (await create(doc, SAT_1400)).json();
    const res = await create(sec, SAT_1400, 'دیگری', '09350000000');
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'slot_taken', existing: first });
  });

  it('20 simultaneous bookings of one slot over HTTP: exactly one 201', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => create(i % 2 ? doc : sec, SAT_1430, `بیمار ${i}`)),
    );
    const codes = results.map((r) => r.statusCode).sort();
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(19);
    const winner = results.find((r) => r.statusCode === 201)!.json();
    for (const r of results.filter((x) => x.statusCode === 409)) expect(r.json().existing.id).toBe(winner.id);
  });

  it('refuses a malformed JSON body with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/appointments',
      headers: { cookie: doc, origin: 'https://clinic.test', 'content-type': 'application/json' },
      payload: '{"patientName": "علی',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'bad_request' });
  });
});

describe('PATCH /api/appointments/:id', () => {
  it('edits and bumps the version', async () => {
    const a = (await create(doc, SAT_1400)).json();
    const res = await call(app, sec, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientPhone: '+98 935 123 4567' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ patientPhone: '09351234567', version: 2, updatedBy: secretary.id });
  });

  it('a stale version gets 409 with the fresh appointment and who changed it', async () => {
    const a = (await create(sec, SAT_1400)).json();
    await call(app, doc, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientName: 'تغییر دکتر' });
    const res = await call(app, sec, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientName: 'تغییر منشی' });
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.error).toBe('version_conflict');
    expect(body.current).toMatchObject({ patientName: 'تغییر دکتر', version: 2, updatedBy: doctor.id });
    const me = (await call(app, sec, 'GET', '/api/me')).json();
    expect(me.users.find((u: { id: string }) => u.id === body.current.updatedBy).name).toBe('دکتر تست');
  });

  it('two simultaneous edits with one version: one 200, one 409', async () => {
    const a = (await create(doc, SAT_1400)).json();
    const [x, y] = await Promise.all([
      call(app, doc, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientName: 'الف' }),
      call(app, sec, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientName: 'ب' }),
    ]);
    expect([x.statusCode, y.statusCode].sort()).toEqual([200, 409]);
  });

  it('moves to another free slot (even another day) and frees the old one', async () => {
    const a = (await create(doc, SAT_1400)).json();
    const res = await call(app, doc, 'PATCH', `/api/appointments/${a.id}`, {
      version: 1,
      startAt: '2026-10-19T08:00:00+03:30',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().startAt).toBe('2026-10-19T04:30:00.000Z');
    expect((await create(sec, SAT_1400)).statusCode).toBe(201);
  });

  it('refuses a move into a taken slot, a closed day, or outside hours', async () => {
    const a = (await create(doc, SAT_1400)).json();
    const b = (await create(doc, SAT_1430)).json();
    const taken = await call(app, doc, 'PATCH', `/api/appointments/${a.id}`, { version: 1, startAt: SAT_1430 });
    expect(taken.statusCode).toBe(409);
    expect(taken.json()).toMatchObject({ error: 'slot_taken', existing: { id: b.id } });
    const closed = await call(app, doc, 'PATCH', `/api/appointments/${a.id}`, {
      version: 1,
      startAt: '2026-10-23T10:00:00+03:30',
    });
    expect(closed.json()).toEqual({ error: 'day_closed' });
  });

  it('400 when nothing to change; 404 for unknown or malformed id', async () => {
    const a = (await create(doc, SAT_1400)).json();
    expect((await call(app, doc, 'PATCH', `/api/appointments/${a.id}`, { version: 1 })).statusCode).toBe(400);
    expect((await call(app, doc, 'PATCH', `/api/appointments/${a.id}`, { patientName: 'x' })).json()).toEqual({
      error: 'validation',
      field: 'version',
    });
    expect(
      (await call(app, doc, 'PATCH', '/api/appointments/00000000-0000-4000-8000-000000000000', { version: 1, patientName: 'x' }))
        .statusCode,
    ).toBe(404);
    expect((await call(app, doc, 'PATCH', '/api/appointments/nope', { version: 1, patientName: 'x' })).statusCode).toBe(404);
  });
});

describe('POST /api/appointments/:id/cancel', () => {
  it('cancels, then refuses to cancel or edit again', async () => {
    const a = (await create(doc, SAT_1400)).json();
    const res = await call(app, sec, 'POST', `/api/appointments/${a.id}/cancel`, { version: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'cancelled', version: 2, updatedBy: secretary.id });

    const again = await call(app, doc, 'POST', `/api/appointments/${a.id}/cancel`, { version: 2 });
    expect(again.statusCode).toBe(409);
    expect(again.json()).toMatchObject({ error: 'cancelled', current: { status: 'cancelled' } });
    expect((await create(doc, SAT_1400)).statusCode).toBe(201); // slot is free again
  });

  it('refuses a stale version', async () => {
    const a = (await create(doc, SAT_1400)).json();
    await call(app, doc, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientName: 'تغییر' });
    const res = await call(app, sec, 'POST', `/api/appointments/${a.id}/cancel`, { version: 1 });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('version_conflict');
  });
});
