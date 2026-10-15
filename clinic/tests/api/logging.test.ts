// "No patient data in logs": drive every kind of request that carries a name/phone, including
// failures, and check that nothing the app logged contains them (or the password / session token).
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openTestDb, resetData } from '../helpers/db.js';
import { call, login, makeApp, PASSWORDS, setRealPasswords, TEST_ORIGIN } from '../helpers/app.js';

const { pool, db } = openTestDb(10);
let app: FastifyInstance;
let logs: string[];

const NAME = 'شهرزاد نمونه‌ای';
const PHONE = '09127654321';
const PHONE_FA = '۰۹۱۲۷۶۵۴۳۲۱';

beforeAll(async () => {
  await resetData(pool, db);
  await setRealPasswords(pool);
  ({ app, logs } = await makeApp(db));
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('logs', () => {
  it('never contain patient names, phones, passwords or session tokens', async () => {
    const cookie = await login(app, 'doctor');
    const token = cookie.split('=')[1]!;
    const payload = { startAt: '2026-10-17T14:00:00+03:30', patientName: NAME, patientPhone: PHONE_FA };

    const created = (await call(app, cookie, 'POST', '/api/appointments', payload)).json();
    await call(app, cookie, 'POST', '/api/appointments', payload); // 409 slot_taken (echoes the holder)
    await call(app, cookie, 'POST', '/api/appointments', { ...payload, startAt: '2026-10-22T15:00:00+03:30' }); // 422
    await call(app, cookie, 'POST', '/api/appointments', { ...payload, patientName: `${NAME}\u0000` }); // 400
    await call(app, cookie, 'PATCH', `/api/appointments/${created.id}`, { version: 1, patientName: `${NAME} دوم` });
    await call(app, cookie, 'PATCH', `/api/appointments/${created.id}`, { version: 1, patientName: NAME }); // 409 version
    await app.inject({
      method: 'POST',
      url: '/api/appointments',
      headers: { cookie, origin: TEST_ORIGIN, 'content-type': 'application/json' },
      payload: `{"patientName":"${NAME}","patientPhone":"${PHONE}"`, // malformed JSON quoting the data
    });
    await app.inject({
      method: 'POST',
      url: '/api/appointments',
      headers: { cookie, origin: TEST_ORIGIN, 'content-type': 'text/plain' },
      payload: `${NAME} ${PHONE}`, // unsupported media type
    });
    await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: TEST_ORIGIN },
      payload: { role: 'doctor', password: PASSWORDS.secretary },
    });

    // A server error with patient data in flight: break the DB under a write.
    await pool.query('alter table audit_log rename to audit_log_off');
    try {
      const res = await call(app, cookie, 'POST', '/api/appointments', { ...payload, startAt: '2026-10-17T15:00:00+03:30' });
      expect(res.statusCode).toBe(500);
      expect(res.json()).toEqual({ error: 'server_error' });
    } finally {
      await pool.query('alter table audit_log_off rename to audit_log');
    }

    expect(logs.length).toBeGreaterThan(10);
    const all = logs.join('\n');
    for (const secret of [NAME, 'شهرزاد', PHONE, PHONE_FA, '7654321', PASSWORDS.doctor, PASSWORDS.secretary, token]) {
      expect(all, `logs leak ${secret}`).not.toContain(secret);
    }
    // The 500 is still diagnosable: the log names the error class and SQLSTATE.
    expect(all).toMatch(/"errName":"DatabaseError".*"errCode":"42P01"/);
  });
});
