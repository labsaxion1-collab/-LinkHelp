import type { JobUrgency } from './job';

export type UpcomingWorkflowStatus =
  | 'scheduled'
  | 'accepted'
  | 'in_progress'
  | 'arriving'
  | 'awaiting_client_confirmation'
  | 'completion_requested'
  | 'completed'
  | 'auto_completed'
  | 'cancelled';

export interface UpcomingJob {
  id: string;
  helperId: string;
  jobId: string;
  clientName: string;
  clientAvatar: string;
  title: string;
  category: string;
  description: string;
  location: string;
  value: string;
  urgency: JobUrgency;
  scheduledAt: number;
  workflowStatus: UpcomingWorkflowStatus;
  completionRequestedAt: number | null;
  reviewWindowEndsAt: number | null;
  createdAt: number;
}
