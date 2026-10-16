// The doctor's changes reach the secretary as notifications, kept until read.
import { beforeEach, describe, expect, it } from 'vitest';
import { at, book, call, login, reset } from '../helpers/worker';

let doc: string;
let sec: string;

beforeEach(async () => {
  await reset();
  doc = await login('doctor');
  sec = await login('secretary');
});

describe('notifications', () => {
  it('each change by the doctor (create, edit, move, cancel) becomes one notification for the secretary', async () => {
    const a = (await book(doc, '14:00')).body;
    await call(doc, 'PATCH', `/api/appointments/${a.id}`, { version: 1, patientName: 'مریم رضایی' });
    await call(doc, 'PATCH', `/api/appointments/${a.id}`, { version: 2, startAt: at('16:00') });
    await call(doc, 'POST', `/api/appointments/${a.id}/cancel`, { version: 3 });
    const { items, count } = (await call(sec, 'GET', '/api/notifications')).body;
    expect(count).toBe(4);
    expect(items.map((n: { type: string }) => n.type)).toEqual(['cancelled', 'updated', 'updated', 'created']);
    expect(items[1].payload).toMatchObject({ before: { startAt: at('14:00') }, after: { startAt: at('16:00'), patientName: 'مریم رضایی' } });
    expect((await call(doc, 'GET', '/api/notifications')).body.count).toBe(0);
  });

  it('the secretary’s own changes notify no one', async () => {
    await book(sec, '14:00');
    expect((await call(sec, 'GET', '/api/notifications')).body.count).toBe(0);
  });

  it('marks one or all read; only one’s own notifications', async () => {
    await book(doc, '14:00');
    await book(doc, '15:00', 'علی');
    const { items } = (await call(sec, 'GET', '/api/notifications')).body;
    expect((await call(doc, 'POST', '/api/notifications/read', { ids: [items[0].id] })).body.ids).toEqual([]);
    expect((await call(sec, 'POST', '/api/notifications/read', { ids: [items[0].id] })).body.ids).toEqual([items[0].id]);
    expect((await call(sec, 'GET', '/api/notifications')).body.count).toBe(1);
    expect((await call(sec, 'POST', '/api/notifications/read', { all: true })).body.ids).toEqual([items[1].id]);
    expect((await call(sec, 'GET', '/api/notifications')).body).toEqual({ items: [], count: 0 });
  });
});
