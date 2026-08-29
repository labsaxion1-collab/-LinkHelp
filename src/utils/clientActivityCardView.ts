/** Shared height rules for client activity open-request internal panels. */
export type ClientActivityCardView = 'summary' | 'description' | 'candidates' | 'profile';

/**
 * Internal panel fills the locked outer card — no min-height that grows the shell.
 * Scroll lives inside FEED_CARD_PREMIUM_SCROLL_CLASS.
 */
export const CLIENT_ACTIVITY_PANEL_CLASS = 'relative flex h-full min-h-0 flex-col';

/** @deprecated Use CLIENT_ACTIVITY_PANEL_CLASS — kept for test/compat string checks. */
export const CLIENT_ACTIVITY_PANEL_MAX_HEIGHT_CLASS = CLIENT_ACTIVITY_PANEL_CLASS;

export function resolveClientActivityBackView(
  view: ClientActivityCardView,
): ClientActivityCardView {
  if (view === 'profile') return 'candidates';
  return 'summary';
}
