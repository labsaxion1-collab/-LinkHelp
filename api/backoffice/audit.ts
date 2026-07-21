import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authorizeBackoffice,
  backofficeJsonError,
  parseLimitOffset,
} from '../lib/backofficeAuth.server.js';
import { createSupabaseServiceRoleClient } from '../lib/supabaseAdmin.server.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return backofficeJsonError(res, 405, 'METHOD_NOT_ALLOWED');

  const auth = await authorizeBackoffice(req.headers.authorization, 'audit.read');
  if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);

  try {
    const { limit, offset } = parseLimitOffset(req);
    const admin = createSupabaseServiceRoleClient();
    const { data, error } = await admin.rpc('admin_list_audit_logs', {
      p_admin_id: typeof req.query?.adminId === 'string' ? req.query.adminId : null,
      p_action: typeof req.query?.action === 'string' ? req.query.action : null,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      console.error('[backoffice/audit]', error.message);
      return backofficeJsonError(res, 502, 'BACKOFFICE_AUDIT_LIST_FAILED');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(data);
  } catch (e) {
    console.error('[backoffice/audit]', e instanceof Error ? e.message : e);
    return backofficeJsonError(res, 503, 'BACKOFFICE_UNAVAILABLE');
  }
}
