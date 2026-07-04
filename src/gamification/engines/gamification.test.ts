import { describe, expect, it } from 'vitest';
import type { GamificationStats } from '@/gamification/types/gamification';
import { computeClientScore, computeHelperScore } from '@/gamification/engines/scoreEngine';
import { determineLevel, getCurrentLevelConfig } from '@/gamification/engines/levelEngine';
import { getProgressToNextLevel } from '@/gamification/engines/progressEngine';

const baseStats: GamificationStats = {
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

const maxedStats: GamificationStats = {
  totalCompleted: 999,
  avgRating: 5,
  responseRate: 100,
  cancelCount: 0,
  complaintCount: 0,
  profilePct: 100,
  applicationsCount: 50,
  publishedOrdersCount: 50,
  hireRate: 100,
};

describe('computeHelperScore — escala 0–1000', () => {
  it('helper recém-criado ganha apenas o crédito de baixo cancelamento', () => {
    expect(computeHelperScore(baseStats)).toBe(100);
  });

  it('score nunca passa de 1000', () => {
    expect(computeHelperScore(maxedStats)).toBeLessThanOrEqual(1000);
  });

  it('score nunca fica abaixo de 0', () => {
    expect(
      computeHelperScore({ ...baseStats, cancelCount: 99, complaintCount: 99 }),
    ).toBeGreaterThanOrEqual(0);
  });

  it('reclamações reduzem o score', () => {
    const sem = computeHelperScore({ ...baseStats, totalCompleted: 10, avgRating: 4.8 });
    const com = computeHelperScore({
      ...baseStats,
      totalCompleted: 10,
      avgRating: 4.8,
      complaintCount: 2,
    });
    expect(com).toBeLessThan(sem);
  });

  it('cancelamentos reduzem o score', () => {
    const sem = computeHelperScore({ ...baseStats, totalCompleted: 5 });
    const com = computeHelperScore({ ...baseStats, totalCompleted: 5, cancelCount: 4 });
    expect(com).toBeLessThan(sem);
  });
});

describe('computeClientScore — escala 0–1000', () => {
  it('cliente recém-criado ganha apenas o crédito de baixo cancelamento', () => {
    expect(computeClientScore(baseStats)).toBe(150);
  });

  it('score nunca passa de 1000', () => {
    expect(computeClientScore(maxedStats)).toBeLessThanOrEqual(1000);
  });

  it('pedidos publicados aumentam o histórico positivo', () => {
    const sem = computeClientScore(baseStats);
    const com = computeClientScore({ ...baseStats, publishedOrdersCount: 3 });
    expect(com).toBeGreaterThan(sem);
  });
});

describe('determineLevel — helper: score mínimo E requisitos', () => {
  it('score 0 = novo', () => {
    expect(determineLevel('helper', 0, baseStats)).toBe('novo');
  });

  it('score 250 sem serviços NÃO vira profissional', () => {
    const stats = { ...baseStats, profilePct: 80, applicationsCount: 1 };
    expect(determineLevel('helper', 250, stats)).toBe('confiavel');
  });

  it('score 100 sem perfil 80% NÃO vira confiável', () => {
    expect(determineLevel('helper', 100, baseStats)).toBe('novo');
  });

  it('score 250 + 3 serviços + nota 4.5 + resposta 70% = profissional', () => {
    const stats = { ...baseStats, totalCompleted: 3, avgRating: 4.5, responseRate: 70 };
    expect(determineLevel('helper', 250, stats)).toBe('profissional');
  });

  it('score 500 sem 10 serviços NÃO vira elite', () => {
    const stats = { ...baseStats, totalCompleted: 5, avgRating: 4.8, responseRate: 90 };
    expect(determineLevel('helper', 500, stats)).not.toBe('elite');
  });

  it('score 500 + requisitos elite = elite', () => {
    const stats = { ...baseStats, totalCompleted: 10, avgRating: 4.7, responseRate: 80 };
    expect(determineLevel('helper', 500, stats)).toBe('elite');
  });

  it('score 900 + requisitos lenda = lenda', () => {
    const stats = { ...baseStats, totalCompleted: 50, avgRating: 4.9, responseRate: 90 };
    expect(determineLevel('helper', 900, stats)).toBe('lenda');
  });

  it('lenda com 1 reclamação NÃO mantém lenda', () => {
    const stats = {
      ...baseStats,
      totalCompleted: 60,
      avgRating: 4.9,
      responseRate: 95,
      complaintCount: 1,
    };
    expect(determineLevel('helper', 950, stats)).not.toBe('lenda');
  });
});

describe('determineLevel — cliente', () => {
  it('score 100 + perfil 80% + 1 pedido publicado = confiável', () => {
    const stats = { ...baseStats, profilePct: 80, publishedOrdersCount: 1 };
    expect(determineLevel('client', 100, stats)).toBe('confiavel');
  });

  it('score 250 com 3 cancelamentos NÃO vira ouro', () => {
    const stats = { ...baseStats, totalCompleted: 3, avgRating: 4.5, cancelCount: 3 };
    expect(determineLevel('client', 250, stats)).not.toBe('ouro');
  });

  it('score 750 + requisitos elite = elite', () => {
    const stats = { ...baseStats, totalCompleted: 25, avgRating: 4.9, cancelCount: 1 };
    expect(determineLevel('client', 750, stats)).toBe('elite');
  });
});

describe('getCurrentLevelConfig', () => {
  it('retorna o config correto por chave', () => {
    expect(getCurrentLevelConfig('helper', 'top_helper').heroKey).toBe('helper_top_helper');
    expect(getCurrentLevelConfig('client', 'vip').heroKey).toBe('client_vip');
  });

  it('faz fallback para o primeiro nível se a chave não existe no papel', () => {
    expect(getCurrentLevelConfig('client', 'top_helper').key).toBe('novo');
  });
});

describe('getProgressToNextLevel', () => {
  it('nível máximo não tem próximo nível e retorna 100%', () => {
    const stats = {
      ...baseStats,
      totalCompleted: 60,
      avgRating: 4.9,
      responseRate: 92,
      hireRate: 40,
      profilePct: 100,
      applicationsCount: 10,
    };
    const result = getProgressToNextLevel('helper', 950, stats);
    expect(result.nextLevel).toBeNull();
    expect(result.progressPercent).toBe(100);
  });

  it('progresso nunca passa de 99% antes de subir de nível', () => {
    const stats = { ...baseStats, totalCompleted: 3, avgRating: 4.6, responseRate: 75 };
    const result = getProgressToNextLevel('helper', 499, stats);
    expect(result.progressPercent).toBeLessThanOrEqual(99);
  });

  it('lista requisitos que faltam para o próximo nível', () => {
    const stats = { ...baseStats, profilePct: 80, applicationsCount: 1 };
    const result = getProgressToNextLevel('helper', 200, stats);
    expect(result.nextLevel?.key).toBe('profissional');
    expect(result.missingRequirements.length).toBeGreaterThan(0);
  });

  it('pointsToNext reflete a distância até o score mínimo do próximo nível', () => {
    const stats = { ...baseStats, profilePct: 80, applicationsCount: 1 };
    const result = getProgressToNextLevel('helper', 200, stats);
    expect(result.pointsToNext).toBe(50);
  });
});
