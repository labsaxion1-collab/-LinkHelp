-- =============================================================================
-- 0055_flux_admin_management.sql
-- FLUX Administrators — foundation mínima + invites + admins.manage (idempotent).
-- Staging-first. service_role API only for admin_* tables.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Foundation: roles / permissions / assignments / audit
-- ---------------------------------------------------------------------------
create table if not exists public.admin_roles (
  id text primary key,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

insert into public.admin_roles (id, label, description) values
  ('super_admin', 'Superadministrador', 'Acesso total, incluindo gestão de administradores'),
  ('operations_admin', 'Administrador', 'Operações e leituras BackOffice'),
  ('finance_admin', 'Finance Admin', 'LinkCredits ledger and economy read'),
  ('support_agent', 'Support Agent', 'Support view read-only'),
  ('analyst_readonly', 'Analyst Read-only', 'Dashboards and aggregates only')
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description;

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
  ('economy.write', 'Economy write', 'P1 — versioned config changes'),
  ('admins.manage', 'Admins manage', 'Invite, role change, activate/deactivate administrators')
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description;

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

-- admins.manage only for super_admin (explicit; already covered by super_admin cross-join)
insert into public.admin_role_permissions (role_id, permission_id)
values ('super_admin', 'admins.manage')
on conflict do nothing;

create table if not exists public.admin_user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id text not null references public.admin_roles(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

alter table public.admin_user_roles
  add column if not exists status text;

alter table public.admin_user_roles
  add column if not exists created_at timestamptz;

alter table public.admin_user_roles
  add column if not exists updated_at timestamptz;

update public.admin_user_roles
set
  status = coalesce(nullif(status, ''), 'active'),
  created_at = coalesce(created_at, granted_at, now()),
  updated_at = coalesce(updated_at, granted_at, now())
where status is null
   or created_at is null
   or updated_at is null;

alter table public.admin_user_roles
  alter column status set default 'active';

alter table public.admin_user_roles
  alter column created_at set default now();

alter table public.admin_user_roles
  alter column updated_at set default now();

alter table public.admin_user_roles
  alter column status set not null;

alter table public.admin_user_roles
  alter column created_at set not null;

alter table public.admin_user_roles
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'admin_user_roles_status_check'
      and conrelid = 'public.admin_user_roles'::regclass
  ) then
    alter table public.admin_user_roles
      add constraint admin_user_roles_status_check
      check (status in ('active', 'inactive', 'revoked'));
  end if;
end $$;

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
drop policy if exists admin_audit_logs_deny_all on public.admin_audit_logs;
create policy admin_audit_logs_deny_all on public.admin_audit_logs
  for all to authenticated using (false) with check (false);

alter table public.admin_user_roles enable row level security;
drop policy if exists admin_user_roles_deny_all on public.admin_user_roles;
create policy admin_user_roles_deny_all on public.admin_user_roles
  for all to authenticated using (false) with check (false);

alter table public.admin_roles enable row level security;
drop policy if exists admin_roles_deny_all on public.admin_roles;
create policy admin_roles_deny_all on public.admin_roles
  for all to authenticated using (false) with check (false);

alter table public.admin_permissions enable row level security;
drop policy if exists admin_permissions_deny_all on public.admin_permissions;
create policy admin_permissions_deny_all on public.admin_permissions
  for all to authenticated using (false) with check (false);

alter table public.admin_role_permissions enable row level security;
drop policy if exists admin_role_permissions_deny_all on public.admin_role_permissions;
create policy admin_role_permissions_deny_all on public.admin_role_permissions
  for all to authenticated using (false) with check (false);

-- ---------------------------------------------------------------------------
-- 2) Invites
-- ---------------------------------------------------------------------------
create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null,
  role_id text not null references public.admin_roles(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  token_hash text not null,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists admin_invites_pending_email_uidx
  on public.admin_invites (email_normalized)
  where status = 'pending';

create index if not exists admin_invites_status_created_idx
  on public.admin_invites (status, created_at desc);

alter table public.admin_invites enable row level security;
drop policy if exists admin_invites_deny_all on public.admin_invites;
create policy admin_invites_deny_all on public.admin_invites
  for all to authenticated using (false) with check (false);

-- ---------------------------------------------------------------------------
-- 3) Helpers — active role required for permission checks
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
      and ur.status = 'active'
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

revoke all on function public.admin_user_has_permission(uuid, text) from public;
revoke all on function public.admin_write_audit_log(uuid, text, text, text, jsonb, jsonb, text, uuid, jsonb) from public;
grant execute on function public.admin_user_has_permission(uuid, text) to service_role;
grant execute on function public.admin_write_audit_log(uuid, text, text, text, jsonb, jsonb, text, uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 4) Signup: pending admin invite → do not create client/helper profile
-- ---------------------------------------------------------------------------
create or replace function public.linkhelp_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
  avatar text;
  v_region text;
  v_accepted_terms boolean;
  v_accepted_terms_at timestamptz;
  v_helper_terms boolean;
  v_helper_terms_at timestamptz;
  v_provider text;
  v_preferred text;
  v_spoken text[];
  profile_row public.profiles;
  v_email_norm text;
begin
  v_email_norm := lower(trim(coalesce(new.email, '')));

  if v_email_norm <> ''
     and to_regclass('public.admin_invites') is not null
     and exists (
       select 1
       from public.admin_invites i
       where i.email_normalized = v_email_norm
         and i.status = 'pending'
         and i.expires_at > now()
     )
  then
    -- FLUX invite: Auth user only — no marketplace Client/Help profile
    return new;
  end if;

  r := coalesce(new.raw_user_meta_data->>'user_type', 'client');
  if r not in ('client', 'helper') then
    r := 'client';
  end if;

  avatar := nullif(trim(coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    ''
  )), '');

  v_region := nullif(trim(coalesce(
    new.raw_user_meta_data->>'region',
    new.raw_user_meta_data->>'province',
    ''
  )), '');

  v_provider := coalesce(new.raw_app_meta_data->>'provider', '');
  v_accepted_terms := coalesce(nullif(new.raw_user_meta_data->>'accepted_terms', '')::boolean, false)
    or (v_provider = 'google');

  if v_accepted_terms then
    v_accepted_terms_at := coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'accepted_terms_at', '')), '')::timestamptz,
      now()
    );
  else
    v_accepted_terms_at := null;
  end if;

  v_helper_terms := coalesce(nullif(new.raw_user_meta_data->>'helper_terms_accepted', '')::boolean, false);
  if v_helper_terms then
    v_helper_terms_at := coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'helper_terms_accepted_at', '')), '')::timestamptz,
      now()
    );
  else
    v_helper_terms_at := null;
  end if;

  v_preferred := nullif(trim(coalesce(new.raw_user_meta_data->>'preferred_language', 'pt')), '');

  if jsonb_typeof(new.raw_user_meta_data->'spoken_languages') = 'array' then
    select coalesce(array_agg(value), array[]::text[])
    into v_spoken
    from jsonb_array_elements_text(new.raw_user_meta_data->'spoken_languages') as lang(value)
    where nullif(trim(value), '') is not null;
  else
    v_spoken := case when v_preferred is null then array[]::text[] else array[v_preferred] end;
  end if;

  insert into public.profiles (
    id, name, email, avatar_url, role, credits, city, region, country, phone,
    preferred_language, spoken_languages, accepted_terms, accepted_terms_at,
    helper_terms_accepted, helper_terms_accepted_at
  )
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), ''),
    new.email,
    avatar,
    r,
    0,
    nullif(trim(coalesce(new.raw_user_meta_data->>'city', '')), ''),
    v_region,
    nullif(trim(coalesce(new.raw_user_meta_data->>'country', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
    v_preferred,
    v_spoken,
    v_accepted_terms,
    v_accepted_terms_at,
    v_helper_terms,
    v_helper_terms_at
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    city = coalesce(public.profiles.city, excluded.city),
    region = coalesce(public.profiles.region, excluded.region),
    country = coalesce(public.profiles.country, excluded.country),
    phone = coalesce(public.profiles.phone, excluded.phone),
    preferred_language = coalesce(public.profiles.preferred_language, excluded.preferred_language),
    spoken_languages = case
      when cardinality(excluded.spoken_languages) > 0 then excluded.spoken_languages
      else public.profiles.spoken_languages
    end,
    accepted_terms = public.profiles.accepted_terms or excluded.accepted_terms,
    accepted_terms_at = coalesce(public.profiles.accepted_terms_at, excluded.accepted_terms_at),
    helper_terms_accepted = public.profiles.helper_terms_accepted or excluded.helper_terms_accepted,
    helper_terms_accepted_at = coalesce(public.profiles.helper_terms_accepted_at, excluded.helper_terms_accepted_at),
    updated_at = now()
  returning * into profile_row;

  if profile_row.role = 'helper' and to_regprocedure('public.ensure_helper_credit_wallet(uuid)') is not null then
    execute 'select public.ensure_helper_credit_wallet($1)' using profile_row.id;
  elsif profile_row.role = 'client' and to_regprocedure('public.ensure_client_signup_credits(uuid)') is not null then
    execute 'select public.ensure_client_signup_credits($1)' using profile_row.id;
  end if;

  return new;
end;
$$;

drop trigger if exists linkhelp_on_auth_user_created on auth.users;
create trigger linkhelp_on_auth_user_created
  after insert on auth.users
  for each row execute function public.linkhelp_handle_new_user();

notify pgrst, 'reload schema';
