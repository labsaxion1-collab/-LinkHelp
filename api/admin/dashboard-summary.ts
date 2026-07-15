import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeAdmin } from '../lib/adminAuth.server.js';
import { createSupabaseServiceRoleClient } from '../lib/supabaseAdmin.server.js';
import { parseAdminDashboardSummary } from '../../src/admin/adminDashboardContract.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  try {
    const authorization = await authorizeAdmin(req.headers.authorization);
    if (authorization.ok === false) {
      return res.status(authorization.status).json({ error: authorization.error });
    }

    const admin = createSupabaseServiceRoleClient();
    const { data, error } = await admin.rpc('admin_dashboard_summary');
    if (error) {
      console.error('[admin/dashboard-summary] RPC failed', error.code ?? 'UNKNOWN');
      return res.status(502).json({ error: 'ADMIN_SUMMARY_UNAVAILABLE' });
    }
    const summary = parseAdminDashboardSummary(data);
    if (!summary) return res.status(502).json({ error: 'ADMIN_SUMMARY_INVALID' });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(summary);
  } catch (error) {
    console.error('[admin/dashboard-summary]', error instanceof Error ? error.message : 'UNKNOWN');
    return res.status(503).json({ error: 'ADMIN_SUMMARY_UNAVAILABLE' });
  }
}
