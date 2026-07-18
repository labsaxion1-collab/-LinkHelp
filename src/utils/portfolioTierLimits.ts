import { PORTFOLIO_RUNTIME_TIER, type LegacyHelperTierKey } from '@/types/helperSubscription';

/** Upload & featured limits keyed by legacy internal tier (not commercial plans). */
export function portfolioMaxPhotos(tier: LegacyHelperTierKey = PORTFOLIO_RUNTIME_TIER): number {
  switch (tier) {
    case 'PRO_HELP':
      return 24;
    case 'ELITE':
      return 14;
    default:
      return 6;
  }
}

export function portfolioMaxVideos(tier: LegacyHelperTierKey = PORTFOLIO_RUNTIME_TIER): number {
  switch (tier) {
    case 'PRO_HELP':
      return 12;
    case 'ELITE':
      return 8;
    default:
      return 1;
  }
}

export function portfolioMaxFeatured(tier: LegacyHelperTierKey = PORTFOLIO_RUNTIME_TIER): number {
  switch (tier) {
    case 'PRO_HELP':
      return 5;
    case 'ELITE':
      return 3;
    default:
      return 1;
  }
}
