-- Run after apply_trigger_return_fix.sql
-- Lists triggers on candidatura-related tables and flags functions missing RETURN.

-- 1) All non-internal triggers on target tables
select
  c.relname as table_name,
  t.tgname as trigger_name,
  case t.tgtype::integer & 66
    when 2 then 'BEFORE'
    when 64 then 'INSTEAD OF'
    else 'AFTER'
  end as timing,
  case t.tgtype::integer & 28
    when 4 then 'INSERT'
    when 8 then 'DELETE'
    when 16 then 'UPDATE'
    else 'MIXED'
  end as event,
  n.nspname || '.' || p.proname as trigger_function
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where cn.nspname = 'public'
  and c.relname in (
    'applications',
    'credit_transactions',
    'notifications',
    'credit_wallets'
  )
  and not t.tgisinternal
order by c.relname, t.tgname;

-- Expected on applications:
--   applications_first_reward      → public.linkhelp_grant_first_application_reward
--   applications_set_updated_at    → public.set_updated_at
--   push_on_application_inserted   → private.trg_push_on_application_inserted
--   push_on_application_accepted   → private.trg_push_on_application_accepted
--   trg_applications_lead_quality  → public.trg_application_lead_quality
-- Expected on credit_wallets:
--   credit_wallets_set_updated_at  → public.set_updated_at
-- Expected on credit_transactions / notifications: (none)

-- 2) RETURN check — should return zero rows with status MISSING_RETURN
select
  c.relname as table_name,
  t.tgname as trigger_name,
  n.nspname || '.' || p.proname as trigger_function,
  case
    when p.prosrc ~* 'return\s+(new|old|null)' then 'OK'
    else 'MISSING_RETURN'
  end as return_status
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where cn.nspname = 'public'
  and c.relname in (
    'applications',
    'credit_transactions',
    'notifications',
    'credit_wallets'
  )
  and not t.tgisinternal
order by return_status desc, c.relname, t.tgname;

-- 3) Confirm candidatura push trigger function body ends with RETURN NEW
select
  p.proname as function_name,
  n.nspname as schema_name,
  right(trim(p.prosrc), 80) as function_tail
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (
  ('private', 'trg_push_on_application_inserted'),
  ('private', 'trg_push_on_application_accepted'),
  ('public', 'linkhelp_grant_first_application_reward'),
  ('public', 'trg_application_lead_quality'),
  ('public', 'set_updated_at')
)
order by n.nspname, p.proname;

notify pgrst, 'reload schema';
