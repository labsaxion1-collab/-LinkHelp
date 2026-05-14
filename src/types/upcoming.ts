import type { JobUrgency } from './job';

export type UpcomingWorkflowStatus =
  | 'scheduled'
  | 'in_progress'
  | 'arriving'
  | 'completed'
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
  createdAt: number;
}
