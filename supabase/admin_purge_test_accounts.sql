-- ============================================================
-- ADMIN: Purge test accounts and all associated data
-- ============================================================
-- PURPOSE: Safely remove test/development accounts and all data they created.
-- SAFETY:
--   - NEVER runs automatically. You must explicitly provide target emails/user_ids.
--   - STEP 1 (PREVIEW) shows you exactly what will be deleted before any DELETEs run.
--   - STEP 2 (DELETE) is commented out by default. Uncomment carefully.
--   - Run in Supabase SQL Editor (Primary Database, Role: postgres).
--   - auth.users deletion requires Supabase Auth Admin API (see note at bottom).
-- ============================================================

-- ============================================================
-- CONFIGURE: Set the target accounts here (email OR user_id)
-- ============================================================

-- Option A: by email
do $$ begin
  -- Edit this array with the emails to purge:
  -- example: ARRAY['test1@example.com', 'test2@example.com']
  raise notice 'Target emails: configure TEST_EMAILS below before running';
end $$;

-- Option B: by user_id (UUID)
-- example: ARRAY['uuid1-...', 'uuid2-...']

-- Use a temp table so STEP 1 and STEP 2 share the same target IDs
drop table if exists _purge_targets;
create temp table _purge_targets (user_id uuid);

-- ============================================================
-- INSERT YOUR TARGETS HERE (choose one or both options)
-- ============================================================

-- By email (comment out if not using):
/*
insert into _purge_targets (user_id)
select id from auth.users
where email = any(ARRAY[
  'test1@example.com',
  'test2@example.com'
]);
*/

-- By user_id (comment out if not using):
/*
insert into _purge_targets (user_id)
values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');
*/

-- ============================================================
-- STEP 1 — PREVIEW (safe, read-only)
-- Run this first to confirm what will be deleted.
-- ============================================================

select 'profiles' as "table", count(*) as "rows_to_delete"
from public.profiles where id in (select user_id from _purge_targets)
union all
select 'requests', count(*) from public.requests where client_id in (select user_id from _purge_targets)
union all
select 'applications', count(*) from public.applications
  where helper_id in (select user_id from _purge_targets)
     or client_id in (select user_id from _purge_targets)
union all
select 'conversations', count(*) from public.conversations
  where client_id in (select user_id from _purge_targets)
     or helper_id in (select user_id from _purge_targets)
union all
select 'messages', count(*) from public.messages
  where sender_id in (select user_id from _purge_targets)
union all
select 'notifications', count(*) from public.notifications where user_id in (select user_id from _purge_targets)
union all
select 'upcoming_jobs', count(*) from public.upcoming_jobs
  where client_id in (select user_id from _purge_targets)
     or helper_id in (select user_id from _purge_targets)
union all
select 'credit_wallets', count(*) from public.credit_wallets where user_id in (select user_id from _purge_targets)
union all
select 'credit_transactions', count(*) from public.credit_transactions where user_id in (select user_id from _purge_targets)
union all
select 'reviews', count(*) from public.reviews
  where reviewer_id in (select user_id from _purge_targets)
     or reviewee_id in (select user_id from _purge_targets)
order by 1;

-- ============================================================
-- STEP 2 — DELETE (UNCOMMENT CAREFULLY — IRREVERSIBLE)
-- Only run after reviewing STEP 1 output above.
-- Run as a single transaction for safety.
-- ============================================================

/*
begin;

-- messages → conversations
delete from public.messages
  where conversation_id in (
    select id from public.conversations
    where client_id in (select user_id from _purge_targets)
       or helper_id in (select user_id from _purge_targets)
  );

-- conversations
delete from public.conversations
  where client_id in (select user_id from _purge_targets)
     or helper_id in (select user_id from _purge_targets);

-- applications
delete from public.applications
  where helper_id in (select user_id from _purge_targets)
     or client_id in (select user_id from _purge_targets);

-- upcoming_jobs
delete from public.upcoming_jobs
  where client_id in (select user_id from _purge_targets)
     or helper_id in (select user_id from _purge_targets);

-- reviews
delete from public.reviews
  where reviewer_id in (select user_id from _purge_targets)
     or reviewee_id in (select user_id from _purge_targets);

-- requests
delete from public.requests
  where client_id in (select user_id from _purge_targets);

-- notifications
delete from public.notifications
  where user_id in (select user_id from _purge_targets);

-- credit_transactions
delete from public.credit_transactions
  where user_id in (select user_id from _purge_targets);

-- credit_wallets
delete from public.credit_wallets
  where user_id in (select user_id from _purge_targets);

-- push subscriptions (if table exists)
delete from public.push_subscriptions
  where user_id in (select user_id from _purge_targets);

-- profiles
delete from public.profiles
  where id in (select user_id from _purge_targets);

-- Confirm before committing:
select 'Preview after delete — should all be 0:' as status;
select 'profiles', count(*) from public.profiles where id in (select user_id from _purge_targets)
union all select 'requests', count(*) from public.requests where client_id in (select user_id from _purge_targets);

-- commit;   ← uncomment and run this line LAST, after confirming counts above are 0

-- rollback; ← use this instead of commit if you want to abort

end;
*/

-- ============================================================
-- NOTE: auth.users deletion
-- ============================================================
-- To delete auth.users rows (required for the user to be fully gone):
-- Use the Supabase Dashboard: Authentication > Users > Delete
-- OR use the Supabase Admin API:
--   await supabaseAdmin.auth.admin.deleteUser(userId)
-- You CANNOT delete from auth.users via SQL in the Supabase SQL editor
-- because auth schema has restricted permissions.
-- ============================================================

drop table if exists _purge_targets;
