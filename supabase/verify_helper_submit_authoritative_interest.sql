-- verify_helper_submit_authoritative_interest.sql
-- Read-only audit after apply_helper_submit_authoritative_interest.sql

select 'helper_resolve_application_interest_lc defined' as check_name,
  to_regprocedure('public.helper_resolve_application_interest_lc(boolean)') is not null as ok;

select 'normal charge resolves to 4 LC' as check_name,
  public.helper_resolve_application_interest_lc(false) = 4 as ok;

select 'VIP charge resolves to 8 LC (4+4)' as check_name,
  public.helper_resolve_application_interest_lc(true) = 8 as ok;

select 'helper_submit_application body uses authoritative_charge' as check_name,
  (
    select pg_get_functiondef(p.oid) ~* 'authoritative_charge'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'helper_submit_application'
    limit 1
  ) as ok;

select 'helper_submit_application rejects mismatched p_interest_amount' as check_name,
  (
    select pg_get_functiondef(p.oid) ~* 'INTEREST_AMOUNT_MISMATCH'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'helper_submit_application'
    limit 1
  ) as ok;

select 'helper_submit_application no longer debits raw p_interest_amount only' as check_name,
  (
    select pg_get_functiondef(p.oid) !~ 'coalesce\(p_interest_amount, 1\)\s*\)\s*;'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'helper_submit_application'
    limit 1
  ) as ok;
