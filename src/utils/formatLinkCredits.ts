import type { AppLanguage } from '@/services/translationService';

/** Legacy DB stored LC × 1000 (e.g. 25000 → 25 LC, 2000 → 2 LC). */
export function normalizeLinkCreditsAmount(amount: number): number {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  if (safe >= 1000 && safe % 1000 === 0) return safe / 1000;
  return safe;
}

/** Like normalizeLinkCreditsAmount but preserves sign for debits/credits in transaction rows. */
export function normalizeSignedLinkCreditsAmount(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  const rounded = Math.round(amount);
  if (rounded === 0) return 0;
  const sign = rounded < 0 ? -1 : 1;
  return sign * normalizeLinkCreditsAmount(Math.abs(rounded));
}

const normalizeLegacyBonusAmount = normalizeLinkCreditsAmount;

/** Formats LC balance without locale grouping. Never shows fiat currency. */
export function formatLinkCredits(amount: number, language: AppLanguage = 'pt'): string {
  void language;
  return `${normalizeLegacyBonusAmount(amount)} LC`;
}

export function formatLinkCreditsLabel(language: AppLanguage = 'pt'): string {
  if (language === 'fr') return 'LinkCrédits';
  return 'LinkCredits';
}
