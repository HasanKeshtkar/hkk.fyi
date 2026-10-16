// The live channel: who may connect, who hears what, and that a phone that was away shows
// exactly the server's data after reconnecting.
import { beforeEach, describe, expect, it } from 'vitest';
import type { ApiResult, AppointmentDto, DayResponse } from '../../src/shared/api';
import { DayStore } from '../../src/web/lib/day-store';
import { at, book, call, live, login, ORIGIN, reset, SAT, settle, sql } from '../helpers/worker';

let doc: string;
let sec: string;

beforeEach(async () => {
  await reset();
  doc = await login('doctor');
  sec = await login('secretary');
});

describe('who may connect', () => {
  it('refuses a socket without a valid session (4401) or from another site (4403), sending nothing', async () => {
    const none = live(null);
    expect(await none.closed).toBe(4401);
    const garbage = live('__Host-sid=garbage');
    expect(await garbage.closed).toBe(4401);
    const foreign = live(doc, 'https://evil.example');
    expect(await foreign.closed).toBe(4403);
    expect([...none.events, ...garbage.events, ...foreign.events]).toEqual([]);
    const ok = live(doc);
    await ok.opened;
    ok.ws.close();
  });

  it('answers the keep-alive', async () => {
    const s = live(sec);
    await s.opened;
    const pong = new Promise((r) => s.ws.once('message', (m) => r(String(m))));
    s.ws.send('ping');
    expect(await pong).toBe('pong');
    s.ws.close();
  });

  it('logout closes that session’s socket and only that one', async () => {
    const sec2 = await login('secretary');
    const a = live(sec);
    const b = live(sec2);
    await Promise.all([a.opened, b.opened]);
    await call(sec, 'POST', '/api/auth/logout', {});
    expect(await a.closed).toBe(4401);
    await book(doc, '14:00');
    await b.next(1, 'appointment');
    b.ws.close();
  });

  it('a socket whose session was revoked (password change) or expired hears nothing more', async () => {
    const s = live(sec);
    await s.opened;
    await sql('DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE role = ?)', 'secretary');
    await book(doc, '14:00', 'بیمار محرمانه');
    expect(await s.closed).toBe(4401);
    expect(JSON.stringify(s.events)).not.toContain('محرمانه');
  });
});

describe('what each phone hears', () => {
  it('everyone hears appointment changes; only the secretary hears the doctor’s notifications', async () => {
    const d = live(doc);
    const s = live(sec);
    await Promise.all([d.opened, s.opened]);
    const created = (await book(doc, '14:00')).body as AppointmentDto;
    await Promise.all([d.next(1, 'appointment'), s.next(1, 'appointment'), s.next(1, 'notification')]);
    expect(s.of('appointment')[0]!.data).toMatchObject({ action: 'create', appointment: { id: created.id, version: 1 } });
    expect(s.of('notification')[0]!.data).toMatchObject({ type: 'created', appointmentId: created.id });

    await book(sec, '15:00', 'علی');
    await Promise.all([d.next(2, 'appointment'), s.next(2, 'appointment')]);
    await settle();
    expect(s.of('notification')).toHaveLength(1);
    expect(d.of('notification')).toHaveLength(0);

    await call(doc, 'PUT', '/api/schedule/weekly/6', { isOpen: true, startTime: '14:00', endTime: '18:00', version: 1 });
    await s.next(1, 'schedule');

    const read = await call(sec, 'POST', '/api/notifications/read', { all: true });
    await s.next(1, 'notifications:read');
    expect(s.of('notifications:read')[0]!.data).toEqual({ ids: read.body.ids });
    expect(d.of('notifications:read')).toHaveLength(0);
    d.ws.close();
    s.ws.close();
  });
});

describe('disconnect and reconnect', () => {
  it('after reconnecting, the phone shows exactly what the server has', async () => {
    const fetchDay = async (date: string): Promise<ApiResult<DayResponse>> => {
      const res = await call<DayResponse>(sec, 'GET', `/api/day?date=${date}`);
      return { ok: true, status: res.status, data: res.body };
    };
    const store = new DayStore(fetchDay, SAT);
    const kept = (await book(doc, '14:00', 'می‌ماند')).body;
    const toCancel = (await book(doc, '14:30', 'لغو می‌شود')).body;
    const toMove = (await book(doc, '15:00', 'جابه‌جا می‌شود')).body;

    const wire = (phone: ReturnType<typeof live>) => {
      phone.ws.on('message', (m) => {
        const text = String(m);
        if (text === 'pong') return;
        const e = JSON.parse(text);
        if (e.type === 'appointment') store.applyAppointment(e.data.appointment);
      });
      phone.ws.on('open', () => void store.refresh());
    };
    let phone = live(sec);
    wire(phone);
    await phone.opened;
    await store.refresh();
    expect(store.getView().data!.appointments).toHaveLength(3);

    await book(doc, '16:00', 'زنده');
    await settle();
    expect(store.getView().data!.appointments.map((a) => a.patientName)).toContain('زنده');

    // Cut off: changes happen that this phone never hears about.
    phone.ws.close();
    await phone.closed;
    await call(doc, 'POST', `/api/appointments/${toCancel.id}/cancel`, { version: 1 });
    await call(doc, 'PATCH', `/api/appointments/${toMove.id}`, { version: 1, startAt: at('17:30') });
    await call(doc, 'PATCH', `/api/appointments/${kept.id}`, { version: 1, patientName: 'می‌ماند (ویرایش)' });
    await book(doc, '18:00', 'در غیاب');
    expect(store.getView().data!.appointments.map((a) => a.patientName)).toContain('لغو می‌شود'); // stale, as expected

    phone = live(sec);
    wire(phone);
    await phone.opened;
    await settle(300);
    const server = (await fetchDay(SAT)) as { ok: true; data: DayResponse };
    const shape = (d: DayResponse) => d.appointments.map((a) => [a.id, a.startAt, a.patientName, a.version, a.withinHours]);
    expect(shape(store.getView().data!)).toEqual(shape(server.data));
    expect(store.getView().data!.appointments.map((a) => a.patientName)).toEqual(['می‌ماند (ویرایش)', 'زنده', 'جابه‌جا می‌شود', 'در غیاب']);
    phone.ws.close();
  });
});

it('the live channel is same-origin only even for the upgrade request', () => {
  expect(ORIGIN.startsWith('http://localhost')).toBe(true);
});
