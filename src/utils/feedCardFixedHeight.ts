/** Extra fixed height (px) applied on top of measured summary card height (P3.4). */
export const FEED_CARD_FIXED_HEIGHT_EXTRA_PX = 40;

/** Resolve locked feed-card height: natural summary height + fixed boost. */
export function resolveFeedCardLockedHeight(naturalHeightPx: number): number {
  if (!Number.isFinite(naturalHeightPx) || naturalHeightPx <= 0) return 0;
  return Math.round(naturalHeightPx) + FEED_CARD_FIXED_HEIGHT_EXTRA_PX;
}

/**
 * Measure the natural summary shell height from content + vertical padding.
 * Safe to call when a boost height is already applied (does not double-count).
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
