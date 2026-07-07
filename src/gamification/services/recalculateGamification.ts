import type {
  GamificationLevel,
  GamificationStats,
  LevelKey,
  UserType,
} from '../types/gamification';
import { getProgressToNextLevel } from '../engines/progressEngine';
import {
  ensureUserGamification,
  recalculateUserGamification,
  type UserGamificationRecord,
} from './gamificationService';
import type { GamificationDb } from './gamificationStatsAdapter';

export type GamificationApiResponse = {
  userId: string;
  userType: UserType;
  score: number;
  levelKey: LevelKey;
  heroKey: string;
  stats: GamificationStats;
  progressPercent: number;
  pointsToNextLevel: number;
  missingRequirements: string[];
  currentLevel: GamificationLevel;
  nextLevel: GamificationLevel | null;
  updatedAt: string;
};

export type GamificationRequestError = {
  error: string;
  status: number;
};

export function parseUserType(value: unknown): UserType | null {
  return value === 'helper' || value === 'client' ? value : null;
}

/** Valida que o userType pedido bate com profiles.role — nunca confiar só no front. */
export async function validateUserTypeForProfile(
  db: GamificationDb,
  userId: string,
  userType: UserType,
): Promise<boolean> {
  const { data, error } = await db.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (error || !data) return false;
  return data.role === userType;
}

export async function resolveGamificationUser(
  db: GamificationDb,
  userId: string | null,
  userType: unknown,
): Promise<{ userId: string; userType: UserType } | GamificationRequestError> {
  if (!userId) {
    return { error: 'AUTH_REQUIRED', status: 401 };
  }

  const parsed = parseUserType(userType);
  if (!parsed) {
    return { error: 'INVALID_USER_TYPE', status: 400 };
  }

  const valid = await validateUserTypeForProfile(db, userId, parsed);
  if (!valid) {
    return { error: 'FORBIDDEN_USER_TYPE', status: 403 };
  }

  return { userId, userType: parsed };
}

export function toGamificationApiResponse(record: UserGamificationRecord): GamificationApiResponse {
  const progress = getProgressToNextLevel(
    record.userType,
    record.score,
    record.stats,
    record.levelKey,
  );

  return {
    userId: record.userId,
    userType: record.userType,
    score: record.score,
    levelKey: record.levelKey,
    heroKey: record.heroKey,
    stats: record.stats,
    progressPercent: record.progressPercent,
    pointsToNextLevel: record.pointsToNextLevel,
    missingRequirements: record.missingRequirements,
    currentLevel: progress.currentLevel,
    nextLevel: progress.nextLevel,
    updatedAt: record.updatedAt,
  };
}

/**
 * GET /api/gamification/me — garante registro (service role) e retorna snapshot.
 * user_id vem sempre do token; nunca do body/query além de userType validado.
 */
export async function getGamificationMeForUser(
  db: GamificationDb,
  userId: string,
  userType: UserType,
): Promise<GamificationApiResponse | null> {
  const record = await ensureUserGamification(db, userId, userType);
  if (!record) return null;
  return toGamificationApiResponse(record);
}

/**
 * POST /api/gamification/recalculate — stats reais + engines + upsert (service role).
 */
export async function recalculateGamificationForUser(
  db: GamificationDb,
  userId: string,
  userType: UserType,
): Promise<GamificationApiResponse | null> {
  const record = await recalculateUserGamification(db, userId, userType);
  if (!record) return null;
  return toGamificationApiResponse(record);
}
