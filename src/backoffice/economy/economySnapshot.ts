import { LINK_CREDIT_PACKAGES } from '../../config/linkCreditPackages.js';
import { SIGNUP_BONUS_LC, CLIENT_WELCOME_30_LC } from '../../config/onboardingRewards.js';
import { VIP_APPLICATION_SURCHARGE_LC } from '../../utils/vipApplicationCredits.js';

const CATEGORY_SERVICE_LC: Record<string, number> = {
  cleaning: 7,
  sanitization: 6,
  beauty: 5,
  outdoor: 5,
  tech: 6,
  design: 6,
  marketing: 5,
  translation: 3,
  pet: 3,
  moving: 8,
  assembly: 7,
  automotive: 8,
  renovation: 9,
};

const DISTANCE_TIERS = [
  { maxKm: 5, extraLc: 0 },
  { maxKm: 10, extraLc: 1 },
  { maxKm: 20, extraLc: 2 },
  { maxKm: 35, extraLc: 4 },
  { maxKm: 50, extraLc: 7 },
  { maxKm: null, extraLc: 12 },
] as const;

/** Read-only economy snapshot for BackOffice P0 — mirrors code + DB, not editable yet. */
export function buildEconomySnapshot() {
  return {
    source: 'code_fallback' as const,
    generatedAt: new Date().toISOString(),
    packages: LINK_CREDIT_PACKAGES.map((p) => ({
      id: p.id,
      credits: p.credits,
      priceCad: p.price,
      currency: p.currency,
      active: true,
      source: 'src/config/linkCreditPackages.ts',
    })),
    applyRules: {
      normalApplyLc: 4,
      vipSurchargeLc: VIP_APPLICATION_SURCHARGE_LC,
      vipApplyFormula: 'fullRequestLc + 4',
      vipHireLc: 0,
      source: 'split-charge',
    },
    categoryServiceLc: CATEGORY_SERVICE_LC,
    distanceTiers: DISTANCE_TIERS,
    bonuses: {
      helperSignupLc: SIGNUP_BONUS_LC.helper,
      clientWelcomeLc: CLIENT_WELCOME_30_LC,
      source: 'src/config/onboardingRewards.ts',
    },
    tolerance: {
      note: 'Credit Protection V1 — pending deploy; monthly 1x America/Toronto',
      deployed: false,
    },
  };
}

export type EconomySnapshot = ReturnType<typeof buildEconomySnapshot>;
