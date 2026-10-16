'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MeResponse, UserDto } from '../../shared/api';
import { api, setUnauthorizedHandler } from './api';
import { NotificationCenter } from '../components/Notifications';
import { showToast } from '../components/Toasts';
import { connection } from './connection';
import { notificationStore } from './notifications';

interface SessionValue {
  me: UserDto;
  users: UserDto[];
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const v = useContext(SessionContext);
  if (!v) throw new Error('useSession outside <RequireSession>');
  return v;
}

/** Renders its children only for a signed-in user; otherwise sends the browser to the login screen. */
export function RequireSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<MeResponse | 'loading' | 'offline'>('loading');

  // The session is gone: close its realtime channel too (it must not keep hearing patient data,
  // nor be reused by whoever signs in next), forget its notifications, then go to the login screen.
  const signedOut = useCallback(() => {
    connection.stop();
    notificationStore.clear();
    router.replace('/login/');
  }, [router]);

  const load = useCallback(async (): Promise<boolean> => {
    const res = await api.me();
    if (res.ok) {
      setState(res.data);
      return true;
    }
    if (res.kind === 'http' && res.status === 401) signedOut();
    else setState((s) => (s === 'loading' ? 'offline' : s));
    return false;
  }, [signedOut]);

  useEffect(() => {
    setUnauthorizedHandler(signedOut);
    void load();
    const off = connection.onResync(load);
    return () => {
      off();
      setUnauthorizedHandler(null);
    };
  }, [load, signedOut]);

  // The realtime channel opens once we know who is signed in.
  const signedIn = typeof state === 'object';
  useEffect(() => {
    if (signedIn) connection.start(signedOut);
  }, [signedIn, signedOut]);

  const value = useMemo<SessionValue | null>(() => {
    if (state === 'loading' || state === 'offline') return null;
    return {
      me: state.user,
      users: state.users,
      logout: async () => {
        const res = await api.logout();
        if (res.ok || (res.kind === 'http' && res.status === 401)) {
          signedOut();
          return;
        }
        showToast('خروج انجام نشد؛ اتصال برقرار نیست. دوباره امتحان کنید.', 'error');
      },
    };
  }, [state, signedOut]);

  if (state === 'loading') return <div className="splash" aria-busy="true">در حال بارگذاری…</div>;
  if (state === 'offline')
    return (
      <div className="splash">
        <p>اتصال به سرور برقرار نیست.</p>
        <button className="btn btn-primary" onClick={() => void load()}>
          دوباره امتحان کنید
        </button>
      </div>
    );
  return (
    <SessionContext.Provider value={value}>
      {value?.me.role === 'secretary' ? <NotificationCenter /> : null}
      {children}
    </SessionContext.Provider>
  );
}
