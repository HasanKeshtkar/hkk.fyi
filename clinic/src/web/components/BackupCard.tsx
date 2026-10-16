'use client';

import { useEffect, useState } from 'react';
import type { BackupInfo, BackupsResponse } from '../../shared/api';
import { clinicDateOf } from '../../shared/time';
import { api } from '../lib/api';
import { connection } from '../lib/connection';
import { fa, jalaliLongLabel, timeLabel } from '../lib/format';
import { useConnection } from '../lib/hooks';
import { genericMessage } from '../lib/messages';
import { BottomSheet, ConfirmDialog } from './Overlays';
import { showToast } from './Toasts';

function sizeLabel(bytes: number): string {
  return bytes < 1024 * 1024 ? `${fa(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت` : `${fa((bytes / 1024 / 1024).toFixed(1))} مگابایت`;
}

const when = (b: BackupInfo) => `${jalaliLongLabel(clinicDateOf(new Date(b.at)))}، ساعت ${timeLabel(b.at)}`;

/**
 * Settings: whether the daily backups are running, a copy of the newest one to keep elsewhere,
 * and going back to an earlier copy (the current data is saved first, so this can be undone).
 */
export function BackupCard() {
  const online = useConnection() === 'online';
  const [status, setStatus] = useState<BackupsResponse | null>(null);
  const [listing, setListing] = useState(false);
  const [confirm, setConfirm] = useState<BackupInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.backups().then((res) => {
      if (res.ok) setStatus(res.data);
      return res.ok;
    });

  useEffect(() => {
    if (online) void load();
  }, [online]);
  // After a restore (here or on the other phone) the list has a new pre-restore copy.
  useEffect(() => connection.onResync(load), []);

  async function restore(b: BackupInfo) {
    setBusy(true);
    try {
      const res = await api.restoreBackup(b.name);
      if (!res.ok) {
        showToast(genericMessage(res), 'error');
        return;
      }
      setConfirm(null);
      setListing(false);
      showToast(`اطلاعات به نسخه ${when(b)} برگشت.`);
      void load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="backup-title" data-testid="backups">
      <h2 id="backup-title">پشتیبان‌گیری</h2>
      {!status ? <div className="skeleton" /> : null}
      {status?.enabled && status.stale ? (
        <div className="alert alert-warn" role="alert">
          پشتیبان‌گیری خودکار بیش از یک روز است انجام نشده است. به مسئول فنی خبر دهید.
        </div>
      ) : null}
      {status?.latest ? (
        <>
          <p className="card-sub">آخرین پشتیبان خودکار: {when(status.latest)}</p>
          <a className="btn btn-secondary" href={`/api/backups/${status.latest.name}`} download={status.latest.name}>
            دریافت آخرین پشتیبان ({sizeLabel(status.latest.bytes)})
          </a>
          <p className="card-sub" style={{ marginTop: 8 }}>
            برای نگه‌داری یک نسخه جای دیگر. این فایل اطلاعات همه بیماران را دارد؛ آن را جای امن نگه دارید.
          </p>
        </>
      ) : null}
      {status && status.items.length > 0 ? (
        <button type="button" className="btn btn-secondary" disabled={!online} onClick={() => setListing(true)}>
          برگرداندن اطلاعات به یک روز قبل
        </button>
      ) : null}

      {listing && status ? (
        <BottomSheet title="برگرداندن اطلاعات" subtitle="نوبت‌ها و ساعت‌های کاری به آن زمان برمی‌گردند" onClose={() => setListing(false)}>
          <ul className="notes">
            {status.items.map((b) => (
              <li key={b.name} className="note">
                <button type="button" className="note-main" disabled={!online} onClick={() => setConfirm(b)}>
                  <span className="note-title">{when(b)}</span>
                  <span className="note-body">{b.name.startsWith('pre-restore-') ? 'نسخه ذخیره‌شده پیش از یک بازگردانی' : 'پشتیبان روزانه'}</span>
                </button>
              </li>
            ))}
          </ul>
        </BottomSheet>
      ) : null}
      {confirm ? (
        <ConfirmDialog
          message={`همه نوبت‌ها و ساعت‌های کاری به وضعیت ${when(confirm)} برمی‌گردند. وضعیت فعلی هم قبلش ذخیره می‌شود و می‌توانید دوباره به آن برگردید.`}
          confirmLabel="بله، برگردان"
          danger
          busy={busy}
          onConfirm={() => void restore(confirm)}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </section>
  );
}
