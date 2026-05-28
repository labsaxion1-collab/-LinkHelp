import type { Job } from '@/types/job';
import type { CreditPackage } from '@/types/credits';

import { SIGNUP_BONUS_LC } from '@/config/onboardingRewards';

export const HELPER_SIGNUP_BONUS_CREDITS = SIGNUP_BONUS_LC.helper;
export const CLIENT_SIGNUP_BONUS_LC = SIGNUP_BONUS_LC.client;

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'starter', name: 'Starter', credits: 35, priceCad: 14.99, active: true, highlightLabel: null, createdAt: 0 },
  { id: 'popular', name: 'Popular', credits: 80, priceCad: 29.99, active: true, highlightLabel: 'Mais popular', createdAt: 0 },
  { id: 'pro', name: 'Pro', credits: 180, priceCad: 59.99, active: true, highlightLabel: null, createdAt: 0 },
  { id: 'power', name: 'Power', credits: 400, priceCad: 119.99, active: true, highlightLabel: 'Melhor valor', createdAt: 0 },
];

const CATEGORY_BASE_PRICE: Record<string, number> = {
  cleaning: 3,
  moving: 5,
  assembly: 5,
  renovation: 5,
  outdoor: 5,
  automotive: 5,
};

export function estimateBudgetCad(value: string | null | undefined): number {
  if (!value) return 0;
  const nums = String(value)
    .match(/\d+(?:[.,]\d+)?/g)
    ?.map((n) => Number.parseFloat(n.replace(',', '.')))
    .filter(Number.isFinite);
  if (!nums?.length) return 0;
  return Math.max(...nums);
}

export function calculateOpportunityCreditPrice(job: Pick<Job, 'category' | 'urgency' | 'value'>): number {
  const budget = estimateBudgetCad(job.value);
  if (budget >= 700) return 12;
  if (job.urgency === 'high' || budget >= 300) return 8;
  return CATEGORY_BASE_PRICE[job.category] ?? 5;
}

export function previewDescription(text: string, max = 92): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max).trim()}...`;
}
