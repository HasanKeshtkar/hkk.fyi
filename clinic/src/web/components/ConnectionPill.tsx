'use client';

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

/** Shown under the top bar while writes are disabled. */
export function OfflineBanner() {
  const status = useConnection();
  if (status === 'online') return null;
  return (
    <div className="banner banner-offline" role="alert">
      {status === 'offline'
        ? 'اینترنت قطع است. تا وصل شدن، ثبت و تغییر نوبت ممکن نیست.'
        : 'در حال اتصال به سرور… تا وصل شدن، ثبت و تغییر نوبت ممکن نیست.'}
    </div>
  );
}
