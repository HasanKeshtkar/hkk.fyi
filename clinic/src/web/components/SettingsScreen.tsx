'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiError } from '../../shared/api';
import type { DateOverrideRecord, WeeklyDayRecord } from '../../shared/schedule';
import { clinicToday, minutesOf, wallTimeOf, type IsoDate } from '../../shared/time';
import { api, type ApiResult } from '../lib/api';
import { connection } from '../lib/connection';
import { fa, jalaliLongLabel, WEEK_ORDER, WEEKDAY_NAMES, wallTimeLabel } from '../lib/format';
import { useConnection } from '../lib/hooks';
import { genericMessage, messageFor, userName } from '../lib/messages';
import { useSession } from '../lib/session';
import { ConnectionPill, OfflineBanner } from './ConnectionPill';
import { JalaliCalendar } from './JalaliCalendar';
import { NotificationBell } from './Notifications';
import { BottomSheet, ConfirmDialog } from './Overlays';
import { showToast } from './Toasts';
import { IconChevronRight, IconLogout, IconPlus, IconTrash } from './icons';

const START_OPTIONS = Array.from({ length: 48 }, (_, i) => wallTimeOf(i * 30)); // 00:00 … 23:30
const END_OPTIONS = Array.from({ length: 48 }, (_, i) => wallTimeOf((i + 1) * 30)); // 00:30 … 24:00

function conflictText(users: ReturnType<typeof useSession>['users'], e: ApiError, what: string): string {
  const by = e.currentSchedule ? ` توسط ${userName(users, e.currentSchedule.updatedBy)}` : '';
  return `${what} همین الان${by} تغییر کرده است. مقدار جدید نمایش داده شد؛ اگر لازم است دوباره تغییر دهید.`;
}

function TimeSelect(props: { label: string; value: string; options: string[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <select
      className="select"
      aria-label={props.label}
      value={props.value}
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.target.value)}
    >
      {props.options.map((t) => (
        <option key={t} value={t}>
          {wallTimeLabel(t)}
        </option>
      ))}
    </select>
  );
}

/** One weekday: open/closed + hours, saved on its own with the version it was loaded at. */
function WeekRow(props: { saved: WeeklyDayRecord; onSaved: (r: WeeklyDayRecord) => void }) {
  const { users } = useSession();
  const online = useConnection() === 'online';
  const [draft, setDraft] = useState(props.saved);
  // The version the draft was started from: a save sends it, so a change made meanwhile by the
  // other person is never overwritten silently (the server answers 409 instead).
  const [base, setBase] = useState(props.saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'warn' | 'info'; text: string } | null>(null);

  const dirty = draft.isOpen !== base.isOpen || draft.startTime !== base.startTime || draft.endTime !== base.endTime;

  useEffect(() => {
    if (props.saved.version === base.version) return;
    if (dirty) {
      setMessage({
        tone: 'warn',
        text: `ساعت این روز همین الان توسط ${userName(users, props.saved.updatedBy)} تغییر کرد. با «ذخیره»، تغییر شما رد می‌شود و مقدار جدید نمایش داده می‌شود.`,
      });
      return;
    }
    setDraft(props.saved);
    setBase(props.saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.saved.version]);
  const invalid = draft.isOpen && minutesOf(draft.endTime) <= minutesOf(draft.startTime);

  async function save() {
    setBusy(true);
    setMessage(null);
    const res = await api.setWeekday(draft.weekday, {
      isOpen: draft.isOpen,
      startTime: draft.startTime,
      endTime: draft.endTime,
      version: base.version || null,
    });
    setBusy(false);
    if (res.ok) {
      setDraft(res.data);
      setBase(res.data);
      props.onSaved(res.data);
      showToast(`ساعت ${WEEKDAY_NAMES[draft.weekday]} ذخیره شد`);
      return;
    }
    if (res.kind === 'http' && res.error.error === 'schedule_conflict' && res.error.currentSchedule) {
      const current = res.error.currentSchedule as WeeklyDayRecord;
      setDraft(current);
      setBase(current);
      props.onSaved(current);
      setMessage({ tone: 'warn', text: conflictText(users, res.error, `ساعت ${WEEKDAY_NAMES[draft.weekday]}`) });
      return;
    }
    setMessage({ tone: 'error', text: genericMessage(res) });
  }

  const name = WEEKDAY_NAMES[draft.weekday];
  return (
    <div className="week-row" data-weekday={draft.weekday}>
      <div className="week-row-head">
        <span className="week-day">{name}</span>
        <div className="toggle" role="group" aria-label={`${name}: باز یا تعطیل`}>
          <button type="button" aria-pressed={draft.isOpen} onClick={() => setDraft({ ...draft, isOpen: true })}>
            باز
          </button>
          <button
            type="button"
            className="is-closed"
            aria-pressed={!draft.isOpen}
            onClick={() => setDraft({ ...draft, isOpen: false })}
          >
            تعطیل
          </button>
        </div>
      </div>
      {draft.isOpen ? (
        <div className="time-pair">
          <TimeSelect
            label={`${name}: ساعت شروع`}
            value={draft.startTime}
            options={START_OPTIONS}
            onChange={(v) => setDraft({ ...draft, startTime: v })}
          />
          <span>تا</span>
          <TimeSelect
            label={`${name}: ساعت پایان`}
            value={draft.endTime}
            options={END_OPTIONS}
            onChange={(v) => setDraft({ ...draft, endTime: v })}
          />
        </div>
      ) : null}
      {invalid ? <p className="field-error">ساعت پایان باید بعد از ساعت شروع باشد.</p> : null}
      {message ? <div className={`alert alert-${message.tone}`} style={{ marginTop: 10, marginBottom: 0 }}>{message.text}</div> : null}
      {dirty ? (
        <div className="btn-row" style={{ marginTop: 10 }}>
          <button type="button" className="btn btn-primary" disabled={!online || busy || invalid} onClick={() => void save()}>
            {busy ? 'در حال ذخیره…' : 'ذخیره'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setDraft(base)}>
            انصراف
          </button>
        </div>
      ) : null}
    </div>
  );
}

function overrideSummary(o: { isOpen: boolean; startTime: string | null; endTime: string | null }): string {
  return o.isOpen && o.startTime && o.endTime ? `ساعت ${wallTimeLabel(o.startTime)} تا ${wallTimeLabel(o.endTime)}` : 'تعطیل';
}

/** Add or change the exception for one date. */
function OverrideSheet(props: {
  initial: DateOverrideRecord | null;
  existing: DateOverrideRecord[];
  onSaved: (o: DateOverrideRecord) => void;
  onRemoved: (date: IsoDate) => void;
  onClose: () => void;
}) {
  const { users } = useSession();
  const online = useConnection() === 'online';
  const [date, setDate] = useState<IsoDate>(props.initial?.date ?? clinicToday());
  const [isOpen, setIsOpen] = useState(props.initial?.isOpen ?? false);
  const [startTime, setStartTime] = useState(props.initial?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(props.initial?.endTime ?? '13:00');
  const [note, setNote] = useState(props.initial?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'warn'; text: string } | null>(null);
  const [calendar, setCalendar] = useState(!props.initial);
  // The override version this form is based on (null: there was none). Refreshes of the list
  // behind the sheet must not move it, or a save would overwrite a change made meanwhile.
  const [baseVersion, setBaseVersion] = useState<number | null>(props.initial?.version ?? null);

  const current = props.existing.find((o) => o.date === date) ?? null;
  const invalid = isOpen && minutesOf(endTime) <= minutesOf(startTime);

  async function save() {
    setBusy(true);
    setMessage(null);
    const res = await api.setOverride(date, {
      isOpen,
      startTime: isOpen ? startTime : null,
      endTime: isOpen ? endTime : null,
      note: note.trim() || null,
      version: baseVersion,
    });
    setBusy(false);
    if (res.ok) {
      props.onSaved(res.data);
      showToast(`${jalaliLongLabel(date)} ذخیره شد`);
      props.onClose();
      return;
    }
    if (res.kind === 'http' && res.error.error === 'schedule_conflict') {
      const cs = res.error.currentSchedule as DateOverrideRecord | null | undefined;
      if (cs) {
        props.onSaved(cs);
        setBaseVersion(cs.version);
        setIsOpen(cs.isOpen);
        setStartTime(cs.startTime ?? '09:00');
        setEndTime(cs.endTime ?? '13:00');
        setNote(cs.note ?? '');
        setMessage({ tone: 'warn', text: conflictText(users, res.error, `تنظیم ${jalaliLongLabel(date)}`) });
      } else {
        // Removed by the other person meanwhile: the next save creates it again.
        props.onRemoved(date);
        setBaseVersion(null);
        setMessage({ tone: 'warn', text: `تنظیم ${jalaliLongLabel(date)} همین الان توسط کاربر دیگر حذف شد. اگر هنوز لازم است، دوباره «ذخیره» را بزنید.` });
      }
      return;
    }
    setMessage({ tone: 'error', text: res.kind === 'http' ? messageFor(res.error) : genericMessage(res) });
  }

  return (
    <BottomSheet title={props.initial ? 'تغییر روز خاص' : 'افزودن روز خاص'} subtitle={jalaliLongLabel(date)} onClose={props.onClose}>
      {message ? <div className={`alert alert-${message.tone}`}>{message.text}</div> : null}
      {calendar ? (
        <div className="field">
          <span className="field-label">تاریخ</span>
          <JalaliCalendar
            value={date}
            onPick={(d) => {
              setDate(d);
              setCalendar(false);
              const ex = props.existing.find((o) => o.date === d);
              setBaseVersion(ex?.version ?? null);
              if (ex) {
                setIsOpen(ex.isOpen);
                setStartTime(ex.startTime ?? '09:00');
                setEndTime(ex.endTime ?? '13:00');
                setNote(ex.note ?? '');
              }
            }}
          />
        </div>
      ) : (
        <div className="field">
          <span className="field-label">تاریخ</span>
          <button type="button" className="btn btn-secondary" onClick={() => setCalendar(true)} disabled={!!props.initial}>
            {jalaliLongLabel(date)}
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (online && !busy && !invalid) void save();
        }}
      >
      {current && !props.initial ? (
        <div className="alert alert-info">برای این روز قبلاً «{overrideSummary(current)}» ثبت شده؛ با ذخیره، جایگزین می‌شود.</div>
      ) : null}
      <div className="field">
        <span className="field-label">وضعیت این روز</span>
        <div className="toggle" role="group" aria-label="وضعیت روز" style={{ alignSelf: 'flex-start' }}>
          <button type="button" className="is-closed" aria-pressed={!isOpen} onClick={() => setIsOpen(false)}>
            تعطیل
          </button>
          <button type="button" aria-pressed={isOpen} onClick={() => setIsOpen(true)}>
            ساعت متفاوت
          </button>
        </div>
      </div>
      {isOpen ? (
        <div className="field">
          <span className="field-label">ساعت کاری این روز</span>
          <div className="time-pair">
            <TimeSelect label="ساعت شروع" value={startTime} options={START_OPTIONS} onChange={setStartTime} />
            <span>تا</span>
            <TimeSelect label="ساعت پایان" value={endTime} options={END_OPTIONS} onChange={setEndTime} />
          </div>
          {invalid ? <span className="field-error">ساعت پایان باید بعد از ساعت شروع باشد.</span> : null}
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="override-note">توضیح (اختیاری)</label>
        <input
          id="override-note"
          className="input"
          maxLength={200}
          placeholder="مثلاً: تعطیل رسمی"
          value={note}
          enterKeyHint="done"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="sheet-actions">
        <button type="submit" className="btn btn-primary" disabled={!online || busy || invalid}>
          {busy ? 'در حال ذخیره…' : 'ذخیره'}
        </button>
      </div>
      </form>
    </BottomSheet>
  );
}

export function SettingsScreen() {
  const { me, users, logout } = useSession();
  const online = useConnection() === 'online';
  const [weekly, setWeekly] = useState<WeeklyDayRecord[] | null>(null);
  const [overrides, setOverrides] = useState<DateOverrideRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ initial: DateOverrideRecord | null } | null>(null);
  const [removing, setRemoving] = useState<DateOverrideRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSeq = useRef(0);
  const load = useCallback(async (): Promise<boolean> => {
    const seq = ++loadSeq.current;
    const res: ApiResult<{ weekly: WeeklyDayRecord[]; overrides: DateOverrideRecord[] }> = await api.schedule();
    if (seq !== loadSeq.current) return true; // a newer re-read is under way
    if (res.ok) {
      // Keep each row object when nothing changed, and never let an older copy replace a newer one.
      setWeekly((prev) =>
        res.data.weekly.map((w) => {
          const p = prev?.find((x) => x.weekday === w.weekday);
          return p && p.version >= w.version ? p : w;
        }),
      );
      setOverrides(res.data.overrides);
      setError(null);
      return true;
    }
    setError(genericMessage(res));
    return false;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => connection.onResync(load), [load]);
  useEffect(() => connection.on('schedule', () => void load()), [load]);

  const upsertLocal = (o: DateOverrideRecord) =>
    setOverrides((list) => [...list.filter((x) => x.date !== o.date), o].sort((a, b) => a.date.localeCompare(b.date)));

  async function remove(o: DateOverrideRecord) {
    setBusy(true);
    const res = await api.deleteOverride(o.date, o.version);
    setBusy(false);
    setRemoving(null);
    if (res.ok || (res.kind === 'http' && res.status === 404)) {
      setOverrides((list) => list.filter((x) => x.date !== o.date));
      showToast(`${jalaliLongLabel(o.date)} حذف شد`);
      return;
    }
    if (res.kind === 'http' && res.error.error === 'schedule_conflict') {
      showToast(conflictText(users, res.error, `تنظیم ${jalaliLongLabel(o.date)}`), 'error', 6000);
      void load();
      return;
    }
    showToast(genericMessage(res), 'error');
  }

  const byWeekday = new Map((weekly ?? []).map((w) => [w.weekday, w]));
  const weekRows = WEEK_ORDER.map(
    (wd): WeeklyDayRecord =>
      byWeekday.get(wd) ?? { weekday: wd, isOpen: false, startTime: '14:00', endTime: '19:00', version: 0, updatedBy: null, updatedAt: '' },
  );

  return (
    <div className="app">
      <header className="topbar">
        <Link href="/" className="icon-btn" aria-label="برگشت به نوبت‌ها">
          <IconChevronRight />
        </Link>
        <span className="topbar-title">ساعت کاری</span>
        <NotificationBell />
        <ConnectionPill />
      </header>
      <OfflineBanner />
      <div className="page">
        {error && !weekly ? (
          <div className="card">
            <p>{error}</p>
            <button type="button" className="btn btn-primary" onClick={() => void load()}>
              دوباره امتحان کنید
            </button>
          </div>
        ) : null}

        <section className="card" aria-labelledby="weekly-title">
          <h2 id="weekly-title">ساعت کاری هفتگی</h2>
          <p className="card-sub">تغییر ساعت، هیچ نوبتی را حذف نمی‌کند. نوبت‌های خارج از ساعت جدید با علامت هشدار نشان داده می‌شوند.</p>
          {weekly
            ? weekRows.map((w) => (
                <WeekRow
                  key={w.weekday}
                  saved={w}
                  onSaved={(r) => setWeekly((list) => [...(list ?? []).filter((x) => x.weekday !== r.weekday), r])}
                />
              ))
            : Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton" style={{ marginBottom: 8 }} />)}
        </section>

        <section className="card" aria-labelledby="overrides-title">
          <h2 id="overrides-title">روزهای خاص</h2>
          <p className="card-sub">برای تعطیلی رسمی، مرخصی، یا ساعت متفاوت در یک تاریخ مشخص.</p>
          {overrides.length === 0 ? <p className="empty-note">روز خاصی ثبت نشده است.</p> : null}
          {overrides.map((o) => (
            <div className="override-item" key={o.date}>
              <button
                type="button"
                className="override-main"
                style={{ border: 0, background: 'transparent', textAlign: 'start', padding: 0 }}
                onClick={() => setEditing({ initial: o })}
              >
                <div className="override-date">{jalaliLongLabel(o.date)}</div>
                <div className="override-desc">
                  {overrideSummary(o)}
                  {o.note ? ` — ${o.note}` : ''}
                </div>
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`حذف ${jalaliLongLabel(o.date)}`}
                disabled={!online}
                onClick={() => setRemoving(o)}
              >
                <IconTrash />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary" style={{ marginTop: 8 }} disabled={!online} onClick={() => setEditing({ initial: null })}>
            <IconPlus />
            افزودن روز خاص
          </button>
        </section>

        <section className="card">
          <p className="card-sub" style={{ marginBottom: 8 }}>
            وارد شده با نام «{me.name}» ({me.role === 'doctor' ? 'دکتر' : 'منشی'})
          </p>
          <button type="button" className="btn btn-secondary" disabled={!online} onClick={() => void logout()}>
            <IconLogout />
            خروج از حساب
          </button>
        </section>
        <p className="hours-note">{fa('نسخه ۱')}</p>
      </div>

      {editing ? (
        <OverrideSheet
          initial={editing.initial}
          existing={overrides}
          onSaved={upsertLocal}
          onRemoved={(d) => setOverrides((list) => list.filter((x) => x.date !== d))}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {removing ? (
        <ConfirmDialog
          message={`تنظیم «${jalaliLongLabel(removing.date)}» حذف شود؟ ساعت کاری هفتگی دوباره برای این روز اعمال می‌شود.`}
          confirmLabel="بله، حذف شود"
          danger
          busy={busy}
          onConfirm={() => void remove(removing)}
          onCancel={() => setRemoving(null)}
        />
      ) : null}
    </div>
  );
}
