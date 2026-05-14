import type { HelperSubscriptionTier } from '@/types/helperSubscription';

export type ApplicationStatus = 'pending' | 'viewed' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export interface Application {
  id: string;
  jobId: string;
  helperId: string;
  /** Present when loaded from Supabase */
  clientId?: string;
  message?: string | null;
  helperName: string;
  helperAvatar: string;
  helperRating: number;
  helperJobs: number;
  /** Membership tier at time of application (for client-side badges). */
  helperPlan?: HelperSubscriptionTier;
  status: ApplicationStatus;
  createdAt: number;
}
