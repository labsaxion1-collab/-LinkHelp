-- Helper applications: max 3 active candidates per request and exclusive lock support.

alter table public.applications
  add column if not exists is_exclusive boolean not null default false;

create index if not exists applications_request_active_idx
  on public.applications (request_id, status);

create index if not exists applications_request_exclusive_idx
  on public.applications (request_id)
  where is_exclusive = true and status in ('pending', 'viewed', 'accepted');

drop function if exists public.helper_submit_application(uuid, uuid, uuid, text, numeric, int);

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
