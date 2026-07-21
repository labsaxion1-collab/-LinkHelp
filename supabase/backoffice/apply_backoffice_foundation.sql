-- =============================================================================
-- apply_backoffice_foundation.sql
-- LinkHelp BackOffice P0 — roles, permissions, audit logs, read-only RPCs.
-- Idempotent. service_role only. Does NOT alter client/helper app tables destructively.
-- Prerequisite: profiles, credit_wallets, credit_transactions, requests, applications.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: admin_roles
-- ---------------------------------------------------------------------------
create table if not exists public.admin_roles (
  id text primary key,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

insert into public.admin_roles (id, label, description) values
  ('super_admin', 'Super Admin', 'Full access including future critical writes'),
  ('operations_admin', 'Operations Admin', 'Users, requests, support view'),
  ('finance_admin', 'Finance Admin', 'LinkCredits ledger and economy read'),
  ('support_agent', 'Support Agent', 'Support view read-only'),
  ('analyst_readonly', 'Analyst Read-only', 'Dashboards and aggregates only')
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description;

-- ---------------------------------------------------------------------------
-- STEP 2: admin_permissions + role matrix
-- ---------------------------------------------------------------------------
create table if not exists public.admin_permissions (
  id text primary key,
  label text not null,
  description text
);

insert into public.admin_permissions (id, label, description) values
  ('dashboard.read', 'Dashboard', 'FLUX analytics overview'),
  ('users.read', 'Users read', 'List and view user profiles'),
  ('requests.read', 'Requests read', 'List and view service requests'),
  ('credits.read', 'Credits read', 'View LinkCredits transactions'),
  ('economy.read', 'Economy read', 'View pricing configuration snapshot'),
  ('audit.read', 'Audit read', 'View admin audit logs'),
  ('support.view', 'Support view', 'Read-only support context (no impersonation)'),
  ('users.write', 'Users write', 'P1 — suspend, profile fixes'),
  ('credits.write', 'Credits write', 'P1 — admin credit adjustments'),
  ('requests.write', 'Requests write', 'P1 — cancel/reopen requests'),
  ('economy.write', 'Economy write', 'P1 — versioned config changes')
on conflict (id) do nothing;

create table if not exists public.admin_role_permissions (
  role_id text not null references public.admin_roles(id) on delete cascade,
  permission_id text not null references public.admin_permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

insert into public.admin_role_permissions (role_id, permission_id)
select r.id, p.id
from public.admin_roles r
cross join public.admin_permissions p
where r.id = 'super_admin'
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
select 'operations_admin', p.id from public.admin_permissions p
where p.id in ('dashboard.read', 'users.read', 'requests.read', 'audit.read', 'support.view')
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
select 'finance_admin', p.id from public.admin_permissions p
where p.id in ('dashboard.read', 'credits.read', 'economy.read', 'audit.read')
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
select 'support_agent', p.id from public.admin_permissions p
where p.id in ('dashboard.read', 'users.read', 'requests.read', 'support.view', 'audit.read')
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
select 'analyst_readonly', p.id from public.admin_permissions p
where p.id in ('dashboard.read', 'economy.read', 'credits.read', 'audit.read')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- STEP 3: admin_user_roles — map existing JWT admins → super_admin (temporary)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id text not null references public.admin_roles(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

insert into public.admin_user_roles (user_id, role_id, granted_by)
select u.id, 'super_admin', null
from auth.users u
where coalesce(u.raw_app_meta_data->>'role', '') in ('admin', 'flux_admin')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- STEP 4: admin_audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  reason text,
  correlation_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);

create index if not exists admin_audit_logs_admin_id_idx
  on public.admin_audit_logs (admin_id, created_at desc);

create index if not exists admin_audit_logs_target_idx
  on public.admin_audit_logs (target_type, target_id);

alter table public.admin_audit_logs enable row level security;

-- No direct authenticated access — service_role API only
drop policy if exists admin_audit_logs_deny_all on public.admin_audit_logs;
create policy admin_audit_logs_deny_all on public.admin_audit_logs
  for all to authenticated using (false);

-- ---------------------------------------------------------------------------
-- STEP 5: admin_support_sessions (schema only — P1 impersonation; P0 read schema)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_support_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid not null references auth.users(id) on delete restrict,
  reason text not null,
  mode text not null default 'read_only_view' check (mode in ('read_only_view', 'impersonation')),
  status text not null default 'active' check (status in ('active', 'ended', 'expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  restrictions jsonb not null default '{"readOnly":true}'::jsonb,
  correlation_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists admin_support_sessions_admin_idx
  on public.admin_support_sessions (admin_id, status, started_at desc);

alter table public.admin_support_sessions enable row level security;
drop policy if exists admin_support_sessions_deny_all on public.admin_support_sessions;
create policy admin_support_sessions_deny_all on public.admin_support_sessions
  for all to authenticated using (false);

-- ---------------------------------------------------------------------------
-- STEP 6: Permission helpers (service_role / internal)
-- ---------------------------------------------------------------------------
create or replace function public.admin_user_has_permission(p_user_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_user_roles ur
    join public.admin_role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = p_user_id
      and rp.permission_id = p_permission
  );
$$;

create or replace function public.admin_write_audit_log(
  p_admin_id uuid,
  p_action text,
  p_target_type text default null,
  p_target_id text default null,
  p_before jsonb default null,
  p_after jsonb default null,
  p_reason text default null,
  p_correlation_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.admin_audit_logs (
    admin_id, action, target_type, target_id,
    before, after, reason, correlation_id, metadata
  ) values (
    p_admin_id, p_action, p_target_type, p_target_id,
    p_before, p_after, p_reason, p_correlation_id, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- STEP 7: admin_list_users (read-only, minimal PII)
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_users(
  p_role text default null,
  p_search text default null,
  p_city text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_city text := nullif(trim(coalesce(p_city, '')), '');
  v_total bigint;
  v_rows jsonb;
begin
  select count(*) into v_total
  from public.profiles p
  where p.deleted_at is null
    and (p_role is null or p.role::text = p_role)
    and (v_city is null or lower(coalesce(p.city, '')) like '%' || lower(v_city) || '%')
    and (
      v_search is null
      or lower(coalesce(p.name, '')) like '%' || lower(v_search) || '%'
      or lower(coalesce(p.email, '')) like '%' || lower(v_search) || '%'
    );

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_rows
  from (
    select
      p.id,
      p.name,
      p.email,
      p.role,
      p.city,
      p.region,
      p.country,
      p.rating,
      p.created_at,
      coalesce(w.balance, 0) as credit_balance
    from public.profiles p
    left join public.credit_wallets w on w.helper_id = p.id and p.role = 'helper'
    where p.deleted_at is null
      and (p_role is null or p.role::text = p_role)
      and (v_city is null or lower(coalesce(p.city, '')) like '%' || lower(v_city) || '%')
      and (
        v_search is null
        or lower(coalesce(p.name, '')) like '%' || lower(v_search) || '%'
        or lower(coalesce(p.email, '')) like '%' || lower(v_search) || '%'
      )
    order by p.created_at desc
    limit v_limit offset v_offset
  ) t;

  return jsonb_build_object('total', v_total, 'limit', v_limit, 'offset', v_offset, 'users', v_rows);
end;
$$;

-- ---------------------------------------------------------------------------
-- STEP 8: admin_get_user_detail (read-only aggregate)
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_wallet jsonb := null;
  v_tx jsonb := '[]'::jsonb;
  v_apps jsonb := '[]'::jsonb;
  v_requests jsonb := '[]'::jsonb;
  v_complaints bigint := 0;
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if v_profile.id is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  if v_profile.role = 'helper' then
    select jsonb_build_object(
      'balance', coalesce(w.balance, 0),
      'totalPurchased', coalesce(w.total_purchased, 0),
      'totalSpent', coalesce(w.total_spent, 0)
    ) into v_wallet
    from public.credit_wallets w
    where w.helper_id = p_user_id;

    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_tx
    from (
      select id, type, amount, balance_after, request_id, application_id, description, created_at
      from public.credit_transactions
      where helper_id = p_user_id
      order by created_at desc
      limit 25
    ) t;

    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_apps
    from (
      select a.id, a.request_id, a.status, a.is_exclusive, a.proposed_amount, a.created_at,
             r.title as request_title
      from public.applications a
      join public.requests r on r.id = a.request_id
      where a.helper_id = p_user_id
      order by a.created_at desc
      limit 25
    ) t;
  else
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_requests
    from (
      select id, title, category, status, budget, created_at
      from public.requests
      where client_id = p_user_id
      order by created_at desc
      limit 25
    ) t;
  end if;

  select count(*) into v_complaints
  from public.user_complaints
  where reported_user_id = p_user_id;

  return jsonb_build_object(
    'profile', row_to_json(v_profile),
    'wallet', v_wallet,
    'recentTransactions', v_tx,
    'recentApplications', v_apps,
    'recentRequests', v_requests,
    'complaintCount', v_complaints
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- STEP 9: admin_list_requests + admin_get_request_detail
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_requests(
  p_status text default null,
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_total bigint;
  v_rows jsonb;
begin
  select count(*) into v_total
  from public.requests r
  where (p_status is null or r.status::text = p_status)
    and (
      v_search is null
      or lower(coalesce(r.title, '')) like '%' || lower(v_search) || '%'
      or lower(coalesce(r.location, '')) like '%' || lower(v_search) || '%'
    );

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_rows
  from (
    select
      r.id,
      r.title,
      r.category,
      r.status,
      r.budget,
      r.location,
      r.client_id,
      p.name as client_name,
      r.created_at,
      (select count(*) from public.applications a where a.request_id = r.id and a.status not in ('cancelled')) as application_count
    from public.requests r
    left join public.profiles p on p.id = r.client_id
    where (p_status is null or r.status::text = p_status)
      and (
        v_search is null
        or lower(coalesce(r.title, '')) like '%' || lower(v_search) || '%'
        or lower(coalesce(r.location, '')) like '%' || lower(v_search) || '%'
      )
    order by r.created_at desc
    limit v_limit offset v_offset
  ) t;

  return jsonb_build_object('total', v_total, 'limit', v_limit, 'offset', v_offset, 'requests', v_rows);
end;
$$;

create or replace function public.admin_get_request_detail(p_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_req public.requests;
  v_client jsonb;
  v_apps jsonb;
begin
  select * into v_req from public.requests where id = p_request_id;
  if v_req.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;

  select jsonb_build_object('id', p.id, 'name', p.name, 'email', p.email, 'city', p.city)
  into v_client
  from public.profiles p where p.id = v_req.client_id;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_apps
  from (
    select
      a.id, a.helper_id, hp.name as helper_name, a.status, a.is_exclusive,
      a.proposed_amount, a.created_at
    from public.applications a
    left join public.profiles hp on hp.id = a.helper_id
    where a.request_id = p_request_id
    order by a.created_at asc
  ) t;

  return jsonb_build_object(
    'request', row_to_json(v_req),
    'client', v_client,
    'applications', v_apps
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- STEP 10: admin_list_credit_transactions
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_credit_transactions(
  p_helper_id uuid default null,
  p_type text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_total bigint;
  v_rows jsonb;
begin
  select count(*) into v_total
  from public.credit_transactions t
  where (p_helper_id is null or t.helper_id = p_helper_id)
    and (p_type is null or t.type::text = p_type);

  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) into v_rows
  from (
    select
      t.id, t.helper_id, p.name as helper_name, t.type, t.amount,
      t.balance_after, t.request_id, t.application_id, t.description, t.created_at
    from public.credit_transactions t
    left join public.profiles p on p.id = t.helper_id
    where (p_helper_id is null or t.helper_id = p_helper_id)
      and (p_type is null or t.type::text = p_type)
    order by t.created_at desc
    limit v_limit offset v_offset
  ) x;

  return jsonb_build_object('total', v_total, 'limit', v_limit, 'offset', v_offset, 'transactions', v_rows);
end;
$$;

-- ---------------------------------------------------------------------------
-- STEP 11: admin_list_audit_logs
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_audit_logs(
  p_admin_id uuid default null,
  p_action text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_total bigint;
  v_rows jsonb;
begin
  select count(*) into v_total
  from public.admin_audit_logs l
  where (p_admin_id is null or l.admin_id = p_admin_id)
    and (p_action is null or l.action = p_action);

  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) into v_rows
  from (
    select l.id, l.admin_id, l.action, l.target_type, l.target_id,
           l.reason, l.correlation_id, l.created_at
    from public.admin_audit_logs l
    where (p_admin_id is null or l.admin_id = p_admin_id)
      and (p_action is null or l.action = p_action)
    order by l.created_at desc
    limit v_limit offset v_offset
  ) x;

  return jsonb_build_object('total', v_total, 'limit', v_limit, 'offset', v_offset, 'logs', v_rows);
end;
$$;
revoke all on function public.admin_user_has_permission(uuid, text) from public;
revoke all on function public.admin_write_audit_log(uuid, text, text, text, jsonb, jsonb, text, uuid, jsonb) from public;
revoke all on function public.admin_list_users(text, text, text, int, int) from public;
revoke all on function public.admin_get_user_detail(uuid) from public;
revoke all on function public.admin_list_requests(text, text, int, int) from public;
revoke all on function public.admin_get_request_detail(uuid) from public;
revoke all on function public.admin_list_credit_transactions(uuid, text, int, int) from public;
revoke all on function public.admin_list_audit_logs(uuid, text, int, int) from public;

grant execute on function public.admin_user_has_permission(uuid, text) to service_role;
grant execute on function public.admin_write_audit_log(uuid, text, text, text, jsonb, jsonb, text, uuid, jsonb) to service_role;
grant execute on function public.admin_list_users(text, text, text, int, int) to service_role;
grant execute on function public.admin_get_user_detail(uuid) to service_role;
grant execute on function public.admin_list_requests(text, text, int, int) to service_role;
grant execute on function public.admin_get_request_detail(uuid) to service_role;
grant execute on function public.admin_list_credit_transactions(uuid, text, int, int) to service_role;
grant execute on function public.admin_list_audit_logs(uuid, text, int, int) to service_role;

notify pgrst, 'reload schema';

notify pgrst, 'reload schema';
