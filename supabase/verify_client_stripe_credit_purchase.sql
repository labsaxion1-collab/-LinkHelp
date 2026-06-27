-- =============================================================================
-- verify_client_stripe_credit_purchase.sql
-- Read-only audit after apply_client_stripe_credit_purchase.sql
-- =============================================================================

select 'confirm_client_stripe_linkcredit_purchase defined' as check_name,
       exists (
         select 1
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname = 'confirm_client_stripe_linkcredit_purchase'
       ) as ok;

select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'confirm_client_stripe_linkcredit_purchase';

select 'client_credit_ledger_stripe_session_uidx' as check_name,
       exists (
         select 1
         from pg_indexes
         where schemaname = 'public'
           and indexname = 'client_credit_ledger_stripe_session_uidx'
       ) as ok;

select 'RPC inserts CREDIT_PURCHASE into client_credit_ledger' as check_name,
       coalesce(
         (
           select pg_get_functiondef(p.oid) like '%CREDIT_PURCHASE%'
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname = 'confirm_client_stripe_linkcredit_purchase'
         ),
         false
       ) as ok;

select 'RPC updates profiles.credits' as check_name,
       coalesce(
         (
           select pg_get_functiondef(p.oid) like '%profiles%'
             and pg_get_functiondef(p.oid) like '%credits%'
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname = 'confirm_client_stripe_linkcredit_purchase'
         ),
         false
       ) as ok;

select 'grant execute to service_role' as check_name,
       exists (
         select 1
         from information_schema.routine_privileges rp
         where rp.routine_schema = 'public'
           and rp.routine_name = 'confirm_client_stripe_linkcredit_purchase'
           and rp.grantee = 'service_role'
           and rp.privilege_type = 'EXECUTE'
       ) as ok;

select
  ccl.id,
  ccl.client_id,
  ccl.type,
  ccl.amount,
  ccl.balance_after,
  ccl.description,
  ccl.metadata->>'stripe_session_id' as stripe_session_id,
  ccl.created_at
from public.client_credit_ledger ccl
where ccl.type = 'CREDIT_PURCHASE'
order by ccl.created_at desc
limit 10;
