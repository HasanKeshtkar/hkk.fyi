// Talking to the app under test like a phone would: same origin, session cookie, JSON.
import { inject } from 'vitest';
import WebSocket from 'ws';
import type { ServerEvents } from '../../src/shared/api';
import { TEST_PASSWORDS } from '../worker-setup';

export const BASE = inject('baseUrl');
export const ORIGIN = BASE;
export const PASSWORDS = TEST_PASSWORDS;

export interface Reply<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

export async function call<T = any>(cookie: string | null, method: string, path: string, body?: unknown, origin: string | null = ORIGIN): Promise<Reply<T>> {
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // not JSON
  }
  return { status: res.status, body: parsed as T, headers: res.headers };
}

/** Empties the data and creates the two accounts afresh (test-only route). */
export async function reset(): Promise<{ doctor: { id: string }; secretary: { id: string } }> {
  const res = await call<{ users: { id: string; role: string }[] }>(null, 'POST', '/api/test/reset', {});
  const by = (role: string) => res.body.users.find((u) => u.role === role)!;
  return { doctor: by('doctor'), secretary: by('secretary') };
}

/** Runs SQL inside the app's database (test-only route). */
export async function sql<T = Record<string, unknown>>(query: string, ...params: unknown[]): Promise<T[]> {
  const res = await call<{ rows: T[] }>(null, 'POST', '/api/test/sql', { query, params });
  if (res.status !== 200) throw new Error(`sql failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.rows;
}

export async function login(role: 'doctor' | 'secretary'): Promise<string> {
  const res = await call(null, 'POST', '/api/auth/login', { role, password: PASSWORDS[role] });
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
  return res.headers.get('set-cookie')!.split(';')[0]!;
}

export const SAT = '2026-10-17';
/** A Tehran wall-clock time as an ISO instant (Tehran is UTC+03:30). */
export const tehran = (isoLocal: string) => new Date(`${isoLocal}+03:30`).toISOString();
export const at = (time: string, date = SAT) => tehran(`${date}T${time}`);

export function book(cookie: string, time: string, name = 'مریم احمدی', phone = '09121234567', date = SAT) {
  return call(cookie, 'POST', '/api/appointments', { startAt: at(time, date), patientName: name, patientPhone: phone });
}

/** A phone's live channel. `events` collects what arrives; `next()` waits for more. */
export function live(cookie: string | null, origin = ORIGIN) {
  const headers: Record<string, string> = { origin };
  if (cookie) headers.cookie = cookie;
  const ws = new WebSocket(`${BASE.replace('http', 'ws')}/api/live`, { headers });
  const events: { type: keyof ServerEvents | 'restored'; data: any }[] = [];
  const waiters: (() => void)[] = [];
  ws.on('message', (m) => {
    const text = String(m);
    if (text === 'pong') return;
    events.push(JSON.parse(text));
    waiters.splice(0).forEach((w) => w());
  });
  const opened = new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
  const closed = new Promise<number>((resolve) => ws.once('close', (code) => resolve(code)));
  return {
    ws,
    events,
    opened,
    closed,
    of: (type: string) => events.filter((e) => e.type === type),
    next: (n = 1, type?: string) =>
      new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`no ${type ?? 'event'} (have ${events.length})`)), 3000);
        const check = () => {
          if ((type ? events.filter((e) => e.type === type) : events).length >= n) {
            clearTimeout(t);
            resolve();
          } else waiters.push(check);
        };
        check();
      }),
  };
}

export const settle = (ms = 200) => new Promise((r) => setTimeout(r, ms));
