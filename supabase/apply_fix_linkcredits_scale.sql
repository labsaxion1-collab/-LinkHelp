-- =============================================================================
-- apply_fix_linkcredits_scale.sql
-- Fix: x1000 scale bug in grant_user_reward + ensure_helper_credit_wallet
-- Safe to re-run (idempotent).
-- =============================================================================
-- Root cause: grant_user_reward (migration 0015) used x1000 values:
--   SIGNUP_HELPER = 25000, FIRST_APPLICATION_SENT = 5000, etc.
--   These should be 25 and 5 respectively (direct LC amounts).
-- After this fix: all RPCs write CORRECT scale (25 LC → stored as 25, not 25000).
-- Existing wallets with x1000 values are normalized below.
-- =============================================================================

-- STEP 1: Fix grant_user_reward — correct LC amounts, NOT x1000
-- =============================================================================
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

  -- CORRECTED: all amounts in direct LC (no x1000 scale)
  v_amount := coalesce(p_amount, case p_reward_type
    when 'SIGNUP_CLIENT'          then 12
    when 'SIGNUP_HELPER'          then 25
    when 'PROFILE_PHOTO'          then 2
    when 'PROFILE_DESCRIPTION'    then 1
    when 'PROFILE_SKILLS'         then 2
    when 'PHONE_VERIFIED'         then 3
    when 'FIRST_REQUEST_CREATED'  then 5
    when 'FIRST_APPLICATION_SENT' then 5
    when 'FIRST_REVIEW_RECEIVED'  then 3
    when 'REFERRAL_COMPLETED'     then 10
    else null
  end);

  if v_amount is null or v_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
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

-- STEP 2: Fix ensure_helper_credit_wallet — grant 25 LC (not 25000)
-- =============================================================================
create or replace function public.ensure_helper_credit_wallet(p_helper_id uuid)
returns public.credit_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.credit_wallets;
  p public.profiles;
  grant_result jsonb;
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

  -- Only grant if SIGNUP_HELPER was never given
  if not exists (
    select 1 from public.user_bonus_rewards
    where user_id = p_helper_id and reward_type = 'SIGNUP_HELPER'
  ) then
    -- grant_user_reward now uses 25 LC (correct scale)
    grant_result := public.grant_user_reward(
      p_helper_id,
      'SIGNUP_HELPER',
      25,
      'Bônus de boas-vindas — helper'
    );
  end if;

  select * into w from public.credit_wallets where helper_id = p_helper_id;
  return w;
end;
$$;

-- STEP 3: Normalize existing x1000 values in the database
-- =============================================================================
-- The following normalizes all FREE_BONUS transactions that were stored
-- in x1000 scale (amount >= 1000) to correct LC values (divide by 1000).
-- APPLICATION_INTEREST and CREDIT_PURCHASE values are ALREADY in correct scale
-- and are NOT changed.
-- =============================================================================

-- 3a. Show preview before changes (diagnostic)
do $$
declare
  v_count int;
  v_sum bigint;
begin
  select count(*), coalesce(sum(amount), 0)
  into v_count, v_sum
  from public.credit_transactions
  where type = 'FREE_BONUS' and amount >= 1000;

  raise notice 'BEFORE normalization: % FREE_BONUS transactions with amount >= 1000 (total: % raw LC)',
    v_count, v_sum;
end;
$$;

-- 3b. Normalize credit_transactions.amount for FREE_BONUS (x1000 → correct)
update public.credit_transactions
set
  amount        = round(amount::numeric / 1000)::int,
  balance_after = case
    when balance_after >= 1000 then round(balance_after::numeric / 1000)::int
    else balance_after
  end,
  balance_before = case
    when balance_before is not null and balance_before >= 1000
    then round(balance_before::numeric / 1000)::int
    else balance_before
  end
where type = 'FREE_BONUS'
  and amount >= 1000;

-- 3c. Normalize user_bonus_rewards.amount for x1000 entries
update public.user_bonus_rewards
set amount = round(amount::numeric / 1000)::int
where amount >= 1000;

-- 3d. Recalculate credit_wallets from normalized transactions
-- This rebuilds balance, total_bonus, total_purchased, total_spent per helper.
with wallet_recalc as (
  select
    helper_id,
    coalesce(sum(case when type = 'FREE_BONUS'         and amount > 0 then amount else 0 end), 0) as new_total_bonus,
    coalesce(sum(case when type = 'CREDIT_PURCHASE'    and amount > 0 then amount else 0 end), 0) as new_total_purchased,
    coalesce(sum(case when amount < 0 then abs(amount) else 0 end), 0)                           as new_total_spent
  from public.credit_transactions
  group by helper_id
)
update public.credit_wallets cw
set
  balance          = wr.new_total_bonus + wr.new_total_purchased - wr.new_total_spent,
  total_bonus      = wr.new_total_bonus,
  total_purchased  = wr.new_total_purchased,
  total_spent      = wr.new_total_spent,
  updated_at       = now()
from wallet_recalc wr
where cw.helper_id = wr.helper_id;

-- STEP 4: Diagnostic — show final state
-- =============================================================================
do $$
declare
  v_count int;
begin
  select count(*)
  into v_count
  from public.credit_transactions
  where type = 'FREE_BONUS' and amount >= 1000;

  raise notice 'AFTER normalization: % FREE_BONUS transactions still have amount >= 1000 (should be 0)',
    v_count;
end;
$$;

-- STEP 5: Show wallet summary after fix
-- =============================================================================
select
  p.email,
  cw.balance          as balance_lc,
  cw.total_bonus      as bonus_lc,
  cw.total_purchased  as purchased_lc,
  cw.total_spent      as spent_lc,
  (select count(*) from public.credit_transactions ct where ct.helper_id = cw.helper_id) as tx_count
from public.credit_wallets cw
join public.profiles p on p.id = cw.helper_id
order by cw.balance desc
limit 20;

notify pgrst, 'reload schema';
