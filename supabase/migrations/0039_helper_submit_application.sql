-- Atomic helper application: debit interest (idempotent), insert application, ensure conversation.
-- Idempotent re-run for production when PostgREST returns 404 on applications / RPCs.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, helper_id)
);

alter table public.applications
  add column if not exists proposed_amount numeric;

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check check (
  status in ('pending', 'viewed', 'accepted', 'rejected', 'completed', 'cancelled')
);

alter table public.applications enable row level security;

drop policy if exists applications_insert_helper on public.applications;
create policy applications_insert_helper on public.applications
  for insert
  to authenticated
  with check (
    auth.uid() = helper_id
    and client_id <> helper_id
    and exists (
      select 1
      from public.requests r
      where r.id = request_id
        and r.client_id = client_id
        and r.status = 'open'
    )
  );

drop policy if exists applications_select_related on public.applications;
create policy applications_select_related on public.applications
  for select
  to authenticated
  using (auth.uid() = helper_id or auth.uid() = client_id);

grant select, insert, update on public.applications to authenticated;

create or replace function public.ensure_conversation(
  p_request_id uuid,
  p_client_id uuid,
  p_helper_id uuid,
  p_contact_unlocked boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv public.conversations;
begin
  select * into conv from public.conversations
  where request_id = p_request_id and client_id = p_client_id and helper_id = p_helper_id;

  if conv.id is not null then
    if p_contact_unlocked and conv.contact_unlocked is false then
      update public.conversations set contact_unlocked = true where id = conv.id;
    end if;
    return conv.id;
  end if;

  begin
    insert into public.conversations (request_id, client_id, helper_id, contact_unlocked)
    values (p_request_id, p_client_id, p_helper_id, p_contact_unlocked)
    returning id into conv.id;
  exception
    when unique_violation then
      select * into conv from public.conversations
      where request_id = p_request_id and client_id = p_client_id and helper_id = p_helper_id;
      if p_contact_unlocked and conv.contact_unlocked is false then
        update public.conversations set contact_unlocked = true where id = conv.id;
      end if;
  end;

  return conv.id;
end;
$$;

grant execute on function public.ensure_conversation(uuid, uuid, uuid, boolean) to authenticated;

create or replace function public.helper_debit_application_interest(
  p_helper_id uuid,
  p_request_id uuid,
  p_amount int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  w public.credit_wallets;
  bal_before int;
  bal_after int;
  tx_id uuid;
begin
  if caller is null or caller <> p_helper_id then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_amount < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if p_amount = 0 then
    return jsonb_build_object('success', true, 'amount', 0, 'skipped', true);
  end if;

  select id into tx_id
  from public.credit_transactions
  where helper_id = p_helper_id
    and request_id = p_request_id
    and type = 'APPLICATION_INTEREST'
  limit 1;

  if tx_id is not null then
    return jsonb_build_object('alreadyCharged', true, 'amount', p_amount);
  end if;

  w := public.ensure_helper_credit_wallet(p_helper_id);
  bal_before := w.balance;
  if bal_before < p_amount then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;
  bal_after := bal_before - p_amount;

  update public.credit_wallets
  set balance = bal_after, total_spent = total_spent + p_amount
  where helper_id = p_helper_id;

  insert into public.credit_transactions (
    helper_id, type, amount, balance_before, balance_after, related_opportunity_id, request_id, description
  ) values (
    p_helper_id, 'APPLICATION_INTEREST', -p_amount, bal_before, bal_after, p_request_id, p_request_id,
    'Interesse em oportunidade'
  );

  return jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'balanceBefore', bal_before,
    'balanceAfter', bal_after
  );
end;
$$;

grant execute on function public.helper_debit_application_interest(uuid, uuid, int) to authenticated;

create or replace function public.helper_submit_application(
  p_request_id uuid,
  p_helper_id uuid,
  p_client_id uuid,
  p_message text default null,
  p_proposed_amount numeric default null,
  p_interest_amount int default 1
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

  perform public.helper_debit_application_interest(p_helper_id, p_request_id, coalesce(p_interest_amount, 1));

  begin
    insert into public.applications (
      request_id, helper_id, client_id, message, proposed_amount, status
    ) values (
      p_request_id, p_helper_id, p_client_id, p_message, p_proposed_amount, 'pending'
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
    'created', true,
    'applicationId', app_id,
    'conversationId', conv_id
  );
end;
$$;

grant execute on function public.helper_submit_application(uuid, uuid, uuid, text, numeric, int) to authenticated;

notify pgrst, 'reload schema';
