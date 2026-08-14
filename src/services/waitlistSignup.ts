import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export const WAITLIST_INTEREST_TYPES = ['client', 'helper', 'both'] as const;
export type WaitlistInterestType = (typeof WAITLIST_INTEREST_TYPES)[number];
export type WaitlistTracking = {
  source: 'landing_page';
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
};

export type WaitlistPayload = WaitlistTracking & {
  first_name: string;
  email: string;
  city: string;
  interest_type: WaitlistInterestType;
  marketing_consent: boolean;
  locale: 'fr-CA';
  website: string;
};

export type WaitlistResult = { status: 'created' | 'already_registered' };

export function normalizeWaitlistEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeWaitlistText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function isValidWaitlistEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function readWaitlistTracking(search = window.location.search): WaitlistTracking {
  const params = new URLSearchParams(search);
  const read = (key: string, maxLength: number) => {
    const value = normalizeWaitlistText(params.get(key) ?? '', maxLength);
    return value || null;
  };
  return {
    source: 'landing_page',
    utm_source: read('utm_source', 160),
    utm_medium: read('utm_medium', 160),
    utm_campaign: read('utm_campaign', 200),
    utm_content: read('utm_content', 200),
    utm_term: read('utm_term', 200),
  };
}

export function validateWaitlistPayload(payload: WaitlistPayload): boolean {
  return Boolean(
    payload.first_name
    && payload.city
    && isValidWaitlistEmail(payload.email)
    && WAITLIST_INTEREST_TYPES.includes(payload.interest_type),
  );
}

export async function submitWaitlistSignup(payload: WaitlistPayload): Promise<WaitlistResult> {
  if (!isSupabaseConfigured()) throw new Error('WAITLIST_UNAVAILABLE');
  const supabase = getSupabase();
  if (!supabase) throw new Error('WAITLIST_UNAVAILABLE');

  const { data, error } = await supabase.functions.invoke<WaitlistResult>('waitlist-signup', {
    body: payload,
  });
  if (error || !data || !['created', 'already_registered'].includes(data.status)) {
    throw new Error('WAITLIST_REQUEST_FAILED');
  }
  return data;
}
