export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type JobUrgency = 'normal' | 'high';

export interface Job {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  /** Average rating from helpers (profiles.rating). */
  clientRating?: number | null;
  title: string;
  category: string;
  description: string;
  /** Free-text schedule label shown in UI */
  date: string;
  location: string;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  preferredDate?: string | null;
  preferredTimeWindow?: string | null;
  preferredTime?: string | null;
  /** morning | afternoon | evening */
  preferredPeriod?: string | null;
  /** Optional coordinates for future proximity / map */
  latitude?: number | null;
  longitude?: number | null;
  subcategory?: string | null;
  value: string;
  budgetType?: 'fixed' | 'negotiable' | null;
  budgetAmount?: number | null;
  currency?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  /** Amount accepted from helper proposal after client hire. */
  acceptedAmount?: number | null;
  urgency: JobUrgency;
  status: JobStatus;
  createdAt: number;
}
