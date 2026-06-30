-- =============================================================================
-- LinkHelp — Verify service completion, reviews & ranking SQL
-- Run after apply_service_completion_and_reviews.sql
-- =============================================================================

do $$
declare
  missing text[] := '{}';
begin
  -- Columns on upcoming_jobs
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'upcoming_jobs' and column_name = 'completion_requested_at'
  ) then missing := array_append(missing, 'upcoming_jobs.completion_requested_at'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'upcoming_jobs' and column_name = 'completion_reminder_stage'
  ) then missing := array_append(missing, 'upcoming_jobs.completion_reminder_stage'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'upcoming_jobs' and column_name = 'review_window_ends_at'
  ) then missing := array_append(missing, 'upcoming_jobs.review_window_ends_at'); end if;

  -- Columns on reviews
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reviews' and column_name = 'criteria_scores'
  ) then missing := array_append(missing, 'reviews.criteria_scores'); end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reviews' and column_name = 'reviewer_role'
  ) then missing := array_append(missing, 'reviews.reviewer_role'); end if;

  -- Functions
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'helper_mark_service_awaiting_confirmation'
  ) then missing := array_append(missing, 'function helper_mark_service_awaiting_confirmation'); end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'client_confirm_service_completed'
  ) then missing := array_append(missing, 'function client_confirm_service_completed'); end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'submit_service_review'
  ) then missing := array_append(missing, 'function submit_service_review'); end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'process_completion_reminders_and_auto_complete'
  ) then missing := array_append(missing, 'function process_completion_reminders_and_auto_complete'); end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_user_reputation_stats'
  ) then missing := array_append(missing, 'function get_user_reputation_stats'); end if;

  if array_length(missing, 1) > 0 then
    raise exception 'VERIFY FAILED — missing: %', array_to_string(missing, ', ');
  end if;

  raise notice 'VERIFY OK — service completion & reviews schema/functions present';
end $$;

-- Smoke: helper RPC sets completion_requested (read-only check on function body)
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'helper_mark_service_awaiting_confirmation'
      and pg_get_functiondef(p.oid) ilike '%completion_requested%'
  ) then
    raise exception 'VERIFY FAILED — helper_mark_service_awaiting_confirmation does not use completion_requested';
  end if;
  raise notice 'VERIFY OK — helper RPC uses completion_requested status';
end $$;
