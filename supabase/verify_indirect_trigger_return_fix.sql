-- Run after apply_indirect_trigger_return_fix.sql

-- 1) push_notification_queue should have ZERO SQL triggers (0040 = Dashboard webhook)
select
  c.relname as table_name,
  t.tgname as trigger_name,
  fn.nspname || '.' || p.proname as trigger_function
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace fn on fn.oid = p.pronamespace
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname = 'push_notification_queue';
-- Expected: 0 rows

-- 2) Indirect cascade tables — no MISSING_RETURN
select
  c.relname as table_name,
  t.tgname as trigger_name,
  fn.nspname || '.' || p.proname as trigger_function,
  case
    when rt.typname <> 'trigger' then 'WRONG_TYPE'
    when not (p.prosrc ~* '\mreturn\s+(new|old|null)\M') then 'MISSING_RETURN'
    else 'OK'
  end as status
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace fn on fn.oid = p.pronamespace
join pg_type rt on rt.oid = p.prorettype
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname in (
    'push_notification_queue',
    'push_subscriptions',
    'notifications',
    'user_bonus_rewards',
    'credit_wallets'
  )
order by status desc, c.relname, t.tgname;
-- Expected: all OK (or only credit_wallets_set_updated_at OK)

-- 3) Direct applications triggers still OK
select
  t.tgname,
  fn.nspname || '.' || p.proname as trigger_function,
  case
    when p.prosrc ~* '\mreturn\s+(new|old|null)\M' then 'OK'
    else 'MISSING_RETURN'
  end as status
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace fn on fn.oid = p.pronamespace
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname = 'applications'
  and t.tgname in ('applications_first_reward', 'push_on_application_inserted');

notify pgrst, 'reload schema';
