-- =============================================================================
-- LinkHelp — Service completion, multi-criteria reviews, auto-complete & reminders
-- Idempotent. Safe to re-run. Does NOT touch Stripe, credits purchase, or VIP refunds.
--
-- MANUAL DEPLOY: run in Supabase SQL editor after review.
--
-- CRON — DO NOT ENABLE YET
-- The function `process_completion_reminders_and_auto_complete()` is ready but
-- must NOT be scheduled until manual QA of the completion flow (helper mark done,
-- client confirm, reviews, 24h/48h/72h reminders) is finished in staging/prod.
-- After QA, schedule externally only (pg_cron hourly, Supabase Edge Function, etc.).
-- The frontend does NOT call this function; no client-side workaround.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Schema extensions
-- ---------------------------------------------------------------------------

alter table public.upcoming_jobs
  add column if not exists completion_requested_at timestamptz,
  add column if not exists completion_reminder_stage smallint not null default 0,
  add column if not exists review_window_ends_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.reviews
  add column if not exists criteria_scores jsonb,
  add column if not exists reviewer_role text;

create index if not exists reviews_request_reviewer_idx
  on public.reviews (request_id, reviewer_id);

-- Backfill completion_requested_at for legacy rows
update public.upcoming_jobs
set completion_requested_at = coalesce(completion_requested_at, updated_at, created_at)
where workflow_status in ('awaiting_client_confirmation', 'completion_requested')
  and completion_requested_at is null;

-- Normalize legacy status name → completion_requested
update public.upcoming_jobs
set workflow_status = 'completion_requested'
where workflow_status = 'awaiting_client_confirmation';

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

  select * into uj from public.upcoming_jobs where id = p_upcoming_job_id for update;
  if uj.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if uj.helper_id <> caller then
    raise exception 'NOT_ALLOWED';
  end if;

  select * into req from public.requests where id = uj.request_id;
  if req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
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
    'workflowStatus', 'completion_requested'
  );
end;
$$;

grant execute on function public.helper_mark_service_awaiting_confirmation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Client confirms service completed
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

  select * into req from public.requests where id = p_request_id for update;
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
    review_window_ends_at = now() + interval '7 days',
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
    'helperId', helper_id
  );
end;
$$;

grant execute on function public.client_confirm_service_completed(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Submit multi-criteria review (client or helper)
-- ---------------------------------------------------------------------------

create or replace function public.submit_service_review(
  p_request_id uuid,
  p_target_user_id uuid,
  p_rating smallint,
  p_comment text default null,
  p_criteria_scores jsonb default null,
  p_reviewer_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  req public.requests;
  v_role text;
  existing_id uuid;
  review_id uuid;
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into req from public.requests where id = p_request_id;
  if req.id is null then
    raise exception 'NOT_FOUND';
  end if;

  select role into v_role from public.profiles where id = caller;

  if caller <> req.client_id and caller not in (
    select helper_id from public.applications
    where request_id = p_request_id and status in ('accepted', 'completed')
  ) then
    raise exception 'NOT_ALLOWED';
  end if;

  if req.status <> 'completed' then
    -- Helper may review client once completion is requested
    if v_role = 'helper' and req.status = 'in_progress' then
      if not exists (
        select 1 from public.upcoming_jobs uj
        where uj.request_id = p_request_id
          and uj.helper_id = caller
          and uj.workflow_status in ('completion_requested', 'awaiting_client_confirmation', 'completed', 'auto_completed')
      ) then
        raise exception 'REQUEST_NOT_COMPLETED';
      end if;
    else
      raise exception 'REQUEST_NOT_COMPLETED';
    end if;
  end if;
  if p_reviewer_role is not null and p_reviewer_role <> v_role then
    raise exception 'ROLE_MISMATCH';
  end if;

  if p_rating < 1 or p_rating > 5 then
    raise exception 'INVALID_RATING';
  end if;

  select id into existing_id
  from public.reviews
  where request_id = p_request_id and reviewer_id = caller;

  if existing_id is not null then
    raise exception 'ALREADY_REVIEWED';
  end if;

  insert into public.reviews (
    request_id, reviewer_id, target_user_id, rating, comment, criteria_scores, reviewer_role
  )
  values (
    p_request_id, caller, p_target_user_id, p_rating,
    nullif(trim(p_comment), ''),
    p_criteria_scores,
    coalesce(p_reviewer_role, v_role)
  )
  returning id into review_id;

  begin
    insert into public.notifications (user_id, type, title, description, action_url, read)
    values (
      p_target_user_id,
      'application',
      'Nova avaliação recebida',
      format('Você recebeu uma avaliação de %s/5 em "%s".', p_rating, req.title),
      case when v_role = 'client' then '/helper/dashboard' else '/client/dashboard' end,
      false
    );
  exception when others then
    null;
  end;

  return jsonb_build_object('reviewId', review_id, 'rating', p_rating);
end;
$$;

grant execute on function public.submit_service_review(uuid, uuid, smallint, text, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Cron: 24h / 48h reminders + 72h auto-complete
-- NOT SCHEDULED — enable only after manual completion-flow QA (see file header).
-- Schedule externally (pg_cron, Edge Function, etc.) when ready.
-- ---------------------------------------------------------------------------

create or replace function public.process_completion_reminders_and_auto_complete()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  sent_24 int := 0;
  sent_48 int := 0;
  auto_done int := 0;
begin
  -- 24h reminder
  for r in
    select uj.*, req.title, req.client_id, req.id as request_id
    from public.upcoming_jobs uj
    join public.requests req on req.id = uj.request_id
    where uj.workflow_status = 'completion_requested'
      and req.status = 'in_progress'
      and uj.completion_requested_at is not null
      and uj.completion_requested_at <= now() - interval '24 hours'
      and uj.completion_reminder_stage < 1
  loop
    begin
      insert into public.notifications (user_id, type, title, description, action_url, read)
      values
        (r.client_id, 'application', 'Serviço aguardando encerramento',
         format('"%s" aguarda sua confirmação há mais de 24h. Finalize agora.', r.title),
         '/client/jobs', false),
        (r.helper_id, 'application', 'Serviço aguardando encerramento',
         format('"%s" aguarda confirmação do cliente há mais de 24h.', r.title),
         '/helper/upcoming-jobs', false);
    exception when others then null;
    end;
    update public.upcoming_jobs
    set completion_reminder_stage = 1, updated_at = now()
    where id = r.id;
    sent_24 := sent_24 + 1;
  end loop;

  -- 48h reminder
  for r in
    select uj.*, req.title, req.client_id, req.id as request_id
    from public.upcoming_jobs uj
    join public.requests req on req.id = uj.request_id
    where uj.workflow_status = 'completion_requested'
      and req.status = 'in_progress'
      and uj.completion_requested_at is not null
      and uj.completion_requested_at <= now() - interval '48 hours'
      and uj.completion_reminder_stage < 2
  loop
    begin
      insert into public.notifications (user_id, type, title, description, action_url, read)
      values
        (r.client_id, 'application', 'Lembrete: confirmar conclusão',
         format('Confirme a conclusão de "%s" para encerrar o serviço.', r.title),
         '/client/jobs', false),
        (r.helper_id, 'application', 'Lembrete: aguardando cliente',
         format('O cliente ainda não confirmou "%s".', r.title),
         '/helper/upcoming-jobs', false);
    exception when others then null;
    end;
    update public.upcoming_jobs
    set completion_reminder_stage = 2, updated_at = now()
    where id = r.id;
    sent_48 := sent_48 + 1;
  end loop;

  -- 72h auto-complete
  for r in
    select uj.*, req.title, req.client_id, req.id as request_id
    from public.upcoming_jobs uj
    join public.requests req on req.id = uj.request_id
    where uj.workflow_status = 'completion_requested'
      and req.status = 'in_progress'
      and uj.completion_requested_at is not null
      and uj.completion_requested_at <= now() - interval '72 hours'
  loop
    update public.requests
    set status = 'completed', updated_at = now()
    where id = r.request_id;

    update public.upcoming_jobs
    set
      workflow_status = 'auto_completed',
      review_window_ends_at = now() + interval '7 days',
      updated_at = now()
    where id = r.id;

    update public.applications
    set status = 'completed', updated_at = now()
    where request_id = r.request_id and status = 'accepted';

    begin
      insert into public.notifications (user_id, type, title, description, action_url, read)
      values
        (r.client_id, 'application', 'Serviço auto-concluído',
         format('"%s" foi encerrado automaticamente após 72h. Avaliações disponíveis por 7 dias.', r.title),
         '/client/jobs', false),
        (r.helper_id, 'application', 'Serviço auto-concluído',
         format('"%s" foi encerrado automaticamente. Avaliações disponíveis por 7 dias.', r.title),
         '/helper/upcoming-jobs', false);
    exception when others then null;
    end;

    auto_done := auto_done + 1;
  end loop;

  return jsonb_build_object(
    'reminders24h', sent_24,
    'reminders48h', sent_48,
    'autoCompleted', auto_done
  );
end;
$$;

-- Restrict cron function to service role only
revoke all on function public.process_completion_reminders_and_auto_complete() from public;
grant execute on function public.process_completion_reminders_and_auto_complete() to service_role;

-- ---------------------------------------------------------------------------
-- Reputation snapshot helper (for UI / future caching)
-- ---------------------------------------------------------------------------

create or replace function public.get_user_reputation_stats(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_completed int := 0;
  v_avg numeric := 0;
  v_cancelled int := 0;
begin
  select role into v_role from public.profiles where id = p_user_id;
  if v_role is null then
    return '{}'::jsonb;
  end if;

  select coalesce(round(avg(rating)::numeric, 2), 0)
  into v_avg
  from public.reviews
  where target_user_id = p_user_id;

  if v_role = 'helper' then
    select count(*) into v_completed
    from public.applications
    where helper_id = p_user_id and status = 'completed';

    select count(*) into v_cancelled
    from public.applications a
    join public.requests req on req.id = a.request_id
    where a.helper_id = p_user_id and req.status = 'cancelled';
  else
    select count(*) into v_completed
    from public.requests
    where client_id = p_user_id and status = 'completed';

    select count(*) into v_cancelled
    from public.requests
    where client_id = p_user_id and status = 'cancelled';
  end if;

  return jsonb_build_object(
    'role', v_role,
    'completedCount', v_completed,
    'averageRating', v_avg,
    'cancelledCount', v_cancelled
  );
end;
$$;

grant execute on function public.get_user_reputation_stats(uuid) to authenticated;
