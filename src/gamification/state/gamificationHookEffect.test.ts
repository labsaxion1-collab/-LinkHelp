import { describe, expect, it } from 'vitest';
import {
  acquireGamificationHookEffect,
  beginGamificationSession,
  commitGamificationSuccess,
  getGamificationHookEffectCount,
  getGamificationSnapshot,
  getLoggedOutGamificationSnapshot,
  getReusableGamificationGeneration,
  markGamificationInflight,
  resetGamificationStoreForTests,
} from '@/gamification/state/gamificationUserStore';

describe('gamification hook effect ref-count', () => {
  it('only the first consumer is primary; others share the snapshot', () => {
    resetGamificationStoreForTests();
    const userId = 'shared-user';
    const a = acquireGamificationHookEffect(userId, 'client');
    const b = acquireGamificationHookEffect(userId, 'client');
    expect(a.isPrimary).toBe(true);
    expect(b.isPrimary).toBe(false);
    expect(getGamificationHookEffectCount(userId, 'client')).toBe(2);
    b.release();
    expect(getGamificationHookEffectCount(userId, 'client')).toBe(1);
    a.release();
    expect(getGamificationHookEffectCount(userId, 'client')).toBe(0);
  });

  it('reuses in-flight generation after StrictMode-style remount', () => {
    resetGamificationStoreForTests();
    const userId = 'strict-user';
    const gen = beginGamificationSession(userId, 'helper');
    markGamificationInflight(userId, 'helper', gen);
    expect(getReusableGamificationGeneration(userId, 'helper')).toBe(gen);

    commitGamificationSuccess(userId, 'helper', gen, {
      userId,
      userType: 'helper',
      levelKey: 'confiavel',
      heroKey: 'helper_confiavel',
      score: 80,
      stats: {},
    } as never);

    expect(getReusableGamificationGeneration(userId, 'helper')).toBeNull();
  });

  it('logged-out snapshots are stable references per user type', () => {
    const clientA = getLoggedOutGamificationSnapshot('client');
    const clientB = getLoggedOutGamificationSnapshot('client');
    const helper = getLoggedOutGamificationSnapshot('helper');
    expect(clientA).toBe(clientB);
    expect(clientA).not.toBe(helper);
    expect(clientA.loading).toBe(false);
  });

  it('hero and progress consumers read the same store snapshot', () => {
    resetGamificationStoreForTests();
    const userId = 'same-record';
    const gen = beginGamificationSession(userId, 'client');
    commitGamificationSuccess(userId, 'client', gen, {
      userId,
      userType: 'client',
      levelKey: 'ouro',
      heroKey: 'client_ouro',
      score: 400,
      stats: {},
    } as never);

    acquireGamificationHookEffect(userId, 'client');
    acquireGamificationHookEffect(userId, 'client');

    const snap1 = getGamificationSnapshot(userId, 'client');
    const snap2 = getGamificationSnapshot(userId, 'client');
    expect(snap1).toBe(snap2);
    expect(snap1.record?.heroKey).toBe('client_ouro');
  });
});
