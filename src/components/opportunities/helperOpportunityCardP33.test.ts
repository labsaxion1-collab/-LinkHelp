/**
 * P3.3 — premium visual for DESCRIPTION / PROFILE feed overlays (style only).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FEED_CARD_PREMIUM,
  FEED_CARD_PREMIUM_SHELL_CLASS,
} from '@/components/opportunities/feedCardPremiumTheme';

const cardPath = 'src/components/opportunities/HelperOpportunityCard.tsx';
const profilePath = 'src/components/opportunities/FeedCardClientProfilePanel.tsx';
const themePath = 'src/components/opportunities/feedCardPremiumTheme.ts';
const overlayPath = 'src/components/design-system/LhCardOverlay.tsx';

describe('P3.3 feed card premium visual panels', () => {
  it('uses mid navy solid shell (#234B72) without glass blur', async () => {
    const theme = await readFile(resolve(themePath), 'utf8');
    const src = await readFile(resolve(cardPath), 'utf8');
    expect(FEED_CARD_PREMIUM.bgSolid).toBe('#234B72');
    expect(FEED_CARD_PREMIUM_SHELL_CLASS).toContain('bg-[#234B72]');
    expect(FEED_CARD_PREMIUM_SHELL_CLASS).toContain('shadow-[');
    expect(theme).not.toContain('backdrop-filter');
    expect(theme).not.toContain('backdrop-blur');
    expect(src).toContain('FEED_CARD_PREMIUM_SHELL_CLASS');
    expect(src).toContain('data-testid="feed-card-description-view"');
    expect(src).toContain('FEED_CARD_CONTENT_CLASS');
  });

  it('uses shared LhCardOverlay with sticky header and premium close while content scrolls', async () => {
    const theme = await readFile(resolve(themePath), 'utf8');
    const src = await readFile(resolve(cardPath), 'utf8');
    const overlay = await readFile(resolve(overlayPath), 'utf8');
    expect(theme).toContain('overflow-y-auto');
    expect(src).toContain('FEED_CARD_PREMIUM_SCROLL_CLASS');
    expect(src).toContain('LhCardOverlay');
    expect(overlay).toContain('sticky top-0');
    expect(overlay).toContain('LhPremiumCloseButton');
    expect(overlay).not.toMatch(/lh-card-overlay-back(?!-to-candidates)/);
    expect(src).not.toContain('onBack');
  });

  it('keeps LC quote logic and fixed summary height', async () => {
    const src = await readFile(resolve(cardPath), 'utf8');
    const theme = await readFile(resolve(themePath), 'utf8');
    expect(src).toContain('FEED_CARD_STANDARD_CONTENT_HEIGHT_PX');
    expect(src).toContain('FEED_CARD_PREMIUM_SCROLL_CLASS');
    expect(theme).toContain('overflow-y-auto');
    expect(src).toContain('getApplicationCreditQuote');
    expect(src).toContain('creditQuote.normalApplyLc');
    expect(src).toContain('creditQuote.vipApplyLc');
  });

  it('applies differentiated icon colors and gold rating stars', async () => {
    const src = await readFile(resolve(cardPath), 'utf8');
    const profile = await readFile(resolve(profilePath), 'utf8');
    expect(src).toContain('FEED_CARD_PREMIUM_ICON_LIGHT_CLASS');
    expect(src).toContain('FEED_CARD_PREMIUM_ICON_WHITE_CLASS');
    expect(src).toContain('Icons.Wrench');
    expect(src).toContain('Icons.MapPin');
    expect(profile).toContain('fill-amber-300');
    expect(profile).toContain('FEED_CARD_PREMIUM_ICON_GOLD_CLASS');
    expect(profile).toContain('LinkHelpRankBadge');
    expect(profile).toContain('Globe');
    expect(profile).toContain('UserRound');
  });

  it('renders score and rating as compact capsules', async () => {
    const profile = await readFile(resolve(profilePath), 'utf8');
    const theme = await readFile(resolve(themePath), 'utf8');
    expect(profile).toContain('data-testid="feed-card-score-badge"');
    expect(profile).toContain('data-testid="feed-card-rating-badge"');
    expect(profile).toContain('data-testid="feed-card-level-badge"');
    expect(profile).toContain('FEED_CARD_PREMIUM_SCORE_BADGE_CLASS');
    expect(profile).toContain('FEED_CARD_PREMIUM_RATING_BADGE_CLASS');
    expect(profile).toContain('FEED_CARD_PREMIUM_LEVEL_BADGE_CLASS');
    expect(profile).toContain('space-y-2');
    expect(theme).toContain('FEED_CARD_PREMIUM_SCORE_BADGE_CLASS');
    expect(theme).toMatch(/SCORE_BADGE_CLASS[\s\S]*rounded-full/);
    expect(theme).toMatch(/RATING_BADGE_CLASS[\s\S]*rounded-full/);
    expect(profile).toContain('dossier.trustScore');
    expect(profile).toContain('usePublicReputationDossier');
  });
});
