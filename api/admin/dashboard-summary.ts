import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeAdmin } from '../lib/adminAuth.server.js';
import { createSupabaseServiceRoleClient } from '../lib/supabaseAdmin.server.js';
import { parseAdminDashboardSummary } from '../../src/admin/adminDashboardContract.js';
import {
  parseAdminDashboardFinancialSummary,
  type AdminFinancialTimeRange,
} from '../../src/admin/adminDashboardFinancialContract.js';

function parseTimeRange(value: unknown): AdminFinancialTimeRange {
  if (value === 'today' || value === '7d' || value === '30d' || value === 'all') return value;
  return 'all';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const timeRange = parseTimeRange(typeof req.query?.range === 'string' ? req.query.range : 'all');

  try {
    const authorization = await authorizeAdmin(req.headers.authorization);
    if (authorization.ok === false) {
      return res.status(authorization.status).json({ error: authorization.error });
    }

    let admin;
    try {
      admin = createSupabaseServiceRoleClient();
    } catch {
      return res.status(503).json({ error: 'SUPABASE_SERVER_NOT_CONFIGURED' });
    }

    const { data, error } = await admin.rpc('admin_dashboard_summary');
    if (error) {
      const code = error.code ?? 'UNKNOWN';
      console.error('[admin/dashboard-summary] RPC admin_dashboard_summary failed', code);
      const rpcMissing = code === '42883' || code === 'PGRST202' || /could not find the function/i.test(error.message ?? '');
      return res.status(502).json({
        error: rpcMissing ? 'ADMIN_SUMMARY_RPC_FAILED' : 'ADMIN_SUMMARY_UNAVAILABLE',
      });
    }

    const summary = parseAdminDashboardSummary(data);
    if (!summary) {
      console.error('[admin/dashboard-summary] Invalid RPC payload shape');
      return res.status(502).json({ error: 'ADMIN_SUMMARY_INVALID' });
    }

    let financial = null;
    let financialError: string | null = null;
    const financialResult = await admin.rpc('admin_dashboard_financial_summary', {
      p_time_range: timeRange,
    });
    if (financialResult.error) {
      const code = financialResult.error.code ?? 'UNKNOWN';
      console.error('[admin/dashboard-summary] RPC admin_dashboard_financial_summary failed', code);
      financialError = 'ADMIN_SUMMARY_FINANCIAL_UNAVAILABLE';
    } else {
      financial = parseAdminDashboardFinancialSummary(financialResult.data, timeRange);
      if (!financial) financialError = 'ADMIN_SUMMARY_FINANCIAL_UNAVAILABLE';
    }

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({ summary, financial, financialError, timeRange });
  } catch (error) {
    console.error('[admin/dashboard-summary]', error instanceof Error ? error.message : 'UNKNOWN');
    return res.status(503).json({ error: 'ADMIN_SUMMARY_UNAVAILABLE' });
  }
}
