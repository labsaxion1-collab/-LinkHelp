import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

describe('client home compact rank + history', () => {
  it('client home uses compact rank density 240–300px instead of Remotion hero slot body', () => {
    const slot = read('src/components/client/ClientDashboardHeroSlot.tsx');
    const presentation = read('src/gamification/components/GamificationRankPresentation.tsx');
    expect(slot).toContain('GamificationCompactRankCard');
    expect(slot).toContain("density=\"clientHome\"");
    expect(slot).not.toContain('DynamicHeroRenderer');
    expect(presentation).toContain("clientHome: 'min-h-[240px] max-h-[300px]'");
    expect(presentation).toContain('data-rank-density={density}');
    expect(presentation).toContain('whitespace-normal text-base');
    expect(presentation).toContain('gamification.compact_client_impact');
    expect(presentation).toContain('gamification-compact-rank-impact');
    expect(presentation).toContain('gamification-compact-rank-progress-wide');
    expect(presentation).toContain('lh-compact-rank-stage--client-home');
    expect(presentation).toContain('COMPACT_RANK_CLIENT_HOME_STAGE_OFFSET_Y_PX');
    expect(presentation).not.toMatch(/isClientHome[\s\S]*truncate text-base/);
  });

  it('removes duplicate white GamificationProgressCard only from ClientDashboard home', () => {
    const dash = read('src/pages/client/ClientDashboard.tsx');
    const profile = read('src/components/profile/ProfileGamificationSection.tsx');
    const helperDash = read('src/pages/helper/HelperDashboard.tsx');
    expect(dash).not.toContain('GamificationProgressCard');
    expect(dash).toContain('AppHomeClientQuickStrip');
    expect(profile).toContain('profile_page.section_level');
    expect(helperDash).toContain('GamificationProgressCard');
  });

  it('keeps Profile Meu nível on ProfileGamificationSection', () => {
    const profile = read('src/components/profile/ProfileGamificationSection.tsx');
    const dash = read('src/pages/profile/ProfileDashboardPage.tsx');
    expect(profile).toContain('profile_page.section_level');
    expect(dash).toContain('ProfileGamificationSection');
  });

  it('removes popular categories only from ClientDashboard home render', () => {
    const dash = read('src/pages/client/ClientDashboard.tsx');
    expect(dash).not.toContain('popular_categories_title');
    expect(dash).not.toContain('view_all_categories');
    expect(dash).not.toContain('category_order_count');
    expect(dash).toContain('CreateRequestModal');
  });

  it('activities only expose waiting and in_progress tabs', () => {
    const dash = read('src/pages/client/ClientDashboard.tsx');
    expect(dash).toContain("useState<'waiting' | 'in_progress'>('waiting')");
    expect(dash).toContain('grid-cols-2');
    expect(dash).not.toContain('client_jobs.tab_completed');
    expect(dash).not.toContain('ClientCompletedHistoryCard');
  });

  it('registers client history route and profile shortcut', () => {
    const constants = read('src/utils/constants.ts');
    const routes = read('src/routes/AppRoutes.tsx');
    const actions = read('src/components/profile/ProfileQuickActions.tsx');
    const profile = read('src/pages/profile/ProfileDashboardPage.tsx');
    expect(constants).toContain("clientHistory: '/client/history'");
    expect(routes).toContain('ROUTES.clientHistory');
    expect(routes).toContain('ClientHistoryPage');
    expect(actions).toContain('ROUTES.clientHistory');
    expect(profile).toContain('shortcut_client_history_desc');
  });

  it('detail panel + tutorial wiring stays on compact rank', () => {
    const card = read('src/gamification/components/GamificationCompactRankCard.tsx');
    const detail = read('src/gamification/components/GamificationRankDetailPanel.tsx');
    expect(card).toContain('GamificationRankDetailPanel');
    expect(detail).toContain('LhCardOverlay');
    expect(detail).toContain('GamificationTutorialModal');
    expect(detail).toContain('getTutorialInitialCardIdForLevel');
  });

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
