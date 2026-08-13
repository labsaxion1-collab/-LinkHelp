/** Internal navigation views for the premium feed opportunity card (P3.1). */
export type FeedCardView = 'summary' | 'description' | 'profile';

export const FEED_CARD_VIEWS: readonly FeedCardView[] = ['summary', 'description', 'profile'] as const;

export function isFeedCardView(value: unknown): value is FeedCardView {
  return value === 'summary' || value === 'description' || value === 'profile';
}

/** Single-source transitions — always land on summary from nested views. */
export function feedCardViewAfterBack(_from: FeedCardView): FeedCardView {
  return 'summary';
}

export function feedCardViewFromDescriptionExpanded(expanded: boolean): FeedCardView {
  return expanded ? 'description' : 'summary';
}
