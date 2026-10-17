// Sign-in, sessions, and the guards every request passes: CSRF origin check, deny by default,
// the login rate limit, and the security headers.
import { beforeEach, describe, expect, it } from 'vitest';
import { call, login, ORIGIN, PASSWORDS, reset, sql } from '../helpers/worker';

beforeEach(async () => {
  await reset();
});

describe('login', () => {
  it('signs in with a long-lived, locked-down session cookie', async () => {
    const res = await call(null, 'POST', '/api/auth/login', { role: 'secretary', password: PASSWORDS.secretary });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ role: 'secretary', name: 'منشی تست' });
    expect(res.body.users.map((u: { role: string }) => u.role)).toEqual(['doctor', 'secretary']);
    expect(JSON.stringify(res.body)).not.toContain('pbkdf2');
    const [cookie, device] = res.headers.getSetCookie();
    expect(cookie).toMatch(/^__Host-sid=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Secure; Max-Age=1555(1999|2000)$/); // 180 days
    // And this phone is remembered for the account (400 days), see the failure limit below.
    expect(device).toMatch(/^__Host-dev-secretary=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Secure; Max-Age=34560000$/);
    const token = cookie!.split(';')[0]!.split('=')[1]!;
    // Only the token's hash is stored.
    const stored = await sql<{ id: string }>('SELECT id FROM sessions');
    expect(stored).toHaveLength(1);
    expect(stored[0]!.id).not.toBe(token);
    expect(stored[0]!.id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses a wrong password, and gives no hint which part was wrong', async () => {
    const res = await call(null, 'POST', '/api/auth/login', { role: 'doctor', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'invalid_credentials' });
    expect(res.headers.get('set-cookie')).toBeNull();
    const bad = await call(null, 'POST', '/api/auth/login', { role: 'nurse', password: 'x' });
    expect(bad.status).toBe(400);
  });

  it('limits login attempts per address (5 per 15 minutes)', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await call(null, 'POST', '/api/auth/login', { role: 'doctor', password: 'nope' })).status).toBe(401);
    }
    const res = await call(null, 'POST', '/api/auth/login', { role: 'doctor', password: PASSWORDS.doctor });
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: 'rate_limited' });
  });

  it('an IPv6 address counts by its /64: changing the rest of the address does not reset the limit', async () => {
    const from = (ip: string, password: string) =>
      fetch(`${ORIGIN}/api/auth/login`, {
        method: 'POST',
        headers: { origin: ORIGIN, 'content-type': 'application/json', 'cf-connecting-ip': ip },
        body: JSON.stringify({ role: 'doctor', password }),
      });
    for (let i = 1; i <= 5; i++) expect((await from(`2001:db8:1:2::${i}`, 'nope')).status).toBe(401);
    expect((await from('2001:0db8:0001:0002:ffff:0:0:99', PASSWORDS.doctor)).status).toBe(429);
    // Another customer's block is a different address.
    expect((await from('2001:db8:1:3::1', PASSWORDS.doctor)).status).toBe(200);
  });

  it('failed logins per account are limited too, whatever the address (10 per 15 minutes)', async () => {
    const from = (ip: string, role: string, password: string) =>
      fetch(`${ORIGIN}/api/auth/login`, {
        method: 'POST',
        headers: { origin: ORIGIN, 'content-type': 'application/json', 'cf-connecting-ip': ip },
        body: JSON.stringify({ role, password }),
      });
    for (let i = 1; i <= 10; i++) expect((await from(`198.51.100.${i}`, 'doctor', 'nope')).status).toBe(401);
    // Even the right password, from a phone that never signed in: the account is resting (no slow check runs).
    expect((await from('198.51.100.50', 'doctor', PASSWORDS.doctor)).status).toBe(429);
    // The other account, and sessions already signed in, are not affected.
    expect((await from('198.51.100.51', 'secretary', PASSWORDS.secretary)).status).toBe(200);
    // A successful login does not count as a failure.
    await sql('DELETE FROM login_failures');
    for (let i = 0; i < 12; i++) expect((await from(`203.0.113.${i}`, 'secretary', PASSWORDS.secretary)).status).toBe(200);
  });

  it('a phone that signed in before is not locked out by strangers’ failed guesses', async () => {
    const from = (ip: string, password: string, cookie?: string, role = 'doctor') =>
      fetch(`${ORIGIN}/api/auth/login`, {
        method: 'POST',
        headers: { origin: ORIGIN, 'content-type': 'application/json', 'cf-connecting-ip': ip, ...(cookie ? { cookie } : {}) },
        body: JSON.stringify({ role, password }),
      });
    const first = await from('192.0.2.1', PASSWORDS.doctor);
    const device = first.headers.getSetCookie()[1]!.split(';')[0]!;
    expect(device).toMatch(/^__Host-dev-doctor=/);
    // The same phone signs in to the other account too: each account has its own cookie.
    const other = await from('192.0.2.1', PASSWORDS.secretary, device, 'secretary');
    expect(other.headers.getSetCookie()[1]).toMatch(/^__Host-dev-secretary=/);
    await call(first.headers.getSetCookie()[0]!.split(';')[0]!, 'POST', '/api/auth/logout', {});
    for (let i = 1; i <= 10; i++) expect((await from(`198.51.100.${i}`, 'nope')).status).toBe(401);
    expect((await from('198.51.100.60', PASSWORDS.doctor)).status).toBe(429); // a new phone waits
    const back = await from('192.0.2.2', PASSWORDS.doctor, device); // hers signs in
    expect(back.status).toBe(200);
    // Same cookie, fresh lifetime: a phone in use stays trusted.
    expect(back.headers.getSetCookie()[1]!.split(';')[0]).toBe(device);
    expect(back.headers.getSetCookie()[1]).toMatch(/Max-Age=34560000$/);
    // The password still has to be right.
    expect((await from('192.0.2.3', 'nope', device)).status).toBe(401);
  });

  it('a phone signed in before trusted phones existed becomes trusted when the app opens; a session alone does not', async () => {
    const cookie = await login('doctor');
    await sql('DELETE FROM trusted_devices');
    // A session from now (e.g. a stolen session cookie without the phone's own cookie): nothing.
    expect((await call(cookie, 'GET', '/api/me')).headers.getSetCookie()).toEqual([]);
    expect(await sql('SELECT count(*) AS n FROM trusted_devices')).toEqual([{ n: 0 }]);
    // A session from before trusted phones existed: the phone becomes trusted.
    await sql('UPDATE sessions SET created_at = 0');
    const me = await call(cookie, 'GET', '/api/me');
    const device = me.headers.getSetCookie().find((c) => c.startsWith('__Host-dev-doctor='))!;
    expect(device).toMatch(/Max-Age=34560000$/);
    expect(await sql('SELECT count(*) AS n FROM trusted_devices')).toEqual([{ n: 1 }]);
    // Opening it again keeps the same record.
    await call(`${cookie}; ${device.split(';')[0]}`, 'GET', '/api/me');
    expect(await sql('SELECT count(*) AS n FROM trusted_devices')).toEqual([{ n: 1 }]);
  });

  it('logout ends the session', async () => {
    const cookie = await login('doctor');
    expect((await call(cookie, 'GET', '/api/me')).status).toBe(200);
    const out = await call(cookie, 'POST', '/api/auth/logout', {});
    expect(out.status).toBe(200);
    expect(out.headers.get('set-cookie')).toMatch(/^__Host-sid=; .*Max-Age=0$/);
    expect((await call(cookie, 'GET', '/api/me')).status).toBe(401);
  });

  it('a session in daily use slides forward and the cookie is re-sent; an expired one is refused', async () => {
    const cookie = await login('secretary');
    const sessionCookies = (res: { headers: Headers }) => res.headers.getSetCookie().filter((c) => c.startsWith('__Host-sid='));
    expect(sessionCookies(await call(cookie, 'GET', '/api/me'))).toEqual([]); // used today: nothing to do
    await sql('UPDATE sessions SET last_seen_at = last_seen_at - 2 * 86400000');
    const res = await call(cookie, 'GET', '/api/me');
    expect(sessionCookies(res)).toEqual([expect.stringMatching(/Max-Age=1555\d{4}$/)]);
    await sql('UPDATE sessions SET expires_at = ?', Date.now() - 1000);
    expect((await call(cookie, 'GET', '/api/me')).status).toBe(401);
  });
});

describe('guards', () => {
  it('every API route needs a session (deny by default), including encoded paths', async () => {
    for (const [method, path] of [
      ['GET', '/api/me'],
      ['GET', '/api/day?date=2026-10-17'],
      ['GET', '/api/schedule'],
      ['GET', '/api/notifications'],
      ['GET', '/api/backups'],
      ['POST', '/api/appointments'],
      ['PATCH', '/api/appointments/00000000-0000-4000-8000-000000000000'],
      ['PUT', '/api/schedule/weekly/6'],
    ] as const) {
      expect((await call(null, method, path, method === 'GET' ? undefined : {})).status, `${method} ${path}`).toBe(401);
    }
    expect((await call(null, 'GET', '/%61pi/me')).status).not.toBe(200);
  });

  it('state-changing requests must come from our own origin (CSRF)', async () => {
    const cookie = await login('doctor');
    const body = { startAt: '2026-10-17T10:30:00.000Z', patientName: 'x', patientPhone: '09121234567' };
    expect((await call(cookie, 'POST', '/api/appointments', body, null)).status).toBe(403);
    expect((await call(cookie, 'POST', '/api/appointments', body, 'https://evil.example')).status).toBe(403);
    expect((await call(null, 'POST', '/api/auth/login', { role: 'doctor', password: PASSWORDS.doctor }, 'https://evil.example')).status).toBe(403);
    expect((await call(cookie, 'POST', '/api/appointments', body, ORIGIN)).status).toBe(201);
  });

  it('malformed requests get a plain 400 without echoing anything back', async () => {
    const cookie = await login('doctor');
    const res = await fetch(`${ORIGIN}/api/appointments`, {
      method: 'POST',
      headers: { origin: ORIGIN, cookie, 'content-type': 'application/json' },
      body: '{"patientName": "مریم احمدی", broken',
    });
    expect(res.status).toBe(400);
    expect(await res.text()).not.toContain('مریم');
  });

  it('a huge body is refused without being held in memory; the server keeps working', async () => {
    const huge = 'a'.repeat(5_000_000);
    const res = await fetch(`${ORIGIN}/api/auth/login`, { method: 'POST', headers: { origin: ORIGIN }, body: huge });
    expect(res.status).toBe(413);
    // Turned away before the body is read (no session): still answered cleanly.
    const anon = await fetch(`${ORIGIN}/api/appointments`, { method: 'POST', headers: { origin: ORIGIN }, body: huge });
    expect(anon.status).toBe(401);
    expect((await call(null, 'POST', '/api/auth/login', { role: 'doctor', password: PASSWORDS.doctor })).status).toBe(200);
  });

  it('every response carries the security headers; the API is never cached', async () => {
    for (const path of ['/api/me', '/healthz', '/', '/login/', '/manifest.webmanifest']) {
      const res = await call(null, 'GET', path);
      const h = res.headers;
      expect(h.get('content-security-policy'), path).toContain("default-src 'self'");
      expect(h.get('x-content-type-options'), path).toBe('nosniff');
      expect(h.get('x-frame-options'), path).toBe('DENY');
      expect(h.get('referrer-policy'), path).toBe('no-referrer');
    }
    expect((await call(null, 'GET', '/api/me')).headers.get('cache-control')).toBe('no-store');
    expect((await call(null, 'GET', '/')).headers.get('cache-control')).toBe('no-cache');
  });
});
