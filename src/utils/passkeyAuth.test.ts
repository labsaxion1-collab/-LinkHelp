import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isWebAuthnSupported, passkeyErrorMessageKey } from '@/utils/passkeyAuth';

describe('passkeyAuth helpers', () => {
  it('maps error codes to i18n keys without exposing secrets', () => {
    expect(passkeyErrorMessageKey('unsupported')).toContain('unsupported');
    expect(passkeyErrorMessageKey('cancelled')).toContain('cancelled');
    expect(passkeyErrorMessageKey('disabled')).toContain('disabled_server');
    expect(passkeyErrorMessageKey('error')).toContain('error');
  });

  it('does not claim WebAuthn support in node test env', () => {
    expect(isWebAuthnSupported()).toBe(false);
  });

  it('enables experimental passkey flag on the browser supabase client', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/lib/supabase.ts'), 'utf8');
    expect(src).toContain('experimental');
    expect(src).toContain('passkey: true');
    expect(src).not.toMatch(/service_role|SUPABASE_SERVICE/);
  });

  it('keeps passkey management client-side via official auth API only', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/utils/passkeyAuth.ts'), 'utf8');
    expect(src).toContain('registerPasskey');
    expect(src).toContain('signInWithPasskey');
    expect(src).not.toMatch(/localStorage\.setItem\(['"]passkey/);
    expect(src).not.toMatch(/biometric|fingerprintData|faceId/);
  });
});
