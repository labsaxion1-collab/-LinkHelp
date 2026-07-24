import { describe, expect, it } from 'vitest';
import {
  beginGamificationSession,
  commitGamificationSuccess,
  getGamificationSnapshot,
  isGamificationGenerationCurrent,
  resetGamificationStoreForTests,
} from '@/gamification/state/gamificationUserStore';

describe('gamificationUserStore', () => {
  it('keeps confirmed record during SWR revalidation (no skeleton flash)', () => {
    resetGamificationStoreForTests();
    const userId = 'user-a';
    const gen1 = beginGamificationSession(userId, 'client');
    commitGamificationSuccess(userId, 'client', gen1, {
      userId,
      userType: 'client',
      levelKey: 'confiavel',
      heroKey: 'client_confiavel',
      score: 120,
      stats: {},
    } as never);

    const gen2 = beginGamificationSession(userId, 'client');
    const snap = getGamificationSnapshot(userId, 'client');
    expect(gen2).toBeGreaterThan(gen1);
    expect(snap.loading).toBe(false);
    expect(snap.record?.heroKey).toBe('client_confiavel');
  });

  it('ignores stale commits from an older generation', () => {
    resetGamificationStoreForTests();
    const userId = 'user-b';
    const oldGen = beginGamificationSession(userId, 'helper');
    const newGen = beginGamificationSession(userId, 'helper');

    commitGamificationSuccess(userId, 'helper', oldGen, {
      userId,
      userType: 'helper',
      levelKey: 'novo',
      heroKey: 'helper_novo',
      score: 0,
      stats: {},
    } as never);

    const snap = getGamificationSnapshot(userId, 'helper');
    expect(snap.generation).toBe(newGen);
    expect(snap.record).toBeNull();
    expect(isGamificationGenerationCurrent(userId, 'helper', oldGen)).toBe(false);
  });

  it('does not leak account A snapshot into account B key', () => {
    resetGamificationStoreForTests();
    const genA = beginGamificationSession('account-a', 'client');
    commitGamificationSuccess('account-a', 'client', genA, {
      userId: 'account-a',
      userType: 'client',
      levelKey: 'ouro',
      heroKey: 'client_ouro',
      score: 500,
      stats: {},
    } as never);

    beginGamificationSession('account-b', 'client');
    const snapB = getGamificationSnapshot('account-b', 'client');
    expect(snapB.userId).toBe('account-b');
    expect(snapB.record).toBeNull();
    expect(snapB.loading).toBe(true);

    const snapA = getGamificationSnapshot('account-a', 'client');
    expect(snapA.record?.heroKey).toBe('client_ouro');
  });
});
