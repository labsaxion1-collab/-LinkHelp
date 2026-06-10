-- Official LinkHelp service workflow (idempotent).
-- Run in Supabase Dashboard → SQL Editor after apply_accept_proposal_flow.sql
--
-- Adds:
--   • max 3 active applications per open request
--   • helper marks service awaiting client confirmation (+ client notification)
--   • client confirms service completed (atomic status updates)
--   • +3 LC client reward on review submit (once per request + reviewer)

alter table public.upcoming_jobs
  add column if not exists updated_at timestamptz not null default now();

drop policy if exists upcoming_select_client on public.upcoming_jobs;
create policy upcoming_select_client on public.upcoming_jobs
  for select to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.id = upcoming_jobs.request_id and r.client_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Per-request review reward ledger (idempotent)
-- ---------------------------------------------------------------------------

create table if not exists public.request_review_rewards (
  request_id uuid not null references public.requests (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null check (amount > 0),
  created_at timestamptz not null default now(),
  primary key (request_id, reviewer_id)
);

alter table public.request_review_rewards enable row level security;

drop policy if exists request_review_rewards_select_own on public.request_review_rewards;
create policy request_review_rewards_select_own on public.request_review_rewards
  for select to authenticated
  using (auth.uid() = reviewer_id);

-- ---------------------------------------------------------------------------
-- helper_submit_application — max 3 active + exclusive candidatura (7 params)
-- Do NOT downgrade to 6-param version; frontend sends p_is_exclusive.
-- Full definition: supabase/apply_helper_exclusive_application_fix.sql
-- ---------------------------------------------------------------------------

alter table public.applications
  add column if not exists is_exclusive boolean not null default false;

alter table public.applications
  add column if not exists proposed_amount numeric;

alter table public.credit_transactions
  add column if not exists request_id uuid references public.requests(id) on delete set null;

alter table public.credit_transactions
  add column if not exists application_id uuid references public.applications(id) on delete set null;

alter table public.credit_transactions
  add column if not exists balance_before int;

-- See apply_helper_exclusive_application_fix.sql for helper_debit_application_interest body.

drop function if exists public.helper_submit_application(uuid, uuid, uuid, text, numeric, int);
drop function if exists public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean);

create or replace function public.helper_submit_application(
  p_request_id uuid,
  p_helper_id uuid,
  p_client_id uuid,
  p_message text default null,
  p_proposed_amount numeric default null,
  p_interest_amount int default 1,
  p_is_exclusive boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  app_id uuid;
  conv_id uuid;
  req_title text;
  helper_name text;
  proposal_part text;
  active_count int := 0;
begin
  if caller is null or caller <> p_helper_id then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_helper_id = p_client_id then
    raise exception 'SELF_REQUEST';
  end if;

  if not exists (
    select 1 from public.requests r
    where r.id = p_request_id
      and r.client_id = p_client_id
      and r.status = 'open'
  ) then
    raise exception 'REQUEST_NOT_OPEN';
  end if;

  select id into app_id
  from public.applications
  where request_id = p_request_id
    and helper_id = p_helper_id
    and status <> 'cancelled'
  limit 1;

  if app_id is not null then
    conv_id := public.ensure_conversation(p_request_id, p_client_id, p_helper_id, false);
    return jsonb_build_object(
      'alreadyExists', true,
      'applicationId', app_id,
      'conversationId', conv_id,
      'created', false
    );
  end if;

  if exists (
    select 1
    from public.applications
    where request_id = p_request_id
      and is_exclusive = true
      and status in ('pending', 'viewed', 'accepted')
  ) then
    raise exception 'EXCLUSIVE_APPLICATION_LOCKED';
  end if;

  select count(*)::int into active_count
  from public.applications
  where request_id = p_request_id
    and status in ('pending', 'viewed', 'accepted');

  if active_count >= 3 then
    raise exception 'APPLICATION_LIMIT_REACHED';
  end if;

  perform public.helper_debit_application_interest(p_helper_id, p_request_id, coalesce(p_interest_amount, 1));

  begin
    insert into public.applications (
      request_id, helper_id, client_id, message, proposed_amount, is_exclusive, status
    ) values (
      p_request_id, p_helper_id, p_client_id, p_message, p_proposed_amount, coalesce(p_is_exclusive, false), 'pending'
    )
    returning id into app_id;
  exception
    when unique_violation then
      select id into app_id
      from public.applications
      where request_id = p_request_id and helper_id = p_helper_id and status <> 'cancelled'
      limit 1;
      if app_id is null then
        raise;
      end if;
      conv_id := public.ensure_conversation(p_request_id, p_client_id, p_helper_id, false);
      return jsonb_build_object(
        'alreadyExists', true,
        'applicationId', app_id,
        'conversationId', conv_id,
        'created', false
      );
  end;

  conv_id := public.ensure_conversation(p_request_id, p_client_id, p_helper_id, false);

  select title into req_title from public.requests where id = p_request_id;
  select name into helper_name from public.profiles where id = p_helper_id;

  proposal_part := case
    when p_proposed_amount is not null then
      ' sent a proposal of CAD $' || round(p_proposed_amount)::text || ' for "' || coalesce(req_title, 'Request') || '".'
    else
      ' applied to "' || coalesce(req_title, 'Request') || '".'
  end;

  insert into public.notifications (
    user_id, type, title, description, action_url, read
  ) values (
    p_client_id,
    'application',
    'New application',
    coalesce(helper_name, 'A helper') || proposal_part,
    '/client/dashboard',
    false
  );

  return jsonb_build_object(
    'alreadyExists', false,
    'applicationId', app_id,
    'conversationId', conv_id,
    'created', true
  );
end;
$$;

grant execute on function public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Helper marks service done → awaiting client confirmation + notify client
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

  if uj.workflow_status = 'awaiting_client_confirmation' then
    return jsonb_build_object(
      'upcomingJobId', uj.id,
      'requestId', uj.request_id,
      'workflowStatus', uj.workflow_status,
      'alreadyMarked', true
    );
  end if;

  if uj.workflow_status not in ('scheduled', 'in_progress', 'arriving') then
    raise exception 'WORKFLOW_NOT_ACTIVE';
  end if;

  update public.upcoming_jobs
  set workflow_status = 'awaiting_client_confirmation', updated_at = now()
  where id = uj.id;

  select name into helper_name from public.profiles where id = uj.helper_id;

  begin
    insert into public.notifications (user_id, type, title, description, action_url, read)
    values (
      req.client_id,
      'application',
      'Service completed',
      format(
        '%s informou que o trabalho "%s" foi concluído. Confirme se o serviço foi feito.',
        coalesce(helper_name, 'Seu Help'),
        req.title
      ),
      '/client/dashboard',
      false
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'upcomingJobId', uj.id,
    'requestId', uj.request_id,
    'workflowStatus', 'awaiting_client_confirmation'
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
    and u.workflow_status = 'awaiting_client_confirmation'
  order by u.created_at desc
  limit 1
  for update of u;

  if uj.id is null then
    raise exception 'SERVICE_NOT_AWAITING_CONFIRMATION';
  end if;

  update public.requests
  set status = 'completed', updated_at = now()
  where id = req.id;

  update public.upcoming_jobs
  set workflow_status = 'completed', updated_at = now()
  where id = uj.id;

  update public.applications
  set status = 'completed', updated_at = now()
  where request_id = p_request_id
    and status = 'accepted'
  returning id into app_id;

  return jsonb_build_object(
    'requestId', req.id,
    'requestStatus', 'completed',
    'upcomingJobId', uj.id,
    'applicationId', app_id,
    'helperId', uj.helper_id
  );
end;
$$;

grant execute on function public.client_confirm_service_completed(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Disable legacy helper review reward (FIRST_REVIEW_RECEIVED on target helper).
-- Only client +3 LC per completed request is allowed in the official workflow.
-- ---------------------------------------------------------------------------

drop trigger if exists reviews_first_reward on public.reviews;

-- ---------------------------------------------------------------------------
-- Client +3 LC when submitting a review for a completed request (once per request)
-- ---------------------------------------------------------------------------

create or replace function public.grant_client_service_review_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_request_status text;
  v_inserted boolean;
  v_reward_amount int := 3;
begin
  select role into v_role from public.profiles where id = new.reviewer_id;
  if v_role is distinct from 'client' then
    return new;
  end if;

  select status into v_request_status from public.requests where id = new.request_id;
  if v_request_status is distinct from 'completed' then
    return new;
  end if;

  insert into public.request_review_rewards (request_id, reviewer_id, amount)
  values (new.request_id, new.reviewer_id, v_reward_amount)
  on conflict (request_id, reviewer_id) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    return new;
  end if;

  update public.profiles
  set credits = credits + v_reward_amount, updated_at = now()
  where id = new.reviewer_id;

  return new;
end;
$$;

drop trigger if exists reviews_client_service_reward on public.reviews;
create trigger reviews_client_service_reward
  after insert on public.reviews
  for each row
  execute function public.grant_client_service_review_reward();

notify pgrst, 'reload schema';
