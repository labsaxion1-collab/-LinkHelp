import type {
  GamificationLevel,
  GamificationStats,
  LevelKey,
  LevelRequirements,
  UserType,
} from '../types/gamification';
import { HELPER_LEVELS } from '../config/helperLevels';
import { CLIENT_LEVELS } from '../config/clientLevels';

export function getLevelsFor(userType: UserType): GamificationLevel[] {
  return userType === 'helper' ? HELPER_LEVELS : CLIENT_LEVELS;
}

export function meetsRequirements(stats: GamificationStats, requirements: LevelRequirements): boolean {
  if (requirements.minProfilePct !== undefined && stats.profilePct < requirements.minProfilePct) return false;
  if (requirements.minApplications !== undefined && stats.applicationsCount < requirements.minApplications) return false;
  if (requirements.minPublishedOrders !== undefined && stats.publishedOrdersCount < requirements.minPublishedOrders) return false;
  if (requirements.minTotalCompleted !== undefined && stats.totalCompleted < requirements.minTotalCompleted) return false;
  if (requirements.minAvgRating !== undefined && stats.avgRating < requirements.minAvgRating) return false;
  if (requirements.minResponseRate !== undefined && stats.responseRate < requirements.minResponseRate) return false;
  if (requirements.minHireRate !== undefined && stats.hireRate < requirements.minHireRate) return false;
  if (requirements.maxComplaints !== undefined && stats.complaintCount > requirements.maxComplaints) return false;
  if (requirements.maxCancels !== undefined && stats.cancelCount > requirements.maxCancels) return false;
  return true;
}

/** Nível mais alto cujo score mínimo foi atingido E cujos requisitos estão satisfeitos. */
export function findHighestEligibleLevel(
  userType: UserType,
  score: number,
  stats: GamificationStats,
): LevelKey {
  const levels = getLevelsFor(userType);
  for (let i = levels.length - 1; i >= 0; i--) {
    const level = levels[i];
    if (score >= level.scoreMin && meetsRequirements(stats, level.requirements)) {
      return level.key;
    }
  }
  return 'novo';
}

/**
 * Progressão sequencial: só permite subir para o próximo nível imediato.
 * Se o próximo não for elegível, mantém o nível atual (fallback: `novo`).
 */
export function determineSequentialLevel(
  userType: UserType,
  currentLevelKey: LevelKey | string | null | undefined,
  score: number,
  stats: GamificationStats,
): LevelKey {
  const levels = getLevelsFor(userType);
  const resolvedCurrent = getCurrentLevelConfig(userType, (currentLevelKey ?? 'novo') as LevelKey);
  const currentIdx = levels.findIndex((level) => level.key === resolvedCurrent.key);
  const safeIdx = currentIdx >= 0 ? currentIdx : 0;
  const currentLevel = levels[safeIdx];
  const nextLevel = levels[safeIdx + 1];

  if (
    nextLevel &&
    score >= nextLevel.scoreMin &&
    meetsRequirements(stats, nextLevel.requirements)
  ) {
    return nextLevel.key;
  }

  return currentLevel.key;
}

/**
 * Determina o nível assumindo partida de `novo` (apenas uma subida por chamada).
 * Preferir `determineSequentialLevel` com o nível persistido do usuário.
 */
export function determineLevel(userType: UserType, score: number, stats: GamificationStats): LevelKey {
  return determineSequentialLevel(userType, 'novo', score, stats);
}

export function getCurrentLevelConfig(userType: UserType, levelKey: LevelKey): GamificationLevel {
  const levels = getLevelsFor(userType);
  return levels.find((level) => level.key === levelKey) ?? levels[0];
}
