import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.database';
import type { DbApplicationStatus, RequestStatus } from '../../types/database';
import type { GamificationStats } from '../types/gamification';

export type GamificationDb = SupabaseClient<Database>;

export const EMPTY_GAMIFICATION_STATS: GamificationStats = {
  totalCompleted: 0,
  avgRating: 0,
  responseRate: 0,
  cancelCount: 0,
  complaintCount: 0,
  profilePct: 0,
  applicationsCount: 0,
  publishedOrdersCount: 0,
  hireRate: 0,
};

async function countHelperApplications(
  db: GamificationDb,
  helperId: string,
  statuses?: DbApplicationStatus[],
): Promise<number> {
  let query = db.from('applications').select('id', { count: 'exact', head: true }).eq('helper_id', helperId);
  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  }
  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

async function countClientRequests(
  db: GamificationDb,
  clientId: string,
  statuses?: RequestStatus[],
): Promise<number> {
  let query = db.from('requests').select('id', { count: 'exact', head: true }).eq('client_id', clientId);
  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  }
  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

async function fetchProfileBasics(
  db: GamificationDb,
  userId: string,
): Promise<{ avgRating: number; profilePct: number }> {
  const { data, error } = await db
    .from('profiles')
    .select('rating, avatar_url, name, phone, city, bio')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return { avgRating: 0, profilePct: 0 };

  // Completude simples do perfil (0–100) baseada em campos preenchidos.
  // Refinar depois com computeHelperProfileCompletion (foto + skills) quando
  // a fonte de skills (helper_skills) entrar no cálculo oficial.
  const checks = [
    Boolean(data.name?.trim()),
    Boolean(data.avatar_url?.trim()),
    Boolean(data.phone?.trim()),
    Boolean(data.city?.trim()),
    Boolean(data.bio?.trim()),
  ];
  const filled = checks.filter(Boolean).length;
  const profilePct = Math.round((filled / checks.length) * 100);

  return { avgRating: data.rating ?? 0, profilePct };
}

/**
 * Monta as stats do helper a partir das tabelas reais.
 *
 * Fontes conectadas:
 * - `profiles` → avg_rating (sincronizado por trigger de reviews) e completude do perfil
 * - `applications` → candidaturas, serviços concluídos, cancelamentos e taxa de contratação
 *
 * Fontes pendentes (fallback 0 até existirem):
 * - `messages` → responseRate (tempo/taxa de resposta no chat)
 * - `complaints` → complaintCount (tabela ainda não existe)
 */
export async function buildHelperGamificationStats(
  db: GamificationDb,
  userId: string,
): Promise<GamificationStats> {
  try {
    const [profile, applicationsCount, totalCompleted, cancelCount, hiredCount] = await Promise.all([
      fetchProfileBasics(db, userId),
      countHelperApplications(db, userId),
      countHelperApplications(db, userId, ['completed']),
      countHelperApplications(db, userId, ['cancelled']),
      countHelperApplications(db, userId, ['accepted', 'completed']),
    ]);

    const hireRate = applicationsCount > 0 ? Math.round((hiredCount / applicationsCount) * 100) : 0;

    return {
      ...EMPTY_GAMIFICATION_STATS,
      totalCompleted,
      avgRating: profile.avgRating,
      cancelCount,
      profilePct: profile.profilePct,
      applicationsCount,
      hireRate,
      // TODO responseRate: conectar em `messages`/`conversations` (velocidade de resposta).
      // TODO complaintCount: conectar quando a tabela `complaints` existir.
    };
  } catch {
    return { ...EMPTY_GAMIFICATION_STATS };
  }
}

/**
 * Monta as stats do cliente a partir das tabelas reais.
 *
 * Fontes conectadas:
 * - `profiles` → avg_rating recebida (reviews) e completude do perfil
 * - `requests` → pedidos publicados, concluídos e cancelados
 *
 * Fontes pendentes (fallback 0 até existirem):
 * - `messages` → responseRate (comunicação com helpers)
 * - `complaints` → complaintCount (tabela ainda não existe)
 */
export async function buildClientGamificationStats(
  db: GamificationDb,
  userId: string,
): Promise<GamificationStats> {
  try {
    const [profile, publishedOrdersCount, totalCompleted, cancelCount] = await Promise.all([
      fetchProfileBasics(db, userId),
      countClientRequests(db, userId),
      countClientRequests(db, userId, ['completed']),
      countClientRequests(db, userId, ['cancelled']),
    ]);

    return {
      ...EMPTY_GAMIFICATION_STATS,
      totalCompleted,
      avgRating: profile.avgRating,
      cancelCount,
      profilePct: profile.profilePct,
      publishedOrdersCount,
      // TODO responseRate: conectar em `messages`/`conversations`.
      // TODO complaintCount: conectar quando a tabela `complaints` existir.
    };
  } catch {
    return { ...EMPTY_GAMIFICATION_STATS };
  }
}
