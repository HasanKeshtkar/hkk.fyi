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
