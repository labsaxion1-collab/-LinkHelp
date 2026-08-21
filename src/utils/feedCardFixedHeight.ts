/**
 * Official opportunity-card shell dimensions.
 * Source of truth: Helper feed card (`HelperOpportunityCard`).
 * All “Chamados em aberto / Aguardando ajudantes” cards must reuse these tokens.
 */

/** P3.4 boost applied on top of the canonical summary layout. */
export const FEED_CARD_FIXED_HEIGHT_EXTRA_PX = 40;

/** Top category accent bar on the feed card shell. */
export const FEED_CARD_TOP_ACCENT_PX = 4;

/** Interested / candidates ring size in the summary grid. */
export const FEED_CARD_RING_SIZE_PX = 68;

/** Mobile content padding (pt-2.5 + pb-2.5). */
export const FEED_CARD_CONTENT_PAD_Y_PX = 20;

/** Summary grid row gap (gap-y-1). */
export const FEED_CARD_GRID_GAP_Y_PX = 4;

/** Footer stack: mt-0.5 + border + pt-2 + gap-1.5 + two min-h-[44px] rows. */
export const FEED_CARD_FOOTER_BLOCK_PX = 2 + 1 + 8 + 6 + 44 + 44;

/**
 * Canonical content-shell height (padding box) for every opportunity-style card.
 * Derived from the Helper feed summary anatomy + P3.4 boost — not measured per card.
 */
export const FEED_CARD_STANDARD_CONTENT_HEIGHT_PX =
  FEED_CARD_RING_SIZE_PX +
  FEED_CARD_GRID_GAP_Y_PX +
  FEED_CARD_FOOTER_BLOCK_PX +
  FEED_CARD_CONTENT_PAD_Y_PX +
  FEED_CARD_FIXED_HEIGHT_EXTRA_PX;

/** Full outer card height including the 4px top accent. */
export const FEED_CARD_STANDARD_OUTER_HEIGHT_PX =
  FEED_CARD_STANDARD_CONTENT_HEIGHT_PX + FEED_CARD_TOP_ACCENT_PX;

/** Resolve locked height (kept for tests / legacy callers). Prefer STANDARD constant. */
export function resolveFeedCardLockedHeight(naturalHeightPx: number): number {
  if (!Number.isFinite(naturalHeightPx) || naturalHeightPx <= 0) return 0;
  return Math.round(naturalHeightPx) + FEED_CARD_FIXED_HEIGHT_EXTRA_PX;
}

/**
 * Measure the natural summary shell height from content + vertical padding.
 * Prefer FEED_CARD_STANDARD_CONTENT_HEIGHT_PX for new UI — height must not vary by content.
 */
export function measureFeedCardNaturalHeight(shell: HTMLElement): number {
  const summaryEl = shell.firstElementChild as HTMLElement | null;
  const styles = getComputedStyle(shell);
  const padY =
    (Number.parseFloat(styles.paddingTop) || 0) +
    (Number.parseFloat(styles.paddingBottom) || 0);
  if (!summaryEl) {
    return Math.round(shell.getBoundingClientRect().height);
  }
  return Math.round(summaryEl.getBoundingClientRect().height + padY);
}

/** Outer LhCard / article shell — radius, border, shadow match Helper feed. */
export const FEED_CARD_SHELL_CLASS =
  'group/card relative h-full w-full max-w-full overflow-hidden rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_2px_12px_rgba(15,23,42,0.05),0_6px_28px_rgba(15,23,42,0.06)] transition-all duration-300';

/** Inner content box (height-locked region). */
export const FEED_CARD_CONTENT_CLASS =
  'relative z-20 overflow-hidden bg-white px-3 pb-2.5 pt-2.5 sm:px-4 sm:pb-3 sm:pt-3';

export const FEED_CARD_TOP_ACCENT_CLASS =
  'h-[4px] w-full shrink-0 rounded-t-[22px]';

/** List gap between opportunity-style cards (Helper feed). */
export const FEED_CARD_LIST_GAP_CLASS = 'space-y-3';

export function feedCardLockedContentStyle(): {
  height: number;
  minHeight: number;
  maxHeight: number;
} {
  return {
    height: FEED_CARD_STANDARD_CONTENT_HEIGHT_PX,
    minHeight: FEED_CARD_STANDARD_CONTENT_HEIGHT_PX,
    maxHeight: FEED_CARD_STANDARD_CONTENT_HEIGHT_PX,
  };
}

/**
 * Activity cards (applications / accepted): same min-height as the feed,
 * but may grow for an optional info strip (e.g. rejected application).
 * Do not lock maxHeight — overlays must not change the card shell size.
 */
export function feedCardMinContentStyle(): { minHeight: number } {
  return { minHeight: FEED_CARD_STANDARD_CONTENT_HEIGHT_PX };
}
