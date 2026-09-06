import type { AppLanguage } from '@/services/translationService';

/** Real LC amounts are small integers (typically 0–500). Used to detect stray legacy rows. */
export const LINKCREDITS_LEGACY_SCALE_THRESHOLD = 1000;

/**
 * TEMPORARY display-only fallback for pre-normalization DB rows stored as exact ×1000
 * (e.g. 25000 → 25). Only applies when value >= 1000 AND divisible by 1000.
 * Safe to remove after verify_no_legacy_linkcredits.sql reports zero suspects.
 */
export function coerceLegacyLinkCreditsDisplay(amount: number): number {
  const rounded = Number.isFinite(amount) ? Math.round(amount) : 0;
  if (rounded >= LINKCREDITS_LEGACY_SCALE_THRESHOLD && rounded % LINKCREDITS_LEGACY_SCALE_THRESHOLD === 0) {
    return rounded / LINKCREDITS_LEGACY_SCALE_THRESHOLD;
  }
  return rounded;
}

/** Signed variant of {@link coerceLegacyLinkCreditsDisplay} for transaction labels. */
export function coerceSignedLegacyLinkCreditsDisplay(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  const rounded = Math.round(amount);
  if (rounded === 0) return 0;
  const sign = rounded < 0 ? -1 : 1;
  return sign * coerceLegacyLinkCreditsDisplay(Math.abs(rounded));
}

/** DB/API pipeline: values are already real LC — no scaling. */
export function sanitizeLinkCreditsAmount(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}

/** Signed variant for debit/credit rows from Supabase. */
export function sanitizeSignedLinkCreditsAmount(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount);
}

/**
 * @deprecated Use sanitizeLinkCreditsAmount for data pipeline; coerceLegacyLinkCreditsDisplay for display only.
 */
export const normalizeLinkCreditsAmount = sanitizeLinkCreditsAmount;

/**
 * @deprecated Use sanitizeSignedLinkCreditsAmount for data pipeline.
 */
export const normalizeSignedLinkCreditsAmount = sanitizeSignedLinkCreditsAmount;

/** Formats LC balance without locale grouping. Never shows fiat currency. */
export function formatLinkCredits(amount: number, language: AppLanguage = 'pt'): string {
  void language;
  return `${coerceLegacyLinkCreditsDisplay(amount)} LC`;
}

/**
 * Compact navbar label. Abbreviates only when the full integer would crowd the header (≥1000).
 * Full amount always available via aria/tooltip callers.
 */
export function formatCompactNavbarLinkCredits(
  amount: number,
  language: AppLanguage = 'pt',
): { shortLabel: string; fullAmount: number } {
  const fullAmount = coerceLegacyLinkCreditsDisplay(amount);
  if (fullAmount < 1000) {
    return { shortLabel: `${fullAmount} LC`, fullAmount };
  }
  const thousands = fullAmount / 1000;
  const rounded = Math.round(thousands * 10) / 10;
  const num =
    language === 'en'
      ? String(rounded).replace('.', '.')
      : String(rounded).replace('.', ',');
  if (language === 'en') {
    return { shortLabel: `${num}k LC`, fullAmount };
  }
  if (language === 'fr') {
    return { shortLabel: `${num} k LC`, fullAmount };
  }
  return { shortLabel: `${num} mil LC`, fullAmount };
}

export function formatLinkCreditsLabel(language: AppLanguage = 'pt'): string {
  if (language === 'fr') return 'LinkCrédits';
  return 'LinkCredits';
}
