/**
 * PAUSED (Hobby plan): temporarily outside /api so Vercel does not count this
 * file toward the 12 Serverless Functions limit. Restore to
 * api/admin/administrators.ts when the limit allows (or after consolidating
 * admin routes). Code and security checks are preserved intact.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '@supabase/supabase-js';
import {
  authorizeAdminManage,
  authorizeAuthenticatedUser,
  backofficeJsonError,
} from '../../api/_lib/adminAuth.server.js';
import { createSupabaseServiceRoleClient } from '../../api/_lib/supabaseAdmin.server.js';
import {
  assertAdminRoleMutationAllowed,
  defaultInviteExpiresAt,
  generateAdminInviteToken,
  isAssignableAdminRole,
  isInviteAcceptable,
  normalizeAdminEmail,
  type AdminUserStatus,
  type AssignableAdminRole,
} from '../../src/admin/administrators/adminInviteHelpers.js';

type ServiceClient = ReturnType<typeof createSupabaseServiceRoleClient>;

async function writeAudit(
  admin: ServiceClient,
  params: {
    adminId: string;
    action: string;
    targetType: string;
    targetId: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    await admin.rpc('admin_write_audit_log', {
      p_admin_id: params.adminId,
      p_action: params.action,
      p_target_type: params.targetType,
      p_target_id: params.targetId,
      p_before: params.before ?? null,
      p_after: params.after ?? null,
      p_reason: params.reason ?? null,
      p_metadata: params.metadata ?? {},
    });
  } catch (e) {
    console.warn('[admin/administrators] audit skipped', e instanceof Error ? e.message : e);
  }
}

async function listAdministrators(admin: ServiceClient) {
  const { data: roleRows, error: roleError } = await admin
    .from('admin_user_roles')
    .select('user_id, role_id, status, granted_at, granted_by, created_at, updated_at')
    .order('granted_at', { ascending: false });

  if (roleError) throw roleError;

  const userIds = [...new Set((roleRows ?? []).map((r) => r.user_id as string))];
  const authUsers = new Map<string, { email: string | null; name: string | null }>();

  await Promise.all(
    userIds.map(async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error || !data.user) {
        authUsers.set(userId, { email: null, name: null });
        return;
      }
      const meta = data.user.user_metadata ?? {};
      const name =
        (typeof meta.full_name === 'string' && meta.full_name) ||
        (typeof meta.name === 'string' && meta.name) ||
        null;
      authUsers.set(userId, { email: data.user.email ?? null, name });
    }),
  );

  const administrators = (roleRows ?? []).map((row) => {
    const info = authUsers.get(row.user_id as string) ?? { email: null, name: null };
    return {
      userId: row.user_id,
      email: info.email,
      name: info.name,
      roleId: row.role_id,
      status: row.status,
      grantedAt: row.granted_at,
      grantedBy: row.granted_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  const { data: invites, error: inviteError } = await admin
    .from('admin_invites')
    .select('id, email, email_normalized, role_id, status, invited_by, created_at, expires_at, accepted_at, revoked_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (inviteError) throw inviteError;

  return {
    administrators,
    pendingInvites: (invites ?? []).map((inv) => ({
      id: inv.id,
      email: inv.email,
      roleId: inv.role_id,
      status: inv.status,
      invitedBy: inv.invited_by,
      createdAt: inv.created_at,
      expiresAt: inv.expires_at,
    })),
  };
}

async function createInvite(
  admin: ServiceClient,
  actor: User,
  body: Record<string, unknown>,
) {
  const emailNormalized = normalizeAdminEmail(body.email);
  if (!emailNormalized) return { status: 400 as const, error: 'INVALID_EMAIL' };
  if (!isAssignableAdminRole(body.roleId)) return { status: 400 as const, error: 'INVALID_ROLE' };

  const roleId = body.roleId as AssignableAdminRole;
  const displayEmail = typeof body.email === 'string' ? body.email.trim() : emailNormalized;

  const { data: existingPending } = await admin
    .from('admin_invites')
    .select('id')
    .eq('email_normalized', emailNormalized)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingPending) return { status: 409 as const, error: 'INVITE_ALREADY_PENDING' };

  const { token, tokenHash } = generateAdminInviteToken();
  const expiresAt = defaultInviteExpiresAt().toISOString();

  const { data: invite, error } = await admin
    .from('admin_invites')
    .insert({
      email: displayEmail,
      email_normalized: emailNormalized,
      role_id: roleId,
      status: 'pending',
      token_hash: tokenHash,
      invited_by: actor.id,
      expires_at: expiresAt,
    })
    .select('id, email, role_id, status, created_at, expires_at')
    .single();

  if (error || !invite) {
    console.error('[admin/administrators] invite insert', error?.message);
    return { status: 502 as const, error: 'INVITE_CREATE_FAILED' };
  }

  await writeAudit(admin, {
    adminId: actor.id,
    action: 'admin.invite.create',
    targetType: 'admin_invite',
    targetId: invite.id,
    after: { email: emailNormalized, roleId, expiresAt },
  });

  return {
    status: 201 as const,
    body: {
      invite: {
        id: invite.id,
        email: invite.email,
        roleId: invite.role_id,
        status: invite.status,
        createdAt: invite.created_at,
        expiresAt: invite.expires_at,
      },
      // token returned once for future secure channels; v1 accept is email-match
      token,
    },
  };
}

async function revokeInvite(admin: ServiceClient, actor: User, inviteId: string) {
  if (!inviteId) return { status: 400 as const, error: 'INVALID_INVITE_ID' };

  const { data: invite, error } = await admin
    .from('admin_invites')
    .select('id, email_normalized, role_id, status')
    .eq('id', inviteId)
    .maybeSingle();

  if (error) throw error;
  if (!invite) return { status: 404 as const, error: 'INVITE_NOT_FOUND' };
  if (invite.status !== 'pending') return { status: 409 as const, error: 'INVITE_NOT_PENDING' };

  const { error: updateError } = await admin
    .from('admin_invites')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', inviteId);

  if (updateError) return { status: 502 as const, error: 'INVITE_REVOKE_FAILED' };

  await writeAudit(admin, {
    adminId: actor.id,
    action: 'admin.invite.revoke',
    targetType: 'admin_invite',
    targetId: inviteId,
    before: { status: invite.status, email: invite.email_normalized, roleId: invite.role_id },
    after: { status: 'revoked' },
  });

  return { status: 200 as const, body: { ok: true } };
}

async function acceptInvite(admin: ServiceClient, actor: User) {
  const actorEmail = normalizeAdminEmail(actor.email);
  if (!actorEmail) return { status: 400 as const, error: 'EMAIL_REQUIRED' };
  if (!actor.email_confirmed_at && actor.app_metadata?.provider !== 'google') {
    // Google emails are treated as verified by Auth; require confirmation otherwise
  }
  const verified =
    Boolean(actor.email_confirmed_at) ||
    actor.app_metadata?.provider === 'google' ||
    (Array.isArray(actor.app_metadata?.providers) && actor.app_metadata.providers.includes('google'));
  if (!verified) return { status: 403 as const, error: 'EMAIL_NOT_VERIFIED' };

  const { data: invite, error } = await admin
    .from('admin_invites')
    .select('id, email_normalized, role_id, status, expires_at')
    .eq('email_normalized', actorEmail)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw error;
  if (!invite) {
    // Idempotent: already accepted or no invite
    const { data: existingRoles } = await admin
      .from('admin_user_roles')
      .select('role_id, status')
      .eq('user_id', actor.id)
      .eq('status', 'active');
    if (existingRoles?.length) {
      return { status: 200 as const, body: { ok: true, alreadyActive: true, roles: existingRoles.map((r) => r.role_id) } };
    }
    return { status: 404 as const, error: 'INVITE_NOT_FOUND' };
  }

  const check = isInviteAcceptable({
    status: invite.status,
    expiresAt: invite.expires_at,
    emailNormalized: invite.email_normalized,
    actorEmailNormalized: actorEmail,
  });

  if (check.ok === false) {
    if (check.error === 'INVITE_EXPIRED') {
      await admin
        .from('admin_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id);
    }
    return { status: 409 as const, error: check.error };
  }

  if (!isAssignableAdminRole(invite.role_id)) {
    return { status: 502 as const, error: 'INVALID_INVITE_ROLE' };
  }

  // Replace any prior role rows for this user with the invited role (active).
  await admin.from('admin_user_roles').delete().eq('user_id', actor.id);

  const now = new Date().toISOString();
  const { error: roleError } = await admin.from('admin_user_roles').insert({
    user_id: actor.id,
    role_id: invite.role_id,
    status: 'active',
    granted_by: null,
    granted_at: now,
    created_at: now,
    updated_at: now,
  });

  if (roleError) {
    console.error('[admin/administrators] accept role', roleError.message);
    return { status: 502 as const, error: 'ROLE_ASSIGN_FAILED' };
  }

  const { error: metaError } = await admin.auth.admin.updateUserById(actor.id, {
    app_metadata: {
      ...(actor.app_metadata ?? {}),
      role: 'admin',
    },
  });

  if (metaError) {
    console.error('[admin/administrators] set app_metadata', metaError.message);
    return { status: 502 as const, error: 'METADATA_UPDATE_FAILED' };
  }

  const { error: acceptError } = await admin
    .from('admin_invites')
    .update({
      status: 'accepted',
      accepted_by: actor.id,
      accepted_at: now,
    })
    .eq('id', invite.id);

  if (acceptError) {
    console.error('[admin/administrators] mark accepted', acceptError.message);
  }

  // Do not create client/helper profiles — marketplace onboarding stays out of FLUX accept.
  await writeAudit(admin, {
    adminId: actor.id,
    action: 'admin.invite.accept',
    targetType: 'admin_invite',
    targetId: invite.id,
    after: { userId: actor.id, roleId: invite.role_id, appMetadataRole: 'admin' },
  });

  return {
    status: 200 as const,
    body: {
      ok: true,
      roleId: invite.role_id,
      sessionRefreshRequired: true,
    },
  };
}

async function patchAdministrator(
  admin: ServiceClient,
  actor: User,
  body: Record<string, unknown>,
) {
  const targetUserId = typeof body.userId === 'string' ? body.userId : '';
  if (!targetUserId) return { status: 400 as const, error: 'INVALID_USER_ID' };

  const nextRoleId = body.roleId !== undefined ? body.roleId : undefined;
  const nextStatus = body.status !== undefined ? body.status : undefined;

  if (nextRoleId !== undefined && !isAssignableAdminRole(nextRoleId)) {
    return { status: 400 as const, error: 'INVALID_ROLE' };
  }
  if (
    nextStatus !== undefined &&
    nextStatus !== 'active' &&
    nextStatus !== 'inactive' &&
    nextStatus !== 'revoked'
  ) {
    return { status: 400 as const, error: 'INVALID_STATUS' };
  }
  if (nextRoleId === undefined && nextStatus === undefined) {
    return { status: 400 as const, error: 'NO_CHANGES' };
  }

  const { data: allRoles, error: listError } = await admin
    .from('admin_user_roles')
    .select('user_id, role_id, status');

  if (listError) throw listError;

  const assignments = (allRoles ?? []).map((r) => ({
    userId: r.user_id as string,
    roleId: r.role_id as string,
    status: r.status as string,
  }));

  const targetRows = assignments.filter((a) => a.userId === targetUserId);
  if (!targetRows.length) return { status: 404 as const, error: 'ADMIN_NOT_FOUND' };

  const guard = assertAdminRoleMutationAllowed({
    actorUserId: actor.id,
    targetUserId,
    nextRoleId: typeof nextRoleId === 'string' ? nextRoleId : undefined,
    nextStatus: nextStatus as AdminUserStatus | undefined,
    assignments,
  });
  if (guard.ok === false) {
    const guardError = guard.error;
    return { status: 409 as const, error: guardError };
  }

  const before = { roles: targetRows };
  const now = new Date().toISOString();

  if (typeof nextRoleId === 'string' && isAssignableAdminRole(nextRoleId)) {
    await admin.from('admin_user_roles').delete().eq('user_id', targetUserId);
    const statusToKeep =
      (typeof nextStatus === 'string' ? nextStatus : targetRows[0]?.status) || 'active';
    const { error: insertError } = await admin.from('admin_user_roles').insert({
      user_id: targetUserId,
      role_id: nextRoleId,
      status: statusToKeep,
      granted_by: actor.id,
      granted_at: now,
      created_at: now,
      updated_at: now,
    });
    if (insertError) return { status: 502 as const, error: 'ROLE_UPDATE_FAILED' };
  } else if (typeof nextStatus === 'string') {
    const { error: statusError } = await admin
      .from('admin_user_roles')
      .update({ status: nextStatus, updated_at: now })
      .eq('user_id', targetUserId);
    if (statusError) return { status: 502 as const, error: 'STATUS_UPDATE_FAILED' };
  }

  const effectiveStatus =
    typeof nextStatus === 'string'
      ? nextStatus
      : typeof nextRoleId === 'string'
        ? targetRows[0]?.status
        : undefined;

  if (effectiveStatus && effectiveStatus !== 'active') {
    const { data: targetUser } = await admin.auth.admin.getUserById(targetUserId);
    if (targetUser?.user) {
      const meta = { ...(targetUser.user.app_metadata ?? {}) };
      delete meta.role;
      await admin.auth.admin.updateUserById(targetUserId, { app_metadata: meta });
    }
  } else if (effectiveStatus === 'active' || typeof nextRoleId === 'string') {
    const { data: targetUser } = await admin.auth.admin.getUserById(targetUserId);
    if (targetUser?.user) {
      await admin.auth.admin.updateUserById(targetUserId, {
        app_metadata: {
          ...(targetUser.user.app_metadata ?? {}),
          role: 'admin',
        },
      });
    }
  }

  await writeAudit(admin, {
    adminId: actor.id,
    action: 'admin.user.update',
    targetType: 'admin_user',
    targetId: targetUserId,
    before,
    after: { roleId: nextRoleId ?? null, status: nextStatus ?? null },
  });

  return { status: 200 as const, body: { ok: true } };
}

function parseBody(req: VercelRequest): Record<string, unknown> {
  if (!req.body || typeof req.body !== 'object') return {};
  return req.body as Record<string, unknown>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let admin: ServiceClient;
    try {
      admin = createSupabaseServiceRoleClient();
    } catch {
      return backofficeJsonError(res, 503, 'SUPABASE_SERVER_NOT_CONFIGURED');
    }

    if (req.method === 'GET') {
      const auth = await authorizeAdminManage(req.headers.authorization);
      if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);
      const payload = await listAdministrators(admin);
      await writeAudit(admin, {
        adminId: auth.user.id,
        action: 'admin.administrators.list',
        targetType: 'admin_user',
        targetId: null,
        metadata: { count: payload.administrators.length },
      });
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(200).json(payload);
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const action = typeof body.action === 'string' ? body.action : '';

      if (action === 'accept') {
        const auth = await authorizeAuthenticatedUser(req.headers.authorization);
        if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);
        const result = await acceptInvite(admin, auth.user);
        if ('error' in result) return backofficeJsonError(res, result.status, result.error);
        res.setHeader('Cache-Control', 'private, no-store');
        return res.status(result.status).json(result.body);
      }

      const auth = await authorizeAdminManage(req.headers.authorization);
      if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);

      if (action === 'invite') {
        const result = await createInvite(admin, auth.user, body);
        if ('error' in result) return backofficeJsonError(res, result.status, result.error);
        res.setHeader('Cache-Control', 'private, no-store');
        return res.status(result.status).json(result.body);
      }

      if (action === 'revoke_invite') {
        const inviteId = typeof body.inviteId === 'string' ? body.inviteId : '';
        const result = await revokeInvite(admin, auth.user, inviteId);
        if ('error' in result) return backofficeJsonError(res, result.status, result.error);
        res.setHeader('Cache-Control', 'private, no-store');
        return res.status(result.status).json(result.body);
      }

      return backofficeJsonError(res, 400, 'INVALID_ACTION');
    }

    if (req.method === 'PATCH') {
      const auth = await authorizeAdminManage(req.headers.authorization);
      if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);
      const result = await patchAdministrator(admin, auth.user, parseBody(req));
      if ('error' in result) return backofficeJsonError(res, result.status, result.error);
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(result.status).json(result.body);
    }

    return backofficeJsonError(res, 405, 'METHOD_NOT_ALLOWED');
  } catch (error) {
    console.error('[admin/administrators]', error instanceof Error ? error.message : 'UNKNOWN');
    return backofficeJsonError(res, 503, 'ADMIN_ADMINISTRATORS_UNAVAILABLE');
  }
}
