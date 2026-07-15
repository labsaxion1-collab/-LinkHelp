import { getSupabase } from '@/lib/supabase';
import type { UserType } from '@/gamification/types/gamification';
import type { GamificationApiResponse } from '@/gamification/services/recalculateGamification';
import { getUserGamification, type UserGamificationRecord } from '@/gamification/services/gamificationService';
import { EMPTY_GAMIFICATION_STATS } from '@/gamification/services/gamificationStatsAdapter';
import { measureLocalOperation } from '@/lib/dev/supabaseMetrics';

async function getAccessToken(): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error('SUPABASE_NOT_CONFIGURED');

  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.access_token) throw new Error('AUTH_REQUIRED');
  return session.access_token;
}

function isGamificationApiPayload(data: unknown): data is GamificationApiResponse {
  if (!data || typeof data !== 'object') return false;
  const payload = data as GamificationApiResponse;
  return (
    typeof payload.score === 'number' &&
    typeof payload.levelKey === 'string' &&
    typeof payload.heroKey === 'string'
  );
}

export function apiResponseToRecord(
  response: Partial<GamificationApiResponse> & Pick<GamificationApiResponse, 'score' | 'levelKey' | 'heroKey'>,
): UserGamificationRecord {
  return {
    userId: response.userId ?? '',
    userType: response.userType ?? 'helper',
    score: response.score,
    levelKey: response.levelKey,
    heroKey: response.heroKey,
    stats: { ...EMPTY_GAMIFICATION_STATS, ...(response.stats ?? {}) },
    progressPercent: response.progressPercent ?? 0,
    pointsToNextLevel: response.pointsToNextLevel ?? 0,
    missingRequirements: response.missingRequirements ?? [],
    updatedAt: response.updatedAt ?? new Date().toISOString(),
  };
}

async function readGamificationViaSupabase(userType: UserType): Promise<UserGamificationRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const {
    data: { session },
  } = await sb.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  return getUserGamification(sb, userId, userType);
}

async function parseApiResponse(res: Response): Promise<GamificationApiResponse> {
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('INVALID_RESPONSE');
  }

  const data = (await res.json().catch(() => null)) as (GamificationApiResponse & { error?: string }) | null;
  if (!res.ok) throw new Error(data?.error ?? 'GAMIFICATION_UNAVAILABLE');
  if (!isGamificationApiPayload(data)) throw new Error('INVALID_RESPONSE');
  return data;
}

/** GET /api/gamification/me — leitura via servidor (sem upsert no navegador). */
export async function fetchGamificationMe(userType: UserType): Promise<UserGamificationRecord> {
  try {
    const token = await getAccessToken();
    const payload = await measureLocalOperation(
      { operationName: 'gamification-me', domain: 'gamification', table: 'api/gamification/me', action: 'api', sourceLabel: 'gamificationApiClient.fetchGamificationMe' },
      async () => {
        const res = await fetch(`/api/gamification/me?userType=${encodeURIComponent(userType)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return parseApiResponse(res);
      },
    );
    return apiResponseToRecord(payload);
  } catch {
    const snapshot = await readGamificationViaSupabase(userType);
    if (snapshot) return snapshot;
    throw new Error('GAMIFICATION_UNAVAILABLE');
  }
}

/** POST /api/gamification/recalculate — recálculo e gravação somente no servidor. */
export async function requestGamificationRecalculate(
  userType: UserType,
): Promise<UserGamificationRecord | null> {
  try {
    const token = await getAccessToken();
    const payload = await measureLocalOperation(
      { operationName: 'gamification-recalculate', domain: 'gamification', table: 'api/gamification/recalculate', action: 'api', sourceLabel: 'gamificationApiClient.requestGamificationRecalculate' },
      async () => {
        const res = await fetch('/api/gamification/recalculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userType }),
        });
        return parseApiResponse(res);
      },
    );
    return apiResponseToRecord(payload);
  } catch {
    return null;
  }
}
