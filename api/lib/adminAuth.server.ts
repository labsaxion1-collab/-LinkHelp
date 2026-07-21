import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseAuthVerifier, createSupabaseServiceRoleClient } from './supabaseAdmin.server.js';
import {
  isFluxAdminAppMetadata,
  isLegacyFluxAdminRole,
  roleGrantsPermission,
  type BackofficePermission,
  type BackofficeRoleId,
} from '../../src/backoffice/permissions/roles.js';

export type AdminAuthorization =
  | { ok: true; user: User }
  | { ok: false; status: 401 | 403; error: 'UNAUTHORIZED' | 'FORBIDDEN' };

export type BackofficeAuthorization =
  | { ok: true; user: User; roles: BackofficeRoleId[]; permissions: BackofficePermission[] }
  | { ok: false; status: 401 | 403 | 503; error: 'UNAUTHORIZED' | 'FORBIDDEN' | 'BACKOFFICE_NOT_CONFIGURED' };

export function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function authorizeAdmin(
  authorizationHeader: string | undefined,
  verifier: Pick<SupabaseClient, 'auth'> = createSupabaseAuthVerifier(),
): Promise<AdminAuthorization> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) return { ok: false, status: 401, error: 'UNAUTHORIZED' };
  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: 'UNAUTHORIZED' };
  if (!isFluxAdminAppMetadata(data.user.app_metadata?.role)) {
    return { ok: false, status: 403, error: 'FORBIDDEN' };
  }
  return { ok: true, user: data.user };
}

async function resolveAdminRoles(userId: string): Promise<BackofficeRoleId[]> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from('admin_user_roles')
    .select('role_id')
    .eq('user_id', userId);

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }

  return (data ?? [])
    .map((row) => row.role_id as BackofficeRoleId)
    .filter(Boolean);
}

function permissionsForRoles(roles: BackofficeRoleId[]): BackofficePermission[] {
  const set = new Set<BackofficePermission>();
  for (const role of roles) {
    if (role === 'super_admin') {
      return [
        'dashboard.read',
        'users.read',
        'requests.read',
        'credits.read',
        'economy.read',
        'audit.read',
        'support.view',
        'users.write',
        'credits.write',
        'requests.write',
        'economy.write',
      ];
    }
    for (const perm of [
      'dashboard.read',
      'users.read',
      'requests.read',
      'credits.read',
      'economy.read',
      'audit.read',
      'support.view',
      'users.write',
      'credits.write',
      'requests.write',
      'economy.write',
    ] as BackofficePermission[]) {
      if (roleGrantsPermission(role, perm)) set.add(perm);
    }
  }
  return [...set];
}

export async function authorizeBackoffice(
  authorizationHeader: string | undefined,
  requiredPermission?: BackofficePermission,
): Promise<BackofficeAuthorization> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) return { ok: false, status: 401, error: 'UNAUTHORIZED' };

  const verifier = createSupabaseAuthVerifier();
  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: 'UNAUTHORIZED' };

  const appRole = data.user.app_metadata?.role;
  if (!isLegacyFluxAdminRole(appRole)) {
    return { ok: false, status: 403, error: 'FORBIDDEN' };
  }

  let roles: BackofficeRoleId[] = [];
  try {
    roles = await resolveAdminRoles(data.user.id);
  } catch {
    return { ok: false, status: 503, error: 'BACKOFFICE_NOT_CONFIGURED' };
  }

  if (!roles.length && isLegacyFluxAdminRole(appRole)) {
    roles = ['super_admin'];
  }

  const permissions = permissionsForRoles(roles);

  if (requiredPermission && !permissions.includes(requiredPermission)) {
    return { ok: false, status: 403, error: 'FORBIDDEN' };
  }

  return { ok: true, user: data.user, roles, permissions };
}

export function backofficeJsonError(res: VercelResponse, status: number, error: string) {
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(status).json({ error });
}

export async function logBackofficeRead(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const admin = createSupabaseServiceRoleClient();
    await admin.rpc('admin_write_audit_log', {
      p_admin_id: adminId,
      p_action: action,
      p_target_type: targetType,
      p_target_id: targetId,
      p_metadata: metadata ?? {},
    });
  } catch (e) {
    console.warn('[backoffice] audit log skipped', e instanceof Error ? e.message : e);
  }
}

export function parseLimitOffset(req: VercelRequest, defaultLimit = 50): { limit: number; offset: number } {
  const limitRaw = Number(req.query?.limit ?? defaultLimit);
  const offsetRaw = Number(req.query?.offset ?? 0);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 100) : defaultLimit;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
  return { limit, offset };
}
