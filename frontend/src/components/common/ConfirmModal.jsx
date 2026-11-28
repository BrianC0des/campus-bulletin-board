import React, { useEffect, useRef, useId } from 'react';

export default function ConfirmModal({
  open,
  eyebrow = 'CONFIRMATION',
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  isAlert = false,
  onCancel,
  onConfirm,
}) {
  const titleId = useId();
  const confirmBtnRef = useRef(null);
  const previousFocusRef = useRef(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  closeRef.current = onCancel || onConfirm;

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;
    confirmBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialogRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel || onConfirm}>
      <div
        ref={dialogRef}
        className="sketch-box confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="eyebrow">{eyebrow}</div>
        <h3 id={titleId}>{title}</h3>
        {description && <p>{description}</p>}
        <div className="confirm-actions">
          {!isAlert && (
            <button type="button" className="wire-button" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmBtnRef}
            type="button"
            className={`wire-button ${danger ? 'danger-solid' : 'dark'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
