'use client';

import { useSyncExternalStore } from 'react';
import { install } from '../lib/install';

/** Settings: put the app on the phone's home screen (hidden once it runs as an installed app). */
export function InstallCard() {
  const available = useSyncExternalStore(install.subscribe, install.available, () => false);
  const installed = useSyncExternalStore(install.subscribe, install.installed, () => false);
  if (installed) return null;
  return (
    <section className="card" aria-labelledby="install-title">
      <h2 id="install-title">نصب روی گوشی</h2>
      {available ? (
        <button type="button" className="btn btn-primary" onClick={() => void install.prompt()}>
          نصب برنامه روی صفحه اصلی
        </button>
      ) : (
        <p className="card-sub" style={{ marginBottom: 0 }}>
          در کروم، منوی ⋮ (بالای صفحه) را بزنید و «نصب برنامه» یا «افزودن به صفحه اصلی» را انتخاب کنید.
        </p>
      )}
    </section>
  );
}
