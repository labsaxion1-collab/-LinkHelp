-- READ-ONLY audit: compare production admin dashboard RPCs with repository expectations.
-- Do NOT mutate data. Run in Supabase SQL editor against production.

-- 1) Function presence and signatures
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.provolatile as volatility,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('admin_dashboard_summary', 'admin_dashboard_financial_summary')
order by p.proname;

-- 2) Full definitions (compare with supabase/migrations/0051 and apply_admin_dashboard_repair.sql)
select pg_get_functiondef(p.oid) as definition
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'admin_dashboard_summary';

select pg_get_functiondef(p.oid) as definition
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'admin_dashboard_financial_summary';

-- 3) Source tables exist
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'requests',
    'applications',
    'payment_events',
    'credit_transactions',
    'credit_wallets'
  )
order by table_name;

-- 4) Smoke call (aggregate only — no PII)
select * from public.admin_dashboard_summary() limit 1;

-- 5) Financial smoke call (all time)
select * from public.admin_dashboard_financial_summary('all'::text) limit 1;

-- 6) Payment event status distribution (revenue source audit)
select status, count(*) as row_count, coalesce(sum(amount_cents), 0) as amount_cents_sum
from public.payment_events
group by status
order by status;

-- 7) Credit transaction type distribution
select type, count(*) as row_count, sum(amount) as amount_sum
from public.credit_transactions
group by type
order by type;
