import { getSupabase } from '@/lib/supabase';

export type AcceptAdminInviteResult =
  | { ok: true; sessionRefreshRequired: boolean; alreadyActive?: boolean }
  | { ok: false; error: string; status: number };

/**
 * Idempotent invite accept for FLUX login. Call with a fresh access token;
 * on success, refresh the Auth session so JWT app_metadata.role becomes admin.
 */
export async function acceptAdminInvite(accessToken: string): Promise<AcceptAdminInviteResult> {
  const response = await fetch('/api/admin/administrators', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'accept' }),
  });

  if (response.status === 404) {
    return { ok: false, error: 'INVITE_NOT_FOUND', status: 404 };
  }

  if (!response.ok) {
    let error = 'ACCEPT_FAILED';
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) error = body.error;
    } catch {
      // ignore
    }
    return { ok: false, error, status: response.status };
  }

  const body = (await response.json()) as {
    ok?: boolean;
    sessionRefreshRequired?: boolean;
    alreadyActive?: boolean;
  };

  if (body.sessionRefreshRequired) {
    const sb = getSupabase();
    if (sb) {
      await sb.auth.refreshSession();
    }
  }

  return {
    ok: true,
    sessionRefreshRequired: Boolean(body.sessionRefreshRequired),
    alreadyActive: Boolean(body.alreadyActive),
  };
}
