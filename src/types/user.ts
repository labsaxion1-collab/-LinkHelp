import type { HelperSubscriptionTier } from '@/types/helperSubscription';

export interface DemoUser {
  id: string;
  name: string;
  role: string;
  avatar: string;
  location: string;
  rating?: number;
  jobsCompleted?: number;
  /** Monthly membership tier (helpers; clients use same enum for pre-match chat limits). */
  subscriptionTier?: HelperSubscriptionTier;
  /** ISO date string `YYYY-MM-DD` (helpers on paid tiers). */
  nextBillingDate?: string;
}

export interface MockUserBundle {
  client: DemoUser;
  helper: DemoUser;
}
