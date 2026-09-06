import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import {
  LH_CENTERED_MODAL_FIT_PANEL_CLASS,
  LH_CENTERED_MODAL_STANDARD_PANEL_CLASS,
} from '@/components/design-system/lhCenteredModalScale';
import { LhPremiumCloseButton } from '@/components/design-system/LhPremiumCloseButton';

export type LhCardOverlayPresentation = 'centered' | 'sheet';

export type LhCardOverlayProps = {
  open: boolean;
  onClose: () => void;
  /** Nested step: shown as in-content action, not as a header arrow. */
  onBack?: () => void;
  backActionLabel?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  layer?: 'default' | 'elevated';
  /** centered = same shell as HelperApplyConfirmModal; sheet = legacy bottom sheet */
  presentation?: LhCardOverlayPresentation;
  /** standard = width + useful min-height; fit = width + max-height only (no forced min-height) */
  size?: 'standard' | 'fit';
  /**
   * always = body scrolls whenever content overflows (default).
   * fallback = same overflow rule, but intended for compact fit panels where
   * normal mobile content should not need scroll; scroll remains for a11y/short viewports.
   */
  bodyScroll?: 'always' | 'fallback';
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
  backActionLabel,
  title,
  subtitle,
  children,
  footer,
  layer = 'elevated',
  presentation = 'centered',
  size = 'standard',
  bodyScroll = 'always',
  testId,
}: LhCardOverlayProps) {
  const { t } = useLanguage();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
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

  const isCentered = presentation === 'centered';
  const isFit = size === 'fit';
  const nestedBackLabel = backActionLabel ?? t('client_dashboard.back_to_candidates');
  const centeredPanelClass = isFit
    ? LH_CENTERED_MODAL_FIT_PANEL_CLASS
    : LH_CENTERED_MODAL_STANDARD_PANEL_CLASS;

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
      data-overlay-layer={layer}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(
          /* Single outer shell: radius + overflow clip header/body together (no dual card radii). */
          'flex flex-col overflow-hidden border border-slate-100 bg-white outline-none',
          isCentered
            ? clsx(
                centeredPanelClass,
                'motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:fade-in motion-safe:duration-200',
              )
            : clsx(
                'relative w-full max-w-[360px] shadow-[0_-10px_44px_rgba(15,23,42,0.22)]',
                'rounded-t-[1.65rem] sm:rounded-[1.65rem]',
                'max-h-[min(82dvh,720px)]',
                'pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:pb-0',
                'motion-safe:animate-in motion-safe:slide-in-from-bottom-5 motion-safe:fade-in motion-safe:duration-300 sm:motion-safe:zoom-in-95',
              ),
        )}
        onClick={(e) => e.stopPropagation()}
        data-testid={testId}
        data-modal-size={size}
        data-body-scroll={bodyScroll}
      >
        <LhPremiumCloseButton
          buttonRef={closeButtonRef}
          onClick={onClose}
          label={t('common.close')}
          testId={testId ? `${testId}-close` : 'lh-card-overlay-close'}
          className="z-20"
        />

        {!isCentered ? (
          <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-slate-200" />
          </div>
        ) : null}

        <header
          className={clsx(
            'sticky top-0 z-10 shrink-0 border-b border-slate-100 bg-white/95 px-4 pr-14 backdrop-blur-sm sm:px-5 sm:pr-14',
            isFit
              ? 'pb-2 pt-2.5 sm:pb-2.5 sm:pt-3'
              : 'pb-3 pt-3 sm:pt-4',
          )}
        >
          <h2
            id={titleId}
            className={clsx(
              'font-black leading-snug text-slate-950',
              isFit ? 'line-clamp-1 text-[15px] sm:text-base' : 'truncate text-base sm:text-lg',
            )}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              className={clsx(
                'mt-0.5 text-xs font-semibold text-slate-500',
                isFit ? 'line-clamp-2' : 'truncate',
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </header>

        <div
          className={clsx(
            'min-h-0 overscroll-contain px-4 sm:px-5',
            isFit ? 'flex-none py-3' : 'flex-1 py-4',
            /* Accessibility / short-viewport fallback — normal VIP content should fit without scrolling. */
            'overflow-y-auto',
          )}
          data-overlay-body-scroll={bodyScroll}
        >
          {children}
        </div>

        {onBack || footer ? (
          <footer className="shrink-0 space-y-2 border-t border-slate-100 px-4 py-3 sm:px-5">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
                data-testid={testId ? `${testId}-back-to-candidates` : 'lh-card-overlay-back-to-candidates'}
              >
                {nestedBackLabel}
              </button>
            ) : null}
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
