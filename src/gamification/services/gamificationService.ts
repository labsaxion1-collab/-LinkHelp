import type { UserGamificationRow } from '../../types/database';
import type {
  GamificationStats,
  LevelKey,
  ProgressToNextLevel,
  UserType,
} from '../types/gamification';
import { computeScore } from '../engines/scoreEngine';
import { determineLevel, getCurrentLevelConfig, getLevelsFor } from '../engines/levelEngine';
import { getProgressToNextLevel } from '../engines/progressEngine';
import {
  EMPTY_GAMIFICATION_STATS,
  buildClientGamificationStats,
  buildHelperGamificationStats,
  type GamificationDb,
} from './gamificationStatsAdapter';

/**
 * Camada de serviço da gamificação (Etapa 2).
 *
 * O client Supabase é sempre injetado:
 * - no browser, passe `getSupabase()` (RLS garante acesso apenas aos próprios dados);
 * - nas API routes (Vercel), passe o client admin criado no servidor —
 *   o `user_id` NUNCA vem do frontend, sempre da sessão autenticada.
 */

export interface UserGamificationRecord {
  userId: string;
  userType: UserType;
  score: number;
  levelKey: LevelKey;
  heroKey: string;
  stats: GamificationStats;
  progressPercent: number;
  pointsToNextLevel: number;
  missingRequirements: string[];
  updatedAt: string;
}

function rowToRecord(row: UserGamificationRow): UserGamificationRecord {
  const levelKey = (row.level_key ?? 'novo') as LevelKey;
  const levelConfig = getCurrentLevelConfig(row.user_type, levelKey);
  return {
    userId: row.user_id,
    userType: row.user_type,
    score: Number(row.score_1000 ?? 0),
    levelKey: levelConfig.key,
    heroKey: row.hero_key ?? levelConfig.heroKey,
    stats: {
      totalCompleted: row.total_completed ?? 0,
      avgRating: Number(row.avg_rating ?? 0),
      responseRate: Number(row.response_rate ?? 0),
      cancelCount: row.cancel_count ?? 0,
      complaintCount: row.complaint_count ?? 0,
      profilePct: row.profile_pct ?? 0,
      applicationsCount: row.applications_count ?? 0,
      publishedOrdersCount: row.published_orders_count ?? 0,
      hireRate: Number(row.hire_rate ?? 0),
    },
    progressPercent: row.progress_percent ?? 0,
    pointsToNextLevel: row.points_to_next_level ?? 0,
    missingRequirements: row.missing_requirements ?? [],
    updatedAt: row.updated_at,
  };
}

function buildRowPayload(userId: string, userType: UserType, stats: GamificationStats) {
  const score = computeScore(userType, stats);
  const levelKey = determineLevel(userType, score, stats);
  const levelConfig = getCurrentLevelConfig(userType, levelKey);
  const progress = getProgressToNextLevel(userType, score, stats);

  return {
    user_id: userId,
    user_type: userType,
    score_1000: score,
    level_key: levelKey,
    hero_key: levelConfig.heroKey,
    total_completed: stats.totalCompleted,
    avg_rating: stats.avgRating,
    response_rate: stats.responseRate,
    cancel_count: stats.cancelCount,
    complaint_count: stats.complaintCount,
    profile_pct: stats.profilePct,
    applications_count: stats.applicationsCount,
    published_orders_count: stats.publishedOrdersCount,
    hire_rate: stats.hireRate,
    progress_percent: progress.progressPercent,
    points_to_next_level: progress.pointsToNext,
    missing_requirements: progress.missingRequirements,
    updated_at: new Date().toISOString(),
  };
}

/** Lê o snapshot de gamificação do usuário; null se ainda não existe. */
export async function getUserGamification(
  db: GamificationDb,
  userId: string,
  userType: UserType,
): Promise<UserGamificationRecord | null> {
  const { data, error } = await db
    .from('user_gamification')
    .select('*')
    .eq('user_id', userId)
    .eq('user_type', userType)
    .maybeSingle();

  if (error || !data) return null;
  return rowToRecord(data);
}

/**
 * Atualiza (upsert) o snapshot a partir das stats fornecidas:
 * recalcula score, nível, hero e progresso via engines e persiste tudo.
 */
export async function updateUserGamification(
  db: GamificationDb,
  userId: string,
  userType: UserType,
  stats: GamificationStats,
): Promise<UserGamificationRecord | null> {
  const payload = buildRowPayload(userId, userType, stats);

  const { data, error } = await db
    .from('user_gamification')
    .upsert(payload, { onConflict: 'user_id,user_type' })
    .select('*')
    .maybeSingle();

  if (error || !data) return null;
  return rowToRecord(data);
}

/**
 * Garante que exista registro para user_id + user_type.
 * Se não existir, cria zerado: score 0, level 'novo', hero inicial do
 * config e progresso calculado a partir do estado inicial.
 */
export async function ensureUserGamification(
  db: GamificationDb,
  userId: string,
  userType: UserType,
): Promise<UserGamificationRecord | null> {
  const existing = await getUserGamification(db, userId, userType);
  if (existing) return existing;

  const initialLevel = getLevelsFor(userType)[0];
  const progress = getProgressToNextLevel(userType, 0, EMPTY_GAMIFICATION_STATS);

  const { data, error } = await db
    .from('user_gamification')
    .upsert(
      {
        user_id: userId,
        user_type: userType,
        score_1000: 0,
        level_key: initialLevel.key,
        hero_key: initialLevel.heroKey,
        total_completed: 0,
        avg_rating: 0,
        response_rate: 0,
        cancel_count: 0,
        complaint_count: 0,
        profile_pct: 0,
        applications_count: 0,
        published_orders_count: 0,
        hire_rate: 0,
        progress_percent: progress.progressPercent,
        points_to_next_level: progress.pointsToNext,
        missing_requirements: progress.missingRequirements,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,user_type' },
    )
    .select('*')
    .maybeSingle();

  if (error || !data) return null;
  return rowToRecord(data);
}

/**
 * Recalcula a gamificação a partir dos dados reais do banco
 * (via stats adapter) e persiste o snapshot atualizado.
 */
export async function recalculateUserGamification(
  db: GamificationDb,
  userId: string,
  userType: UserType,
): Promise<UserGamificationRecord | null> {
  const stats =
    userType === 'helper'
      ? await buildHelperGamificationStats(db, userId)
      : await buildClientGamificationStats(db, userId);

  return updateUserGamification(db, userId, userType, stats);
}

/*
 * TODO (fase futura da gamificação — fora do MVP):
 * - Créditos grátis por nível: conceder LC ao subir de nível (integrar com o
 *   ledger de LinkCredits SEM alterar a monetização atual; provavelmente via
 *   trigger/Edge Function ao detectar mudança de level_key).
 * - Ranking público: view/RPC com top helpers e clientes por score_1000
 *   (exige política RLS de leitura pública agregada, hoje o select é só o próprio).
 * - Notificações: push/in-app ao subir de nível ou quando faltar pouco para o próximo.
 * - Boost real: destaque no feed de oportunidades por nível (ordenação/badge).
 * - Grace period: ao cair de score, segurar o rebaixamento de nível por N dias
 *   antes de trocar level_key/hero_key.
 * - Histórico de evolução: tabela user_gamification_history (snapshot por
 *   recálculo) para gráfico de evolução do score no perfil.
 */

/** Progresso para o próximo nível calculado do snapshot atual (cria se não existir). */
export async function getUserProgress(
  db: GamificationDb,
  userId: string,
  userType: UserType,
): Promise<ProgressToNextLevel | null> {
  const record = await ensureUserGamification(db, userId, userType);
  if (!record) return null;
  return getProgressToNextLevel(userType, record.score, record.stats);
}
