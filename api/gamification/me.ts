import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthedUserId, getSupabaseAdmin } from '../stripe/supabaseAdmin.js';
import { ensureUserGamification } from '../../src/gamification/services/gamificationService.js';
import type { GamificationDb } from '../../src/gamification/services/gamificationStatsAdapter.js';
import type { UserType } from '../../src/gamification/types/gamification.js';

function parseUserType(value: unknown): UserType | null {
  return value === 'helper' || value === 'client' ? value : null;
}

/**
 * GET /api/gamification/me?userType=helper|client
 * Retorna (criando se necessário) a gamificação do usuário autenticado.
 * O user_id vem sempre da sessão — nunca do frontend.
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
  if (!userId) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }

  const userType = parseUserType(req.query.userType);
  if (!userType) {
    return res.status(400).json({ error: 'INVALID_USER_TYPE' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(503).json({ error: 'SUPABASE_NOT_CONFIGURED' });
  }

  try {
    const record = await ensureUserGamification(admin as GamificationDb, userId, userType);
    if (!record) {
      return res.status(500).json({ error: 'GAMIFICATION_UNAVAILABLE' });
    }

    return res.status(200).json({
      score: record.score,
      levelKey: record.levelKey,
      heroKey: record.heroKey,
      progressPercent: record.progressPercent,
      pointsToNextLevel: record.pointsToNextLevel,
      missingRequirements: record.missingRequirements,
      updatedAt: record.updatedAt,
    });
  } catch (err) {
    console.error('[gamification/me]', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}
