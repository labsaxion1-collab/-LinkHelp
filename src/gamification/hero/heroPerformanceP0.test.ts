/**
 * P0 — me antes de recalculate; recalculate em background; bundle sem decode bloqueante.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getGamificationRecalculateInflightCount,
  isGamificationRecordForUser,
  normalizeGamificationRecordUserId,
  resetGamificationRecalculateInflightForTests,
  scheduleGamificationRecalculate,
} from '@/gamification/hero/gamificationBackgroundRecalculate';
import {
  beginGamificationSession,
  commitGamificationSuccess,
  getGamificationSnapshot,
  resetGamificationStoreForTests,
} from '@/gamification/state/gamificationUserStore';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';
import { EMPTY_GAMIFICATION_STATS } from '@/gamification/services/gamificationStatsAdapter';

vi.mock('@/gamification/services/gamificationApiClient', () => ({
  requestGamificationRecalculate: vi.fn(),
}));

import { requestGamificationRecalculate } from '@/gamification/services/gamificationApiClient';
import { loadHeroBundle } from '@/gamification/hero/heroBundleLoader';
import * as heroLazyRegistry from '@/gamification/hero/heroLazyRegistry';
import * as heroAssetUrlLoaders from '@/gamification/hero/heroAssetUrlLoaders';
import * as heroImagePreload from '@/gamification/hero/heroImagePreload';

function sampleRecord(overrides: Partial<UserGamificationRecord> = {}): UserGamificationRecord {
  return {
    userId: 'user-a',
    userType: 'client',
    score: 10,
    levelKey: 'client_confiavel',
    heroKey: 'client_confiavel',
    stats: { ...EMPTY_GAMIFICATION_STATS },
    progressPercent: 35,
    pointsToNextLevel: 280,
    missingRequirements: [],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('gamificationBackgroundRecalculate', () => {
  afterEach(() => {
    resetGamificationRecalculateInflightForTests();
    resetGamificationStoreForTests();
    vi.mocked(requestGamificationRecalculate).mockReset();
  });

  it('isGamificationRecordForUser rejeita userType ou userId incorreto', () => {
    const record = sampleRecord({ userId: 'other' });
    expect(isGamificationRecordForUser(record, 'user-a', 'client')).toBe(false);
    expect(isGamificationRecordForUser(sampleRecord(), 'user-a', 'helper')).toBe(false);
    expect(isGamificationRecordForUser(sampleRecord(), 'user-a', 'client')).toBe(true);
  });

  it('recalculate em background atualiza store quando generation válida', async () => {
    const userId = 'user-a';
    const generation = beginGamificationSession(userId, 'client');
    commitGamificationSuccess(userId, 'client', generation, sampleRecord());

    vi.mocked(requestGamificationRecalculate).mockResolvedValue(
      sampleRecord({ heroKey: 'client_ouro', levelKey: 'client_ouro' }),
    );

    scheduleGamificationRecalculate(userId, 'client', generation);
    await vi.waitFor(() => {
      expect(getGamificationSnapshot(userId, 'client').record?.heroKey).toBe('client_ouro');
    });
  });

  it('falha do recalculate não remove record do me', async () => {
    const userId = 'user-a';
    const generation = beginGamificationSession(userId, 'client');
    commitGamificationSuccess(userId, 'client', generation, sampleRecord());

    vi.mocked(requestGamificationRecalculate).mockRejectedValue(new Error('fail'));

    scheduleGamificationRecalculate(userId, 'client', generation);
    await new Promise((r) => setTimeout(r, 20));

    expect(getGamificationSnapshot(userId, 'client').record?.heroKey).toBe('client_confiavel');
  });

  it('não agenda dois recalculates inflight para a mesma conta', async () => {
    vi.mocked(requestGamificationRecalculate).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(sampleRecord()), 50)),
    );

    scheduleGamificationRecalculate('user-a', 'client', 1);
    scheduleGamificationRecalculate('user-a', 'client', 1);
    expect(getGamificationRecalculateInflightCount()).toBe(1);
    await new Promise((r) => setTimeout(r, 60));
  });

  it('ignora record recalculado de outra conta', async () => {
    const userId = 'user-a';
    const generation = beginGamificationSession(userId, 'client');
    commitGamificationSuccess(userId, 'client', generation, sampleRecord());

    vi.mocked(requestGamificationRecalculate).mockResolvedValue(
      sampleRecord({ userId: 'user-b', heroKey: 'client_vip' }),
    );

    scheduleGamificationRecalculate(userId, 'client', generation);
    await new Promise((r) => setTimeout(r, 20));

    expect(getGamificationSnapshot(userId, 'client').record?.heroKey).toBe('client_confiavel');
  });

  it('normalizeGamificationRecordUserId preenche userId', () => {
    const normalized = normalizeGamificationRecordUserId(sampleRecord({ userId: '' }), 'user-a');
    expect(normalized.userId).toBe('user-a');
  });
});

describe('loadHeroBundle P0', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('monta Hero sem aguardar preloadImageUrls', async () => {
    const FakeHero = () => null;
    vi.spyOn(heroLazyRegistry, 'loadHeroComponent').mockResolvedValue(FakeHero);
    vi.spyOn(heroAssetUrlLoaders, 'loadHeroAssetUrls').mockResolvedValue({
      essential: ['/bg.png'],
      deferred: ['/p.png'],
    });

    let preloadResolved = false;
    vi.spyOn(heroImagePreload, 'preloadImageUrls').mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            preloadResolved = true;
            resolve();
          }, 200);
        }),
    );

    const start = Date.now();
    const component = await loadHeroBundle('client_confiavel', 'client');
    const elapsed = Date.now() - start;

    expect(component).toBe(FakeHero);
    expect(elapsed).toBeLessThan(150);
    expect(preloadResolved).toBe(false);
  });

  it('preload usa mesmas URLs retornadas pelo loader de assets', async () => {
    const FakeHero = () => null;
    vi.spyOn(heroLazyRegistry, 'loadHeroComponent').mockResolvedValue(FakeHero);
    const essential = ['/assets/bg-roxo.hash.png', '/assets/confiavel.hash.png'];
    vi.spyOn(heroAssetUrlLoaders, 'loadHeroAssetUrls').mockResolvedValue({
      essential,
      deferred: ['/assets/particulas.hash.png'],
    });
    const preloadSpy = vi.spyOn(heroImagePreload, 'preloadImageUrls').mockResolvedValue();

    await loadHeroBundle('client_confiavel', 'client');

    expect(preloadSpy).toHaveBeenCalledWith(essential);
  });
});

describe('GamificationHeroGate — skeleton único', () => {
  it('wrapper progressive sem segundo skeleton interno', async () => {
    const src = await readFile(resolve('src/gamification/hero/GamificationHeroGate.tsx'), 'utf8');
    expect(src).toContain('GamificationHeroSkeleton');
    expect(src).toContain('lh-gamification-hero-progressive');
    expect(src).not.toContain('lh-gamification-hero-mount');
  });
});

describe('useGamification — me antes de recalculate', () => {
  it('hook source agenda scheduleGamificationRecalculate após commit do me', async () => {
    const src = await readFile(resolve('src/gamification/hooks/useGamification.ts'), 'utf8');
    expect(src).toContain('scheduleGamificationRecalculate');
    expect(src).not.toContain('await requestGamificationRecalculate');
  });
});
