-- =============================================================================
-- verify_no_legacy_linkcredits.sql
-- Read-only audit: confirm LinkCredits are stored as REAL values (25 = 25 LC).
-- Run in Supabase SQL Editor after apply_fix_linkcredits_scale.sql.
-- Expected: all suspect counts = 0.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Summary counts (suspect = exact ×1000 legacy OR any wallet balance >= 1000)
-- ---------------------------------------------------------------------------
select 'credit_wallets.balance >= 1000' as check_name,
       count(*)::int as suspect_count
from public.credit_wallets
where balance >= 1000;

select 'credit_wallets exact x1000 multiples (balance >= 1000 AND balance % 1000 = 0)' as check_name,
       count(*)::int as suspect_count
from public.credit_wallets
where balance >= 1000 and balance % 1000 = 0;

select 'credit_wallets.total_purchased >= 1000' as check_name,
       count(*)::int as suspect_count
from public.credit_wallets
where total_purchased >= 1000;

select 'credit_wallets.total_bonus >= 1000' as check_name,
       count(*)::int as suspect_count
from public.credit_wallets
where total_bonus >= 1000;

select 'credit_transactions.amount exact x1000 (abs >= 1000 AND abs % 1000 = 0)' as check_name,
       count(*)::int as suspect_count
from public.credit_transactions
where abs(amount) >= 1000 and abs(amount) % 1000 = 0;

select 'credit_transactions.balance_after >= 1000' as check_name,
       count(*)::int as suspect_count
from public.credit_transactions
where balance_after >= 1000;

select 'credit_transactions.balance_before >= 1000' as check_name,
       count(*)::int as suspect_count
from public.credit_transactions
where balance_before is not null and balance_before >= 1000;

select 'user_bonus_rewards.amount >= 1000' as check_name,
       count(*)::int as suspect_count
from public.user_bonus_rewards
where amount >= 1000;

select 'user_bonus_rewards exact x1000 multiples' as check_name,
       count(*)::int as suspect_count
from public.user_bonus_rewards
where amount >= 1000 and amount % 1000 = 0;

select 'profiles client credits >= 1000' as check_name,
       count(*)::int as suspect_count
from public.profiles
where role = 'client' and credits >= 1000;

select 'profiles client exact x1000 multiples' as check_name,
       count(*)::int as suspect_count
from public.profiles
where role = 'client' and credits >= 1000 and credits % 1000 = 0;

-- ---------------------------------------------------------------------------
-- 2) Sample rows (only if suspects exist — should return 0 rows in healthy prod)
-- ---------------------------------------------------------------------------
select 'wallet samples' as section, cw.helper_id, p.email, cw.balance, cw.total_bonus, cw.total_purchased, cw.total_spent
from public.credit_wallets cw
join public.profiles p on p.id = cw.helper_id
where cw.balance >= 1000 or (cw.balance >= 1000 and cw.balance % 1000 = 0)
order by cw.balance desc
limit 20;

select 'transaction samples' as section, ct.id, ct.helper_id, ct.type, ct.amount, ct.balance_before, ct.balance_after, ct.description
from public.credit_transactions ct
where abs(ct.amount) >= 1000 and abs(ct.amount) % 1000 = 0
   or ct.balance_after >= 1000
   or (ct.balance_before is not null and ct.balance_before >= 1000)
order by ct.created_at desc
limit 20;

select 'bonus reward samples' as section, ubr.user_id, p.email, ubr.reward_type, ubr.amount, ubr.created_at
from public.user_bonus_rewards ubr
join public.profiles p on p.id = ubr.user_id
where ubr.amount >= 1000
order by ubr.created_at desc
limit 20;

select 'client profile credit samples' as section, p.email, p.role, p.credits, p.updated_at
from public.profiles p
where p.role = 'client'
  and (p.credits >= 1000 or (p.credits >= 1000 and p.credits % 1000 = 0))
order by p.credits desc
limit 20;

-- ---------------------------------------------------------------------------
-- 3) RPC source scan — legacy literals should NOT appear in active functions
-- ---------------------------------------------------------------------------
select p.proname as function_name,
       case
         when pg_get_functiondef(p.oid) ~* '25000|12000|35000|80000|17000|30000|\* 1000|/ 1000' then 'LEGACY_LITERAL_FOUND'
         else 'OK'
       end as legacy_scan
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'grant_user_reward',
    'ensure_helper_credit_wallet',
    'reconcile_helper_signup_bonus',
    'confirm_stripe_linkcredit_purchase',
    'helper_debit_application_interest',
    'helper_debit_application_selected',
    'process_expired_unlock_refunds',
    'add_credits',
    'ensure_client_signup_credits'
  )
order by p.proname;

-- ---------------------------------------------------------------------------
-- 4) Healthy wallet snapshot (real-scale sanity check)
-- ---------------------------------------------------------------------------
select p.email,
       cw.balance,
       cw.total_bonus,
       cw.total_purchased,
       cw.total_spent,
       cw.updated_at
from public.credit_wallets cw
join public.profiles p on p.id = cw.helper_id
order by cw.updated_at desc
limit 10;

-- ---------------------------------------------------------------------------
-- PASS CRITERIA:
--   Section 1 suspect_count rows should be 0 (including profiles.client credits).
--   Section 2 sample queries should return no rows.
--   Section 3 legacy_scan should be 'OK' for all listed functions.
-- If not, re-run apply_fix_linkcredits_scale.sql (data) and verify RPC bodies in prod.
-- =============================================================================
