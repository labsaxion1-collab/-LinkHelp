-- LinkHelp — trigger inventory for candidatura flow tables (read-only)
-- Run in Supabase Dashboard → SQL Editor.

select
  cn.nspname as table_schema,
  c.relname as table_name,
  t.tgname as trigger_name,
  fn.nspname as function_schema,
  p.proname as function_name,
  format_type(p.prorettype, null) as return_type,
  pg_get_functiondef(p.oid) as full_function_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace fn on fn.oid = p.pronamespace
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname in (
    'applications',
    'credit_wallets',
    'credit_transactions',
    'user_bonus_rewards',
    'push_notification_queue',
    'notifications',
    'profiles'
  )
order by c.relname, t.tgname;
