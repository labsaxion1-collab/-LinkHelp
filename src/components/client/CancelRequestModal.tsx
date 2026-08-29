import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirming?: boolean;
};

/**
 * Compact centered cancel confirmation — 7 LC fee (0065 client_cancel_request).
 */
export function CancelRequestModal({ open, onClose, onConfirm, confirming }: Props) {
  const { t } = useLanguage();
  const titleId = useId();
  const descriptionId = useId();
  const warningId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const keepButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      keepButtonRef.current?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (confirming) return;
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, confirming, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
      role="presentation"
      data-testid="cancel-request-modal-backdrop"
      onClick={() => {
        if (!confirming) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${descriptionId} ${warningId}`}
        data-testid="cancel-request-modal"
        data-modal-variant="centered-compact"
        className={clsx(
          'relative w-[calc(100vw-32px)] max-w-[360px] rounded-[22px] border border-slate-100 bg-white',
          'px-4 pb-4 pt-3.5 shadow-[0_18px_48px_rgba(15,23,42,0.22)]',
          'motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in motion-safe:duration-200',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          data-testid="cancel-request-modal-close"
          aria-label={t('common.close')}
          disabled={confirming}
          onClick={onClose}
          className="absolute right-2.5 top-2.5 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
        >
          <Icons.X className="h-4 w-4" aria-hidden />
        </button>

        <div className="flex flex-col items-center text-center">
          <div
            className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600"
            aria-hidden
          >
            <Icons.AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <h2 id={titleId} className="pr-6 text-[17px] font-black leading-snug text-slate-950">
            {t('job_actions.cancel_modal_title')}
          </h2>
          <p
            id={descriptionId}
            className="mt-2 text-[13px] font-medium leading-relaxed text-slate-600"
          >
            {t('job_actions.cancel_modal_body')}
          </p>
        </div>

        <div
          id={warningId}
          className="mt-3.5 flex items-start gap-2.5 rounded-2xl border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-left"
          data-testid="cancel-request-modal-credit-warning"
        >
          <Icons.Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <p className="text-[13px] font-semibold leading-snug text-amber-950">
            {t('job_actions.cancel_modal_warning')}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <button
            ref={keepButtonRef}
            type="button"
            data-testid="cancel-request-modal-keep"
            onClick={onClose}
            disabled={confirming}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            {t('job_actions.cancel_modal_back')}
          </button>
          <button
            type="button"
            data-testid="cancel-request-modal-confirm"
            onClick={onConfirm}
            disabled={confirming}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-amber-300 bg-amber-500 px-4 text-sm font-black text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-600 disabled:opacity-60"
          >
            {confirming ? t('common.loading') : t('job_actions.cancel_modal_confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
