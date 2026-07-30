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
  /** Server snapshot total LC at apply time (pack 50). */
  leadTotalLc?: number | null;
  leadDebitLc?: number | null;
  leadServiceMode?: 'remote' | 'in_person' | null;
  helperName: string;
  helperAvatar: string;
  helperRating: number;
  helperJobs: number;
  status: ApplicationStatus;
  /** True only after client clicks “Contratar oficialmente”. */
  chatUnlocked?: boolean;
  createdAt: number;
}
