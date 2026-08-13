import type { WaitlistInterestType, WaitlistTracking } from './waitlistSignup';

export type WaitlistSignupAnalytics = Pick<WaitlistTracking, 'source' | 'utm_source' | 'utm_campaign'> & {
  interest_type: WaitlistInterestType;
  city: string;
};

/** Internal, PII-free event contract for a future analytics adapter. */
export function recordWaitlistSignup(detail: WaitlistSignupAnalytics): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<WaitlistSignupAnalytics>('waitlist_signup', { detail }));
}
