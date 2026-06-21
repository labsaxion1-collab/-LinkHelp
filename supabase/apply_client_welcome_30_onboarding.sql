-- =============================================================================
-- apply_client_welcome_30_onboarding.sql
-- Client onboarding welcome bonus: 30 LC once after completing carousel.
-- Does NOT alter helper credit_wallets, helper Stripe, or client Stripe checkout.
-- Option A: existing clients with NULL client_onboarding_completed_at see onboarding.
-- Prerequisite: apply_normalize_client_profile_credits.sql (SIGNUP_CLIENT=0).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) profiles.client_onboarding_completed_at
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists client_onboarding_completed_at timestamptz null;

comment on column public.profiles.client_onboarding_completed_at is
  'Set when client completes welcome onboarding carousel (CLIENT_WELCOME_30).';

-- ---------------------------------------------------------------------------
-- 2) client_credit_ledger
-- ---------------------------------------------------------------------------
create table if not exists public.client_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  amount int not null,
  balance_after int not null,
  reward_type text null,
  description text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists client_credit_ledger_client_created_idx
  on public.client_credit_ledger (client_id, created_at desc);

alter table public.client_credit_ledger enable row level security;

drop policy if exists client_credit_ledger_select_own on public.client_credit_ledger;
create policy client_credit_ledger_select_own on public.client_credit_ledger
  for select to authenticated
  using (auth.uid() = client_id);

-- ---------------------------------------------------------------------------
-- 3) client_onboarding_signals (audit only — no blocking in v1)
-- ---------------------------------------------------------------------------
create table if not exists public.client_onboarding_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_fingerprint text null,
  created_at timestamptz not null default now()
);

create index if not exists client_onboarding_signals_user_idx
  on public.client_onboarding_signals (user_id, created_at desc);

create index if not exists client_onboarding_signals_fingerprint_idx
  on public.client_onboarding_signals (device_fingerprint)
  where device_fingerprint is not null;

alter table public.client_onboarding_signals enable row level security;

-- No policies: inserts via security definer RPC only.

-- ---------------------------------------------------------------------------
-- 4) Reward type allow-list — add CLIENT_WELCOME_30
-- ---------------------------------------------------------------------------
create or replace function public.is_valid_reward_type(p_reward_type text)
returns boolean
language sql
immutable
as $$
  select p_reward_type in (
    'SIGNUP_CLIENT',
    'SIGNUP_HELPER',
    'CLIENT_WELCOME_30',
    'PROFILE_PHOTO',
    'PROFILE_DESCRIPTION',
    'PROFILE_SKILLS',
    'PHONE_VERIFIED',
    'FIRST_REQUEST_CREATED',
    'FIRST_APPLICATION_SENT',
    'FIRST_REVIEW_RECEIVED',
    'REFERRAL_COMPLETED'
  );
$$;

-- ---------------------------------------------------------------------------
-- 5) complete_client_onboarding RPC
-- ---------------------------------------------------------------------------
create or replace function public.complete_client_onboarding(
  p_client_id uuid,
  p_device_fingerprint text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  p public.profiles;
  v_amount int := 30;
  v_inserted boolean;
  v_balance int;
  v_completed_at timestamptz;
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if caller <> p_client_id then
    raise exception 'FORBIDDEN';
  end if;

  select * into p
  from public.profiles
  where id = p_client_id
  for update;

  if p.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if p.role <> 'client' then
    raise exception 'CLIENT_ONLY';
  end if;

  v_balance := coalesce(p.credits, 0);
  v_completed_at := p.client_onboarding_completed_at;

  if v_completed_at is not null then
    return jsonb_build_object(
      'granted', false,
      'reason', 'ALREADY_COMPLETED',
      'amount', 0,
      'balance_after', v_balance,
      'completed_at', v_completed_at
    );
  end if;

  if exists (
    select 1
    from public.user_bonus_rewards ubr
    where ubr.user_id = p_client_id
      and ubr.reward_type = 'CLIENT_WELCOME_30'
  ) then
    update public.profiles
    set
      client_onboarding_completed_at = coalesce(client_onboarding_completed_at, now()),
      updated_at = now()
    where id = p_client_id
    returning client_onboarding_completed_at, credits
    into v_completed_at, v_balance;

    return jsonb_build_object(
      'granted', false,
      'reason', 'ALREADY_GRANTED',
      'amount', 0,
      'balance_after', v_balance,
      'completed_at', v_completed_at
    );
  end if;

  insert into public.user_bonus_rewards (user_id, reward_type, amount)
  values (p_client_id, 'CLIENT_WELCOME_30', v_amount)
  on conflict (user_id, reward_type) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    update public.profiles
    set
      client_onboarding_completed_at = coalesce(client_onboarding_completed_at, now()),
      updated_at = now()
    where id = p_client_id
    returning client_onboarding_completed_at, credits
    into v_completed_at, v_balance;

    return jsonb_build_object(
      'granted', false,
      'reason', 'ALREADY_GRANTED',
      'amount', 0,
      'balance_after', v_balance,
      'completed_at', v_completed_at
    );
  end if;

  update public.profiles
  set
    credits = coalesce(credits, 0) + v_amount,
    client_onboarding_completed_at = now(),
    updated_at = now()
  where id = p_client_id
  returning credits, client_onboarding_completed_at
  into v_balance, v_completed_at;

  insert into public.client_credit_ledger (
    client_id,
    type,
    amount,
    balance_after,
    reward_type,
    description,
    metadata
  )
  values (
    p_client_id,
    'FREE_BONUS',
    v_amount,
    v_balance,
    'CLIENT_WELCOME_30',
    'LinkCredits — CLIENT_WELCOME_30',
    jsonb_build_object('source', 'client_onboarding')
  );

  if nullif(trim(coalesce(p_device_fingerprint, '')), '') is not null then
    insert into public.client_onboarding_signals (user_id, device_fingerprint)
    values (p_client_id, left(trim(p_device_fingerprint), 512));
  end if;

  return jsonb_build_object(
    'granted', true,
    'reward_type', 'CLIENT_WELCOME_30',
    'amount', v_amount,
    'balance_after', v_balance,
    'completed_at', v_completed_at
  );
end;
$$;

grant execute on function public.complete_client_onboarding(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Re-assert SIGNUP_CLIENT / FIRST_REQUEST_CREATED remain zero (no auto grant)
-- ---------------------------------------------------------------------------
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
    when 'SIGNUP_CLIENT'          then 0
    when 'SIGNUP_HELPER'          then 20
    when 'CLIENT_WELCOME_30'      then 30
    when 'PROFILE_PHOTO'          then 0
    when 'PROFILE_DESCRIPTION'    then 0
    when 'PROFILE_SKILLS'         then 0
    when 'PHONE_VERIFIED'         then 0
    when 'FIRST_REQUEST_CREATED'  then 0
    when 'FIRST_APPLICATION_SENT' then 5
    when 'FIRST_REVIEW_RECEIVED'  then 3
    when 'REFERRAL_COMPLETED'     then 10
    else null
  end);

  if v_amount is null or v_amount <= 0 then
    return jsonb_build_object(
      'granted', false,
      'reward_type', p_reward_type,
      'reason', 'ZERO_AMOUNT'
    );
  end if;

  v_desc := coalesce(nullif(trim(p_description), ''), 'LinkCredits — ' || p_reward_type);

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
    if p_reward_type = 'CLIENT_WELCOME_30' then
      raise exception 'USE_COMPLETE_CLIENT_ONBOARDING';
    end if;

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

grant execute on function public.grant_user_reward(uuid, text, int, text) to authenticated;
