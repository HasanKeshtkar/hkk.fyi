'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import type { AppointmentDto } from '../../shared/api';
import { normalizePatientName } from '../../shared/patient-name';
import { normalizeIranMobile } from '../../shared/phone';
import { clinicDateOf } from '../../shared/time';
import { api, type ApiResult } from '../lib/api';
import type { DayStore } from '../lib/day-store';
import { jalaliLongLabel, phoneLabel, timeLabel } from '../lib/format';
import { useConnection } from '../lib/hooks';
import { FIELD_MESSAGES, genericMessage, messageFor, userName } from '../lib/messages';
import { useSession } from '../lib/session';
import { BottomSheet, ConfirmDialog } from './Overlays';
import { SlotPicker } from './SlotPicker';
import { showToast } from './Toasts';
import { IconClock, IconPhone, IconTrash } from './icons';

export type SheetTarget = { kind: 'create'; startAt: string } | { kind: 'edit'; appointment: AppointmentDto };

type Alert = { tone: 'error' | 'warn' | 'info'; text: string } | null;

/**
 * New appointment (name + phone + save), or an existing one: edit, call, move, cancel.
 * Every outcome the server can return is handled here, including someone else's change
 * landing first (409): the screen then shows the fresh data and says who changed it.
 */
export function AppointmentSheet(props: { target: SheetTarget; store: DayStore; onClose: () => void }) {
  const { users, me } = useSession();
  const online = useConnection() === 'online';
  const view$ = useSyncExternalStore(props.store.subscribe, props.store.getView, props.store.getView);
  const [appt, setAppt] = useState<AppointmentDto | null>(props.target.kind === 'edit' ? props.target.appointment : null);
  const [startAt, setStartAt] = useState(props.target.kind === 'create' ? props.target.startAt : props.target.appointment.startAt);
  const [name, setName] = useState(appt?.patientName ?? '');
  const [phone, setPhone] = useState(appt?.patientPhone ?? '');
  const [errors, setErrors] = useState<{ patientName?: string; patientPhone?: string }>({});
  const [alert, setAlert] = useState<Alert>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'form' | 'pick'>('form');
  const [confirm, setConfirm] = useState<null | { kind: 'cancel' } | { kind: 'move'; to: string }>(null);
  const [closedForGood, setClosedForGood] = useState(false); // the appointment is cancelled or moved away
  /** Her cancel or move whose answer was lost: it may have gone through. */
  const lostRef = useRef<null | { kind: 'cancel' } | { kind: 'move'; to: string }>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const isCreate = props.target.kind === 'create';
  const canWrite = online && !busy && !closedForGood;
  const savedRef = useRef(false); // our own write succeeded: the store echoes it, ignore that

  // While a save is in flight the sheet stays open, so its outcome (or error) is always seen
  // and a late success cannot close a sheet opened afterwards.
  const close = () => {
    if (!busy) props.onClose();
  };

  // Keep the open sheet in step with the list: a refresh or (phase 4) a realtime change may
  // bring a newer version of this appointment, or a booking into the slot being filled.
  const liveAppt = appt ? (view$.data?.appointments.find((a) => a.id === appt.id) ?? null) : null;
  const liveTaker = isCreate ? (view$.data?.appointments.find((a) => a.startAt === startAt) ?? null) : null;
  const dirty = appt !== null && (name !== appt.patientName || phone !== appt.patientPhone);
  // Each check also runs again when a save ends: the change may have arrived while it was in flight.
  useEffect(() => {
    if (savedRef.current || busy || !appt || !liveAppt || liveAppt.version <= appt.version) return;
    const lost = lostRef.current;
    if (lost?.kind === 'move' && liveAppt.updatedBy === me.id && liveAppt.startAt === lost.to) {
      // Her own move, whose answer was lost, went through after all.
      savedRef.current = true;
      props.store.applyAppointment(liveAppt);
      showToast(`نوبت به ${jalaliLongLabel(clinicDateOf(new Date(lost.to)))} ساعت ${timeLabel(lost.to)} منتقل شده است`);
      props.onClose();
      return;
    }
    if (
      liveAppt.updatedBy === me.id &&
      liveAppt.startAt === startAt &&
      liveAppt.patientName === normalizePatientName(name) &&
      liveAppt.patientPhone === normalizeIranMobile(phone)
    ) {
      // Her own edit of exactly this: a save whose answer was lost went through after all.
      savedRef.current = true;
      props.store.applyAppointment(liveAppt);
      showToast('تغییرات ذخیره شده است');
      props.onClose();
      return;
    }
    if (dirty) {
      // Keep what she typed; saving will be refused with the fresh data (409) and explain.
      setAlert({
        tone: 'warn',
        text: `این نوبت همین الان توسط ${userName(users, liveAppt.updatedBy)} تغییر کرده است. قبل از ذخیره، اطلاعات را بررسی کنید.`,
      });
    } else {
      adoptCurrent(liveAppt);
      setAlert({ tone: 'info', text: `این نوبت همین الان توسط ${userName(users, liveAppt.updatedBy)} به‌روز شد.` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveAppt?.version, busy]);
  const vanished = !isCreate && appt !== null && view$.data !== null && liveAppt === null;
  useEffect(() => {
    // Also checked when a save ends: it may have vanished while one was in flight. Not over a
    // more precise message already shown (e.g. who cancelled it).
    if (savedRef.current || busy || !vanished || closedForGood) return;
    const lost = lostRef.current;
    if (lost) {
      // Most likely her own cancel or move (to another day), whose answer was lost.
      setClosedForGood(true);
      setAlert({
        tone: 'info',
        text:
          lost.kind === 'cancel'
            ? 'لغو این نوبت به احتمال زیاد انجام شده است (فقط جواب سرور نرسید). فهرست را بررسی کنید.'
            : `انتقال این نوبت به ${jalaliLongLabel(clinicDateOf(new Date(lost.to)))} ساعت ${timeLabel(lost.to)} به احتمال زیاد انجام شده است (فقط جواب سرور نرسید). آن روز را بررسی کنید.`,
      });
      return;
    }
    setAlert({ tone: 'warn', text: 'این نوبت همین الان توسط کاربر دیگر جابه‌جا یا لغو شد. فهرست را بررسی کنید.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vanished, busy]);
  useEffect(() => {
    if (savedRef.current || busy || !liveTaker) return;
    // Her own booking of exactly this: a save whose answer was lost went through after all.
    if (
      liveTaker.createdBy === me.id &&
      liveTaker.patientName === normalizePatientName(name) &&
      liveTaker.patientPhone === normalizeIranMobile(phone)
    ) {
      savedRef.current = true;
      showToast('نوبت ثبت شده است');
      props.onClose();
      return;
    }
    setAlert({
      tone: 'error',
      text: `این ساعت همین الان توسط ${userName(users, liveTaker.updatedBy)} برای «${liveTaker.patientName}» رزرو شد. ساعت دیگری انتخاب کنید.`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveTaker?.id, busy]);

  function adoptCurrent(current: AppointmentDto) {
    props.store.applyAppointment(current);
    setAppt(current);
    setStartAt(current.startAt);
    setName(current.patientName);
    setPhone(current.patientPhone);
    setErrors({});
  }

  /** Common handling of a failed write. */
  function onFailure(res: Exclude<ApiResult<unknown>, { ok: true }>) {
    // Hide the keyboard so the message and the buttons under it are on screen.
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (res.kind === 'network') {
      setAlert({
        tone: 'warn',
        text: 'ارتباط وسط کار قطع شد و معلوم نیست ذخیره شد یا نه. فهرست نوبت‌ها دوباره خوانده می‌شود؛ قبل از تکرار، فهرست را نگاه کنید.',
      });
      void props.store.refresh();
      return;
    }
    const e = res.error;
    switch (e.error) {
      case 'slot_taken': {
        if (e.existing) props.store.applyAppointment(e.existing);
        const who = e.existing ? userName(users, e.existing.updatedBy) : 'کاربر دیگر';
        const patient = e.existing ? ` برای «${e.existing.patientName}»` : '';
        setAlert({ tone: 'error', text: `این ساعت همین الان توسط ${who}${patient} رزرو شد. ساعت دیگری انتخاب کنید.` });
        return;
      }
      case 'version_conflict':
        if (e.current) adoptCurrent(e.current);
        setAlert({
          tone: 'warn',
          text: `این نوبت همین الان توسط ${userName(users, e.current?.updatedBy)} تغییر کرده است. اطلاعات جدید نمایش داده شد؛ اگر لازم است دوباره ویرایش کنید.`,
        });
        return;
      case 'cancelled':
        if (e.current) props.store.applyAppointment(e.current);
        setClosedForGood(true);
        setAlert({ tone: 'error', text: `این نوبت قبلاً توسط ${userName(users, e.current?.updatedBy)} لغو شده است.` });
        return;
      case 'not_found':
        setClosedForGood(true);
        setAlert({ tone: 'error', text: 'این نوبت دیگر وجود ندارد.' });
        void props.store.refresh();
        return;
      case 'day_closed':
      case 'outside_hours':
        setAlert({ tone: 'error', text: `${messageFor(e)} ساعت کاری ممکن است همین الان تغییر کرده باشد.` });
        void props.store.refresh();
        return;
      case 'validation':
        if (e.field === 'patientName' || e.field === 'patientPhone') {
          setErrors({ [e.field]: FIELD_MESSAGES[e.field] });
          return;
        }
        setAlert({ tone: 'error', text: messageFor(e) });
        return;
      default:
        setAlert({ tone: 'error', text: genericMessage(res) });
    }
  }

  function validate(): { name: string; phone: string } | null {
    const n = normalizePatientName(name);
    const p = normalizeIranMobile(phone);
    const next: typeof errors = {};
    if (n === null) next.patientName = FIELD_MESSAGES.patientName;
    if (p === null) next.patientPhone = FIELD_MESSAGES.patientPhone;
    setErrors(next);
    return n !== null && p !== null ? { name: n, phone: p } : null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    const v = validate();
    if (!v) return;
    setAlert(null);
    setBusy(true);
    lostRef.current = null;
    try {
      if (isCreate) {
        const res = await api.createAppointment({ startAt, patientName: v.name, patientPhone: v.phone });
        if (!res.ok) {
          // A retry after a lost response finds her own booking in the slot: that is a success.
          const held = res.kind === 'http' && res.error.error === 'slot_taken' ? res.error.existing : null;
          if (held && held.createdBy === me.id && held.patientName === v.name && held.patientPhone === v.phone) {
            savedRef.current = true;
            props.store.applyAppointment(held);
            showToast('نوبت ثبت شده است');
            props.onClose();
            return;
          }
          return onFailure(res);
        }
        savedRef.current = true;
        props.store.applyAppointment(res.data);
        showToast('نوبت ثبت شد');
        props.onClose();
      } else if (appt) {
        if (v.name === appt.patientName && v.phone === appt.patientPhone) return props.onClose();
        const res = await api.updateAppointment(appt.id, {
          version: appt.version,
          patientName: v.name,
          patientPhone: v.phone,
        });
        if (!res.ok) return onFailure(res);
        savedRef.current = true;
        props.store.applyAppointment(res.data);
        showToast('تغییرات ذخیره شد');
        props.onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  async function doCancel() {
    if (!appt || !canWrite) return;
    setBusy(true);
    try {
      const res = await api.cancelAppointment(appt.id, appt.version);
      setConfirm(null);
      lostRef.current = !res.ok && res.kind === 'network' ? { kind: 'cancel' } : null;
      if (!res.ok) return onFailure(res);
      savedRef.current = true;
      props.store.applyAppointment(res.data);
      showToast('نوبت لغو شد');
      props.onClose();
    } finally {
      setBusy(false);
    }
  }

  async function doMove(to: string) {
    if (!appt || !canWrite) return;
    setBusy(true);
    try {
      const res = await api.updateAppointment(appt.id, { version: appt.version, startAt: to });
      setConfirm(null);
      setView('form');
      lostRef.current = !res.ok && res.kind === 'network' ? { kind: 'move', to } : null;
      if (!res.ok) return onFailure(res);
      savedRef.current = true;
      props.store.applyAppointment(res.data);
      showToast(`نوبت به ${jalaliLongLabel(clinicDateOf(new Date(to)))} ساعت ${timeLabel(to)} منتقل شد`);
      props.onClose();
    } finally {
      setBusy(false);
    }
  }

  const when = `${jalaliLongLabel(clinicDateOf(new Date(startAt)))} — ساعت ${timeLabel(startAt)}`;
  const title = isCreate ? 'نوبت جدید' : 'نوبت';

  if (view === 'pick') {
    return (
      <BottomSheet title={isCreate ? 'انتخاب ساعت دیگر' : 'تغییر ساعت نوبت'} subtitle={appt?.patientName} onClose={close}>
        <SlotPicker
          initialDate={clinicDateOf(new Date(startAt))}
          disabled={!canWrite}
          pickLabel={(s) => (isCreate ? `انتخاب ساعت ${timeLabel(s)}` : `انتقال به ساعت ${timeLabel(s)}`)}
          onPick={(s) => {
            if (isCreate) {
              setStartAt(s);
              setAlert(null);
              setView('form');
            } else {
              setConfirm({ kind: 'move', to: s });
            }
          }}
          onBack={() => setView('form')}
        />
        {confirm?.kind === 'move' ? (
          <ConfirmDialog
            message={`نوبت «${appt?.patientName}» به ${jalaliLongLabel(clinicDateOf(new Date(confirm.to)))} ساعت ${timeLabel(confirm.to)} منتقل شود؟`}
            confirmLabel="بله، منتقل شود"
            busy={busy}
            write
            onConfirm={() => void doMove(confirm.to)}
            onCancel={() => setConfirm(null)}
          />
        ) : null}
      </BottomSheet>
    );
  }

  return (
    <BottomSheet title={title} subtitle={when} onClose={close}>
      {!online ? (
        <div className="alert alert-warn">اتصال برقرار نیست؛ تا وصل شدن، ذخیره و تغییر ممکن نیست.</div>
      ) : null}
      {alert ? (
        <div className={`alert alert-${alert.tone}`} role="alert">
          {alert.text}
        </div>
      ) : null}
      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        <div className="field">
          <label htmlFor="patient-name">نام بیمار</label>
          <input
            id="patient-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus={isCreate}
            autoComplete="off"
            enterKeyHint="next"
            maxLength={120}
            disabled={closedForGood}
            aria-invalid={errors.patientName ? true : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                phoneRef.current?.focus();
              }
            }}
          />
          {errors.patientName ? <span className="field-error">{errors.patientName}</span> : null}
        </div>
        <div className="field">
          <label htmlFor="patient-phone">شماره موبایل</label>
          <input
            id="patient-phone"
            ref={phoneRef}
            className="input input-ltr"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            enterKeyHint="done"
            placeholder="09xxxxxxxxx"
            maxLength={20}
            value={phone}
            disabled={closedForGood}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={errors.patientPhone ? true : undefined}
          />
          {errors.patientPhone ? <span className="field-error">{errors.patientPhone}</span> : null}
        </div>
        <div className="sheet-actions">
          <button type="submit" className="btn btn-primary" disabled={!canWrite}>
            {busy ? 'در حال ذخیره…' : isCreate ? 'ذخیره نوبت' : 'ذخیره تغییرات'}
          </button>
          {isCreate && alert?.tone === 'error' ? (
            <button type="button" className="btn btn-secondary" disabled={!online} onClick={() => setView('pick')}>
              <IconClock />
              انتخاب ساعت دیگر
            </button>
          ) : null}
          {!isCreate && appt && !closedForGood ? (
            <>
              <a className="btn btn-secondary" href={`tel:${appt.patientPhone}`}>
                <IconPhone />
                تماس با {phoneLabel(appt.patientPhone)}
              </a>
              <button type="button" className="btn btn-secondary" disabled={!canWrite} onClick={() => setView('pick')}>
                <IconClock />
                تغییر ساعت
              </button>
              <button
                type="button"
                className="btn btn-danger-outline"
                disabled={!canWrite}
                onClick={() => setConfirm({ kind: 'cancel' })}
              >
                <IconTrash />
                لغو نوبت
              </button>
            </>
          ) : null}
          {closedForGood ? (
            <button type="button" className="btn btn-secondary" onClick={props.onClose}>
              بستن
            </button>
          ) : null}
        </div>
      </form>
      {confirm?.kind === 'cancel' && appt ? (
        <ConfirmDialog
          message={`نوبت «${appt.patientName}» در ${when} لغو شود؟`}
          confirmLabel="بله، لغو شود"
          cancelLabel="نه"
          danger
          busy={busy}
          write
          onConfirm={() => void doCancel()}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </BottomSheet>
  );
}
