-- =============================================================================
-- LinkHelp — full credit system setup (idempotent)
-- =============================================================================
-- Purpose: Run on a DB that skipped 0012/0013 but needs 0027–0029.
-- Safe: does NOT drop tables or delete data. Only creates missing objects.
--
-- Prerequisites (must already exist from 0001+):
--   public.profiles, public.requests, public.applications, public.conversations
--
-- Recommended order when applying migrations manually:
--   0001 → … → 0011 → 0012 → 0013 → 0014 → 0015 → 0016* → 0017* → … → 0026
--   → THIS FILE (or 0027+0028+0029) → done
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Prerequisites
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Missing public.profiles — apply 0001_linkhelp_production.sql first.';
  end if;
  if to_regclass('public.requests') is null then
    raise exception 'Missing public.requests — apply 0001_linkhelp_production.sql first.';
  end if;
  if to_regclass('public.applications') is null then
    raise exception 'Missing public.applications — apply 0001_linkhelp_production.sql first.';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1. Utilities (from 0001)
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Core credit tables (from 0012_helper_credit_marketplace.sql)
-- -----------------------------------------------------------------------------
create table if not exists public.credit_wallets (
  id uuid primary key default gen_random_uuid(),
  helper_id uuid not null unique references public.profiles (id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  total_purchased int not null default 0 check (total_purchased >= 0),
  total_bonus int not null default 0 check (total_bonus >= 0),
  total_spent int not null default 0 check (total_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  helper_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  amount int not null,
  balance_after int not null check (balance_after >= 0),
  related_opportunity_id uuid null references public.requests (id) on delete set null,
  related_payment_id text null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunity_unlocks (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.requests (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  credits_spent int not null check (credits_spent > 0),
  status text not null default 'unlocked' check (status in ('unlocked','refunded','cancelled')),
  unlocked_at timestamptz not null default now(),
  refund_eligible boolean not null default true,
  refunded_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (opportunity_id, helper_id)
);

create table if not exists public.credit_packages (
  id text primary key,
  name text not null,
  credits int not null check (credits > 0),
  price_cad numeric(10,2) not null check (price_cad > 0),
  active boolean not null default true,
  highlight_label text null,
  created_at timestamptz not null default now()
);

-- 0027 columns on credit_transactions
alter table public.credit_transactions
  add column if not exists request_id uuid references public.requests(id) on delete set null,
  add column if not exists application_id uuid references public.applications(id) on delete set null,
  add column if not exists balance_before int;

-- Request columns required by estimate_request_credit_price (0017 + 0014)
alter table public.requests
  add column if not exists budget_type text default 'negotiable',
  add column if not exists budget_min numeric,
  add column if not exists budget_max numeric,
  add column if not exists budget_amount numeric,
  add column if not exists currency text default 'CAD',
  add column if not exists preferred_period text;

-- -----------------------------------------------------------------------------
-- 3. Onboarding rewards (0015 — needed by ensure_helper_credit_wallet 0025)
-- -----------------------------------------------------------------------------
create table if not exists public.user_bonus_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_type text not null,
  amount int not null check (amount > 0),
  created_at timestamptz not null default now(),
  constraint user_bonus_rewards_user_type_unique unique (user_id, reward_type)
);

create index if not exists user_bonus_rewards_user_created_idx
  on public.user_bonus_rewards (user_id, created_at desc);

alter table public.user_bonus_rewards enable row level security;

drop policy if exists user_bonus_rewards_select_own on public.user_bonus_rewards;
create policy user_bonus_rewards_select_own on public.user_bonus_rewards
  for select to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. Indexes
-- -----------------------------------------------------------------------------
create index if not exists credit_transactions_helper_created_idx
  on public.credit_transactions (helper_id, created_at desc);
create index if not exists credit_transactions_request_idx
  on public.credit_transactions (request_id) where request_id is not null;
create index if not exists credit_transactions_helper_request_type_idx
  on public.credit_transactions (helper_id, request_id, type)
  where request_id is not null;
create index if not exists opportunity_unlocks_helper_created_idx
  on public.opportunity_unlocks (helper_id, created_at desc);
create index if not exists opportunity_unlocks_opportunity_idx
  on public.opportunity_unlocks (opportunity_id);

-- -----------------------------------------------------------------------------
-- 5. Triggers
-- -----------------------------------------------------------------------------
drop trigger if exists credit_wallets_set_updated_at on public.credit_wallets;
create trigger credit_wallets_set_updated_at
  before update on public.credit_wallets
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. RLS (0012)
-- -----------------------------------------------------------------------------
alter table public.credit_wallets enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.opportunity_unlocks enable row level security;
alter table public.credit_packages enable row level security;

drop policy if exists credit_wallets_select_own on public.credit_wallets;
create policy credit_wallets_select_own on public.credit_wallets
  for select to authenticated using (auth.uid() = helper_id);

drop policy if exists credit_transactions_select_own on public.credit_transactions;
create policy credit_transactions_select_own on public.credit_transactions
  for select to authenticated using (auth.uid() = helper_id);

drop policy if exists opportunity_unlocks_select_related on public.opportunity_unlocks;
create policy opportunity_unlocks_select_related on public.opportunity_unlocks
  for select to authenticated using (
    auth.uid() = helper_id or exists (
      select 1 from public.requests r
      where r.id = opportunity_unlocks.opportunity_id and r.client_id = auth.uid()
    )
  );

drop policy if exists credit_packages_select_active on public.credit_packages;
create policy credit_packages_select_active on public.credit_packages
  for select to authenticated using (active = true);

-- -----------------------------------------------------------------------------
-- 7. Transaction type constraint (0027 — includes APPLICATION_*)
-- -----------------------------------------------------------------------------
alter table public.credit_transactions drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions add constraint credit_transactions_type_check check (
  type in (
    'CREDIT_PURCHASE', 'FREE_BONUS', 'OPPORTUNITY_UNLOCK', 'REFUND', 'ADMIN_ADJUSTMENT',
    'APPLICATION_INTEREST', 'APPLICATION_SELECTED'
  )
);

-- -----------------------------------------------------------------------------
-- 8. Market metrics (0027)
-- -----------------------------------------------------------------------------
create table if not exists public.request_market_metrics (
  request_id uuid primary key references public.requests(id) on delete cascade,
  acceptance_rate numeric(5,4) not null default 0.5,
  not_interested_rate numeric(5,4) not null default 0,
  average_price_cad numeric(12,2),
  average_distance_km numeric(8,2),
  average_response_hours numeric(8,2),
  interest_count int not null default 0,
  not_interested_count int not null default 0,
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 9. Credit packages seed (0027 catalog)
-- -----------------------------------------------------------------------------
update public.credit_packages set active = false where id in ('starter', 'plus', 'pro', 'business');

insert into public.credit_packages (id, name, credits, price_cad, active, highlight_label)
values
  ('starter', 'Starter', 35, 14.99, true, null),
  ('popular', 'Popular', 80, 29.99, true, 'Mais popular'),
  ('pro', 'Pro', 180, 59.99, true, null),
  ('power', 'Power', 400, 119.99, true, 'Melhor valor')
on conflict (id) do update set
  name = excluded.name,
  credits = excluded.credits,
  price_cad = excluded.price_cad,
  active = excluded.active,
  highlight_label = excluded.highlight_label;

-- Fallback seed if table was empty (0012 legacy ids)
insert into public.credit_packages (id, name, credits, price_cad, active, highlight_label)
values
  ('starter', 'Starter', 35, 14.99, true, null),
  ('popular', 'Popular', 80, 29.99, true, 'Mais popular'),
  ('pro', 'Pro', 180, 59.99, true, null),
  ('power', 'Power', 400, 119.99, true, 'Melhor valor')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 10. Foundation RPCs (0013 + 0012 essentials)
-- -----------------------------------------------------------------------------
create or replace function public.register_credit_transaction(
  p_helper_id uuid,
  p_type text,
  p_amount int,
  p_balance_after int,
  p_related_opportunity_id uuid default null,
  p_related_payment_id text default null,
  p_description text default null
)
returns public.credit_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  tx public.credit_transactions;
begin
  if p_type not in (
    'CREDIT_PURCHASE','FREE_BONUS','OPPORTUNITY_UNLOCK','REFUND','ADMIN_ADJUSTMENT',
    'APPLICATION_INTEREST','APPLICATION_SELECTED'
  ) then
    raise exception 'INVALID_TRANSACTION_TYPE';
  end if;
  if p_balance_after < 0 then
    raise exception 'NEGATIVE_BALANCE';
  end if;

  insert into public.credit_transactions (
    helper_id, type, amount, balance_after, related_opportunity_id, related_payment_id, description
  ) values (
    p_helper_id, p_type, p_amount, p_balance_after, p_related_opportunity_id, p_related_payment_id, p_description
  )
  returning * into tx;

  return tx;
end;
$$;

create or replace function public.get_wallet_balance(p_helper_id uuid)
returns int
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  bal int;
begin
  if auth.uid() is not null
    and auth.uid() <> p_helper_id
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  select balance into bal from public.credit_wallets where helper_id = p_helper_id;
  return coalesce(bal, 0);
end;
$$;

create or replace function public.add_credits(
  p_helper_id uuid,
  p_amount int,
  p_type text,
  p_description text default null,
  p_related_payment_id text default null
)
returns public.credit_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.credit_wallets;
  new_balance int;
begin
  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  insert into public.credit_wallets (helper_id)
  values (p_helper_id)
  on conflict (helper_id) do nothing;

  select * into w from public.credit_wallets where helper_id = p_helper_id for update;
  if w.id is null then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  new_balance := w.balance + p_amount;

  update public.credit_wallets
  set
    balance = new_balance,
    total_bonus = total_bonus + case when p_type = 'FREE_BONUS' then p_amount else 0 end,
    total_purchased = total_purchased + case when p_type = 'CREDIT_PURCHASE' then p_amount else 0 end
  where helper_id = p_helper_id;

  perform public.register_credit_transaction(
    p_helper_id, p_type, p_amount, new_balance, null, p_related_payment_id, p_description
  );

  select * into w from public.credit_wallets where helper_id = p_helper_id;
  return w;
end;
$$;

create or replace function public.is_valid_reward_type(p_reward_type text)
returns boolean
language sql
immutable
as $$
  select p_reward_type in (
    'SIGNUP_CLIENT','SIGNUP_HELPER','PROFILE_PHOTO','PROFILE_DESCRIPTION','PROFILE_SKILLS',
    'PHONE_VERIFIED','FIRST_REQUEST_CREATED','FIRST_APPLICATION_SENT','FIRST_REVIEW_RECEIVED',
    'REFERRAL_COMPLETED'
  );
$$;

create or replace function public.grant_user_reward(
  p_user_id uuid,
  p_reward_type text,
  p_amount int default null,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_amount int;
  v_desc text;
  v_inserted boolean;
  v_balance int;
  w public.credit_wallets;
begin
  if auth.uid() is not null
    and auth.uid() <> p_user_id
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  if not public.is_valid_reward_type(p_reward_type) then
    raise exception 'INVALID_REWARD_TYPE';
  end if;

  v_amount := coalesce(p_amount, case p_reward_type
    when 'SIGNUP_CLIENT' then 0
    when 'SIGNUP_HELPER' then 20
    when 'PROFILE_PHOTO' then 0
    when 'PROFILE_DESCRIPTION' then 0
    when 'PROFILE_SKILLS' then 0
    when 'PHONE_VERIFIED' then 0
    when 'FIRST_REQUEST_CREATED' then 5
    when 'FIRST_APPLICATION_SENT' then 5
    when 'FIRST_REVIEW_RECEIVED' then 3
    when 'REFERRAL_COMPLETED' then 10
    else null
  end);

  if v_amount is null or v_amount <= 0 then
    return jsonb_build_object('granted', false, 'reward_type', p_reward_type, 'reason', 'ZERO_AMOUNT');
  end if;

  v_desc := coalesce(nullif(trim(p_description), ''), 'LinkCredits - ' || p_reward_type);

  insert into public.user_bonus_rewards (user_id, reward_type, amount)
  values (p_user_id, p_reward_type, v_amount)
  on conflict (user_id, reward_type) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    return jsonb_build_object(
      'granted', false,
      'reward_type', p_reward_type,
      'reason', 'ALREADY_GRANTED'
    );
  end if;

  select role into v_role from public.profiles where id = p_user_id;
  if v_role is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_role = 'helper' then
    insert into public.credit_wallets (helper_id)
    values (p_user_id)
    on conflict (helper_id) do nothing;

    w := public.add_credits(p_user_id, v_amount, 'FREE_BONUS', v_desc);
    v_balance := w.balance;
  else
    update public.profiles
    set credits = credits + v_amount, updated_at = now()
    where id = p_user_id
    returning credits into v_balance;
  end if;

  return jsonb_build_object(
    'granted', true,
    'reward_type', p_reward_type,
    'amount', v_amount,
    'balance_after', v_balance
  );
end;
$$;

create or replace function public.ensure_helper_credit_wallet(p_helper_id uuid)
returns public.credit_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.credit_wallets;
  p public.profiles;
begin
  if auth.uid() is not null
    and auth.uid() <> p_helper_id
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  select * into p from public.profiles where id = p_helper_id;
  if p.id is null or p.role <> 'helper' then
    raise exception 'HELPER_ONLY';
  end if;

  insert into public.credit_wallets (helper_id)
  values (p_helper_id)
  on conflict (helper_id) do nothing;

  if not exists (
    select 1 from public.user_bonus_rewards
    where user_id = p_helper_id and reward_type = 'SIGNUP_HELPER'
  ) then
    perform public.grant_user_reward(
      p_helper_id,
      'SIGNUP_HELPER',
      null,
      'Créditos iniciais de boas-vindas'
    );
  end if;

  select * into w from public.credit_wallets where helper_id = p_helper_id;
  return w;
end;
$$;

-- -----------------------------------------------------------------------------
-- 11. Helper-paid model RPCs (0027)
-- -----------------------------------------------------------------------------
create or replace function public.estimate_request_credit_price(req public.requests)
returns int
language plpgsql
immutable
as $$
declare
  v numeric := 0;
begin
  if req.budget_type = 'negotiable' or req.budget is null or trim(req.budget) = '' then
    v := 0;
  elsif req.budget_max is not null and req.budget_max > 0 then
    v := req.budget_max;
  elsif req.budget_min is not null and req.budget_min > 0 then
    v := req.budget_min;
  else
    v := 0;
  end if;
  if v <= 50 then return 2;
  if v <= 100 then return 4;
  if v <= 250 then return 6;
  if v <= 500 then return 10;
  if v <= 1000 then return 16;
  return 24;
end;
$$;

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
  if caller is null or caller <> p_helper_id then raise exception 'NOT_ALLOWED'; end if;
  if p_amount < 0 then raise exception 'INVALID_AMOUNT'; end if;

  select id into tx_id from public.credit_transactions
  where helper_id = p_helper_id and request_id = p_request_id and type = 'APPLICATION_INTEREST'
  limit 1;
  if tx_id is not null then
    return jsonb_build_object('alreadyCharged', true, 'amount', p_amount);
  end if;

  w := public.ensure_helper_credit_wallet(p_helper_id);
  bal_before := w.balance;
  if bal_before < p_amount then raise exception 'INSUFFICIENT_CREDITS'; end if;
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

create or replace function public.helper_debit_application_selected(
  p_helper_id uuid,
  p_request_id uuid,
  p_application_id uuid,
  p_amount int
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
  req_client uuid;
begin
  if caller is null then raise exception 'AUTH_REQUIRED'; end if;
  if caller <> p_helper_id then
    select client_id into req_client from public.requests where id = p_request_id;
    if req_client is null or req_client <> caller then raise exception 'NOT_ALLOWED'; end if;
  end if;
  if p_amount < 2 or p_amount > 30 then raise exception 'INVALID_AMOUNT'; end if;

  select id into tx_id from public.credit_transactions
  where helper_id = p_helper_id and request_id = p_request_id and type = 'APPLICATION_SELECTED'
  limit 1;
  if tx_id is not null then
    return jsonb_build_object('alreadyCharged', true, 'amount', p_amount);
  end if;

  w := public.ensure_helper_credit_wallet(p_helper_id);
  bal_before := w.balance;
  if bal_before < p_amount then raise exception 'INSUFFICIENT_CREDITS'; end if;
  bal_after := bal_before - p_amount;

  update public.credit_wallets
  set balance = bal_after, total_spent = total_spent + p_amount
  where helper_id = p_helper_id;

  insert into public.credit_transactions (
    helper_id, type, amount, balance_before, balance_after, related_opportunity_id, request_id, application_id, description
  ) values (
    p_helper_id, 'APPLICATION_SELECTED', -p_amount, bal_before, bal_after, p_request_id, p_request_id, p_application_id,
    'Contratação confirmada pelo cliente'
  );

  return jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'balanceBefore', bal_before,
    'balanceAfter', bal_after
  );
end;
$$;

create or replace function public.charge_helper_on_client_hire(
  p_application_id uuid,
  p_amount int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  app public.applications;
  req public.requests;
begin
  if caller is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into app from public.applications where id = p_application_id;
  if app.id is null then raise exception 'NOT_FOUND'; end if;
  select * into req from public.requests where id = app.request_id;
  if req.client_id <> caller then raise exception 'NOT_ALLOWED'; end if;

  return public.helper_debit_application_selected(app.helper_id, app.request_id, app.id, p_amount);
end;
$$;

grant execute on function public.ensure_helper_credit_wallet(uuid) to authenticated;
grant execute on function public.get_wallet_balance(uuid) to authenticated;
grant execute on function public.helper_debit_application_interest(uuid, uuid, int) to authenticated;
grant execute on function public.helper_debit_application_selected(uuid, uuid, uuid, int) to authenticated;
grant execute on function public.charge_helper_on_client_hire(uuid, int) to authenticated;

-- -----------------------------------------------------------------------------
-- 12. Conversations single-thread (0028) — only if conversations exists
-- -----------------------------------------------------------------------------
do $$
declare
  grp record;
  keep_id uuid;
  dup_id uuid;
begin
  if to_regclass('public.conversations') is null then
    raise notice 'Skipping 0028: public.conversations not found.';
    return;
  end if;

  for grp in
    select request_id, helper_id
    from public.conversations
    group by request_id, helper_id
    having count(*) > 1
  loop
    select id into keep_id
    from public.conversations
    where request_id = grp.request_id and helper_id = grp.helper_id
    order by contact_unlocked desc, created_at asc
    limit 1;

    for dup_id in
      select id from public.conversations
      where request_id = grp.request_id and helper_id = grp.helper_id and id <> keep_id
    loop
      if to_regclass('public.messages') is not null then
        update public.messages set conversation_id = keep_id where conversation_id = dup_id;
      end if;
      delete from public.conversations where id = dup_id;
    end loop;
  end loop;
end $$;

do $$
begin
  if to_regclass('public.conversations') is not null then
    execute $idx$
      create unique index if not exists conversations_request_client_helper_idx
        on public.conversations (request_id, client_id, helper_id)
    $idx$;
  end if;
end $$;

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
      where request_id = p_request_id and helper_id = p_helper_id;
      if p_contact_unlocked and conv.contact_unlocked is false then
        update public.conversations set contact_unlocked = true where id = conv.id;
      end if;
  end;

  return conv.id;
end;
$$;

grant execute on function public.ensure_conversation(uuid, uuid, uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- 13. Preferred period backfill (0029)
-- -----------------------------------------------------------------------------
comment on column public.requests.preferred_period is 'morning | afternoon | evening — period of day when no exact time';

update public.requests
set preferred_period = preferred_time_window
where preferred_period is null
  and preferred_time_window in ('morning', 'afternoon', 'evening');

-- =============================================================================
-- Done. After this, 0027/0028/0029 are safe to re-run (idempotent sections only).
-- =============================================================================
