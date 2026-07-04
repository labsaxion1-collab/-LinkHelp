import type {
  GamificationStats,
  LevelRequirements,
  ProgressToNextLevel,
  UserType,
} from '../types/gamification';
import { determineLevel, getCurrentLevelConfig, getLevelsFor } from './levelEngine';

function listMissingRequirements(stats: GamificationStats, requirements: LevelRequirements): string[] {
  const missing: string[] = [];

  if (requirements.minProfilePct !== undefined && stats.profilePct < requirements.minProfilePct) {
    missing.push(`Perfil ${requirements.minProfilePct}% completo`);
  }
  if (requirements.minApplications !== undefined && stats.applicationsCount < requirements.minApplications) {
    missing.push(`${requirements.minApplications - stats.applicationsCount} candidatura(s) restante(s)`);
  }
  if (requirements.minPublishedOrders !== undefined && stats.publishedOrdersCount < requirements.minPublishedOrders) {
    missing.push(`${requirements.minPublishedOrders - stats.publishedOrdersCount} pedido(s) publicado(s) restante(s)`);
  }
  if (requirements.minTotalCompleted !== undefined && stats.totalCompleted < requirements.minTotalCompleted) {
    missing.push(`${requirements.minTotalCompleted - stats.totalCompleted} serviço(s) restante(s)`);
  }
  if (requirements.minAvgRating !== undefined && stats.avgRating < requirements.minAvgRating) {
    missing.push(`Nota mínima ${requirements.minAvgRating}`);
  }
  if (requirements.minResponseRate !== undefined && stats.responseRate < requirements.minResponseRate) {
    missing.push(`Taxa de resposta ${requirements.minResponseRate}%`);
  }
  if (requirements.minHireRate !== undefined && stats.hireRate < requirements.minHireRate) {
    missing.push(`Taxa de contratação ${requirements.minHireRate}%`);
  }
  if (requirements.maxComplaints !== undefined && stats.complaintCount > requirements.maxComplaints) {
    missing.push('Reduzir reclamações');
  }
  if (requirements.maxCancels !== undefined && stats.cancelCount > requirements.maxCancels) {
    missing.push('Reduzir cancelamentos');
  }

  return missing;
}

/**
 * Progresso para o próximo nível: pontos restantes, percentual dentro da
 * faixa atual e requisitos que ainda faltam. No nível máximo retorna 100%.
 */
export function getProgressToNextLevel(
  userType: UserType,
  score: number,
  stats: GamificationStats,
): ProgressToNextLevel {
  const levels = getLevelsFor(userType);
  const currentKey = determineLevel(userType, score, stats);
  const currentLevel = getCurrentLevelConfig(userType, currentKey);
  const currentIdx = levels.findIndex((level) => level.key === currentKey);
  const nextLevel = levels[currentIdx + 1] ?? null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      pointsToNext: 0,
      progressPercent: 100,
      missingRequirements: [],
    };
  }

  const rangeStart = currentLevel.scoreMin;
  const rangeEnd = nextLevel.scoreMin;
  const rawPercent = Math.round(((score - rangeStart) / (rangeEnd - rangeStart)) * 100);
  const progressPercent = Math.min(99, Math.max(0, rawPercent));
  const pointsToNext = Math.max(0, rangeEnd - score);
  const missingRequirements = listMissingRequirements(stats, nextLevel.requirements);

  return {
    currentLevel,
    nextLevel,
    pointsToNext,
    progressPercent,
    missingRequirements,
  };
}
