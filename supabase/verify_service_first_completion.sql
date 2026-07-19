-- =============================================================================
-- LinkHelp — Verify first-side service completion RPC
-- Read-only checks. Safe to run in Supabase SQL editor.
-- Does NOT mutate data.
-- =============================================================================

do $$
declare
  missing text[] := array[]::text[];
  body text;
begin
  -- 1) Function exists
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'finalize_service_completion'
  ) then
    missing := array_append(missing, 'function finalize_service_completion');
  end if;

  if array_length(missing, 1) is not null then
    raise exception 'VERIFY FAILED — missing: %', array_to_string(missing, ', ');
  end if;

  select pg_get_functiondef(p.oid) into body
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'finalize_service_completion'
  order by p.oid
  limit 1;

  -- 2) Authorization by client_id / helper_id (not profile.role only)
  if body not ilike '%caller = req.client_id%' then
    raise exception 'VERIFY FAILED — finalize_service_completion missing client membership check';
  end if;
  if body not ilike '%caller = helper_id%' then
    raise exception 'VERIFY FAILED — finalize_service_completion missing helper membership check';
  end if;
  if body ilike '%v_role = ''client'' and caller <> req.client_id%' then
    raise exception 'VERIFY FAILED — finalize_service_completion still uses fragile profiles.role gate';
  end if;

  -- 3) Idempotency
  if body not ilike '%alreadyCompleted%' then
    raise exception 'VERIFY FAILED — finalize_service_completion missing alreadyCompleted idempotency';
  end if;

  -- 4) Active workflow gate (both legacy + new status names)
  if body not ilike '%completion_requested%' or body not ilike '%awaiting_client_confirmation%' then
    raise exception 'VERIFY FAILED — finalize_service_completion missing legacy/new awaiting statuses';
  end if;

  -- 5) Final state transitions
  if body not ilike '%workflow_status = ''completed''%' then
    raise exception 'VERIFY FAILED — upcoming_jobs not set to completed';
  end if;
  if body not ilike '%status = ''completed''%' then
    raise exception 'VERIFY FAILED — requests/applications not set to completed';
  end if;
  if body not ilike '%review_window_ends_at%' then
    raise exception 'VERIFY FAILED — review_window_ends_at not set';
  end if;

  -- 6) Cancelled guard
  if body not ilike '%REQUEST_CANCELLED%' then
    raise exception 'VERIFY FAILED — cancelled requests not explicitly rejected';
  end if;

  -- 7) Notifications on first completion (review prompts)
  if body not ilike '%insert into public.notifications%' then
    raise exception 'VERIFY FAILED — completion notifications missing';
  end if;

  -- 8) Must NOT mutate credits / Stripe
  if body ~* '(link.?credit|stripe|wallet|debit|refund)' then
    raise exception 'VERIFY FAILED — finalize_service_completion must not touch credits/payment';
  end if;

  -- 9) Legacy RPCs still present (fallback until frontend always uses finalize)
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'helper_mark_service_awaiting_confirmation'
  ) then
    raise notice 'WARN — helper_mark_service_awaiting_confirmation missing (fallback unavailable)';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'client_confirm_service_completed'
  ) then
    raise notice 'WARN — client_confirm_service_completed missing (fallback unavailable)';
  end if;

  -- 10) Review RPC allows completed requests
  select pg_get_functiondef(p.oid) into body
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'submit_service_review'
  order by p.oid limit 1;

  if body is null then
    raise notice 'WARN — submit_service_review not found; review eligibility cannot be verified';
  elsif body not ilike '%req.status <> ''completed''%' then
    raise notice 'WARN — submit_service_review body differs from repo; verify review gates manually';
  end if;

  raise notice 'VERIFY OK — finalize_service_completion installed and passes static checks';
end;
$$;

-- ---------------------------------------------------------------------------
-- Optional smoke queries (manual — require real hired job IDs; do not auto-run)
-- ---------------------------------------------------------------------------
-- Helper first:
--   select public.finalize_service_completion('<request_id>'::uuid);
-- Client duplicate:
--   select public.finalize_service_completion('<same_request_id>'::uuid);
--   → second call should return alreadyCompleted = true
-- Unauthorized user:
--   → NOT_ALLOWED
-- Cancelled request:
--   → REQUEST_CANCELLED
