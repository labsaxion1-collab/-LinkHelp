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
  ProfileRow,
  RequestRow,
  ReviewRow,
  UpcomingJobRow,
} from '@/types/database';

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
      ensure_profile_for_current_user: {
        Args: {
          p_role?: string | null;
          p_name?: string | null;
          p_city?: string | null;
          p_region?: string | null;
          p_country?: string | null;
          p_phone?: string | null;
          p_preferred_language?: string | null;
        };
        Returns: ProfileRow;
      };
    };
    Enums: Record<string, never>;
  };
};
