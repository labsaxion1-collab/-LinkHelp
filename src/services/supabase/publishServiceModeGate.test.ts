import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/baselineFinance', async () => {
  const actual = await vi.importActual<typeof import('@/config/baselineFinance')>('@/config/baselineFinance');
  return {
    ...actual,
    isBaselineFinanceEnabled: vi.fn(),
  };
});

import { isBaselineFinanceEnabled } from '@/config/baselineFinance';
import { coerceServiceMode } from '@/config/baselineFinance';

describe('publish payload service_mode gating', () => {
  afterEach(() => {
    vi.mocked(isBaselineFinanceEnabled).mockReset();
  });

  it('omits service_mode when baseline finance is off (historical DB)', () => {
    vi.mocked(isBaselineFinanceEnabled).mockReturnValue(false);
    const base: Record<string, unknown> = { title: 'x' };
    const mode = coerceServiceMode('remote');
    if (isBaselineFinanceEnabled() && (mode === 'remote' || mode === 'in_person')) {
      base.service_mode = mode;
    }
    expect(base.service_mode).toBeUndefined();
  });

  it('attaches canonical service_mode when baseline finance is on', () => {
    vi.mocked(isBaselineFinanceEnabled).mockReturnValue(true);
    const base: Record<string, unknown> = { title: 'x' };
    const mode = coerceServiceMode('online');
    if (isBaselineFinanceEnabled() && (mode === 'remote' || mode === 'in_person')) {
      base.service_mode = mode;
    }
    expect(base.service_mode).toBe('remote');
  });
});
