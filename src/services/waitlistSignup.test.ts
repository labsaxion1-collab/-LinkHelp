import { describe, expect, it } from 'vitest';
import {
  isValidWaitlistEmail,
  normalizeWaitlistEmail,
  normalizeWaitlistText,
  readWaitlistTracking,
  validateWaitlistPayload,
  type WaitlistPayload,
} from './waitlistSignup';

const validPayload: WaitlistPayload = {
  first_name: 'Maxime',
  email: 'maxime@example.com',
  city: 'Montréal',
  interest_type: 'client',
  marketing_consent: false,
  locale: 'fr-CA',
  website: '',
  source: 'landing_page',
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
};

describe('waitlist signup client contract', () => {
  it('normalizes case, whitespace and long text', () => {
    expect(normalizeWaitlistEmail('  MAX@EXAMPLE.COM ')).toBe('max@example.com');
    expect(normalizeWaitlistText('  Jean   Paul  ', 20)).toBe('Jean Paul');
    expect(normalizeWaitlistText('abcdef', 3)).toBe('abc');
  });

  it('rejects invalid email and missing required fields', () => {
    expect(isValidWaitlistEmail('invalid')).toBe(false);
    expect(validateWaitlistPayload({ ...validPayload, email: 'invalid' })).toBe(false);
    expect(validateWaitlistPayload({ ...validPayload, first_name: '' })).toBe(false);
    expect(validateWaitlistPayload({ ...validPayload, city: '' })).toBe(false);
  });

  it.each(['client', 'helper', 'both'] as const)('accepts interest %s with either consent value', (interest_type) => {
    expect(validateWaitlistPayload({ ...validPayload, interest_type, marketing_consent: true })).toBe(true);
    expect(validateWaitlistPayload({ ...validPayload, interest_type, marketing_consent: false })).toBe(true);
  });

  it('captures every supported UTM without email or other PII', () => {
    expect(readWaitlistTracking('?utm_source=instagram&utm_medium=social&utm_campaign=launch&utm_content=video&utm_term=aide')).toEqual({
      source: 'landing_page',
      utm_source: 'instagram',
      utm_medium: 'social',
      utm_campaign: 'launch',
      utm_content: 'video',
      utm_term: 'aide',
    });
  });
});
