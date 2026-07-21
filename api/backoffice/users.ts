import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authorizeBackoffice,
  backofficeJsonError,
  logBackofficeRead,
  parseLimitOffset,
} from '../lib/backofficeAuth.server.js';
import { createSupabaseServiceRoleClient } from '../lib/supabaseAdmin.server.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return backofficeJsonError(res, 405, 'METHOD_NOT_ALLOWED');

  const auth = await authorizeBackoffice(req.headers.authorization, 'users.read');
  if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);

  const userId = typeof req.query?.userId === 'string' ? req.query.userId : null;

  try {
    const admin = createSupabaseServiceRoleClient();

    if (userId) {
      const { data, error } = await admin.rpc('admin_get_user_detail', { p_user_id: userId });
      if (error) {
        console.error('[backoffice/users] detail', error.message);
        return backofficeJsonError(res, 502, 'BACKOFFICE_USER_DETAIL_FAILED');
      }
      await logBackofficeRead(auth.user.id, 'users.view_detail', 'user', userId);
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(200).json(data);
    }

    const { limit, offset } = parseLimitOffset(req);
    const { data, error } = await admin.rpc('admin_list_users', {
      p_role: typeof req.query?.role === 'string' ? req.query.role : null,
      p_search: typeof req.query?.search === 'string' ? req.query.search : null,
      p_city: typeof req.query?.city === 'string' ? req.query.city : null,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      console.error('[backoffice/users] list', error.message);
      return backofficeJsonError(res, 502, 'BACKOFFICE_USERS_LIST_FAILED');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(data);
  } catch (e) {
    console.error('[backoffice/users]', e instanceof Error ? e.message : e);
    return backofficeJsonError(res, 503, 'BACKOFFICE_UNAVAILABLE');
  }
}
