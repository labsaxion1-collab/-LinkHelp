-- =============================================================================
-- verify_client_profile_credits.sql
-- Read-only audit for client LinkCredits stored in profiles.credits.
-- Run after apply_normalize_client_profile_credits.sql.
-- Expected: suspect_count = 0 for legacy ×1000 rows.
-- =============================================================================

-- 1) Legacy ×1000 suspects (exact multiples >= 1000)
select 'profiles client credits >= 1000' as check_name,
       count(*)::int as suspect_count
from public.profiles
where role = 'client'
  and credits >= 1000;

select 'profiles client exact x1000 multiples' as check_name,
       count(*)::int as suspect_count
from public.profiles
where role = 'client'
  and credits >= 1000
  and credits % 1000 = 0;

-- 2) All clients with positive balance (real scale sanity)
select 'client profiles with credits > 0' as section,
       email,
       role,
       credits,
       updated_at
from public.profiles
where role = 'client'
  and credits > 0
order by credits desc;

-- 3) Client-owned bonus rewards still at legacy scale
select 'client user_bonus_rewards amount >= 1000' as check_name,
       count(*)::int as suspect_count
from public.user_bonus_rewards ubr
join public.profiles p on p.id = ubr.user_id
where p.role = 'client'
  and ubr.amount >= 1000;

-- 4) RPC scan — must not contain legacy literals
select p.proname as function_name,
       case
         when pg_get_functiondef(p.oid) ~* '12000|17000|25000|5000|30000' then 'LEGACY_LITERAL_FOUND'
         else 'OK'
       end as legacy_literal_scan,
       case
         when pg_get_functiondef(p.oid) ~* 'SIGNUP_CLIENT.*then\s+0' then 'SIGNUP_CLIENT_ZERO'
         when p.proname = 'grant_user_reward' then 'CHECK_SIGNUP_CLIENT'
         else 'N/A'
       end as signup_client_check
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'grant_user_reward',
    'ensure_client_signup_credits',
    'linkhelp_profiles_signup_credits',
    'linkhelp_handle_new_user',
    'linkhelp_grant_first_request_reward'
  )
order by p.proname;

-- 5) Backup table present (informational)
select 'backup table row count' as check_name,
       count(*)::int as backup_count
from public._profile_credits_backup_before_normalize;

-- PASS CRITERIA:
--   suspect_count for legacy profiles = 0
--   legacy_literal_scan = OK for ensure_client_signup_credits and grant_user_reward
--   Expected normalized rows: sousaleomoraiscanada@gmail.com = 17, vyelyas@gmail.com = 12
