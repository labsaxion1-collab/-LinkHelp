import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

describe('client activity open cards layout', () => {
  it('centers cards and grows with content instead of clipping', () => {
    const card = read('src/components/client/ClientActivityOpenRequestCard.tsx');
    const dash = read('src/pages/client/ClientDashboard.tsx');
    expect(card).toContain('mx-auto w-full max-w-lg');
    expect(card).toContain('activityApplicationCardMinContentStyle');
    expect(card).toContain('data-feed-card-height-locked="false"');
    expect(card).toContain('!h-auto');
    expect(card).not.toContain('feedCardLockedContentStyle');
    expect(dash).toContain('mx-auto grid w-full max-w-lg grid-cols-1 gap-5');
    expect(dash).toContain('ClientActivityOpenRequestCard');
  });

  it('preserves VIP/normal CTAs, ring, menu and overlays', () => {
    const card = read('src/components/client/ClientActivityOpenRequestCard.tsx');
    expect(card).toContain('client-activity-view-vip-cta');
    expect(card).toContain('client-activity-choose-help-cta');
    expect(card).toContain('client-activity-footer-ring');
    expect(card).toContain('client-activity-more-menu');
    expect(card).toContain('client-activity-open-description');
    expect(card).toContain('LhCardOverlay');
  });

  it('keeps compact paddings suitable for 240–390px widths', () => {
    const tokens = read('src/utils/feedCardFixedHeight.ts');
    expect(tokens).toContain('px-3');
    expect(tokens).toContain('sm:px-4');
    const card = read('src/components/client/ClientActivityOpenRequestCard.tsx');
    expect(card).toContain('FEED_CARD_CONTENT_CLASS');
    expect(card).toContain('min-h-[44px]');
    expect(card).toContain('line-clamp-2');
  });
});
