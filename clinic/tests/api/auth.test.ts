import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { connect } from 'node:net';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openTestDb, resetData } from '../helpers/db.js';
import { call, login, makeApp, PASSWORDS, sessionCookieFrom, setRealPasswords, TEST_ORIGIN } from '../helpers/app.js';

const { pool, db } = openTestDb(10);
let app: FastifyInstance;

beforeEach(async () => {
  await resetData(pool, db);
  await setRealPasswords(pool);
  ({ app } = await makeApp(db)); // fresh app per test: fresh login rate-limit counters
});

afterEach(async () => {
  await app.close();
});

afterAll(async () => {
  await pool.end();
});

const loginReq = (role: string, password: string, headers: Record<string, string> = { origin: TEST_ORIGIN }) =>
  app.inject({ method: 'POST', url: '/api/auth/login', headers, payload: { role, password } });

describe('login', () => {
  it('signs in and sets a long-lived, locked-down session cookie', async () => {
    const res = await loginReq('secretary', PASSWORDS.secretary);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user).toMatchObject({ role: 'secretary', name: 'منشی تست' });
    expect(body.users.map((u: { role: string }) => u.role).sort()).toEqual(['doctor', 'secretary']);
    expect(body.user).not.toHaveProperty('passwordHash');

    const c = res.cookies.find((x) => x.name === '__Host-sid')!;
    expect(c).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });
    expect(c.domain).toBeUndefined();
    expect(c.maxAge).toBeGreaterThan(170 * 24 * 3600);
  });

  it('stores only a hash of the session token', async () => {
    const res = await loginReq('doctor', PASSWORDS.doctor);
    const token = res.cookies.find((x) => x.name === '__Host-sid')!.value;
    const { rows } = await pool.query('select id from sessions');
    expect(rows).toEqual([{ id: createHash('sha256').update(token).digest('hex') }]);
  });

  it('rejects a wrong password and an unknown role', async () => {
    const wrong = await loginReq('doctor', PASSWORDS.secretary);
    expect(wrong.statusCode).toBe(401);
    expect(wrong.json()).toEqual({ error: 'invalid_credentials' });
    expect(wrong.cookies).toEqual([]);
    const bad = await loginReq('admin', 'x');
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error).toBe('validation');
  });

  it('rate-limits repeated attempts from one address', async () => {
    for (let i = 0; i < 5; i++) expect((await loginReq('doctor', 'nope')).statusCode).toBe(401);
    const blocked = await loginReq('doctor', PASSWORDS.doctor);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual({ error: 'rate_limited' });
  });

  it('refuses a login posted from another origin (login CSRF)', async () => {
    expect((await loginReq('doctor', PASSWORDS.doctor, { origin: 'https://evil.example' })).statusCode).toBe(403);
    expect((await loginReq('doctor', PASSWORDS.doctor, {})).statusCode).toBe(403);
  });
});

describe('session', () => {
  it('authenticates /api/me with the cookie and refuses without it', async () => {
    const cookie = await login(app, 'doctor');
    const me = await call(app, cookie, 'GET', '/api/me');
    expect(me.statusCode).toBe(200);
    expect(me.json().user.role).toBe('doctor');

    const anon = await call(app, null, 'GET', '/api/me');
    expect(anon.statusCode).toBe(401);
    expect(anon.json()).toEqual({ error: 'unauthorized' });
    expect((await call(app, '__Host-sid=garbage', 'GET', '/api/me')).statusCode).toBe(401);
    expect((await call(app, `__Host-sid=${'A'.repeat(43)}`, 'GET', '/api/me')).statusCode).toBe(401);
  });

  it('every API route except login/logout requires a session', async () => {
    for (const [method, url] of [
      ['GET', '/api/day?date=2026-10-17'],
      ['GET', '/api/schedule'],
      ['POST', '/api/appointments'],
      ['PATCH', '/api/appointments/00000000-0000-4000-8000-000000000000'],
      ['POST', '/api/appointments/00000000-0000-4000-8000-000000000000/cancel'],
      ['PUT', '/api/schedule/weekly/6'],
      ['PUT', '/api/schedule/overrides/2026-10-17'],
      ['DELETE', '/api/schedule/overrides/2026-10-17'],
    ] as const) {
      expect((await call(app, null, method, url, method === 'GET' || method === 'DELETE' ? undefined : {})).statusCode, `${method} ${url}`).toBe(401);
    }
  });

  it('logout ends the session for good', async () => {
    const cookie = await login(app, 'doctor');
    const out = await call(app, cookie, 'POST', '/api/auth/logout');
    expect(out.statusCode).toBe(200);
    const cleared = out.cookies.find((x) => x.name === '__Host-sid');
    expect(cleared?.value).toBe('');
    expect((await call(app, cookie, 'GET', '/api/me')).statusCode).toBe(401);
    const { rows } = await pool.query('select count(*)::int as n from sessions');
    expect(rows[0].n).toBe(0);
  });

  it('refuses an expired session', async () => {
    const cookie = await login(app, 'doctor');
    await pool.query(`update sessions set expires_at = now() - interval '1 second'`);
    expect((await call(app, cookie, 'GET', '/api/me')).statusCode).toBe(401);
  });

  it('slides the expiry forward on daily use and re-sends the cookie', async () => {
    const cookie = await login(app, 'doctor');
    await pool.query(
      `update sessions set last_seen_at = now() - interval '2 days', expires_at = now() + interval '10 days'`,
    );
    const res = await call(app, cookie, 'GET', '/api/me');
    expect(res.statusCode).toBe(200);
    expect(sessionCookieFrom(res)).toBe(cookie);
    const { rows } = await pool.query(`select expires_at > now() + interval '170 days' as extended from sessions`);
    expect(rows[0].extended).toBe(true);

    const again = await call(app, cookie, 'GET', '/api/me'); // within a day: no rewrite
    expect(again.cookies).toEqual([]);
  });

  it('two phones can be signed in to the same account at once', async () => {
    const a = await login(app, 'doctor');
    const b = await login(app, 'doctor');
    expect(a).not.toBe(b);
    expect((await call(app, a, 'GET', '/api/me')).statusCode).toBe(200);
    expect((await call(app, b, 'GET', '/api/me')).statusCode).toBe(200);
  });
});

describe('CSRF guard on state-changing calls', () => {
  it('refuses a write without an Origin header or from a foreign origin', async () => {
    const cookie = await login(app, 'doctor');
    const payload = { startAt: '2026-10-17T14:00:00+03:30', patientName: 'علی', patientPhone: '09121234567' };
    const noOrigin = await app.inject({ method: 'POST', url: '/api/appointments', headers: { cookie }, payload });
    expect(noOrigin.statusCode).toBe(403);
    const foreign = await app.inject({
      method: 'POST',
      url: '/api/appointments',
      headers: { cookie, origin: 'https://evil.example' },
      payload,
    });
    expect(foreign.statusCode).toBe(403);
    const { rows } = await pool.query('select count(*)::int as n from appointments');
    expect(rows[0].n).toBe(0);
  });

  it('allows reads without an Origin header', async () => {
    const cookie = await login(app, 'doctor');
    const res = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(res.statusCode).toBe(200);
  });
});

describe('guards cannot be skipped by spelling the path differently', () => {
  // The router decodes percent-escapes, so these all reach the /api handlers.
  const sneaky = ['/%61pi/day?date=2026-10-17', '/ap%69/day?date=2026-10-17', '/%61pi/schedule', '/%61pi/me', '/api/d%61y?date=2026-10-17'];

  it.each(sneaky)('GET %s without a session → 401', async (url) => {
    const res = await app.inject({ method: 'GET', url });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'unauthorized' });
  });

  it('a percent-encoded write from a foreign origin is refused by the CSRF guard', async () => {
    const cookie = await login(app, 'doctor');
    const res = await app.inject({
      method: 'POST',
      url: '/%61pi/auth/logout',
      headers: { cookie, origin: 'https://evil.example' },
    });
    expect(res.statusCode).toBe(403);
    expect((await call(app, cookie, 'GET', '/api/me')).statusCode).toBe(200); // session survived
  });

  it('an absolute-form request target over a real socket is still checked', async () => {
    await app.listen({ port: 0, host: '127.0.0.1' });
    const { port } = app.server.address() as AddressInfo;
    const raw = await new Promise<string>((resolve, reject) => {
      const sock = connect(port, '127.0.0.1', () => {
        sock.write(`GET http://clinic.test/api/day?date=2026-10-17 HTTP/1.1\r\nHost: clinic.test\r\nConnection: close\r\n\r\n`);
      });
      let data = '';
      sock.on('data', (d) => (data += d.toString()));
      sock.on('end', () => resolve(data));
      sock.on('error', reject);
    });
    expect(raw.split('\r\n')[0]).toBe('HTTP/1.1 401 Unauthorized');
  });

  it('a malformed URL gets the API error shape, without echoing the URL', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/%zz' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'bad_request' });
  });

  it('unknown paths are 404, not a reason to skip auth on known ones', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/nope' })).statusCode).toBe(404);
  });
});

describe('rate limit behind the proxy', () => {
  it('keys on the address the proxy saw, so a spoofed X-Forwarded-For does not reset the count', async () => {
    const proxied = (await makeApp(db, { trustProxyHops: 1 })).app;
    try {
      const codes: number[] = [];
      for (let i = 0; i < 7; i++) {
        const res = await proxied.inject({
          method: 'POST',
          url: '/api/auth/login',
          remoteAddress: '10.0.0.1', // Liara's router
          headers: { origin: TEST_ORIGIN, 'x-forwarded-for': `6.6.6.${i}, 203.0.113.7` }, // forged, real
          payload: { role: 'doctor', password: 'nope' },
        });
        codes.push(res.statusCode);
      }
      expect(codes).toEqual([401, 401, 401, 401, 401, 429, 429]);
    } finally {
      await proxied.close();
    }
  });
});
