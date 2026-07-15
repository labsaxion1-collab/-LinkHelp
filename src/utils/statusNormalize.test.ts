import { describe, expect, it } from 'vitest';
import { resolveRequestStatusPatch } from '@/utils/statusNormalize';

describe('resolveRequestStatusPatch', () => {
  it('keeps cancelled when realtime sends open', () => {
    expect(resolveRequestStatusPatch('cancelled', 'open')).toBe('cancelled');
  });

  it('keeps completed when realtime sends in_progress', () => {
    expect(resolveRequestStatusPatch('completed', 'in_progress')).toBe('completed');
  });

  it('allows forward transition to completed', () => {
    expect(resolveRequestStatusPatch('in_progress', 'completed')).toBe('completed');
  });
});
