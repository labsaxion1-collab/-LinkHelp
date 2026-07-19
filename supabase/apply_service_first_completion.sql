-- =============================================================================
-- LinkHelp — First-side service completion (client OR helper)
-- Idempotent. Safe to re-run. Does NOT replace existing RPCs.
--
-- MANUAL DEPLOY ONLY — run in Supabase SQL editor after verify + prod audit.
--
-- Creates:
--   public.finalize_service_completion(uuid)
--
-- Does NOT replace (legacy + fallback remain):
--   helper_mark_service_awaiting_confirmation(uuid)
--   client_confirm_service_completed(uuid)
--   submit_service_review(...)
--   process_completion_reminders_and_auto_complete()
--
-- Product rule:
--   Either hired Client or Helper may complete first.
--   First successful call sets request + application + upcoming_job to completed.
--   Duplicate calls return alreadyCompleted (no duplicate notifications/status writes).
--
-- Does NOT touch: Stripe, LinkCredits purchase/debit, VIP refunds, chat, location.
-- Review rewards (+3 LC on client review) remain on review INSERT trigger only.
-- =============================================================================

create or replace function public.finalize_service_completion(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  req public.requests;
  uj public.upcoming_jobs;
  app_id uuid;
  helper_id uuid;
  completer_role text;
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into req from public.requests where id = p_request_id for update;
  if req.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if req.status = 'cancelled' then
    raise exception 'REQUEST_CANCELLED';
  end if;

  if req.status = 'completed' then
    return jsonb_build_object(
      'requestId', req.id,
      'requestStatus', 'completed',
      'alreadyCompleted', true
    );
  end if;

  if req.status <> 'in_progress' then
    raise exception 'REQUEST_NOT_IN_PROGRESS';
  end if;

  select u.* into uj
  from public.upcoming_jobs u
  join public.applications a
    on a.request_id = u.request_id and a.helper_id = u.helper_id
  where u.request_id = p_request_id
    and a.status = 'accepted'
    and u.workflow_status in (
      'scheduled',
      'accepted',
      'in_progress',
      'arriving',
      'completion_requested',
      'awaiting_client_confirmation'
    )
  order by u.created_at desc
  limit 1
  for update of u;

  if uj.id is null then
    raise exception 'NO_ACTIVE_UPCOMING_JOB';
  end if;

  helper_id := uj.helper_id;

  -- Authorize by membership on the hired job, not profiles.role (avoids role drift).
  if caller = req.client_id then
    completer_role := 'client';
  elsif caller = helper_id then
    completer_role := 'helper';
  else
    raise exception 'NOT_ALLOWED';
  end if;

  update public.requests
  set status = 'completed', updated_at = now()
  where id = req.id;

  update public.upcoming_jobs
  set
    workflow_status = 'completed',
    review_window_ends_at = coalesce(review_window_ends_at, now() + interval '7 days'),
    updated_at = now()
  where id = uj.id;

  update public.applications
  set status = 'completed', updated_at = now()
  where request_id = p_request_id
    and status = 'accepted'
  returning id into app_id;

  if app_id is null then
    select id into app_id
    from public.applications
    where request_id = p_request_id
      and helper_id = helper_id
      and status = 'completed'
    limit 1;
  end if;

  begin
    insert into public.notifications (user_id, type, title, description, action_url, read)
    values
      (
        helper_id,
        'application',
        'Serviço concluído',
        format(
          'O serviço "%s" foi concluído. Avalie a experiência quando puder.',
          req.title
        ),
        '/helper/upcoming-jobs',
        false
      ),
      (
        req.client_id,
        'application',
        'Serviço concluído',
        format(
          '"%s" foi marcado como concluído. Avalie seu Help quando puder.',
          req.title
        ),
        '/client/jobs',
        false
      );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'requestId', req.id,
    'requestStatus', 'completed',
    'upcomingJobId', uj.id,
    'applicationId', app_id,
    'helperId', helper_id,
    'completedBy', completer_role,
    'alreadyCompleted', false
  );
end;
$$;

grant execute on function public.finalize_service_completion(uuid) to authenticated;

-- Optional hardening: ensure authenticated cannot execute legacy confirm in parallel flows
-- (leave legacy RPCs granted — frontend may still fall back until finalize is deployed).
