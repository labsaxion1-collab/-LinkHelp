import { ROUTES } from '@/utils/constants';

/** Safe origin for LinkCredits history back navigation. */
export type LinkCreditsHistoryFrom = 'profile' | 'credits';

export const LINK_CREDITS_HISTORY_FROM_KEY = 'linkCreditsHistoryFrom' as const;

export type LinkCreditsHistoryLocationState = {
  [LINK_CREDITS_HISTORY_FROM_KEY]?: LinkCreditsHistoryFrom;
};

export function parseLinkCreditsHistoryFrom(raw: unknown): LinkCreditsHistoryFrom | null {
  return raw === 'profile' || raw === 'credits' ? raw : null;
}

/**
 * Resolve where "Voltar" should navigate.
 * - profile → /profile
 * - credits → role credits page
 * - missing/invalid (direct URL) → /profile (safe fallback)
 */
export function resolveLinkCreditsHistoryBackPath(
  role: 'client' | 'helper',
  from: LinkCreditsHistoryFrom | null | undefined,
): string {
  if (from === 'credits') {
    return role === 'helper' ? ROUTES.helperCredits : ROUTES.clientCredits;
  }
  return ROUTES.profile;
}

export function linkCreditsHistoryState(
  from: LinkCreditsHistoryFrom,
): LinkCreditsHistoryLocationState {
  return { [LINK_CREDITS_HISTORY_FROM_KEY]: from };
}
