-- =============================================================================
-- apply_normalize_client_profile_credits.sql
-- Normalize legacy ×1000 values in profiles.credits (client role only).
-- Harden RPCs so new clients receive 0 LC until CLIENT_WELCOME_30 is implemented.
-- Safe to re-run (backup is replaced; normalization is idempotent on real-scale values).
-- Does NOT touch credit_wallets, helper RPCs, or Stripe.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 0: Preview rows that will be normalized
-- ---------------------------------------------------------------------------
select
  'PREVIEW normalize profiles.credits' as step,
  p.id,
  p.email,
  p.role,
  p.credits as credits_before,
  round(p.credits::numeric / 1000)::int as credits_after
from public.profiles p
where p.role = 'client'
  and p.credits >= 1000
  and p.credits % 1000 = 0
order by p.credits desc;

select
  'PREVIEW normalize user_bonus_rewards (client owners)' as step,
  ubr.user_id,
  p.email,
  ubr.reward_type,
  ubr.amount as amount_before,
  round(ubr.amount::numeric / 1000)::int as amount_after
from public.user_bonus_rewards ubr
join public.profiles p on p.id = ubr.user_id
where p.role = 'client'
  and ubr.amount >= 1000
  and ubr.amount % 1000 = 0
order by ubr.amount desc;

-- ---------------------------------------------------------------------------
-- STEP 1: Backup before mutation
-- ---------------------------------------------------------------------------
drop table if exists public._profile_credits_backup_before_normalize;

create table public._profile_credits_backup_before_normalize as
select
  p.id,
  p.email,
  p.role,
  p.credits,
  p.updated_at,
  now() as backed_up_at
from public.profiles p
where p.role = 'client'
  and p.credits >= 1000
  and p.credits % 1000 = 0;

-- ---------------------------------------------------------------------------
-- STEP 2: Normalize profiles.credits (clients only, exact ×1000 multiples)
-- ---------------------------------------------------------------------------
update public.profiles p
set
  credits = round(p.credits::numeric / 1000)::int,
  updated_at = now()
where p.role = 'client'
  and p.credits >= 1000
  and p.credits % 1000 = 0;

-- ---------------------------------------------------------------------------
-- STEP 3: Normalize user_bonus_rewards amounts for client-owned rows (audit consistency)
-- ---------------------------------------------------------------------------
update public.user_bonus_rewards ubr
set amount = round(ubr.amount::numeric / 1000)::int
from public.profiles p
where p.id = ubr.user_id
  and p.role = 'client'
  and ubr.amount >= 1000
  and ubr.amount % 1000 = 0;

-- ---------------------------------------------------------------------------
-- STEP 4: grant_user_reward — real LC scale; no automatic client credits yet
-- (Based on 0024_helper_signup_20_lc.sql; SIGNUP_CLIENT=0, FIRST_REQUEST_CREATED=0)
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

-- ---------------------------------------------------------------------------
-- STEP 5: ensure_client_signup_credits — no-op until CLIENT_WELCOME_30
-- (Removes legacy hard-coded 12000 grant from migration 0015)
-- ---------------------------------------------------------------------------
create or replace function public.ensure_client_signup_credits(p_client_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  bal int;
begin
  if auth.uid() is not null
    and auth.uid() <> p_client_id
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  select credits into bal
  from public.profiles
  where id = p_client_id and role = 'client';

  return coalesce(bal, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- STEP 6: Post-apply verification snapshot
-- ---------------------------------------------------------------------------
select
  'AFTER normalize — client profiles with credits > 0' as step,
  p.email,
  p.role,
  p.credits
from public.profiles p
where p.role = 'client'
  and p.credits > 0
order by p.credits desc;

select
  'AFTER normalize — suspect client profiles (credits >= 1000)' as step,
  count(*)::int as suspect_count
from public.profiles
where role = 'client'
  and credits >= 1000;

select
  'BACKUP rows saved' as step,
  count(*)::int as backup_count
from public._profile_credits_backup_before_normalize;

notify pgrst, 'reload schema';
