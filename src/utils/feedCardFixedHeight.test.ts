import { describe, expect, it } from 'vitest';
import {
  FEED_CARD_FIXED_HEIGHT_EXTRA_PX,
  resolveFeedCardLockedHeight,
} from '@/utils/feedCardFixedHeight';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

describe('P3.4 feed card fixed height boost', () => {
  it('boosts locked height by exactly 40px', () => {
    expect(FEED_CARD_FIXED_HEIGHT_EXTRA_PX).toBe(40);
    expect(resolveFeedCardLockedHeight(200)).toBe(240);
    expect(resolveFeedCardLockedHeight(183.4)).toBe(223);
    expect(resolveFeedCardLockedHeight(0)).toBe(0);
    expect(resolveFeedCardLockedHeight(-10)).toBe(0);
  });

  it('wires boost into HelperOpportunityCard for all three views', async () => {
    const src = await readFile(
      resolve('src/components/opportunities/HelperOpportunityCard.tsx'),
      'utf8',
    );
    expect(src).toContain('resolveFeedCardLockedHeight');
    expect(src).toContain('measureFeedCardNaturalHeight');
    expect(src).toContain('FEED_CARD_FIXED_HEIGHT_EXTRA_PX');
    // Height applied whenever locked (summary | description | profile)
    expect(src).toContain('lockedHeight != null');
    expect(src).not.toMatch(/isInternalView && lockedHeight != null/);
    expect(src).toContain('data-feed-card-height-locked');
    // P3.3 bar / scroll preserved
    expect(src).toContain('FEED_CARD_PREMIUM_TOP_BAR_CLASS');
    expect(src).toContain('FEED_CARD_PREMIUM_SCROLL_CLASS');
  });
});
