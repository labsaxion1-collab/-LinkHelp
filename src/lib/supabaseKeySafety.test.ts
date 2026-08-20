import { describe, expect, it } from 'vitest';
import { isBrowserSafeSupabaseKey } from './supabaseKeySafety';

function jwtWithRole(role: string): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role })}.signature`;
}

describe('isBrowserSafeSupabaseKey', () => {
  it('accepts current publishable keys', () => {
    expect(isBrowserSafeSupabaseKey('sb_publishable_example')).toBe(true);
  });

  it('accepts legacy anon JWTs', () => {
    expect(isBrowserSafeSupabaseKey(jwtWithRole('anon'))).toBe(true);
  });

  it('rejects current secret keys', () => {
    expect(isBrowserSafeSupabaseKey('sb_secret_example')).toBe(false);
  });

  it('rejects legacy service-role JWTs', () => {
    expect(isBrowserSafeSupabaseKey(jwtWithRole('service_role'))).toBe(false);
  });

  it('rejects missing and malformed values', () => {
    expect(isBrowserSafeSupabaseKey('')).toBe(false);
    expect(isBrowserSafeSupabaseKey('not-a-supabase-key')).toBe(false);
  });
});
