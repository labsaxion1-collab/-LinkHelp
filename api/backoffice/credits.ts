import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authorizeBackoffice,
  backofficeJsonError,
  parseLimitOffset,
} from '../lib/backofficeAuth.server.js';
import { createSupabaseServiceRoleClient } from '../lib/supabaseAdmin.server.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return backofficeJsonError(res, 405, 'METHOD_NOT_ALLOWED');

  const auth = await authorizeBackoffice(req.headers.authorization, 'credits.read');
  if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);

  try {
    const { limit, offset } = parseLimitOffset(req);
    const helperId = typeof req.query?.helperId === 'string' ? req.query.helperId : null;
    const type = typeof req.query?.type === 'string' ? req.query.type : null;

    const admin = createSupabaseServiceRoleClient();
    const { data, error } = await admin.rpc('admin_list_credit_transactions', {
      p_helper_id: helperId,
      p_type: type,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      console.error('[backoffice/credits]', error.message);
      return backofficeJsonError(res, 502, 'BACKOFFICE_CREDITS_LIST_FAILED');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(data);
  } catch (e) {
    console.error('[backoffice/credits]', e instanceof Error ? e.message : e);
    return backofficeJsonError(res, 503, 'BACKOFFICE_UNAVAILABLE');
  }
}
