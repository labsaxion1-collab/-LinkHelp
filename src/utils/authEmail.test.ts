import { describe, expect, it } from 'vitest';
import {
  authEmailIssueMessageKey,
  getAuthEmailIssue,
  isValidAuthEmailFormat,
  normalizeAuthEmail,
} from '@/utils/authEmail';

describe('authEmail', () => {
  it('normalizes trim + lowercase', () => {
    expect(normalizeAuthEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  it('rejects empty and invalid formats', () => {
    expect(getAuthEmailIssue('')).toBe('empty');
    expect(getAuthEmailIssue('   ')).toBe('empty');
    expect(getAuthEmailIssue('not-an-email')).toBe('invalid_format');
    expect(getAuthEmailIssue('a@b')).toBe('invalid_format');
    expect(isValidAuthEmailFormat('ok@domain.com')).toBe(true);
  });

  it('flags known domain typos before Auth', () => {
    expect(getAuthEmailIssue('test@linkhep.com')).toBe('suspicious_domain');
    expect(authEmailIssueMessageKey('suspicious_domain')).toBe('auth.errors.email_domain_typo');
    expect(getAuthEmailIssue('test@linkhelp.app')).toBeNull();
  });
});
