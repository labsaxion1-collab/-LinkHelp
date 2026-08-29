/**
 * Etapa 6 — Testes de fechamento da gamificação.
 *
 * Cobre os 12 cenários do plano: progressão de níveis do helper (1–5),
 * progressão do cliente (6–9), resolução única de hero + fallback (10–11)
 * e requisitos faltantes exibidos pelo ProgressCard (12).
 */
import { describe, expect, it } from 'vitest';
import type { GamificationStats } from '@/gamification/types/gamification';
import { computeClientScore, computeHelperScore } from '@/gamification/engines/scoreEngine';
import { determineLevel, determineSequentialLevel } from '@/gamification/engines/levelEngine';
import { getProgressToNextLevel } from '@/gamification/engines/progressEngine';
import { HELPER_LEVELS } from '@/gamification/config/helperLevels';
import { CLIENT_LEVELS } from '@/gamification/config/clientLevels';
import {
  DEFAULT_HERO_KEY,
  KNOWN_HERO_KEYS,
  resolveHeroKey,
} from '@/gamification/config/heroKeys';
import { MEDAL_MAP } from '@/gamification/config/gamificationMedals';

const emptyStats: GamificationStats = {
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

describe('Etapa 6 — progressão de níveis do helper', () => {
  it('1. helper novo começa como "novo"', () => {
    const score = computeHelperScore(emptyStats);
    expect(determineLevel('helper', score, emptyStats)).toBe('novo');
    expect(score).toBe(0);
  });

  it('2. helper com score 100 e requisitos vira "confiavel"', () => {
    const stats = { ...emptyStats, profilePct: 80, applicationsCount: 1 };
    expect(determineLevel('helper', 100, stats)).toBe('confiavel');
  });

  it('3. helper com score 250 sem 3 serviços NÃO vira "profissional"', () => {
    const stats = { ...emptyStats, profilePct: 80, applicationsCount: 1, totalCompleted: 2 };
    expect(determineLevel('helper', 250, stats)).not.toBe('profissional');
    expect(determineLevel('helper', 250, stats)).toBe('confiavel');
  });

  it('4. helper com score 500 e requisitos vira "elite" (a partir de profissional)', () => {
    const stats = {
      ...emptyStats,
      totalCompleted: 10,
      avgRating: 4.7,
      responseRate: 80,
      complaintCount: 0,
    };
    expect(determineSequentialLevel('helper', 'profissional', 500, stats)).toBe('elite');
  });

  it('5. helper com score 900 e requisitos vira "lenda" (a partir de top_helper)', () => {
    const stats = {
      ...emptyStats,
      totalCompleted: 50,
      avgRating: 4.9,
      responseRate: 90,
      complaintCount: 0,
    };
    expect(determineSequentialLevel('helper', 'top_helper', 900, stats)).toBe('lenda');
  });
});

describe('Etapa 6 — progressão de níveis do cliente', () => {
  it('6. cliente novo começa como "novo"', () => {
    const score = computeClientScore(emptyStats);
    expect(determineLevel('client', score, emptyStats)).toBe('novo');
    expect(score).toBe(0);
  });

  it('7. cliente com score 100 e 1 serviço concluído vira "confiavel"', () => {
    const stats = { ...emptyStats, profilePct: 80, publishedOrdersCount: 1, totalCompleted: 1 };
    expect(determineLevel('client', 100, stats)).toBe('confiavel');
  });

  it('7b. cliente com score 100 e só publicação permanece "novo"', () => {
    const stats = { ...emptyStats, profilePct: 80, publishedOrdersCount: 1, totalCompleted: 0 };
    expect(determineLevel('client', 100, stats)).toBe('novo');
  });

  it('8. cliente com score 250 e requisitos vira "ouro" (a partir de confiável)', () => {
    const stats = { ...emptyStats, totalCompleted: 3, avgRating: 4.5, cancelCount: 0 };
    expect(determineSequentialLevel('client', 'confiavel', 250, stats)).toBe('ouro');
  });

  it('9. cliente com score 750 e requisitos vira "elite" (a partir de vip)', () => {
    const stats = {
      ...emptyStats,
      totalCompleted: 25,
      avgRating: 4.9,
      complaintCount: 0,
      cancelCount: 1,
      responseRate: 80,
    };
    expect(determineSequentialLevel('client', 'vip', 750, stats)).toBe('elite');
  });
});

describe('Etapa 6 — resolução da hero (DynamicHeroRenderer)', () => {
  it('10. resolve exatamente UMA hero key válida por vez', () => {
    for (const level of [...HELPER_LEVELS, ...CLIENT_LEVELS]) {
      const userType = level.heroKey.startsWith('helper_') ? 'helper' : 'client';
      const resolved = resolveHeroKey(userType, level.heroKey);
      expect(resolved).toBe(level.heroKey);
      expect(typeof resolved).toBe('string');
      expect(KNOWN_HERO_KEYS).toContain(resolved);
    }
  });

  it('10b. hero keys dos níveis são únicas (nenhuma hero duplicada)', () => {
    const keys = [...HELPER_LEVELS, ...CLIENT_LEVELS].map((level) => level.heroKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('11. fallback funciona quando não existe gamification data', () => {
    expect(resolveHeroKey('helper', null)).toBe(DEFAULT_HERO_KEY.helper);
    expect(resolveHeroKey('helper', undefined)).toBe('helper_novo');
    expect(resolveHeroKey('client', null)).toBe(DEFAULT_HERO_KEY.client);
    expect(resolveHeroKey('client', undefined)).toBe('client_novo');
  });

  it('11b. hero key desconhecida (dados antigos) cai no nível 1 do papel', () => {
    expect(resolveHeroKey('helper', 'hero_inexistente')).toBe('helper_novo');
    expect(resolveHeroKey('client', 'helper_lenda_azul')).toBe('client_novo');
  });

  it('toda hero key conhecida tem medalha no MEDAL_MAP', () => {
    for (const key of KNOWN_HERO_KEYS) {
      expect(MEDAL_MAP[key], `medalha ausente para ${key}`).toBeTruthy();
    }
  });
});

describe('Etapa 6 — requisitos faltantes (ProgressCard)', () => {
  it('12. lista corretamente o que falta para o próximo nível', () => {
    // Helper confiável (score 200) sem serviços concluídos nem nota.
    const stats = { ...emptyStats, profilePct: 80, applicationsCount: 1 };
    const progress = getProgressToNextLevel('helper', 200, stats, 'confiavel');

    expect(progress.currentLevel.key).toBe('confiavel');
    expect(progress.nextLevel?.key).toBe('profissional');
    expect(progress.missingRequirements).toContain('3 serviço(s) restante(s)');
    expect(progress.missingRequirements).toContain('Nota mínima 4.5');
    expect(progress.missingRequirements).toContain('Taxa de resposta 70%');
  });

  it('12b. requisitos já cumpridos não aparecem como faltantes', () => {
    const stats = {
      ...emptyStats,
      profilePct: 80,
      applicationsCount: 1,
      totalCompleted: 3,
      avgRating: 4.6,
    };
    const progress = getProgressToNextLevel('helper', 200, stats, 'confiavel');
    expect(progress.missingRequirements).not.toContain('3 serviço(s) restante(s)');
    expect(progress.missingRequirements).not.toContain('Nota mínima 4.5');
    expect(progress.missingRequirements).toContain('Taxa de resposta 70%');
  });

  it('12c. no nível máximo não há requisitos faltantes', () => {
    const stats = {
      ...emptyStats,
      totalCompleted: 60,
      avgRating: 4.9,
      responseRate: 95,
      hireRate: 40,
      profilePct: 100,
      applicationsCount: 10,
    };
    const progress = getProgressToNextLevel('helper', 950, stats, 'lenda');
    expect(progress.nextLevel).toBeNull();
    expect(progress.missingRequirements).toHaveLength(0);
  });
});
