'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { DayAppointmentDto, DayResponse } from '../../shared/api';
import { addDays, clinicToday, isIsoDate, SLOT_MS, type IsoDate } from '../../shared/time';
import { api } from '../lib/api';
import { connection } from '../lib/connection';
import { DayStore } from '../lib/day-store';
import { jalaliLongLabel, phoneLabel, timeLabel, wallTimeLabel } from '../lib/format';
import { useConnection, useNow, useOnForeground } from '../lib/hooks';
import { AppointmentSheet, type SheetTarget } from './AppointmentSheet';
import { ConnectionPill, OfflineBanner } from './ConnectionPill';
import { JalaliCalendar } from './JalaliCalendar';
import { BottomSheet } from './Overlays';
import { IconCalendar, IconChevronLeft, IconChevronRight, IconPlus, IconSettings, IconWarning } from './icons';

type Row =
  | { kind: 'slot'; startAt: string; appt: DayAppointmentDto | null }
  | { kind: 'extra'; startAt: string; appt: DayAppointmentDto };

/** Working-hours slots, with any appointment the hours no longer cover slotted in by time. */
function buildRows(day: DayResponse): Row[] {
  const byStart = new Map(day.appointments.map((a) => [a.startAt, a]));
  const rows: Row[] = day.slots.map((s) => ({ kind: 'slot', startAt: s, appt: byStart.get(s) ?? null }));
  const slotSet = new Set(day.slots);
  for (const a of day.appointments) if (!slotSet.has(a.startAt)) rows.push({ kind: 'extra', startAt: a.startAt, appt: a });
  return rows.sort((x, y) => x.startAt.localeCompare(y.startAt));
}

export function DayScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get('d');
  const date: IsoDate = requested && isIsoDate(requested) ? requested : clinicToday();

  const storeRef = useRef<DayStore | null>(null);
  storeRef.current ??= new DayStore(api.day, date);
  const store = storeRef.current;
  const view = useSyncExternalStore(store.subscribe, store.getView, store.getView);
  const status = useConnection();
  const online = status === 'online';
  const now = useNow();
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    void store.setDate(date);
  }, [store, date]);

  // Re-read the whole day whenever we may have missed something.
  const refresh = useCallback(() => void store.refresh(), [store]);
  useEffect(() => connection.onReconnect(refresh), [refresh]);
  useOnForeground(refresh);

  const goTo = (d: IsoDate) => router.replace(d === clinicToday() ? '/' : `/?d=${d}`, { scroll: false });

  const day = view.data && view.date === date ? view.data : null;
  const rows = day ? buildRows(day) : [];
  const today = clinicToday(new Date(now));

  return (
    <div className="app">
      <header className="topbar">
        <ConnectionPill />
        <span className="topbar-title">نوبت‌ها</span>
        <Link href="/settings/" className="icon-btn" aria-label="تنظیمات ساعت کاری">
          <IconSettings />
        </Link>
      </header>
      <OfflineBanner />

      <nav className="dayhead" aria-label="انتخاب روز">
        <button type="button" className="nav-btn" aria-label="روز قبل" onClick={() => goTo(addDays(date, -1))}>
          <IconChevronRight />
        </button>
        <button type="button" className="dayhead-date" onClick={() => setCalendarOpen(true)} data-testid="day-label">
          <IconCalendar />
          {jalaliLongLabel(date)}
        </button>
        <button type="button" className="nav-btn" aria-label="روز بعد" onClick={() => goTo(addDays(date, 1))}>
          <IconChevronLeft />
        </button>
      </nav>
      <div className="today-row">
        {date !== today ? (
          <button type="button" className="link-btn" onClick={() => goTo(today)}>
            برو به امروز
          </button>
        ) : null}
      </div>
      {day?.schedule.isOpen && day.schedule.startTime && day.schedule.endTime ? (
        <p className="hours-note">
          ساعت کاری {wallTimeLabel(day.schedule.startTime)} تا {wallTimeLabel(day.schedule.endTime)}
          {day.schedule.source === 'override' && day.schedule.note ? ` — ${day.schedule.note}` : ''}
        </p>
      ) : null}

      {view.error && !day ? (
        <div className="closed-card">
          <p>{view.error === 'network' ? 'اتصال برقرار نیست.' : 'خطا در دریافت نوبت‌ها.'}</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={refresh}>
            دوباره امتحان کنید
          </button>
        </div>
      ) : null}

      {!day && !view.error ? (
        <ul className="slots" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="skeleton" />
          ))}
        </ul>
      ) : null}

      {day && !day.schedule.isOpen ? (
        <div className="closed-card" data-testid="closed">
          <strong>تعطیل</strong>
          {day.schedule.note ? <p>{day.schedule.note}</p> : null}
          {day.appointments.length > 0 ? <p>این روز نوبت ثبت‌شده دارد؛ پایین‌تر آمده است.</p> : null}
        </div>
      ) : null}

      {day ? (
        <ul className="slots" data-testid="slots">
          {rows.map((row) => {
            const start = new Date(row.startAt).getTime();
            const isNow = now >= start && now < start + SLOT_MS;
            const isPast = now >= start + SLOT_MS;
            const a = row.appt;
            const classes = ['slot'];
            if (a) classes.push('is-booked');
            if (isNow) classes.push('is-now');
            if (isPast) classes.push('is-past');
            if (a && !a.withinHours) classes.push('is-warn');
            const nowBadge = isNow ? <span className="now-badge">اکنون</span> : null;

            if (!a) {
              return (
                <li key={row.startAt}>
                  <button
                    type="button"
                    className={classes.join(' ')}
                    disabled={!online}
                    onClick={() => setSheet({ kind: 'create', startAt: row.startAt })}
                    aria-label={`ساعت ${timeLabel(row.startAt)} خالی است؛ ثبت نوبت`}
                    data-slot={row.startAt}
                  >
                    {nowBadge}
                    <span className="slot-time">{timeLabel(row.startAt)}</span>
                    <span className="slot-empty-label">
                      <IconPlus />
                      خالی
                    </span>
                  </button>
                </li>
              );
            }
            return (
              <li key={a.id}>
                <div className={classes.join(' ')} data-slot={row.startAt}>
                  {nowBadge}
                  <span className="slot-time">{timeLabel(row.startAt)}</span>
                  <span className="slot-body">
                    <button
                      type="button"
                      className="slot-open"
                      onClick={() => setSheet({ kind: 'edit', appointment: a })}
                      aria-label={`نوبت ${a.patientName}، ساعت ${timeLabel(row.startAt)}`}
                    >
                      <span className="slot-name">{a.patientName}</span>
                    </button>
                    <a className="slot-phone" href={`tel:${a.patientPhone}`} aria-label={`تماس با ${a.patientName}`}>
                      {phoneLabel(a.patientPhone)}
                    </a>
                    {!a.withinHours ? (
                      <span className="warn-line">
                        <IconWarning />
                        {day.schedule.isOpen ? 'خارج از ساعت کاری فعلی' : 'روز تعطیل است'}
                      </span>
                    ) : null}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {sheet ? <AppointmentSheet key={sheetKey(sheet)} target={sheet} store={store} onClose={() => setSheet(null)} /> : null}
      {calendarOpen ? (
        <BottomSheet title="انتخاب روز" onClose={() => setCalendarOpen(false)}>
          <JalaliCalendar
            value={date}
            onPick={(d) => {
              setCalendarOpen(false);
              goTo(d);
            }}
          />
        </BottomSheet>
      ) : null}
    </div>
  );
}

function sheetKey(t: SheetTarget) {
  return t.kind === 'create' ? `c:${t.startAt}` : `e:${t.appointment.id}`;
}
