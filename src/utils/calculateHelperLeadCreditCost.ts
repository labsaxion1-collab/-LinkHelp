import type { Job } from '@/types/job';
import { resolveCategoryId } from '@/utils/translateCategory';

const INTEREST_COST_LC = 1;

const LOW_COMPLEXITY_CATEGORIES = new Set(['translation', 'pet', 'cooking']);
const MEDIUM_COMPLEXITY_CATEGORIES = new Set(['cleaning', 'sanitization', 'beauty', 'outdoor', 'tech']);
const HIGH_COMPLEXITY_CATEGORIES = new Set(['moving', 'assembly', 'automotive', 'renovation']);

function parseValueHintCad(value: string | null | undefined): number {
  if (!value?.trim()) return 0;
  const nums = value
    .match(/\d+(?:[.,]\d+)?/g)
    ?.map((n) => Number.parseFloat(n.replace(',', '.')))
    .filter(Number.isFinite);
  if (!nums?.length) return 0;
  return Math.max(...nums);
}

function estimateServiceValueCad(job: Job): number {
  if (job.budgetType === 'negotiable') {
    if (job.budgetMin != null && job.budgetMin > 0) return Math.round(job.budgetMin);
    if (job.budgetMax != null && job.budgetMax > 0) return Math.round(job.budgetMax);
    return parseValueHintCad(job.value);
  }

  const min = job.budgetMin;
  const max = job.budgetMax;
  if (min != null && max != null && min > 0 && max > 0) {
    return Math.round((min + max) / 2);
  }
  if (max != null && max > 0) return Math.round(max);
  if (min != null && min > 0) return Math.round(min);
  if (job.budgetAmount != null && job.budgetAmount > 0) return Math.round(job.budgetAmount);

  return parseValueHintCad(job.value);
}

function isRemoteJob(job: Job): boolean {
  const loc = `${job.location ?? ''} ${job.address ?? ''}`.toLowerCase();
  return /remot|remote|en ligne|online|à distance|a distancia/i.test(loc);
}

function distanceExtraLc(distanceKm: number | null | undefined): number {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return 0;
  if (distanceKm <= 5) return 0;
  if (distanceKm <= 10) return 1;
  if (distanceKm <= 20) return 2;
  if (distanceKm <= 35) return 4;
  if (distanceKm <= 50) return 7;
  return 12;
}

function categoryExtraLc(categoryId: string): number {
  if (LOW_COMPLEXITY_CATEGORIES.has(categoryId)) return 0;
  if (MEDIUM_COMPLEXITY_CATEGORIES.has(categoryId)) return 2;
  if (HIGH_COMPLEXITY_CATEGORIES.has(categoryId)) return 4;
  return 2;
}

function valueTierLc(serviceValueCad: number): number {
  if (serviceValueCad <= 50) return 2;
  if (serviceValueCad <= 100) return 4;
  if (serviceValueCad <= 250) return 6;
  if (serviceValueCad <= 500) return 10;
  if (serviceValueCad <= 1000) return 16;
  return 24;
}

export type HelperLeadCreditBreakdown = {
  interestCost: number;
  selectedCost: number;
  total: number;
  serviceValueCad: number;
};

export function calculateHelperLeadCreditCost(
  job: Job,
  options?: { distanceKm?: number | null },
): HelperLeadCreditBreakdown {
  const categoryId = resolveCategoryId(job.category) || job.category;
  const serviceValueCad = estimateServiceValueCad(job);
  const remote = isRemoteJob(job);
  const distanceExtra = remote ? 0 : distanceExtraLc(options?.distanceKm);
  const categoryExtra = categoryExtraLc(categoryId);
  const selectedCost = Math.max(2, Math.min(30, valueTierLc(serviceValueCad) + distanceExtra + categoryExtra));

  return {
    interestCost: INTEREST_COST_LC,
    selectedCost,
    total: INTEREST_COST_LC + selectedCost,
    serviceValueCad,
  };
}
