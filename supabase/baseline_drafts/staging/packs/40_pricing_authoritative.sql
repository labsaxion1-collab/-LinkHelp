-- =============================================================================
-- P4.0.3b staging draft — packs/40_pricing_authoritative.sql
-- Catálogo LC + políticas de modalidade (seed aprovado 2026-07-29) + compute
-- haversine + snapshot columns + publish com service_mode.
--
-- Preços LC: seed fe_SERVICE_COST_LC_v1 (FE SERVICE_COST_LC).
-- Políticas: seed humano P4.0.3b (SERVICE_MODE_INVENTORY.md). Ausência → SERVICE_MODE_POLICY_MISSING.
--
-- NÃO executar remotamente nesta etapa.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- requests.service_mode (authoritative modality). Deprecate is_remote.
-- ---------------------------------------------------------------------------
alter table public.requests
  add column if not exists is_remote boolean;

alter table public.requests
  add column if not exists service_mode text;

alter table public.requests
  drop constraint if exists requests_service_mode_check;

alter table public.requests
  add constraint requests_service_mode_check
  check (service_mode is null or service_mode in ('remote', 'in_person'));

comment on column public.requests.service_mode is
  'P4.0.3b: remote | in_person. Set at publish; locked after first application. No text regex.';
comment on column public.requests.is_remote is
  'DEPRECATED P4.0.3b — do not use for finance. Prefer service_mode.';

-- ---------------------------------------------------------------------------
-- Pricing versions / category prices / distance tiers
-- ---------------------------------------------------------------------------
create table if not exists public.lead_pricing_versions (
  id uuid primary key default gen_random_uuid(),
  version_code text not null unique,
  label text not null,
  source_note text not null,
  is_active boolean not null default false,
  region_code text null,
  created_at timestamptz not null default now(),
  activated_at timestamptz null
);

create unique index if not exists lead_pricing_versions_one_active_global_uidx
  on public.lead_pricing_versions (is_active)
  where is_active = true and region_code is null;

create table if not exists public.lead_category_prices (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.lead_pricing_versions(id) on delete restrict,
  category_id text not null,
  subcategory_id text null,
  region_code text null,
  service_cost_lc int not null check (service_cost_lc >= 0),
  source_constant text not null,
  created_at timestamptz not null default now(),
  unique (version_id, category_id, subcategory_id, region_code)
);

create index if not exists lead_category_prices_version_idx
  on public.lead_category_prices (version_id);

create table if not exists public.lead_distance_tiers (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.lead_pricing_versions(id) on delete restrict,
  max_km numeric not null,
  distance_cost_lc int not null check (distance_cost_lc >= 0),
  sort_order int not null,
  unique (version_id, sort_order)
);

-- ---------------------------------------------------------------------------
-- Subcategory service-mode policies
-- ---------------------------------------------------------------------------
create table if not exists public.lead_subcategory_service_mode_policies (
  id uuid primary key default gen_random_uuid(),
  category_id text not null,
  subcategory_id text not null,
  policy text not null check (policy in ('in_person_only', 'remote_only', 'both')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, subcategory_id)
);

comment on table public.lead_subcategory_service_mode_policies is
  'Authoritative modality per subcategory. Seed P4.0.3b approved 2026-07-29 from SERVICE_MODE_INVENTORY.md.';

-- ---------------------------------------------------------------------------
-- Application financial snapshot (immutable after insert via trigger)
-- ---------------------------------------------------------------------------
alter table public.applications
  add column if not exists lead_pricing_version_id uuid references public.lead_pricing_versions(id) on delete restrict;

alter table public.applications
  add column if not exists lead_interest_lc int;

alter table public.applications
  add column if not exists lead_service_cost_lc int;

alter table public.applications
  add column if not exists lead_distance_km numeric;

alter table public.applications
  add column if not exists lead_distance_cost_lc int;

alter table public.applications
  add column if not exists lead_total_lc int;

alter table public.applications
  add column if not exists lead_debit_lc int;

alter table public.applications
  add column if not exists lead_service_mode text;

alter table public.applications
  add column if not exists lead_priced_at timestamptz;

alter table public.applications
  drop constraint if exists applications_lead_service_mode_check;

alter table public.applications
  add constraint applications_lead_service_mode_check
  check (lead_service_mode is null or lead_service_mode in ('remote', 'in_person'));

alter table public.applications
  drop constraint if exists applications_lead_snapshot_nonneg_check;

alter table public.applications
  add constraint applications_lead_snapshot_nonneg_check
  check (
    (lead_total_lc is null and lead_debit_lc is null)
    or (
      lead_interest_lc is not null and lead_interest_lc >= 0
      and lead_service_cost_lc is not null and lead_service_cost_lc >= 0
      and lead_distance_cost_lc is not null and lead_distance_cost_lc >= 0
      and lead_total_lc is not null and lead_total_lc >= 0
      and lead_debit_lc is not null and lead_debit_lc >= 0
      and lead_total_lc = lead_interest_lc + lead_service_cost_lc + lead_distance_cost_lc
    )
  );

-- ---------------------------------------------------------------------------
-- Seed LC catalog
-- ---------------------------------------------------------------------------
do $$
declare
  v_id uuid;
begin
  select id into v_id from public.lead_pricing_versions where version_code = 'fe_SERVICE_COST_LC_v1';
  if v_id is null then
    insert into public.lead_pricing_versions (
      version_code, label, source_note, is_active, region_code, activated_at
    ) values (
      'fe_SERVICE_COST_LC_v1',
      'Frontend SERVICE_COST_LC snapshot',
      'Derived from src/utils/calculateHelperLeadCreditCost.ts SERVICE_COST_LC; other→5 fallback. Interest=4 not stored here. Distance tiers=distanceExtraLc.',
      true, null, now()
    ) returning id into v_id;

    insert into public.lead_category_prices (
      version_id, category_id, subcategory_id, region_code, service_cost_lc, source_constant
    ) values
      (v_id, 'cleaning', null, null, 7, 'SERVICE_COST_LC.cleaning'),
      (v_id, 'sanitization', null, null, 6, 'SERVICE_COST_LC.sanitization'),
      (v_id, 'beauty', null, null, 5, 'SERVICE_COST_LC.beauty'),
      (v_id, 'outdoor', null, null, 5, 'SERVICE_COST_LC.outdoor'),
      (v_id, 'tech', null, null, 6, 'SERVICE_COST_LC.tech'),
      (v_id, 'design', null, null, 6, 'SERVICE_COST_LC.design'),
      (v_id, 'marketing', null, null, 5, 'SERVICE_COST_LC.marketing'),
      (v_id, 'translation', null, null, 3, 'SERVICE_COST_LC.translation'),
      (v_id, 'pet', null, null, 3, 'SERVICE_COST_LC.pet'),
      (v_id, 'moving', null, null, 8, 'SERVICE_COST_LC.moving'),
      (v_id, 'assembly', null, null, 7, 'SERVICE_COST_LC.assembly'),
      (v_id, 'automotive', null, null, 8, 'SERVICE_COST_LC.automotive'),
      (v_id, 'renovation', null, null, 9, 'SERVICE_COST_LC.renovation'),
      (v_id, 'other', null, null, 5, 'categoryServiceCostLc_else_fallback_5');

    insert into public.lead_distance_tiers (version_id, max_km, distance_cost_lc, sort_order) values
      (v_id, 5, 0, 1),
      (v_id, 10, 1, 2),
      (v_id, 20, 2, 3),
      (v_id, 35, 4, 4),
      (v_id, 50, 7, 5),
      (v_id, 1e9, 12, 6);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Seed service-mode policies (human approval P4.0.3b — 2026-07-29)
-- Idempotent upsert. Educação e Aulas: NÃO incluída.
-- translation/*: escopo tradução/interpretação — NÃO consultoria jurídica/imigração licenciada.
-- ---------------------------------------------------------------------------
insert into public.lead_subcategory_service_mode_policies as p
  (category_id, subcategory_id, policy, notes)
values
  -- in_person_only
  ('cleaning', 'apartment', 'in_person_only', 'P4.0.3b approved'),
  ('cleaning', 'house', 'in_person_only', 'P4.0.3b approved'),
  ('cleaning', 'commercial', 'in_person_only', 'P4.0.3b approved'),
  ('cleaning', 'post_construction', 'in_person_only', 'P4.0.3b approved'),
  ('cleaning', 'moving_clean', 'in_person_only', 'P4.0.3b approved'),
  ('cleaning', 'windows', 'in_person_only', 'P4.0.3b approved'),
  ('sanitization', 'sofa', 'in_person_only', 'P4.0.3b approved'),
  ('sanitization', 'mattress', 'in_person_only', 'P4.0.3b approved'),
  ('sanitization', 'car', 'in_person_only', 'P4.0.3b approved'),
  ('sanitization', 'carpet', 'in_person_only', 'P4.0.3b approved'),
  ('moving', 'houses', 'in_person_only', 'P4.0.3b approved'),
  ('moving', 'apartments', 'in_person_only', 'P4.0.3b approved'),
  ('moving', 'offices', 'in_person_only', 'P4.0.3b approved'),
  ('moving', 'companies', 'in_person_only', 'P4.0.3b approved'),
  ('moving', 'furniture_transport', 'in_person_only', 'P4.0.3b approved'),
  ('moving', 'long_distance', 'in_person_only', 'P4.0.3b approved'),
  ('moving', 'small_moves', 'in_person_only', 'P4.0.3b approved'),
  ('assembly', 'ikea', 'in_person_only', 'P4.0.3b approved'),
  ('assembly', 'wardrobe', 'in_person_only', 'P4.0.3b approved'),
  ('assembly', 'bed', 'in_person_only', 'P4.0.3b approved'),
  ('assembly', 'table', 'in_person_only', 'P4.0.3b approved'),
  ('assembly', 'desk', 'in_person_only', 'P4.0.3b approved'),
  ('assembly', 'tv_mount', 'in_person_only', 'P4.0.3b approved'),
  ('assembly', 'curtains', 'in_person_only', 'P4.0.3b approved'),
  ('assembly', 'wall_mount', 'in_person_only', 'P4.0.3b approved'),
  ('automotive', 'tire', 'in_person_only', 'P4.0.3b approved'),
  ('automotive', 'battery', 'in_person_only', 'P4.0.3b approved'),
  ('automotive', 'jump_start', 'in_person_only', 'P4.0.3b approved'),
  ('automotive', 'wont_start', 'in_person_only', 'P4.0.3b approved'),
  ('beauty', 'nails', 'in_person_only', 'P4.0.3b approved'),
  ('beauty', 'nail_extensions', 'in_person_only', 'P4.0.3b approved'),
  ('beauty', 'barber', 'in_person_only', 'P4.0.3b approved'),
  ('beauty', 'hairdresser', 'in_person_only', 'P4.0.3b approved'),
  ('beauty', 'body_massage', 'in_person_only', 'P4.0.3b approved'),
  ('beauty', 'facial_cleansing', 'in_person_only', 'P4.0.3b approved'),
  ('beauty', 'brows', 'in_person_only', 'P4.0.3b approved'),
  ('beauty', 'waxing', 'in_person_only', 'P4.0.3b approved'),
  ('beauty', 'lashes', 'in_person_only', 'P4.0.3b approved'),
  ('renovation', 'plumbing', 'in_person_only', 'P4.0.3b approved'),
  ('renovation', 'leak', 'in_person_only', 'P4.0.3b approved'),
  ('renovation', 'shower', 'in_person_only', 'P4.0.3b approved'),
  ('renovation', 'painting', 'in_person_only', 'P4.0.3b approved'),
  ('renovation', 'roof', 'in_person_only', 'P4.0.3b approved'),
  ('renovation', 'drywall', 'in_person_only', 'P4.0.3b approved'),
  ('renovation', 'small_repairs', 'in_person_only', 'P4.0.3b approved'),
  ('outdoor', 'snow', 'in_person_only', 'P4.0.3b approved'),
  ('outdoor', 'garden', 'in_person_only', 'P4.0.3b approved'),
  ('outdoor', 'fence', 'in_person_only', 'P4.0.3b approved'),
  ('outdoor', 'exterior_clean', 'in_person_only', 'P4.0.3b approved'),
  ('outdoor', 'pool_cleaning', 'in_person_only', 'P4.0.3b approved'),
  ('pet', 'walk', 'in_person_only', 'P4.0.3b approved'),
  ('pet', 'bath', 'in_person_only', 'P4.0.3b approved'),
  ('pet', 'sitter', 'in_person_only', 'P4.0.3b approved'),
  ('tech', 'tv', 'in_person_only', 'P4.0.3b approved'),
  -- both
  ('translation', 'government', 'both', 'P4.0.3b approved — translation/interpretation only; not licensed legal advice'),
  ('translation', 'immigration', 'both', 'P4.0.3b approved — translation/interpretation only; not licensed immigration consultancy'),
  ('translation', 'school', 'both', 'P4.0.3b approved — translation/interpretation only'),
  ('translation', 'college', 'both', 'P4.0.3b approved — translation/interpretation only'),
  ('translation', 'consultation', 'both', 'P4.0.3b approved — translation/interpretation only; not licensed legal advice'),
  ('translation', 'interview', 'both', 'P4.0.3b approved — translation/interpretation only'),
  ('tech', 'format', 'both', 'P4.0.3b approved'),
  ('tech', 'wifi', 'both', 'P4.0.3b approved'),
  ('tech', 'install', 'both', 'P4.0.3b approved'),
  ('tech', 'phone', 'both', 'P4.0.3b approved'),
  ('design', 'print', 'both', 'P4.0.3b approved'),
  ('marketing', 'branding', 'both', 'P4.0.3b approved'),
  ('other', 'other', 'both', 'P4.0.3b approved'),
  -- remote_only
  ('translation', 'document', 'remote_only', 'P4.0.3b approved — translation/interpretation of documents'),
  ('design', 'logo_brand', 'remote_only', 'P4.0.3b approved'),
  ('design', 'social_media', 'remote_only', 'P4.0.3b approved'),
  ('design', 'ui_ux', 'remote_only', 'P4.0.3b approved'),
  ('design', 'presentation', 'remote_only', 'P4.0.3b approved'),
  ('design', 'photo_editing', 'remote_only', 'P4.0.3b approved'),
  ('marketing', 'social_media', 'remote_only', 'P4.0.3b approved'),
  ('marketing', 'seo', 'remote_only', 'P4.0.3b approved'),
  ('marketing', 'paid_ads', 'remote_only', 'P4.0.3b approved'),
  ('marketing', 'content', 'remote_only', 'P4.0.3b approved'),
  ('marketing', 'email', 'remote_only', 'P4.0.3b approved')
on conflict (category_id, subcategory_id) do update
set
  policy = excluded.policy,
  notes = excluded.notes,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- RLS catalogs
-- ---------------------------------------------------------------------------
alter table public.lead_pricing_versions enable row level security;
alter table public.lead_category_prices enable row level security;
alter table public.lead_distance_tiers enable row level security;
alter table public.lead_subcategory_service_mode_policies enable row level security;

drop policy if exists lead_pricing_versions_select_authenticated on public.lead_pricing_versions;
create policy lead_pricing_versions_select_authenticated
  on public.lead_pricing_versions for select to authenticated using (true);

drop policy if exists lead_category_prices_select_authenticated on public.lead_category_prices;
create policy lead_category_prices_select_authenticated
  on public.lead_category_prices for select to authenticated using (true);

drop policy if exists lead_distance_tiers_select_authenticated on public.lead_distance_tiers;
create policy lead_distance_tiers_select_authenticated
  on public.lead_distance_tiers for select to authenticated using (true);

drop policy if exists lead_service_mode_policies_select_authenticated on public.lead_subcategory_service_mode_policies;
create policy lead_service_mode_policies_select_authenticated
  on public.lead_subcategory_service_mode_policies for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Active pricing version
-- ---------------------------------------------------------------------------
create or replace function public.lead_pricing_active_version_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.lead_pricing_versions
  where is_active = true and region_code is null
  order by activated_at desc nulls last, created_at desc
  limit 1;
$$;

revoke all on function public.lead_pricing_active_version_id() from public;
grant execute on function public.lead_pricing_active_version_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Haversine km (Earth radius 6371 — matches src/utils/distance.ts)
-- ---------------------------------------------------------------------------
create or replace function public.lead_haversine_km(
  p_lat1 double precision,
  p_lng1 double precision,
  p_lat2 double precision,
  p_lng2 double precision
)
returns numeric
language plpgsql
immutable
as $$
declare
  r numeric := 6371;
  dlat numeric;
  dlng numeric;
  a numeric;
  c numeric;
begin
  if p_lat1 is null or p_lng1 is null or p_lat2 is null or p_lng2 is null then
    return null;
  end if;
  dlat := radians(p_lat2 - p_lat1);
  dlng := radians(p_lng2 - p_lng1);
  a := sin(dlat / 2) * sin(dlat / 2)
    + cos(radians(p_lat1)) * cos(radians(p_lat2)) * sin(dlng / 2) * sin(dlng / 2);
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  return round((r * c)::numeric, 3);
end;
$$;

revoke all on function public.lead_haversine_km(double precision, double precision, double precision, double precision) from public;
grant execute on function public.lead_haversine_km(double precision, double precision, double precision, double precision) to authenticated;

create or replace function public.lead_distance_cost_from_km(
  p_version_id uuid,
  p_distance_km numeric
)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cost int;
begin
  if p_distance_km is null or p_distance_km < 0 then
    raise exception 'LEAD_DISTANCE_INVALID';
  end if;

  select t.distance_cost_lc into v_cost
  from public.lead_distance_tiers t
  where t.version_id = p_version_id
    and p_distance_km <= t.max_km
  order by t.sort_order asc
  limit 1;

  if v_cost is null then
    raise exception 'LEAD_DISTANCE_TIER_MISSING';
  end if;
  return v_cost;
end;
$$;

revoke all on function public.lead_distance_cost_from_km(uuid, numeric) from public;
grant execute on function public.lead_distance_cost_from_km(uuid, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- Validate service_mode against subcategory policy
-- ---------------------------------------------------------------------------
create or replace function public.lead_validate_service_mode(
  p_category_id text,
  p_subcategory_id text,
  p_service_mode text
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_policy text;
begin
  if nullif(trim(p_category_id), '') is null then
    raise exception 'REQUEST_CATEGORY_REQUIRED';
  end if;
  if nullif(trim(p_subcategory_id), '') is null then
    raise exception 'REQUEST_SUBCATEGORY_REQUIRED';
  end if;
  if p_service_mode is null or p_service_mode not in ('remote', 'in_person') then
    raise exception 'SERVICE_MODE_REQUIRED';
  end if;

  select policy into v_policy
  from public.lead_subcategory_service_mode_policies
  where category_id = trim(p_category_id)
    and subcategory_id = trim(p_subcategory_id);

  if v_policy is null then
    raise exception 'SERVICE_MODE_POLICY_MISSING';
  end if;

  if v_policy = 'in_person_only' and p_service_mode <> 'in_person' then
    raise exception 'SERVICE_MODE_NOT_ALLOWED';
  end if;
  if v_policy = 'remote_only' and p_service_mode <> 'remote' then
    raise exception 'SERVICE_MODE_NOT_ALLOWED';
  end if;
  -- both: any of remote/in_person already validated

  return v_policy;
end;
$$;

revoke all on function public.lead_validate_service_mode(text, text, text) from public;
grant execute on function public.lead_validate_service_mode(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Authoritative quote (server-only data; never trusts FE distance/totals)
-- ---------------------------------------------------------------------------
create or replace function public.helper_compute_lead_quote(
  p_request_id uuid,
  p_helper_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  req public.requests;
  helper public.profiles;
  v_version_id uuid;
  v_service int;
  v_interest int := 4;
  v_distance_km numeric := 0;
  v_distance_cost int := 0;
  v_total int;
  v_req_lat double precision;
  v_req_lng double precision;
begin
  if p_request_id is null or p_helper_id is null then
    raise exception 'LEAD_COMPUTE_PARAMS_REQUIRED';
  end if;

  select * into req from public.requests where id = p_request_id;
  if req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  select * into helper from public.profiles where id = p_helper_id;
  if helper.id is null then
    raise exception 'HELPER_NOT_FOUND';
  end if;

  if req.service_mode is null or req.service_mode not in ('remote', 'in_person') then
    raise exception 'SERVICE_MODE_REQUIRED';
  end if;

  perform public.lead_validate_service_mode(req.category, req.subcategory, req.service_mode);

  v_version_id := public.lead_pricing_active_version_id();
  if v_version_id is null then
    raise exception 'LEAD_PRICING_VERSION_MISSING';
  end if;

  select p.service_cost_lc into v_service
  from public.lead_category_prices p
  where p.version_id = v_version_id
    and p.category_id = req.category
    and p.subcategory_id is null
    and p.region_code is null;

  if v_service is null then
    raise exception 'LEAD_CATEGORY_PRICE_MISSING';
  end if;

  if req.service_mode = 'remote' then
    v_distance_km := 0;
    v_distance_cost := 0;
  else
    v_req_lat := req.latitude::double precision;
    v_req_lng := req.longitude::double precision;
    if v_req_lat is null or v_req_lng is null
       or helper.helper_base_lat is null or helper.helper_base_lng is null then
      raise exception 'LEAD_LOCATION_INCOMPLETE';
    end if;
    v_distance_km := public.lead_haversine_km(
      v_req_lat, v_req_lng, helper.helper_base_lat, helper.helper_base_lng
    );
    if v_distance_km is null then
      raise exception 'LEAD_LOCATION_INCOMPLETE';
    end if;
    v_distance_cost := public.lead_distance_cost_from_km(v_version_id, v_distance_km);
  end if;

  v_total := v_interest + v_service + v_distance_cost;

  return jsonb_build_object(
    'pricingVersionId', v_version_id,
    'categoryId', req.category,
    'subcategoryId', req.subcategory,
    'serviceMode', req.service_mode,
    'interestLc', v_interest,
    'serviceCostLc', v_service,
    'distanceKm', v_distance_km,
    'distanceCostLc', v_distance_cost,
    'totalLc', v_total,
    'formula', 'interest(4)+service+distance',
    'source', 'server'
  );
end;
$$;

revoke all on function public.helper_compute_lead_quote(uuid, uuid) from public;
grant execute on function public.helper_compute_lead_quote(uuid, uuid) to authenticated;

-- Drop legacy stub signature that accepted FE distance
drop function if exists public.helper_compute_lead_estimated_total_lc(uuid, numeric);

create or replace function public.helper_compute_lead_estimated_total_lc(
  p_request_id uuid,
  p_helper_id uuid
)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q jsonb;
begin
  q := public.helper_compute_lead_quote(p_request_id, p_helper_id);
  return (q->>'totalLc')::int;
end;
$$;

comment on function public.helper_compute_lead_estimated_total_lc(uuid, uuid) is
  'P4.0.3b authoritative lead total. Uses DB service_mode, category prices, haversine. Never trusts FE money/distance.';

revoke all on function public.helper_compute_lead_estimated_total_lc(uuid, uuid) from public;
grant execute on function public.helper_compute_lead_estimated_total_lc(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Protect snapshot columns + lock service_mode after first application
-- ---------------------------------------------------------------------------
create or replace function public.protect_application_lead_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' then
    if NEW.lead_pricing_version_id is distinct from OLD.lead_pricing_version_id
      or NEW.lead_interest_lc is distinct from OLD.lead_interest_lc
      or NEW.lead_service_cost_lc is distinct from OLD.lead_service_cost_lc
      or NEW.lead_distance_km is distinct from OLD.lead_distance_km
      or NEW.lead_distance_cost_lc is distinct from OLD.lead_distance_cost_lc
      or NEW.lead_total_lc is distinct from OLD.lead_total_lc
      or NEW.lead_debit_lc is distinct from OLD.lead_debit_lc
      or NEW.lead_service_mode is distinct from OLD.lead_service_mode
      or NEW.lead_priced_at is distinct from OLD.lead_priced_at
      or NEW.is_exclusive is distinct from OLD.is_exclusive
    then
      if coalesce(auth.role(), '') <> 'service_role'
         and current_setting('linkhelp.allow_lead_snapshot_mutate', true) is distinct from 'on' then
        raise exception 'LEAD_SNAPSHOT_IMMUTABLE';
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_protect_application_lead_snapshot on public.applications;
create trigger trg_protect_application_lead_snapshot
  before update on public.applications
  for each row
  execute function public.protect_application_lead_snapshot();

create or replace function public.protect_request_service_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE'
     and NEW.service_mode is distinct from OLD.service_mode then
    if exists (
      select 1 from public.applications a
      where a.request_id = NEW.id
        and a.status <> 'cancelled'
    ) then
      raise exception 'SERVICE_MODE_LOCKED';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_protect_request_service_mode on public.requests;
create trigger trg_protect_request_service_mode
  before update on public.requests
  for each row
  execute function public.protect_request_service_mode();

-- ---------------------------------------------------------------------------
-- Publish: require subcategory + service_mode; validate policy; store coords for in_person
-- (replaces 20b body for staging overlay)
-- ---------------------------------------------------------------------------
create or replace function public.client_publish_request(
  p_request jsonb,
  p_extended boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  p public.profiles;
  v_cost int := 1;
  v_balance int;
  v_request_id uuid;
  v_desc text := 'Publicação de chamado';
  v_category text;
  v_subcategory text;
  v_mode text;
  v_lat numeric;
  v_lng numeric;
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_request is null or p_request = '{}'::jsonb then
    raise exception 'INVALID_REQUEST';
  end if;

  select * into p from public.profiles where id = caller for update;
  if p.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if p.role <> 'client' then raise exception 'CLIENT_ONLY'; end if;

  v_balance := coalesce(p.credits, 0);
  if v_balance < v_cost then
    raise exception 'INSUFFICIENT_CLIENT_CREDITS';
  end if;

  v_category := nullif(trim(p_request->>'category'), '');
  v_subcategory := nullif(trim(p_request->>'subcategory'), '');
  v_mode := nullif(trim(p_request->>'service_mode'), '');

  if v_category is null then
    raise exception 'INVALID_REQUEST: category required';
  end if;
  if nullif(trim(p_request->>'title'), '') is null then
    raise exception 'INVALID_REQUEST: title required';
  end if;

  perform public.lead_validate_service_mode(v_category, v_subcategory, v_mode);

  if v_mode = 'in_person' then
    v_lat := nullif(p_request->>'latitude', '')::numeric;
    v_lng := nullif(p_request->>'longitude', '')::numeric;
    if v_lat is null or v_lng is null then
      raise exception 'SERVICE_LOCATION_REQUIRED';
    end if;
  end if;

  insert into public.requests (
    client_id, category, subcategory, title, description, urgency, location,
    latitude, longitude, budget, status, address, city, region, postal_code,
    preferred_date, preferred_time_window, preferred_time, preferred_period,
    budget_type, budget_amount, currency, budget_min, budget_max, timezone, created_timezone,
    service_mode
  ) values (
    caller,
    v_category,
    v_subcategory,
    p_request->>'title',
    coalesce(p_request->>'description', ''),
    coalesce(nullif(trim(p_request->>'urgency'), ''), 'normal'),
    coalesce(p_request->>'location', ''),
    case when nullif(p_request->>'latitude', '') is not null then (p_request->>'latitude')::numeric else null end,
    case when nullif(p_request->>'longitude', '') is not null then (p_request->>'longitude')::numeric else null end,
    nullif(trim(p_request->>'budget'), ''),
    'open',
    nullif(trim(p_request->>'address'), ''),
    nullif(trim(p_request->>'city'), ''),
    nullif(trim(p_request->>'region'), ''),
    nullif(trim(p_request->>'postal_code'), ''),
    case when nullif(p_request->>'preferred_date', '') is not null then (p_request->>'preferred_date')::date else null end,
    nullif(trim(p_request->>'preferred_time_window'), ''),
    nullif(trim(p_request->>'preferred_time'), ''),
    nullif(trim(coalesce(p_request->>'preferred_period', p_request->>'preferred_time_window')), ''),
    coalesce(nullif(trim(p_request->>'budget_type'), ''), 'negotiable'),
    case when nullif(p_request->>'budget_amount', '') is not null then (p_request->>'budget_amount')::numeric else null end,
    coalesce(nullif(trim(p_request->>'currency'), ''), 'CAD'),
    case when nullif(p_request->>'budget_min', '') is not null then (p_request->>'budget_min')::numeric else null end,
    case when nullif(p_request->>'budget_max', '') is not null then (p_request->>'budget_max')::numeric else null end,
    nullif(trim(coalesce(p_request->>'timezone', p_request->>'created_timezone')), ''),
    nullif(trim(coalesce(p_request->>'created_timezone', p_request->>'timezone')), ''),
    v_mode
  )
  returning id into v_request_id;

  v_balance := v_balance - v_cost;
  update public.profiles set credits = v_balance, updated_at = now() where id = caller;

  insert into public.client_credit_ledger (
    client_id, type, amount, balance_after, request_id, description, metadata
  ) values (
    caller, 'REQUEST_PUBLISH', -v_cost, v_balance, v_request_id, v_desc,
    jsonb_build_object('request_id', v_request_id, 'service_mode', v_mode)
  );

  return jsonb_build_object(
    'request_id', v_request_id,
    'balance_after', v_balance,
    'service_mode', v_mode
  );
end;
$$;

revoke all on function public.client_publish_request(jsonb, boolean) from public;
grant execute on function public.client_publish_request(jsonb, boolean) to authenticated;
