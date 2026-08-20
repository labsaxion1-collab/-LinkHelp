import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';

export type LhCardOverlayPresentation = 'centered' | 'sheet';

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
  /** centered = same shell as HelperApplyConfirmModal; sheet = legacy bottom sheet */
  presentation?: LhCardOverlayPresentation;
  /** Desktop max width utility, default max-w-lg */
  maxWidthClass?: string;
  /** Height cap utility, default max-h-[min(82dvh,720px)] */
  maxHeightClass?: string;
  testId?: string;
};

const OVERLAY_LAYER_CLASS = {
  default: 'z-[120]',
  elevated: 'z-[1000]',
} as const;

const SAFE_AREA_STYLE = {
  paddingTop: 'max(1rem, env(safe-area-inset-top))',
  paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
  paddingLeft: 'max(1rem, env(safe-area-inset-left))',
  paddingRight: 'max(1rem, env(safe-area-inset-right))',
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
  presentation = 'centered',
  maxWidthClass = 'max-w-lg',
  maxHeightClass = 'max-h-[min(82dvh,720px)]',
  testId,
}: LhCardOverlayProps) {
  const { t } = useLanguage();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      backButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
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

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleBack = () => {
    if (onBack) onBack();
    else onClose();
  };

  const isCentered = presentation === 'centered';

  return createPortal(
    <div
      className={clsx(
        'fixed inset-0 flex justify-center bg-slate-950/55 backdrop-blur-[2px]',
        isCentered ? 'items-center p-4' : 'items-end p-0 sm:items-center sm:p-4',
        OVERLAY_LAYER_CLASS[layer],
        'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
      )}
      style={isCentered ? SAFE_AREA_STYLE : undefined}
      onClick={onClose}
      role="presentation"
      data-testid={testId ? `${testId}-backdrop` : undefined}
      data-overlay-presentation={presentation}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(
          'relative flex w-full flex-col bg-white outline-none',
          isCentered
            ? clsx(
                'w-[calc(100vw-32px)] rounded-[22px] shadow-[0_18px_48px_rgba(15,23,42,0.22)]',
                'motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in motion-safe:duration-200',
                maxWidthClass,
                maxHeightClass,
              )
            : clsx(
                'shadow-[0_-10px_44px_rgba(15,23,42,0.22)]',
                'rounded-t-[1.65rem] sm:rounded-[1.65rem]',
                maxWidthClass,
                maxHeightClass,
                'pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:pb-0',
                'motion-safe:animate-in motion-safe:slide-in-from-bottom-5 motion-safe:fade-in motion-safe:duration-300 sm:motion-safe:zoom-in-95',
              ),
        )}
        onClick={(e) => e.stopPropagation()}
        data-testid={testId}
      >
        {!isCentered ? (
          <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-slate-200" />
          </div>
        ) : null}

        <header className="sticky top-0 z-10 flex shrink-0 items-start gap-2 border-b border-slate-100 bg-white/95 px-4 pb-3 pt-3 backdrop-blur-sm sm:px-5 sm:pt-4">
          <button
            ref={backButtonRef}
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
