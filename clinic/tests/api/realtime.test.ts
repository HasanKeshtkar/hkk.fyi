// The realtime channel over a real socket: who may connect, who hears what, and that a phone that
// was disconnected while changes happened shows exactly the server's data after reconnecting.
import type { FastifyInstance } from 'fastify';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ApiResult, AppointmentDto, DayResponse, NotificationDto, ServerEvents } from '../../src/shared/api.js';
import { instantAt } from '../../src/shared/time.js';
import { DayStore } from '../../src/web/lib/day-store.js';
import { openTestDb, resetData } from '../helpers/db.js';
import { call, login, makeApp, setRealPasswords, TEST_ORIGIN } from '../helpers/app.js';

const { pool, db } = openTestDb(10);
let app: FastifyInstance;
let url: string;
let doc: string;
let sec: string;
const sockets: Socket<ServerEvents>[] = [];

const SAT = '2026-10-17';
const at = (t: string) => instantAt(SAT, t).toISOString();

beforeEach(async () => {
  await resetData(pool, db);
  await setRealPasswords(pool);
  ({ app } = await makeApp(db));
  await app.listen({ port: 0, host: '127.0.0.1' });
  url = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  doc = await login(app, 'doctor');
  sec = await login(app, 'secretary');
});

afterEach(async () => {
  sockets.splice(0).forEach((s) => s.disconnect());
  await app.close();
});

afterAll(async () => {
  await pool.end();
});

function open(cookie: string | null, origin = TEST_ORIGIN): Socket<ServerEvents> {
  const s: Socket<ServerEvents> = connect(url, {
    path: '/socket.io',
    transports: ['websocket'],
    reconnection: false,
    extraHeaders: { origin, ...(cookie ? { cookie } : {}) },
  });
  sockets.push(s);
  return s;
}

function connected(s: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    s.once('connect', () => resolve());
    s.once('connect_error', reject);
  });
}

function refused(s: Socket): Promise<string> {
  return new Promise((resolve, reject) => {
    s.once('connect', () => reject(new Error('should not connect')));
    s.once('connect_error', (e) => resolve(e.message));
  });
}

/** Collects events of one kind; `next()` waits for the next one. */
function collect<K extends keyof ServerEvents>(s: Socket<ServerEvents>, event: K) {
  const got: Parameters<ServerEvents[K]>[0][] = [];
  const waiters: (() => void)[] = [];
  s.on(event as 'appointment', ((e: Parameters<ServerEvents[K]>[0]) => {
    got.push(e);
    waiters.splice(0).forEach((w) => w());
  }) as never);
  return {
    got,
    next: (n = 1) =>
      new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`no ${event} event`)), 3000);
        const check = () => {
          if (got.length >= n) {
            clearTimeout(t);
            resolve();
          } else waiters.push(check);
        };
        check();
      }),
  };
}

const settle = () => new Promise((r) => setTimeout(r, 150));

const book = (cookie: string, time: string, name: string) =>
  call(app, cookie, 'POST', '/api/appointments', { startAt: at(time), patientName: name, patientPhone: '09121234567' });

describe('who may connect', () => {
  it('refuses a socket without a session, or from a foreign origin', async () => {
    expect(await refused(open(null))).toBe('unauthorized');
    expect(await refused(open('__Host-sid=garbage'))).toBe('unauthorized');
    await expect(refused(open(sec, 'https://evil.example'))).resolves.toBeTypeOf('string');
    await connected(open(sec));
  });

  it('logout disconnects that phone’s socket, not the other session', async () => {
    const sec2 = await login(app, 'secretary');
    const a = open(sec);
    const b = open(sec2);
    await Promise.all([connected(a), connected(b)]);
    const gone = new Promise((r) => a.once('disconnect', r));
    await call(app, sec, 'POST', '/api/auth/logout');
    await gone;
    await settle();
    expect(b.connected).toBe(true);
  });
});

describe('what each phone hears', () => {
  it('everyone hears appointment changes; only the secretary hears the doctor’s notifications', async () => {
    const d = open(doc);
    const s = open(sec);
    await Promise.all([connected(d), connected(s)]);
    const dAppts = collect(d, 'appointment');
    const sAppts = collect(s, 'appointment');
    const dNotes = collect(d, 'notification');
    const sNotes = collect(s, 'notification');

    const created: AppointmentDto = (await book(doc, '14:00', 'مریم احمدی')).json();
    await Promise.all([dAppts.next(), sAppts.next(), sNotes.next()]);
    expect(sAppts.got[0]).toMatchObject({ action: 'create', appointment: { id: created.id, version: 1 } });
    expect(dAppts.got[0]!.appointment).toEqual(created);
    const note = sNotes.got[0] as NotificationDto;
    expect(note).toMatchObject({ type: 'created', appointmentId: created.id, readAt: null });
    expect(note.payload.after).toEqual({ startAt: at('14:00'), patientName: 'مریم احمدی', patientPhone: '09121234567' });

    // The secretary's own booking: everyone sees it, nobody is "notified".
    await book(sec, '15:00', 'علی');
    await Promise.all([dAppts.next(2), sAppts.next(2)]);
    await settle();
    expect(sNotes.got).toHaveLength(1);
    expect(dNotes.got).toHaveLength(0);

    // The unread list survives reconnects: it comes from the database.
    const list = (await call(app, sec, 'GET', '/api/notifications')).json();
    expect(list.count).toBe(1);
    expect(list.items[0].id).toBe(note.id);
  });

  it('a working-hours change tells everyone to re-read', async () => {
    const s = open(sec);
    await connected(s);
    const sched = collect(s, 'schedule');
    await call(app, doc, 'PUT', '/api/schedule/weekly/6', { isOpen: true, startTime: '14:00', endTime: '18:00', version: 1 });
    await sched.next();
  });

  it('marking notifications read clears the badge on the same person’s other phone', async () => {
    const sec2 = await login(app, 'secretary');
    const s2 = open(sec2);
    await connected(s2);
    const reads = collect(s2, 'notifications:read');
    await book(doc, '14:00', 'مریم');
    const res = await call(app, sec, 'POST', '/api/notifications/read', { all: true });
    expect(res.json().ids).toHaveLength(1);
    await reads.next();
    expect(reads.got[0]!.ids).toEqual(res.json().ids);
  });
});

describe('disconnect and reconnect', () => {
  it('after reconnecting, the phone shows exactly what the server has', async () => {
    const fetchDay = async (date: string): Promise<ApiResult<DayResponse>> => {
      const res = await call(app, sec, 'GET', `/api/day?date=${date}`);
      return { ok: true, status: res.statusCode, data: res.json() };
    };
    const store = new DayStore(fetchDay, SAT);
    const kept = (await book(doc, '14:00', 'می‌ماند')).json() as AppointmentDto;
    const toCancel = (await book(doc, '14:30', 'لغو می‌شود')).json() as AppointmentDto;
    const toMove = (await book(doc, '15:00', 'جابه‌جا می‌شود')).json() as AppointmentDto;

    // The secretary's phone: live events applied to the store, full re-read on every (re)connect.
    let s = open(sec);
    const wire = (sock: Socket<ServerEvents>) => {
      sock.on('appointment', (e) => store.applyAppointment(e.appointment));
      sock.on('connect', () => void store.refresh());
    };
    wire(s);
    await connected(s);
    await store.refresh();
    expect(store.getView().data!.appointments).toHaveLength(3);

    // Live while connected.
    await book(doc, '16:00', 'زنده');
    await settle();
    expect(store.getView().data!.appointments.map((a) => a.patientName)).toContain('زنده');

    // Offline: changes happen that this phone never hears about.
    s.disconnect();
    await call(app, doc, 'POST', `/api/appointments/${toCancel.id}/cancel`, { version: 1 });
    await call(app, doc, 'PATCH', `/api/appointments/${toMove.id}`, { version: 1, startAt: at('17:30') });
    await call(app, doc, 'PATCH', `/api/appointments/${kept.id}`, { version: 1, patientName: 'می‌ماند (ویرایش)' });
    await book(doc, '18:00', 'در غیاب');
    expect(store.getView().data!.appointments.map((a) => a.patientName)).toContain('لغو می‌شود'); // stale, as expected

    // Reconnect: the re-read brings the phone exactly in line with the server.
    s = open(sec);
    wire(s);
    await connected(s);
    await settle();
    const server = (await fetchDay(SAT)) as { ok: true; data: DayResponse };
    const view = store.getView().data!;
    const shape = (d: DayResponse) => d.appointments.map((a) => [a.id, a.startAt, a.patientName, a.version, a.withinHours]);
    expect(shape(view)).toEqual(shape(server.data));
    expect(view.appointments.map((a) => a.patientName)).toEqual(['می‌ماند (ویرایش)', 'زنده', 'جابه‌جا می‌شود', 'در غیاب']);
  });
});
