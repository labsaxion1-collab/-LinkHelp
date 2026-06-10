-- Run after apply_dispatch_push_trigger_return_fix.sql

-- 1) EXCEPTION block must return NEW
select
  n.nspname as function_schema,
  p.proname as function_name,
  case
    when p.prosrc ~* 'exception\s+when\s+others\s+then\s+return\s+new'
      then 'OK — EXCEPTION returns NEW'
    when p.prosrc ~* 'exception\s+when\s+others\s+then\s+null'
      then 'STILL_BROKEN — EXCEPTION has NULL without RETURN'
    else 'CHECK_MANUALLY — no EXCEPTION WHEN OTHERS pattern found'
  end as exception_return_check
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private'
  and p.proname = 'trg_dispatch_push_from_queue';

-- 2) Trigger still bound to push_notification_queue
select
  t.tgname as trigger_name,
  fn.nspname || '.' || p.proname as trigger_function,
  pg_get_triggerdef(t.oid, true) as trigger_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace fn on fn.oid = p.pronamespace
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname = 'push_notification_queue'
  and fn.nspname = 'private'
  and p.proname = 'trg_dispatch_push_from_queue';

-- Expected: dispatch_push_from_queue → private.trg_dispatch_push_from_queue

-- 3) Full function body (confirm EXCEPTION block)
select pg_get_functiondef('private.trg_dispatch_push_from_queue()'::regprocedure);

notify pgrst, 'reload schema';
