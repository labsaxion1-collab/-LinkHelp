-- =============================================================================
-- verify_vip_partial_refund.sql
-- Read-only audit after apply_vip_partial_refund.sql
-- =============================================================================

-- 1) Core functions exist
select 'process_vip_exclusive_partial_refunds defined' as check_name,
       exists (
         select 1
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname = 'process_vip_exclusive_partial_refunds'
       ) as ok;

select 'helper_submit_application defined' as check_name,
       exists (
         select 1
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname = 'helper_submit_application'
       ) as ok;

select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'process_vip_exclusive_partial_refunds',
    'helper_submit_application'
  )
order by p.proname;

-- 2) helper_submit_application accepts p_is_exclusive (7-arg boolean signature)
select 'helper_submit_application has p_is_exclusive' as check_name,
       exists (
         select 1
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname = 'helper_submit_application'
           and pg_get_function_identity_arguments(p.oid) like '%boolean%'
       ) as ok;

-- 3) Type constraint includes VIP_EXCLUSIVE_PARTIAL_REFUND
select 'VIP_EXCLUSIVE_PARTIAL_REFUND in type check' as check_name,
       coalesce(
         (
           select pg_get_constraintdef(oid) like '%VIP_EXCLUSIVE_PARTIAL_REFUND%'
           from pg_constraint
           where conname = 'credit_transactions_type_check'
         ),
         false
       ) as ok;

select conname,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where conname = 'credit_transactions_type_check';

-- 4) Idempotency unique index
select 'credit_transactions_vip_partial_refund_uidx' as check_name,
       exists (
         select 1
         from pg_indexes
         where schemaname = 'public'
           and indexname = 'credit_transactions_vip_partial_refund_uidx'
       ) as ok;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname = 'credit_transactions_vip_partial_refund_uidx';

-- 5) helper_submit_application body contains refund hook
select 'helper_submit_application calls process_vip_exclusive_partial_refunds' as check_name,
       coalesce(
         (
           select pg_get_functiondef(p.oid) ~* 'process_vip_exclusive_partial_refunds'
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname = 'helper_submit_application'
           limit 1
         ),
         false
       ) as ok;

-- 6) VIP partial refund transactions (sample)
select
  ct.id,
  p.email as helper_email,
  ct.request_id,
  ct.application_id,
  ct.amount,
  ct.balance_before,
  ct.balance_after,
  ct.description,
  ct.metadata,
  ct.created_at
from public.credit_transactions ct
join public.profiles p on p.id = ct.helper_id
where ct.type = 'VIP_EXCLUSIVE_PARTIAL_REFUND'
order by ct.created_at desc
limit 20;

-- 7) Duplicate check — must return 0 rows
select
  helper_id,
  request_id,
  count(*)::int as tx_count
from public.credit_transactions
where type = 'VIP_EXCLUSIVE_PARTIAL_REFUND'
  and request_id is not null
group by helper_id, request_id
having count(*) > 1;

-- 8) Ledger vs wallet reconciliation for helpers with VIP partial refunds
select
  p.email,
  cw.balance as wallet_balance,
  coalesce(ledger.net_vip_refund, 0) as ledger_net_vip_refund,
  coalesce(ledger.vip_refund_count, 0) as vip_refund_tx_count
from public.credit_wallets cw
join public.profiles p on p.id = cw.helper_id
left join (
  select
    helper_id,
    sum(amount)::int as net_vip_refund,
    count(*)::int as vip_refund_count
  from public.credit_transactions
  where type = 'VIP_EXCLUSIVE_PARTIAL_REFUND'
  group by helper_id
) ledger on ledger.helper_id = cw.helper_id
where coalesce(ledger.vip_refund_count, 0) > 0
order by ledger.vip_refund_count desc
limit 20;

-- 9) Per-request wallet delta sanity (balance_after should equal balance_before + 2)
select
  ct.id,
  ct.helper_id,
  ct.request_id,
  ct.balance_before,
  ct.balance_after,
  ct.amount,
  (ct.balance_after = ct.balance_before + ct.amount) as balance_delta_ok
from public.credit_transactions ct
where ct.type = 'VIP_EXCLUSIVE_PARTIAL_REFUND'
order by ct.created_at desc
limit 20;

-- 10) Legacy literal scan on reward/application RPCs
select p.proname,
       case
         when pg_get_functiondef(p.oid) ~* '12000|17000|25000|5000|30000' then 'LEGACY_LITERAL_FOUND'
         else 'OK'
       end as legacy_scan
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'grant_user_reward',
    'ensure_client_signup_credits',
    'helper_submit_application',
    'process_vip_exclusive_partial_refunds'
  )
order by p.proname;

-- PASS CRITERIA:
--   sections 1–5: ok = true
--   section 7 (duplicates): 0 rows
--   section 9: balance_delta_ok = true for VIP partial refund rows
--   helper_submit_application args include boolean (p_is_exclusive)

-- 11) FORBIDDEN fix — process_vip must not call ensure_helper_credit_wallet for displaced helpers
select 'process_vip avoids ensure_helper_credit_wallet on displaced helpers' as check_name,
       coalesce(
         (
           select not (pg_get_functiondef(p.oid) ~* 'ensure_helper_credit_wallet\s*\(\s*norm\.helper_id\s*\)')
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'process_vip_exclusive_partial_refunds'
         ),
         false
       ) as ok;

-- 12) VIP bypasses normal 3-application cap
select 'helper_submit_application VIP bypasses 3-app limit' as check_name,
       coalesce(
         (
           select pg_get_functiondef(p.oid) ~* 'not coalesce\(p_is_exclusive'
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'helper_submit_application'
         ),
         false
       ) as ok;
