import { useCallback, useEffect, useState, type MouseEvent, type ReactNode, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { useTutorialSwipe } from '@/hooks/useTutorialSwipe';
import { TutorialSwipeHint } from '@/components/tutorial/TutorialSwipeHint';
type Props = {
  open: boolean;
  step: number;
  stepCount: number;
  onStepChange: (step: number) => void;
  onDismiss: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  headerLabel?: string;
  closeLabel: string;
  zIndex?: number;
  titleId?: string;
  controlsOnImage?: boolean;
  footerBlurOverlay?: boolean;
  immersiveLayout?: boolean;
  premiumStickyHeader?: boolean;
  /** Card 1 — hint de swipe horizontal (somente cliente) */
  swipeHint?: boolean;
  children: ReactNode;  footer: ReactNode;
};

function ProgressDots({ total, active, onImage, compact = false }: { total: number; active: number; onImage?: boolean; compact?: boolean }) {
  return (
    <div className={clsx('flex items-center justify-center', compact ? 'gap-1.5' : 'gap-2')}>
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={clsx(
            'h-2 rounded-full transition-all duration-300',
            index === active
              ? compact ? 'w-6 bg-[#2563FF]' : 'w-8 bg-[#2563FF]'
              : onImage ? 'w-2 bg-white/60' : compact ? 'w-1.5 bg-[#CBD5E1]' : 'w-2 bg-[#CBD5E1]',
          )}
        />
      ))}
    </div>
  );
}

export function TutorialCenterCard({
  open,
  step,
  stepCount,
  onStepChange,
  onDismiss,
  onSkip,
  skipLabel,
  closeLabel,
  zIndex = 120,
  titleId = 'tutorial-center-title',
  headerLabel,
  controlsOnImage = false,
  footerBlurOverlay = false,
  immersiveLayout = false,
  premiumStickyHeader = false,
  swipeHint = false,
  children,
  footer,
}: Props) {
  const [swipeHintDismissed, setSwipeHintDismissed] = useState(false);

  const dismissSwipeHint = useCallback(() => {
    setSwipeHintDismissed(true);
  }, []);

  const { dragOffset, isDragging, swipeHandlers } = useTutorialSwipe({
    step,
    stepCount,
    onStepChange: (next) => {
      dismissSwipeHint();
      onStepChange(next);
    },
  });

  const showSwipeHint = swipeHint && step === 0 && !swipeHintDismissed;

  useEffect(() => {
    if (open) setSwipeHintDismissed(false);
  }, [open]);

  useEffect(() => {
    if (step !== 0) setSwipeHintDismissed(true);
  }, [step]);

  useEffect(() => {
    if (isDragging) setSwipeHintDismissed(true);
  }, [isDragging]);

  const interactiveSwipeHandlers = {
    onTouchStart: (event: TouchEvent) => {
      dismissSwipeHint();
      swipeHandlers.onTouchStart(event);
    },
    onTouchMove: swipeHandlers.onTouchMove,
    onTouchEnd: swipeHandlers.onTouchEnd,
    onMouseDown: (event: MouseEvent) => {
      dismissSwipeHint();
      swipeHandlers.onMouseDown(event);
    },
    onMouseMove: swipeHandlers.onMouseMove,
    onMouseUp: swipeHandlers.onMouseUp,
    onMouseLeave: swipeHandlers.onMouseLeave,
  };
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
      className="fixed inset-0 flex items-center justify-center bg-[#0B1220]/45 p-4 backdrop-blur-[6px]"
      style={{ zIndex }}
      role="presentation"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={clsx(
          'relative flex h-[min(90dvh,680px)] max-h-[min(90dvh,680px)] w-full max-w-[420px] flex-col overflow-hidden rounded-[32px] shadow-[0_24px_80px_rgba(37,99,255,0.2)] animate-in zoom-in-95 fade-in duration-300',
          immersiveLayout ? 'bg-gradient-to-b from-[#F3F8FF] to-[#FAFCFF]' : 'bg-white',
          premiumStickyHeader && '[&_.lh-tutorial-slide-panel]:pt-24',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {premiumStickyHeader ? (
          <header className="absolute inset-x-0 top-0 z-50 flex min-h-[88px] flex-col items-center justify-center gap-1 bg-gradient-to-r from-[#123FC4] via-[#1854D8] to-[#2563E8] px-5 py-2 shadow-[0_10px_28px_rgba(18,63,196,0.3)]">
            <p className="w-full pr-12 text-left text-sm font-black leading-tight tracking-[-0.01em] text-white sm:text-base">
              {headerLabel}
            </p>
            <div className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5 shadow-inner backdrop-blur-sm">
              <ProgressDots total={stepCount} active={step} compact />
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/35 bg-white/20 text-white shadow-[0_8px_22px_rgba(15,23,42,0.12)] backdrop-blur-md transition hover:bg-white/30"
              aria-label={closeLabel}
            >
              <X className="h-5 w-5" />
            </button>
          </header>
        ) : null}

        {headerLabel && !premiumStickyHeader ? (
          <p className="absolute left-5 top-5 z-40 text-sm font-semibold text-[#475569]">
            {headerLabel}
          </p>
        ) : null}
        {onSkip && skipLabel ? (
          <button
            type="button"
            onClick={onSkip}
            className={clsx(
              'absolute left-4 top-3.5 z-[60] inline-flex min-h-11 min-w-11 items-center rounded-full px-2 py-1.5 text-sm font-medium transition',
              controlsOnImage
                ? 'text-[#0B1220]/80 hover:text-[#0B1220]'
                : 'text-[#64748B] hover:text-[#0B1220]',
            )}
          >
            {skipLabel}
          </button>
        ) : null}

        <div className={clsx('pointer-events-none absolute left-1/2 top-5 z-[60] -translate-x-1/2', premiumStickyHeader && 'hidden')}>
          <ProgressDots total={stepCount} active={step} onImage={controlsOnImage} />
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className={clsx('absolute right-4 top-3.5 z-[60] grid min-h-11 min-w-11 place-items-center rounded-full bg-white/50 p-2 text-[#64748B] shadow-[0_4px_16px_rgba(15,23,42,0.08)] ring-1 ring-white/50 backdrop-blur-md transition hover:bg-white/75 hover:text-[#0B1220]', premiumStickyHeader && 'hidden')}
          aria-label={closeLabel}
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={clsx(
            'touch-pan-y overflow-hidden',
            immersiveLayout ? 'absolute inset-0 z-0' : 'relative z-0 min-h-0 flex-1',
          )}
          {...interactiveSwipeHandlers}
        >
          <div className={clsx('h-full', showSwipeHint && 'lh-tutorial-swipe-hint-nudge')}>
            <div
              className={`flex h-full ${isDragging ? '' : 'transition-transform duration-300 ease-out'}`}
              style={{ transform: `translateX(calc(-${step * 100}% + ${dragOffset}px))` }}
            >
              {children}
            </div>
          </div>
        </div>

        <footer
          className={clsx(
            'px-6 pb-[max(env(safe-area-inset-bottom),1.25rem)]',
            immersiveLayout
              ? 'pointer-events-auto absolute inset-x-0 bottom-0 z-[60] bg-transparent pt-0'
              : clsx(
                  'relative z-[60] shrink-0',
                  footerBlurOverlay ? '-mt-[4.5rem] bg-transparent pt-0' : 'space-y-3 pt-2',
                ),
          )}
        >
          <div
            className={clsx(
              'relative z-10 space-y-3',
              immersiveLayout ? 'bg-transparent pt-0' : footerBlurOverlay && 'bg-transparent pt-0',
            )}
          >
            {footer}
          </div>
        </footer>

        {showSwipeHint ? <TutorialSwipeHint /> : null}
      </div>
    </div>,
    document.body,
  );
}

export function TutorialSlidePanel({
  children,
  flush,
  fill,
}: {
  children: ReactNode;
  flush?: boolean;
  fill?: boolean;
}) {
  return (
    <div
      className={clsx(
        'lh-tutorial-slide-panel flex w-full shrink-0 basis-full flex-col',
        fill ? 'h-full min-h-0 overflow-hidden' : 'overflow-y-auto',
        flush ? 'px-0 pt-0 pb-0' : 'px-6 pb-4 pt-14',
      )}
    >
      {children}
    </div>
  );
}
