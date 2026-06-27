-- =============================================================================
-- verify_client_publish_request_debit.sql
-- Read-only audit after apply_client_publish_request_debit.sql
-- =============================================================================

-- 1) RPC exists
select 'client_publish_request defined' as check_name,
       exists (
         select 1
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname = 'client_publish_request'
       ) as ok;

select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'client_publish_request';

-- 2) client_credit_ledger.request_id column
select 'client_credit_ledger.request_id column' as check_name,
       exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'client_credit_ledger'
           and column_name = 'request_id'
       ) as ok;

-- 3) Idempotency unique index on REQUEST_PUBLISH
select 'client_credit_ledger_request_publish_uidx' as check_name,
       exists (
         select 1
         from pg_indexes
         where schemaname = 'public'
           and indexname = 'client_credit_ledger_request_publish_uidx'
       ) as ok;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname = 'client_credit_ledger_request_publish_uidx';

-- 4) RPC body checks
select 'client_publish_request raises INSUFFICIENT_CLIENT_CREDITS' as check_name,
       coalesce(
         (
           select pg_get_functiondef(p.oid) like '%INSUFFICIENT_CLIENT_CREDITS%'
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname = 'client_publish_request'
         ),
         false
       ) as ok;

select 'client_publish_request uses FOR UPDATE on profiles' as check_name,
       coalesce(
         (
           select pg_get_functiondef(p.oid) like '%for update%'
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname = 'client_publish_request'
         ),
         false
       ) as ok;

select 'client_publish_request inserts REQUEST_PUBLISH ledger' as check_name,
       coalesce(
         (
           select pg_get_functiondef(p.oid) like '%REQUEST_PUBLISH%'
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname = 'client_publish_request'
         ),
         false
       ) as ok;

select 'client_publish_request validates client role' as check_name,
       coalesce(
         (
           select pg_get_functiondef(p.oid) like '%CLIENT_ONLY%'
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname = 'client_publish_request'
         ),
         false
       ) as ok;

-- 5) Execute grant for authenticated
select 'grant execute to authenticated' as check_name,
       exists (
         select 1
         from information_schema.routine_privileges rp
         where rp.routine_schema = 'public'
           and rp.routine_name = 'client_publish_request'
           and rp.grantee = 'authenticated'
           and rp.privilege_type = 'EXECUTE'
       ) as ok;

-- 6) Recent REQUEST_PUBLISH ledger rows (sample)
select
  ccl.id,
  ccl.client_id,
  ccl.type,
  ccl.amount,
  ccl.balance_after,
  ccl.request_id,
  ccl.description,
  ccl.created_at
from public.client_credit_ledger ccl
where ccl.type = 'REQUEST_PUBLISH'
order by ccl.created_at desc
limit 10;
