import { describe, expect, it } from 'vitest';
import {
  FEED_CARD_CONTENT_CLASS,
  FEED_CARD_FIXED_HEIGHT_EXTRA_PX,
  FEED_CARD_SHELL_CLASS,
  FEED_CARD_STANDARD_CONTENT_HEIGHT_PX,
  FEED_CARD_STANDARD_OUTER_HEIGHT_PX,
  FEED_CARD_TOP_ACCENT_PX,
  feedCardLockedContentStyle,
  feedCardMinContentStyle,
  resolveFeedCardLockedHeight,
} from '@/utils/feedCardFixedHeight';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

describe('P3.4 / shared opportunity card shell height', () => {
  it('boosts locked height by exactly 40px (legacy helper)', () => {
    expect(FEED_CARD_FIXED_HEIGHT_EXTRA_PX).toBe(40);
    expect(resolveFeedCardLockedHeight(200)).toBe(240);
    expect(resolveFeedCardLockedHeight(183.4)).toBe(223);
    expect(resolveFeedCardLockedHeight(0)).toBe(0);
    expect(resolveFeedCardLockedHeight(-10)).toBe(0);
  });

  it('exposes a single standard content height for feed + client activity cards', () => {
    expect(FEED_CARD_STANDARD_CONTENT_HEIGHT_PX).toBe(237);
    expect(FEED_CARD_TOP_ACCENT_PX).toBe(4);
    expect(FEED_CARD_STANDARD_OUTER_HEIGHT_PX).toBe(241);
    expect(feedCardLockedContentStyle()).toEqual({
      height: 237,
      minHeight: 237,
      maxHeight: 237,
    });
    expect(feedCardMinContentStyle()).toEqual({ minHeight: 237 });
    expect(FEED_CARD_SHELL_CLASS).toContain('rounded-[22px]');
    expect(FEED_CARD_CONTENT_CLASS).toContain('px-3');
  });

  it('wires standard height into HelperOpportunityCard for all views', async () => {
    const src = await readFile(
      resolve('src/components/opportunities/HelperOpportunityCard.tsx'),
      'utf8',
    );
    expect(src).toContain('FEED_CARD_STANDARD_CONTENT_HEIGHT_PX');
    expect(src).toContain('feedCardMinContentStyle');
    expect(src).toContain('FEED_CARD_SHELL_CLASS');
    expect(src).toContain('FEED_CARD_CONTENT_CLASS');
    expect(src).toContain('data-feed-card-height-locked');
    expect(src).toContain('LhCardOverlay');
    expect(src).toContain('FEED_CARD_PREMIUM_SCROLL_CLASS');
    expect(src).not.toContain('measureFeedCardNaturalHeight');
    expect(src).not.toContain('setLockedHeight');
  });

  it('wires growable shell tokens into ClientActivityOpenRequestCard (no locked clip)', async () => {
    const src = await readFile(
      resolve('src/components/client/ClientActivityOpenRequestCard.tsx'),
      'utf8',
    );
    expect(src).toContain('FEED_CARD_SHELL_CLASS');
    expect(src).toContain('FEED_CARD_CONTENT_CLASS');
    expect(src).toContain('activityApplicationCardMinContentStyle');
    expect(src).toContain('ACTIVITY_APPLICATION_CARD_MIN_CONTENT_HEIGHT_PX');
    expect(src).toContain('data-feed-card-height-locked="false"');
    expect(src).not.toContain('feedCardLockedContentStyle');
    expect(src).toContain('FEED_CARD_TOP_ACCENT_CLASS');
    expect(src).toContain('LhCardOverlay');
    expect(src).not.toContain('rounded-[1.35rem]');
    expect(src).not.toContain('measureFeedCardNaturalHeight');
    expect(src).not.toContain('Math.max(natural, 280)');
  });
});
