import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

/** Bottom padding clears MobileBottomNav (~4.25rem) + iOS home indicator. */
export const PROFILE_SHEET_BOTTOM_CLEARANCE =
  'pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-3';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  closeLabel: string;
  testId: string;
  children: ReactNode;
  footer: ReactNode;
  /** When true, backdrop/X do not close (e.g. while saving). */
  busy?: boolean;
};

/**
 * Profile multi-select sheet portaled to document.body so it stacks above MobileBottomNav.
 * List scrolls; footer stays fixed inside the sheet and above the app chrome.
 */
export function ProfileMultiSelectSheet({
  open,
  onClose,
  title,
  subtitle,
  closeLabel,
  testId,
  children,
  footer,
  busy = false,
}: Props) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={clsx(
        'fixed inset-0 z-[400] flex items-end justify-center bg-slate-900/45 p-3 backdrop-blur-sm sm:items-center',
        PROFILE_SHEET_BOTTOM_CLEARANCE,
      )}
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={closeLabel}
        disabled={busy}
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        className="relative z-10 flex w-full max-w-lg max-h-[min(70dvh,calc(100dvh-5.5rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        data-testid={testId}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-base font-black text-slate-950">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!busy) onClose();
            }}
            disabled={busy}
            className="rounded-full bg-slate-100 p-2 text-slate-600 disabled:opacity-50"
            aria-label={closeLabel}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">{children}</div>
        <footer className="shrink-0 border-t border-slate-100 bg-white p-3">{footer}</footer>
      </div>
    </div>,
    document.body,
  );
}
