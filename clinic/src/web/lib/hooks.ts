'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { connection, type ConnectionStatus } from './connection';

export function useConnection(): ConnectionStatus {
  return useSyncExternalStore(connection.subscribe, () => connection.get(), () => 'connecting');
}

/** The current time, refreshed every `everyMs` (for the "now" highlight). */
export function useNow(everyMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

/** Runs `fn` whenever the app comes back to the foreground. */
export function useOnForeground(fn: () => void): void {
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') fn();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [fn]);
}
