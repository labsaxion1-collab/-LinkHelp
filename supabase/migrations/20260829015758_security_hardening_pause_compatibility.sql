-- Security + pause compatibility (catalog/privileges only).
-- Does NOT change Stripe, credit formulas, obligation amounts, or cancel-fee logic.
-- Does NOT drop client_cancel_request(uuid, text). Does NOT rewrite helper_compute_lead_quote.
-- Does NOT revoke the broader SECURITY DEFINER surface (follow-up hardening).

-- ---------------------------------------------------------------------------
-- 1) public.request_market_metrics: RLS + lock down Data API
--    No frontend/RPC reads this table (created in 0027 only). No SELECT policy.
-- ---------------------------------------------------------------------------
alter table public.request_market_metrics enable row level security;

revoke all on table public.request_market_metrics from public;
revoke all on table public.request_market_metrics from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.request_market_metrics
  from public;
revoke insert, update, delete, truncate, references, trigger
  on table public.request_market_metrics
  from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.request_market_metrics
  from authenticated;

revoke select on table public.request_market_metrics from public;
revoke select on table public.request_market_metrics from anon;
revoke select on table public.request_market_metrics from authenticated;

-- ---------------------------------------------------------------------------
-- 2) requests.status: restore paused while keeping expired (idempotent)
-- ---------------------------------------------------------------------------
do $$
declare
  v_conname name;
  v_def text;
begin
  select c.conname, pg_get_constraintdef(c.oid)
  into v_conname, v_def
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'requests'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%status%'
  order by c.conname
  limit 1;

  if v_def is not null
     and v_def ilike '%paused%'
     and v_def ilike '%expired%'
     and v_def ilike '%open%'
     and v_def ilike '%in_progress%'
     and v_def ilike '%completed%'
     and v_def ilike '%cancelled%' then
    return;
  end if;

  if v_conname is not null then
    execute format('alter table public.requests drop constraint %I', v_conname);
  end if;

  alter table public.requests
    add constraint requests_status_check
    check (status in ('open', 'paused', 'in_progress', 'completed', 'cancelled', 'expired'));
end $$;

comment on constraint requests_status_check on public.requests is
  'Lifecycle statuses including paused (client pause/resume) and expired (0062).';

-- ---------------------------------------------------------------------------
-- 3) helper_compute_lead_quote(uuid, uuid): revoke anon/PUBLIC only
-- ---------------------------------------------------------------------------
revoke all on function public.helper_compute_lead_quote(uuid, uuid) from public;
revoke all on function public.helper_compute_lead_quote(uuid, uuid) from anon;
grant execute on function public.helper_compute_lead_quote(uuid, uuid) to authenticated;
grant execute on function public.helper_compute_lead_quote(uuid, uuid) to postgres;
grant execute on function public.helper_compute_lead_quote(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4) Legacy client_cancel_request(uuid, text): keep overload, lock EXECUTE
--    main@ee176b6 still calls p_reason. Skip if the overload is absent.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.client_cancel_request(uuid, text)') is null then
    return;
  end if;

  execute 'revoke all on function public.client_cancel_request(uuid, text) from public';
  execute 'revoke all on function public.client_cancel_request(uuid, text) from anon';
  execute 'grant execute on function public.client_cancel_request(uuid, text) to authenticated';
  execute 'grant execute on function public.client_cancel_request(uuid, text) to postgres';
  execute 'grant execute on function public.client_cancel_request(uuid, text) to service_role';
end $$;

-- ---------------------------------------------------------------------------
-- 5) PG17 MAINTAIN leftover on obligation tables (no SELECT/RLS/policy change)
-- ---------------------------------------------------------------------------
revoke maintain on table public.credit_obligations from authenticated;
revoke maintain on table public.credit_obligation_settlements from authenticated;
