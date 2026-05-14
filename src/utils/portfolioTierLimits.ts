import type { HelperSubscriptionTier } from '@/types/helperSubscription';

/** Upload & featured limits — BASIC stays usable; paid tiers add fair scale (no paywall on essentials). */
export function portfolioMaxPhotos(tier: HelperSubscriptionTier): number {
  switch (tier) {
    case 'PRO_HELP':
      return 24;
    case 'ELITE':
      return 14;
    default:
      return 6;
  }
}

export function portfolioMaxVideos(tier: HelperSubscriptionTier): number {
  switch (tier) {
    case 'PRO_HELP':
      return 12;
    case 'ELITE':
      return 8;
    default:
      return 1;
  }
}

export function portfolioMaxFeatured(tier: HelperSubscriptionTier): number {
  switch (tier) {
    case 'PRO_HELP':
      return 5;
    case 'ELITE':
      return 3;
    default:
      return 1;
  }
}
