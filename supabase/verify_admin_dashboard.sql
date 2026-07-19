-- Verify admin dashboard RPCs after apply_admin_dashboard_repair.sql

-- 1) Functions installed with service_role execute
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('admin_dashboard_summary', 'admin_dashboard_financial_summary');

-- 2) Summary returns expected columns (zeros OK after reset)
select
  total_requests >= 0 as total_requests_ok,
  open_requests >= 0 as open_requests_ok,
  jsonb_typeof(categories) = 'array' as categories_is_array
from public.admin_dashboard_summary()
limit 1;

-- 3) Financial summary returns expected columns for each range
select time_range, revenue_cad_cents, purchase_count, lc_sold, lc_consumed, lc_refunded, lc_granted, lc_in_circulation, net_credit_burn
from public.admin_dashboard_financial_summary('all')
union all
select time_range, revenue_cad_cents, purchase_count, lc_sold, lc_consumed, lc_refunded, lc_granted, lc_in_circulation, net_credit_burn
from public.admin_dashboard_financial_summary('today')
union all
select time_range, revenue_cad_cents, purchase_count, lc_sold, lc_consumed, lc_refunded, lc_granted, lc_in_circulation, net_credit_burn
from public.admin_dashboard_financial_summary('7d')
union all
select time_range, revenue_cad_cents, purchase_count, lc_sold, lc_consumed, lc_refunded, lc_granted, lc_in_circulation, net_credit_burn
from public.admin_dashboard_financial_summary('30d');

-- 4) Revenue excludes non-paid payment_events (spot check)
select
  (select coalesce(sum(amount_cents), 0) from public.payment_events where status = 'paid') as paid_cents_direct,
  (select revenue_cad_cents from public.admin_dashboard_financial_summary('all')) as rpc_revenue_all;

-- PASS if both match; FAIL if RPC missing or sums diverge unexpectedly.
