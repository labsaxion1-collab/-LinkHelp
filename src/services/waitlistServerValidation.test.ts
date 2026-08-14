import { describe, expect, it } from 'vitest';
import { normalizeEmail, validateWaitlistInput } from '../../supabase/functions/waitlist-signup/validation';

describe('waitlist-signup server validation', () => {
  const base = {
    first_name: '  Marie   Ève ',
    email: ' MARIE@EXAMPLE.COM ',
    city: ' Québec ',
    interest_type: 'both',
    marketing_consent: false,
  };

  it('normalizes case and text before persistence', () => {
    expect(normalizeEmail(base.email)).toBe('marie@example.com');
    const result = validateWaitlistInput(base);
    expect(result.ok && result.value.first_name).toBe('Marie Ève');
    expect(result.ok && result.value.email).toBe('marie@example.com');
  });

  it.each(['client', 'helper', 'both'])('accepts interest %s', (interest_type) => {
    expect(validateWaitlistInput({ ...base, interest_type }).ok).toBe(true);
  });

  it('rejects invalid email, empty name and unsupported interest', () => {
    expect(validateWaitlistInput({ ...base, email: 'invalid' }).ok).toBe(false);
    expect(validateWaitlistInput({ ...base, first_name: '' }).ok).toBe(false);
    expect(validateWaitlistInput({ ...base, interest_type: 'admin' }).ok).toBe(false);
  });

  it('accepts enrollment with or without marketing consent', () => {
    const without = validateWaitlistInput({ ...base, marketing_consent: false });
    const withConsent = validateWaitlistInput({ ...base, marketing_consent: true });
    expect(without.ok && without.value.marketing_consent).toBe(false);
    expect(withConsent.ok && withConsent.value.marketing_consent).toBe(true);
  });

  it('detects the invisible honeypot', () => {
    expect(validateWaitlistInput({ ...base, website: 'https://spam.example' })).toEqual({
      ok: false,
      code: 'BOT_DETECTED',
    });
  });
});
