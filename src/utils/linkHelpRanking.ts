export type HelperRankTier =
  | 'novo_helper'
  | 'iniciante'
  | 'profissional'
  | 'elite'
  | 'top_helper'
  | 'lenda';

export type ClientRankTier =
  | 'novo_cliente'
  | 'confiavel'
  | 'ouro'
  | 'cliente_elite'
  | 'cliente_exemplar';

export type RankTier = HelperRankTier | ClientRankTier;

export type ReputationInput = {
  completedCount: number;
  averageRating: number;
  /** 0–1 completion rate (optional, for future weighting) */
  completionRate?: number;
  cancelledCount?: number;
};

export type HelperRankDef = {
  tier: HelperRankTier;
  level: number;
  minServices: number;
  maxServices: number | null;
  minRating: number | null;
  accent: string;
  icon: 'sprout' | 'crystal' | 'star' | 'crown' | 'rocket' | 'flame';
};

export type ClientRankDef = {
  tier: ClientRankTier;
  level: number;
  minOrders: number;
  maxOrders: number | null;
  minRating: number | null;
  accent: string;
  icon: 'sprout' | 'handshake' | 'medal' | 'diamond' | 'crown_premium';
};

export const HELPER_RANKS: HelperRankDef[] = [
  { tier: 'novo_helper', level: 1, minServices: 0, maxServices: 4, minRating: null, accent: '#22C55E', icon: 'sprout' },
  { tier: 'iniciante', level: 2, minServices: 5, maxServices: 19, minRating: 4.0, accent: '#3B82F6', icon: 'crystal' },
  { tier: 'profissional', level: 3, minServices: 20, maxServices: 49, minRating: 4.3, accent: '#EAB308', icon: 'star' },
  { tier: 'elite', level: 4, minServices: 50, maxServices: 149, minRating: 4.6, accent: '#A855F7', icon: 'crown' },
  { tier: 'top_helper', level: 5, minServices: 150, maxServices: 299, minRating: 4.8, accent: '#EC4899', icon: 'rocket' },
  { tier: 'lenda', level: 6, minServices: 300, maxServices: null, minRating: 4.9, accent: '#F97316', icon: 'flame' },
];

export const CLIENT_RANKS: ClientRankDef[] = [
  { tier: 'novo_cliente', level: 1, minOrders: 0, maxOrders: 2, minRating: null, accent: '#22C55E', icon: 'sprout' },
  { tier: 'confiavel', level: 2, minOrders: 3, maxOrders: 9, minRating: 4.0, accent: '#3B82F6', icon: 'handshake' },
  { tier: 'ouro', level: 3, minOrders: 10, maxOrders: 24, minRating: 4.3, accent: '#EAB308', icon: 'medal' },
  { tier: 'cliente_elite', level: 4, minOrders: 25, maxOrders: 49, minRating: 4.6, accent: '#A855F7', icon: 'diamond' },
  { tier: 'cliente_exemplar', level: 5, minOrders: 50, maxOrders: null, minRating: 4.8, accent: '#F59E0B', icon: 'crown_premium' },
];

function meetsRating(avg: number, minRating: number | null, completedCount: number): boolean {
  if (minRating == null) return true;
  if (completedCount === 0 || avg <= 0) return false;
  return avg >= minRating;
}

export function getHelperRank(input: ReputationInput): HelperRankDef {
  const { completedCount, averageRating } = input;
  let current = HELPER_RANKS[0];
  for (const rank of HELPER_RANKS) {
    if (completedCount < rank.minServices) break;
    if (!meetsRating(averageRating, rank.minRating, completedCount)) break;
    current = rank;
  }
  return current;
}

export function getClientRank(input: ReputationInput): ClientRankDef {
  const { completedCount, averageRating } = input;
  let current = CLIENT_RANKS[0];
  for (const rank of CLIENT_RANKS) {
    if (completedCount < rank.minOrders) break;
    if (!meetsRating(averageRating, rank.minRating, completedCount)) break;
    current = rank;
  }
  return current;
}

export function reputationFromProfile(
  role: 'client' | 'helper',
  profile: { rating?: number | null; jobsCompleted?: number | null },
): ReputationInput {
  return {
    completedCount: profile.jobsCompleted ?? 0,
    averageRating: profile.rating ?? 0,
  };
}

export function getRankForRole(role: 'client' | 'helper', input: ReputationInput): HelperRankDef | ClientRankDef {
  return role === 'helper' ? getHelperRank(input) : getClientRank(input);
}

/** Enough completed history to show a rank badge without misleading "novo" defaults. */
export function hasRankableStats(input: ReputationInput): boolean {
  return input.completedCount > 0;
}

export function countCompletedForHelper(
  helperId: string,
  applications: { helperId: string; status: string }[],
): number {
  return applications.filter((a) => a.helperId === helperId && a.status === 'completed').length;
}

export function countCompletedForClient(
  clientId: string,
  jobs: { clientId: string; status: string }[],
): number {
  return jobs.filter((j) => j.clientId === clientId && j.status === 'completed').length;
}
