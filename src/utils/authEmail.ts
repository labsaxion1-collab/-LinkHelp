/**
 * Normalize + validate auth emails before Supabase Auth calls.
 * Keeps signup/login payloads consistent (trim + lowercase) and surfaces
 * clear FE errors for typos like `@linkhep.com` without calling Auth.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Common mistypes of known domains — do not call Auth until corrected. */
const SUSPICIOUS_DOMAIN_TYPOS: ReadonlySet<string> = new Set([
  'linkhep.com',
  'linkhel.com',
  'linhelp.com',
  'linkhelp.co',
  'gmial.com',
  'gmal.com',
  'gnail.com',
  'hotmal.com',
  'outlok.com',
]);

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidAuthEmailFormat(email: string): boolean {
  return EMAIL_RE.test(normalizeAuthEmail(email));
}

export function authEmailDomain(email: string): string {
  const normalized = normalizeAuthEmail(email);
  const at = normalized.lastIndexOf('@');
  if (at < 0) return '';
  return normalized.slice(at + 1);
}

export type AuthEmailIssue = 'empty' | 'invalid_format' | 'suspicious_domain';

export function getAuthEmailIssue(email: string): AuthEmailIssue | null {
  const normalized = normalizeAuthEmail(email);
  if (!normalized) return 'empty';
  if (!EMAIL_RE.test(normalized)) return 'invalid_format';
  const domain = authEmailDomain(normalized);
  if (SUSPICIOUS_DOMAIN_TYPOS.has(domain)) return 'suspicious_domain';
  return null;
}

export function authEmailIssueMessageKey(issue: AuthEmailIssue): string {
  switch (issue) {
    case 'empty':
      return 'auth.errors.email_required';
    case 'invalid_format':
      return 'auth.errors.email_invalid_format';
    case 'suspicious_domain':
      return 'auth.errors.email_domain_typo';
  }
}
