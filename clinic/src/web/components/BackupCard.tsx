'use client';

import { useEffect, useState } from 'react';
import type { BackupsResponse } from '../../shared/api';
import { clinicDateOf } from '../../shared/time';
import { api } from '../lib/api';
import { fa, jalaliLongLabel, timeLabel } from '../lib/format';
import { useConnection } from '../lib/hooks';

function sizeLabel(bytes: number): string {
  return bytes < 1024 * 1024 ? `${fa(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت` : `${fa((bytes / 1024 / 1024).toFixed(1))} مگابایت`;
}

/** Settings: whether the daily backups are running, and a copy of the newest one to keep elsewhere. */
export function BackupCard() {
  const online = useConnection() === 'online';
  const [status, setStatus] = useState<BackupsResponse | null>(null);

  useEffect(() => {
    if (!online) return;
    let live = true;
    void api.backups().then((res) => {
      if (live && res.ok) setStatus(res.data);
    });
    return () => {
      live = false;
    };
  }, [online]);

  return (
    <section className="card" aria-labelledby="backup-title" data-testid="backups">
      <h2 id="backup-title">پشتیبان‌گیری</h2>
      {!status ? <div className="skeleton" /> : null}
      {status && !status.enabled ? (
        <div className="alert alert-warn">پشتیبان‌گیری خودکار روی سرور فعال نیست.</div>
      ) : null}
      {status?.enabled && status.stale ? (
        <div className="alert alert-warn" role="alert">
          پشتیبان‌گیری خودکار بیش از یک روز است انجام نشده است. به مسئول فنی خبر دهید.
        </div>
      ) : null}
      {status?.latest ? (
        <>
          <p className="card-sub">
            آخرین پشتیبان خودکار: {jalaliLongLabel(clinicDateOf(new Date(status.latest.at)))}، ساعت {timeLabel(status.latest.at)}
          </p>
          <a className="btn btn-secondary" href={`/api/backups/${status.latest.name}`} download={status.latest.name}>
            دریافت آخرین پشتیبان ({sizeLabel(status.latest.bytes)})
          </a>
          <p className="card-sub" style={{ marginTop: 8, marginBottom: 0 }}>
            برای نگه‌داری یک نسخه روی رایانه. این فایل اطلاعات همه بیماران را دارد؛ آن را جای امن نگه دارید.
          </p>
        </>
      ) : null}
    </section>
  );
}
