import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  isCompletedWorkflowStatus,
  resolveCompletedReviewUiState,
  resolveCompletionTimestamp,
} from '@/utils/completedServiceHistory';
import type { ServiceReview } from '@/types/review';
import type { UpcomingJob } from '@/types/upcoming';

const review = (overrides: Partial<ServiceReview> = {}): ServiceReview => ({
  id: 'r1',
  requestId: 'job-1',
  reviewerId: 'user-1',
  targetUserId: 'user-2',
  rating: 5,
  comment: null,
  criteriaScores: null,
  reviewerRole: 'client',
  createdAt: 1_700_000_000_000,
  ...overrides,
});

describe('completedServiceHistory', () => {
  it('treats completed and auto_completed as history workflows', () => {
    expect(isCompletedWorkflowStatus('completed')).toBe(true);
    expect(isCompletedWorkflowStatus('auto_completed')).toBe(true);
    expect(isCompletedWorkflowStatus('in_progress')).toBe(false);
    expect(isCompletedWorkflowStatus('completion_requested')).toBe(false);
  });

  it('marks own review as submitted without exposing counterparty rating', () => {
    const result = resolveCompletedReviewUiState({
      requestId: 'job-1',
      reviewerId: 'user-1',
      reviews: [
        review(),
        review({ id: 'r2', reviewerId: 'user-2', rating: 2, reviewerRole: 'helper' }),
      ],
      pendingRequestIds: new Set(['job-1']),
    });
    expect(result.state).toBe('submitted');
    expect(result.myRating).toBe(5);
  });

  it('keeps pending when user has not reviewed yet', () => {
    const result = resolveCompletedReviewUiState({
      requestId: 'job-1',
      reviewerId: 'user-1',
      reviews: [review({ reviewerId: 'user-2', reviewerRole: 'helper' })],
      pendingRequestIds: new Set(['job-1']),
    });
    expect(result.state).toBe('pending');
    expect(result.myRating).toBeNull();
  });

  it('prefers completionRequestedAt for completion timestamp', () => {
    const upcoming = {
      completionRequestedAt: 100,
      createdAt: 50,
      workflowStatus: 'completed',
    } as UpcomingJob;
    expect(resolveCompletionTimestamp(upcoming, undefined)).toBe(100);
    expect(resolveCompletionTimestamp(undefined, review({ createdAt: 200 }))).toBe(200);
  });
});

describe('completed history wiring', () => {
  it('ships client completed history card without hire actions', async () => {
    const src = await readFile(
      resolve('src/components/client/ClientCompletedHistoryCard.tsx'),
      'utf8',
    );
    expect(src).toContain('client-completed-history-card');
    expect(src).toContain('completed-hired-helper');
    expect(src).toContain('service_review.rate_action');
    expect(src).toContain('service_review.review_submitted');
    expect(src).toContain('FEED_CARD_STANDARD_CONTENT_HEIGHT_PX');
    expect(src).toContain('feedCardLockedContentStyle');
    expect(src).toContain('FEED_CARD_PREMIUM_SHELL_CLASS');
    expect(src).toContain('LhCardOverlay');
    expect(src).toContain('completed-description-overlay');
    expect(src).toContain('completed-open-description');
    expect(src).toContain('CandidateHelperProfileExpand');
    expect(src).toContain('line-clamp-2');
    expect(src).not.toContain('onAccept');
    expect(src).not.toContain('ClientActivityCandidateRing');
    expect(src).not.toContain('cancel_request');
    expect(src).not.toContain('history_view_details');
  });

  it('ships helper completed history card with locked shell', async () => {
    const src = await readFile(
      resolve('src/components/helpers/HelperCompletedHistoryCard.tsx'),
      'utf8',
    );
    expect(src).toContain('helper-completed-history-card');
    expect(src).toContain('FEED_CARD_STANDARD_CONTENT_HEIGHT_PX');
    expect(src).toContain('FEED_CARD_PREMIUM_SHELL_CLASS');
    expect(src).toContain('LhCardOverlay');
    expect(src).toContain('helper-completed-description-overlay');
    expect(src).toContain('service_review.rate_action');
    expect(src).toContain('history_client_attended');
    expect(src).toContain('FeedCardClientProfilePanel');
    expect(src).not.toContain('invisible pointer-events-none');
    expect(src).toContain('line-clamp-2');
  });

  it('routes completed jobs to history card in ClientDashboard', async () => {
    const dash = await readFile(resolve('src/pages/client/ClientDashboard.tsx'), 'utf8');
    expect(dash).toContain('ClientCompletedHistoryCard');
    expect(dash).toContain("job.status === 'completed'");
    expect(dash).toContain('openReviewByRequestId');
    expect(dash).toContain('openSubmittedReviewByRequestId');
  });

  it('exposes helper completed tasks tab with compact history card', async () => {
    const page = await readFile(resolve('src/pages/helper/HelperUpcomingJobsPage.tsx'), 'utf8');
    expect(page).toContain("'completed'");
    expect(page).toContain('upcoming_jobs.tab_completed');
    expect(page).toContain('HelperCompletedHistoryCard');
    expect(page).toContain("setActiveTab('completed')");
    expect(page).toContain('openSubmittedReviewByRequestId');
  });

  it('keeps bilateral multi-criteria modal as the review form', async () => {
    const modal = await readFile(
      resolve('src/components/reviews/MultiCriteriaReviewModal.tsx'),
      'utf8',
    );
    expect(modal).toContain('service_review.later');
    expect(modal).toContain('service_review.submit');
    expect(modal).toContain('allRated');
    const criteria = await readFile(resolve('src/config/reviewCriteria.ts'), 'utf8');
    expect(criteria).toContain('HELPER_REVIEW_CLIENT_CRITERIA');
    expect(criteria).toContain('CLIENT_REVIEW_HELPER_CRITERIA');
    expect(criteria).toContain("'payment'");
    expect(criteria).toContain("'recommend'");
  });

  it('exposes PT EN FR history and review labels', async () => {
    const en = await readFile(resolve('src/translations/en/index.ts'), 'utf8');
    const pt = await readFile(resolve('src/translations/pt/index.ts'), 'utf8');
    const fr = await readFile(resolve('src/translations/fr/index.ts'), 'utf8');
    expect(pt).toContain("title_client_review: 'Avalie seu Help'");
    expect(en).toContain("title_client_review: 'Rate your Help'");
    expect(fr).toContain("title_client_review: 'Évaluez votre Help'");
    expect(pt).toContain("rate_action: 'Avaliar'");
    expect(pt).toContain("review_submitted: 'Avaliação enviada'");
    expect(pt).toContain("service_completed: 'Serviço concluído'");
    expect(pt).toContain("edit_review: 'Editar avaliação'");
    expect(en).toContain("tab_completed: 'Completed'");
    expect(fr).toContain("tab_completed: 'Terminés'");
    expect(pt).toContain("history_help_performed: 'Help que realizou'");
    expect(pt).toContain("history_client_attended: 'Cliente atendido'");
  });
});
