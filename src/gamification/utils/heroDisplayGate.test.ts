import { describe, expect, it } from 'vitest';
import { resolveHeroDisplayPhase } from '@/gamification/utils/heroDisplayGate';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';
import { EMPTY_GAMIFICATION_STATS } from '@/gamification/services/gamificationStatsAdapter';
import { resolveHeroKey } from '@/gamification/config/heroKeys';

function clientRecord(levelKey: string, heroKey: string): UserGamificationRecord {
  return {
    userId: 'u1',
    userType: 'client',
    score: 200,
    levelKey: levelKey as UserGamificationRecord['levelKey'],
    heroKey,
    stats: { ...EMPTY_GAMIFICATION_STATS },
    progressPercent: 40,
    pointsToNextLevel: 80,
    missingRequirements: [],
    updatedAt: new Date().toISOString(),
  };
}

describe('resolveHeroDisplayPhase', () => {
  it('client high rank: loading never shows ready (no premature hero)', () => {
    expect(
      resolveHeroDisplayPhase({ loading: true, error: false, record: null }),
    ).toBe('loading');
  });

  it('client high rank: after API shows confiavel hero key', () => {
    const record = clientRecord('confiavel', 'client_confiavel');
    expect(
      resolveHeroDisplayPhase({ loading: false, error: false, record }),
    ).toBe('ready');
    expect(resolveHeroKey('client', record.heroKey)).toBe('client_confiavel');
  });

  it('helper high rank: loading blocks default hero', () => {
    expect(
      resolveHeroDisplayPhase({
        loading: true,
        error: false,
        record: clientRecord('profissional', 'helper_profissional'),
      }),
    ).toBe('loading');
  });

  it('helper: resolved profissional hero key', () => {
    const record = clientRecord('profissional', 'helper_profissional');
    record.userType = 'helper';
    expect(resolveHeroKey('helper', record.heroKey)).toBe('helper_profissional');
  });

  it('true beginner only after API confirms novo', () => {
    const record = clientRecord('novo', 'client_novo');
    expect(resolveHeroDisplayPhase({ loading: false, error: false, record })).toBe('ready');
    expect(resolveHeroKey('client', record.heroKey)).toBe('client_novo');
  });

  it('account B: no record while loading after switch (no stale ready)', () => {
    expect(
      resolveHeroDisplayPhase({ loading: true, error: false, record: null }),
    ).toBe('loading');
  });

  it('API error: unavailable, not beginner fallback', () => {
    expect(
      resolveHeroDisplayPhase({ loading: false, error: true, record: null }),
    ).toBe('error');
  });

  it('resolved without record: error phase', () => {
    expect(
      resolveHeroDisplayPhase({ loading: false, error: false, record: null }),
    ).toBe('error');
  });

  it('stale record hidden while loading (refresh/PWA)', () => {
    const stale = clientRecord('novo', 'client_novo');
    expect(
      resolveHeroDisplayPhase({ loading: true, error: false, record: stale }),
    ).toBe('loading');
  });
});

describe('resolveHeroKey after resolution', () => {
  it('null heroKey during unresolved UI must not be passed — gate prevents render', () => {
    expect(resolveHeroKey('client', null)).toBe('client_novo');
  });
});
