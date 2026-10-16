'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconClose } from './icons';

// ---------------------------------------------------------------------------------------------
// Back button: every open sheet or dialog owns one browser-history entry, so Android's Back
// closes the top-most overlay instead of leaving the app (and losing what was typed).
// Entries are pushed with Next's own history state spread in, so its router keeps working.
// ---------------------------------------------------------------------------------------------

interface OverlayEntry {
  id: number;
  /** null once the overlay has unmounted (its history entry is then due to be dropped) */
  close: (() => void) | null;
}

/** Our history entries, oldest first, as long as they are in the browser history. */
const entries: OverlayEntry[] = [];
let nextId = 1;
let listening = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let afterBack: (() => void) | null = null;

const overlayIdOf = (state: unknown): number => (state as { __overlay?: number } | null)?.__overlay ?? 0;

function runAfterBack() {
  const run = afterBack;
  afterBack = null;
  run?.();
}

function onPopState(e: PopStateEvent) {
  const current = overlayIdOf(e.state);
  // Every overlay opened after the entry we are now on has been "backed out of": close it.
  while (entries.length && entries[entries.length - 1]!.id > current) {
    const entry = entries.pop()!;
    const close = entry.close;
    entry.close = null;
    close?.();
  }
  runAfterBack();
}

/** Drops the history entries of overlays that were closed in-app (✕, backdrop, Save…). */
function flush() {
  flushTimer = null;
  let n = 0;
  while (n < entries.length && entries[entries.length - 1 - n]!.close === null) n++;
  if (n > 0 && overlayIdOf(history.state) === entries[entries.length - 1]!.id) {
    entries.splice(entries.length - n, n);
    history.go(-n); // popstate then runs any afterBack
  } else {
    runAfterBack();
  }
}

/** Runs `fn` once the overlay now closing has given its history entry back (e.g. before navigating). */
export function afterOverlayClosed(fn: () => void): void {
  afterBack = fn;
}

function useBackToClose(onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!listening) {
      window.addEventListener('popstate', onPopState);
      listening = true;
    }
    const close = () => closeRef.current();
    const top = entries[entries.length - 1];
    let entry: OverlayEntry;
    if (top && top.close === null && overlayIdOf(history.state) === top.id) {
      // An overlay just closed in this same tick (or React re-ran this effect): reuse its entry.
      top.close = close;
      entry = top;
    } else {
      entry = { id: nextId++, close };
      history.pushState({ ...(history.state as object | null), __overlay: entry.id }, '');
      entries.push(entry);
    }
    return () => {
      if (!entries.includes(entry)) return; // already backed out of
      entry.close = null;
      flushTimer ??= setTimeout(flush, 0);
    };
  }, []);
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

function useNoBodyScroll() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
}

/** A panel that slides up from the bottom of the screen; tap outside, ✕ or Back to close. */
export function BottomSheet(props: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  useEscape(props.onClose);
  useNoBodyScroll();
  useBackToClose(props.onClose);
  return (
    <>
      <div className="backdrop" onClick={props.onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2 className="sheet-title" id={titleId}>
            {props.title}
            {props.subtitle ? <span className="sheet-sub">{props.subtitle}</span> : null}
          </h2>
          <button type="button" className="icon-btn" onClick={props.onClose} aria-label="بستن">
            <IconClose />
          </button>
        </div>
        {props.children}
      </section>
    </>
  );
}

/** A yes/no question over everything else (used before destructive actions). */
export function ConfirmDialog(props: {
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEscape(props.onCancel);
  useBackToClose(props.onCancel);
  return (
    <>
      <div className="backdrop dialog-backdrop" onClick={props.onCancel} />
      <div className="dialog" role="alertdialog" aria-modal="true">
        <p>{props.message}</p>
        <div className="btn-row">
          <button
            type="button"
            className={`btn ${props.danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={props.onConfirm}
            disabled={props.busy}
          >
            {props.confirmLabel}
          </button>
          <button type="button" className="btn btn-secondary" onClick={props.onCancel}>
            {props.cancelLabel ?? 'انصراف'}
          </button>
        </div>
      </div>
    </>
  );
}
