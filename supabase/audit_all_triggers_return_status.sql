-- =============================================================================
-- LinkHelp — global trigger RETURN audit (read-only, no fixes)
-- Run in Supabase Dashboard → SQL Editor (Production).
--
-- Lists ALL non-internal triggers in ALL schemas.
-- Flags functions missing RETURN NEW / RETURN OLD / RETURN NULL
-- or bound to a non-trigger return type.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) PROBLEMS FIRST — MISSING_RETURN or WRONG_RETURN_TYPE
-- ---------------------------------------------------------------------------
with all_triggers as (
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
      case when t.tgtype::integer & 16 = 16 then 'UPDATE' end,
      case when t.tgtype::integer & 32 = 32 then 'TRUNCATE' end
    )) as events,
    case when t.tgtype::integer & 1 = 1 then 'ROW' else 'STATEMENT' end as level,
    fn.nspname as function_schema,
    p.proname as function_name,
    fn.nspname || '.' || p.proname as trigger_function,
    format_type(p.prorettype, null) as function_return_type,
    rt.typname as function_return_typname,
    l.lanname as function_language,
    t.tgenabled as enabled,
    p.prosrc as function_source,
    p.oid as function_oid,
    pg_get_triggerdef(t.oid, true) as trigger_definition
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace cn on cn.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace fn on fn.oid = p.pronamespace
  join pg_type rt on rt.oid = p.prorettype
  join pg_language l on l.oid = p.prolang
  where not t.tgisinternal
    and c.relkind in ('r', 'p', 'v', 'm', 'f')  -- tables, partitions, views, matviews, foreign
),
classified as (
  select
    *,
    case
      when function_return_typname <> 'trigger' then 'WRONG_RETURN_TYPE'
      when function_source ~* '\mreturn\s+(new|old|null)\M' then 'OK'
      when function_source ~* '\mreturn\s+coalesce\s*\(' then 'OK'
      else 'MISSING_RETURN'
    end as status
  from all_triggers
)
select
  status,
  table_schema,
  table_name,
  trigger_name,
  timing,
  events,
  level,
  trigger_function,
  function_return_type,
  function_language,
  enabled,
  trigger_definition
from classified
where status in ('MISSING_RETURN', 'WRONG_RETURN_TYPE')
order by
  case status when 'WRONG_RETURN_TYPE' then 1 else 2 end,
  table_schema,
  table_name,
  trigger_name;

-- ---------------------------------------------------------------------------
-- 2) PROBLEMS — full function definition (pg_get_functiondef)
-- ---------------------------------------------------------------------------
with all_triggers as (
  select
    cn.nspname as table_schema,
    c.relname as table_name,
    t.tgname as trigger_name,
    fn.nspname || '.' || p.proname as trigger_function,
    format_type(p.prorettype, null) as function_return_type,
    rt.typname as function_return_typname,
    p.prosrc as function_source,
    p.oid as function_oid
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace cn on cn.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace fn on fn.oid = p.pronamespace
  join pg_type rt on rt.oid = p.prorettype
  where not t.tgisinternal
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
),
classified as (
  select
    *,
    case
      when function_return_typname <> 'trigger' then 'WRONG_RETURN_TYPE'
      when function_source ~* '\mreturn\s+(new|old|null)\M' then 'OK'
      when function_source ~* '\mreturn\s+coalesce\s*\(' then 'OK'
      else 'MISSING_RETURN'
    end as status
  from all_triggers
)
select
  status,
  table_schema,
  table_name,
  trigger_name,
  trigger_function,
  function_return_type,
  pg_get_functiondef(function_oid) as full_function_definition
from classified
where status in ('MISSING_RETURN', 'WRONG_RETURN_TYPE')
order by
  case status when 'WRONG_RETURN_TYPE' then 1 else 2 end,
  table_schema,
  table_name,
  trigger_name;

-- ---------------------------------------------------------------------------
-- 3) FULL INVENTORY — every non-internal trigger in the database
-- ---------------------------------------------------------------------------
with all_triggers as (
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
      case when t.tgtype::integer & 16 = 16 then 'UPDATE' end,
      case when t.tgtype::integer & 32 = 32 then 'TRUNCATE' end
    )) as events,
    case when t.tgtype::integer & 1 = 1 then 'ROW' else 'STATEMENT' end as level,
    fn.nspname as function_schema,
    p.proname as function_name,
    fn.nspname || '.' || p.proname as trigger_function,
    format_type(p.prorettype, null) as function_return_type,
    rt.typname as function_return_typname,
    l.lanname as function_language,
    t.tgenabled as enabled,
    p.prosrc as function_source,
    p.oid as function_oid,
    pg_get_triggerdef(t.oid, true) as trigger_definition
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace cn on cn.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace fn on fn.oid = p.pronamespace
  join pg_type rt on rt.oid = p.prorettype
  join pg_language l on l.oid = p.prolang
  where not t.tgisinternal
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
),
classified as (
  select
    *,
    case
      when function_return_typname <> 'trigger' then 'WRONG_RETURN_TYPE'
      when function_source ~* '\mreturn\s+(new|old|null)\M' then 'OK'
      when function_source ~* '\mreturn\s+coalesce\s*\(' then 'OK'
      else 'MISSING_RETURN'
    end as status
  from all_triggers
)
select
  status,
  table_schema,
  table_name,
  trigger_name,
  timing,
  events,
  level,
  function_schema,
  function_name,
  trigger_function,
  function_return_type,
  function_language,
  enabled,
  trigger_definition
from classified
order by
  case status
    when 'WRONG_RETURN_TYPE' then 1
    when 'MISSING_RETURN' then 2
    else 3
  end,
  table_schema,
  table_name,
  trigger_name;

-- ---------------------------------------------------------------------------
-- 4) FULL INVENTORY — pg_get_functiondef for every trigger
-- ---------------------------------------------------------------------------
with all_triggers as (
  select
    cn.nspname as table_schema,
    c.relname as table_name,
    t.tgname as trigger_name,
    fn.nspname || '.' || p.proname as trigger_function,
    format_type(p.prorettype, null) as function_return_type,
    rt.typname as function_return_typname,
    p.prosrc as function_source,
    p.oid as function_oid
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace cn on cn.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace fn on fn.oid = p.pronamespace
  join pg_type rt on rt.oid = p.prorettype
  where not t.tgisinternal
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
),
classified as (
  select
    *,
    case
      when function_return_typname <> 'trigger' then 'WRONG_RETURN_TYPE'
      when function_source ~* '\mreturn\s+(new|old|null)\M' then 'OK'
      when function_source ~* '\mreturn\s+coalesce\s*\(' then 'OK'
      else 'MISSING_RETURN'
    end as status
  from all_triggers
)
select
  status,
  table_schema,
  table_name,
  trigger_name,
  trigger_function,
  function_return_type,
  pg_get_functiondef(function_oid) as full_function_definition
from classified
order by
  case status
    when 'WRONG_RETURN_TYPE' then 1
    when 'MISSING_RETURN' then 2
    else 3
  end,
  table_schema,
  table_name,
  trigger_name;

-- ---------------------------------------------------------------------------
-- 5) SUMMARY COUNTS
-- ---------------------------------------------------------------------------
with all_triggers as (
  select
    case
      when rt.typname <> 'trigger' then 'WRONG_RETURN_TYPE'
      when p.prosrc ~* '\mreturn\s+(new|old|null)\M' then 'OK'
      when p.prosrc ~* '\mreturn\s+coalesce\s*\(' then 'OK'
      else 'MISSING_RETURN'
    end as status
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_proc p on p.oid = t.tgfoid
  join pg_type rt on rt.oid = p.prorettype
  where not t.tgisinternal
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
)
select status, count(*) as trigger_count
from all_triggers
group by status
order by
  case status
    when 'WRONG_RETURN_TYPE' then 1
    when 'MISSING_RETURN' then 2
    else 3
  end;

-- ---------------------------------------------------------------------------
-- 6) CANDIDATURA CASCADE — triggers on tables touched by helper_submit_application
--     (even if global audit shows OK — helps narrow runtime path)
-- ---------------------------------------------------------------------------
with cascade_tables as (
  select unnest(array[
    'applications',
    'credit_wallets',
    'credit_transactions',
    'notifications',
    'push_notification_queue',
    'conversations',
    'user_bonus_rewards',
    'profiles',
    'requests',
    'request_market_signals'
  ]) as table_name
),
all_triggers as (
  select
    cn.nspname as table_schema,
    c.relname as table_name,
    t.tgname as trigger_name,
    fn.nspname || '.' || p.proname as trigger_function,
    format_type(p.prorettype, null) as function_return_type,
    case
      when rt.typname <> 'trigger' then 'WRONG_RETURN_TYPE'
      when p.prosrc ~* '\mreturn\s+(new|old|null)\M' then 'OK'
      when p.prosrc ~* '\mreturn\s+coalesce\s*\(' then 'OK'
      else 'MISSING_RETURN'
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
    and c.relname in (select table_name from cascade_tables)
)
select *
from all_triggers
order by
  case status
    when 'WRONG_RETURN_TYPE' then 1
    when 'MISSING_RETURN' then 2
    else 3
  end,
  table_name,
  trigger_name;

-- ---------------------------------------------------------------------------
-- 7) ALL trigger-returning functions in public + private WITHOUT any trigger
--    bound (orphan / possibly called manually — usually not the issue)
-- ---------------------------------------------------------------------------
select
  n.nspname as function_schema,
  p.proname as function_name,
  format_type(p.prorettype, null) as return_type,
  case
    when p.prosrc ~* '\mreturn\s+(new|old|null)\M' then 'OK'
    when p.prosrc ~* '\mreturn\s+coalesce\s*\(' then 'OK'
    else 'MISSING_RETURN'
  end as status,
  pg_get_functiondef(p.oid) as full_function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_type rt on rt.oid = p.prorettype
where n.nspname in ('public', 'private')
  and rt.typname = 'trigger'
  and p.prokind = 'f'
  and not exists (
    select 1
    from pg_trigger tg
    where tg.tgfoid = p.oid
      and not tg.tgisinternal
  )
order by status desc, n.nspname, p.proname;

-- ---------------------------------------------------------------------------
-- 8) BRANCH RISK — status OK by regex but function does NOT end with RETURN
--    These can still raise "control reached end of trigger procedure without RETURN"
--    at runtime when a code path skips the return.
-- ---------------------------------------------------------------------------
with all_triggers as (
  select
    cn.nspname as table_schema,
    c.relname as table_name,
    t.tgname as trigger_name,
    fn.nspname || '.' || p.proname as trigger_function,
    format_type(p.prorettype, null) as function_return_type,
    p.prosrc as function_source,
    p.oid as function_oid,
    case
      when rt.typname <> 'trigger' then 'WRONG_RETURN_TYPE'
      when p.prosrc ~* '\mreturn\s+(new|old|null)\M' then 'OK'
      when p.prosrc ~* '\mreturn\s+coalesce\s*\(' then 'OK'
      else 'MISSING_RETURN'
    end as regex_status
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace cn on cn.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace fn on fn.oid = p.pronamespace
  join pg_type rt on rt.oid = p.prorettype
  where not t.tgisinternal
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
)
select
  'BRANCH_RISK' as status,
  table_schema,
  table_name,
  trigger_name,
  trigger_function,
  function_return_type,
  regex_status,
  right(trim(function_source), 200) as source_tail,
  pg_get_functiondef(function_oid) as full_function_definition
from all_triggers
where regex_status = 'OK'
  and lower(function_source) !~ 'return\s+(new|old|null|coalesce\s*\([^)]+\))\s*;\s*end\s*;\s*$'
order by table_schema, table_name, trigger_name;

-- ---------------------------------------------------------------------------
-- 9) EVENT TRIGGERS (not table triggers — separate from sections 1-4)
-- ---------------------------------------------------------------------------
select
  evtname as event_trigger_name,
  fn.nspname || '.' || p.proname as event_trigger_function,
  format_type(p.prorettype, null) as function_return_type,
  case
    when rt.typname <> 'event_trigger' then 'WRONG_RETURN_TYPE'
    else 'OK'
  end as status,
  pg_get_functiondef(p.oid) as full_function_definition
from pg_event_trigger et
join pg_proc p on p.oid = et.evtfoid
join pg_namespace fn on fn.oid = p.pronamespace
join pg_type rt on rt.oid = p.prorettype
order by event_trigger_name;
