export type ClientCreditLedgerType =
  | 'FREE_BONUS'
  | 'CREDIT_PURCHASE'
  | 'REQUEST_PUBLISH'
  | 'REQUEST_REFUND'
  | 'REQUEST_CANCEL_REFUND'
  | 'MANUAL_ADJUSTMENT'
  | 'OBLIGATION_SETTLEMENT'
  | (string & {});

export type ClientCreditLedgerEntry = {
  id: string;
  clientId: string;
  type: ClientCreditLedgerType;
  amount: number;
  balanceAfter: number;
  rewardType: string | null;
  description: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ClientCreditMetrics = {
  usedThisMonth: number;
  requestsPublishedThisMonth: number;
  creditsReturned: number;
};

export type ClientLedgerRequestDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  location: string;
  preferredDate: string | null;
  preferredTime: string | null;
  preferredPeriod: string | null;
  preferredTimeWindow: string | null;
  budget: string | null;
  budgetType: 'fixed' | 'negotiable' | null;
  budgetAmount: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string | null;
  status: string;
  createdAt: string;
};
