export const INTEREST_TYPES = ['client', 'helper', 'both'] as const;
export type InterestType = (typeof INTEREST_TYPES)[number];

export type WaitlistInput = {
  first_name?: unknown;
  email?: unknown;
  city?: unknown;
  interest_type?: unknown;
  marketing_consent?: unknown;
  source?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  utm_term?: unknown;
  locale?: unknown;
  website?: unknown;
};

export type ValidWaitlistInput = {
  first_name: string;
  email: string;
  city: string | null;
  interest_type: InterestType;
  marketing_consent: boolean;
  source: 'landing_page';
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  locale: 'fr-CA';
  website: string;
};

export type ValidationResult =
  | { ok: true; value: ValidWaitlistInput }
  | { ok: false; code: 'INVALID_INPUT' | 'BOT_DETECTED' };

function clean(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function optional(value: unknown, maxLength: number): string | null {
  const normalized = clean(value, maxLength);
  return normalized || null;
}

export function normalizeEmail(value: unknown): string {
  return clean(value, 254).toLowerCase();
}

export function isBasicEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function validateWaitlistInput(input: WaitlistInput): ValidationResult {
  const website = clean(input.website, 200);
  if (website) return { ok: false, code: 'BOT_DETECTED' };

  const first_name = clean(input.first_name, 80);
  const email = normalizeEmail(input.email);
  const city = optional(input.city, 120);
  const interest = clean(input.interest_type, 20);

  if (!first_name || !isBasicEmail(email) || !INTEREST_TYPES.includes(interest as InterestType)) {
    return { ok: false, code: 'INVALID_INPUT' };
  }

  return {
    ok: true,
    value: {
      first_name,
      email,
      city,
      interest_type: interest as InterestType,
      marketing_consent: input.marketing_consent === true,
      source: 'landing_page',
      utm_source: optional(input.utm_source, 160),
      utm_medium: optional(input.utm_medium, 160),
      utm_campaign: optional(input.utm_campaign, 200),
      utm_content: optional(input.utm_content, 200),
      utm_term: optional(input.utm_term, 200),
      locale: 'fr-CA',
      website,
    },
  };
}
