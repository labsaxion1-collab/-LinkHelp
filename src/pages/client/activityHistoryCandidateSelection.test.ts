import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolveMessage } from '@/services/translationService';
import { en } from '@/translations/en';
import { pt } from '@/translations/pt';
import { fr } from '@/translations/fr';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { UpcomingJob } from '@/types/upcoming';
import { partitionHelperHistory } from '@/utils/helperHistoryBuckets';
import { classifyClientRequest, partitionClientRequests } from '@/utils/clientHistoryBuckets';
import { computeTrustScore } from '@/utils/reputationDossier';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

const helperId = 'helper-1';

const job = (overrides: Partial<Job> = {}): Job =>
  ({
    id: 'job-1',
    clientId: 'client-1',
    clientName: 'Client',
    clientAvatar: '/c.png',
    title: 'Limpeza',
    category: 'cleaning',
    description: 'Apto',
    date: '',
    location: 'Montreal',
    value: 'CAD $80',
    budgetMin: 80,
    budgetMax: 120,
    currency: 'CAD',
    urgency: 'normal',
    status: 'open',
    createdAt: 1_000,
    ...overrides,
  }) as Job;

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    jobId: 'job-1',
    helperId,
    clientId: 'client-1',
    helperName: 'Bulbasaur',
    helperAvatar: '/h.png',
    helperRating: 4.5,
    helperJobs: 3,
    status: 'pending',
    createdAt: 2_000,
    proposedAmount: 100,
    ...overrides,
  }) as Application;

const upcoming = (overrides: Partial<UpcomingJob> = {}): UpcomingJob =>
  ({
    id: 'up-1',
    helperId,
    jobId: 'job-1',
    clientName: 'Client',
    clientAvatar: '/c.png',
    title: 'Limpeza',
    category: 'cleaning',
    description: 'Apto',
    location: 'Montreal',
    value: '100',
    urgency: 'normal',
    scheduledAt: 3_000,
    workflowStatus: 'accepted',
    completionRequestedAt: null,
    reviewWindowEndsAt: null,
    createdAt: 2_500,
    ...overrides,
  }) as UpcomingJob;

describe('helper activities candidaturas after apply', () => {
  it('1. pending normal application appears in Minhas candidaturas', () => {
    const result = partitionHelperHistory({
      helperId,
      applications: [app({ status: 'pending', isExclusive: false })],
      jobs: [job()],
      upcomingJobs: [],
    });
    expect(result.activeApplications.map((a) => a.id)).toEqual(['app-1']);
    expect(result.activeAcceptedJobs).toHaveLength(0);
  });

  it('2. pending VIP application appears in Minhas candidaturas', () => {
    const result = partitionHelperHistory({
      helperId,
      applications: [app({ status: 'pending', isExclusive: true })],
      jobs: [job({ exclusiveHelperId: helperId })],
      upcomingJobs: [],
    });
    expect(result.activeApplications.map((a) => a.id)).toEqual(['app-1']);
    expect(result.activeApplications[0]?.isExclusive).toBe(true);
  });

  it('3. accepted application moves to Trabalhos aceitos', () => {
    const result = partitionHelperHistory({
      helperId,
      applications: [app({ status: 'accepted' })],
      jobs: [job({ status: 'in_progress' })],
      upcomingJobs: [upcoming({ workflowStatus: 'accepted' })],
    });
    expect(result.activeApplications).toHaveLength(0);
    expect(result.activeAcceptedJobs.map((u) => u.id)).toEqual(['up-1']);
  });

  it('4. rejected/cancelled/expired leave active activities', () => {
    for (const status of ['rejected', 'cancelled'] as const) {
      const result = partitionHelperHistory({
        helperId,
        applications: [app({ id: `app-${status}`, status })],
        jobs: [job()],
        upcomingJobs: [],
      });
      expect(result.activeApplications).toHaveLength(0);
      expect(result.applicationHistory.some((a) => a.status === status)).toBe(true);
    }

    const expired = partitionHelperHistory({
      helperId,
      applications: [app({ status: 'pending' })],
      jobs: [job({ status: 'expired', expiresAt: Date.now() - 60_000 })],
      upcomingJobs: [],
    });
    expect(expired.activeApplications).toHaveLength(0);
    expect(expired.applicationHistory).toHaveLength(1);
  });

  it('hydrates local applications after remote applyForJob', () => {
    const ctx = read('src/context/AppDataContext.tsx');
    expect(ctx).toContain('submitHelperApplication');
    expect(ctx).toContain('patchApplicationRow({ id: submitResult.applicationId })');
    expect(ctx).toContain('if (options?.isExclusive)');
    expect(ctx).toContain('await patchRequestRow({ id: jobId })');
    expect(ctx).toMatch(
      /a\.id !== app\.id && !\(a\.jobId === app\.jobId && a\.helperId === app\.helperId\)/,
    );
  });
});

describe('client waiting card choose-help CTAs', () => {
  it('5-7. choose Help / VIP CTAs and no CTA without candidates', () => {
    const src = read('src/components/client/ClientActivityOpenRequestCard.tsx');
    expect(src).toContain('client-activity-choose-help-cta');
    expect(src).toContain('client-activity-view-vip-cta');
    expect(src).toContain("t('client_dashboard.choose_help_cta')");
    expect(src).toContain("t('client_dashboard.view_vip_application_cta')");
    expect(src).toContain('candidateCount > 0');
    expect(src).not.toContain('Aceitar atividade');
    expect(src).not.toContain('accept_activity');
  });
});

describe('candidate profile reputation display', () => {
  it('8. profile without reviews shows empty state and real score', () => {
    const src = read('src/components/client/CandidateHelperProfileExpand.tsx');
    expect(src).toContain('candidate-profile-no-reviews');
    expect(src).toContain("t('candidate_profile.no_reviews_yet')");
    expect(src).toContain('candidate-profile-score');
    expect(src).toContain('computeTrustScore');
    expect(computeTrustScore(0, 0, 0)).toBe(0);
    expect(computeTrustScore(3, 4.5, 0)).toBe(Math.min(100, Math.round(3 * 6 + 4.5 * 12)));
  });

  it('9. profile with reviews shows average and count', () => {
    const src = read('src/components/client/CandidateHelperProfileExpand.tsx');
    expect(src).toContain('candidate-profile-rating');
    expect(src).toContain("t('candidate_profile.average_rating_label'");
    expect(src).toContain("t('candidate_profile.total_reviews'");
    expect(src).toContain('dossier.reviewCount > 0');
  });

  it('10. choose CTA and VIP accept do not introduce a second debit path', () => {
    const card = read('src/components/client/ClientActivityOpenRequestCard.tsx');
    const ctx = read('src/context/AppDataContext.tsx');
    expect(card).not.toContain('chargeApplicationInterest');
    expect(card).not.toContain('helper_submit_application');
    expect(card).toContain('onAccept(app)');
    expect(ctx).toContain('remoteOfficiallyHireHelper');
    const applyStart = ctx.indexOf('const applyForJob = async');
    const applyEnd = ctx.indexOf('const helperName = profile?.name?.trim() || \'Helper\';', applyStart + 1);
    const applyBlock = ctx.slice(applyStart, applyEnd);
    expect(applyBlock).toContain('submitHelperApplication');
    expect(applyBlock).toContain('patchApplicationRow');
    expect(applyBlock).not.toContain('chargeApplicationInterest');
  });
});

describe('client history buckets and compact closed card', () => {
  it('11. cancelled/expired/completed stay in correct buckets', () => {
    const now = Date.now();
    expect(classifyClientRequest(job({ status: 'cancelled' }), now)).toBe('closed');
    expect(classifyClientRequest(job({ status: 'expired' }), now)).toBe('closed');
    expect(
      classifyClientRequest(job({ status: 'open', expiresAt: now - 1_000 }), now),
    ).toBe('closed');
    expect(classifyClientRequest(job({ status: 'completed' }), now)).toBe('completed');

    const partitioned = partitionClientRequests({
      clientId: 'client-1',
      jobs: [
        job({ id: 'c1', status: 'cancelled' }),
        job({ id: 'e1', status: 'expired' }),
        job({ id: 'd1', status: 'completed' }),
        job({ id: 'w1', status: 'open', expiresAt: now + 60_000 }),
      ],
      now,
    });
    expect(partitioned.closed.map((j) => j.id).sort()).toEqual(['c1', 'e1']);
    expect(partitioned.completed.map((j) => j.id)).toEqual(['d1']);
    expect(partitioned.waiting.map((j) => j.id)).toEqual(['w1']);
  });

  it('closed card uses compact helper-like shell without locked empty height', () => {
    const src = read('src/components/client/ClientHistoryClosedCard.tsx');
    expect(src).toContain('feedCardMinContentStyle');
    expect(src).toContain('client-history-closed-status');
    expect(src).toContain('client_dashboard.activity_modality');
    expect(src).toContain('formatJobOpenedAt');
    expect(src).not.toContain('feedCardLockedContentStyle');
    expect(src).not.toContain('FEED_CARD_PREMIUM_SURFACE_CLASS');
  });
});

describe('activity history i18n and VIP panel contract', () => {
  it('12. translations PT/EN/FR for CTAs and pending status', () => {
    expect(resolveMessage({ en, pt, fr }, 'pt', 'client_dashboard.choose_help_cta')).toBe(
      'Ver e escolher Help',
    );
    expect(resolveMessage({ en, pt, fr }, 'en', 'client_dashboard.choose_help_cta')).toBe(
      'View and choose Help',
    );
    expect(resolveMessage({ en, pt, fr }, 'fr', 'client_dashboard.choose_help_cta')).toBe(
      'Voir et choisir un Help',
    );
    expect(resolveMessage({ en, pt, fr }, 'pt', 'client_dashboard.view_vip_application_cta')).toBe(
      'Ver candidatura VIP',
    );
    expect(resolveMessage({ en, pt, fr }, 'en', 'client_dashboard.view_vip_application_cta')).toBe(
      'View VIP application',
    );
    expect(resolveMessage({ en, pt, fr }, 'fr', 'client_dashboard.view_vip_application_cta')).toBe(
      'Voir la candidature VIP',
    );
    expect(resolveMessage({ en, pt, fr }, 'pt', 'helper_dashboard.app_pending')).toBe(
      'Aguardando decisão do cliente',
    );
    expect(resolveMessage({ en, pt, fr }, 'en', 'helper_dashboard.app_pending')).toBe(
      'Waiting for client decision',
    );
    expect(resolveMessage({ en, pt, fr }, 'fr', 'helper_dashboard.app_pending')).toBe(
      'En attente de la décision du client',
    );
    expect(resolveMessage({ en, pt, fr }, 'pt', 'candidate_profile.no_reviews_yet')).toBe(
      'Ainda sem avaliações',
    );
  });

  it('13. VIP panel alignment contract keeps avatar centered and actions accessible', () => {
    const src = read('src/components/client/ClientActivityOpenRequestCard.tsx');
    const vipIdx = src.indexOf('client-activity-vip-panel');
    expect(vipIdx).toBeGreaterThan(-1);
    const vipBlock = src.slice(vipIdx, vipIdx + 3200);
    expect(vipBlock).toContain('flex-col items-center');
    expect(vipBlock).toContain('pt-6');
    expect(vipBlock).toContain('client-activity-vip-avatar');
    expect(vipBlock).toContain('client-activity-vip-open-profile');
    expect(src).toContain('client-activity-vip-actions');
    expect(src).toContain('env(safe-area-inset-bottom)');
    expect(vipBlock).toContain('h-14 w-14');
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
