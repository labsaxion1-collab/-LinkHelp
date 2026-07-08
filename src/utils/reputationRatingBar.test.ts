import { describe, expect, it } from 'vitest';
import { getRatingBarColor, ratingBarFillPercent } from '@/utils/reputationRatingBar';

describe('reputationRatingBar', () => {
  it('maps score ranges to colors', () => {
    expect(getRatingBarColor(1.5)).toBe('#EF4444');
    expect(getRatingBarColor(2.5)).toBe('#F97316');
    expect(getRatingBarColor(3.5)).toBe('#EAB308');
    expect(getRatingBarColor(4.2)).toBe('#4ADE80');
    expect(getRatingBarColor(4.8)).toBe('#16A34A');
  });

  it('computes fill percent from 0-5 scale', () => {
    expect(ratingBarFillPercent(5)).toBe(100);
    expect(ratingBarFillPercent(2.5)).toBe(50);
    expect(ratingBarFillPercent(0)).toBe(0);
  });
});
