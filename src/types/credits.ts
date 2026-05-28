export type CreditTransactionType =
  | 'CREDIT_PURCHASE'
  | 'FREE_BONUS'
  | 'OPPORTUNITY_UNLOCK'
  | 'REFUND'
  | 'ADMIN_ADJUSTMENT'
  | 'APPLICATION_INTEREST'
  | 'APPLICATION_SELECTED';

export type OpportunityUnlockStatus = 'unlocked' | 'refunded' | 'cancelled';

export type CreditWallet = {
  id: string;
  helperId: string;
  balance: number;
  totalPurchased: number;
  totalBonus: number;
  totalSpent: number;
  createdAt: number;
  updatedAt: number;
};

export type CreditTransaction = {
  id: string;
  helperId: string;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  balanceBefore?: number | null;
  relatedOpportunityId?: string | null;
  requestId?: string | null;
  applicationId?: string | null;
  relatedPaymentId?: string | null;
  description: string;
  createdAt: number;
};

export type OpportunityUnlock = {
  id: string;
  opportunityId: string;
  helperId: string;
  creditsSpent: number;
  status: OpportunityUnlockStatus;
  unlockedAt: number;
  refundEligible: boolean;
  refundedAt?: number | null;
  createdAt: number;
};

export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  priceCad: number;
  active: boolean;
  highlightLabel?: string | null;
  createdAt: number;
};
