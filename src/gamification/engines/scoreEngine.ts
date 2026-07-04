import type { GamificationStats, UserType } from '../types/gamification';

export const SCORE_MAX = 1000;

/**
 * Serviços concluídos — até 350 pts, com peso progressivo por faixa:
 * 1–4: 15 pts cada · 5–9: 20 · 10–24: 25 · 25–49: 30 · 50+: 35 (cap 350).
 */
function computeServicesScore(totalCompleted: number): number {
  const tc = Math.max(0, totalCompleted);
  let score = 0;
  score += Math.min(tc, 4) * 15;
  if (tc >= 5) score += Math.min(tc - 4, 5) * 20;
  if (tc >= 10) score += Math.min(tc - 9, 15) * 25;
  if (tc >= 25) score += Math.min(tc - 24, 25) * 30;
  if (tc >= 50) score += (tc - 49) * 35;
  return Math.min(score, 350);
}

/** Avaliação média — até 250 pts: (avg − 1) / 4 × 250. Sem avaliação = 0. */
function computeRatingScore(avgRating: number): number {
  if (avgRating <= 0) return 0;
  const clamped = Math.min(5, Math.max(1, avgRating));
  return Math.round(((clamped - 1) / 4) * 250);
}

/** Perfil completo — proporcional ao percentual, até o máximo dado. */
function computeProfileScore(profilePct: number, max: number): number {
  return Math.round((Math.min(100, Math.max(0, profilePct)) / 100) * max);
}

/** Taxa de resposta (0–100%) — proporcional, até o máximo dado. */
function computeResponseScore(responseRate: number, max: number): number {
  return Math.round((Math.min(100, Math.max(0, responseRate)) / 100) * max);
}

function computePenalties(stats: GamificationStats): number {
  return Math.min(stats.complaintCount * 20, 100);
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(SCORE_MAX, Math.round(score)));
}

/**
 * Score do helper (0–1000):
 * serviços 350 · avaliação 250 · resposta 150 · perfil 100 ·
 * baixo cancelamento 100 · uso saudável 50 · penalidades por reclamação.
 */
export function computeHelperScore(stats: GamificationStats): number {
  const servicesScore = computeServicesScore(stats.totalCompleted);
  const ratingScore = computeRatingScore(stats.avgRating);
  const responseScore = computeResponseScore(stats.responseRate, 150);
  const profileScore = computeProfileScore(stats.profilePct, 100);

  let cancellationScore = 100;
  if (stats.cancelCount >= 1 && stats.cancelCount <= 2) cancellationScore = 70;
  else if (stats.cancelCount >= 3 && stats.cancelCount <= 5) cancellationScore = 40;
  else if (stats.cancelCount >= 6) cancellationScore = 0;

  // Uso saudável simples: baseado em candidaturas enviadas.
  let healthyUsageScore = 0;
  if (stats.applicationsCount >= 5) healthyUsageScore = 50;
  else if (stats.applicationsCount >= 1) healthyUsageScore = 25;

  const total =
    servicesScore +
    ratingScore +
    responseScore +
    profileScore +
    cancellationScore +
    healthyUsageScore -
    computePenalties(stats);

  return clampScore(total);
}

/**
 * Score do cliente (0–1000):
 * serviços 350 · avaliação recebida 250 · resposta/comunicação 100 ·
 * perfil 100 · baixo cancelamento 150 · histórico positivo 50 · penalidades.
 */
export function computeClientScore(stats: GamificationStats): number {
  const servicesScore = computeServicesScore(stats.totalCompleted);
  const ratingScore = computeRatingScore(stats.avgRating);
  const responseScore = computeResponseScore(stats.responseRate, 100);
  const profileScore = computeProfileScore(stats.profilePct, 100);

  let cancellationScore = 150;
  if (stats.cancelCount === 1) cancellationScore = 110;
  else if (stats.cancelCount >= 2 && stats.cancelCount <= 3) cancellationScore = 70;
  else if (stats.cancelCount >= 4 && stats.cancelCount <= 5) cancellationScore = 35;
  else if (stats.cancelCount >= 6) cancellationScore = 0;

  // Histórico positivo: baseado em pedidos publicados.
  let historyScore = 0;
  if (stats.publishedOrdersCount >= 10) historyScore = 50;
  else if (stats.publishedOrdersCount >= 3) historyScore = 35;
  else if (stats.publishedOrdersCount >= 1) historyScore = 20;

  const total =
    servicesScore +
    ratingScore +
    responseScore +
    profileScore +
    cancellationScore +
    historyScore -
    computePenalties(stats);

  return clampScore(total);
}

export function computeScore(userType: UserType, stats: GamificationStats): number {
  return userType === 'helper' ? computeHelperScore(stats) : computeClientScore(stats);
}
