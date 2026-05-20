import type { AppLanguage } from '@/services/translationService';

const localeForLanguage = (language: AppLanguage): string => {
  if (language === 'fr') return 'fr-CA';
  if (language === 'pt') return 'pt-BR';
  return 'en-CA';
};

/** Formats LC balance with locale grouping (e.g. 12.000 LC in pt-BR). Never shows fiat currency. */
export function formatLinkCredits(amount: number, language: AppLanguage = 'pt'): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  const formatted = new Intl.NumberFormat(localeForLanguage(language), {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(safe);
  return `${formatted} LC`;
}

export function formatLinkCreditsLabel(language: AppLanguage = 'pt'): string {
  if (language === 'fr') return 'LinkCrédits';
  return 'LinkCredits';
}
