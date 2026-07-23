import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@/utils/constants';
import { APP_ORIGIN } from '@/utils/linkhelpHosts';
import {
  buildPasswordRecoveryEmailRedirectUrl,
  classifyRecoveryError,
  isPasswordRecoveryPath,
  isPkceCodeVerifierError,
  recoveryErrorTranslationKey,
  sanitizePasswordRecoveryNext,
  verifyPasswordRecoveryTokenHash,
} from '@/utils/passwordRecovery';

describe('passwordRecovery', () => {
  it('redirect de e-mail usa auth/confirm no app com next seguro', () => {
    const url = buildPasswordRecoveryEmailRedirectUrl();
    expect(url).toContain('/auth/confirm');
    expect(url).toContain('type=recovery');
    expect(url).toContain(encodeURIComponent(ROUTES.resetPassword));
    expect(url.startsWith(APP_ORIGIN)).toBe(true);
  });

  it('token_hash + recovery chama verifyOtp', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });
    await verifyPasswordRecoveryTokenHash(verifyOtp, 'hash-abc');
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash-abc', type: 'recovery' });
  });

  it('sanitizePasswordRecoveryNext rejeita open redirect', () => {
    expect(sanitizePasswordRecoveryNext('/auth/reset-password')).toBe(ROUTES.resetPassword);
    expect(sanitizePasswordRecoveryNext('https://evil.test')).toBe(ROUTES.resetPassword);
    expect(sanitizePasswordRecoveryNext(null)).toBe(ROUTES.resetPassword);
  });

  it('classifica PKCE verifier ausente', () => {
    expect(isPkceCodeVerifierError('PKCE code verifier not found in storage')).toBe(true);
    expect(classifyRecoveryError(new Error('PKCE code verifier not found'))).toBe('wrong_browser');
    expect(recoveryErrorTranslationKey('wrong_browser')).toBe('auth.reset_wrong_browser');
  });

  it('isPasswordRecoveryPath cobre confirm e reset', () => {
    expect(isPasswordRecoveryPath(ROUTES.authConfirm)).toBe(true);
    expect(isPasswordRecoveryPath(ROUTES.resetPassword)).toBe(true);
    expect(isPasswordRecoveryPath(ROUTES.login)).toBe(false);
  });

  it('getAppAuthOrigin documentado para produção app', async () => {
    const src = await readFile('src/utils/passwordRecovery.ts', 'utf8');
    expect(src).toContain('APP_ORIGIN');
    expect(src).toContain('getAppAuthOrigin');
  });

  it('LoginPage usa buildPasswordRecoveryEmailRedirectUrl', async () => {
    const src = await readFile('src/pages/auth/LoginPage.tsx', 'utf8');
    expect(src).toContain('buildPasswordRecoveryEmailRedirectUrl');
  });

  it('AuthConfirmPage usa verifyOtp recovery', async () => {
    const src = await readFile('src/pages/auth/AuthConfirmPage.tsx', 'utf8');
    expect(src).toContain('verifyOtp');
    expect(src).toContain('token_hash');
  });

  it('ResetPasswordPage mapeia erro PKCE sem mensagem crua', async () => {
    const src = await readFile('src/pages/auth/ResetPasswordPage.tsx', 'utf8');
    expect(src).toContain('recoveryErrorTranslationKey');
    expect(src).not.toMatch(/setError\(err instanceof Error \? err\.message/);
  });

  it('www encaminha recovery para app via hostRouting', async () => {
    const { resolveExternalHostRedirect } = await import('@/utils/hostRouting');
    const target = resolveExternalHostRedirect('www', { pathname: ROUTES.authConfirm, search: '?x=1' });
    expect(target).toBe(`${APP_ORIGIN}${ROUTES.authConfirm}?x=1`);
  });

  it('flux encaminha recovery para app', async () => {
    const { resolveExternalHostRedirect } = await import('@/utils/hostRouting');
    const target = resolveExternalHostRedirect('flux', { pathname: ROUTES.resetPassword });
    expect(target).toBe(`${APP_ORIGIN}${ROUTES.resetPassword}`);
  });

  it('traduções PT/EN/FR para recovery', async () => {
    for (const lang of ['en', 'pt', 'fr']) {
      const src = await readFile(`src/translations/${lang}/index.ts`, 'utf8');
      expect(src).toContain('reset_wrong_browser');
      expect(src).toContain('reset_resend_link');
    }
  });
});
