-- Extend requests.status with expired (future abandonment workflow).
-- Does NOT add paused, does NOT update rows, does NOT expire requests on apply.

-- ---------------------------------------------------------------------------
-- 1) Replace legacy inline status check with explicit expired support
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

  if v_def is not null and v_def ilike '%expired%' and v_def not ilike '%paused%' then
    return;
  end if;

  if v_conname is not null then
    execute format('alter table public.requests drop constraint %I', v_conname);
  end if;

  alter table public.requests
    add constraint requests_status_check
    check (status in ('open', 'in_progress', 'completed', 'cancelled', 'expired'));
end $$;

comment on constraint requests_status_check on public.requests is
  'Lifecycle statuses; expired reserved for future cron/abandon RPC (0062). paused intentionally excluded.';

-- ---------------------------------------------------------------------------
-- 2) Partial index for future open-request expiry scans
-- ---------------------------------------------------------------------------
create index if not exists requests_open_expires_at_idx
  on public.requests (expires_at)
  where status = 'open' and expires_at is not null;

comment on index public.requests_open_expires_at_idx is
  'Supports scheduled expiry/abandon scans without touching paused (unsupported) rows.';
