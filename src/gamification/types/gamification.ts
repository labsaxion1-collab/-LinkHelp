export type UserType = 'client' | 'helper';

export type HelperLevelKey =
  | 'novo'
  | 'confiavel'
  | 'profissional'
  | 'elite'
  | 'top_helper'
  | 'lenda';

export type ClientLevelKey =
  | 'novo'
  | 'confiavel'
  | 'ouro'
  | 'vip'
  | 'elite';

export type LevelKey = HelperLevelKey | ClientLevelKey;

/**
 * Requisitos mínimos além do score. O usuário só sobe de nível
 * se tiver score mínimo E todos os requisitos satisfeitos.
 */
export interface LevelRequirements {
  minProfilePct?: number;
  minApplications?: number;
  minPublishedOrders?: number;
  minTotalCompleted?: number;
  minAvgRating?: number;
  minResponseRate?: number;
  minHireRate?: number;
  maxComplaints?: number;
  maxCancels?: number;
}

export interface GamificationLevel {
  key: LevelKey;
  name: string;
  heroKey: string;
  scoreMin: number;
  scoreMax: number;
  requirements: LevelRequirements;
}

/**
 * Snapshot de estatísticas do usuário — espelha a tabela `user_gamification`.
 */
export interface GamificationStats {
  totalCompleted: number;
  avgRating: number;
  responseRate: number;
  cancelCount: number;
  complaintCount: number;
  profilePct: number;
  applicationsCount: number;
  publishedOrdersCount: number;
  hireRate: number;
}

export interface ProgressToNextLevel {
  currentLevel: GamificationLevel;
  nextLevel: GamificationLevel | null;
  pointsToNext: number;
  progressPercent: number;
  missingRequirements: string[];
}
