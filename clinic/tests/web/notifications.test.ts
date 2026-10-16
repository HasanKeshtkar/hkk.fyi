// The secretary's unread list and badge: each read counts once however many times it is
// reported, and nothing that arrives while the list is being re-read or marked read is lost.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiResult, NotificationDto, NotificationsResponse } from '../../src/shared/api';

type Pending<T> = { resolve: (r: ApiResult<T>) => void };
const calls = {
  list: [] as Pending<NotificationsResponse>[],
  read: [] as (Pending<{ ids: string[] }> & { body: unknown })[],
};

vi.mock('../../src/web/lib/api', () => ({
  api: {
    notifications: () => new Promise((resolve) => calls.list.push({ resolve })),
    markNotificationsRead: (body: unknown) => new Promise((resolve) => calls.read.push({ resolve, body })),
  },
}));

const { notificationStore: store } = await import('../../src/web/lib/notifications');

function note(id: string): NotificationDto {
  const after = { startAt: '2026-10-17T10:30:00.000Z', patientName: `بیمار ${id}`, patientPhone: '09121234567' };
  return {
    id,
    type: 'created',
    appointmentId: `a-${id}`,
    payload: { by: 'doctor', before: null, after },
    createdAt: '2026-10-16T08:00:00.000Z',
    readAt: null,
  } as NotificationDto;
}

const ok = <T>(data: T): ApiResult<T> => ({ ok: true, status: 200, data });
const view = () => ({ ids: store.get().items.map((n) => n.id), count: store.get().count });

async function loadWith(items: NotificationDto[], count = items.length) {
  const p = store.load();
  calls.list.at(-1)!.resolve(ok({ items, count }));
  await p;
}

beforeEach(() => {
  store.clear();
  calls.list.length = 0;
  calls.read.length = 0;
});

describe('notificationStore', () => {
  it('reading one of three lowers the badge by one, whether the answer or the echo comes first', async () => {
    await loadWith([note('a'), note('b'), note('c')]);
    const p = store.markRead(['a']);
    calls.read[0]!.resolve(ok({ ids: ['a'] }));
    await p;
    store.removeRead(['a']); // this phone's own 'notifications:read' echo
    expect(view()).toEqual({ ids: ['b', 'c'], count: 2 });

    store.removeRead(['b']); // echo first this time
    const q = store.markRead(['b']);
    calls.read[1]!.resolve(ok({ ids: ['b'] }));
    await q;
    expect(view()).toEqual({ ids: ['c'], count: 1 });
  });

  it('an item already read on the other phone (event missed) still leaves the list when tapped', async () => {
    await loadWith([note('a'), note('b')]);
    const p = store.markRead(['a']);
    calls.read[0]!.resolve(ok({ ids: [] })); // nothing changed on the server
    await p;
    expect(view()).toEqual({ ids: ['b'], count: 1 });
  });

  it('a notification that arrives while the list is re-read is kept', async () => {
    await loadWith([]);
    const p = store.load();
    store.add(note('new')); // the server read the list just before this was created
    calls.list[1]!.resolve(ok({ items: [], count: 0 }));
    await p;
    expect(view()).toEqual({ ids: ['new'], count: 1 });
  });

  it('a read applied while the list is re-read is not undone by the older answer', async () => {
    await loadWith([note('a'), note('b')]);
    const p = store.load();
    store.removeRead(['a']);
    calls.list[1]!.resolve(ok({ items: [note('a'), note('b')], count: 2 }));
    await p;
    expect(view()).toEqual({ ids: ['b'], count: 1 });
  });

  it('a superseded re-read resolves with the newer one’s outcome', async () => {
    const first = store.load();
    const second = store.load();
    calls.list[0]!.resolve(ok({ items: [], count: 0 }));
    calls.list[1]!.resolve({ ok: false, kind: 'network' });
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(false);
  });

  it('an older re-read answering last is ignored', async () => {
    const first = store.load();
    const second = store.load();
    calls.list[1]!.resolve(ok({ items: [note('a'), note('b')], count: 2 }));
    await second;
    calls.list[0]!.resolve(ok({ items: [], count: 0 }));
    await first;
    expect(view()).toEqual({ ids: ['a', 'b'], count: 2 });
  });

  it('“mark all read” keeps a notification that arrived after the server marked the others', async () => {
    await loadWith([note('a')]);
    const p = store.markRead('all');
    expect(calls.read[0]!.body).toEqual({ all: true });
    store.add(note('late'));
    calls.read[0]!.resolve(ok({ ids: ['a'] }));
    await p;
    expect(view()).toEqual({ ids: ['late'], count: 1 });
  });

  it('a notification already read is not announced again', async () => {
    await loadWith([note('a')]);
    store.removeRead(['a']);
    expect(store.add(note('a'))).toBe(false);
    expect(view()).toEqual({ ids: [], count: 0 });
  });
});
