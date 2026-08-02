import { describe, expect, it } from 'vitest';
import {
  assertAdminRoleMutationAllowed,
  generateAdminInviteToken,
  hashAdminInviteToken,
  isAssignableAdminRole,
  isInviteAcceptable,
  normalizeAdminEmail,
} from './adminInviteHelpers';

describe('adminInviteHelpers', () => {
  it('normalizes and validates emails', () => {
    expect(normalizeAdminEmail('  Ada@LinkHelp.app ')).toBe('ada@linkhelp.app');
    expect(normalizeAdminEmail('not-an-email')).toBeNull();
    expect(normalizeAdminEmail(null)).toBeNull();
  });

  it('accepts only assignable admin roles', () => {
    expect(isAssignableAdminRole('super_admin')).toBe(true);
    expect(isAssignableAdminRole('operations_admin')).toBe(true);
    expect(isAssignableAdminRole('finance_admin')).toBe(false);
  });

  it('hashes invite tokens (never store plain token)', () => {
    const { token, tokenHash } = generateAdminInviteToken();
    expect(token).toHaveLength(64);
    expect(tokenHash).toBe(hashAdminInviteToken(token));
    expect(tokenHash).not.toBe(token);
  });

  it('validates invite acceptance by email and expiry', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(
      isInviteAcceptable({
        status: 'pending',
        expiresAt: future,
        emailNormalized: 'a@b.com',
        actorEmailNormalized: 'a@b.com',
      }).ok,
    ).toBe(true);
    expect(
      isInviteAcceptable({
        status: 'accepted',
        expiresAt: future,
        emailNormalized: 'a@b.com',
        actorEmailNormalized: 'a@b.com',
      }),
    ).toEqual({ ok: false, error: 'INVITE_NOT_PENDING' });
    expect(
      isInviteAcceptable({
        status: 'pending',
        expiresAt: past,
        emailNormalized: 'a@b.com',
        actorEmailNormalized: 'a@b.com',
      }),
    ).toEqual({ ok: false, error: 'INVITE_EXPIRED' });
    expect(
      isInviteAcceptable({
        status: 'pending',
        expiresAt: future,
        emailNormalized: 'a@b.com',
        actorEmailNormalized: 'other@b.com',
      }),
    ).toEqual({ ok: false, error: 'EMAIL_MISMATCH' });
  });

  it('blocks last super_admin demotion and self-removal', () => {
    const assignments = [
      { userId: 'super-1', roleId: 'super_admin', status: 'active' },
      { userId: 'ops-1', roleId: 'operations_admin', status: 'active' },
    ];
    expect(
      assertAdminRoleMutationAllowed({
        actorUserId: 'super-1',
        targetUserId: 'super-1',
        nextStatus: 'inactive',
        assignments,
      }),
    ).toEqual({ ok: false, error: 'LAST_SUPER_ADMIN' });

    expect(
      assertAdminRoleMutationAllowed({
        actorUserId: 'super-1',
        targetUserId: 'super-1',
        nextRoleId: 'operations_admin',
        assignments: [
          ...assignments,
          { userId: 'super-2', roleId: 'super_admin', status: 'active' },
        ],
      }),
    ).toEqual({ ok: false, error: 'SELF_REMOVAL_FORBIDDEN' });

    expect(
      assertAdminRoleMutationAllowed({
        actorUserId: 'super-1',
        targetUserId: 'ops-1',
        nextStatus: 'inactive',
        assignments,
      }).ok,
    ).toBe(true);
  });
});
