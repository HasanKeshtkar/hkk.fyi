'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DayResponse } from '../../shared/api';
import { addDays, SLOT_MS, type IsoDate } from '../../shared/time';
import { api } from '../lib/api';
import { jalaliLongLabel, timeLabel } from '../lib/format';
import { genericMessage } from '../lib/messages';
import { JalaliCalendar } from './JalaliCalendar';
import { IconCalendar, IconChevronLeft, IconChevronRight } from './icons';

/**
 * Lists the free, not-yet-past slots of a day (any day) so the user can pick one: used to move an
 * appointment, or to choose another time when the tapped slot was taken meanwhile.
 */
export function SlotPicker(props: {
  initialDate: IsoDate;
  pickLabel: (startAt: string) => string;
  onPick: (startAt: string) => void;
  onBack: () => void;
  disabled?: boolean;
}) {
  const [date, setDate] = useState(props.initialDate);
  const [day, setDay] = useState<DayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [calendar, setCalendar] = useState(false);

  const load = useCallback(async (d: IsoDate) => {
    setDay(null);
    setError(null);
    setPicked(null);
    const res = await api.day(d);
    if (res.ok) setDay(res.data);
    else setError(genericMessage(res));
  }, []);

  useEffect(() => {
    void load(date);
  }, [date, load]);

  const now = Date.now();
  const taken = new Set(day?.appointments.map((a) => a.startAt));
  const free = (day?.slots ?? []).filter((s) => !taken.has(s) && new Date(s).getTime() + SLOT_MS > now);

  return (
    <div>
      <div className="dayhead" style={{ padding: '0 0 8px' }}>
        <button type="button" className="nav-btn" aria-label="روز قبل" onClick={() => setDate(addDays(date, -1))}>
          <IconChevronRight />
        </button>
        <button type="button" className="dayhead-date" style={{ fontSize: 17 }} onClick={() => setCalendar((v) => !v)}>
          <IconCalendar />
          {jalaliLongLabel(date)}
        </button>
        <button type="button" className="nav-btn" aria-label="روز بعد" onClick={() => setDate(addDays(date, 1))}>
          <IconChevronLeft />
        </button>
      </div>
      {calendar ? (
        <div style={{ marginBottom: 12 }}>
          <JalaliCalendar
            value={date}
            onPick={(d) => {
              setCalendar(false);
              setDate(d);
            }}
          />
        </div>
      ) : null}
      {error ? <div className="alert alert-error">{error}</div> : null}
      {!day && !error ? <div className="skeleton" style={{ marginBottom: 12 }} /> : null}
      {day && !day.schedule.isOpen ? <p className="empty-note">این روز تعطیل است.</p> : null}
      {day && day.schedule.isOpen && free.length === 0 ? <p className="empty-note">ساعت خالی در این روز نیست.</p> : null}
      {free.length > 0 ? (
        <div className="free-slots" role="group" aria-label="ساعت‌های خالی">
          {free.map((s) => (
            <button
              type="button"
              key={s}
              className="free-slot"
              aria-pressed={picked === s}
              onClick={() => setPicked(s)}
            >
              {timeLabel(s)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="sheet-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!picked || props.disabled}
          onClick={() => picked && props.onPick(picked)}
        >
          {picked ? props.pickLabel(picked) : 'یک ساعت خالی انتخاب کنید'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={props.onBack}>
          برگشت
        </button>
      </div>
    </div>
  );
}
