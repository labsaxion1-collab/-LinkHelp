-- =============================================================================
-- P4.0.5 staging overlay — 60_service_completion_workflow.sql
-- Consolidates ONLY the completion RPCs required by the current frontend:
--   helper_mark_service_awaiting_confirmation(p_upcoming_job_id)
--   client_confirm_service_completed(p_request_id)
--   finalize_service_completion(p_request_id)
--
-- Sources reviewed (NOT copied blindly):
--   apply_service_completion_and_reviews.sql
--   apply_service_first_completion.sql
--   apply_service_workflow.sql (legacy status names only as aliases)
--
-- Explicitly OUT OF SCOPE (deferred — see OPEN_ITEMS):
--   client_pause_request / client_resume_request / client_cancel_request (LC refunds)
--   submit_service_review redefine (lives in migration 0049)
--   review +3 LC rewards / reputation engines / cron auto-complete
--   submit/apply finance RPCs from pack 50
--   any P4.0.1 finance formula
--
-- Status transitions:
--   upcoming_jobs: scheduled|accepted|in_progress|arriving
--                  → completion_requested  (helper mark; awaiting_client_confirmation treated as alias)
--                  → completed             (client confirm OR finalize)
--   requests:      in_progress → completed
--   applications:  accepted → completed (hired row only)
-- =============================================================================

alter table public.upcoming_jobs
  add column if not exists completion_requested_at timestamptz,
  add column if not exists completion_reminder_stage smallint not null default 0,
  add column if not exists review_window_ends_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Helper marks service done → completion_requested + notify client
-- ---------------------------------------------------------------------------
create or replace function public.helper_mark_service_awaiting_confirmation(
  p_upcoming_job_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  uj public.upcoming_jobs;
  req public.requests;
  helper_name text;
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into uj
  from public.upcoming_jobs
  where id = p_upcoming_job_id
  for update;

  if uj.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if uj.helper_id <> caller then
    raise exception 'NOT_ALLOWED';
  end if;

  select * into req
  from public.requests
  where id = uj.request_id
  for update;

  if req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;
  if req.status = 'completed' then
    return jsonb_build_object(
      'upcomingJobId', uj.id,
      'requestId', uj.request_id,
      'workflowStatus', 'completed',
      'alreadyMarked', true,
      'requestAlreadyCompleted', true
    );
  end if;
  if req.status <> 'in_progress' then
    raise exception 'REQUEST_NOT_IN_PROGRESS';
  end if;

  if uj.workflow_status in ('completion_requested', 'awaiting_client_confirmation') then
    return jsonb_build_object(
      'upcomingJobId', uj.id,
      'requestId', uj.request_id,
      'workflowStatus', 'completion_requested',
      'alreadyMarked', true
    );
  end if;

  if uj.workflow_status = 'completed' then
    return jsonb_build_object(
      'upcomingJobId', uj.id,
      'requestId', uj.request_id,
      'workflowStatus', 'completed',
      'alreadyMarked', true
    );
  end if;

  if uj.workflow_status not in ('scheduled', 'in_progress', 'arriving', 'accepted') then
    raise exception 'WORKFLOW_NOT_ACTIVE';
  end if;

  update public.upcoming_jobs
  set
    workflow_status = 'completion_requested',
    completion_requested_at = now(),
    completion_reminder_stage = 0,
    updated_at = now()
  where id = uj.id;

  select name into helper_name from public.profiles where id = uj.helper_id;

  begin
    insert into public.notifications (user_id, type, title, description, action_url, read)
    values (
      req.client_id,
      'application',
      'Helper concluiu trabalho',
      format(
        '%s informou que o trabalho "%s" foi concluído. Confirme a conclusão do serviço.',
        coalesce(helper_name, 'Seu Help'),
        req.title
      ),
      '/client/jobs',
      false
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'upcomingJobId', uj.id,
    'requestId', uj.request_id,
    'workflowStatus', 'completion_requested',
    'alreadyMarked', false
  );
end;
$$;

revoke all on function public.helper_mark_service_awaiting_confirmation(uuid) from public;
grant execute on function public.helper_mark_service_awaiting_confirmation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Client confirms after helper mark
-- ---------------------------------------------------------------------------
create or replace function public.client_confirm_service_completed(
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
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into req
  from public.requests
  where id = p_request_id
  for update;

  if req.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if req.client_id <> caller then
    raise exception 'NOT_ALLOWED';
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
    and u.workflow_status in ('completion_requested', 'awaiting_client_confirmation')
  order by u.created_at desc
  limit 1
  for update of u;

  if uj.id is null then
    raise exception 'SERVICE_NOT_AWAITING_CONFIRMATION';
  end if;

  helper_id := uj.helper_id;

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

  begin
    insert into public.notifications (user_id, type, title, description, action_url, read)
    values
      (
        helper_id,
        'application',
        'Serviço concluído',
        format('O cliente confirmou a conclusão de "%s". Avalie a experiência quando puder.', req.title),
        '/helper/upcoming-jobs',
        false
      ),
      (
        caller,
        'application',
        'Serviço concluído',
        format('"%s" foi marcado como concluído. Avalie seu Help quando puder.', req.title),
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
    'alreadyCompleted', false
  );
end;
$$;

revoke all on function public.client_confirm_service_completed(uuid) from public;
grant execute on function public.client_confirm_service_completed(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- First-side completion (client OR hired helper) — duplicates return alreadyCompleted
-- Does NOT change LinkCredits / VIP formulas.
-- ---------------------------------------------------------------------------
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

  select * into req
  from public.requests
  where id = p_request_id
  for update;

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
        format('O serviço "%s" foi concluído. Avalie a experiência quando puder.', req.title),
        '/helper/upcoming-jobs',
        false
      ),
      (
        req.client_id,
        'application',
        'Serviço concluído',
        format('"%s" foi marcado como concluído. Avalie seu Help quando puder.', req.title),
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

revoke all on function public.finalize_service_completion(uuid) from public;
grant execute on function public.finalize_service_completion(uuid) to authenticated;
