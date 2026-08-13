/**
 * Etapa 7 — Limpeza final, validação de heroes, tutorial e ausência de mock.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HELPER_LEVELS } from '@/gamification/config/helperLevels';
import { CLIENT_LEVELS } from '@/gamification/config/clientLevels';
import { KNOWN_HERO_KEYS, resolveHeroKey } from '@/gamification/config/heroKeys';
import { getGamificationTutorialCards } from '@/gamification/config/gamificationTutorialContent';

const EXPECTED_HERO_KEYS = [
  'client_novo',
  'client_confiavel',
  'client_ouro',
  'client_vip',
  'client_elite',
  'helper_novo',
  'helper_confiavel',
  'helper_profissional',
  'helper_elite',
  'helper_top_helper',
  'helper_lenda',
] as const;

describe('Etapa 7 — 11 heroes registradas', () => {
  it('configs definem exatamente 11 hero keys únicas', () => {
    const keys = [...HELPER_LEVELS, ...CLIENT_LEVELS].map((level) => level.heroKey);
    expect(keys).toHaveLength(11);
    expect(new Set(keys).size).toBe(11);
    expect([...KNOWN_HERO_KEYS].sort()).toEqual([...EXPECTED_HERO_KEYS].sort());
  });

  it('hero lazy registry cobre todas as hero keys', async () => {
    const src = await readFile(resolve('src/gamification/hero/heroLazyRegistry.tsx'), 'utf8');
    for (const key of EXPECTED_HERO_KEYS) {
      expect(src).toContain(`${key}:`);
    }
  });

  it('DynamicHeroRenderer não importa heroes eager', async () => {
    const src = await readFile(
      resolve('src/gamification/components/DynamicHeroRenderer.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/from '@\/components\/hero\//);
    expect(src).toContain('GamificationHeroGate');
  });

  it('resolveHeroKey retorna uma única key válida por nível', () => {
    for (const level of [...HELPER_LEVELS, ...CLIENT_LEVELS]) {
      const userType = level.heroKey.startsWith('helper_') ? 'helper' : 'client';
      expect(resolveHeroKey(userType, level.heroKey)).toBe(level.heroKey);
    }
  });
});

describe('Etapa 7 — tutorial alinhado às regras reais', () => {
  it('helper menciona response_rate 70% para Profissional', () => {
    const cards = getGamificationTutorialCards('helper');
    const prof = cards.find((c) => c.id === 'profissional');
    expect(prof?.body).toContain('70%');
  });

  it('helper menciona zero reclamações confirmadas para Lenda', () => {
    const cards = getGamificationTutorialCards('helper');
    const lenda = cards.find((c) => c.id === 'lenda');
    expect(lenda?.body).toMatch(/zero reclamações confirmadas/i);
  });

  it('cliente Elite menciona response_rate 80%', () => {
    const cards = getGamificationTutorialCards('client');
    const elite = cards.find((c) => c.id === 'elite');
    expect(elite?.body).toContain('80%');
  });

  it('tutorial menciona progressão sequencial', () => {
    const helperCards = getGamificationTutorialCards('helper');
    const clientCards = getGamificationTutorialCards('client');
    expect(helperCards.some((c) => /sequencial/i.test(c.body))).toBe(true);
    expect(clientCards.some((c) => /sequencial/i.test(c.body))).toBe(true);
  });
});

describe('Etapa 7 — painel mock removido', () => {
  it('HelperDashboard não usa MOCK_HELPER_SCORE', async () => {
    const src = await readFile(resolve('src/pages/helper/HelperDashboard.tsx'), 'utf8');
    expect(src).not.toContain('HelperScorePanel');
    expect(src).not.toContain('MOCK_HELPER_SCORE');
    expect(src).toContain('GamificationProgressCard');
  });

  it('ProfileDashboardPage expõe gamificação real (ProfilePage re-export)', async () => {
    const reexport = await readFile(resolve('src/pages/profile/ProfilePage.tsx'), 'utf8');
    expect(reexport).not.toContain('HelperScorePanel');
    expect(reexport).toContain('ProfileDashboardPage');
    const src = await readFile(resolve('src/pages/profile/ProfileDashboardPage.tsx'), 'utf8');
    expect(src).not.toContain('HelperScorePanel');
    expect(src).not.toContain('MOCK_HELPER_SCORE');
    expect(src).toContain('ProfileGamificationSection');
  });

  it('HelperPublicProfileView não exibe painel mock', async () => {
    const src = await readFile(resolve('src/components/features/HelperPublicProfileView.tsx'), 'utf8');
    expect(src).not.toContain('HelperScorePanel');
    expect(src).not.toContain('MOCK_HELPER_SCORE');
  });
});

describe('Etapa 7 — API ignora adulteração do front', () => {
  it('recalculate.ts ignora userId, score e levelKey do body', async () => {
    const src = await readFile(resolve('api/gamification/recalculate.ts'), 'utf8');
    expect(src).toContain('void body.userId');
    expect(src).toContain('void body.score');
    expect(src).toContain('void body.levelKey');
    expect(src).toContain('getAuthedUserId');
  });

  it('me.ts exige autenticação via token', async () => {
    const src = await readFile(resolve('api/gamification/me.ts'), 'utf8');
    expect(src).toContain('getAuthedUserId');
  });
});
