-- =============================================================================
-- apply_update_helper_base_address.sql
-- Helper base address columns, 30-day lock, protect trigger, and RPC.
-- Idempotent — safe to run multiple times on production.
--
-- Frontend: src/services/supabase/helperBaseAddressRemote.ts
--   rpc('update_helper_base_address', { p_address, p_city, p_province, p_postal_code, p_lat, p_lng })
--
-- Prerequisite: public.profiles table exists (migration 0001+).
-- Does NOT alter credit_wallets, Stripe, onboarding, or VIP/refund flows.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Base address columns (migration 0032)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists helper_base_address text,
  add column if not exists helper_base_city text,
  add column if not exists helper_base_province text,
  add column if not exists helper_base_postal_code text,
  add column if not exists helper_base_lat double precision,
  add column if not exists helper_base_lng double precision;

comment on column public.profiles.helper_base_address is
  'Helper fixed base address used for opportunity distance, ranking, matching, and LinkCredits cost.';

comment on column public.profiles.helper_base_lat is
  'Nullable latitude for helper fixed base address. Live GPS must not be used for LinkCredits pricing.';

comment on column public.profiles.helper_base_lng is
  'Nullable longitude for helper fixed base address. Live GPS must not be used for LinkCredits pricing.';

-- ---------------------------------------------------------------------------
-- 2) Lock columns (migration 0033)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists helper_base_updated_at timestamptz,
  add column if not exists helper_base_change_unlocked_by_admin boolean not null default false;

comment on column public.profiles.helper_base_updated_at is
  'When the helper last set their fixed base address (used for 30-day change lock).';

comment on column public.profiles.helper_base_change_unlocked_by_admin is
  'When true, helper may change base address once; reset to false after successful save. FLUX admin only.';

-- Backfill lock timestamp for helpers who already saved a base address.
update public.profiles
set helper_base_updated_at = coalesce(helper_base_updated_at, updated_at, now())
where helper_base_updated_at is null
  and (
    coalesce(trim(helper_base_address), '') <> ''
    or coalesce(trim(helper_base_city), '') <> ''
  );

-- ---------------------------------------------------------------------------
-- 3) Protect direct updates to helper base fields (migration 0033)
-- ---------------------------------------------------------------------------
create or replace function public.profiles_protect_helper_base_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if coalesce(current_setting('linkhelp.allow_helper_base_update', true), '') = '1' then
      return new;
    end if;
    if coalesce(current_setting('linkhelp.admin_profile_update', true), '') = '1' then
      return new;
    end if;

    if old.helper_base_change_unlocked_by_admin is distinct from new.helper_base_change_unlocked_by_admin
       and old.helper_base_address is not distinct from new.helper_base_address
       and old.helper_base_city is not distinct from new.helper_base_city
       and old.helper_base_province is not distinct from new.helper_base_province
       and old.helper_base_postal_code is not distinct from new.helper_base_postal_code
       and old.helper_base_lat is not distinct from new.helper_base_lat
       and old.helper_base_lng is not distinct from new.helper_base_lng
       and old.helper_base_updated_at is not distinct from new.helper_base_updated_at then
      return new;
    end if;

    if old.helper_base_address is distinct from new.helper_base_address
       or old.helper_base_city is distinct from new.helper_base_city
       or old.helper_base_province is distinct from new.helper_base_province
       or old.helper_base_postal_code is distinct from new.helper_base_postal_code
       or old.helper_base_lat is distinct from new.helper_base_lat
       or old.helper_base_lng is distinct from new.helper_base_lng
       or old.helper_base_updated_at is distinct from new.helper_base_updated_at then
      raise exception 'HELPER_BASE_ADDRESS_DIRECT_UPDATE_FORBIDDEN';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_helper_base_fields on public.profiles;
create trigger profiles_protect_helper_base_fields
  before update on public.profiles
  for each row
  execute function public.profiles_protect_helper_base_fields();

-- ---------------------------------------------------------------------------
-- 4) RPC: update_helper_base_address (migration 0033)
-- ---------------------------------------------------------------------------
create or replace function public.update_helper_base_address(
  p_address text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_lat double precision,
  p_lng double precision
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
  v_has_existing boolean;
  v_unlock boolean;
  v_changed boolean;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into row from public.profiles where id = auth.uid();
  if row.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if row.role is distinct from 'helper' then
    raise exception 'NOT_HELPER';
  end if;

  v_has_existing := coalesce(trim(row.helper_base_address), '') <> ''
    or coalesce(trim(row.helper_base_city), '') <> ''
    or row.helper_base_updated_at is not null;

  v_unlock := coalesce(row.helper_base_change_unlocked_by_admin, false);

  v_changed := coalesce(nullif(trim(p_address), ''), '') is distinct from coalesce(trim(row.helper_base_address), '')
    or coalesce(nullif(trim(p_city), ''), '') is distinct from coalesce(trim(row.helper_base_city), '')
    or coalesce(nullif(trim(p_province), ''), '') is distinct from coalesce(trim(row.helper_base_province), '')
    or coalesce(nullif(trim(p_postal_code), ''), '') is distinct from coalesce(trim(row.helper_base_postal_code), '')
    or p_lat is distinct from row.helper_base_lat
    or p_lng is distinct from row.helper_base_lng;

  if not v_changed then
    return row;
  end if;

  if v_has_existing and not v_unlock then
    if row.helper_base_updated_at is not null
       and row.helper_base_updated_at > (now() - interval '30 days') then
      raise exception 'HELPER_BASE_ADDRESS_LOCKED';
    end if;
  end if;

  perform set_config('linkhelp.allow_helper_base_update', '1', true);

  update public.profiles
  set
    helper_base_address = nullif(trim(p_address), ''),
    helper_base_city = nullif(trim(p_city), ''),
    helper_base_province = nullif(trim(p_province), ''),
    helper_base_postal_code = nullif(trim(p_postal_code), ''),
    helper_base_lat = p_lat,
    helper_base_lng = p_lng,
    helper_base_updated_at = now(),
    helper_base_change_unlocked_by_admin = case when v_unlock then false else helper_base_change_unlocked_by_admin end
  where id = auth.uid()
  returning * into row;

  return row;
end;
$$;

grant execute on function public.update_helper_base_address(text, text, text, text, double precision, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- PostgREST schema cache: after running this script, reload if needed:
--   NOTIFY pgrst, 'reload schema';
-- or wait for Supabase to refresh automatically.
-- ---------------------------------------------------------------------------
