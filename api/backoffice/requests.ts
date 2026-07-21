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

  const auth = await authorizeBackoffice(req.headers.authorization, 'requests.read');
  if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);

  const requestId = typeof req.query?.requestId === 'string' ? req.query.requestId : null;

  try {
    const admin = createSupabaseServiceRoleClient();

    if (requestId) {
      const { data, error } = await admin.rpc('admin_get_request_detail', {
        p_request_id: requestId,
      });
      if (error) {
        console.error('[backoffice/requests] detail', error.message);
        return backofficeJsonError(res, 502, 'BACKOFFICE_REQUEST_DETAIL_FAILED');
      }
      await logBackofficeRead(auth.user.id, 'requests.view_detail', 'request', requestId);
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(200).json(data);
    }

    const { limit, offset } = parseLimitOffset(req);
    const { data, error } = await admin.rpc('admin_list_requests', {
      p_status: typeof req.query?.status === 'string' ? req.query.status : null,
      p_search: typeof req.query?.search === 'string' ? req.query.search : null,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      console.error('[backoffice/requests] list', error.message);
      return backofficeJsonError(res, 502, 'BACKOFFICE_REQUESTS_LIST_FAILED');
    }
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(data);
  } catch (e) {
    console.error('[backoffice/requests]', e instanceof Error ? e.message : e);
    return backofficeJsonError(res, 503, 'BACKOFFICE_UNAVAILABLE');
  }
}
