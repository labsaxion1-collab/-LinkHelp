import type { ServiceCategoryId } from '@/data/serviceCategories';

type SuggestionMap = Record<string, { min: number; max: number }>;

export type MarketBudgetSuggestionOptions = {
  /** Tradução: online vs presencial (quando não há subcategoria específica). */
  translationServiceMode?: 'online' | 'in_person' | '';
};

const SUGGESTIONS: Record<ServiceCategoryId, SuggestionMap> = {
  cleaning: {
    apartment: { min: 80, max: 180 },
    house: { min: 120, max: 280 },
    commercial: { min: 150, max: 400 },
    post_construction: { min: 140, max: 320 },
    moving_clean: { min: 100, max: 220 },
    windows: { min: 70, max: 150 },
    default: { min: 90, max: 200 },
  },
  sanitization: {
    sofa: { min: 60, max: 120 },
    mattress: { min: 70, max: 140 },
    car: { min: 55, max: 110 },
    carpet: { min: 65, max: 130 },
    default: { min: 65, max: 130 },
  },
  moving: {
    houses: { min: 200, max: 550 },
    apartments: { min: 150, max: 400 },
    offices: { min: 180, max: 480 },
    companies: { min: 220, max: 600 },
    furniture_transport: { min: 150, max: 450 },
    long_distance: { min: 300, max: 900 },
    small_moves: { min: 100, max: 260 },
    default: { min: 150, max: 400 },
  },
  assembly: {
    ikea: { min: 80, max: 180 },
    wardrobe: { min: 90, max: 200 },
    bed: { min: 70, max: 160 },
    table: { min: 60, max: 140 },
    desk: { min: 65, max: 150 },
    tv_mount: { min: 90, max: 200 },
    curtains: { min: 55, max: 120 },
    wall_mount: { min: 60, max: 130 },
    default: { min: 90, max: 220 },
  },
  automotive: {
    tire: { min: 40, max: 90 },
    battery: { min: 50, max: 120 },
    jump_start: { min: 45, max: 85 },
    wont_start: { min: 55, max: 130 },
    default: { min: 50, max: 120 },
  },
  translation: {
    government: { min: 80, max: 120 },
    immigration: { min: 80, max: 120 },
    document: { min: 40, max: 70 },
    consultation: { min: 80, max: 150 },
    resume: { min: 40, max: 70 },
    interview: { min: 60, max: 100 },
    school: { min: 50, max: 90 },
    college: { min: 50, max: 90 },
    online: { min: 50, max: 80 },
    in_person: { min: 80, max: 120 },
    default: { min: 80, max: 120 },
  },
  beauty: {
    nails: { min: 45, max: 95 },
    nail_extensions: { min: 55, max: 110 },
    barber: { min: 35, max: 75 },
    hairdresser: { min: 50, max: 120 },
    body_massage: { min: 60, max: 130 },
    facial_cleansing: { min: 55, max: 110 },
    brows: { min: 30, max: 65 },
    waxing: { min: 40, max: 90 },
    lashes: { min: 50, max: 100 },
    default: { min: 50, max: 120 },
  },
  renovation: {
    plumbing: { min: 90, max: 220 },
    leak: { min: 80, max: 200 },
    shower: { min: 85, max: 210 },
    painting: { min: 120, max: 350 },
    roof: { min: 150, max: 400 },
    drywall: { min: 70, max: 180 },
    small_repairs: { min: 60, max: 180 },
    default: { min: 100, max: 280 },
  },
  outdoor: {
    snow: { min: 80, max: 200 },
    garden: { min: 55, max: 140 },
    fence: { min: 70, max: 180 },
    exterior_clean: { min: 60, max: 150 },
    pool_cleaning: { min: 80, max: 180 },
    default: { min: 55, max: 150 },
  },
  pet: {
    walk: { min: 25, max: 55 },
    bath: { min: 35, max: 75 },
    sitter: { min: 35, max: 80 },
    default: { min: 30, max: 70 },
  },
  tech: {
    format: { min: 55, max: 120 },
    wifi: { min: 50, max: 110 },
    install: { min: 45, max: 100 },
    tv: { min: 50, max: 115 },
    phone: { min: 40, max: 90 },
    default: { min: 55, max: 140 },
  },
  other: {
    other: { min: 80, max: 180 },
    default: { min: 80, max: 180 },
  },
};

export function getMarketBudgetSuggestion(
  categoryId: string,
  subcategoryId?: string | null,
  options?: MarketBudgetSuggestionOptions,
): { min: number; max: number } {
  const cat = SUGGESTIONS[categoryId as ServiceCategoryId];
  if (!cat) return { min: 80, max: 180 };

  if (categoryId === 'translation') {
    const sub = subcategoryId?.trim() || null;
    if (sub && cat[sub]) return cat[sub];

    const mode = options?.translationServiceMode;
    if (mode === 'online') return cat.online ?? cat.default;
    if (mode === 'in_person') return cat.in_person ?? cat.default;
    return cat.default ?? { min: 80, max: 120 };
  }

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
