import type { HelperSubscriptionTier } from '@/types/helperSubscription';

export type ApplicationStatus = 'pending' | 'viewed' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export interface Application {
  id: string;
  jobId: string;
  helperId: string;
  /** Present when loaded from Supabase */
  clientId?: string;
  message?: string | null;
  /** Helper proposed price when applying (CAD). */
  proposedAmount?: number | null;
  /** Exclusive applications hide the request from other helpers. */
  isExclusive?: boolean;
  helperName: string;
  helperAvatar: string;
  helperRating: number;
  helperJobs: number;
  /** Membership tier at time of application (for client-side badges). */
  helperPlan?: HelperSubscriptionTier;
  status: ApplicationStatus;
  /** True only after client clicks “Contratar oficialmente”. */
  chatUnlocked?: boolean;
  createdAt: number;
}
