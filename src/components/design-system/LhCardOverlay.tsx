import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';

export type LhCardOverlayProps = {
  open: boolean;
  onClose: () => void;
  /** When omitted, back behaves like close. */
  onBack?: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  layer?: 'default' | 'elevated';
  /** Desktop max width utility, default max-w-lg */
  maxWidthClass?: string;
  /** Height cap utility, default max-h-[min(88dvh,720px)] */
  maxHeightClass?: string;
  testId?: string;
};

const OVERLAY_LAYER_CLASS = {
  default: 'z-[120]',
  elevated: 'z-[1000]',
} as const;

export function LhCardOverlay({
  open,
  onClose,
  onBack,
  title,
  subtitle,
  children,
  footer,
  layer = 'elevated',
  maxWidthClass = 'max-w-lg',
  maxHeightClass = 'max-h-[min(88dvh,720px)]',
  testId,
}: LhCardOverlayProps) {
  const { t } = useLanguage();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const handleBack = () => {
    if (onBack) onBack();
    else onClose();
  };

  return createPortal(
    <div
      className={clsx(
        'fixed inset-0 flex items-end justify-center bg-slate-950/55 backdrop-blur-[2px] p-0 sm:items-center sm:p-4',
        OVERLAY_LAYER_CLASS[layer],
      )}
      onClick={onClose}
      role="presentation"
      data-testid={testId ? `${testId}-backdrop` : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(
          'relative flex w-full flex-col bg-white shadow-[0_-10px_44px_rgba(15,23,42,0.22)] outline-none',
          'rounded-t-[1.65rem] sm:rounded-[1.65rem]',
          maxWidthClass,
          maxHeightClass,
          'pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:pb-0',
          'animate-in slide-in-from-bottom-5 fade-in duration-300 sm:zoom-in-95 motion-reduce:animate-none',
        )}
        onClick={(e) => e.stopPropagation()}
        data-testid={testId}
      >
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        <header className="sticky top-0 z-10 flex shrink-0 items-start gap-2 border-b border-slate-100 bg-white/95 px-4 pb-3 pt-2 backdrop-blur-sm sm:px-5 sm:pt-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
            aria-label={t('nav.back')}
            data-testid={testId ? `${testId}-back` : 'lh-card-overlay-back'}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{t('nav.back')}</span>
          </button>
          <div className="min-w-0 flex-1 pt-1">
            <h2 id={titleId} className="truncate text-base font-black leading-snug text-slate-950 sm:text-lg">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
            aria-label={t('common.close')}
            data-testid={testId ? `${testId}-close` : 'lh-card-overlay-close'}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>

        {footer ? (
          <footer className="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-5">{footer}</footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
