export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type JobUrgency = 'normal' | 'high';

export interface Job {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  title: string;
  category: string;
  description: string;
  /** Free-text schedule label shown in UI */
  date: string;
  location: string;
  /** Optional coordinates for future proximity / map */
  latitude?: number | null;
  longitude?: number | null;
  subcategory?: string | null;
  value: string;
  urgency: JobUrgency;
  status: JobStatus;
  createdAt: number;
}
