import type {
  GamificationStats,
  LevelKey,
  LevelRequirements,
  ProgressToNextLevel,
  UserType,
} from '../types/gamification';
import { determineSequentialLevel, getCurrentLevelConfig, getLevelsFor } from './levelEngine';

type TFn = (key: string, vars?: Record<string, string | number>) => string;

/** Missing requirement strings — pass `t` from the UI for PT/FR/EN. */
export function listMissingRequirements(
  stats: GamificationStats,
  requirements: LevelRequirements,
  t?: TFn,
): string[] {
  const missing: string[] = [];

  if (requirements.minProfilePct !== undefined && stats.profilePct < requirements.minProfilePct) {
    missing.push(
      t
        ? t('gamification.req_profile_pct', { pct: requirements.minProfilePct })
        : `Perfil ${requirements.minProfilePct}% completo`,
    );
  }
  if (requirements.minApplications !== undefined && stats.applicationsCount < requirements.minApplications) {
    const count = requirements.minApplications - stats.applicationsCount;
    missing.push(
      t ? t('gamification.req_applications_left', { count }) : `${count} candidatura(s) restante(s)`,
    );
  }
  if (requirements.minPublishedOrders !== undefined && stats.publishedOrdersCount < requirements.minPublishedOrders) {
    const count = requirements.minPublishedOrders - stats.publishedOrdersCount;
    missing.push(
      t ? t('gamification.req_published_left', { count }) : `${count} pedido(s) publicado(s) restante(s)`,
    );
  }
  if (requirements.minTotalCompleted !== undefined && stats.totalCompleted < requirements.minTotalCompleted) {
    const count = requirements.minTotalCompleted - stats.totalCompleted;
    missing.push(
      t ? t('gamification.req_services_left', { count }) : `${count} serviço(s) restante(s)`,
    );
  }
  if (requirements.minAvgRating !== undefined && stats.avgRating < requirements.minAvgRating) {
    missing.push(
      t
        ? t('gamification.req_min_rating', { rating: requirements.minAvgRating })
        : `Nota mínima ${requirements.minAvgRating}`,
    );
  }
  if (requirements.minResponseRate !== undefined && stats.responseRate < requirements.minResponseRate) {
    missing.push(
      t
        ? t('gamification.req_response_rate', { pct: requirements.minResponseRate })
        : `Taxa de resposta ${requirements.minResponseRate}%`,
    );
  }
  if (requirements.minHireRate !== undefined && stats.hireRate < requirements.minHireRate) {
    missing.push(
      t
        ? t('gamification.req_hire_rate', { pct: requirements.minHireRate })
        : `Taxa de contratação ${requirements.minHireRate}%`,
    );
  }
  if (requirements.maxComplaints !== undefined && stats.complaintCount > requirements.maxComplaints) {
    missing.push(t ? t('gamification.req_reduce_complaints') : 'Reduzir reclamações');
  }
  if (requirements.maxCancels !== undefined && stats.cancelCount > requirements.maxCancels) {
    missing.push(t ? t('gamification.req_reduce_cancels') : 'Reduzir cancelamentos');
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
  currentLevelKey: LevelKey = 'novo',
  t?: TFn,
): ProgressToNextLevel {
  const levels = getLevelsFor(userType);
  const currentKey = determineSequentialLevel(userType, currentLevelKey, score, stats);
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
  const missingRequirements = listMissingRequirements(stats, nextLevel.requirements, t);

  return {
    currentLevel,
    nextLevel,
    pointsToNext,
    progressPercent,
    missingRequirements,
  };
}

/** Texto curto da barra quando pontos já bastam mas ainda faltam requisitos. */
export function formatProgressSubtitle(
  progress: Pick<ProgressToNextLevel, 'pointsToNext' | 'missingRequirements'>,
  variant: 'hero' | 'card' = 'hero',
  t?: TFn,
): string {
  const { pointsToNext, missingRequirements } = progress;

  if (pointsToNext === 0 && missingRequirements.length > 0) {
    const details = missingRequirements.join(', ');
    return t
      ? t('gamification.points_ok_missing', { details })
      : `Pontos ok — falta: ${details}`;
  }

  if (variant === 'card') {
    return t ? t('gamification.pts_remaining', { count: pointsToNext }) : `${pointsToNext} pts restantes`;
  }

  return t
    ? t('gamification.more_points_next', { count: pointsToNext })
    : `Mais ${pointsToNext} pontos para alcançar o próximo nível`;
}
