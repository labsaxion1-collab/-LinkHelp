import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  FEED_CARD_VIEWS,
  feedCardViewAfterBack,
  feedCardViewFromDescriptionExpanded,
  isFeedCardView,
  type FeedCardView,
} from '@/utils/feedCardView';

const cardPath = 'src/components/opportunities/HelperOpportunityCard.tsx';

describe('P3.1 feed card internal navigation', () => {
  it('9. FeedCardView architecture is summary | description | profile', () => {
    expect(FEED_CARD_VIEWS).toEqual(['summary', 'description', 'profile']);
    expect(isFeedCardView('summary')).toBe(true);
    expect(isFeedCardView('description')).toBe(true);
    expect(isFeedCardView('profile')).toBe(true);
    expect(isFeedCardView('modal')).toBe(false);
    expect(feedCardViewAfterBack('description')).toBe('summary');
    expect(feedCardViewAfterBack('profile')).toBe('summary');
    expect(feedCardViewFromDescriptionExpanded(true)).toBe('description');
    expect(feedCardViewFromDescriptionExpanded(false)).toBe('summary');
  });

  it('1–3 + 8. card locks height; description/profile are internal; scroll internal', async () => {
    const src = await readFile(resolve(cardPath), 'utf8');
    expect(src).toContain("FeedCardView");
    expect(src).toContain("useState<FeedCardView>");
    expect(src).toContain('data-feed-card-view={view}');
    expect(src).toContain('data-feed-card-height-locked');
    expect(src).toContain('lockedHeight');
    expect(src).toContain('overflow-y-auto');
    expect(src).toContain("goToView('description')");
    expect(src).toContain("goToView('profile')");
    expect(src).not.toContain('clientPanelOpen');
    expect(src).not.toContain('descriptionOpen');
  });

  it('4–7. Voltar returns to SUMMARY from description and profile; no external nav/sheet', async () => {
    const src = await readFile(resolve(cardPath), 'utf8');
    expect(src).toContain('feedCardViewAfterBack');
    expect(src).toContain('data-testid="feed-card-back"');
    expect(src).toContain('goBackToSummary');
    expect(src).toContain("setView('summary')");
    expect(src).not.toContain('ClientPublicProfileView');
    expect(src).not.toContain('PublicProfileSheetFrame');
    expect(src).not.toMatch(/\bnavigate\(/);
    // Placeholder shell for P3.2
    expect(src).toContain('data-testid="feed-card-profile-placeholder"');
    expect(src).toContain('data-testid="feed-card-description-view"');
  });

  it('view type stays a single discriminant (no dual booleans)', async () => {
    const src = await readFile(resolve(cardPath), 'utf8');
    const views: FeedCardView[] = ['summary', 'description', 'profile'];
    for (const v of views) {
      expect(src).toContain(`'${v}'`);
    }
    expect(src).not.toMatch(/const \[descriptionOpen/);
    expect(src).not.toMatch(/const \[clientPanelOpen/);
  });
});
