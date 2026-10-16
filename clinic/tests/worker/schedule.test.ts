// Working hours: weekly and per-date, versioned, audited, checked on the server.
import { beforeEach, describe, expect, it } from 'vitest';
import { book, call, login, reset, sql } from '../helpers/worker';

let doc: string;
let sec: string;

beforeEach(async () => {
  await reset();
  doc = await login('doctor');
  sec = await login('secretary');
});

describe('weekly hours', () => {
  it('starts with the clinic’s default week', async () => {
    const { weekly } = (await call(sec, 'GET', '/api/schedule')).body;
    const summary = weekly.map((w: { weekday: number; isOpen: boolean; startTime: string; endTime: string }) =>
      w.isOpen ? `${w.weekday} ${w.startTime}-${w.endTime}` : `${w.weekday} closed`,
    );
    expect(summary).toEqual(['0 14:00-19:00', '1 08:00-12:00', '2 14:00-19:00', '3 14:00-19:00', '4 closed', '5 closed', '6 14:00-19:00']);
  });

  it('a change is versioned and audited; a save from an older version is refused with what is saved now', async () => {
    const saved = await call(doc, 'PUT', '/api/schedule/weekly/4', { isOpen: true, startTime: '09:00', endTime: '12:00', version: 1 });
    expect(saved.body).toMatchObject({ weekday: 4, isOpen: true, version: 2 });
    const stale = await call(sec, 'PUT', '/api/schedule/weekly/4', { isOpen: false, startTime: '09:00', endTime: '12:00', version: 1 });
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ error: 'schedule_conflict', currentSchedule: { version: 2, isOpen: true } });
    // Asking for what is already saved succeeds without a change.
    expect((await call(sec, 'PUT', '/api/schedule/weekly/4', { isOpen: true, startTime: '09:00', endTime: '12:00', version: 1 })).body.version).toBe(2);
    const audit = await sql<{ action: string }>("SELECT action FROM audit_log WHERE entity = 'weekly_schedule'");
    expect(audit).toEqual([{ action: 'update' }]);
  });

  it.each([
    [{ startTime: '09:15' }, 'startTime'],
    [{ endTime: '08:00' }, 'endTime'],
    [{ endTime: '24:30' }, 'endTime'],
  ])('refuses hours that are not on the half hour or not in order %j', async (over, field) => {
    const res = await call(doc, 'PUT', '/api/schedule/weekly/6', { isOpen: true, startTime: '09:00', endTime: '12:00', version: 1, ...over });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe(field);
  });

  it('a newly opened day can be booked; a newly closed one cannot', async () => {
    expect((await book(sec, '10:00', 'x', '09121234567', '2026-10-15')).body.error).toBe('day_closed');
    await call(doc, 'PUT', '/api/schedule/weekly/4', { isOpen: true, startTime: '09:00', endTime: '12:00', version: 1 });
    expect((await book(sec, '10:00', 'x', '09121234567', '2026-10-15')).status).toBe(201);
  });
});

describe('date overrides', () => {
  it('close a date, change it, remove it; versions never repeat even after delete and re-create', async () => {
    const closed = await call(doc, 'PUT', '/api/schedule/overrides/2026-10-17', { isOpen: false, note: 'تعطیل رسمی', version: null });
    expect(closed.body).toMatchObject({ date: '2026-10-17', isOpen: false, note: 'تعطیل رسمی' });
    expect((await book(sec, '14:00')).body.error).toBe('day_closed');

    const reopened = await call(doc, 'PUT', '/api/schedule/overrides/2026-10-17', {
      isOpen: true,
      startTime: '16:00',
      endTime: '18:00',
      version: closed.body.version,
    });
    expect(reopened.body.version).toBeGreaterThan(closed.body.version);
    expect((await book(sec, '14:00')).body.error).toBe('outside_hours');
    expect((await book(sec, '16:00')).status).toBe(201);

    expect((await call(doc, 'DELETE', `/api/schedule/overrides/2026-10-17?version=${closed.body.version}`)).status).toBe(409);
    expect((await call(doc, 'DELETE', `/api/schedule/overrides/2026-10-17?version=${reopened.body.version}`)).status).toBe(204);
    const again = await call(doc, 'PUT', '/api/schedule/overrides/2026-10-17', { isOpen: false, version: null });
    expect(again.body.version).toBeGreaterThan(reopened.body.version);
    // A phone still holding the removed override's version cannot overwrite the new one.
    const stale = await call(sec, 'PUT', '/api/schedule/overrides/2026-10-17', { isOpen: true, startTime: '14:00', endTime: '15:00', version: reopened.body.version });
    expect(stale.body.error).toBe('schedule_conflict');

    const actions = (await sql<{ action: string }>("SELECT action FROM audit_log WHERE entity = 'date_override' ORDER BY id")).map((r) => r.action);
    expect(actions).toEqual(['create', 'update', 'delete', 'create']);
  });

  it('refuses a note with control characters and a too-long one', async () => {
    expect((await call(doc, 'PUT', '/api/schedule/overrides/2026-10-17', { isOpen: false, note: 'a\u0007b', version: null })).body.field).toBe('note');
    expect((await call(doc, 'PUT', '/api/schedule/overrides/2026-10-17', { isOpen: false, note: 'x'.repeat(201), version: null })).body.field).toBe('note');
  });
});
