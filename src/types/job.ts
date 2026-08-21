export type JobStatus = 'open' | 'paused' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
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
  /** Canonical modality from requests.service_mode (`remote` | `in_person`). */
  serviceMode?: 'remote' | 'in_person' | null;
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
  /**
   * Listing TTL from requests.expires_at (publish = now + 7 days, migration 0060).
   * Epoch ms. Absent on pre-0060 legacy rows.
   */
  expiresAt?: number | null;
  createdAt: number;
  /** IANA timezone captured at publish (e.g. America/Toronto). */
  timezone?: string | null;
  createdTimezone?: string | null;
  /** Internal 0–100; not shown in UI */
  leadQualityScore?: number | null;
  /** Denormalized count of active applications (pending/viewed/accepted). Updated by DB trigger. */
  applicantCount?: number;
  /** Helper with active exclusive candidatura; other helpers cannot apply. */
  exclusiveHelperId?: string | null;
}
