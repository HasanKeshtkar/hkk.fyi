'use client';

import { useSyncExternalStore } from 'react';

interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'error';
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Shows a short message at the top of the screen. */
export function showToast(text: string, tone: Toast['tone'] = 'info', ms = 3500): void {
  const id = nextId++;
  toasts = [...toasts, { id, text, tone }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, ms);
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const EMPTY: Toast[] = [];

export function ToastHost() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast${t.tone === 'error' ? ' toast-error' : ''}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
