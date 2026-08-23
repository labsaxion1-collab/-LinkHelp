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

    // Card geometry preserved (height + full-bleed).
    expect(presentation).toContain('min-h-[170px]');
    expect(presentation).toContain('max-h-[210px]');
    expect(presentation).toContain('COMPACT_RANK_FULL_BLEED_CLASS');
    expect(presentation).toContain('w-[5.5rem] shrink-0');
    expect(presentation).toContain('sm:w-[6rem]');

    // Medal ~25% larger than previous 3.5rem / 3.85rem (sm).
    expect(presentation).toContain('h-[4.375rem] w-[4.375rem]');
    expect(presentation).toContain('sm:h-[4.8rem] sm:w-[4.8rem]');
    expect(presentation).not.toContain('h-[3.5rem] w-[3.5rem]');
    expect(presentation).not.toContain('sm:h-[3.85rem] sm:w-[3.85rem]');

    // Pedestal ~12–13% larger than previous 3.1×4.6 / 3.4×5 (sm).
    expect(presentation).toContain('h-[3.5rem] w-[5.2rem]');
    expect(presentation).toContain('sm:h-[3.85rem] sm:w-[5.65rem]');
    expect(presentation).not.toContain('h-[3.1rem] w-[4.6rem]');
    expect(presentation).not.toContain('sm:h-[3.4rem] sm:w-[5rem]');

    // Animation + centering lift preserved (no arbitrary offsets beyond mb).
    expect(presentation).toContain('lh-rank-compact-medal');
    expect(presentation).toContain('mb-[1.5rem]');
    expect(presentation).toContain('sm:mb-[1.7rem]');
    expect(css).toContain('@keyframes lhRankCompactMedalFloat');
    expect(css).toContain('.lh-rank-compact-medal');

    // Copy + open-details handler surface unchanged.
    expect(presentation).toContain('gamification.helper_level_eyebrow');
    expect(presentation).toContain('gamification.client_level_eyebrow');
    expect(presentation).toContain('gamification.next_prefix');
    expect(presentation).toContain('formatProgressSubtitle(progress, \'hero\', t)');
    expect(presentation).toContain('onOpenDetails');
    expect(presentation).toContain('data-testid="gamification-compact-rank-card"');
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
