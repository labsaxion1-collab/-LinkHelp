import { describe, expect, it } from 'vitest';
import { apiResponseToRecord } from '@/gamification/services/gamificationApiClient';

describe('apiResponseToRecord', () => {
  it('normaliza resposta antiga da API sem stats', () => {
    const record = apiResponseToRecord({
      score: 120,
      levelKey: 'confiavel',
      heroKey: 'helper_confiavel',
      progressPercent: 20,
      pointsToNextLevel: 130,
      missingRequirements: ['Taxa de resposta 70%'],
      updatedAt: '2026-07-06T00:00:00.000Z',
    });

    expect(record.stats.profilePct).toBe(0);
    expect(record.stats.totalCompleted).toBe(0);
    expect(record.levelKey).toBe('confiavel');
  });

  it('preserva stats quando a API retorna payload completo', () => {
    const record = apiResponseToRecord({
      userId: 'user-1',
      userType: 'helper',
      score: 300,
      levelKey: 'profissional',
      heroKey: 'helper_profissional',
      stats: {
        totalCompleted: 3,
        avgRating: 4.6,
        responseRate: 75,
        cancelCount: 0,
        complaintCount: 0,
        profilePct: 100,
        applicationsCount: 5,
        publishedOrdersCount: 0,
        hireRate: 40,
      },
      progressPercent: 20,
      pointsToNextLevel: 200,
      missingRequirements: [],
      currentLevel: {
        key: 'profissional',
        name: 'Profissional',
        heroKey: 'helper_profissional',
        scoreMin: 250,
        scoreMax: 499,
        requirements: {},
      },
      nextLevel: null,
      updatedAt: '2026-07-06T00:00:00.000Z',
    });

    expect(record.stats.profilePct).toBe(100);
    expect(record.stats.totalCompleted).toBe(3);
  });
});
