import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorizeBackoffice, backofficeJsonError } from '../lib/backofficeAuth.server.js';
import { createSupabaseServiceRoleClient } from '../lib/supabaseAdmin.server.js';
import { buildEconomySnapshot } from '../../src/backoffice/economy/economySnapshot.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return backofficeJsonError(res, 405, 'METHOD_NOT_ALLOWED');

  const auth = await authorizeBackoffice(req.headers.authorization, 'economy.read');
  if (auth.ok === false) return backofficeJsonError(res, auth.status, auth.error);

  try {
    const codeSnapshot = buildEconomySnapshot();
    let dbPackages: unknown[] = [];

    try {
      const admin = createSupabaseServiceRoleClient();
      const { data } = await admin.from('credit_packages').select('*').order('credits', { ascending: true });
      dbPackages = data ?? [];
    } catch {
      dbPackages = [];
    }

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      ...codeSnapshot,
      dbPackages,
    });
  } catch (e) {
    console.error('[backoffice/economy]', e instanceof Error ? e.message : e);
    return backofficeJsonError(res, 503, 'BACKOFFICE_UNAVAILABLE');
  }
}
