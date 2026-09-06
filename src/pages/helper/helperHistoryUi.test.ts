import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveMessage } from '@/services/translationService';
import { en } from '@/translations/en';
import { pt } from '@/translations/pt';
import { fr } from '@/translations/fr';
import { ROUTES } from '@/utils/constants';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

describe('helper activities two tabs', () => {
  it('keeps only applications and accepted tabs', () => {
    const page = read('src/pages/helper/HelperUpcomingJobsPage.tsx');
    expect(page).toContain("type TasksTab = 'applications' | 'accepted'");
    expect(page).toContain('helper-activities-tabs');
    expect(page).toContain('upcoming_jobs.tab_applications');
    expect(page).toContain('upcoming_jobs.tab_accepted');
    expect(page).not.toContain('upcoming_jobs.tab_completed');
    expect(page).not.toContain('HelperCompletedHistoryCard');
    expect(page).toContain('partitionHelperHistory');
    expect(page).toContain('activeApplications');
    expect(page).toContain('empty_active_applications');
    expect(page).toContain('empty_active_jobs');
    expect(page).toContain("navigate(ROUTES.helperHistory");
  });

  it('does not filter historical applications out of bootstrap', () => {
    const remote = read('src/services/supabase/appDataRemote.ts');
    expect(remote).toContain("from('applications').select(select).order('created_at'");
    expect(remote).not.toMatch(/from\('applications'\)[\s\S]{0,80}\.in\('status'/);
  });

  it('does not keep rejected or completed records in activities filters', () => {
    const page = read('src/pages/helper/HelperUpcomingJobsPage.tsx');
    expect(page).not.toContain("'rejected', 'cancelled'");
    expect(page).not.toContain("setActiveTab('completed')");
  });
});

describe('helper history page and shortcut', () => {
  it('registers a helper-only history route', () => {
    const routes = read('src/routes/AppRoutes.tsx');
    const constants = read('src/utils/constants.ts');
    expect(ROUTES.helperHistory).toBe('/helper/history');
    expect(constants).toContain("helperHistory: '/helper/history'");
    expect(routes).toContain('HelperHistoryPage');
    expect(routes).toContain('ROUTES.helperHistory');
    expect(routes).toContain('requiredRole="helper"');
    const helperBlock = routes.slice(routes.indexOf('requiredRole="helper"'));
    const nextClient = helperBlock.indexOf('requiredRole="client"');
    const helperSection = nextClient === -1 ? helperBlock.slice(0, 800) : helperBlock.slice(0, nextClient);
    expect(helperSection).toContain('ROUTES.helperHistory');
  });

  it('history page has two tabs, profile back, overlays, and no delete', () => {
    const page = read('src/pages/helper/HelperHistoryPage.tsx');
    expect(page).toContain('helper-history-tabs');
    expect(page).toContain('history_tab_applications');
    expect(page).toContain('history_tab_completed');
    expect(page).toContain('HelperApplicationCard');
    expect(page).toContain('historyMode');
    expect(page).toContain('HelperCompletedHistoryCard');
    expect(page).toContain('openReviewByRequestId');
    expect(page).toContain('openSubmittedReviewByRequestId');
    expect(page).toContain('to={ROUTES.profile}');
    expect(page).toContain('helper-history-back');
    expect(page).toContain('empty_closed_applications');
    expect(page).toContain('empty_completed_title');
    expect(page).not.toContain('Excluir');
    expect(page).not.toContain('onCancel');
    expect(page).not.toContain('delete');
  });

  it('places Histórico below help using the same shortcut card', () => {
    const actions = read('src/components/profile/ProfileQuickActions.tsx');
    const dash = read('src/pages/profile/ProfileDashboardPage.tsx');
    expect(dash).toContain("t('profile_page.shortcut_history')");
    expect(dash).toContain("t('profile_page.shortcut_history_desc')");
    const helpIdx = actions.indexOf("key: 'help'");
    const settingsIdx = actions.indexOf("key: 'settings'");
    const historyIdx = actions.indexOf("key: 'history'");
    expect(helpIdx).toBeGreaterThan(0);
    expect(settingsIdx).toBeGreaterThan(helpIdx);
    expect(historyIdx).toBeGreaterThan(settingsIdx);
    expect(actions).toContain('History');
    expect(actions).toContain('ROUTES.helperHistory');
    expect(actions).toContain('profile-shortcut-${action.key}');
    expect(actions).toContain('grid-cols-2');
    expect(actions).toContain('min-h-[88px]');
  });
});

describe('pending application card refinement', () => {
  it('shows full budget, wait strip and anchored footer without duplicate wait badge', () => {
    const src = read('src/components/helpers/HelperApplicationCard.tsx');
    expect(src).toContain('helper-application-title');
    expect(src).toContain('line-clamp-2');
    expect(src).toContain('!showWaitStrip');
    expect(src).toContain('helper-application-status');
    expect(src).not.toContain("max-w-[4.75rem] truncate");
    expect(src).toContain('helper-application-budget');
    expect(src).toContain('formatJobBudgetAmount');
    expect(src).toContain('helper-application-proposal');
    expect(src).toContain('helper-application-wait-strip');
    expect(src).toContain('waiting_client_title');
    expect(src).toContain('formatApplicationSentAgo');
    expect(src).toContain('mt-auto');
    expect(src).toContain('helper-application-open-profile');
    expect(src).toContain('helper-application-open-description');
    expect(src).toContain('LhCardOverlay');
    expect(src).toContain("app.status === 'pending' || app.status === 'viewed'");
    expect(src).toContain('helper-application-cancel-menu-item');
    expect(src).not.toContain('helper_tasks.cancel_short');
    expect(src).toContain('flex min-w-0 flex-1');
    expect(src).not.toContain('InterestedRing');
  });

  it('uses specific banners for rejected, cancelled and expired history cards', () => {
    const src = read('src/components/helpers/HelperApplicationCard.tsx');
    expect(src).toContain('helper-application-rejected-banner');
    expect(src).toContain('rejected_banner_no_extra_charge');
    expect(src).toContain('helper-application-history-banner');
    expect(src).toContain('applicationHistoryBannerKey');
    expect(src).not.toContain('rejection_reason');
    expect(src).toContain('historyMode');
    expect(src).toContain('!historyMode');
  });
});

describe('helper history i18n pt/en/fr-CA', () => {
  it('exposes activity, shortcut and banner copy', () => {
    expect(resolveMessage({ en, pt, fr }, 'pt', 'helper_dashboard.empty_active_applications')).toBe(
      'Você não possui candidaturas ativas.',
    );
    expect(resolveMessage({ en, pt, fr }, 'en', 'helper_dashboard.empty_active_applications')).toBe(
      'You have no active applications.',
    );
    expect(resolveMessage({ en, pt, fr }, 'fr', 'helper_dashboard.empty_active_applications')).toBe(
      'Vous n’avez aucune candidature active.',
    );
    expect(resolveMessage({ en, pt, fr }, 'pt', 'upcoming_jobs.empty_active_jobs')).toBe(
      'Você não possui trabalhos ativos.',
    );
    expect(resolveMessage({ en, pt, fr }, 'en', 'upcoming_jobs.empty_active_jobs')).toBe(
      'You have no active jobs.',
    );
    expect(resolveMessage({ en, pt, fr }, 'fr', 'upcoming_jobs.empty_active_jobs')).toBe(
      'Vous n’avez aucun travail actif.',
    );
    expect(resolveMessage({ en, pt, fr }, 'pt', 'profile_page.shortcut_history')).toBe('Histórico');
    expect(resolveMessage({ en, pt, fr }, 'en', 'profile_page.shortcut_history')).toBe('History');
    expect(resolveMessage({ en, pt, fr }, 'fr', 'profile_page.shortcut_history')).toBe('Historique');
    expect(resolveMessage({ en, pt, fr }, 'pt', 'profile_page.shortcut_history_desc')).toBe(
      'Candidaturas encerradas e serviços concluídos',
    );
    expect(resolveMessage({ en, pt, fr }, 'en', 'profile_page.shortcut_history_desc')).toBe(
      'Closed applications and completed services',
    );
    expect(resolveMessage({ en, pt, fr }, 'fr', 'profile_page.shortcut_history_desc')).toBe(
      'Candidatures terminées et services conclus',
    );
    expect(resolveMessage({ en, pt, fr }, 'pt', 'upcoming_jobs.empty_closed_applications')).toBe(
      'Nenhuma candidatura encerrada.',
    );
    expect(resolveMessage({ en, pt, fr }, 'en', 'upcoming_jobs.empty_closed_applications')).toBe(
      'No closed applications.',
    );
    expect(resolveMessage({ en, pt, fr }, 'fr', 'upcoming_jobs.empty_closed_applications')).toBe(
      'Aucune candidature terminée.',
    );
    expect(resolveMessage({ en, pt, fr }, 'pt', 'helper_tasks.request_cancelled_banner')).toBe(
      'O pedido foi cancelado pelo cliente.',
    );
    expect(resolveMessage({ en, pt, fr }, 'en', 'helper_tasks.request_cancelled_banner')).toBe(
      'The client cancelled this request.',
    );
    expect(resolveMessage({ en, pt, fr }, 'fr', 'helper_tasks.request_cancelled_banner')).toBe(
      'Le client a annulé cette demande.',
    );
    expect(resolveMessage({ en, pt, fr }, 'pt', 'helper_tasks.request_expired_banner')).toBe(
      'Este pedido expirou.',
    );
    expect(resolveMessage({ en, pt, fr }, 'pt', 'helper_tasks.you_cancelled_banner')).toBe(
      'Você cancelou esta candidatura.',
    );
    expect(resolveMessage({ en, pt, fr }, 'pt', 'helper_tasks.waiting_client_title')).toBe(
      'Aguardando decisão do cliente',
    );
    expect(resolveMessage({ en, pt, fr }, 'pt', 'helper_tasks.rejected_banner_no_extra_charge')).toBe(
      'Nenhum crédito adicional será cobrado.',
    );
  });
});
