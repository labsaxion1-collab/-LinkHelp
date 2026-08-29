import { describe, expect, it } from 'vitest';
import type { GamificationStats } from '@/gamification/types/gamification';
import { computeClientScore, computeHelperScore } from '@/gamification/engines/scoreEngine';
import {
  determineLevel,
  determineSequentialLevel,
  findHighestEligibleLevel,
  getCurrentLevelConfig,
  meetsRequirements,
} from '@/gamification/engines/levelEngine';
import { CLIENT_LEVELS } from '@/gamification/config/clientLevels';
import { formatProgressSubtitle, getProgressToNextLevel } from '@/gamification/engines/progressEngine';

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
  it('helper recém-criado começa com score 0 (sem bônus de cancelamento)', () => {
    expect(computeHelperScore(baseStats)).toBe(0);
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
  it('cliente recém-criado começa com score 0 (sem bônus de cancelamento)', () => {
    expect(computeClientScore(baseStats)).toBe(0);
  });

  it('score nunca passa de 1000', () => {
    expect(computeClientScore(maxedStats)).toBeLessThanOrEqual(1000);
  });

  it('publicar pedidos sozinho NÃO aumenta o score de confiança do cliente', () => {
    const sem = computeClientScore(baseStats);
    const com = computeClientScore({ ...baseStats, publishedOrdersCount: 3 });
    expect(com).toBe(sem);
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

  it('score 250 + 3 serviços + nota 4.5 + resposta 70% = profissional (a partir de confiável)', () => {
    const stats = { ...baseStats, totalCompleted: 3, avgRating: 4.5, responseRate: 70 };
    expect(determineSequentialLevel('helper', 'confiavel', 250, stats)).toBe('profissional');
  });

  it('score 500 sem 10 serviços NÃO vira elite', () => {
    const stats = { ...baseStats, totalCompleted: 5, avgRating: 4.8, responseRate: 90 };
    expect(findHighestEligibleLevel('helper', 500, stats)).not.toBe('elite');
  });

  it('score 500 + requisitos elite = elite (a partir de profissional)', () => {
    const stats = { ...baseStats, totalCompleted: 10, avgRating: 4.7, responseRate: 80 };
    expect(determineSequentialLevel('helper', 'profissional', 500, stats)).toBe('elite');
  });

  it('score 900 + requisitos lenda = lenda (a partir de top_helper)', () => {
    const stats = { ...baseStats, totalCompleted: 50, avgRating: 4.9, responseRate: 90 };
    expect(determineSequentialLevel('helper', 'top_helper', 900, stats)).toBe('lenda');
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
  it('score 100 + perfil 80% + 1 pedido publicado SEM conclusão permanece novo', () => {
    const stats = { ...baseStats, profilePct: 80, publishedOrdersCount: 1, totalCompleted: 0 };
    expect(determineLevel('client', 100, stats)).toBe('novo');
  });

  it('score 100 + perfil 80% + 1 serviço concluído = confiável', () => {
    const stats = { ...baseStats, profilePct: 80, publishedOrdersCount: 1, totalCompleted: 1 };
    expect(determineLevel('client', 100, stats)).toBe('confiavel');
  });

  it('cadastro/perfil completo sem conclusão permanece novo mesmo com score 100', () => {
    const stats = { ...baseStats, profilePct: 100, publishedOrdersCount: 0, totalCompleted: 0 };
    expect(determineLevel('client', 100, stats)).toBe('novo');
  });

  it('score 250 com 3 cancelamentos NÃO vira ouro', () => {
    const stats = { ...baseStats, totalCompleted: 3, avgRating: 4.5, cancelCount: 3 };
    expect(determineLevel('client', 250, stats)).not.toBe('ouro');
  });

  it('score 750 + requisitos elite COM response_rate 80 (a partir de vip)', () => {
    const stats = {
      ...baseStats,
      totalCompleted: 25,
      avgRating: 4.9,
      responseRate: 80,
      cancelCount: 1,
    };
    expect(determineSequentialLevel('client', 'vip', 750, stats)).toBe('elite');
  });

  it('score 750 + requisitos elite SEM response_rate 80 NÃO vira elite', () => {
    const stats = {
      ...baseStats,
      totalCompleted: 25,
      avgRating: 4.9,
      responseRate: 70,
      cancelCount: 1,
    };
    expect(determineSequentialLevel('client', 'vip', 750, stats)).toBe('vip');
  });
});

describe('Etapa 1 — correções de produção', () => {
  it('usuário novo não ganha pontos por baixo cancelamento (helper)', () => {
    expect(computeHelperScore(baseStats)).toBe(0);
  });

  it('usuário novo não ganha pontos por baixo cancelamento (cliente)', () => {
    expect(computeClientScore(baseStats)).toBe(0);
  });

  it('helper com serviços concluídos ganha bônus de baixo cancelamento', () => {
    // 15 pts (1 serviço) + 100 pts (0 cancelamentos com histórico)
    expect(computeHelperScore({ ...baseStats, totalCompleted: 1 })).toBe(115);
  });

  it('cliente com serviços concluídos ganha bônus de baixo cancelamento', () => {
    // 15 pts (1 serviço) + 150 pts (0 cancelamentos com histórico)
    expect(computeClientScore({ ...baseStats, totalCompleted: 1 })).toBe(165);
  });

  it('Cliente Ouro não pula direto para Elite', () => {
    const stats = {
      ...baseStats,
      totalCompleted: 25,
      avgRating: 4.9,
      responseRate: 90,
      cancelCount: 0,
    };
    expect(determineSequentialLevel('client', 'ouro', 750, stats)).toBe('vip');
    expect(findHighestEligibleLevel('client', 750, stats)).toBe('elite');
  });

  it('Helper Confiável não pula direto para Lenda', () => {
    const stats = {
      ...baseStats,
      totalCompleted: 50,
      avgRating: 4.9,
      responseRate: 95,
      profilePct: 100,
      applicationsCount: 10,
      hireRate: 40,
    };
    expect(determineSequentialLevel('helper', 'confiavel', 950, stats)).toBe('profissional');
    expect(findHighestEligibleLevel('helper', 950, stats)).toBe('lenda');
  });

  it('Cliente Elite exige response_rate >= 80', () => {
    const stats = {
      ...baseStats,
      totalCompleted: 25,
      avgRating: 4.9,
      responseRate: 79,
      cancelCount: 0,
    };
    const eliteRequirements = CLIENT_LEVELS.find((level) => level.key === 'elite')!.requirements;
    expect(meetsRequirements(stats, eliteRequirements)).toBe(false);
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
    const result = getProgressToNextLevel('helper', 950, stats, 'lenda');
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
    const result = getProgressToNextLevel('helper', 200, stats, 'confiavel');
    expect(result.nextLevel?.key).toBe('profissional');
    expect(result.missingRequirements.length).toBeGreaterThan(0);
  });

  it('pointsToNext reflete a distância até o score mínimo do próximo nível', () => {
    const stats = { ...baseStats, profilePct: 80, applicationsCount: 1 };
    const result = getProgressToNextLevel('helper', 200, stats, 'confiavel');
    expect(result.pointsToNext).toBe(50);
  });
});

describe('formatProgressSubtitle', () => {
  it('mostra pontos ok e requisito faltante quando pointsToNext é 0', () => {
    const progress = {
      pointsToNext: 0,
      missingRequirements: ['1 pedido(s) publicado(s) restante(s)'],
    };

    expect(formatProgressSubtitle(progress, 'hero')).toBe(
      'Pontos ok — falta: 1 pedido(s) publicado(s) restante(s)',
    );
    expect(formatProgressSubtitle(progress, 'card')).toBe(
      'Pontos ok — falta: 1 pedido(s) publicado(s) restante(s)',
    );
  });

  it('mantém texto de pontos quando ainda faltam pontos', () => {
    const progress = {
      pointsToNext: 130,
      missingRequirements: ['1 pedido(s) publicado(s) restante(s)'],
    };

    expect(formatProgressSubtitle(progress, 'hero')).toBe(
      'Mais 130 pontos para alcançar o próximo nível',
    );
    expect(formatProgressSubtitle(progress, 'card')).toBe('130 pts restantes');
  });
});
