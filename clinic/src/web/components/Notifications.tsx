'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { clinicDateOf, clinicToday } from '../../shared/time';
import { chime, unlockSoundOnFirstTouch } from '../lib/chime';
import { connection } from '../lib/connection';
import { fa, phoneLabel } from '../lib/format';
import { useConnection } from '../lib/hooks';
import { describeNotification } from '../lib/messages';
import { notificationStore } from '../lib/notifications';
import { useSession } from '../lib/session';
import { afterOverlayClosed, BottomSheet } from './Overlays';
import { showToast } from './Toasts';

const BASE_TITLE = 'نوبت‌دهی مطب';

function useNotifications() {
  return useSyncExternalStore(notificationStore.subscribe, notificationStore.get, notificationStore.get);
}

/**
 * Mounted on every screen of a signed-in secretary: keeps the unread list in step with the server
 * and announces each new change by the doctor with a chime, a vibration and a message.
 */
export function NotificationCenter() {
  const { users } = useSession();
  const { count } = useNotifications();
  const usersRef = useRef(users);
  usersRef.current = users;

  useEffect(() => {
    unlockSoundOnFirstTouch();
    void notificationStore.load();
    const off = connection.onResync(() => notificationStore.load());
    notificationStore.setAnnouncer((n) => {
      const { title, body } = describeNotification(n, usersRef.current);
      chime();
      showToast(`${title} — ${body}`, 'info', 7000);
    });
    return () => {
      off();
      notificationStore.setAnnouncer(null);
    };
  }, []);

  // The count in the tab title and, where the phone supports it, on the app icon.
  useEffect(() => {
    document.title = count > 0 ? `(${fa(count)}) ${BASE_TITLE}` : BASE_TITLE;
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (count > 0) void nav.setAppBadge?.(count).catch(() => {});
    else void nav.clearAppBadge?.().catch(() => {});
  }, [count]);

  return null;
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </svg>
  );
}

/** The bell in the top bar (secretary only), with the unread count; opens the list. */
export function NotificationBell() {
  const { me, users } = useSession();
  const router = useRouter();
  const { items, count } = useNotifications();
  const [open, setOpen] = useState(false);
  const online = useConnection() === 'online';
  if (me.role !== 'secretary') return null;

  const goTo = (startAt: string) => {
    const d = clinicDateOf(new Date(startAt));
    router.replace(d === clinicToday() ? '/' : `/?d=${d}`, { scroll: false });
  };

  return (
    <>
      <button
        type="button"
        className="icon-btn bell"
        aria-label={count > 0 ? `اعلان‌ها: ${fa(count)} خوانده‌نشده` : 'اعلان‌ها'}
        onClick={() => setOpen(true)}
        data-testid="bell"
      >
        <BellIcon />
        {count > 0 ? <span className="badge">{fa(count > 99 ? '99+' : count)}</span> : null}
      </button>
      {open ? (
        <BottomSheet title="اعلان‌ها" subtitle={count > 0 ? `${fa(count)} خوانده‌نشده` : undefined} onClose={() => setOpen(false)}>
          {items.length === 0 ? <p className="empty-note">اعلان تازه‌ای نیست.</p> : null}
          <ul className="notes">
            {items.map((n) => {
              const { title, body } = describeNotification(n, users);
              return (
                <li key={n.id} className="note">
                  <button
                    type="button"
                    className="note-main"
                    onClick={() => {
                      void notificationStore.markRead([n.id]);
                      afterOverlayClosed(() => goTo(n.payload.after.startAt));
                      setOpen(false);
                    }}
                  >
                    <span className="note-title">{title}</span>
                    <span className="note-body">{body}</span>
                  </button>
                  <a className="note-phone" href={`tel:${n.payload.after.patientPhone}`}>
                    {phoneLabel(n.payload.after.patientPhone)}
                  </a>
                </li>
              );
            })}
          </ul>
          {items.length > 0 ? (
            <div className="sheet-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!online}
                onClick={() => void notificationStore.markRead('all')}
              >
                همه را خواندم
              </button>
            </div>
          ) : null}
        </BottomSheet>
      ) : null}
    </>
  );
}
