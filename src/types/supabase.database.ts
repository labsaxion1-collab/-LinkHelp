import type {
  ApplicationRow,
  ConversationRow,
  CreditPackageRow,
  CreditTransactionRow,
  CreditWalletRow,
  HelperPortfolioItemRow,
  HelperSkillRow,
  MessageRow,
  NotificationRow,
  OpportunityUnlockRow,
  UserBonusRewardRow,
  ClientCreditLedgerRow,
  ProfileRow,
  RequestRow,
  ReviewRow,
  UpcomingJobRow,
  UserComplaintRow,
  UserGamificationRow,
} from './database';

type Json = Record<string, unknown> | string | number | boolean | null;

/** Narrow Database typing for createClient<Database> — extend as needed. */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, 'id' | 'role'>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      waitlist: {
        Row: { id: string; first_name: string; email: string; city: string; user_type: string; language: string; source: string | null; campaign: string | null; utm_medium: string | null; referrer: string | null; consent_marketing: boolean; status: string; created_at: string };
        Insert: { id?: string; first_name: string; email: string; city: string; user_type: string; language?: string; source?: string | null; campaign?: string | null; utm_medium?: string | null; referrer?: string | null; consent_marketing: boolean; status?: string; created_at?: string };
        Update: Partial<{ first_name: string; email: string; city: string; user_type: string; language: string; source: string | null; campaign: string | null; utm_medium: string | null; referrer: string | null; consent_marketing: boolean; status: string }>;
        Relationships: [];
      };
      requests: {
        Row: RequestRow;
        Insert: Record<string, unknown>;
        Update: Partial<RequestRow>;
        Relationships: [];
      };
      applications: {
        Row: ApplicationRow;
        Insert: Record<string, unknown>;
        Update: Partial<ApplicationRow>;
        Relationships: [];
      };
      conversations: {
        Row: ConversationRow;
        Insert: Record<string, unknown>;
        Update: Partial<ConversationRow>;
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: Record<string, unknown>;
        Update: Partial<MessageRow>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Record<string, unknown>;
        Update: Partial<NotificationRow>;
        Relationships: [];
      };
      reviews: {
        Row: ReviewRow;
        Insert: Record<string, unknown>;
        Update: Partial<ReviewRow>;
        Relationships: [];
      };
      helper_skills: {
        Row: HelperSkillRow;
        Insert: Record<string, unknown>;
        Update: Partial<HelperSkillRow>;
        Relationships: [];
      };
      upcoming_jobs: {
        Row: UpcomingJobRow;
        Insert: Record<string, unknown>;
        Update: Partial<UpcomingJobRow>;
        Relationships: [];
      };
      helper_portfolio_items: {
        Row: HelperPortfolioItemRow;
        Insert: Omit<HelperPortfolioItemRow, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<HelperPortfolioItemRow>;
        Relationships: [];
      };
      credit_wallets: {
        Row: CreditWalletRow;
        Insert: Record<string, unknown>;
        Update: Partial<CreditWalletRow>;
        Relationships: [];
      };
      credit_transactions: {
        Row: CreditTransactionRow;
        Insert: Record<string, unknown>;
        Update: Partial<CreditTransactionRow>;
        Relationships: [];
      };
      opportunity_unlocks: {
        Row: OpportunityUnlockRow;
        Insert: Record<string, unknown>;
        Update: Partial<OpportunityUnlockRow>;
        Relationships: [];
      };
      credit_packages: {
        Row: CreditPackageRow;
        Insert: Record<string, unknown>;
        Update: Partial<CreditPackageRow>;
        Relationships: [];
      };
      user_bonus_rewards: {
        Row: UserBonusRewardRow;
        Insert: Record<string, unknown>;
        Update: Partial<UserBonusRewardRow>;
        Relationships: [];
      };
      client_credit_ledger: {
        Row: ClientCreditLedgerRow;
        Insert: Record<string, unknown>;
        Update: Partial<ClientCreditLedgerRow>;
        Relationships: [];
      };
      user_gamification: {
        Row: UserGamificationRow;
        Insert: Partial<UserGamificationRow> & Pick<UserGamificationRow, 'user_id' | 'user_type'>;
        Update: Partial<UserGamificationRow>;
        Relationships: [];
      };
      user_complaints: {
        Row: UserComplaintRow;
        Insert: Record<string, unknown>;
        Update: Partial<UserComplaintRow>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: { user_id: string; endpoint: string; subscription: Json; updated_at: string };
        Insert: { user_id: string; endpoint: string; subscription: Json; updated_at?: string };
        Update: Partial<{ user_id: string; subscription: Json; updated_at: string }>;
        Relationships: [];
      };
      push_notification_queue: {
        Row: { id: string; user_id: string; title: string; body: string; url: string; created_at: string };
        Insert: { id?: string; user_id: string; title: string; body?: string; url?: string; created_at?: string };
        Update: Partial<{ title: string; body: string; url: string }>;
        Relationships: [];
      };
      request_market_signals: {
        Row: { id: string; request_id: string; helper_id: string | null; signal: string; event: string; category: string | null; city: string | null; province: string | null; budget_min: number | null; budget_max: number | null; distance_km: number | null; created_at: string };
        Insert: Record<string, unknown>;
        Update: Partial<Record<string, unknown>>;
        Relationships: [];
      };
      helper_proposal_analytics: {
        Row: { id: string; request_id: string; helper_id: string; event: string; source: string | null; proposed_amount: number | null; budget_min: number | null; budget_max: number | null; duration_ms: number | null; timezone: string; created_at: string };
        Insert: Record<string, unknown>;
        Update: Partial<Record<string, unknown>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      unlock_opportunity_with_credits: { Args: { p_opportunity_id: string }; Returns: unknown };
      refund_opportunity_unlock: { Args: { p_unlock_id: string }; Returns: unknown };
      ensure_helper_credit_wallet: { Args: { p_helper_id: string }; Returns: unknown };
      get_wallet_balance: { Args: { p_helper_id: string }; Returns: number };
      admin_adjust_helper_credits: {
        Args: { p_helper_id: string; p_amount: number; p_description: string };
        Returns: unknown;
      };
      confirm_credit_purchase: {
        Args: { p_helper_id: string; p_package_id: string; p_payment_id: string };
        Returns: unknown;
      };
      grant_user_reward: {
        Args: {
          p_user_id: string;
          p_reward_type: string;
          p_amount: number | null;
          p_description: string | null;
        };
        Returns: unknown;
      };
      ensure_client_signup_credits: { Args: { p_client_id: string }; Returns: number };
      client_publish_request: { Args: { p_request: Json; p_extended?: boolean }; Returns: Json };
      confirm_client_stripe_linkcredit_purchase: { Args: { payload: Json }; Returns: Json };
      update_helper_base_address: {
        Args: {
          p_address: string;
          p_city: string;
          p_province: string;
          p_postal_code: string;
          p_lat: number | null;
          p_lng: number | null;
        };
        Returns: ProfileRow;
      };
      ensure_profile_for_current_user: {
        Args: {
          p_role?: string | null;
          p_name?: string | null;
          p_city?: string | null;
          p_region?: string | null;
          p_country?: string | null;
          p_phone?: string | null;
          p_preferred_language?: string | null;
          p_spoken_languages?: string[] | null;
        };
        Returns: ProfileRow;
      };
      ensure_conversation: {
        Args: {
          p_request_id: string;
          p_client_id: string;
          p_helper_id: string;
          p_contact_unlocked?: boolean;
        };
        Returns: string;
      };
      client_accept_proposal: {
        Args: { p_application_id: string; p_charge_amount?: number | null };
        Returns: Json;
      };
      client_reject_application: {
        Args: { p_application_id: string };
        Returns: Json;
      };
      charge_helper_on_client_hire: {
        Args: { p_application_id: string; p_amount: number };
        Returns: Json;
      };
      helper_debit_application_interest: {
        Args: { p_helper_id: string; p_request_id: string; p_amount?: number };
        Returns: Json;
      };
      helper_debit_application_selected: {
        Args: {
          p_helper_id: string;
          p_request_id: string;
          p_application_id: string;
          p_amount: number;
        };
        Returns: Json;
      };
      helper_submit_application: {
        Args: {
          p_request_id: string;
          p_helper_id: string;
          p_client_id: string;
          p_message?: string | null;
          p_proposed_amount?: number | null;
          p_interest_amount?: number;
          p_is_exclusive?: boolean;
        };
        Returns: Json;
      };
      request_has_exclusive_lock: {
        Args: {
          p_request_id: string;
          p_helper_id?: string;
        };
        Returns: boolean;
      };
      helper_mark_service_awaiting_confirmation: {
        Args: { p_upcoming_job_id: string };
        Returns: Json;
      };
      client_confirm_service_completed: {
        Args: { p_request_id: string };
        Returns: Json;
      };
      submit_service_review: {
        Args: {
          p_request_id: string;
          p_target_user_id: string;
          p_rating: number;
          p_comment?: string | null;
          p_criteria_scores?: Json | null;
          p_reviewer_role?: string | null;
        };
        Returns: Json;
      };
      get_public_gamification_profile: {
        Args: { target_user_id: string; target_user_type: string };
        Returns: { user_id: string; user_type: string; hero_key: string | null }[];
      };
      get_user_reputation_stats: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      get_public_reputation_dossier: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      complete_client_onboarding: {
        Args: { p_client_id: string; p_device_fingerprint?: string | null };
        Returns: Json;
      };
      confirm_initial_profile_role: {
        Args: { p_role: string };
        Returns: Json;
      };
      refresh_request_lead_quality: {
        Args: { p_request_id: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
  };
};

