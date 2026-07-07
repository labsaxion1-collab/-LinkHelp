import type { GamificationLevel } from '../types/gamification';

/** Níveis do cliente, ordenados do mais baixo para o mais alto. */
export const CLIENT_LEVELS: GamificationLevel[] = [
  {
    key: 'novo',
    name: 'Novo Cliente',
    heroKey: 'client_novo',
    scoreMin: 0,
    scoreMax: 99,
    requirements: {},
  },
  {
    key: 'confiavel',
    name: 'Cliente Confiável',
    heroKey: 'client_confiavel',
    scoreMin: 100,
    scoreMax: 249,
    requirements: {
      minProfilePct: 80,
      minPublishedOrders: 1,
    },
  },
  {
    key: 'ouro',
    name: 'Cliente Ouro',
    heroKey: 'client_ouro',
    scoreMin: 250,
    scoreMax: 499,
    requirements: {
      minTotalCompleted: 3,
      minAvgRating: 4.5,
      maxCancels: 2,
    },
  },
  {
    key: 'vip',
    name: 'Cliente VIP',
    heroKey: 'client_vip',
    scoreMin: 500,
    scoreMax: 749,
    requirements: {
      minTotalCompleted: 10,
      minAvgRating: 4.7,
      minResponseRate: 70,
      maxCancels: 3,
    },
  },
  {
    key: 'elite',
    name: 'Cliente Elite',
    heroKey: 'client_elite',
    scoreMin: 750,
    scoreMax: 1000,
    requirements: {
      minTotalCompleted: 25,
      minAvgRating: 4.9,
      minResponseRate: 80,
      maxComplaints: 0,
      maxCancels: 1,
    },
  },
];
