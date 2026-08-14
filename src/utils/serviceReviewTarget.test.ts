import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { authorizeServiceReviewTarget } from '@/utils/serviceReviewTarget';

const clientId = 'client-1';
const hiredHelperId = 'helper-hired';
const otherHelperId = 'helper-pending';
const otherClientId = 'client-other';
const arbitraryId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const hired = [hiredHelperId];

describe('authorizeServiceReviewTarget', () => {
  it('allows the client to review the hired helper', () => {
    expect(
      authorizeServiceReviewTarget({
        reviewerId: clientId,
        targetUserId: hiredHelperId,
        requestClientId: clientId,
        hiredHelperIds: hired,
      }),
    ).toBe('ok');
  });

  it('allows the hired helper to review the client', () => {
    expect(
      authorizeServiceReviewTarget({
        reviewerId: hiredHelperId,
        targetUserId: clientId,
        requestClientId: clientId,
        hiredHelperIds: hired,
      }),
    ).toBe('ok');
  });

  it('blocks the client from reviewing an arbitrary UUID', () => {
    expect(
      authorizeServiceReviewTarget({
        reviewerId: clientId,
        targetUserId: arbitraryId,
        requestClientId: clientId,
        hiredHelperIds: hired,
      }),
    ).toBe('INVALID_REVIEW_TARGET');
  });

  it('blocks the client from reviewing a helper who was not hired', () => {
    expect(
      authorizeServiceReviewTarget({
        reviewerId: clientId,
        targetUserId: otherHelperId,
        requestClientId: clientId,
        hiredHelperIds: hired,
      }),
    ).toBe('INVALID_REVIEW_TARGET');
  });

  it('blocks the helper from reviewing an arbitrary UUID', () => {
    expect(
      authorizeServiceReviewTarget({
        reviewerId: hiredHelperId,
        targetUserId: arbitraryId,
        requestClientId: clientId,
        hiredHelperIds: hired,
      }),
    ).toBe('INVALID_REVIEW_TARGET');
  });

  it('blocks the helper from reviewing another client', () => {
    expect(
      authorizeServiceReviewTarget({
        reviewerId: hiredHelperId,
        targetUserId: otherClientId,
        requestClientId: clientId,
        hiredHelperIds: hired,
      }),
    ).toBe('INVALID_REVIEW_TARGET');
  });

  it('blocks self-review for client and helper', () => {
    expect(
      authorizeServiceReviewTarget({
        reviewerId: clientId,
        targetUserId: clientId,
        requestClientId: clientId,
        hiredHelperIds: hired,
      }),
    ).toBe('INVALID_REVIEW_TARGET');
    expect(
      authorizeServiceReviewTarget({
        reviewerId: hiredHelperId,
        targetUserId: hiredHelperId,
        requestClientId: clientId,
        hiredHelperIds: hired,
      }),
    ).toBe('INVALID_REVIEW_TARGET');
  });

  it('blocks a null target', () => {
    expect(
      authorizeServiceReviewTarget({
        reviewerId: clientId,
        targetUserId: null,
        requestClientId: clientId,
        hiredHelperIds: hired,
      }),
    ).toBe('INVALID_REVIEW_TARGET');
  });
});

describe('0056 review RPC security hardening SQL', () => {
  const sql = readFileSync(
    new URL('../../supabase/migrations/0056_review_rpc_security_hardening.sql', import.meta.url),
    'utf8',
  );

  it('keeps the existing RPC signature and valid review flow', () => {
    expect(sql).toContain('create or replace function public.submit_service_review(');
    expect(sql).toContain('p_request_id uuid');
    expect(sql).toContain('p_target_user_id uuid');
    expect(sql).toContain('p_rating smallint');
    expect(sql).toContain('p_comment text default null');
    expect(sql).toContain('p_criteria_scores jsonb default null');
    expect(sql).toContain('p_reviewer_role text default null');
    expect(sql).toContain("raise exception 'AUTH_REQUIRED'");
    expect(sql).toContain("raise exception 'NOT_ALLOWED'");
    expect(sql).toContain("raise exception 'REQUEST_NOT_COMPLETED'");
    expect(sql).toContain("raise exception 'ROLE_MISMATCH'");
    expect(sql).toContain("raise exception 'INVALID_RATING'");
    expect(sql).toContain("raise exception 'ALREADY_REVIEWED'");
    expect(sql).toContain('insert into public.reviews');
    expect(sql).toContain('insert into public.notifications');
    expect(sql).toContain("jsonb_build_object('reviewId', review_id, 'rating', p_rating)");
  });

  it('requires the client to target only the hired helper and the helper to target only the client', () => {
    expect(sql).toContain("raise exception 'INVALID_REVIEW_TARGET'");
    expect(sql).toContain('if caller = req.client_id then');
    expect(sql).toContain("and helper_id = p_target_user_id");
    expect(sql).toContain("and status in ('accepted', 'completed')");
    expect(sql).toContain('p_target_user_id is distinct from req.client_id');
    expect(sql).toContain('if p_target_user_id is null then');
    expect(sql).toContain('if p_target_user_id = caller then');
  });

  it('revokes PUBLIC/anon execute and grants authenticated only', () => {
    expect(sql).toContain(
      'revoke all on function public.submit_service_review(uuid, uuid, smallint, text, jsonb, text) from public',
    );
    expect(sql).toContain(
      'revoke all on function public.submit_service_review(uuid, uuid, smallint, text, jsonb, text) from anon',
    );
    expect(sql).toContain(
      'revoke all on function public.submit_service_review(uuid, uuid, smallint, text, jsonb, text) from authenticated',
    );
    expect(sql).toContain(
      'grant execute on function public.submit_service_review(uuid, uuid, smallint, text, jsonb, text) to authenticated',
    );
    expect(sql).not.toMatch(/grant execute on function public\.submit_service_review\([^)]+\) to anon/i);
  });

  it('uses SECURITY DEFINER with an empty search_path and schema-qualified tables', () => {
    expect(sql).toContain('security definer');
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain('from public.requests');
    expect(sql).toContain('from public.applications');
    expect(sql).toContain('from public.reviews');
    expect(sql).not.toMatch(/drop table|truncate|delete from/i);
  });
});
