'use client';

import { useEffect, useId, type ReactNode } from 'react';
import { IconClose } from './icons';

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

/** A panel that slides up from the bottom of the screen; tap outside or ✕ to close. */
export function BottomSheet(props: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  useEscape(props.onClose);
  useNoBodyScroll();
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
