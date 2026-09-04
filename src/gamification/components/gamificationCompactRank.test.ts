import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { buildCompactRankInsightChips } from '@/gamification/components/compactRankInsights';
import { buildGamificationRankProgressModel } from '@/gamification/components/GamificationRankPresentation';
import type { UserGamificationRecord } from '@/gamification/services/gamificationService';
import { EMPTY_GAMIFICATION_STATS } from '@/gamification/services/gamificationStatsAdapter';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

const t = (key: string, options?: Record<string, string | number>) => {
  const templates: Record<string, string> = {
    'gamification.compact_chip_score': '{{count}} pts',
    'gamification.compact_chip_services': '{{count}} serviços',
    'gamification.compact_chip_orders': '{{count}} pedidos',
    'gamification.compact_chip_rating': '★ {{rating}}',
    'gamification.compact_chip_rating_none': 'gamification.compact_chip_rating_none',
    'gamification.compact_chip_response': '{{pct}}%',
    'gamification.compact_chip_applications': '{{count}} candidaturas',
    'gamification.compact_chip_profile': 'Perfil {{pct}}%',
    'gamification.reach_more_points': 'Alcançar mais {{count}} pontos',
    'gamification.req_services_left': '{{count}} serviço(s) restante(s)',
    'gamification.req_min_rating': 'Nota mínima {{rating}}',
    'gamification.req_response_rate': 'Taxa de resposta {{pct}}%',
  };
  const base = templates[key] ?? key;
  if (!options) return base;
  return Object.entries(options).reduce(
    (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)),
    base,
  );
};

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
    expect(presentation).toContain('max-h-[210px]');
    expect(presentation).toContain('COMPACT_RANK_FULL_BLEED_CLASS');
    expect(presentation).toContain('px-4');
    expect(presentation).not.toContain('border-slate-200/90 bg-white');
  });

  it('keeps approved card heights and separates medal/pedestal optical scales', () => {
    const presentation = read('src/gamification/components/GamificationRankPresentation.tsx');
    const css = read('src/styles/globals.css');
    const visualCfg = read('src/gamification/config/compactRankHeroVisual.ts');

    expect(presentation).toContain('min-h-[170px]');
    expect(presentation).toContain('max-h-[210px]');
    expect(presentation).toContain("clientHome: 'min-h-[240px] max-h-[300px]'");
    expect(presentation).toContain('COMPACT_RANK_FULL_BLEED_CLASS');
    expect(presentation).toContain('w-[5.5rem] shrink-0');
    expect(presentation).toContain('sm:w-[6rem]');

    expect(presentation).toContain('lh-compact-rank-stage');
    expect(presentation).toContain('lh-rank-compact-medal');
    expect(presentation).toContain('lh-rank-compact-medal-viewport');
    expect(presentation).toContain('lh-rank-compact-medal-glyph');
    expect(presentation).toContain('lh-rank-compact-pedestal-glyph');
    expect(presentation).toContain('--lh-compact-emblem-scale');
    expect(presentation).toContain('--lh-compact-emblem-offset-y');
    expect(presentation).toContain('--lh-compact-pedestal-scale');
    expect(presentation).toContain('heroVisual.pedestalScale');
    expect(presentation).toContain('heroVisual.pedestalOrigin');
    expect(presentation).toContain('resolveCompactEmblemOffsetYPx');
    expect(presentation).toContain('emblemOffsetYPx');
    expect(presentation).toContain('--lh-compact-emblem-offset-y');
    expect(presentation).toContain('COMPACT_RANK_MEDAL_PEDESTAL_OVERLAP_CLASS');
    expect(presentation).toContain('lh-compact-rank-stage--client-home');
    expect(presentation).toContain('COMPACT_RANK_CLIENT_HOME_STAGE_OFFSET_Y_PX');

    expect(css).toContain('.lh-rank-compact-pedestal-glyph');
    expect(css).toMatch(
      /\.lh-rank-compact-medal-glyph\s*\{[^}]*translateY\(var\(--lh-compact-emblem-offset-y/s,
    );
    expect(css).toContain('.lh-compact-rank-stage--client-home');
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);

    expect(visualCfg).toContain('pedestalScale');
    expect(visualCfg).toContain('emblemOffsetY');
    expect(visualCfg).toContain('COMPACT_RANK_CLIENT_HOME_STAGE_OFFSET_Y_PX = 10');
    expect(visualCfg).toContain("COMPACT_RANK_MEDAL_PEDESTAL_OVERLAP_CLASS = '-mb-3.5'");
    expect(visualCfg).toContain('COMPACT_RANK_PEDESTAL_TARGET_VISIBLE_PX = 105');
    expect(presentation).toContain('buildCompactRankInsightChips');
    expect(presentation).toContain('gamification-compact-rank-insights');
    expect(presentation).toContain('onOpenDetails');
    expect(presentation).toContain('data-testid="gamification-compact-rank-card"');
  });

  it('provides per-heroKey emblem and pedestal optics for every MEDAL_MAP entry', async () => {
    const { MEDAL_MAP } = await import('@/gamification/config/gamificationMedals');
    const {
      COMPACT_RANK_BY_HERO_KEY,
      COMPACT_RANK_EMBLEM_VIEWPORT_PX,
      COMPACT_RANK_EMBLEM_TARGET_VISIBLE_PX,
      COMPACT_RANK_PEDESTAL_TARGET_VISIBLE_PX,
      COMPACT_RANK_MEDAL_PEDESTAL_OVERLAP_CLASS,
      CLIENT_HOME_NOVO_EMBLEM_OFFSET_Y_PX,
      compactPedestalVisibleWidthPx,
      resolveCompactRankHeroVisual,
    } = await import('@/gamification/config/compactRankHeroVisual');

    const medalKeys = Object.keys(MEDAL_MAP).sort();
    const visualKeys = Object.keys(COMPACT_RANK_BY_HERO_KEY).sort();
    expect(visualKeys).toEqual(medalKeys);
    expect(medalKeys).toHaveLength(11);
    expect(COMPACT_RANK_EMBLEM_TARGET_VISIBLE_PX).toBeLessThanOrEqual(COMPACT_RANK_EMBLEM_VIEWPORT_PX);

    for (const heroKey of medalKeys) {
      const visual = COMPACT_RANK_BY_HERO_KEY[heroKey];
      expect(visual.emblemScale, heroKey).toBeGreaterThan(1);
      expect(visual.emblemScale, heroKey).toBeLessThan(2.5);
      expect(visual.emblemOrigin, heroKey).toMatch(/^center \d+(\.\d+)?%$/);
      expect(visual.pedestalScale, heroKey).toBeGreaterThan(1);
      expect(visual.pedestalScale, heroKey).toBeLessThan(2.2);
      expect(visual.pedestalFillW, heroKey).toBeGreaterThan(0.5);
      expect(visual.pedestalFillW, heroKey).toBeLessThan(0.85);
      expect(visual.pedestalFillH, heroKey).toBeGreaterThan(0.2);
      expect(visual.pedestalFillH, heroKey).toBeLessThan(0.5);
      expect(visual.pedestalOrigin, heroKey).toMatch(/^center \d+(\.\d+)?%$/);
      expect(visual.emblemOffsetY, heroKey).toBeTypeOf('number');
      expect(visual.emblemOffsetY, heroKey).toBeGreaterThanOrEqual(0);
      expect(visual.emblemOffsetY, heroKey).toBeLessThanOrEqual(6);

      const impliedFill =
        COMPACT_RANK_EMBLEM_TARGET_VISIBLE_PX / (COMPACT_RANK_EMBLEM_VIEWPORT_PX * visual.emblemScale);
      expect(visual.emblemScale * impliedFill, heroKey).toBeLessThanOrEqual(1.001);

      const visiblePedestal = compactPedestalVisibleWidthPx(
        visual.pedestalFillW,
        visual.pedestalScale,
      );
      expect(visiblePedestal, heroKey).toBeGreaterThanOrEqual(98);
      expect(visiblePedestal, heroKey).toBeLessThanOrEqual(112);

      const userType = heroKey.startsWith('client') ? 'client' : 'helper';
      const resolved = resolveCompactRankHeroVisual(userType, heroKey);
      expect(resolved.pedestalScale).toBe(visual.pedestalScale);
    }

    const helperConfiavel = COMPACT_RANK_BY_HERO_KEY.helper_confiavel;
    expect(helperConfiavel.emblemScale).toBeCloseTo(1.664, 3);
    expect(helperConfiavel.emblemOffsetY).toBe(5);
    // Offset does not change scale / pedestal optics.
    expect(helperConfiavel.pedestalScale).toBeCloseTo(1.536, 3);
    const pedestalW = compactPedestalVisibleWidthPx(
      helperConfiavel.pedestalFillW,
      helperConfiavel.pedestalScale,
    );
    expect(pedestalW).toBeGreaterThanOrEqual(100);
    expect(pedestalW).toBeLessThanOrEqual(110);
    // Visible pedestal ≈25–37% wider than ~80px diamond.
    const diamondApprox = 80;
    expect(pedestalW / diamondApprox).toBeGreaterThanOrEqual(1.25);
    expect(pedestalW / diamondApprox).toBeLessThanOrEqual(1.37);
    expect(COMPACT_RANK_PEDESTAL_TARGET_VISIBLE_PX).toBe(105);
    expect(COMPACT_RANK_MEDAL_PEDESTAL_OVERLAP_CLASS).toBe('-mb-3.5');
    // Float peak is -3px; +5px glyph offset keeps ink inside the viewport.
    expect(helperConfiavel.emblemOffsetY - 3).toBeGreaterThanOrEqual(0);
    // Other keys keep zero offset (no global vertical shift).
    expect(COMPACT_RANK_BY_HERO_KEY.helper_novo.emblemOffsetY).toBe(0);
    expect(COMPACT_RANK_BY_HERO_KEY.client_novo.emblemOffsetY).toBe(CLIENT_HOME_NOVO_EMBLEM_OFFSET_Y_PX);
  });

  it('applies client_novo emblemOffsetY only under clientHome density', async () => {
    const {
      COMPACT_RANK_BY_HERO_KEY,
      CLIENT_HOME_NOVO_EMBLEM_OFFSET_Y_PX,
      resolveCompactEmblemOffsetYPx,
    } = await import('@/gamification/config/compactRankHeroVisual');
    const visual = COMPACT_RANK_BY_HERO_KEY.client_novo;
    expect(
      resolveCompactEmblemOffsetYPx({
        density: 'clientHome',
        userType: 'client',
        heroKey: 'client_novo',
        visual,
      }),
    ).toBe(CLIENT_HOME_NOVO_EMBLEM_OFFSET_Y_PX);
    expect(
      resolveCompactEmblemOffsetYPx({
        density: 'default',
        userType: 'client',
        heroKey: 'client_novo',
        visual,
      }),
    ).toBe(0);
    expect(
      resolveCompactEmblemOffsetYPx({
        density: 'clientHome',
        userType: 'client',
        heroKey: 'client_confiavel',
        visual: COMPACT_RANK_BY_HERO_KEY.client_confiavel,
      }),
    ).toBe(0);
  });

  it('helper insight chips use real next-level metrics without hardcoding', () => {
    const record: UserGamificationRecord = {
      userId: 'u1',
      userType: 'helper',
      score: 105,
      levelKey: 'confiavel',
      heroKey: 'helper_confiavel',
      stats: {
        ...EMPTY_GAMIFICATION_STATS,
        totalCompleted: 0,
        avgRating: 4.2,
        responseRate: 60,
      },
      progressPercent: 0,
      pointsToNextLevel: 0,
      missingRequirements: [],
      updatedAt: '2026-08-23T00:00:00.000Z',
    };
    const model = buildGamificationRankProgressModel('helper', record, t);
    expect(model).not.toBeNull();
    const chips = buildCompactRankInsightChips(model!, t, { userType: 'helper' });
    expect(chips.map((c) => c.id)).toEqual(['score', 'services', 'rating', 'response']);
    expect(chips[0].label).toContain('105');
    expect(chips.find((c) => c.id === 'services')?.label).toContain('3');
    expect(chips.find((c) => c.id === 'rating')?.label).toContain('4.5');
    expect(chips.find((c) => c.id === 'response')?.label).toContain('70');
    expect(JSON.stringify(chips)).not.toMatch(/\$\d|CAD|Stripe|credit/i);
  });

  it('client insight chips use canonical metrics and honest rating empty state', () => {
    const record: UserGamificationRecord = {
      userId: 'c1',
      userType: 'client',
      score: 40,
      levelKey: 'novo',
      heroKey: 'client_novo',
      stats: {
        ...EMPTY_GAMIFICATION_STATS,
        totalCompleted: 0,
        avgRating: 0,
        profilePct: 40,
      },
      progressPercent: 0,
      pointsToNextLevel: 0,
      missingRequirements: [],
      updatedAt: '2026-08-23T00:00:00.000Z',
    };
    const model = buildGamificationRankProgressModel('client', record, t);
    expect(model).not.toBeNull();
    const chips = buildCompactRankInsightChips(model!, t, { userType: 'client' });
    expect(chips.map((c) => c.id)).toEqual(['score', 'services', 'rating', 'profile']);
    expect(chips.find((c) => c.id === 'score')?.label).toContain('40');
    expect(chips.find((c) => c.id === 'services')?.label).toContain('1');
    expect(chips.find((c) => c.id === 'rating')?.label).toBe('gamification.compact_chip_rating_none');
    expect(chips.find((c) => c.id === 'profile')?.label).toContain('80');
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
    expect(card).toContain('{category}');
    expect(card).toContain('CategoryIcon');
    expect(card).toContain('truncate text-left text-[11px] font-semibold uppercase');
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
