'use client';

import { useEffect, useState } from 'react';
import { useConnection } from '../lib/hooks';

const LABEL = { online: 'آنلاین', connecting: 'در حال اتصال', offline: 'قطع' } as const;

export function ConnectionPill() {
  const status = useConnection();
  return (
    <span className={`pill pill-${status}`} role="status" aria-live="polite" data-testid="connection">
      {LABEL[status]}
    </span>
  );
}

/** Shown under the top bar while writes are disabled (after a moment, so a quick re-read does not flash it). */
export function OfflineBanner() {
  const status = useConnection();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (status === 'online') {
      setShown(false);
      return;
    }
    const t = setTimeout(() => setShown(true), status === 'offline' ? 0 : 1200);
    return () => clearTimeout(t);
  }, [status]);
  if (status === 'online' || !shown) return null;
  return (
    <div className="banner banner-offline" role="alert">
      {status === 'offline'
        ? 'اینترنت قطع است. تا وصل شدن، ثبت و تغییر نوبت ممکن نیست.'
        : 'در حال اتصال به سرور… تا وصل شدن، ثبت و تغییر نوبت ممکن نیست.'}
    </div>
  );
}
