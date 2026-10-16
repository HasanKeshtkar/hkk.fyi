'use client';

import { SettingsScreen } from '../../web/components/SettingsScreen';
import { RequireSession } from '../../web/lib/session';

export default function SettingsPage() {
  return (
    <RequireSession>
      <SettingsScreen />
    </RequireSession>
  );
}
