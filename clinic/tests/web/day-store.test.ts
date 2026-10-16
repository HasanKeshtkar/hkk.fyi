// The client-side merge rules: newer versions win, nothing stale comes back, and changes that
// arrive while a full reload is in flight are not lost.
import { describe, expect, it } from 'vitest';
import type { AppointmentDto, DayResponse } from '../../src/shared/api';
import { resolveDaySchedule, slotStarts } from '../../src/shared/schedule';
import { instantAt } from '../../src/shared/time';
import type { ApiResult } from '../../src/web/lib/api';
import { DayStore } from '../../src/web/lib/day-store';

const SAT = '2026-10-17';
const SUN = '2026-10-18';
const schedule = resolveDaySchedule(SAT, [{ weekday: 6, isOpen: true, startTime: '14:00', endTime: '19:00' }], null);

function appt(id: string, version: number, time: string, over: Partial<AppointmentDto> = {}): AppointmentDto {
  return {
    id,
    startAt: instantAt(SAT, time).toISOString(),
    patientName: `بیمار ${id} v${version}`,
    patientPhone: '09121234567',
    status: 'scheduled',
    version,
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

function day(appointments: AppointmentDto[], date = SAT): DayResponse {
  return {
    date,
    schedule,
    slots: slotStarts(schedule).map((d) => d.toISOString()),
    appointments: appointments.map((a) => ({ ...a, withinHours: true })),
  };
}

/** A fetchDay whose responses the test releases by hand. */
function controlledFetch() {
  const pending: { date: string; resolve: (r: ApiResult<DayResponse>) => void }[] = [];
  const fetchDay = (date: string) => new Promise<ApiResult<DayResponse>>((resolve) => pending.push({ date, resolve }));
  const respond = (i: number, data: DayResponse) => pending[i]!.resolve({ ok: true, status: 200, data });
  return { fetchDay, pending, respond };
}

async function loaded(initial: AppointmentDto[]) {
  const f = controlledFetch();
  const store = new DayStore(f.fetchDay, SAT);
  const p = store.refresh();
  f.respond(0, day(initial));
  await p;
  return { store, f };
}

const names = (s: DayStore) => s.getView().data!.appointments.map((a) => a.patientName);

describe('DayStore', () => {
  it('applies a newer version and ignores older or duplicate ones', async () => {
    const { store } = await loaded([appt('a', 1, '14:00')]);
    store.applyAppointment(appt('a', 3, '14:00'));
    store.applyAppointment(appt('a', 2, '14:00')); // late
    store.applyAppointment(appt('a', 3, '14:00')); // duplicate
    expect(names(store)).toEqual(['بیمار a v3']);
  });

  it('adds a new appointment in time order and flags it against the hours', async () => {
    const { store } = await loaded([appt('a', 1, '16:00')]);
    store.applyAppointment(appt('b', 1, '14:30'));
    store.applyAppointment(appt('c', 1, '19:30')); // outside 14:00–19:00
    const list = store.getView().data!.appointments;
    expect(list.map((a) => a.id)).toEqual(['b', 'a', 'c']);
    expect(list.map((a) => a.withinHours)).toEqual([true, true, false]);
  });

  it('removes an appointment that was cancelled or moved to another day, and a late old event does not bring it back', async () => {
    const { store } = await loaded([appt('a', 1, '14:00'), appt('b', 1, '15:00')]);
    store.applyAppointment(appt('a', 2, '14:00', { status: 'cancelled' }));
    store.applyAppointment({ ...appt('b', 2, '15:00'), startAt: instantAt(SUN, '15:00').toISOString() });
    expect(store.getView().data!.appointments).toEqual([]);
    store.applyAppointment(appt('a', 1, '14:00'));
    store.applyAppointment(appt('b', 1, '15:00'));
    expect(store.getView().data!.appointments).toEqual([]);
  });

  it('a move within the day replaces whatever stale entry still sits in the target slot', async () => {
    const { store } = await loaded([appt('a', 1, '14:00'), appt('b', 1, '15:00')]);
    // b moved away (event not received yet) and a moved into 15:00.
    store.applyAppointment(appt('a', 2, '15:00'));
    expect(store.getView().data!.appointments.map((x) => [x.id, x.startAt])).toEqual([['a', instantAt(SAT, '15:00').toISOString()]]);
  });

  it('replays changes that arrive while a reload is in flight on top of the (older) snapshot', async () => {
    const { store, f } = await loaded([]);
    const reload = store.refresh();
    store.applyAppointment(appt('n', 1, '17:00')); // committed after the snapshot was read
    f.respond(1, day([])); // snapshot does not have it yet
    await reload;
    expect(names(store)).toEqual(['بیمار n v1']);
  });

  it('keeps the snapshot when it is newer than a change that arrived during the reload', async () => {
    const { store, f } = await loaded([appt('a', 1, '14:00')]);
    const reload = store.refresh();
    store.applyAppointment(appt('a', 2, '14:00'));
    f.respond(1, day([appt('a', 3, '14:00')]));
    await reload;
    expect(names(store)).toEqual(['بیمار a v3']);
  });

  it('drops the answer to a superseded request when the day changed meanwhile', async () => {
    const f = controlledFetch();
    const store = new DayStore(f.fetchDay, SAT);
    const first = store.setDate(SAT);
    const second = store.setDate(SUN);
    f.respond(1, day([], SUN));
    f.respond(0, day([appt('a', 1, '14:00')])); // late answer for Saturday
    await Promise.all([first, second]);
    expect(store.getView()).toMatchObject({ date: SUN, loading: false });
    expect(store.getView().data!.date).toBe(SUN);
    expect(store.getView().data!.appointments).toEqual([]);
  });

  it('keeps the last good data and reports the error when a reload fails', async () => {
    const f = controlledFetch();
    const store = new DayStore(f.fetchDay, SAT);
    const p0 = store.refresh();
    f.respond(0, day([appt('a', 1, '14:00')]));
    await p0;
    const p1 = store.refresh();
    f.pending[1]!.resolve({ ok: false, kind: 'network' });
    await p1;
    expect(store.getView()).toMatchObject({ error: 'network', loading: false });
    expect(names(store)).toEqual(['بیمار a v1']);
  });
});
