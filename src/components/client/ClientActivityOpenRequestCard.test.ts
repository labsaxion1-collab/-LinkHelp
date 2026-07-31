import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  MAX_HIRED_HELPERS_PER_REQUEST,
  activityCandidateCount,
  canAcceptApplicationForJob,
  countHiredHelpersForJob,
  isHireTeamComplete,
  listCandidateApplicationsForJob,
} from '@/utils/clientActivityApplications';
import { resolveClientActivityBackView } from '@/utils/clientActivityCardView';
import {
  candidateRingSegmentColors,
  firstNameFromHelperName,
  rankAccentForApplication,
  resolveExclusiveCandidate,
} from '@/utils/clientActivityCandidateRing';
import { HELPER_RANKS } from '@/utils/linkHelpRanking';
import type { Application } from '@/types/application';

const app = (overrides: Partial<Application> = {}): Application => ({
  id: 'app-1',
  jobId: 'job-1',
  helperId: 'h1',
  helperName: 'Helper',
  helperAvatar: '/a.png',
  helperRating: 4.5,
  helperJobs: 3,
  status: 'pending',
  createdAt: 1,
  ...overrides,
});

describe('client activity hire capacity (single-helper architecture)', () => {
  it('caps candidate display count at 3 without implying hired slots', () => {
    const apps = [app({ id: 'a' }), app({ id: 'b' }), app({ id: 'c' }), app({ id: 'd' })];
    expect(activityCandidateCount(apps)).toBe(3);
    expect(MAX_HIRED_HELPERS_PER_REQUEST).toBe(1);
  });

  it('counts hired helpers separately from candidates', () => {
    const apps = [
      app({ id: 'a', status: 'pending' }),
      app({ id: 'b', status: 'accepted' }),
      app({ id: 'c', status: 'viewed' }),
    ];
    expect(countHiredHelpersForJob('job-1', apps)).toBe(1);
    expect(isHireTeamComplete('job-1', apps)).toBe(true);
  });

  it('allows accept only while open/paused and under capacity', () => {
    const pending = app({ status: 'pending' });
    expect(
      canAcceptApplicationForJob({
        jobStatus: 'open',
        application: pending,
        applications: [pending],
        acceptingApplicationId: null,
      }),
    ).toBe(true);

    expect(
      canAcceptApplicationForJob({
        jobStatus: 'open',
        application: pending,
        applications: [pending, app({ id: 'x', status: 'accepted' })],
        acceptingApplicationId: null,
      }),
    ).toBe(false);

    expect(
      canAcceptApplicationForJob({
        jobStatus: 'open',
        application: pending,
        applications: [pending],
        acceptingApplicationId: 'busy',
      }),
    ).toBe(false);

    expect(
      canAcceptApplicationForJob({
        jobStatus: 'in_progress',
        application: pending,
        applications: [pending],
        acceptingApplicationId: null,
      }),
    ).toBe(false);
  });
});

describe('client activity card panel navigation', () => {
  it('returns from profile to candidates and others to summary', () => {
    expect(resolveClientActivityBackView('profile')).toBe('candidates');
    expect(resolveClientActivityBackView('candidates')).toBe('summary');
    expect(resolveClientActivityBackView('description')).toBe('summary');
    expect(resolveClientActivityBackView('summary')).toBe('summary');
  });
});

describe('candidate ring helpers', () => {
  it('returns first name only', () => {
    expect(firstNameFromHelperName('Maria Silva Costa')).toBe('Maria');
    expect(firstNameFromHelperName('  Jean  ')).toBe('Jean');
    expect(firstNameFromHelperName('')).toBe('');
  });

  it('builds empty arc segments', () => {
    expect(candidateRingSegmentColors([])).toEqual([null, null, null]);
  });

  it('maps one normal candidate to first segment with official rank color', () => {
    const novo = HELPER_RANKS.find((r) => r.tier === 'novo_helper')!;
    const colors = candidateRingSegmentColors([
      app({ helperJobs: 0, helperRating: 0 }),
    ]);
    expect(colors[0]).toBe(novo.accent);
    expect(colors[1]).toBeNull();
    expect(colors[2]).toBeNull();
  });

  it('maps two different ranks in entry order', () => {
    const novo = HELPER_RANKS.find((r) => r.tier === 'novo_helper')!;
    const elite = HELPER_RANKS.find((r) => r.tier === 'elite')!;
    const colors = candidateRingSegmentColors([
      app({ id: 'a', helperJobs: 0, helperRating: 0, createdAt: 1 }),
      app({ id: 'b', helperJobs: 60, helperRating: 4.7, createdAt: 2 }),
    ]);
    expect(colors).toEqual([novo.accent, elite.accent, null]);
  });

  it('maps three candidates in createdAt order from list helper', () => {
    const listed = listCandidateApplicationsForJob('job-1', [
      app({ id: 'c', helperName: 'Third', createdAt: 30, helperJobs: 0 }),
      app({ id: 'a', helperName: 'First', createdAt: 10, helperJobs: 0 }),
      app({ id: 'b', helperName: 'Second', createdAt: 20, helperJobs: 0 }),
    ]);
    expect(listed.map((a) => a.id)).toEqual(['a', 'b', 'c']);
    const colors = candidateRingSegmentColors(listed);
    expect(colors.every((c) => c === HELPER_RANKS[0].accent)).toBe(true);
  });

  it('resolves exclusive VIP candidate for full-arc mode', () => {
    const exclusive = app({
      id: 'vip',
      isExclusive: true,
      helperJobs: 60,
      helperRating: 4.7,
    });
    expect(resolveExclusiveCandidate([exclusive], true)?.id).toBe('vip');
    expect(resolveExclusiveCandidate([exclusive], false)).toBeNull();
    expect(rankAccentForApplication(exclusive)).toBe(
      HELPER_RANKS.find((r) => r.tier === 'elite')!.accent,
    );
  });
});

describe('ClientActivityOpenRequestCard wiring', () => {
  it('uses compact ring, description, reject, and no HelperOpportunityCard', async () => {
    const src = await readFile(
      resolve('src/components/client/ClientActivityOpenRequestCard.tsx'),
      'utf8',
    );
    expect(src).toContain('client-activity-open-card');
    expect(src).toContain('client-activity-description-view');
    expect(src).toContain('client-activity-candidates-view');
    expect(src).toContain('client-activity-profile-view');
    expect(src).toContain('ClientActivityCandidateRing');
    expect(src).toContain('ClientActivityCandidateRow');
    expect(src).toContain('onReject');
    expect(src).toContain('reject_confirm');
    expect(src).toContain('vip_candidate_label');
    expect(src).toContain('back_to_candidates');
    expect(src).toContain('FEED_CARD_PREMIUM_SHELL_CLASS');
    expect(src).toContain('invisible pointer-events-none');
    expect(src).toContain('FEED_CARD_STANDARD_CONTENT_HEIGHT_PX');
    expect(src).toContain('FEED_CARD_SHELL_CLASS');
    expect(src).toContain('feedCardLockedContentStyle');
    expect(src).not.toContain('HelperOpportunityCard');
    expect(src).not.toContain('InterestedRing');
    expect(src).not.toContain('client-activity-candidates-count');
    expect(src).not.toContain('view_candidates');
    expect(src).not.toContain('candidates_count_zero');
    expect(src).not.toContain('min-h-[280px]');
    expect(src).not.toContain('measureFeedCardNaturalHeight');
    expect(src).not.toContain('rounded-[1.35rem]');
  });

  it('keeps Helper feed InterestedRing path untouched', async () => {
    const feed = await readFile(
      resolve('src/components/opportunities/HelperOpportunityCard.tsx'),
      'utf8',
    );
    expect(feed).toContain('InterestedRing');
    expect(feed).not.toContain('ClientActivityOpenRequestCard');
    expect(feed).not.toContain('ClientActivityCandidateRing');
    expect(feed).toContain('FEED_CARD_STANDARD_CONTENT_HEIGHT_PX');
    const ring = await readFile(
      resolve('src/components/opportunities/InterestedRing.tsx'),
      'utf8',
    );
    expect(ring).toContain('SEGMENT_COLORS');
    const dash = await readFile(resolve('src/pages/client/ClientDashboard.tsx'), 'utf8');
    expect(dash).toContain('ClientActivityOpenRequestCard');
    expect(dash).toContain('onReject');
    expect(dash).toContain('isPreHireActivity');
  });

  it('ships dedicated candidate ring with exclusive gold center', async () => {
    const ring = await readFile(
      resolve('src/components/client/ClientActivityCandidateRing.tsx'),
      'utf8',
    );
    expect(ring).toContain('client-activity-ring-vip-center');
    expect(ring).toContain('exclusiveFullColor');
    expect(ring).toContain('CLIENT_ACTIVITY_VIP_GOLD');
    const row = await readFile(
      resolve('src/components/client/ClientActivityCandidateRow.tsx'),
      'utf8',
    );
    expect(row).toContain('firstNameFromHelperName');
    expect(row).not.toContain('computeTrustScore');
    expect(row).not.toContain('Star');
  });
});
