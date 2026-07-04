import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthedUserId, getSupabaseAdmin } from '../stripe/supabaseAdmin.js';
import { recalculateUserGamification } from '../../src/gamification/services/gamificationService.js';
import type { GamificationDb } from '../../src/gamification/services/gamificationStatsAdapter.js';
import type { UserType } from '../../src/gamification/types/gamification.js';

type Body = {
  userType?: string;
};

function parseUserType(value: unknown): UserType | null {
  return value === 'helper' || value === 'client' ? value : null;
}

/**
 * POST /api/gamification/recalculate { userType: 'helper' | 'client' }
 * Recalcula score, nível, hero e progresso do usuário autenticado a partir
 * dos dados reais do banco. O user_id vem sempre da sessão — nunca do frontend.
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
  if (!userId) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }

  let body: Body;
  try {
    body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}) as Body;
  } catch {
    return res.status(400).json({ error: 'INVALID_PAYLOAD' });
  }

  const userType = parseUserType(body.userType);
  if (!userType) {
    return res.status(400).json({ error: 'INVALID_USER_TYPE' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(503).json({ error: 'SUPABASE_NOT_CONFIGURED' });
  }

  try {
    const record = await recalculateUserGamification(admin as GamificationDb, userId, userType);
    if (!record) {
      return res.status(500).json({ error: 'RECALCULATE_FAILED' });
    }

    return res.status(200).json({
      score: record.score,
      levelKey: record.levelKey,
      heroKey: record.heroKey,
      stats: record.stats,
      progressPercent: record.progressPercent,
      pointsToNextLevel: record.pointsToNextLevel,
      missingRequirements: record.missingRequirements,
      updatedAt: record.updatedAt,
    });
  } catch (err) {
    console.error('[gamification/recalculate]', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}
