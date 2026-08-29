export type ServiceReviewTargetInput = {
  reviewerId: string;
  targetUserId: string | null;
  requestClientId: string;
  hiredHelperIds: string[];
};

export type ServiceReviewTargetDecision = 'ok' | 'INVALID_REVIEW_TARGET';

/**
 * Mirrors 0056 submit_service_review target authorization (not participation/status).
 * Client may only review an accepted/completed helper on that request.
 * Hired helper may only review the request client.
 */
export function authorizeServiceReviewTarget(
  input: ServiceReviewTargetInput,
): ServiceReviewTargetDecision {
  const { reviewerId, targetUserId, requestClientId, hiredHelperIds } = input;
  if (!targetUserId) return 'INVALID_REVIEW_TARGET';
  if (targetUserId === reviewerId) return 'INVALID_REVIEW_TARGET';

  if (reviewerId === requestClientId) {
    return hiredHelperIds.includes(targetUserId) ? 'ok' : 'INVALID_REVIEW_TARGET';
  }

  if (hiredHelperIds.includes(reviewerId)) {
    return targetUserId === requestClientId ? 'ok' : 'INVALID_REVIEW_TARGET';
  }

  return 'INVALID_REVIEW_TARGET';
}
