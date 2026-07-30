export type ClientActivityCardView = 'summary' | 'description' | 'candidates' | 'profile';

/** Max internal panel height — compact on phone, not full-screen. */
export const CLIENT_ACTIVITY_PANEL_MAX_HEIGHT_CLASS =
  'max-h-[min(420px,70dvh)] min-h-[280px] sm:max-h-[min(430px,65vh)]';

export function resolveClientActivityBackView(
  view: ClientActivityCardView,
): ClientActivityCardView {
  if (view === 'profile') return 'candidates';
  return 'summary';
}
