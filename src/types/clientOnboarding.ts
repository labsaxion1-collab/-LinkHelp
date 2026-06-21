export type CompleteClientOnboardingResult = {
  granted: boolean;
  reason?: 'ALREADY_COMPLETED' | 'ALREADY_GRANTED' | string;
  rewardType?: 'CLIENT_WELCOME_30';
  amount?: number;
  balanceAfter?: number;
  completedAt?: string;
};
