-- LinkHelp: fix helper candidatura RPC (normal + exclusive).
-- Run in Supabase Dashboard → SQL Editor (Production).
--
-- Root cause in production:
--   applications.request_id EXISTS (correct — keep using it)
--   credit_transactions.request_id MISSING → helper_debit_application_interest fails
--   applications.proposed_amount may be MISSING
--
-- Safe to re-run (idempotent).

-- ---------------------------------------------------------------------------
-- 1. Schema alignment
-- ---------------------------------------------------------------------------

alter table public.applications
  add column if not exists is_exclusive boolean not null default false;

alter table public.applications
  add column if not exists proposed_amount numeric;

alter table public.requests
  add column if not exists exclusive_helper_id uuid references public.profiles(id) on delete set null;

create index if not exists requests_exclusive_helper_idx
  on public.requests (exclusive_helper_id)
  where exclusive_helper_id is not null;

alter table public.credit_transactions
  add column if not exists request_id uuid references public.requests(id) on delete set null;

alter table public.credit_transactions
  add column if not exists application_id uuid references public.applications(id) on delete set null;

alter table public.credit_transactions
  add column if not exists balance_before int;

alter table public.credit_transactions drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions add constraint credit_transactions_type_check check (
  type in (
    'CREDIT_PURCHASE', 'FREE_BONUS', 'OPPORTUNITY_UNLOCK', 'REFUND', 'ADMIN_ADJUSTMENT',
    'APPLICATION_INTEREST', 'APPLICATION_SELECTED'
  )
);

create index if not exists applications_request_active_idx
  on public.applications (request_id, status);

create index if not exists applications_request_exclusive_idx
  on public.applications (request_id)
  where is_exclusive = true and status in ('pending', 'viewed', 'accepted');

create index if not exists credit_transactions_request_idx
  on public.credit_transactions (request_id)
  where request_id is not null;

create unique index if not exists credit_transactions_helper_request_interest_uidx
  on public.credit_transactions (helper_id, related_opportunity_id, type)
  where type = 'APPLICATION_INTEREST' and related_opportunity_id is not null;

-- ---------------------------------------------------------------------------
-- 2. helper_debit_application_interest — works with related_opportunity_id (prod)
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

  -- Idempotent: production uses related_opportunity_id; also match request_id when present
  select id into tx_id
  from public.credit_transactions
  where helper_id = p_helper_id
    and type = 'APPLICATION_INTEREST'
    and (
      related_opportunity_id = p_request_id
      or request_id = p_request_id
    )
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
    helper_id,
    type,
    amount,
    balance_before,
    balance_after,
    related_opportunity_id,
    request_id,
    description
  ) values (
    p_helper_id,
    'APPLICATION_INTEREST',
    -p_amount,
    bal_before,
    bal_after,
    p_request_id,
    p_request_id,
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

-- ---------------------------------------------------------------------------
-- 3. helper_submit_application — 7 params, exclusive + max 3 active
-- ---------------------------------------------------------------------------

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

  perform public.helper_debit_application_interest(
    p_helper_id,
    p_request_id,
    coalesce(p_interest_amount, 1)
  );

  begin
    insert into public.applications (
      request_id, helper_id, client_id, message, proposed_amount, is_exclusive, status
    ) values (
      p_request_id,
      p_helper_id,
      p_client_id,
      p_message,
      p_proposed_amount,
      coalesce(p_is_exclusive, false),
      'pending'
    )
    returning id into app_id;
  exception
    when unique_violation then
      select id into app_id
      from public.applications
      where request_id = p_request_id
        and helper_id = p_helper_id
        and status <> 'cancelled'
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

  if coalesce(p_is_exclusive, false) then
    update public.requests
    set exclusive_helper_id = p_helper_id
    where id = p_request_id;
  end if;

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
-- 4. Exclusive lock visibility for helpers (RLS hides other helpers' applications)
-- ---------------------------------------------------------------------------

create or replace function public.request_has_exclusive_lock(
  p_request_id uuid,
  p_helper_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    where a.request_id = p_request_id
      and a.is_exclusive = true
      and a.status in ('pending', 'viewed', 'accepted')
      and a.helper_id <> coalesce(p_helper_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
$$;

grant execute on function public.request_has_exclusive_lock(uuid, uuid) to authenticated;

create or replace function public.sync_request_exclusive_helper_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  req_id uuid := coalesce(NEW.request_id, OLD.request_id);
  lock_helper uuid;
begin
  select a.helper_id into lock_helper
  from public.applications a
  where a.request_id = req_id
    and a.is_exclusive = true
    and a.status in ('pending', 'viewed', 'accepted')
  order by a.created_at desc
  limit 1;

  update public.requests
  set exclusive_helper_id = lock_helper
  where id = req_id;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_sync_request_exclusive_helper on public.applications;
create trigger trg_sync_request_exclusive_helper
  after insert or update of is_exclusive, status or delete
  on public.applications
  for each row
  execute function public.sync_request_exclusive_helper_id();

update public.requests r
set exclusive_helper_id = sub.helper_id
from (
  select distinct on (a.request_id) a.request_id, a.helper_id
  from public.applications a
  where a.is_exclusive = true
    and a.status in ('pending', 'viewed', 'accepted')
  order by a.request_id, a.created_at desc
) sub
where r.id = sub.request_id;

notify pgrst, 'reload schema';
