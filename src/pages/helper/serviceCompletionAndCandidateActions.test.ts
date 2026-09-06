import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolveMessage } from '@/services/translationService';
import { en } from '@/translations/en';
import { pt } from '@/translations/pt';
import { fr } from '@/translations/fr';
import { formatCompleteWorkError } from '@/utils/formatCompleteWorkError';
import { partitionHelperHistory } from '@/utils/helperHistoryBuckets';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { UpcomingJob } from '@/types/upcoming';

const root = new URL('../../../', import.meta.url);

function read(rel: string): string {
  return readFileSync(new URL(rel, root), 'utf8');
}

const t = (key: string, vars?: Record<string, string | number>) =>
  resolveMessage({ en, pt, fr }, 'pt', key, vars);

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
    status: 'in_progress',
    createdAt: 1_000,
    ...overrides,
  }) as Job;

const app = (overrides: Partial<Application> = {}): Application =>
  ({
    id: 'app-1',
    jobId: 'job-1',
    helperId,
    clientId: 'client-1',
    helperName: 'Help',
    helperAvatar: '/h.png',
    helperRating: 4.5,
    helperJobs: 3,
    status: 'accepted',
    createdAt: 2_000,
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

describe('service completion workflow', () => {
  it('ships migration with finalize + mark + confirm RPCs and idempotency', () => {
    const migrations = readdirSync(new URL('supabase/migrations/', root));
    const file = migrations.find((name) => name.endsWith('_service_completion_workflow.sql'));
    expect(file).toBeTruthy();
    const sql = read(`supabase/migrations/${file}`);
    expect(sql).toContain('create or replace function public.finalize_service_completion(');
    expect(sql).toContain('create or replace function public.helper_mark_service_awaiting_confirmation(');
    expect(sql).toContain('create or replace function public.client_confirm_service_completed(');
    expect(sql).toContain("'alreadyCompleted', true");
    expect(sql).toContain("'alreadyMarked', true");
    expect(sql).toContain('p_request_id uuid');
    expect(sql).toContain('p_upcoming_job_id uuid');
    expect(sql).not.toMatch(/link_credits|debit|vipApplyLc|charge/i);
  });

  it('remote finalize uses request_id and maps missing RPC + alreadyCompleted', () => {
    const remote = read('src/services/supabase/appDataRemote.ts');
    expect(remote).toContain("rpc('finalize_service_completion', { p_request_id: requestId })");
    expect(remote).toContain('alreadyCompleted');
    expect(remote).toContain('FINALIZE_RPC_NOT_DEPLOYED');
    expect(remote).toContain('MARK_AWAITING_RPC_NOT_DEPLOYED');
    expect(remote).toContain('isPostgrestMissingResource');
  });

  it('context treats alreadyCompleted as success without re-rewarding', () => {
    const ctx = read('src/context/AppDataContext.tsx');
    const start = ctx.indexOf('const finalizeServiceCompletion = async');
    const block = ctx.slice(start, start + 3500);
    expect(block).toContain('remote.alreadyCompleted');
    expect(block).toContain('alreadyCompleted: true');
    expect(block).toContain('COMPLETION_BACKEND_NOT_READY');
    expect(block).toContain("role === 'helper'");
  });

  it('helper UI maps remote errors instead of generic toast only', () => {
    const page = read('src/pages/helper/HelperUpcomingJobsPage.tsx');
    expect(page).toContain('formatCompleteWorkError');
    expect(page).toContain('completeBusyId');
    expect(page).toContain('complete_work_already_done');
    expect(page).not.toMatch(/showToast\(t\('upcoming_jobs\.complete_work_error'\), 'error'\)/);
  });

  it('maps known completion error codes to specific copy', () => {
    expect(formatCompleteWorkError(new Error('FINALIZE_RPC_NOT_DEPLOYED'), t)).toContain('migration');
    expect(formatCompleteWorkError(new Error('NOT_ALLOWED'), t)).toContain('Help contratado');
    expect(formatCompleteWorkError(new Error('REQUEST_NOT_IN_PROGRESS'), t)).toContain('andamento');
    expect(formatCompleteWorkError(new Error('SOME_UNKNOWN_CODE'), t)).toContain('SOME_UNKNOWN_CODE');
  });

  it('accepted work leaves activities after completed partition', () => {
    const active = partitionHelperHistory({
      helperId,
      applications: [app({ status: 'accepted' })],
      jobs: [job({ status: 'in_progress' })],
      upcomingJobs: [upcoming({ workflowStatus: 'accepted' })],
    });
    expect(active.activeAcceptedJobs.map((u) => u.id)).toEqual(['up-1']);

    const done = partitionHelperHistory({
      helperId,
      applications: [app({ status: 'completed' })],
      jobs: [job({ status: 'completed' })],
      upcomingJobs: [upcoming({ workflowStatus: 'completed' })],
    });
    expect(done.activeAcceptedJobs).toHaveLength(0);
    expect(done.completedServices.some((u) => u.jobId === 'job-1')).toBe(true);
  });

  it('VIP and normal hire share the same finalize RPC path', () => {
    const ctx = read('src/context/AppDataContext.tsx');
    const start = ctx.indexOf('const finalizeServiceCompletion = async');
    const block = ctx.slice(start, start + 2500);
    expect(block).toContain('remoteFinalizeServiceCompletion(requestId)');
    expect(block).not.toContain('isExclusive');
  });
});

describe('candidate choose CTA composition', () => {
  it('keeps Ver e escolher Help as primary CTA and ring informational when candidates exist', () => {
    const card = read('src/components/client/ClientActivityOpenRequestCard.tsx');
    expect(card).toContain('client-activity-choose-help-cta');
    expect(card).toContain('client-activity-summary-budget');
    expect(card).toContain('whitespace-nowrap');
    expect(card).toContain('onActivate={candidateCount > 0 ? undefined : openCandidatesPanel}');
    expect(card).not.toMatch(/position:\s*['"]absolute['"]/);
    const footerIdx = card.indexOf('client-activity-summary-footer');
    const footer = card.slice(footerIdx, footerIdx + 2200);
    expect(footer.indexOf('client-activity-choose-help-cta')).toBeLessThan(
      footer.indexOf('client-activity-footer-ring'),
    );
  });

  it('VIP panel stays compact with safe-area padding and full decision actions', () => {
    const card = read('src/components/client/ClientActivityOpenRequestCard.tsx');
    const vipIdx = card.indexOf('data-vip-layout="fit-no-inner-scroll"');
    const vip = card.slice(vipIdx, vipIdx + 6500);
    expect(vip).toContain('client-activity-vip-avatar');
    expect(vip).toContain('client-activity-vip-accept');
    expect(vip).toContain('client-activity-vip-reject');
    expect(card).toContain('client-activity-vip-actions');
    expect(card).toContain('env(safe-area-inset-bottom)');
    expect(card).toContain('candidate_index_label');
    expect(card).toContain('data-vip-layout="fit-no-inner-scroll"');
    expect(vip).not.toContain('flex-col items-center');
    expect(vip).not.toContain('max-h-[min(70vh,32rem)]');
    expect(vip).not.toContain('FEED_CARD_PREMIUM_SCROLL_CLASS');
  });

  it('exposes completion and CTA i18n in PT/EN/FR', () => {
    expect(resolveMessage({ en, pt, fr }, 'pt', 'client_dashboard.choose_help_cta')).toBe(
      'Ver e escolher Help',
    );
    expect(resolveMessage({ en, pt, fr }, 'en', 'upcoming_jobs.complete_work_backend_missing')).toMatch(
      /migration/i,
    );
    expect(resolveMessage({ en, pt, fr }, 'fr', 'upcoming_jobs.complete_work_not_allowed')).toMatch(
      /Help/,
    );
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
