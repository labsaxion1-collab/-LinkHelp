-- =============================================================================
-- verify_client_welcome_30_onboarding.sql
-- Read-only checks after apply_client_welcome_30_onboarding.sql
-- =============================================================================

-- 1) Column exists
select 'profiles.client_onboarding_completed_at column' as check_name,
       exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'profiles'
           and column_name = 'client_onboarding_completed_at'
       ) as ok;

-- 2) Tables exist
select 'client_credit_ledger table' as check_name,
       to_regclass('public.client_credit_ledger') is not null as ok;

select 'client_onboarding_signals table' as check_name,
       to_regclass('public.client_onboarding_signals') is not null as ok;

-- 3) RPC exists
select 'complete_client_onboarding function' as check_name,
       exists (
         select 1
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname = 'complete_client_onboarding'
       ) as ok;

-- 4) CLIENT_WELCOME_30 in reward allow-list
select 'is_valid_reward_type CLIENT_WELCOME_30' as check_name,
       public.is_valid_reward_type('CLIENT_WELCOME_30') as ok;

-- 5) SIGNUP_CLIENT and FIRST_REQUEST_CREATED remain zero in grant_user_reward
select p.proname as function_name,
       case
         when pg_get_functiondef(p.oid) ~* 'SIGNUP_CLIENT.*then\s+0' then 'SIGNUP_CLIENT_ZERO'
         else 'CHECK_SIGNUP_CLIENT'
       end as signup_client_check,
       case
         when pg_get_functiondef(p.oid) ~* 'FIRST_REQUEST_CREATED.*then\s+0' then 'FIRST_REQUEST_ZERO'
         else 'CHECK_FIRST_REQUEST'
       end as first_request_check,
       case
         when pg_get_functiondef(p.oid) ~* 'CLIENT_WELCOME_30.*then\s+30' then 'CLIENT_WELCOME_30_AMOUNT_30'
         else 'CHECK_CLIENT_WELCOME_30'
       end as welcome_30_check,
       case
         when pg_get_functiondef(p.oid) ~* 'USE_COMPLETE_CLIENT_ONBOARDING' then 'CLIENT_WELCOME_VIA_RPC_ONLY'
         else 'CHECK_RPC_GUARD'
       end as rpc_guard_check
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'grant_user_reward';

-- 6) Idempotency helpers (informational counts)
select 'clients pending onboarding (completed_at null)' as metric,
       count(*)::int as value
from public.profiles
where role = 'client'
  and client_onboarding_completed_at is null;

select 'CLIENT_WELCOME_30 rewards granted' as metric,
       count(*)::int as value
from public.user_bonus_rewards
where reward_type = 'CLIENT_WELCOME_30';

select 'client_credit_ledger FREE_BONUS rows' as metric,
       count(*)::int as value
from public.client_credit_ledger
where type = 'FREE_BONUS'
  and reward_type = 'CLIENT_WELCOME_30';

-- PASS CRITERIA:
--   all ok = true
--   signup_client_check = SIGNUP_CLIENT_ZERO
--   first_request_check = FIRST_REQUEST_ZERO
--   welcome_30_check = CLIENT_WELCOME_30_AMOUNT_30
--   rpc_guard_check = CLIENT_WELCOME_VIA_RPC_ONLY
