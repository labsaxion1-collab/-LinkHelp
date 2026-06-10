-- Run after apply_helper_exclusive_application_fix.sql

-- 1) applications columns (request_id is correct; job_id should NOT exist)
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'applications'
  and column_name in ('request_id', 'job_id', 'helper_id', 'client_id', 'is_exclusive', 'proposed_amount', 'message', 'status')
order by column_name;

-- Expect: request_id present, job_id absent, is_exclusive present

-- 2) requests.exclusive_helper_id for feed lock visibility
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'requests'
  and column_name = 'exclusive_helper_id';

-- 3) credit_transactions columns used by debit RPC
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'credit_transactions'
  and column_name in ('helper_id', 'related_opportunity_id', 'request_id', 'application_id', 'balance_before', 'balance_after', 'type', 'amount')
order by column_name;

-- Expect: related_opportunity_id AND request_id present after fix

-- 4) helper_submit_application signature (exactly ONE overload, 7 params)
select
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'helper_submit_application'
order by pg_get_function_arguments(p.oid);

-- Expect single row ending with "p_is_exclusive boolean DEFAULT false"

-- 5) request_has_exclusive_lock exists
select p.proname, pg_get_function_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'request_has_exclusive_lock';

-- 6) sync trigger on applications
select t.tgname, c.relname as table_name, p.proname as function_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'applications'
  and t.tgname = 'trg_sync_request_exclusive_helper'
  and not t.tgisinternal;

-- 7) helper_debit_application_interest exists
select p.proname, pg_get_function_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'helper_debit_application_interest';

-- 8) Grants
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in (
    'helper_submit_application',
    'helper_debit_application_interest',
    'request_has_exclusive_lock'
  )
order by routine_name, grantee;

-- 9) Sample exclusive lock rows (optional sanity)
select r.id, r.title, r.exclusive_helper_id, a.helper_id, a.is_exclusive, a.status
from public.requests r
left join public.applications a
  on a.request_id = r.id
  and a.is_exclusive = true
  and a.status in ('pending', 'viewed', 'accepted')
where r.exclusive_helper_id is not null
limit 10;

notify pgrst, 'reload schema';
