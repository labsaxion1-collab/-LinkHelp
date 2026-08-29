import { describe, expect, it } from 'vitest';
import type { Application, ApplicationStatus } from '@/types/application';
import type { Job } from '@/types/job';
import type { UpcomingJob, UpcomingWorkflowStatus } from '@/types/upcoming';
import {
  KNOWN_APPLICATION_STATUSES,
  partitionHelperHistory,
  resolveApplicationHistoryReason,
  sanitizeStatusForDiagnostic,
} from '@/utils/helperHistoryBuckets';

const helperId = 'helper-1';

const job = (overrides: Partial<Job> = {}): Job =>
  ({
    id: 'job-1',
    clientId: 'client-1',
    clientName: 'Pikachu',
    clientAvatar: '/c.png',
    title: 'Tradução: Imigração',
    category: 'translation',
    description: 'Docs',
    date: '',
    location: 'Montreal',
    value: 'CAD $80',
    budgetMin: 80,
    budgetMax: 180,
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
    helperName: 'Help',
    helperAvatar: '/h.png',
    helperRating: 5,
    helperJobs: 1,
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
    clientName: 'Pikachu',
    clientAvatar: '/c.png',
    title: 'Tradução: Imigração',
    category: 'translation',
    description: 'Docs',
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

function ids(list: { id: string }[]): string[] {
  return list.map((x) => x.id).sort();
}

function bucketIds(result: ReturnType<typeof partitionHelperHistory>) {
  return {
    activeApplications: ids(result.activeApplications),
    activeAcceptedJobs: ids(result.activeAcceptedJobs),
    applicationHistory: ids(result.applicationHistory),
    completedServices: ids(result.completedServices),
  };
}

describe('partitionHelperHistory', () => {
  it('puts pending/viewed only in Minhas candidaturas', () => {
    const pending = app({ id: 'p', status: 'pending' });
    const viewed = app({ id: 'v', status: 'viewed', createdAt: 3_000 });
    const result = partitionHelperHistory({
      helperId,
      applications: [pending, viewed],
      jobs: [job()],
      upcomingJobs: [],
    });
    expect(bucketIds(result)).toEqual({
      activeApplications: ['p', 'v'],
      activeAcceptedJobs: [],
      applicationHistory: [],
      completedServices: [],
    });
  });

  it('puts accepted/in_progress only in Trabalhos aceitos', () => {
    const accepted = app({ id: 'a', status: 'accepted' });
    const inProgress = upcoming({
      id: 'up-progress',
      workflowStatus: 'in_progress',
    });
    const result = partitionHelperHistory({
      helperId,
      applications: [accepted],
      jobs: [job({ status: 'in_progress' })],
      upcomingJobs: [inProgress],
    });
    expect(result.activeApplications).toEqual([]);
    expect(result.applicationHistory).toEqual([]);
    expect(result.completedServices).toEqual([]);
    expect(ids(result.activeAcceptedJobs)).toEqual(['up-progress']);
  });

  it('puts rejected/cancelled/expired only in application history', () => {
    const rejected = app({ id: 'r', status: 'rejected', jobId: 'j-r' });
    const cancelled = app({ id: 'c', status: 'cancelled', jobId: 'j-c' });
    const expired = app({ id: 'e', status: 'pending', jobId: 'j-e' });
    const result = partitionHelperHistory({
      helperId,
      applications: [rejected, cancelled, expired],
      jobs: [
        job({ id: 'j-r', status: 'open' }),
        job({ id: 'j-c', status: 'open' }),
        // Legacy fallback: preferredDate past when expiresAt absent
        job({ id: 'j-e', status: 'open', preferredDate: '2020-01-01', expiresAt: null }),
      ],
      upcomingJobs: [],
    });
    expect(ids(result.activeApplications)).toEqual([]);
    expect(ids(result.activeAcceptedJobs)).toEqual([]);
    expect(ids(result.completedServices)).toEqual([]);
    expect(ids(result.applicationHistory)).toEqual(['c', 'e', 'r']);
  });

  it('keeps open listing with past preferredDate when expiresAt is future', () => {
    const pending = app({ id: 'p', status: 'pending' });
    const result = partitionHelperHistory({
      helperId,
      applications: [pending],
      jobs: [
        job({
          status: 'open',
          preferredDate: '2020-01-01',
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        }),
      ],
      upcomingJobs: [],
    });
    expect(ids(result.activeApplications)).toEqual(['p']);
    expect(ids(result.applicationHistory)).toEqual([]);
  });

  it('moves explicit status expired to history even without expiresAt', () => {
    const pending = app({ id: 'p', status: 'pending' });
    const result = partitionHelperHistory({
      helperId,
      applications: [pending],
      jobs: [job({ status: 'expired', expiresAt: null, preferredDate: null })],
      upcomingJobs: [],
    });
    expect(ids(result.activeApplications)).toEqual([]);
    expect(ids(result.applicationHistory)).toEqual(['p']);
  });

  it('puts completed only in Serviços concluídos', () => {
    const completedApp = app({ id: 'done-app', status: 'completed' });
    const doneUp = upcoming({ id: 'up-done', workflowStatus: 'completed' });
    const result = partitionHelperHistory({
      helperId,
      applications: [completedApp],
      jobs: [job({ status: 'completed' })],
      upcomingJobs: [doneUp],
    });
    expect(result.activeApplications).toEqual([]);
    expect(result.activeAcceptedJobs).toEqual([]);
    expect(result.applicationHistory).toEqual([]);
    expect(ids(result.completedServices)).toEqual(['up-done']);
  });

  it('never duplicates a record across buckets', () => {
    const apps: Application[] = KNOWN_APPLICATION_STATUSES.map((status, i) =>
      app({
        id: `app-${status}`,
        jobId: `job-${status}`,
        status,
        createdAt: i + 1,
      }),
    );
    const jobs = KNOWN_APPLICATION_STATUSES.map((status) =>
      job({
        id: `job-${status}`,
        status:
          status === 'accepted'
            ? 'in_progress'
            : status === 'completed'
              ? 'completed'
              : 'open',
      }),
    );
    const upcomingJobs: UpcomingJob[] = [
      upcoming({
        id: 'up-accepted',
        jobId: 'job-accepted',
        workflowStatus: 'accepted',
      }),
      upcoming({
        id: 'up-completed',
        jobId: 'job-completed',
        workflowStatus: 'completed',
        scheduledAt: 9_000,
      }),
    ];
    const result = partitionHelperHistory({ helperId, applications: apps, jobs, upcomingJobs });
    const appIdSets = [result.activeApplications, result.applicationHistory].map(
      (list) => list.map((a) => a.id),
    );
    const allAppIds = appIdSets.flat();
    expect(new Set(allAppIds).size).toBe(allAppIds.length);

    const jobKeys = [...result.activeAcceptedJobs, ...result.completedServices].map((u) => u.jobId);
    expect(new Set(jobKeys).size).toBe(jobKeys.length);

    expect(ids(result.activeApplications).sort()).toEqual(['app-pending', 'app-viewed']);
    expect(ids(result.applicationHistory).sort()).toEqual(['app-cancelled', 'app-rejected']);
    expect(result.activeAcceptedJobs.some((u) => u.jobId === 'job-accepted')).toBe(true);
    expect(result.completedServices.some((u) => u.jobId === 'job-completed')).toBe(true);
  });

  it('does not silently drop a known application status', () => {
    const covered = new Set<ApplicationStatus>();
    for (const status of KNOWN_APPLICATION_STATUSES) {
      const result = partitionHelperHistory({
        helperId,
        applications: [app({ id: `a-${status}`, status, jobId: `j-${status}` })],
        jobs: [
          job({
            id: `j-${status}`,
            status: status === 'completed' ? 'completed' : status === 'accepted' ? 'in_progress' : 'open',
          }),
        ],
        upcomingJobs:
          status === 'accepted'
            ? [upcoming({ id: 'up-a', jobId: `j-${status}`, workflowStatus: 'in_progress' })]
            : status === 'completed'
              ? [upcoming({ id: 'up-c', jobId: `j-${status}`, workflowStatus: 'completed' })]
              : [],
      });
      const appears =
        result.activeApplications.some((a) => a.status === status) ||
        result.applicationHistory.some((a) => a.status === status) ||
        (status === 'accepted' && result.activeAcceptedJobs.length > 0) ||
        (status === 'completed' && result.completedServices.length > 0);
      if (appears) covered.add(status);
    }
    expect([...covered].sort()).toEqual([...KNOWN_APPLICATION_STATUSES].sort());
  });

  it('moves request-cancelled waiting apps to history', () => {
    const result = partitionHelperHistory({
      helperId,
      applications: [app({ status: 'pending' })],
      jobs: [job({ status: 'cancelled' })],
      upcomingJobs: [],
    });
    expect(ids(result.activeApplications)).toEqual([]);
    expect(ids(result.applicationHistory)).toEqual(['app-1']);
    expect(resolveApplicationHistoryReason(app({ status: 'pending' }), job({ status: 'cancelled' }))).toBe(
      'request_cancelled',
    );
  });

  it('keeps cancelled upcoming/work out of activities', () => {
    const result = partitionHelperHistory({
      helperId,
      applications: [app({ status: 'accepted' })],
      jobs: [job({ status: 'cancelled' })],
      upcomingJobs: [upcoming({ workflowStatus: 'cancelled' as UpcomingWorkflowStatus })],
    });
    expect(result.activeAcceptedJobs).toEqual([]);
    expect(ids(result.applicationHistory)).toEqual(['app-1']);
  });

  it('sanitizes unknown statuses and falls back to history', () => {
    const weird = app({ id: 'x', status: 'mystery_drop!!' as ApplicationStatus });
    const result = partitionHelperHistory({
      helperId,
      applications: [weird],
      jobs: [job()],
      upcomingJobs: [],
    });
    expect(ids(result.applicationHistory)).toEqual(['x']);
    expect(result.activeApplications).toEqual([]);
    expect(result.diagnostics).toEqual([
      { kind: 'unknown_application_status', status: 'mystery_drop' },
    ]);
    expect(sanitizeStatusForDiagnostic('ID-secret!!')).toBe('idsecret');
  });

  it('sorts history newest first', () => {
    const older = app({ id: 'old', status: 'rejected', createdAt: 10 });
    const newer = app({ id: 'new', status: 'cancelled', createdAt: 50 });
    const result = partitionHelperHistory({
      helperId,
      applications: [older, newer],
      jobs: [job()],
      upcomingJobs: [],
    });
    expect(result.applicationHistory.map((a) => a.id)).toEqual(['new', 'old']);
  });
});

describe('resolveApplicationHistoryReason', () => {
  it('uses distinct messages per real status', () => {
    expect(resolveApplicationHistoryReason(app({ status: 'rejected' }), job())).toBe('rejected');
    expect(resolveApplicationHistoryReason(app({ status: 'cancelled' }), job({ status: 'cancelled' }))).toBe(
      'request_cancelled',
    );
    expect(resolveApplicationHistoryReason(app({ status: 'cancelled' }), job({ status: 'open' }))).toBe(
      'helper_cancelled',
    );
    expect(
      resolveApplicationHistoryReason(
        app({ status: 'pending' }),
        job({ preferredDate: '2020-01-01', expiresAt: null }),
      ),
    ).toBe('request_expired');
    expect(
      resolveApplicationHistoryReason(app({ status: 'pending' }), job({ status: 'expired', expiresAt: null })),
    ).toBe('request_expired');
  });
});
