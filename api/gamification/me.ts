import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthedUserId, getSupabaseAdmin } from '../stripe/supabaseAdmin.js';
import {
  getGamificationMeForUser,
  recalculateGamificationForUser,
  resolveGamificationUser,
} from '../../src/gamification/services/recalculateGamification.js';
import type { GamificationDb } from '../../src/gamification/services/gamificationStatsAdapter.js';

function parseUserTypeQuery(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * GET /api/gamification/me?userType=helper|client
 * Retorna gamificação do usuário autenticado. user_id vem do token.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const userId = await getAuthedUserId(req.headers.authorization);
  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(503).json({ error: 'SUPABASE_NOT_CONFIGURED' });
  }

  const resolved = await resolveGamificationUser(
    admin as GamificationDb,
    userId,
    parseUserTypeQuery(req.query.userType),
  );
  if ('error' in resolved) {
    return res.status(resolved.status).json({ error: resolved.error });
  }

  try {
    const payload = await getGamificationMeForUser(
      admin as GamificationDb,
      resolved.userId,
      resolved.userType,
    );
    if (!payload) {
      return res.status(500).json({ error: 'GAMIFICATION_UNAVAILABLE' });
    }

    return res.status(200).json(payload);
  } catch (err) {
    console.error('[gamification/me]', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}
