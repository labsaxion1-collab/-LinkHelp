import { describe, expect, it } from 'vitest';
import {
  canResumePausedRequest,
  getRequestServiceDeadlineMs,
  isRequestServiceDeadlinePassed,
} from '@/utils/requestSchedule';

describe('requestSchedule', () => {
  it('returns null deadline when preferred date is missing', () => {
    expect(getRequestServiceDeadlineMs({ preferredDate: null })).toBeNull();
    expect(isRequestServiceDeadlinePassed({ preferredDate: null })).toBe(false);
  });

  it('treats end of day as deadline when only date is set', () => {
    const job = { preferredDate: '2026-07-15' };
    const deadline = getRequestServiceDeadlineMs(job);
    expect(deadline).not.toBeNull();
    expect(isRequestServiceDeadlinePassed(job, deadline! + 1)).toBe(true);
    expect(isRequestServiceDeadlinePassed(job, deadline! - 1)).toBe(false);
  });

  it('uses explicit preferred time when provided', () => {
    const job = { preferredDate: '2026-07-15', preferredTime: '14:30' };
    const deadline = getRequestServiceDeadlineMs(job)!;
    const d = new Date(deadline);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it('allows resume before deadline and blocks after', () => {
    const job = { preferredDate: '2026-07-15', preferredTime: '10:00' };
    const deadline = getRequestServiceDeadlineMs(job)!;
    expect(canResumePausedRequest(job, deadline - 1)).toBe(true);
    expect(canResumePausedRequest(job, deadline + 1)).toBe(false);
  });
});
