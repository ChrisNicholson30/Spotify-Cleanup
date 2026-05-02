import { useEffect, useRef, useState } from 'react';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  holdToConfirmMs?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  holdToConfirmMs = 0,
  onConfirm,
  onCancel,
}: Props) {
  const [progress, setProgress] = useState(0);
  const holdRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      if (holdRef.current) cancelAnimationFrame(holdRef.current);
      holdRef.current = null;
      startRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const requiresHold = holdToConfirmMs > 0;

  const beginHold = () => {
    if (!requiresHold) {
      onConfirm();
      return;
    }
    startRef.current = performance.now();
    const tick = () => {
      const start = startRef.current;
      if (start == null) return;
      const elapsed = performance.now() - start;
      const p = Math.min(1, elapsed / holdToConfirmMs);
      setProgress(p);
      if (p >= 1) {
        startRef.current = null;
        holdRef.current = null;
        onConfirm();
        return;
      }
      holdRef.current = requestAnimationFrame(tick);
    };
    holdRef.current = requestAnimationFrame(tick);
  };

  const endHold = () => {
    if (holdRef.current) cancelAnimationFrame(holdRef.current);
    holdRef.current = null;
    startRef.current = null;
    if (progress < 1) setProgress(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg bg-bg-elev border border-line shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <h2 className="text-lg font-semibold mb-1">{title}</h2>
          {description && <p className="text-sm text-fg-muted whitespace-pre-line">{description}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={destructive ? 'btn-danger relative overflow-hidden' : 'btn-primary'}
            onMouseDown={beginHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={beginHold}
            onTouchEnd={endHold}
            onTouchCancel={endHold}
            onClick={(e) => {
              if (!requiresHold) return;
              e.preventDefault();
            }}
          >
            {requiresHold && (
              <span
                className="absolute inset-y-0 left-0 bg-white/25"
                style={{ width: `${progress * 100}%` }}
              />
            )}
            <span className="relative">
              {requiresHold ? `Hold to ${confirmLabel.toLowerCase()}` : confirmLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
