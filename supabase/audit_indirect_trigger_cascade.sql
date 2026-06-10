-- =============================================================================
-- LinkHelp — indirect trigger audit (candidatura cascade)
-- Run in Supabase Dashboard → SQL Editor (Production).
-- Read-only. No fixes.
--
-- Context: applications_first_reward and push_on_application_inserted are OK,
-- but helper_submit_application still fails with:
--   "control reached end of trigger procedure without RETURN"
--
-- Suspect chain:
--   INSERT applications
--     → applications_first_reward → grant_user_reward
--         → INSERT user_bonus_rewards
--         → UPDATE credit_wallets (add_credits)
--     → push_on_application_inserted → enqueue_push
--         → INSERT push_notification_queue  ← prime suspect
--   INSERT notifications (end of RPC, after triggers)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Entry points — confirm chain functions in DB
-- ---------------------------------------------------------------------------
select
  n.nspname || '.' || p.proname as function_name,
  format_type(p.prorettype, null) as return_type,
  l.lanname as language,
  pg_get_functiondef(p.oid) as full_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where (n.nspname, p.proname) in (
  ('private', 'trg_push_on_application_inserted'),
  ('private', 'enqueue_push'),
  ('public', 'linkhelp_grant_first_application_reward'),
  ('public', 'grant_user_reward'),
  ('public', 'add_credits'),
  ('public', 'set_updated_at')
)
order by n.nspname, p.proname;

-- ---------------------------------------------------------------------------
-- 1) ALL triggers on the 5 target tables (any schema)
-- ---------------------------------------------------------------------------
select
  cn.nspname as table_schema,
  c.relname as table_name,
  t.tgname as trigger_name,
  case
    when t.tgtype::integer & 2 = 2 then 'BEFORE'
    when t.tgtype::integer & 64 = 64 then 'INSTEAD OF'
    else 'AFTER'
  end as timing,
  trim(both ', ' from concat_ws(
    ', ',
    case when t.tgtype::integer & 4 = 4 then 'INSERT' end,
    case when t.tgtype::integer & 8 = 8 then 'DELETE' end,
    case when t.tgtype::integer & 16 = 16 then 'UPDATE' end
  )) as events,
  fn.nspname || '.' || p.proname as trigger_function,
  format_type(p.prorettype, null) as function_return_type,
  l.lanname as function_language,
  t.tgenabled as enabled,
  pg_get_triggerdef(t.oid, true) as trigger_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace fn on fn.oid = p.pronamespace
join pg_type rt on rt.oid = p.prorettype
join pg_language l on l.oid = p.prolang
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname in (
    'push_notification_queue',
    'push_subscriptions',
    'notifications',
    'user_bonus_rewards',
    'credit_wallets'
  )
order by
  case c.relname
    when 'push_notification_queue' then 1
    when 'user_bonus_rewards' then 2
    when 'credit_wallets' then 3
    when 'notifications' then 4
    when 'push_subscriptions' then 5
  end,
  t.tgname;

-- ---------------------------------------------------------------------------
-- 2) CULPRITS — triggers on the 5 tables missing RETURN or wrong type
--     >>> FIRST ROW HERE IS THE INDIRECT TRIGGER <<<
-- ---------------------------------------------------------------------------
with audited as (
  select
    c.relname as table_name,
    t.tgname as trigger_name,
    fn.nspname as function_schema,
    p.proname as function_name,
    fn.nspname || '.' || p.proname as trigger_function,
    format_type(p.prorettype, null) as function_return_type,
    p.prosrc as function_source,
    p.oid as function_oid,
    case
      when rt.typname <> 'trigger' then 'WRONG_RETURN_TYPE_VOID_OR_OTHER'
      when not (
        p.prosrc ~* '\mreturn\s+(new|old|null)\M'
        or p.prosrc ~* '\mreturn\s+coalesce\s*\('
      ) then 'MISSING_RETURN'
      when lower(p.prosrc) !~ 'return\s+(new|old|null|coalesce\s*\([^)]+\))\s*;\s*end\s*;\s*$'
        then 'HAS_RETURN_BUT_NOT_AT_END'
      else 'OK'
    end as audit_result,
    pg_get_triggerdef(t.oid, true) as trigger_definition
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
)
select
  table_name,
  trigger_name,
  trigger_function,
  function_return_type,
  audit_result,
  trigger_definition
from audited
where audit_result <> 'OK'
order by
  case audit_result
    when 'WRONG_RETURN_TYPE_VOID_OR_OTHER' then 1
    when 'MISSING_RETURN' then 2
    else 3
  end,
  case table_name
    when 'push_notification_queue' then 1
    when 'user_bonus_rewards' then 2
    when 'credit_wallets' then 3
    else 9
  end,
  trigger_name;

-- ---------------------------------------------------------------------------
-- 3) push_notification_queue — deep dive (primary suspect)
-- ---------------------------------------------------------------------------
select
  t.tgname as trigger_name,
  fn.nspname || '.' || p.proname as trigger_function,
  format_type(p.prorettype, null) as return_type,
  case
    when rt.typname <> 'trigger' then '*** VOID/WRONG TYPE — CANNOT WORK AS TRIGGER ***'
    when not (p.prosrc ~* '\mreturn\s+(new|old|null)\M')
      then '*** MISSING RETURN NEW/OLD/NULL ***'
    else 'OK'
  end as status,
  pg_get_triggerdef(t.oid, true) as trigger_definition,
  pg_get_functiondef(p.oid) as full_function_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace fn on fn.oid = p.pronamespace
join pg_type rt on rt.oid = p.prorettype
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname = 'push_notification_queue'
order by t.tgname;

-- If section 3 returns ZERO rows: no SQL trigger on queue (webhook is Dashboard-only).
-- If section 3 returns rows with MISSING RETURN: that is the culprit.

-- ---------------------------------------------------------------------------
-- 4) Full pg_get_functiondef for every trigger on the 5 tables
-- ---------------------------------------------------------------------------
select
  c.relname as table_name,
  t.tgname as trigger_name,
  fn.nspname || '.' || p.proname as trigger_function,
  pg_get_functiondef(p.oid) as full_function_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace fn on fn.oid = p.pronamespace
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname in (
    'push_notification_queue',
    'push_subscriptions',
    'notifications',
    'user_bonus_rewards',
    'credit_wallets'
  )
order by c.relname, t.tgname;

-- ---------------------------------------------------------------------------
-- 5) Wrong binding — trigger pointing to void/non-trigger function
--     (e.g. private.enqueue_push bound directly)
-- ---------------------------------------------------------------------------
select
  c.relname as table_name,
  t.tgname as trigger_name,
  fn.nspname || '.' || p.proname as bound_function,
  format_type(p.prorettype, null) as actual_return_type,
  l.lanname as language,
  '*** TRIGGER BOUND TO NON-TRIGGER FUNCTION ***' as diagnosis,
  pg_get_functiondef(p.oid) as full_function_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace fn on fn.oid = p.pronamespace
join pg_type rt on rt.oid = p.prorettype
join pg_language l on l.oid = p.prolang
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname in (
    'push_notification_queue',
    'push_subscriptions',
    'notifications',
    'user_bonus_rewards',
    'credit_wallets'
  )
  and rt.typname <> 'trigger'
order by c.relname, t.tgname;

-- ---------------------------------------------------------------------------
-- 6) Extended schemas — supabase_functions / net (pg_net) on queue
-- ---------------------------------------------------------------------------
select
  cn.nspname as table_schema,
  c.relname as table_name,
  t.tgname as trigger_name,
  fn.nspname || '.' || p.proname as trigger_function,
  format_type(p.prorettype, null) as return_type,
  case
    when rt.typname <> 'trigger' then 'WRONG_TYPE'
    when not (
      p.prosrc ~* '\mreturn\s+(new|old|null)\M'
      or p.prosrc ~* '\mreturn\s+coalesce\s*\('
    ) then 'MISSING_RETURN'
    else 'OK'
  end as audit_result,
  pg_get_functiondef(p.oid) as full_function_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace fn on fn.oid = p.pronamespace
join pg_type rt on rt.oid = p.prorettype
where not t.tgisinternal
  and c.relname in (
    'push_notification_queue',
    'push_subscriptions',
    'notifications',
    'user_bonus_rewards',
    'credit_wallets'
  )
  and cn.nspname in ('public', 'private', 'supabase_functions', 'net', 'extensions')
order by audit_result desc, cn.nspname, c.relname, t.tgname;

-- ---------------------------------------------------------------------------
-- 7) Candidatura fire order — which indirect trigger runs when
-- ---------------------------------------------------------------------------
select 1 as step, 'applications_first_reward' as source,
       'INSERT user_bonus_rewards (if first application)' as indirect_action
union all
select 2, 'applications_first_reward',
       'UPDATE credit_wallets via add_credits (if first application + helper)'
union all
select 3, 'push_on_application_inserted',
       'INSERT push_notification_queue via private.enqueue_push'
union all
select 4, 'helper_submit_application (after triggers)',
       'INSERT notifications'
order by step;

-- ---------------------------------------------------------------------------
-- 8) Triggers that fire on INSERT for each table (candidatura-relevant)
-- ---------------------------------------------------------------------------
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
    'user_bonus_rewards',
    'credit_wallets',
    'notifications',
    'push_subscriptions'
  )
  and t.tgtype::integer & 4 = 4
  and not (t.tgtype::integer & 2 = 2)
order by
  case c.relname
    when 'user_bonus_rewards' then 1
    when 'credit_wallets' then 2
    when 'push_notification_queue' then 3
    else 9
  end,
  t.tgname;
