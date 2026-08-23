import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

describe('compact gamification rank on helper dashboard', () => {
  it('uses GamificationCompactRankCard instead of HelperDashboardHeroSlot on feed', () => {
    const dash = read('src/pages/helper/HelperDashboard.tsx');
    expect(dash).toContain('GamificationCompactRankCard');
    expect(dash).not.toContain('HelperDashboardHeroSlot');
  });

  it('does not render inline category grid above feed tabs', () => {
    const dash = read('src/pages/helper/HelperDashboard.tsx');
    expect(dash).not.toContain('HelperCategoryDropdown');
    expect(dash).not.toContain('helper_dashboard.categories_heading');
  });

  it('keeps Para mim and Recentes tabs after compact rank', () => {
    const dash = read('src/pages/helper/HelperDashboard.tsx');
    const rankIdx = dash.indexOf('GamificationCompactRankCard');
    const tabsIdx = dash.indexOf('helper_dashboard.tab_match');
    expect(rankIdx).toBeGreaterThan(-1);
    expect(tabsIdx).toBeGreaterThan(rankIdx);
  });

  it('compact rank reuses useGamification progress engine', () => {
    const compact = read('src/gamification/components/GamificationCompactRankCard.tsx');
    const presentation = read('src/gamification/components/GamificationRankPresentation.tsx');
    expect(compact).toContain('useGamification');
    expect(presentation).toContain('getProgressToNextLevel');
    expect(presentation).toContain('MEDAL_MAP');
    expect(presentation).toContain('resolveCompactRankHeroVisual');
    expect(presentation).toContain('min-h-[170px]');
    expect(presentation).toContain('COMPACT_RANK_FULL_BLEED_CLASS');
    expect(presentation).toContain('px-4');
    expect(presentation).not.toContain('border-slate-200/90 bg-white');
  });

  it('enlarges compact medal ~25% with proportional pedestal without changing card geometry', () => {
    const presentation = read('src/gamification/components/GamificationRankPresentation.tsx');
    const css = read('src/styles/globals.css');
    const visualCfg = read('src/gamification/config/compactRankHeroVisual.ts');

    // Card geometry preserved (height + full-bleed).
    expect(presentation).toContain('min-h-[170px]');
    expect(presentation).toContain('max-h-[210px]');
    expect(presentation).toContain("clientHome: 'min-h-[240px] max-h-[300px]'");
    expect(presentation).toContain('COMPACT_RANK_FULL_BLEED_CLASS');
    expect(presentation).toContain('w-[5.5rem] shrink-0');
    expect(presentation).toContain('sm:w-[6rem]');

    // Four-layer stage: stage → motion → viewport → glyph (animation ≠ optical scale).
    expect(presentation).toContain('lh-compact-rank-stage');
    expect(presentation).toContain('lh-rank-compact-medal');
    expect(presentation).toContain('lh-rank-compact-medal-viewport');
    expect(presentation).toContain('lh-rank-compact-medal-glyph');
    expect(presentation).toContain('h-[5.5rem] w-[5.5rem]');
    expect(presentation).toContain('sm:h-[5.75rem] sm:w-[5.75rem]');
    expect(presentation).toContain('COMPACT_RANK_MEDAL_PEDESTAL_OVERLAP_CLASS');
    expect(presentation).toContain('pt-2');
    expect(presentation).toContain('--lh-compact-emblem-scale');
    expect(presentation).toContain('--lh-compact-emblem-origin');
    expect(presentation).toContain('heroVisual.emblemScale');
    expect(presentation).toContain('heroVisual.emblemOrigin');
    expect(presentation).not.toContain('mb-[0.4rem]');
    expect(css).toContain('@keyframes lhRankCompactMedalFloat');
    expect(css).toContain('.lh-rank-compact-medal');
    expect(css).toContain('.lh-rank-compact-medal-viewport');
    expect(css).toContain('.lh-rank-compact-medal-glyph');
    expect(css).not.toContain('transform: scale(2.15)');
    expect(css).toMatch(
      /\.lh-rank-compact-medal\s*\{[^}]*animation:\s*lhRankCompactMedalFloat/s,
    );
    expect(css).toMatch(
      /\.lh-rank-compact-medal-glyph\s*\{[^}]*transform:\s*scale\(var\(--lh-compact-emblem-scale/s,
    );

    // Pedestal token: ~+37% width / ~+27% height vs prior 6×3.75 rem, object-contain.
    expect(presentation).toContain('COMPACT_RANK_PEDESTAL_BOX.className');
    expect(visualCfg).toContain("widthRem: 8.25");
    expect(visualCfg).toContain("heightRem: 4.75");
    expect(visualCfg).toContain("smWidthRem: 8.5");
    expect(visualCfg).toContain("smHeightRem: 5");
    expect(visualCfg).toContain('h-[4.75rem] w-[8.25rem]');
    expect(visualCfg).toContain('sm:h-[5rem] sm:w-[8.5rem]');
    expect(visualCfg).toContain('object-contain');
    expect(visualCfg).toContain("COMPACT_RANK_MEDAL_PEDESTAL_OVERLAP_CLASS = '-mb-2.5'");
    expect(presentation).not.toContain('absolute bottom-0 left-1/2');
    expect(presentation).not.toContain('h-[3.75rem] w-[6rem]');

    // Text rhythm: progress closer to “Próximo” (mt-1, not mt-2).
    expect(presentation).toContain('mt-1 flex items-center gap-2');
    expect(presentation).not.toContain('mt-2 flex items-center gap-2');

    // Copy + open-details handler surface unchanged.
    expect(presentation).toContain('gamification.helper_level_eyebrow');
    expect(presentation).toContain('gamification.client_level_eyebrow');
    expect(presentation).toContain('gamification.next_prefix');
    expect(presentation).toContain("formatProgressSubtitle(progress, 'hero', t)");
    expect(presentation).toContain('onOpenDetails');
    expect(presentation).toContain('data-testid="gamification-compact-rank-card"');
  });

  it('provides per-heroKey emblem optics for every MEDAL_MAP entry without clipping at 86px', async () => {
    const { MEDAL_MAP } = await import('@/gamification/config/gamificationMedals');
    const {
      COMPACT_RANK_BY_HERO_KEY,
      COMPACT_RANK_EMBLEM_VIEWPORT_PX,
      COMPACT_RANK_EMBLEM_TARGET_VISIBLE_PX,
      COMPACT_RANK_PEDESTAL_BOX,
      COMPACT_RANK_MEDAL_PEDESTAL_OVERLAP_CLASS,
      resolveCompactRankHeroVisual,
    } = await import('@/gamification/config/compactRankHeroVisual');

    const medalKeys = Object.keys(MEDAL_MAP).sort();
    const visualKeys = Object.keys(COMPACT_RANK_BY_HERO_KEY).sort();
    expect(visualKeys).toEqual(medalKeys);
    expect(COMPACT_RANK_EMBLEM_TARGET_VISIBLE_PX).toBeLessThanOrEqual(COMPACT_RANK_EMBLEM_VIEWPORT_PX);

    for (const heroKey of medalKeys) {
      const visual = COMPACT_RANK_BY_HERO_KEY[heroKey];
      expect(visual.emblemScale, heroKey).toBeTypeOf('number');
      expect(visual.emblemScale, heroKey).toBeGreaterThan(1);
      expect(visual.emblemScale, heroKey).toBeLessThan(2.5);
      expect(visual.emblemOrigin, heroKey).toMatch(/^center \d+(\.\d+)?%$/);

      // scale × impliedFill ≤ 1 → no horizontal clip at the 86px target ceiling.
      const impliedFill =
        COMPACT_RANK_EMBLEM_TARGET_VISIBLE_PX / (COMPACT_RANK_EMBLEM_VIEWPORT_PX * visual.emblemScale);
      expect(impliedFill, heroKey).toBeGreaterThan(0.4);
      expect(impliedFill, heroKey).toBeLessThanOrEqual(0.72);
      expect(visual.emblemScale * impliedFill, heroKey).toBeLessThanOrEqual(1.001);

      const userType = heroKey.startsWith('client') ? 'client' : 'helper';
      const resolved = resolveCompactRankHeroVisual(userType, heroKey);
      expect(resolved.emblemScale).toBe(visual.emblemScale);
      expect(resolved.emblemOrigin).toBe(visual.emblemOrigin);
    }

    // helper_confiavel (iniciante): intentionally ~7% under the 2D max (1.789 → 1.664).
    expect(COMPACT_RANK_BY_HERO_KEY.helper_confiavel.emblemScale).toBeCloseTo(1.664, 3);
    expect(COMPACT_RANK_BY_HERO_KEY.helper_confiavel.emblemScale).toBeLessThan(1.789);
    // Other helper keys keep their prior audited scales (not globally reduced).
    expect(COMPACT_RANK_BY_HERO_KEY.helper_novo.emblemScale).toBeCloseTo(1.768, 3);
    expect(COMPACT_RANK_BY_HERO_KEY.helper_elite.emblemScale).toBeCloseTo(1.538, 3);

    // Pedestal box proportion and overlap token.
    expect(COMPACT_RANK_PEDESTAL_BOX.widthRem / 6).toBeCloseTo(1.375, 3);
    expect(COMPACT_RANK_PEDESTAL_BOX.heightRem / 3.75).toBeCloseTo(1.267, 3);
    expect(COMPACT_RANK_PEDESTAL_BOX.className).toContain('object-contain');
    expect(COMPACT_RANK_MEDAL_PEDESTAL_OVERLAP_CLASS).toBe('-mb-2.5');
  });

  it('detail panel opens tutorial at current level card id', () => {
    const detail = read('src/gamification/components/GamificationRankDetailPanel.tsx');
    const content = read('src/gamification/config/gamificationTutorialContent.ts');
    expect(detail).toContain('getTutorialInitialCardIdForLevel');
    expect(content).toContain('getTutorialInitialCardIdForLevel');
    expect(detail).toContain('initialCardId=');
  });

  it('tutorial modal supports back from first step to rank detail', () => {
    const modal = read('src/gamification/components/GamificationTutorialModal.tsx');
    expect(modal).toContain('onBackFromFirstStep');
    expect(modal).toContain('initialCardId');
    expect(modal).toContain('gamification-tutorial-back');
    expect(modal).toContain('seededForOpenRef');
  });
});

describe('helper feed card overlays', () => {
  it('opens description and profile in LhCardOverlay instead of inline card views', () => {
    const card = read('src/components/opportunities/HelperOpportunityCard.tsx');
    expect(card).toContain('LhCardOverlay');
    expect(card).toContain('feed-card-description-overlay');
    expect(card).toContain('feed-card-profile-overlay');
    expect(card).not.toContain('feed-card-premium-shell');
    expect(card).not.toContain('goToView(');
  });

  it('still shows category on closed feed card', () => {
    const card = read('src/components/opportunities/HelperOpportunityCard.tsx');
    expect(card).toContain('showCategoryLine');
    expect(card).toContain('CategoryIcon');
  });
});

describe('shared overlay shell', () => {
  it('LhCardOverlay header has premium close only; nested back lives in footer', () => {
    const overlay = read('src/components/design-system/LhCardOverlay.tsx');
    const closeBtn = read('src/components/design-system/LhPremiumCloseButton.tsx');
    expect(overlay).toContain('LhPremiumCloseButton');
    expect(overlay).toContain('lh-card-overlay-close');
    expect(overlay).toContain("t('common.close')");
    expect(overlay).toContain('lh-card-overlay-back-to-candidates');
    expect(overlay).toContain("t('client_dashboard.back_to_candidates')");
    expect(overlay).not.toMatch(/lh-card-overlay-back(?!-to-candidates)/);
    expect(overlay).not.toContain("t('nav.back')");
    expect(overlay).not.toContain('ArrowLeft');
    expect(closeBtn).toContain('LH_PREMIUM_CLOSE_BUTTON_CLASS');
    expect(closeBtn).toContain('h-10 w-10');
    expect(closeBtn).toContain('right-2.5 top-2.5');
  });

  it('LhCardOverlay defaults to centered presentation like HelperApplyConfirmModal', () => {
    const overlay = read('src/components/design-system/LhCardOverlay.tsx');
    expect(overlay).toContain("presentation = 'centered'");
    expect(overlay).toContain('data-overlay-presentation={presentation}');
    expect(overlay).toContain('LH_CENTERED_MODAL_STANDARD_PANEL_CLASS');
    expect(overlay).toContain('items-center p-4');
    expect(overlay).toContain("size = 'standard'");
    expect(overlay).toContain('overflow-hidden');
    expect(overlay).toContain('border border-slate-100');
    expect(overlay).toContain('LH_CENTERED_MODAL_STANDARD_PANEL_CLASS');
    expect(overlay).not.toContain('ArrowLeft');
    const scale = read('src/components/design-system/lhCenteredModalScale.ts');
    expect(scale).toContain("LH_CENTERED_MODAL_RADIUS_CLASS = 'rounded-[22px]'");
    expect(scale).toContain("'overflow-hidden'");
  });
});

describe('helper activity cards use LhCardOverlay', () => {
  it('HelperApplicationCard opens description and profile in overlay, not inline expand', () => {
    const src = read('src/components/helpers/HelperApplicationCard.tsx');
    expect(src).toContain('LhCardOverlay');
    expect(src).toContain('helper-application-description-overlay');
    expect(src).toContain('helper-application-profile-overlay');
    expect(src).not.toContain('CandidateClientProfileExpand clientId={job.clientId} />');
    expect(src).not.toMatch(/descriptionOpen \? \(\s*<div className="overflow-hidden border-t/);
  });

  it('HelperAcceptedJobCard opens description in overlay, keeps complete/review handlers', () => {
    const src = read('src/components/helpers/HelperAcceptedJobCard.tsx');
    expect(src).toContain('LhCardOverlay');
    expect(src).toContain('helper-accepted-description-overlay');
    expect(src).toContain('onComplete');
    expect(src).toContain('upcoming_jobs.complete_work');
    expect(src).not.toMatch(/descriptionOpen \? \(\s*<div className="overflow-hidden border-t/);
  });
});

describe('vercel api handlers unchanged', () => {
  it('keeps exactly six Vercel API route handlers', () => {
    const routes = execSync('git ls-files api', { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter((line) => line.endsWith('.ts') && !line.includes('/_lib/'));
    expect(routes.sort()).toEqual(
      [
        'api/admin/dashboard-summary.ts',
        'api/gamification/me.ts',
        'api/gamification/recalculate.ts',
        'api/stripe/create-checkout-session.ts',
        'api/stripe/create-client-checkout-session.ts',
        'api/stripe/webhook.ts',
      ].sort(),
    );
  });
});
