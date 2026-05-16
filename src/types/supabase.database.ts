import type {
  ApplicationRow,
  ConversationRow,
  HelperPortfolioItemRow,
  HelperSkillRow,
  MessageRow,
  NotificationRow,
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
