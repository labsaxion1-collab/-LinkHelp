-- Verify apply_lead_quality_score_fix.sql

-- 1) Column exists
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'requests'
  and column_name = 'lead_quality_score';

-- Expect: 1 row, data_type = numeric, column_default = 0

-- 2) Functions exist
select p.proname, pg_get_function_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'compute_request_lead_quality',
    'refresh_request_lead_quality',
    'trg_refresh_request_lead_quality',
    'trg_application_lead_quality'
  )
order by p.proname;

-- Expect: 4 rows

-- 3) Triggers exist
select t.tgname, c.relname as table_name, p.proname as fn
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and t.tgname in (
    'trg_request_market_signals_lead_quality',
    'trg_applications_lead_quality'
  )
  and not t.tgisinternal;

-- Expect: 2 rows

-- 4) Sample scores (sanity)
select id, title, lead_quality_score
from public.requests
order by created_at desc
limit 5;
