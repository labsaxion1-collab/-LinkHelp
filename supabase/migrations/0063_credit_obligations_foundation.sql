-- Unified LinkCredit obligations foundation (client cancel/abandon + helper hire arrears).
-- Schema/RLS/read helper only — no cancel RPC, no Stripe settlement, no tolerance enforcement yet.

-- ---------------------------------------------------------------------------
-- 1) Table
-- ---------------------------------------------------------------------------
create table if not exists public.credit_obligations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete restrict,
  owner_role text not null,
  amount_original int not null,
  amount_paid int not null default 0,
  amount_outstanding int not null,
  status text not null default 'open',
  reason text not null,
  request_id uuid references public.requests (id) on delete restrict,
  application_id uuid references public.applications (id) on delete restrict,
  tolerance_month date,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settled_at timestamptz
);

comment on table public.credit_obligations is
  'Authoritative LC debt/obligations. Writes only via future SECURITY DEFINER RPCs.';
comment on column public.credit_obligations.tolerance_month is
  'First day of calendar month (America/Toronto) for helper hire-arrears tolerance tracking.';
comment on column public.credit_obligations.metadata is
  'Audit-only JSON; must not store PII (emails, phones, addresses, tokens).';

-- ---------------------------------------------------------------------------
-- 2) Constraints (idempotent DO blocks)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_owner_role_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_owner_role_check
      check (owner_role in ('client', 'helper'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_reason_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_reason_check
      check (reason in ('REQUEST_CANCEL_FEE', 'REQUEST_ABANDON_FEE', 'HIRE_ARREARS'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_status_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_status_check
      check (status in ('open', 'settled', 'written_off'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_amount_original_pos_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_amount_original_pos_check
      check (amount_original > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_amount_paid_nonneg_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_amount_paid_nonneg_check
      check (amount_paid >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_amount_paid_le_original_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_amount_paid_le_original_check
      check (amount_paid <= amount_original);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_amount_outstanding_consistency_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_amount_outstanding_consistency_check
      check (amount_outstanding = amount_original - amount_paid);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_open_outstanding_pos_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_open_outstanding_pos_check
      check (status <> 'open' or amount_outstanding > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_settled_zero_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_settled_zero_check
      check (
        status <> 'settled'
        or (amount_outstanding = 0 and settled_at is not null)
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_role_reason_compat_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_role_reason_compat_check
      check (
        (owner_role = 'client' and reason in ('REQUEST_CANCEL_FEE', 'REQUEST_ABANDON_FEE'))
        or (owner_role = 'helper' and reason = 'HIRE_ARREARS')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_reason_request_application_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_reason_request_application_check
      check (
        (reason in ('REQUEST_CANCEL_FEE', 'REQUEST_ABANDON_FEE') and request_id is not null)
        or (reason = 'HIRE_ARREARS' and application_id is not null)
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_tolerance_month_reason_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_tolerance_month_reason_check
      check (tolerance_month is null or reason = 'HIRE_ARREARS');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_tolerance_month_first_day_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_tolerance_month_first_day_check
      check (
        tolerance_month is null
        or tolerance_month = (date_trunc('month', tolerance_month::timestamp))::date
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_idempotency_key_nonempty_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_idempotency_key_nonempty_check
      check (length(btrim(idempotency_key)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligations_metadata_object_check'
      and conrelid = 'public.credit_obligations'::regclass
  ) then
    alter table public.credit_obligations
      add constraint credit_obligations_metadata_object_check
      check (jsonb_typeof(metadata) = 'object');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Indexes
-- ---------------------------------------------------------------------------
create unique index if not exists credit_obligations_idempotency_key_uidx
  on public.credit_obligations (idempotency_key);

create index if not exists credit_obligations_owner_user_id_idx
  on public.credit_obligations (owner_user_id);

create index if not exists credit_obligations_request_id_idx
  on public.credit_obligations (request_id)
  where request_id is not null;

create index if not exists credit_obligations_application_id_idx
  on public.credit_obligations (application_id)
  where application_id is not null;

create index if not exists credit_obligations_open_owner_idx
  on public.credit_obligations (owner_user_id)
  where status = 'open' and amount_outstanding > 0;

create index if not exists credit_obligations_helper_tolerance_month_idx
  on public.credit_obligations (owner_user_id, tolerance_month)
  where reason = 'HIRE_ARREARS' and tolerance_month is not null;

-- ---------------------------------------------------------------------------
-- 4) updated_at trigger
-- ---------------------------------------------------------------------------
drop trigger if exists credit_obligations_set_updated_at on public.credit_obligations;
create trigger credit_obligations_set_updated_at
  before update on public.credit_obligations
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5) RLS + table privileges
-- ---------------------------------------------------------------------------
alter table public.credit_obligations enable row level security;

drop policy if exists credit_obligations_select_own on public.credit_obligations;
create policy credit_obligations_select_own on public.credit_obligations
  for select to authenticated
  using ((select auth.uid()) = owner_user_id);

revoke all on table public.credit_obligations from public;
revoke all on table public.credit_obligations from anon;
grant select on table public.credit_obligations to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Read-only helper (no writes, no settlement)
-- ---------------------------------------------------------------------------
create or replace function public.has_active_credit_obligation(p_owner_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if p_owner_user_id is null then
    return false;
  end if;

  if caller is not null and caller is distinct from p_owner_user_id then
    raise exception 'NOT_ALLOWED';
  end if;

  return exists (
    select 1
    from public.credit_obligations as o
    where o.owner_user_id = p_owner_user_id
      and o.status = 'open'
      and o.amount_outstanding > 0
  );
end;
$$;

revoke all on function public.has_active_credit_obligation(uuid) from public;
revoke all on function public.has_active_credit_obligation(uuid) from anon;
grant execute on function public.has_active_credit_obligation(uuid) to authenticated;
