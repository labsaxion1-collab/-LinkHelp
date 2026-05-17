import type { HelperSubscriptionTier } from '@/types/helperSubscription';

export type HelperPlanOption = {
  tier: HelperSubscriptionTier;
  nameKey: string;
  taglineKey: string;
  priceKey: string;
  priceLineKey: string;
  applicationsKey: string;
  badgeKey: string;
  benefitPrefix: 'subscription_basic' | 'subscription_elite' | 'subscription_pro_help';
  benefitCount: number;
  popular?: boolean;
  professional?: boolean;
};

/** Display order: Basic → Pro → Elite */
export const HELPER_PLAN_OPTIONS: HelperPlanOption[] = [
  {
    tier: 'BASIC',
    nameKey: 'helper_dashboard.upgrade_plan_basic',
    taglineKey: 'helper_dashboard.upgrade_basic_tagline',
    priceKey: 'helper_dashboard.upgrade_price_basic',
    priceLineKey: 'helper_dashboard.upgrade_price_line_basic',
    applicationsKey: 'helper_dashboard.subscription_basic_1',
    badgeKey: 'helper_dashboard.subscription_basic_5',
    benefitPrefix: 'subscription_basic',
    benefitCount: 6,
  },
  {
    tier: 'PRO_HELP',
    nameKey: 'helper_dashboard.upgrade_plan_pro',
    taglineKey: 'helper_dashboard.upgrade_pro_help_tagline',
    priceKey: 'helper_dashboard.upgrade_price_pro_help',
    priceLineKey: 'helper_dashboard.upgrade_price_line_pro_help',
    applicationsKey: 'helper_dashboard.plan_pro_applications',
    badgeKey: 'helper_dashboard.subscription_pro_help_4',
    benefitPrefix: 'subscription_pro_help',
    benefitCount: 9,
    professional: true,
  },
  {
    tier: 'ELITE',
    nameKey: 'helper_dashboard.upgrade_plan_elite',
    taglineKey: 'helper_dashboard.upgrade_elite_tagline',
    priceKey: 'helper_dashboard.upgrade_price_elite',
    priceLineKey: 'helper_dashboard.upgrade_price_line_elite',
    applicationsKey: 'helper_dashboard.subscription_elite_1',
    badgeKey: 'helper_dashboard.subscription_elite_5',
    benefitPrefix: 'subscription_elite',
    benefitCount: 8,
    popular: true,
  },
];

export function planOptionForTier(tier: HelperSubscriptionTier): HelperPlanOption {
  return HELPER_PLAN_OPTIONS.find((p) => p.tier === tier) ?? HELPER_PLAN_OPTIONS[0];
}
