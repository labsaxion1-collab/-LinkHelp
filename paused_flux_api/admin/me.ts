/**
 * PAUSED (Hobby plan): temporarily outside /api so Vercel does not count this
 * file toward the 12 Serverless Functions limit. Restore to api/admin/me.ts
 * when the limit allows (or after consolidating admin routes).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeBackoffice, backofficeJsonError } from '../../api/_lib/adminAuth.server.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return backofficeJsonError(res, 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    const auth = await authorizeBackoffice(req.headers.authorization);
    if (auth.ok === false) {
      return backofficeJsonError(res, auth.status, auth.error);
    }

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      userId: auth.user.id,
      email: auth.user.email ?? null,
      roles: auth.roles,
      permissions: auth.permissions,
    });
  } catch (error) {
    console.error('[admin/me]', error instanceof Error ? error.message : 'UNKNOWN');
    return backofficeJsonError(res, 503, 'ADMIN_ME_UNAVAILABLE');
  }
}
