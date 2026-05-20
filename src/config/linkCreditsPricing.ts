import type { JobUrgency } from '@/types/job';

/** Tamanho estimado do serviço para exibição e regras de marketplace. */
export type ServiceSize = 'small' | 'medium' | 'large' | 'premium';

export type OpportunityDifficulty = 'low' | 'medium' | 'high';

export interface EstimatedPriceRange {
  minCad: number;
  maxCad: number;
}

export interface LinkCreditSubcategoryPricing {
  /** Chave alinhada a `serviceCategories` ou alias documentado. */
  subcategory: string;
  estimatedPriceRange: EstimatedPriceRange;
  baseCredits: number;
  difficulty: OpportunityDifficulty;
  /** Multiplicador opcional sobre o base antes dos adicionais (default 1). */
  urgencyMultiplier: number;
  /** Multiplicador opcional de distância no base antes dos adicionais (default 1). */
  distanceMultiplier: number;
}

export interface LinkCreditCategoryPricing {
  category: string;
  subcategories: LinkCreditSubcategoryPricing[];
}

/** Adicionais fixos em LinkCréditos (LC), configuráveis. */
export const LINK_CREDIT_SURCHARGES = {
  emergency: 3,
  urgent: 2,
  todayTomorrow: 1,
  commercialOrPremium: 3,
  nightOrWeekend: 1,
} as const;

/** Distância longa: faixas cumulativas (aplica o maior tier atingido). */
export const LINK_CREDIT_DISTANCE_TIERS = [
  { minKm: 20, extraCredits: 1 },
  { minKm: 35, extraCredits: 2 },
  { minKm: 50, extraCredits: 3 },
] as const;

/** Faixas de tamanho por total estimado de LC. */
export const LINK_CREDIT_SERVICE_SIZE_BANDS: {
  size: ServiceSize;
  minCredits: number;
  maxCredits: number | null;
}[] = [
  { size: 'small', minCredits: 0, maxCredits: 2 },
  { size: 'medium', minCredits: 3, maxCredits: 5 },
  { size: 'large', minCredits: 6, maxCredits: 10 },
  { size: 'premium', minCredits: 11, maxCredits: null },
];

export const LINK_CREDITS_CATEGORY_CATALOG: LinkCreditCategoryPricing[] = [
  {
    category: 'cleaning',
    subcategories: [
      entry('apartment', { minCad: 60, maxCad: 140 }, 2, 'low'),
      entry('house', { minCad: 100, maxCad: 220 }, 4, 'medium'),
      entry('commercial', { minCad: 150, maxCad: 400 }, 5, 'medium'),
      entry('post_construction', { minCad: 200, maxCad: 550 }, 8, 'high'),
      entry('airbnb', { minCad: 55, maxCad: 130 }, 2, 'low'),
      entry('moving_clean', { minCad: 120, maxCad: 280 }, 5, 'medium'),
    ],
  },
  {
    category: 'moving',
    subcategories: [
      entry('small_delivery', { minCad: 35, maxCad: 90 }, 1, 'low'),
      entry('ikea_pickup', { minCad: 50, maxCad: 120 }, 2, 'low'),
      entry('apartments', { minCad: 180, maxCad: 450 }, 5, 'medium'),
      entry('houses', { minCad: 350, maxCad: 900 }, 10, 'high'),
      entry('offices', { minCad: 500, maxCad: 1200 }, 15, 'high'),
      entry('heavy_item', { minCad: 120, maxCad: 320 }, 6, 'medium'),
    ],
  },
  {
    category: 'assembly',
    subcategories: [
      entry('chair', { minCad: 40, maxCad: 90 }, 1, 'low'),
      entry('table', { minCad: 55, maxCad: 130 }, 2, 'low'),
      entry('desk', { minCad: 55, maxCad: 130 }, 2, 'low'),
      entry('wardrobe', { minCad: 100, maxCad: 240 }, 4, 'medium'),
      entry('tv_mount', { minCad: 80, maxCad: 180 }, 3, 'medium'),
      entry('curtains', { minCad: 50, maxCad: 120 }, 2, 'low'),
      entry('wall_mount', { minCad: 50, maxCad: 120 }, 2, 'low'),
      entry('ikea', { minCad: 160, maxCad: 420 }, 7, 'high'),
    ],
  },
  {
    category: 'automotive',
    subcategories: [
      entry('jump_start', { minCad: 45, maxCad: 95 }, 1, 'low'),
      entry('battery', { minCad: 45, maxCad: 95 }, 1, 'low'),
      entry('tire', { minCad: 60, maxCad: 140 }, 2, 'low'),
      entry('premium_wash', { minCad: 90, maxCad: 200 }, 4, 'medium'),
      entry('diagnostic', { minCad: 75, maxCad: 170 }, 3, 'medium'),
    ],
  },
  {
    category: 'translation',
    subcategories: [
      entry('document', { minCad: 40, maxCad: 100 }, 1, 'low'),
      entry('immigration', { minCad: 120, maxCad: 280 }, 3, 'medium'),
      entry('consultation', { minCad: 150, maxCad: 350 }, 5, 'medium'),
    ],
  },
  {
    category: 'beauty',
    subcategories: [
      entry('nails', { minCad: 45, maxCad: 110 }, 2, 'low'),
      entry('nail_extensions', { minCad: 70, maxCad: 160 }, 3, 'medium'),
      entry('barber', { minCad: 35, maxCad: 90 }, 2, 'low'),
      entry('hairdresser', { minCad: 80, maxCad: 180 }, 4, 'medium'),
      entry('body_massage', { minCad: 100, maxCad: 220 }, 5, 'medium'),
      entry('facial_cleansing', { minCad: 70, maxCad: 160 }, 3, 'medium'),
      entry('brows', { minCad: 35, maxCad: 85 }, 2, 'low'),
      entry('waxing', { minCad: 50, maxCad: 120 }, 3, 'medium'),
      entry('lashes', { minCad: 80, maxCad: 180 }, 4, 'medium'),
    ],
  },
];

const DEFAULT_FALLBACK: LinkCreditSubcategoryPricing = {
  subcategory: 'default',
  estimatedPriceRange: { minCad: 80, maxCad: 200 },
  baseCredits: 5,
  difficulty: 'medium',
  urgencyMultiplier: 1,
  distanceMultiplier: 1,
};

const CATEGORY_DEFAULTS: Partial<Record<string, number>> = {
  cleaning: 3,
  moving: 5,
  assembly: 3,
  automotive: 2,
  translation: 2,
  beauty: 3,
};

/** Aliases PT/legado → chave canônica do catálogo. */
export const LINK_CREDIT_SUBCATEGORY_ALIASES: Record<string, string> = {
  apartamento: 'apartment',
  casa: 'house',
  comercial: 'commercial',
  pos_obra: 'post_construction',
  'pos-obra': 'post_construction',
  airbnb: 'airbnb',
  mudanca_saida: 'moving_clean',
  'mudanca/saida': 'moving_clean',
  pequena_entrega: 'small_delivery',
  pickup_ikea: 'ikea_pickup',
  escritorio: 'offices',
  item_pesado: 'heavy_item',
  cadeira: 'chair',
  'mesa/escrivaninha': 'table',
  mesa: 'table',
  escrivaninha: 'desk',
  guarda_roupa: 'wardrobe',
  tv_parede: 'tv_mount',
  'cortina/prateleira': 'curtains',
  cortina: 'curtains',
  prateleira: 'wall_mount',
  ikea_completo: 'ikea',
  boost_bateria: 'jump_start',
  troca_pneu: 'tire',
  lavagem_premium: 'premium_wash',
  diagnostico: 'diagnostic',
  documento_simples: 'document',
  imigracao: 'immigration',
  acompanhamento_presencial: 'consultation',
  unhas: 'nails',
  alongamento_unhas: 'nail_extensions',
  barbeiro: 'barber',
  cabeleireira: 'hairdresser',
  massagem_corporal: 'body_massage',
  limpeza_pele: 'facial_cleansing',
  sobrancelha: 'brows',
  depilacao: 'waxing',
  lash_designer: 'lashes',
};

export type OpportunityScheduleTiming = 'today' | 'tomorrow' | 'flexible';

export interface OpportunityCreditRequest {
  category: string;
  subcategory?: string | null;
  urgency?: JobUrgency | 'emergency';
  scheduleTiming?: OpportunityScheduleTiming;
  distanceKm?: number | null;
  isCommercial?: boolean;
  isPremium?: boolean;
  isNightOrWeekend?: boolean;
  isEmergency?: boolean;
}

export interface OpportunityCreditSurchargeBreakdown {
  emergency: number;
  urgent: number;
  todayTomorrow: number;
  distance: number;
  commercialOrPremium: number;
  nightOrWeekend: number;
}

export interface OpportunityCreditResult {
  estimatedCredits: number;
  serviceSize: ServiceSize;
  baseCredits: number;
  surcharges: OpportunityCreditSurchargeBreakdown;
  pricing: LinkCreditSubcategoryPricing;
}

function entry(
  subcategory: string,
  estimatedPriceRange: EstimatedPriceRange,
  baseCredits: number,
  difficulty: OpportunityDifficulty,
  urgencyMultiplier = 1,
  distanceMultiplier = 1,
): LinkCreditSubcategoryPricing {
  return {
    subcategory,
    estimatedPriceRange,
    baseCredits,
    difficulty,
    urgencyMultiplier,
    distanceMultiplier,
  };
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s/]+/g, '_');
}

function resolveSubcategoryKey(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  const normalized = normalizeKey(raw);
  return LINK_CREDIT_SUBCATEGORY_ALIASES[normalized] ?? normalized;
}

const pricingIndex = new Map<string, LinkCreditSubcategoryPricing>();
for (const group of LINK_CREDITS_CATEGORY_CATALOG) {
  for (const row of group.subcategories) {
    pricingIndex.set(`${group.category}:${row.subcategory}`, row);
  }
}

export function getSubcategoryPricing(
  category: string,
  subcategory?: string | null,
): LinkCreditSubcategoryPricing {
  const cat = normalizeKey(category);
  const sub = resolveSubcategoryKey(subcategory);
  if (sub) {
    const hit = pricingIndex.get(`${cat}:${sub}`);
    if (hit) return hit;
  }
  const categoryDefaultCredits = CATEGORY_DEFAULTS[cat];
  if (categoryDefaultCredits != null) {
    return {
      ...DEFAULT_FALLBACK,
      subcategory: sub ?? 'default',
      baseCredits: categoryDefaultCredits,
    };
  }
  return DEFAULT_FALLBACK;
}

function distanceSurcharge(distanceKm?: number | null): number {
  if (distanceKm == null || !Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  let extra = 0;
  for (const tier of LINK_CREDIT_DISTANCE_TIERS) {
    if (distanceKm >= tier.minKm) extra = tier.extraCredits;
  }
  return extra;
}

export function resolveServiceSize(totalCredits: number): ServiceSize {
  const rounded = Math.max(0, Math.round(totalCredits));
  for (const band of LINK_CREDIT_SERVICE_SIZE_BANDS) {
    if (rounded >= band.minCredits && (band.maxCredits == null || rounded <= band.maxCredits)) {
      return band.size;
    }
  }
  return 'premium';
}

/**
 * Estima LinkCréditos (LC) para desbloquear/visualizar uma oportunidade.
 * Todos os valores vêm de `LINK_CREDITS_*` — ajuste o config sem tocar em componentes.
 */
export function calculateOpportunityCredits(request: OpportunityCreditRequest): OpportunityCreditResult {
  const pricing = getSubcategoryPricing(request.category, request.subcategory);

  let base = pricing.baseCredits * pricing.urgencyMultiplier * pricing.distanceMultiplier;
  base = Math.round(base * 10) / 10;

  const surcharges: OpportunityCreditSurchargeBreakdown = {
    emergency: 0,
    urgent: 0,
    todayTomorrow: 0,
    distance: 0,
    commercialOrPremium: 0,
    nightOrWeekend: 0,
  };

  const isEmergency = request.isEmergency === true || request.urgency === 'emergency';
  if (isEmergency) surcharges.emergency = LINK_CREDIT_SURCHARGES.emergency;

  if (request.urgency === 'high') surcharges.urgent = LINK_CREDIT_SURCHARGES.urgent;

  if (request.scheduleTiming === 'today' || request.scheduleTiming === 'tomorrow') {
    surcharges.todayTomorrow = LINK_CREDIT_SURCHARGES.todayTomorrow;
  }

  surcharges.distance = distanceSurcharge(request.distanceKm);

  if (request.isCommercial === true || request.isPremium === true) {
    surcharges.commercialOrPremium = LINK_CREDIT_SURCHARGES.commercialOrPremium;
  }

  if (request.isNightOrWeekend === true) {
    surcharges.nightOrWeekend = LINK_CREDIT_SURCHARGES.nightOrWeekend;
  }

  const surchargeTotal = Object.values(surcharges).reduce((sum, n) => sum + n, 0);
  const estimatedCredits = Math.max(1, Math.round(base + surchargeTotal));

  return {
    estimatedCredits,
    serviceSize: resolveServiceSize(estimatedCredits),
    baseCredits: Math.round(base),
    surcharges,
    pricing,
  };
}
