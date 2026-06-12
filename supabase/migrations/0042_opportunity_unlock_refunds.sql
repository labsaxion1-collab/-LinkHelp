-- =============================================================================
-- Opportunity unlock refunds — full credit return when client does not respond
-- within RESPONSE_DEADLINE_HOURS (default 48, stored in platform_settings).
-- Integrates with APPLICATION_INTEREST flow via helper_submit_application.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Config: response deadline hours (override via platform_settings table)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value)
values ('response_deadline_hours', '48')
on conflict (key) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists platform_settings_select_authenticated on public.platform_settings;
create policy platform_settings_select_authenticated on public.platform_settings
  for select to authenticated using (true);

create or replace function public.get_response_deadline_hours()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif((select value from public.platform_settings where key = 'response_deadline_hours'), '')::int,
    48
  );
$$;

grant execute on function public.get_response_deadline_hours() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- opportunity_unlocks — extend schema
-- ---------------------------------------------------------------------------
alter table public.opportunity_unlocks
  add column if not exists refund_status text not null default 'none',
  add column if not exists response_deadline timestamptz,
  add column if not exists application_id uuid references public.applications (id) on delete set null;

alter table public.opportunity_unlocks drop constraint if exists opportunity_unlocks_status_check;
update public.opportunity_unlocks set status = 'pending' where status = 'unlocked';

alter table public.opportunity_unlocks
  add constraint opportunity_unlocks_status_check check (
    status in ('pending', 'responded', 'expired', 'refunded', 'cancelled')
  );

alter table public.opportunity_unlocks drop constraint if exists opportunity_unlocks_refund_status_check;
alter table public.opportunity_unlocks
  add constraint opportunity_unlocks_refund_status_check check (
    refund_status in ('none', 'pending', 'processed', 'rejected')
  );

alter table public.opportunity_unlocks alter column refund_eligible set default false;

update public.opportunity_unlocks
set response_deadline = unlocked_at + (public.get_response_deadline_hours() || ' hours')::interval
where response_deadline is null;

update public.opportunity_unlocks
set refund_status = 'processed', refund_eligible = true
where status = 'refunded' and refund_status = 'none';

-- ---------------------------------------------------------------------------
-- credit_transactions — link refunds to unlock rows (idempotent)
-- ---------------------------------------------------------------------------
alter table public.credit_transactions
  add column if not exists unlock_id uuid references public.opportunity_unlocks (id) on delete set null;

create unique index if not exists credit_transactions_refund_unlock_uidx
  on public.credit_transactions (unlock_id)
  where type = 'REFUND' and unlock_id is not null;

create index if not exists opportunity_unlocks_refund_eligibility_idx
  on public.opportunity_unlocks (status, response_deadline, refund_status)
  where refund_status = 'none' and status = 'pending';

-- ---------------------------------------------------------------------------
-- Helper: create / refresh pending unlock after interest debit
-- ---------------------------------------------------------------------------
create or replace function public.upsert_pending_opportunity_unlock(
  p_opportunity_id uuid,
  p_helper_id uuid,
  p_credits_spent int,
  p_application_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  unlock_id uuid;
  deadline timestamptz := now() + (public.get_response_deadline_hours() || ' hours')::interval;
begin
  insert into public.opportunity_unlocks (
    opportunity_id,
    helper_id,
    credits_spent,
    status,
    refund_eligible,
    refund_status,
    response_deadline,
    application_id,
    unlocked_at
  ) values (
    p_opportunity_id,
    p_helper_id,
    greatest(p_credits_spent, 1),
    'pending',
    false,
    'none',
    deadline,
    p_application_id,
    now()
  )
  on conflict (opportunity_id, helper_id) do update
  set
    credits_spent = excluded.credits_spent,
    application_id = coalesce(excluded.application_id, opportunity_unlocks.application_id),
    response_deadline = coalesce(opportunity_unlocks.response_deadline, excluded.response_deadline)
  where opportunity_unlocks.status = 'pending'
    and opportunity_unlocks.refund_status = 'none'
  returning id into unlock_id;

  if unlock_id is null then
    select id into unlock_id
    from public.opportunity_unlocks
    where opportunity_id = p_opportunity_id and helper_id = p_helper_id;
  end if;

  return unlock_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core refund processor (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.process_single_unlock_refund(
  p_unlock_id uuid,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.opportunity_unlocks;
  w public.credit_wallets;
  bal_before int;
  bal_after int;
  refund_amount int;
  is_admin boolean;
  is_service boolean;
  existing_refund uuid;
begin
  is_admin := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
  is_service := coalesce(auth.jwt() ->> 'role', '') = 'service_role';

  if p_force and not is_admin and not is_service then
    raise exception 'ADMIN_ONLY';
  end if;

  select * into u from public.opportunity_unlocks where id = p_unlock_id for update;
  if u.id is null then
    return jsonb_build_object('skipped', true, 'reason', 'NOT_FOUND');
  end if;

  if u.refund_status = 'processed' then
    return jsonb_build_object('skipped', true, 'reason', 'ALREADY_PROCESSED');
  end if;

  select id into existing_refund
  from public.credit_transactions
  where unlock_id = p_unlock_id and type = 'REFUND'
  limit 1;

  if existing_refund is not null then
    return jsonb_build_object('skipped', true, 'reason', 'ALREADY_REFUNDED');
  end if;

  if not p_force then
    if u.status <> 'pending' then
      return jsonb_build_object('skipped', true, 'reason', 'NOT_PENDING');
    end if;
    if u.refund_status <> 'none' then
      return jsonb_build_object('skipped', true, 'reason', 'REFUND_STATUS');
    end if;
    if u.response_deadline is null or u.response_deadline > now() then
      return jsonb_build_object('skipped', true, 'reason', 'DEADLINE_NOT_PASSED');
    end if;
  end if;

  refund_amount := u.credits_spent;
  w := public.ensure_helper_credit_wallet(u.helper_id);
  bal_before := w.balance;
  bal_after := bal_before + refund_amount;

  update public.credit_wallets
  set
    balance = bal_after,
    total_spent = greatest(0, total_spent - refund_amount)
  where helper_id = u.helper_id;

  update public.opportunity_unlocks
  set
    status = 'refunded',
    refund_status = 'processed',
    refund_eligible = true,
    refunded_at = now()
  where id = p_unlock_id;

  insert into public.credit_transactions (
    helper_id,
    type,
    amount,
    balance_before,
    balance_after,
    related_opportunity_id,
    request_id,
    application_id,
    unlock_id,
    description
  ) values (
    u.helper_id,
    'REFUND',
    refund_amount,
    bal_before,
    bal_after,
    u.opportunity_id,
    u.opportunity_id,
    u.application_id,
    u.id,
    'Reembolso por não-resposta do cliente'
  );

  insert into public.notifications (user_id, type, title, description, action_url, read)
  values (
    u.helper_id,
    'payment',
    'LinkCredit devolvido',
    format('Devolvemos %s LC porque o cliente não respondeu a tempo.', refund_amount),
    '/helper/credits',
    false
  );

  begin
    perform private.enqueue_push(
      u.helper_id,
      'LinkCredit devolvido',
      format('Devolvemos %s LC porque o cliente não respondeu a tempo.', refund_amount),
      '/helper/credits'
    );
  exception
    when undefined_function or invalid_schema_name then
      null;
  end;

  return jsonb_build_object(
    'processed', true,
    'unlockId', p_unlock_id,
    'refunded', refund_amount,
    'balanceAfter', bal_after
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Batch job entrypoint (cron / edge function with service_role)
-- ---------------------------------------------------------------------------
create or replace function public.process_expired_unlock_refunds()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  result jsonb;
  processed_count int := 0;
  total_refunded int := 0;
  details jsonb := '[]'::jsonb;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'SERVICE_ROLE_ONLY';
  end if;

  for r in
    select id
    from public.opportunity_unlocks
    where status = 'pending'
      and refund_status = 'none'
      and response_deadline is not null
      and response_deadline <= now()
    order by response_deadline asc
    limit 200
  loop
    result := public.process_single_unlock_refund(r.id, false);
    details := details || jsonb_build_array(result);
    if coalesce((result ->> 'processed')::boolean, false) then
      processed_count := processed_count + 1;
      total_refunded := total_refunded + coalesce((result ->> 'refunded')::int, 0);
    end if;
  end loop;

  return jsonb_build_object(
    'processedCount', processed_count,
    'totalRefunded', total_refunded,
    'details', details
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin manual refund
-- ---------------------------------------------------------------------------
create or replace function public.admin_force_unlock_refund(p_unlock_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'ADMIN_ONLY';
  end if;
  return public.process_single_unlock_refund(p_unlock_id, true);
end;
$$;

grant execute on function public.process_expired_unlock_refunds() to service_role;
grant execute on function public.admin_force_unlock_refund(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Mark unlock as responded when client engages
-- ---------------------------------------------------------------------------
create or replace function private.trg_mark_unlock_responded_on_client_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv public.conversations;
begin
  select * into conv from public.conversations where id = new.conversation_id;
  if conv.id is null then
    return new;
  end if;
  if new.sender_id <> conv.client_id then
    return new;
  end if;

  update public.opportunity_unlocks
  set status = 'responded'
  where opportunity_id = conv.request_id
    and helper_id = conv.helper_id
    and status = 'pending';

  return new;
end;
$$;

drop trigger if exists messages_mark_unlock_responded on public.messages;
create trigger messages_mark_unlock_responded
  after insert on public.messages
  for each row execute function private.trg_mark_unlock_responded_on_client_message();

create or replace function private.trg_mark_unlock_responded_on_application_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('viewed', 'accepted', 'rejected', 'completed')
     and old.status = 'pending' then
    update public.opportunity_unlocks
    set status = 'responded'
    where opportunity_id = new.request_id
      and helper_id = new.helper_id
      and status = 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists applications_mark_unlock_responded on public.applications;
create trigger applications_mark_unlock_responded
  after update of status on public.applications
  for each row execute function private.trg_mark_unlock_responded_on_application_update();

-- ---------------------------------------------------------------------------
-- Backfill unlock rows from existing APPLICATION_INTEREST debits
-- ---------------------------------------------------------------------------
insert into public.opportunity_unlocks (
  opportunity_id,
  helper_id,
  credits_spent,
  status,
  refund_eligible,
  refund_status,
  response_deadline,
  application_id,
  unlocked_at,
  created_at
)
select
  ct.request_id,
  ct.helper_id,
  abs(ct.amount),
  case
    when exists (
      select 1
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where c.request_id = ct.request_id
        and c.helper_id = ct.helper_id
        and m.sender_id = c.client_id
    )
    or exists (
      select 1
      from public.applications a
      where a.request_id = ct.request_id
        and a.helper_id = ct.helper_id
        and a.status not in ('pending', 'cancelled')
    ) then 'responded'
    else 'pending'
  end,
  false,
  'none',
  ct.created_at + (public.get_response_deadline_hours() || ' hours')::interval,
  (
    select a.id
    from public.applications a
    where a.request_id = ct.request_id and a.helper_id = ct.helper_id
    order by a.created_at desc
    limit 1
  ),
  ct.created_at,
  ct.created_at
from public.credit_transactions ct
where ct.type = 'APPLICATION_INTEREST'
  and ct.request_id is not null
  and not exists (
    select 1
    from public.opportunity_unlocks ou
    where ou.opportunity_id = ct.request_id and ou.helper_id = ct.helper_id
  );

-- ---------------------------------------------------------------------------
-- helper_debit_application_interest — also track pending unlock
-- ---------------------------------------------------------------------------
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
    perform public.upsert_pending_opportunity_unlock(p_request_id, p_helper_id, p_amount, null);
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

  perform public.upsert_pending_opportunity_unlock(p_request_id, p_helper_id, p_amount, null);

  return jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'balanceBefore', bal_before,
    'balanceAfter', bal_after
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- helper_submit_application — attach unlock to application row
-- ---------------------------------------------------------------------------
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
  unlock_id uuid;
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
    perform public.upsert_pending_opportunity_unlock(
      p_request_id, p_helper_id, coalesce(p_interest_amount, 1), app_id
    );
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
      perform public.upsert_pending_opportunity_unlock(
        p_request_id, p_helper_id, coalesce(p_interest_amount, 1), app_id
      );
      return jsonb_build_object(
        'alreadyExists', true,
        'applicationId', app_id,
        'conversationId', conv_id,
        'created', false
      );
  end;

  unlock_id := public.upsert_pending_opportunity_unlock(
    p_request_id, p_helper_id, coalesce(p_interest_amount, 1), app_id
  );

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
    'conversationId', conv_id,
    'unlockId', unlock_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- unlock_opportunity_with_credits — align with pending + deadline model
-- ---------------------------------------------------------------------------
create or replace function public.unlock_opportunity_with_credits(p_opportunity_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  helper uuid := auth.uid();
  req public.requests;
  prof public.profiles;
  w public.credit_wallets;
  existing public.opportunity_unlocks;
  cost int;
  new_balance int;
  unlock_id uuid;
begin
  if helper is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into prof from public.profiles where id = helper;
  if prof.id is null or prof.role <> 'helper' then raise exception 'HELPER_ONLY'; end if;

  select * into req from public.requests where id = p_opportunity_id and status = 'open';
  if req.id is null then raise exception 'OPPORTUNITY_UNAVAILABLE'; end if;

  select * into existing from public.opportunity_unlocks
  where opportunity_id = p_opportunity_id and helper_id = helper;
  if existing.id is not null then
    return jsonb_build_object('alreadyUnlocked', true, 'creditsSpent', existing.credits_spent);
  end if;

  w := public.ensure_helper_credit_wallet(helper);
  cost := public.estimate_request_credit_price(req);
  if w.balance < cost then raise exception 'INSUFFICIENT_CREDITS'; end if;
  new_balance := w.balance - cost;

  update public.credit_wallets
  set balance = new_balance, total_spent = total_spent + cost
  where helper_id = helper;

  unlock_id := public.upsert_pending_opportunity_unlock(p_opportunity_id, helper, cost, null);

  insert into public.credit_transactions (helper_id, type, amount, balance_after, related_opportunity_id, description)
  values (helper, 'OPPORTUNITY_UNLOCK', -cost, new_balance, p_opportunity_id, 'Desbloqueio de oportunidade');

  insert into public.conversations (request_id, client_id, helper_id, contact_unlocked)
  values (p_opportunity_id, req.client_id, helper, true)
  on conflict do nothing;

  insert into public.applications (request_id, helper_id, client_id, status, message)
  values (p_opportunity_id, helper, req.client_id, 'pending', null)
  on conflict do nothing;

  insert into public.notifications (user_id, type, title, description, action_url, read)
  values (req.client_id, 'application', 'Nova proposta', 'Um helper desbloqueou sua oportunidade e pode conversar pelo app.', '/client/dashboard', false);

  return jsonb_build_object('alreadyUnlocked', false, 'creditsSpent', cost, 'balanceAfter', new_balance, 'unlockId', unlock_id);
end;
$$;

-- Deprecate manual 50% refund — replaced by automatic full refund job
drop function if exists public.refund_opportunity_unlock(uuid);

notify pgrst, 'reload schema';
