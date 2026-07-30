import { afterEach, describe, expect, it, vi } from 'vitest';
import { coerceServiceMode, isBaselineFinanceEnabled, isServiceMode } from '@/config/baselineFinance';

describe('baselineFinance', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to disabled when env unset', () => {
    vi.stubEnv('VITE_LINKHELP_BASELINE_FINANCE', undefined);
    expect(isBaselineFinanceEnabled()).toBe(false);
  });

  it('enables for true/1/yes/on', () => {
    for (const value of ['true', '1', 'yes', 'on', 'TRUE']) {
      vi.stubEnv('VITE_LINKHELP_BASELINE_FINANCE', value);
      expect(isBaselineFinanceEnabled()).toBe(true);
    }
  });

  it('coerces legacy labels to canonical service_mode', () => {
    expect(coerceServiceMode('online')).toBe('remote');
    expect(coerceServiceMode('in_person')).toBe('in_person');
    expect(coerceServiceMode('remote')).toBe('remote');
    expect(coerceServiceMode('presencial')).toBe('in_person');
    expect(coerceServiceMode('both')).toBeNull();
    expect(isServiceMode('ambos')).toBe(false);
  });
});
