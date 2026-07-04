import type { GamificationLevel } from '../types/gamification';

/** Níveis do helper, ordenados do mais baixo para o mais alto. */
export const HELPER_LEVELS: GamificationLevel[] = [
  {
    key: 'novo',
    name: 'Novo Helper',
    heroKey: 'helper_novo',
    scoreMin: 0,
    scoreMax: 99,
    requirements: {},
  },
  {
    key: 'confiavel',
    name: 'Confiável',
    heroKey: 'helper_confiavel',
    scoreMin: 100,
    scoreMax: 249,
    requirements: {
      minProfilePct: 80,
      minApplications: 1,
    },
  },
  {
    key: 'profissional',
    name: 'Profissional',
    heroKey: 'helper_profissional',
    scoreMin: 250,
    scoreMax: 499,
    requirements: {
      minTotalCompleted: 3,
      minAvgRating: 4.5,
      minResponseRate: 70,
    },
  },
  {
    key: 'elite',
    name: 'Elite',
    heroKey: 'helper_elite',
    scoreMin: 500,
    scoreMax: 749,
    requirements: {
      minTotalCompleted: 10,
      minAvgRating: 4.7,
      minResponseRate: 80,
      maxComplaints: 2,
    },
  },
  {
    key: 'top_helper',
    name: 'Top Helper',
    heroKey: 'helper_top_helper',
    scoreMin: 750,
    scoreMax: 899,
    requirements: {
      minTotalCompleted: 25,
      minAvgRating: 4.8,
      minResponseRate: 90,
      minHireRate: 30,
    },
  },
  {
    key: 'lenda',
    name: 'Lenda LinkHelp',
    heroKey: 'helper_lenda',
    scoreMin: 900,
    scoreMax: 1000,
    requirements: {
      minTotalCompleted: 50,
      minAvgRating: 4.9,
      minResponseRate: 90,
      maxComplaints: 0,
    },
  },
];
