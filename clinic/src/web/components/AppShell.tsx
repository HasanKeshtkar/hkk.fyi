'use client';

import { useEffect } from 'react';
import '../lib/install'; // starts listening for Chrome's install offer as early as possible

/** Registers the service worker (production builds only: in development it would cache stale code). */
export function AppShell() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {});
  }, []);
  return null;
}
