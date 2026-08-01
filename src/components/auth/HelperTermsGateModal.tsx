import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  open: boolean;
  onReject: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

/**
 * Terms acceptance gate — viewport-centered portal modal (not a bottom sheet, not in-card).
 * Legal copy / checkbox logic stays unchanged; only layout + scroll lock.
 */
export function HelperTermsGateModal({ open, onReject, onConfirm, loading }: Props) {
  const { t } = useLanguage();
  const [accepted, setAccepted] = useState(false);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) setAccepted(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        event.preventDefault();
        onReject();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, loading, onReject]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
      role="presentation"
      data-testid="helper-terms-modal-backdrop"
      onClick={() => {
        if (!loading) onReject();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="helper-terms-modal"
        data-modal-variant="centered-viewport"
        className="flex w-full max-w-lg max-h-[min(90dvh,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
              {t('auth.terms_modal_title')}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('auth.terms_modal_sub')}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onReject}
            disabled={loading}
            aria-label={t('auth.terms_reject')}
            data-testid="helper-terms-modal-close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
          <ul className="space-y-4">
            <li>
              <label className="flex cursor-pointer items-start gap-3 text-sm font-medium leading-snug text-slate-800">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                <span>{t('auth.terms_checkbox')}</span>
              </label>
            </li>
          </ul>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={onReject}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {t('auth.terms_reject')}
          </button>
          <button
            type="button"
            disabled={!accepted || loading}
            onClick={() => void onConfirm()}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('auth.terms_confirm')}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
