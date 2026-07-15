import { describe, expect, it } from 'vitest';
import { isJobPaused } from '@/utils/jobVisibility';
import { normalizeRequestStatus } from '@/utils/statusNormalize';

describe('pause status helpers', () => {
  it('normalizes paused status', () => {
    expect(normalizeRequestStatus('paused')).toBe('paused');
  });

  it('detects paused jobs', () => {
    expect(isJobPaused({ status: 'paused' })).toBe(true);
    expect(isJobPaused({ status: 'open' })).toBe(false);
  });
});
