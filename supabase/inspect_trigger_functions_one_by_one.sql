-- LinkHelp — inspect trigger function bodies one at a time (read-only)
-- Run each SELECT separately in Supabase SQL Editor to avoid truncated output.

-- ---------------------------------------------------------------------------
-- 1) applications_first_reward
-- ---------------------------------------------------------------------------
select pg_get_functiondef('public.linkhelp_grant_first_application_reward()'::regprocedure);

-- ---------------------------------------------------------------------------
-- 2) profiles_ensure_helper_wallet
-- ---------------------------------------------------------------------------
select pg_get_functiondef('public.linkhelp_profiles_ensure_helper_wallet()'::regprocedure);

-- ---------------------------------------------------------------------------
-- 3) profiles_signup_credits
-- ---------------------------------------------------------------------------
select pg_get_functiondef('public.linkhelp_profiles_signup_credits()'::regprocedure);

-- ---------------------------------------------------------------------------
-- 4) push_on_application_inserted
-- ---------------------------------------------------------------------------
select pg_get_functiondef('private.trg_push_on_application_inserted()'::regprocedure);

-- ---------------------------------------------------------------------------
-- 5) push_on_application_accepted
-- ---------------------------------------------------------------------------
select pg_get_functiondef('private.trg_push_on_application_accepted()'::regprocedure);

-- ---------------------------------------------------------------------------
-- 6) trg_applications_lead_quality
-- ---------------------------------------------------------------------------
select pg_get_functiondef('public.trg_application_lead_quality()'::regprocedure);

-- ---------------------------------------------------------------------------
-- 7) set_updated_at (credit_wallets + applications)
-- ---------------------------------------------------------------------------
select pg_get_functiondef('public.set_updated_at()'::regprocedure);
