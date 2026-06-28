-- Run after apply_client_reject_vip_application.sql (read-only audit)

-- 1) RPCs exist
select
  'client_reject_application defined' as check_name,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'client_reject_application'
  ) as ok;

select
  'process_vip_application_rejected_refund defined' as check_name,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'process_vip_application_rejected_refund'
  ) as ok;

-- 2) Type constraint includes VIP_APPLICATION_REJECTED_REFUND
select
  'VIP_APPLICATION_REJECTED_REFUND in type check' as check_name,
  exists (
    select 1
    from pg_constraint
    where conname = 'credit_transactions_type_check'
      and pg_get_constraintdef(oid) like '%VIP_APPLICATION_REJECTED_REFUND%'
  ) as ok;

-- 3) Idempotency unique index
select
  'credit_transactions_vip_rejected_refund_uidx exists' as check_name,
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'credit_transactions_vip_rejected_refund_uidx'
  ) as ok;

-- 4) Sync trigger still present (fallback layer)
select
  'trg_sync_request_exclusive_helper exists' as check_name,
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'applications'
      and t.tgname = 'trg_sync_request_exclusive_helper'
      and not t.tgisinternal
  ) as ok;

-- 5) Stale exclusive locks (should be 0 after fixes + resync)
select
  r.id as request_id,
  r.title,
  r.status as request_status,
  r.exclusive_helper_id,
  a.helper_id,
  a.is_exclusive,
  a.status as application_status
from public.requests r
join public.applications a
  on a.request_id = r.id
 and a.helper_id = r.exclusive_helper_id
where r.exclusive_helper_id is not null
  and (
    a.status = 'rejected'
    or coalesce(a.is_exclusive, false) = false
    or a.status not in ('pending', 'viewed', 'accepted')
  );

-- 6) VIP reject refunds audit (optional)
select
  ct.helper_id,
  ct.application_id,
  ct.request_id,
  ct.amount as refund_lc,
  ct.metadata->>'original_debit_lc' as original_debit_lc,
  ct.metadata->>'refund_percent' as refund_percent,
  ct.created_at
from public.credit_transactions ct
where ct.type = 'VIP_APPLICATION_REJECTED_REFUND'
order by ct.created_at desc
limit 20;

-- 7) Duplicate VIP reject refunds (should return 0 rows)
select
  helper_id,
  application_id,
  count(*) as refund_count
from public.credit_transactions
where type = 'VIP_APPLICATION_REJECTED_REFUND'
  and application_id is not null
group by helper_id, application_id
having count(*) > 1;

-- 8) VIP reject notifications (optional audit)
select
  n.user_id,
  n.title,
  n.description,
  n.action_url,
  n.created_at
from public.notifications n
where n.title = 'Candidatura VIP recusada'
order by n.created_at desc
limit 20;
