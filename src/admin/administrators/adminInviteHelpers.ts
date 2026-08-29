import { createHash, randomBytes } from 'node:crypto';

export const ASSIGNABLE_ADMIN_ROLES = ['super_admin', 'operations_admin'] as const;
export type AssignableAdminRole = (typeof ASSIGNABLE_ADMIN_ROLES)[number];

export const ADMIN_INVITE_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;
export type AdminInviteStatus = (typeof ADMIN_INVITE_STATUSES)[number];

export const ADMIN_USER_STATUSES = ['active', 'inactive', 'revoked'] as const;
export type AdminUserStatus = (typeof ADMIN_USER_STATUSES)[number];

export const ADMINS_MANAGE_PERMISSION = 'admins.manage' as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAdminEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized || !EMAIL_RE.test(normalized)) return null;
  return normalized;
}

export function isAssignableAdminRole(role: unknown): role is AssignableAdminRole {
  return typeof role === 'string' && (ASSIGNABLE_ADMIN_ROLES as readonly string[]).includes(role);
}

export function generateAdminInviteToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, tokenHash: hashAdminInviteToken(token) };
}

export function hashAdminInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function defaultInviteExpiresAt(now = new Date(), days = 7): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isInviteAcceptable(params: {
  status: string;
  expiresAt: string | Date;
  emailNormalized: string;
  actorEmailNormalized: string | null;
  now?: Date;
}): { ok: true } | { ok: false; error: 'INVITE_NOT_PENDING' | 'INVITE_EXPIRED' | 'EMAIL_MISMATCH' } {
  const now = params.now ?? new Date();
  if (params.status !== 'pending') return { ok: false, error: 'INVITE_NOT_PENDING' };
  const expires = params.expiresAt instanceof Date ? params.expiresAt : new Date(params.expiresAt);
  if (Number.isNaN(expires.getTime()) || expires.getTime() <= now.getTime()) {
    return { ok: false, error: 'INVITE_EXPIRED' };
  }
  if (!params.actorEmailNormalized || params.actorEmailNormalized !== params.emailNormalized) {
    return { ok: false, error: 'EMAIL_MISMATCH' };
  }
  return { ok: true };
}

export type AdminRoleAssignment = {
  userId: string;
  roleId: string;
  status: string;
};

/**
 * Blocks demoting/deactivating/revoking the last active super_admin,
 * and blocks self-removal of manage access.
 */
export function assertAdminRoleMutationAllowed(params: {
  actorUserId: string;
  targetUserId: string;
  nextRoleId?: string;
  nextStatus?: AdminUserStatus;
  assignments: AdminRoleAssignment[];
}): { ok: true } | { ok: false; error: 'LAST_SUPER_ADMIN' | 'SELF_REMOVAL_FORBIDDEN' } {
  const { actorUserId, targetUserId, nextRoleId, nextStatus, assignments } = params;
  const targetActive = assignments.filter((a) => a.userId === targetUserId && a.status === 'active');
  const targetIsActiveSuper = targetActive.some((a) => a.roleId === 'super_admin');
  const activeSupers = assignments.filter((a) => a.roleId === 'super_admin' && a.status === 'active');

  const removingSuperAccess =
    targetIsActiveSuper &&
    ((nextStatus && nextStatus !== 'active') ||
      (nextRoleId !== undefined && nextRoleId !== 'super_admin'));

  if (removingSuperAccess && activeSupers.length <= 1) {
    return { ok: false, error: 'LAST_SUPER_ADMIN' };
  }

  const selfRemoval =
    actorUserId === targetUserId &&
    ((nextStatus !== undefined && nextStatus !== 'active') ||
      (nextRoleId !== undefined && targetIsActiveSuper && nextRoleId !== 'super_admin'));

  if (selfRemoval) {
    return { ok: false, error: 'SELF_REMOVAL_FORBIDDEN' };
  }

  return { ok: true };
}

export function adminRoleLabelPt(roleId: string): string {
  if (roleId === 'super_admin') return 'Superadministrador';
  if (roleId === 'operations_admin') return 'Administrador';
  return roleId;
}

export function adminStatusLabelPt(status: string): string {
  if (status === 'active') return 'Ativo';
  if (status === 'inactive') return 'Inativo';
  if (status === 'revoked') return 'Revogado';
  if (status === 'pending') return 'Pendente';
  if (status === 'accepted') return 'Aceito';
  if (status === 'expired') return 'Expirado';
  return status;
}
