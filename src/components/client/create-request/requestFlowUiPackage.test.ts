import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('create request primary category flow', () => {
  const modal = readFileSync(
    resolve(process.cwd(), 'src/components/client/create-request/CreateRequestModal.tsx'),
    'utf8',
  );

  it('uses grouped navigation while preserving explicit service selection', () => {
    expect(modal).toContain("STEPS: ModalStep[] = ['category', 'subcategory', 'description', 'confirm', 'review']");
    expect(modal).toMatch(/setStep\('subcategory'\)/);
    expect(modal).toContain('CreateRequestCategoryStep');
    expect(modal).toContain('CreateRequestServiceStep');
    expect(modal).toContain('isOfficialServiceSubcategory');
  });

  it('still publishes an internal subcategory for finance compatibility', () => {
    expect(modal).toContain('publishSubcategory');
    expect(modal).toContain('subcategory: publishSubcategory');
  });
});

describe('request address GPS vs other address', () => {
  const input = readFileSync(
    resolve(process.cwd(), 'src/components/client/create-request/RequestAddressInput.tsx'),
    'utf8',
  );

  it('exposes two explicit CTAs and clears stale coords on manual edit', () => {
    expect(input).toContain('otherAddressLabel');
    expect(input).toContain('useCurrentLocation');
    expect(input).toContain('clearCoordinates');
    expect(input).toContain('mapsUnavailableLabel');
    expect(input).not.toMatch(/absolute right-2 top-1\/2.*currentLocation/);
  });
});

describe('helper opportunity card alignment', () => {
  const card = readFileSync(
    resolve(process.cwd(), 'src/components/opportunities/HelperOpportunityCard.tsx'),
    'utf8',
  );

  it('keeps category, budget, metrics and actions in separate zones without absolute CTA', () => {
    expect(card).toContain('showInterestedRing');
    expect(card).toContain('truncate whitespace-nowrap');
    expect(card).toContain('renderApplyActionRow');
    expect(card).toContain('feedCardMinContentStyle');
    expect(card).not.toContain('absolute right-2 top-1/2');
  });
});
