/** Frontend-only credits analytics — connect to ledger later. */

export const MOCK_CREDITS_USAGE = {
  lcUsed: 8,
  lcReturned: 3,
  responseRatePct: 42,
  leadsUnlocked: 5,
  repliesReceived: 2,
};

export type CreditRefundScenario = 'no_client_reply' | 'client_replied';

export const MOCK_REFUND_STATUS = {
  scenario: 'no_client_reply' as CreditRefundScenario,
  lcReturned: 3,
  labelKey: 'credits_refund.no_reply',
};
