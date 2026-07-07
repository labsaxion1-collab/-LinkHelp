import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthedUserId, getSupabaseAdmin } from '../stripe/supabaseAdmin.js';
import {
  recalculateGamificationForUser,
  resolveGamificationUser,
} from '../lib/gamification.server.mjs';
import type { GamificationDb } from '../../src/gamification/services/gamificationStatsAdapter.js';

type Body = {
  userType?: string;
  userId?: string;
  score?: number;
  levelKey?: string;
};

/**
 * POST /api/gamification/recalculate { userType: 'helper' | 'client' }
 * Recalcula e persiste gamificação via service role. user_id vem do token.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const userId = await getAuthedUserId(req.headers.authorization);
  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(503).json({ error: 'SUPABASE_NOT_CONFIGURED' });
  }

  let body: Body;
  try {
    body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}) as Body;
  } catch {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  // Ignora campos do front que poderiam tentar forjar identidade/score/nível.
  void body.userId;
  void body.score;
  void body.levelKey;

  const resolved = await resolveGamificationUser(admin as GamificationDb, userId, body.userType);
  if ('error' in resolved) {
    return res.status(resolved.status).json({ error: resolved.error });
  }

  try {
    const payload = await recalculateGamificationForUser(
      admin as GamificationDb,
      resolved.userId,
      resolved.userType,
    );
    if (!payload) {
      return res.status(500).json({ error: 'RECALCULATE_FAILED' });
    }

    return res.status(200).json(payload);
  } catch (err) {
    console.error('[gamification/recalculate]', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}
