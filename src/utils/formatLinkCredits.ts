import type { AppLanguage } from '@/services/translationService';

/** Legacy DB stored LC × 1000 (e.g. 25000 → 25 LC, 2000 → 2 LC). */
export function normalizeLinkCreditsAmount(amount: number): number {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  if (safe >= 1000 && safe % 1000 === 0) return safe / 1000;
  return safe;
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
