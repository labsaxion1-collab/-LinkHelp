/** Row shapes for Supabase — keep in sync with `supabase/migrations/0001_linkhelp_production.sql`. */

export type ProfileRole = 'client' | 'helper';
export type UserType = ProfileRole;
export type RequestStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
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
  /** State / province (e.g. QC). */
  region: string | null;
  country: string | null;
  accepted_terms: boolean;
  accepted_terms_at: string | null;
  helper_terms_accepted: boolean;
  helper_terms_accepted_at: string | null;
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
  urgency: string;
  budget: string | null;
  location: string;
  address: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  preferred_date: string | null;
  preferred_time_window: string | null;
  preferred_time: string | null;
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
  refunded_at: string | null;
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
