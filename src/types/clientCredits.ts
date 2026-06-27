export type ClientCreditLedgerType =
  | 'FREE_BONUS'
  | 'REQUEST_PUBLISH'
  | 'REQUEST_REFUND'
  | 'REQUEST_CANCEL_REFUND'
  | 'MANUAL_ADJUSTMENT'
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
