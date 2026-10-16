'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MeResponse, UserDto } from '../../shared/api';
import { api, setUnauthorizedHandler } from './api';
import { showToast } from '../components/Toasts';
import { connection } from './connection';

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

  const load = useCallback(async () => {
    const res = await api.me();
    if (res.ok) setState(res.data);
    else if (res.kind === 'http' && res.status === 401) router.replace('/login/');
    else setState((s) => (s === 'loading' ? 'offline' : s));
  }, [router]);

  useEffect(() => {
    connection.start();
    setUnauthorizedHandler(() => router.replace('/login/'));
    void load();
    const off = connection.onReconnect(() => void load());
    return () => {
      off();
      setUnauthorizedHandler(null);
    };
  }, [load, router]);

  const value = useMemo<SessionValue | null>(() => {
    if (state === 'loading' || state === 'offline') return null;
    return {
      me: state.user,
      users: state.users,
      logout: async () => {
        const res = await api.logout();
        if (res.ok || (res.kind === 'http' && res.status === 401)) {
          router.replace('/login/');
          return;
        }
        showToast('خروج انجام نشد؛ اتصال برقرار نیست. دوباره امتحان کنید.', 'error');
      },
    };
  }, [state, router]);

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
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
