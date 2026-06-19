import { describe, expect, it } from 'vitest';
import {
  coerceLegacyLinkCreditsDisplay,
  coerceSignedLegacyLinkCreditsDisplay,
  formatLinkCredits,
  sanitizeLinkCreditsAmount,
  sanitizeSignedLinkCreditsAmount,
} from '@/utils/formatLinkCredits';

describe('sanitizeLinkCreditsAmount', () => {
  it('passes through real LC values unchanged', () => {
    expect(sanitizeLinkCreditsAmount(25)).toBe(25);
    expect(sanitizeLinkCreditsAmount(154)).toBe(154);
    expect(sanitizeLinkCreditsAmount(31185)).toBe(31185);
  });
});

describe('coerceLegacyLinkCreditsDisplay (temporary display fallback)', () => {
  it('converts exact ×1000 legacy multiples only', () => {
    expect(coerceLegacyLinkCreditsDisplay(25000)).toBe(25);
    expect(coerceLegacyLinkCreditsDisplay(35000)).toBe(35);
  });

  it('does not scale non-multiples or real values', () => {
    expect(coerceLegacyLinkCreditsDisplay(154)).toBe(154);
    expect(coerceLegacyLinkCreditsDisplay(31185)).toBe(31185);
    expect(coerceLegacyLinkCreditsDisplay(30124)).toBe(30124);
  });
});

describe('formatLinkCredits', () => {
  it('formats real values', () => {
    expect(formatLinkCredits(35)).toBe('35 LC');
  });

  it('applies legacy display fallback for exact multiples', () => {
    expect(formatLinkCredits(25000)).toBe('25 LC');
  });
});

describe('sanitizeSignedLinkCreditsAmount', () => {
  it('preserves sign without scaling', () => {
    expect(sanitizeSignedLinkCreditsAmount(-21)).toBe(-21);
    expect(coerceSignedLegacyLinkCreditsDisplay(-25000)).toBe(-25);
  });
});
