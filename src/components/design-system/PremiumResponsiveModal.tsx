import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { CloseToHomeButton } from '@/components/layout/CloseToHomeButton';

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Accent for primary confirm button: default blue, cancel uses amber */
  variant?: 'default' | 'danger';
  /** Camada do overlay — use "elevated" para ficar acima de heroes/composições */
  layer?: 'default' | 'elevated';
  /** Opt-in for nested forms that must retain keyboard focus and close locally. */
  manageFocus?: boolean;
  closeToHome?: boolean;
  closeLabel?: string;
};

const OVERLAY_LAYER_CLASS = {
  default: 'z-[120]',
  elevated: 'z-[1000]',
} as const;

export function PremiumResponsiveModal({
  open,
  onClose,
  title,
  children,
  footer,
  variant = 'default',
  layer = 'default',
  manageFocus = false,
  closeToHome = true,
  closeLabel = 'Close',
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open || !manageFocus) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus();
  }, [open, manageFocus]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={clsx(
        'fixed inset-0 flex items-end justify-center bg-slate-900/55 backdrop-blur-sm md:items-center md:p-4',
        OVERLAY_LAYER_CLASS[layer],
      )}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        tabIndex={manageFocus ? -1 : undefined}
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (!manageFocus) return;
          if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
          if (event.key !== 'Tab') return;
          const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]') ?? []);
          const first = controls[0], last = controls[controls.length - 1];
          if (!first) { event.preventDefault(); return; }
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
            event.preventDefault(); last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first.focus();
          }
        }}
        role="dialog"
        aria-modal="true"
        className={clsx(
          'outline-none motion-reduce:animate-none relative w-full max-w-[480px] bg-white shadow-[0_-8px_40px_rgba(15,23,42,0.18)]',
          'rounded-t-[1.75rem] md:rounded-[1.75rem]',
          'max-h-[min(92dvh,640px)] flex flex-col',
          'pb-[max(env(safe-area-inset-bottom),0.75rem)] md:pb-0',
          'animate-in slide-in-from-bottom-6 fade-in duration-300 md:zoom-in-95',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 md:hidden">
          <span className="h-1 w-10 rounded-full bg-slate-200" aria-hidden />
        </div>

        <header className="flex items-start gap-3 border-b border-slate-100 px-5 pb-4 pt-2 md:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-black leading-snug text-slate-950">{title}</h2>
          </div>
          {closeToHome ? <CloseToHomeButton
            onBeforeNavigate={onClose}
            className="border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-slate-800"
          /> : <button type="button" onClick={onClose} aria-label={closeLabel} className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 text-xl focus-visible:ring-2 focus-visible:ring-blue-600">×</button>}
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <footer
            className={clsx(
              'border-t border-slate-100 px-5 py-4',
              variant === 'danger' ? '' : '',
            )}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
