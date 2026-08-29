import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const cardPath = 'src/components/opportunities/HelperOpportunityCard.tsx';

describe('P3.1 feed card overlay navigation', () => {
  it('9. overlay states are description | profile | null (summary is default card)', async () => {
    const src = await readFile(resolve(cardPath), 'utf8');
    expect(src).toContain("type CardOverlay = 'description' | 'profile' | null");
    expect(src).toContain("openOverlay('description')");
    expect(src).toContain("openOverlay('profile')");
    expect(src).toContain('closeOverlay');
  });

  it('1–3 + 8. card locks height on summary; description/profile use LhCardOverlay scroll', async () => {
    const src = await readFile(resolve(cardPath), 'utf8');
    const theme = await readFile(
      resolve('src/components/opportunities/feedCardPremiumTheme.ts'),
      'utf8',
    );
    expect(src).toContain('data-feed-card-view="summary"');
    expect(src).toContain('data-feed-card-height-locked');
    expect(src).toContain('FEED_CARD_STANDARD_CONTENT_HEIGHT_PX');
    expect(src).toContain('FEED_CARD_PREMIUM_SCROLL_CLASS');
    expect(src).toContain('LhCardOverlay');
    expect(theme).toContain('overflow-y-auto');
    expect(src).not.toContain('clientPanelOpen');
    expect(src).not.toContain('descriptionOpen');
  });

  it('4–7. Voltar/X close overlays; no external nav/sheet', async () => {
    const src = await readFile(resolve(cardPath), 'utf8');
    expect(src).toContain('feed-card-description-overlay');
    expect(src).toContain('feed-card-profile-overlay');
    expect(src).toContain('data-testid="feed-card-profile-view"');
    expect(src).toContain('data-testid="feed-card-description-view"');
    expect(src).not.toContain('ClientPublicProfileView');
    expect(src).not.toContain('PublicProfileSheetFrame');
    expect(src).not.toMatch(/\bnavigate\(/);
  });

  it('uses overlay discriminant (no dual booleans)', async () => {
    const src = await readFile(resolve(cardPath), 'utf8');
    expect(src).toContain("overlay === 'description'");
    expect(src).toContain("overlay === 'profile'");
    expect(src).not.toMatch(/const \[descriptionOpen/);
    expect(src).not.toMatch(/const \[clientPanelOpen/);
  });
});
