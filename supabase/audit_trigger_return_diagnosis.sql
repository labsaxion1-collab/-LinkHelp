-- =============================================================================
-- LinkHelp — definitive trigger RETURN audit (read-only, no fixes)
-- Run in Supabase Dashboard → SQL Editor (Production).
--
-- Goal: find trigger functions that can raise:
--   "control reached end of trigger procedure without RETURN"
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) All triggers on the 4 requested tables
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
    case when t.tgtype::integer & 16 = 16 then 'UPDATE' end,
    case when t.tgtype::integer & 32 = 32 then 'TRUNCATE' end
  )) as events,
  case when t.tgtype::integer & 1 = 1 then 'ROW' else 'STATEMENT' end as level,
  n.nspname as function_schema,
  p.proname as function_name,
  p.oid::regprocedure as function_identity,
  t.tgenabled as enabled,
  pg_get_triggerdef(t.oid, true) as trigger_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname in (
    'applications',
    'credit_wallets',
    'credit_transactions',
    'notifications'
  )
order by c.relname, t.tgname;

-- ---------------------------------------------------------------------------
-- B) Candidatura cascade — tables written by helper_submit_application
--     (extend beyond the 4 tables to catch nested trigger failures)
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
  n.nspname || '.' || p.proname as trigger_function
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname in (
    'applications',
    'credit_wallets',
    'credit_transactions',
    'notifications',
    'push_notification_queue',
    'conversations',
    'user_bonus_rewards',
    'profiles'
  )
order by c.relname, t.tgname;

-- ---------------------------------------------------------------------------
-- C) RETURN audit for every trigger bound to the 4 tables
--    Flags functions whose source lacks any RETURN NEW/OLD/NULL
-- ---------------------------------------------------------------------------
with trigger_funcs as (
  select distinct
    c.relname as table_name,
    t.tgname as trigger_name,
    n.nspname as function_schema,
    p.proname as function_name,
    p.oid as function_oid,
    p.prosrc as function_source,
    l.lanname as language
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace cn on cn.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where not t.tgisinternal
    and cn.nspname = 'public'
    and c.relname in (
      'applications',
      'credit_wallets',
      'credit_transactions',
      'notifications'
    )
)
select
  table_name,
  trigger_name,
  function_schema || '.' || function_name as trigger_function,
  language,
  case
    when function_source ~* '\mreturn\s+(new|old|null)\M' then 'HAS_EXPLICIT_RETURN'
    when function_source ~* '\mreturn\s+coalesce\s*\(' then 'HAS_COALESCE_RETURN'
    else 'MISSING_RETURN'
  end as return_status,
  case
    when function_source ~* '\mreturn\s+(new|old|null)\M'
      or function_source ~* '\mreturn\s+coalesce\s*\('
    then null
    else right(trim(function_source), 120)
  end as source_tail_if_missing
from trigger_funcs
order by return_status desc, table_name, trigger_name;

-- ---------------------------------------------------------------------------
-- D) CULPRITS — same audit on candidatura cascade tables
--     Any row with MISSING_RETURN here is a prime suspect.
-- ---------------------------------------------------------------------------
with cascade_funcs as (
  select distinct
    c.relname as table_name,
    t.tgname as trigger_name,
    n.nspname as function_schema,
    p.proname as function_name,
    p.oid as function_oid,
    p.prosrc as function_source,
    l.lanname as language
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace cn on cn.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where not t.tgisinternal
    and cn.nspname = 'public'
    and c.relname in (
      'applications',
      'credit_wallets',
      'credit_transactions',
      'notifications',
      'push_notification_queue',
      'conversations',
      'user_bonus_rewards',
      'profiles'
    )
)
select
  table_name,
  trigger_name,
  function_schema || '.' || function_name as trigger_function,
  language,
  case
    when function_source ~* '\mreturn\s+(new|old|null)\M' then 'HAS_EXPLICIT_RETURN'
    when function_source ~* '\mreturn\s+coalesce\s*\(' then 'HAS_COALESCE_RETURN'
    else '*** MISSING_RETURN — LIKELY CULPRIT ***'
  end as return_status,
  right(trim(function_source), 160) as source_tail
from cascade_funcs
where not (
  function_source ~* '\mreturn\s+(new|old|null)\M'
  or function_source ~* '\mreturn\s+coalesce\s*\('
)
order by table_name, trigger_name;

-- ---------------------------------------------------------------------------
-- E) Does the function body end with RETURN before END; ?
--    Catches branches that never reach a final return.
-- ---------------------------------------------------------------------------
with cascade_funcs as (
  select distinct
    c.relname as table_name,
    t.tgname as trigger_name,
    n.nspname as function_schema,
    p.proname as function_name,
    p.prosrc as function_source
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace cn on cn.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace n on n.oid = p.pronamespace
  where not t.tgisinternal
    and cn.nspname = 'public'
    and c.relname in (
      'applications',
      'credit_wallets',
      'credit_transactions',
      'notifications',
      'push_notification_queue',
      'conversations',
      'user_bonus_rewards',
      'profiles'
    )
)
select
  table_name,
  trigger_name,
  function_schema || '.' || function_name as trigger_function,
  case
    when lower(function_source) ~ 'return\s+(new|old|null|coalesce\s*\([^)]+\))\s*;\s*end\s*;\s*$'
      then 'ENDS_WITH_RETURN'
    else 'DOES_NOT_END_WITH_RETURN'
  end as end_check,
  right(trim(function_source), 200) as source_tail
from cascade_funcs
order by end_check desc, table_name, trigger_name;

-- ---------------------------------------------------------------------------
-- F) Full definitions — every trigger function on the 4 tables
-- ---------------------------------------------------------------------------
select
  c.relname as table_name,
  t.tgname as trigger_name,
  n.nspname || '.' || p.proname as trigger_function,
  pg_get_functiondef(p.oid) as full_function_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname in (
    'applications',
    'credit_wallets',
    'credit_transactions',
    'notifications'
  )
order by c.relname, t.tgname;

-- ---------------------------------------------------------------------------
-- G) Full definitions — cascade tables (nested triggers)
-- ---------------------------------------------------------------------------
select
  c.relname as table_name,
  t.tgname as trigger_name,
  n.nspname || '.' || p.proname as trigger_function,
  pg_get_functiondef(p.oid) as full_function_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname in (
    'push_notification_queue',
    'conversations',
    'user_bonus_rewards',
    'profiles'
  )
order by c.relname, t.tgname;

-- ---------------------------------------------------------------------------
-- H) Inventory — ALL trigger-returning functions in public + private
-- ---------------------------------------------------------------------------
select
  n.nspname as schema_name,
  p.proname as function_name,
  p.oid::regprocedure as function_identity,
  l.lanname as language,
  case
    when p.prosrc ~* '\mreturn\s+(new|old|null)\M'
      or p.prosrc ~* '\mreturn\s+coalesce\s*\('
    then 'OK'
    else 'MISSING_RETURN'
  end as return_status,
  (
    select string_agg(distinct c.relname, ', ' order by c.relname)
    from pg_trigger tg
    join pg_class c on c.oid = tg.tgrelid
    join pg_namespace cn on cn.oid = c.relnamespace
    where tg.tgfoid = p.oid
      and not tg.tgisinternal
      and cn.nspname = 'public'
  ) as bound_to_tables
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_type rt on rt.oid = p.prorettype
join pg_language l on l.oid = p.prolang
where n.nspname in ('public', 'private')
  and rt.typname = 'trigger'
  and p.prokind = 'f'
order by return_status desc, n.nspname, p.proname;

-- ---------------------------------------------------------------------------
-- I) Full definitions — ALL trigger functions in public + private
--     missing RETURN (definitive list for manual review)
-- ---------------------------------------------------------------------------
select
  n.nspname || '.' || p.proname as trigger_function,
  pg_get_functiondef(p.oid) as full_function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_type rt on rt.oid = p.prorettype
where n.nspname in ('public', 'private')
  and rt.typname = 'trigger'
  and p.prokind = 'f'
  and not (
    p.prosrc ~* '\mreturn\s+(new|old|null)\M'
    or p.prosrc ~* '\mreturn\s+coalesce\s*\('
  )
order by n.nspname, p.proname;

-- ---------------------------------------------------------------------------
-- J) Wrong binding check — trigger pointing to non-trigger function (void/etc.)
-- ---------------------------------------------------------------------------
select
  c.relname as table_name,
  t.tgname as trigger_name,
  n.nspname || '.' || p.proname as bound_function,
  format_type(p.prorettype, null) as return_type,
  l.lanname as language,
  case
    when rt.typname = 'trigger' then 'OK_TRIGGER_TYPE'
    else '*** WRONG_RETURN_TYPE — LIKELY CULPRIT ***'
  end as type_check
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
join pg_type rt on rt.oid = p.prorettype
join pg_language l on l.oid = p.prolang
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname in (
    'applications',
    'credit_wallets',
    'credit_transactions',
    'notifications',
    'push_notification_queue',
    'conversations',
    'user_bonus_rewards',
    'profiles'
  )
order by type_check desc, c.relname, t.tgname;

-- ---------------------------------------------------------------------------
-- K) Unexpected triggers on applications (not in LinkHelp migrations)
-- ---------------------------------------------------------------------------
select
  t.tgname as trigger_name,
  n.nspname || '.' || p.proname as trigger_function,
  pg_get_triggerdef(t.oid, true) as trigger_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname = 'applications'
  and t.tgname not in (
    'applications_first_reward',
    'applications_set_updated_at',
    'push_on_application_inserted',
    'push_on_application_accepted',
    'trg_applications_lead_quality'
  )
order by t.tgname;

-- ---------------------------------------------------------------------------
-- L) ALL schemas — triggers on cascade tables (catches supabase_functions etc.)
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
  end as audit_result
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace fn on fn.oid = p.pronamespace
join pg_type rt on rt.oid = p.prorettype
where not t.tgisinternal
  and c.relname in (
    'applications',
    'credit_wallets',
    'credit_transactions',
    'notifications',
    'push_notification_queue',
    'conversations',
    'user_bonus_rewards',
    'profiles'
  )
order by audit_result desc, cn.nspname, c.relname, t.tgname;

-- ---------------------------------------------------------------------------
-- M) Candidatura fire order — AFTER INSERT triggers on applications
--     (PostgreSQL fires alphabetically by trigger name)
-- ---------------------------------------------------------------------------
select
  t.tgname as trigger_name,
  fn.nspname || '.' || p.proname as trigger_function,
  case
    when p.prosrc ~* '\mreturn\s+(new|old|null)\M'
      or p.prosrc ~* '\mreturn\s+coalesce\s*\('
    then 'OK'
    else '*** MISSING_RETURN — fires during candidatura ***'
  end as return_status,
  pg_get_functiondef(p.oid) as full_function_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace cn on cn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace fn on fn.oid = p.pronamespace
where not t.tgisinternal
  and cn.nspname = 'public'
  and c.relname = 'applications'
  and t.tgtype::integer & 4 = 4   -- INSERT
  and not (t.tgtype::integer & 2 = 2)  -- not BEFORE
order by t.tgname;
