import { describe, expect, it } from 'vitest';
import {
  toggleHelperTaskAccordion,
  clientFirstName,
  formatRelativeScheduleLabel,
  formatApplicationSentAgo,
  resolveVipRefundLc,
} from '@/utils/helperTaskCard';
import {
  canClientFinalizeCompletion,
  shouldHideCompleteButton,
  isAwaitingClientCompletion,
} from '@/utils/serviceWorkflow';

describe('helperTaskCard', () => {
  it('toggleHelperTaskAccordion is mutually exclusive', () => {
    expect(toggleHelperTaskAccordion(null, 'client')).toBe('client');
    expect(toggleHelperTaskAccordion('client', 'description')).toBe('description');
    expect(toggleHelperTaskAccordion('description', 'description')).toBe(null);
    expect(toggleHelperTaskAccordion('client', 'client')).toBe(null);
  });

  it('clientFirstName returns first token', () => {
    expect(clientFirstName('Maria Silva')).toBe('Maria');
    expect(clientFirstName('João')).toBe('João');
  });

  it('formatRelativeScheduleLabel shows tomorrow', () => {
    const now = new Date('2026-07-10T12:00:00').getTime();
    const tomorrow = new Date('2026-07-11T14:00:00').getTime();
    const label = formatRelativeScheduleLabel(tomorrow, now, 'en-CA', (k) =>
      k === 'upcoming_jobs.rel_tomorrow' ? 'Tomorrow' : k,
    );
    expect(label).toBe('Tomorrow');
  });

  it('resolveVipRefundLc returns half on rejected VIP', () => {
    expect(resolveVipRefundLc(12, { isExclusive: true, status: 'rejected' })).toBe(6);
    expect(resolveVipRefundLc(12, { isExclusive: true, status: 'pending' })).toBeNull();
  });

  it('formatApplicationSentAgo uses the real timestamp without a ticker', () => {
    const now = new Date('2026-08-20T12:00:00Z').getTime();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    const label = formatApplicationSentAgo(twoHoursAgo, now, (k, vars) =>
      k === 'helper_tasks.applied_ago_hours' ? `sent ${vars?.count}h` : k,
    );
    expect(label).toBe('sent 2h');
  });
});

describe('serviceWorkflow completion UI', () => {
  it('shouldHideCompleteButton when awaiting or completed', () => {
    expect(shouldHideCompleteButton('in_progress', 'completion_requested')).toBe(true);
    expect(shouldHideCompleteButton('completed', 'scheduled')).toBe(true);
    expect(shouldHideCompleteButton('in_progress', 'in_progress')).toBe(false);
  });

  it('canClientFinalizeCompletion on active and awaiting jobs', () => {
    expect(canClientFinalizeCompletion('in_progress', 'in_progress')).toBe(true);
    expect(canClientFinalizeCompletion('in_progress', 'completion_requested')).toBe(true);
    expect(canClientFinalizeCompletion('completed', 'completed')).toBe(false);
  });

  it('isAwaitingClientCompletion includes legacy status', () => {
    expect(isAwaitingClientCompletion('completion_requested')).toBe(true);
    expect(isAwaitingClientCompletion('awaiting_client_confirmation')).toBe(true);
  });
});
