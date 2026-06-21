import type { AppLanguage } from '@/services/translationService';

export type RequestDescriptionView = {
  /** Text shown in UI for the helper's current language. */
  display: string;
  /** Original text as stored on the request (client-authored). */
  original: string;
  /** True when a stored translation was applied (not implemented yet). */
  isTranslated: boolean;
};

/**
 * User-authored request descriptions are stored as a single `description` string.
 * There is no DB column or service for per-language translations yet — always returns original.
 * When `requests.description_i18n` (or similar) exists, map by viewer language here.
 */
export function getRequestDescriptionForViewer(
  description: string | null | undefined,
  _viewerLanguage: AppLanguage,
): RequestDescriptionView {
  const original = description?.trim() ?? '';
  return {
    display: original,
    original,
    isTranslated: false,
  };
}
