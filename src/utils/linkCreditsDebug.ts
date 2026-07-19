/** Temporary diagnostic flag — active only when URL contains `?lcdebug=1`. */
export function isLinkCreditsDebugEnabled(
  search: URLSearchParams | string | null | undefined,
): boolean {
  if (search == null) return false;
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return params.get('lcdebug') === '1';
}

export function shouldShowHelperOpportunityLcDebugPanel(
  lcDebugEnabled: boolean,
  descriptionOpen: boolean,
): boolean {
  return lcDebugEnabled && descriptionOpen;
}
