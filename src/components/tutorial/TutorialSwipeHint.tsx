import { BRAND } from '@/utils/brandAssets';

const SWIPE_BLUE = '#2563EB';

function ChevronLeft() {
  return (
    <svg viewBox="0 0 14 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="h-6 w-4 sm:h-7 sm:w-[1.125rem]">
      <path
        d="M11 3L3 11L11 19"
        stroke={SWIPE_BLUE}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 14 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="h-6 w-4 sm:h-7 sm:w-[1.125rem]">
      <path
        d="M3 3L11 11L3 19"
        stroke={SWIPE_BLUE}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SequentialArrows({ direction }: { direction: 'left' | 'right' }) {
  const Chevron = direction === 'left' ? ChevronLeft : ChevronRight;
  const items = [1, 2, 3] as const;

  return (
    <div
      className={
        direction === 'left'
          ? 'flex flex-row-reverse items-center gap-2 sm:gap-2.5'
          : 'flex items-center gap-2 sm:gap-2.5'
      }
    >
      {items.map((index) => (
        <span
          key={index}
          className={`lh-tutorial-swipe-seq-arrow lh-tutorial-swipe-seq-arrow-${direction}-${index} inline-flex drop-shadow-[0_0_10px_rgba(37,99,235,0.35)]`}
        >
          <Chevron />
        </span>
      ))}
    </div>
  );
}

function TouchPoint() {
  return (
    <div className="relative flex h-8 w-8 items-center justify-center">
      <span className="lh-tutorial-swipe-hint-ripple lh-tutorial-swipe-hint-ripple-left absolute h-14 w-14 rounded-full border-2 border-[#2563EB]/70 bg-[#2563EB]/25 shadow-[0_0_22px_rgba(37,99,235,0.35)]" />
      <span className="lh-tutorial-swipe-hint-ripple lh-tutorial-swipe-hint-ripple-right absolute h-14 w-14 rounded-full border-2 border-[#2563EB]/70 bg-[#2563EB]/25 shadow-[0_0_22px_rgba(37,99,235,0.35)]" />
      <span className="lh-tutorial-swipe-hint-touch-core lh-tutorial-swipe-hint-touch-core-left absolute h-3.5 w-3.5 rounded-full bg-[#2563EB] shadow-[0_0_14px_rgba(37,99,235,0.55)]" />
      <span className="lh-tutorial-swipe-hint-touch-core lh-tutorial-swipe-hint-touch-core-right absolute h-3.5 w-3.5 rounded-full bg-[#2563EB] shadow-[0_0_14px_rgba(37,99,235,0.55)]" />
      <span className="h-3 w-3 rounded-full bg-[#2563EB] opacity-90 shadow-[0_0_12px_rgba(37,99,235,0.45)]" />
    </div>
  );
}

/** Base da mão ancorada no centro do ponto; aumentar = desce sobre o ponto. */
const FINGER_OFFSET_Y = '5.50rem';

export function TutorialSwipeHint() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[38] flex items-center justify-center overflow-visible"
      style={{ paddingBottom: '5.5rem' }}
      aria-hidden
    >
      <div className="absolute left-3 top-1/2 z-[39] -translate-y-1/2 sm:left-4">
        <SequentialArrows direction="left" />
      </div>

      <div className="absolute right-3 top-1/2 z-[39] -translate-y-1/2 sm:right-4">
        <SequentialArrows direction="right" />
      </div>

      <div className="lh-tutorial-swipe-hint-finger relative z-[40] overflow-visible">
        <div className="lh-tutorial-swipe-hint-hand relative h-8 w-8 overflow-visible">
          <div className="relative z-[1]">
            <TouchPoint />
          </div>

          <img
            src={BRAND.tutorialSwipeDedo}
            alt=""
            className="absolute bottom-1/2 left-1/2 z-[10] object-contain drop-shadow-[0_0_28px_rgba(37,99,235,0.42),0_10px_36px_rgba(37,99,235,0.22)]"
            style={{ transform: `translate(-50%, ${FINGER_OFFSET_Y})` }}
            loading="eager"
            decoding="async"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
