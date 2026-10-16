'use client';

import { Suspense } from 'react';
import { DayScreen } from '../web/components/DayScreen';
import { RequireSession } from '../web/lib/session';

export default function DayPage() {
  return (
    <Suspense fallback={<div className="splash">در حال بارگذاری…</div>}>
      <RequireSession>
        <DayScreen />
      </RequireSession>
    </Suspense>
  );
}
