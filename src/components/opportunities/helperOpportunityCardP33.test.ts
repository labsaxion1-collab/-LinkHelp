/**
 * P3.3 — premium visual for DESCRIPTION / PROFILE feed panels (style only).
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
    expect(src).toContain('data-testid="feed-card-premium-shell"');
    // Summary shell stays white
    expect(src).toContain('overflow-hidden bg-white px-3 pb-2.5 pt-2.5');
  });

  it('pins compact Voltar bar while content scrolls underneath', async () => {
    const theme = await readFile(resolve(themePath), 'utf8');
    const src = await readFile(resolve(cardPath), 'utf8');
    expect(theme).toContain('bg-[#1E3A5F]');
    expect(theme).toContain('h-12');
    expect(theme).toContain('pt-12');
    expect(theme).toContain('absolute inset-x-0 top-0');
    expect(src).toContain('FEED_CARD_PREMIUM_TOP_BAR_CLASS');
    expect(src).toContain('data-testid="feed-card-premium-top-bar"');
    expect(src).toContain('FEED_CARD_PREMIUM_SCROLL_CLASS');
    expect(src).toContain('renderPremiumBackBar');
  });

  it('keeps architecture / LC / Voltar / height / scroll unchanged', async () => {
    const src = await readFile(resolve(cardPath), 'utf8');
    const theme = await readFile(resolve(themePath), 'utf8');
    expect(src).toContain('goBackToSummary');
    expect(src).toContain('data-testid="feed-card-back"');
    expect(src).toContain('lockedHeight');
    expect(src).toContain('FEED_CARD_PREMIUM_SCROLL_CLASS');
    expect(theme).toContain('overflow-y-auto');
    expect(src).toContain('getApplicationCreditQuote');
    expect(src).toContain('creditQuote.normalApplyLc');
    expect(src).toContain('creditQuote.vipApplyLc');
    expect(src).toContain("FeedCardView");
    expect(src).toContain('transition-opacity duration-200');
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
    expect(profile).toContain('Medal');
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
