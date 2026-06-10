-- Run after apply_helper_exclusive_application_fix.sql

-- 1) applications columns (request_id is correct; job_id should NOT exist)
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'applications'
  and column_name in ('request_id', 'job_id', 'helper_id', 'client_id', 'is_exclusive', 'proposed_amount', 'message', 'status')
order by column_name;

-- Expect: request_id present, job_id absent

-- 2) credit_transactions columns used by debit RPC
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'credit_transactions'
  and column_name in ('helper_id', 'related_opportunity_id', 'request_id', 'application_id', 'balance_before', 'balance_after', 'type', 'amount')
order by column_name;

-- Expect: related_opportunity_id AND request_id present after fix

-- 3) helper_submit_application signature (exactly ONE overload, 7 params)
select
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'helper_submit_application'
order by pg_get_function_arguments(p.oid);

-- 4) helper_debit_application_interest exists
select p.proname, pg_get_function_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'helper_debit_application_interest';

-- 5) Grants
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('helper_submit_application', 'helper_debit_application_interest')
order by routine_name, grantee;

notify pgrst, 'reload schema';
