/** Row shapes for Supabase — keep in sync with `supabase/migrations/0001_linkhelp_production.sql`. */

export type ProfileRole = 'client' | 'helper';
export type UserType = ProfileRole;
export type RequestStatus = 'open' | 'paused' | 'in_progress' | 'completed' | 'cancelled';
export type DbApplicationStatus = 'pending' | 'viewed' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export type ProfileRow = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: ProfileRole;
  rating: number | null;
  credits: number;
  bio: string | null;
  city: string | null;
  phone: string | null;
  preferred_language: string | null;
  spoken_languages: string[] | null;
  primary_category: string | null;
  secondary_categories: string[] | null;
  helper_base_address: string | null;
  helper_base_city: string | null;
  helper_base_province: string | null;
  helper_base_postal_code: string | null;
  helper_base_lat: number | null;
  helper_base_lng: number | null;
  helper_base_updated_at: string | null;
  helper_base_change_unlocked_by_admin: boolean;
  /** State / province (e.g. QC). */
  region: string | null;
  country: string | null;
  accepted_terms: boolean;
  accepted_terms_at: string | null;
  helper_terms_accepted: boolean;
  helper_terms_accepted_at: string | null;
  /** Timestamp of last personal address/city change (30-day lock). */
  address_updated_at: string | null;
  /** Set when user deletes account; cleared on re-onboarding. */
  deleted_at: string | null;
  /** Set when client completes welcome onboarding (CLIENT_WELCOME_30). */
  client_onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HelperPortfolioItemRow = {
  id: string;
  helper_id: string;
  type: 'image' | 'video';
  url: string;
  storage_path: string;
  title: string | null;
  caption: string | null;
  skill_id: string | null;
  featured: boolean;
  duration_sec: number | null;
  thumb_url: string | null;
  created_at: string;
};

/** Minimal profile fields for job/application mappers. */
export type MapperProfile = {
  name: string | null;
  avatar_url: string | null;
  rating: number | null;
  jobs_completed: number | null;
  plan_type: string | null;
};

export type RequestRow = {
  id: string;
  client_id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  /** Present after baseline pack 40; omit/null on historical DB. */
  service_mode?: 'remote' | 'in_person' | null;
  urgency: string;
  budget: string | null;
  location: string;
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  preferred_date: string | null;
  preferred_time_window: string | null;
  preferred_time: string | null;
  budget_type: 'fixed' | 'negotiable' | null;
  budget_amount: number | null;
  currency: string | null;
  budget_min: number | null;
  budget_max: number | null;
  accepted_amount: number | null;
  application_count: number;
  exclusive_helper_id?: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
};

export type ApplicationRow = {
  id: string;
  request_id: string;
  helper_id: string;
  client_id: string;
  status: DbApplicationStatus;
  message: string | null;
  proposed_amount: number | null;
  is_exclusive: boolean | null;
  /** Immutable lead total snapshot (pack 40/50). */
  lead_total_lc?: number | null;
  lead_debit_lc?: number | null;
  lead_service_mode?: 'remote' | 'in_person' | null;
  created_at: string;
  updated_at: string;
};

export type ConversationRow = {
  id: string;
  request_id: string;
  client_id: string;
  helper_id: string;
  contact_unlocked: boolean;
  created_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read?: boolean;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  request_id: string;
  reviewer_id: string;
  target_user_id: string;
  rating: number;
  comment: string | null;
  criteria_scores: Record<string, number> | null;
  reviewer_role: string | null;
  created_at: string;
};

export type HelperSkillRow = {
  id: string;
  helper_id: string;
  category: string;
  subcategory: string | null;
  created_at: string;
};

export type UpcomingJobRow = {
  id: string;
  request_id: string;
  helper_id: string;
  client_name: string;
  client_avatar: string | null;
  title: string;
  category: string;
  description: string;
  location: string;
  value_hint: string | null;
  urgency: string;
  scheduled_at: string;
  workflow_status: string;
  completion_requested_at: string | null;
  review_window_ends_at: string | null;
  created_at: string;
};

export type CreditWalletRow = {
  id: string;
  helper_id: string;
  balance: number;
  total_purchased: number;
  total_bonus: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
};

export type CreditTransactionRow = {
  id: string;
  helper_id: string;
  type: string;
  amount: number;
  balance_after: number;
  related_opportunity_id: string | null;
  related_payment_id: string | null;
  description: string | null;
  created_at: string;
};

export type OpportunityUnlockRow = {
  id: string;
  opportunity_id: string;
  helper_id: string;
  credits_spent: number;
  status: string;
  unlocked_at: string;
  refund_eligible: boolean;
  refund_status: string;
  response_deadline: string | null;
  application_id: string | null;
  refunded_at: string | null;
  created_at: string;
};

export type UserBonusRewardRow = {
  id: string;
  user_id: string;
  reward_type: string;
  amount: number;
  created_at: string;
};

export type ClientCreditLedgerRow = {
  id: string;
  client_id: string;
  type: string;
  amount: number;
  balance_after: number;
  reward_type: string | null;
  description: string | null;
  request_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CreditPackageRow = {
  id: string;
  name: string;
  credits: number;
  price_cad: number;
  active: boolean;
  highlight_label: string | null;
  created_at: string;
};

/** Reclamação entre usuários — `supabase/migrations/0046`. */
export type UserComplaintRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reported_user_type: UserType;
  reason: string | null;
  status: 'open' | 'confirmed' | 'rejected';
  created_at: string;
};

/** Snapshot de gamificação — `supabase/migrations/0043` + `0044`. */
export type UserGamificationRow = {
  id: string;
  user_id: string;
  user_type: UserType;
  score_1000: number;
  level_key: string;
  hero_key: string | null;
  total_completed: number;
  avg_rating: number;
  response_rate: number;
  cancel_count: number;
  complaint_count: number;
  profile_pct: number;
  applications_count: number;
  published_orders_count: number;
  hire_rate: number;
  progress_percent: number | null;
  points_to_next_level: number | null;
  missing_requirements: string[] | null;
  updated_at: string;
};
