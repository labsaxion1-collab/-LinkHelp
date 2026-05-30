import type { ServiceCategoryId } from '@/data/serviceCategories';

type SuggestionMap = Record<string, { min: number; max: number }>;

const SUGGESTIONS: Record<ServiceCategoryId, SuggestionMap> = {
  cleaning: {
    apartment: { min: 80, max: 180 },
    house: { min: 120, max: 280 },
    commercial: { min: 150, max: 400 },
    default: { min: 90, max: 200 },
  },
  sanitization: {
    sofa: { min: 60, max: 120 },
    mattress: { min: 70, max: 140 },
    default: { min: 65, max: 130 },
  },
  moving: {
    local_move: { min: 120, max: 350 },
    furniture_transport: { min: 150, max: 450 },
    default: { min: 150, max: 400 },
  },
  assembly: {
    ikea: { min: 80, max: 180 },
    tv_mount: { min: 90, max: 200 },
    default: { min: 90, max: 220 },
  },
  automotive: {
    tire: { min: 40, max: 90 },
    battery: { min: 50, max: 120 },
    default: { min: 50, max: 120 },
  },
  translation: {
    document: { min: 45, max: 120 },
    consultation: { min: 55, max: 150 },
    default: { min: 50, max: 130 },
  },
  beauty: {
    nails: { min: 45, max: 95 },
    barber: { min: 35, max: 75 },
    default: { min: 50, max: 120 },
  },
  renovation: {
    plumbing: { min: 90, max: 220 },
    painting: { min: 120, max: 350 },
    small_repairs: { min: 60, max: 180 },
    default: { min: 100, max: 280 },
  },
  outdoor: {
    lawn: { min: 40, max: 90 },
    snow: { min: 80, max: 200 },
    default: { min: 55, max: 150 },
  },
  pet: {
    walk: { min: 25, max: 55 },
    sitter: { min: 35, max: 80 },
    default: { min: 30, max: 70 },
  },
  tech: {
    default: { min: 55, max: 140 },
  },
};

export function getMarketBudgetSuggestion(
  categoryId: string,
  subcategoryId?: string | null,
): { min: number; max: number } {
  const cat = SUGGESTIONS[categoryId as ServiceCategoryId];
  if (!cat) return { min: 80, max: 180 };
  if (subcategoryId && cat[subcategoryId]) return cat[subcategoryId];
  return cat.default ?? { min: 80, max: 180 };
}

/** Scaffold for future analytics-driven pricing (not shown in UI). */
export type MarketMetricsSnapshot = {
  market_acceptance_rate: number;
  market_not_interested_rate: number;
  market_average_price: number | null;
  market_average_distance: number | null;
  market_average_response_time: number | null;
};
