import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authorizeBackoffice,
  backofficeJsonError,
  logBackofficeRead,
} from '../lib/backofficeAuth.server.js';
import { createSupabaseServiceRoleClient } from '../lib/supabaseAdmin.server.js';

/** P0 Support View — read-only user context. No impersonation, no session swap. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return backofficeJsonError(res, 405, 'METHOD_NOT_ALLOWED');

  const auth = await authorizeBackoffice(req.headers.authorization, 'support.view');
  if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);

  const userId = typeof req.query?.userId === 'string' ? req.query.userId : null;
  if (!userId) return backofficeJsonError(res, 400, 'USER_ID_REQUIRED');

  try {
    const admin = createSupabaseServiceRoleClient();
    const { data, error } = await admin.rpc('admin_get_user_detail', { p_user_id: userId });
    if (error) {
      console.error('[backoffice/support]', error.message);
      return backofficeJsonError(res, 502, 'BACKOFFICE_SUPPORT_VIEW_FAILED');
    }

    await logBackofficeRead(auth.user.id, 'support.view_read_only', 'user', userId, {
      mode: 'read_only_view',
    });

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      mode: 'read_only_view',
      impersonation: false,
      user: data,
    });
  } catch (e) {
    console.error('[backoffice/support]', e instanceof Error ? e.message : e);
    return backofficeJsonError(res, 503, 'BACKOFFICE_UNAVAILABLE');
  }
}
