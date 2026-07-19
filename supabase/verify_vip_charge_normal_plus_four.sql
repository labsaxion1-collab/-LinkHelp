-- verify_vip_charge_normal_plus_four.sql
-- Read-only audit after apply_vip_charge_normal_plus_four.sql

select 'process_vip_application_rejected_refund defined' as check_name,
  to_regprocedure('public.process_vip_application_rejected_refund(uuid,uuid,uuid)') is not null as ok;

select 'VIP reject refund uses ceil(debit/2)' as check_name,
  (
    select pg_get_functiondef(p.oid) ~* 'ceil\(debit_amount'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'process_vip_application_rejected_refund'
  ) as ok;

select 'process_vip_exclusive_partial_refunds still refunds 2 LC' as check_name,
  (
    select pg_get_functiondef(p.oid) ~* 'refund_amount int := 2'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'process_vip_exclusive_partial_refunds'
  ) as ok;

-- Sample VIP reject refunds (optional — empty OK on fresh env)
select count(*)::int as vip_rejected_refund_tx_count
from public.credit_transactions
where type = 'VIP_APPLICATION_REJECTED_REFUND';

-- Duplicate VIP reject refunds (should be 0 rows)
select helper_id, application_id, count(*)::int as dup_count
from public.credit_transactions
where type = 'VIP_APPLICATION_REJECTED_REFUND'
  and application_id is not null
group by helper_id, application_id
having count(*) > 1;
