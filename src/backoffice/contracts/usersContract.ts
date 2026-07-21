export type BackofficeUserListItem = {
  id: string;
  name: string | null;
  email: string | null;
  role: 'client' | 'helper';
  city: string | null;
  region: string | null;
  country: string | null;
  rating: number | null;
  created_at: string;
  credit_balance: number;
};

export type BackofficeUserListResponse = {
  total: number;
  limit: number;
  offset: number;
  users: BackofficeUserListItem[];
};

export function parseBackofficeUserList(value: unknown): BackofficeUserListResponse | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const users = Array.isArray(raw.users) ? raw.users : [];
  return {
    total: Number(raw.total ?? 0),
    limit: Number(raw.limit ?? 50),
    offset: Number(raw.offset ?? 0),
    users: users as BackofficeUserListItem[],
  };
}

export type BackofficeUserDetailResponse = {
  profile: Record<string, unknown>;
  wallet: Record<string, unknown> | null;
  recentTransactions: unknown[];
  recentApplications: unknown[];
  recentRequests: unknown[];
  complaintCount: number;
};

export function parseBackofficeUserDetail(value: unknown): BackofficeUserDetailResponse | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!raw.profile || typeof raw.profile !== 'object') return null;
  return {
    profile: raw.profile as Record<string, unknown>,
    wallet: (raw.wallet as Record<string, unknown> | null) ?? null,
    recentTransactions: Array.isArray(raw.recentTransactions) ? raw.recentTransactions : [],
    recentApplications: Array.isArray(raw.recentApplications) ? raw.recentApplications : [],
    recentRequests: Array.isArray(raw.recentRequests) ? raw.recentRequests : [],
    complaintCount: Number(raw.complaintCount ?? 0),
  };
}
