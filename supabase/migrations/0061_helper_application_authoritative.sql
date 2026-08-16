-- =============================================================================
-- 0061_helper_application_authoritative.sql
-- Authoritative helper candidatura (Normal/VIP) + LC pricing catalog + downstream hire/reject.
-- Derived from baseline drafts packs 30/40/50 with frontend-aligned seeds
-- (src/utils/calculateHelperLeadCreditCost.ts). SECURITY DEFINER uses search_path ''.
-- Does NOT apply remotely in this commit — migration file only.
-- =============================================================================

-- Extend transaction types for VIP refunds (idempotent).
alter table public.credit_transactions drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions add constraint credit_transactions_type_check check (
  type in (
    'CREDIT_PURCHASE', 'FREE_BONUS', 'OPPORTUNITY_UNLOCK', 'REFUND', 'ADMIN_ADJUSTMENT',
    'APPLICATION_INTEREST', 'APPLICATION_SELECTED', 'VIP_EXCLUSIVE_PARTIAL_REFUND',
    'VIP_APPLICATION_REJECTED_REFUND'
  )
);

drop function if exists public.helper_compute_lead_estimated_total_lc(uuid, numeric);
drop function if exists public.helper_submit_application(uuid, uuid, uuid, text, numeric, int);

alter table public.applications
  add column if not exists is_exclusive boolean not null default false;

alter table public.applications
  add column if not exists proposed_amount numeric;

alter table public.requests
  add column if not exists exclusive_helper_id uuid references public.profiles(id) on delete set null;

create index if not exists requests_exclusive_helper_idx
  on public.requests (exclusive_helper_id)
  where exclusive_helper_id is not null;

alter table public.credit_transactions
  add column if not exists request_id uuid references public.requests(id) on delete set null;

alter table public.credit_transactions
  add column if not exists application_id uuid references public.applications(id) on delete set null;

alter table public.credit_transactions
  add column if not exists balance_before int;

alter table public.credit_transactions
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists applications_request_active_idx
  on public.applications (request_id, status);

create index if not exists applications_request_exclusive_idx
  on public.applications (request_id)
  where is_exclusive = true and status in ('pending', 'viewed', 'accepted');

-- No máximo um VIP ativo por chamado (lock servidor)
create unique index if not exists applications_one_active_exclusive_uidx
  on public.applications (request_id)
  where is_exclusive = true and status in ('pending', 'viewed', 'accepted');

create index if not exists credit_transactions_request_idx
  on public.credit_transactions (request_id)
  where request_id is not null;

create unique index if not exists credit_transactions_helper_request_interest_uidx
  on public.credit_transactions (helper_id, related_opportunity_id, type)
  where type = 'APPLICATION_INTEREST' and related_opportunity_id is not null;


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

create or replace function public.lead_pricing_active_version_id()
returns uuid
language sql
stable
security definer
set search_path = ''
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
set search_path = ''
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

create or replace function public.lead_validate_service_mode(
  p_category_id text,
  p_subcategory_id text,
  p_service_mode text
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_policy text;
begin
  if nullif(trim(p_category_id), '') is null then
    raise exception 'REQUEST_CATEGORY_REQUIRED';
  end if;
  if p_service_mode is null or p_service_mode not in ('remote', 'in_person') then
    raise exception 'SERVICE_MODE_REQUIRED';
  end if;

  -- Subcategory optional: skip policy lookup when absent (category-level pricing fallback).
  if nullif(trim(p_subcategory_id), '') is null then
    return 'both';
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

  return v_policy;
end;
$$;

revoke all on function public.lead_validate_service_mode(text, text, text) from public;
grant execute on function public.lead_validate_service_mode(text, text, text) to authenticated;

create or replace function public.helper_compute_lead_quote(
  p_request_id uuid,
  p_helper_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
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
  v_category_id text;
  v_service_mode text;
  v_policy text;
begin
  if p_request_id is null or p_helper_id is null then
    raise exception 'LEAD_COMPUTE_PARAMS_REQUIRED';
  end if;

  select * into req from public.requests where id = p_request_id;
  if req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if req.status is distinct from 'open' then
    raise exception 'REQUEST_NOT_OPEN';
  end if;

  if req.expires_at is not null and req.expires_at <= now() then
    raise exception 'REQUEST_EXPIRED';
  end if;

  select * into helper from public.profiles where id = p_helper_id;
  if helper.id is null then
    raise exception 'HELPER_NOT_FOUND';
  end if;

  if helper.role is distinct from 'helper' then
    raise exception 'HELPER_ONLY';
  end if;

  v_service_mode := req.service_mode;
  if v_service_mode is null or v_service_mode not in ('remote', 'in_person') then
    if nullif(trim(req.subcategory), '') is not null then
      select p.policy into v_policy
      from public.lead_subcategory_service_mode_policies p
      where p.category_id = trim(req.category)
        and p.subcategory_id = trim(req.subcategory);

      if v_policy = 'remote_only' then
        v_service_mode := 'remote';
      elsif v_policy = 'in_person_only' then
        v_service_mode := 'in_person';
      elsif req.latitude is not null and req.longitude is not null then
        v_service_mode := 'in_person';
      elsif v_policy = 'both' then
        v_service_mode := 'remote';
      else
        raise exception 'SERVICE_MODE_REQUIRED';
      end if;
    elsif req.latitude is not null and req.longitude is not null then
      v_service_mode := 'in_person';
    else
      raise exception 'SERVICE_MODE_REQUIRED';
    end if;
  end if;

  perform public.lead_validate_service_mode(req.category, req.subcategory, v_service_mode);

  v_version_id := public.lead_pricing_active_version_id();
  if v_version_id is null then
    raise exception 'LEAD_PRICING_VERSION_MISSING';
  end if;

  v_category_id := coalesce(nullif(trim(req.category), ''), 'other');

  select p.service_cost_lc into v_service
  from public.lead_category_prices p
  where p.version_id = v_version_id
    and p.category_id = v_category_id
    and p.subcategory_id is null
    and p.region_code is null;

  if v_service is null and v_category_id <> 'other' then
    select p.service_cost_lc into v_service
    from public.lead_category_prices p
    where p.version_id = v_version_id
      and p.category_id = 'other'
      and p.subcategory_id is null
      and p.region_code is null;
  end if;

  if v_service is null then
    raise exception 'LEAD_CATEGORY_PRICE_MISSING';
  end if;

  if v_service_mode = 'remote' then
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
    'categoryId', v_category_id,
    'subcategoryId', req.subcategory,
    'serviceMode', v_service_mode,
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

create or replace function public.helper_compute_lead_estimated_total_lc(
  p_request_id uuid,
  p_helper_id uuid
)
returns int
language plpgsql
stable
security definer
set search_path = ''
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
set search_path = ''
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
set search_path = ''
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

create or replace function public.helper_debit_application_interest(
  p_helper_id uuid,
  p_request_id uuid,
  p_amount int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  w public.credit_wallets;
  bal_before int;
  bal_after int;
  tx_id uuid;
  charged_amount int;
begin
  if caller is null or caller <> p_helper_id then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_amount < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  -- Ensure row exists, then take the authoritative wallet lock BEFORE financial checks.
  perform public.ensure_helper_credit_wallet(p_helper_id);

  select * into w
  from public.credit_wallets
  where helper_id = p_helper_id
  for update;

  if w.helper_id is null then
    raise exception 'WALLET_MISSING';
  end if;

  -- Re-check idempotency after acquiring the wallet lock (retry-safe).
  select ct.id, abs(ct.amount)::int
    into tx_id, charged_amount
  from public.credit_transactions ct
  where ct.helper_id = p_helper_id
    and ct.type = 'APPLICATION_INTEREST'
    and (
      ct.related_opportunity_id = p_request_id
      or ct.request_id = p_request_id
    )
  order by ct.created_at asc
  limit 1;

  if tx_id is not null then
    return jsonb_build_object(
      'alreadyCharged', true,
      'amount', coalesce(charged_amount, p_amount),
      'transactionId', tx_id
    );
  end if;

  bal_before := w.balance;
  if bal_before < p_amount then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;
  bal_after := bal_before - p_amount;

  update public.credit_wallets
  set
    balance = bal_after,
    total_spent = total_spent + p_amount,
    updated_at = now()
  where helper_id = p_helper_id;

  begin
    insert into public.credit_transactions (
      helper_id, type, amount, balance_before, balance_after,
      related_opportunity_id, request_id, description
    ) values (
      p_helper_id, 'APPLICATION_INTEREST', -p_amount, bal_before, bal_after,
      p_request_id, p_request_id, 'Interesse em oportunidade'
    )
    returning id into tx_id;
  exception
    when unique_violation then
      -- Index-backed last line of defense; wallet UPDATE rolls back with the statement
      -- only if we re-raise. Prefer idempotent return after re-read.
      select ct.id, abs(ct.amount)::int
        into tx_id, charged_amount
      from public.credit_transactions ct
      where ct.helper_id = p_helper_id
        and ct.type = 'APPLICATION_INTEREST'
        and (
          ct.related_opportunity_id = p_request_id
          or ct.request_id = p_request_id
        )
      order by ct.created_at asc
      limit 1;

      if tx_id is null then
        raise;
      end if;

      -- Reverse this session's wallet mutation; winner already owns the ledger row.
      update public.credit_wallets
      set
        balance = bal_before,
        total_spent = greatest(0, total_spent - p_amount),
        updated_at = now()
      where helper_id = p_helper_id;

      return jsonb_build_object(
        'alreadyCharged', true,
        'amount', coalesce(charged_amount, p_amount),
        'transactionId', tx_id
      );
  end;

  return jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'balanceBefore', bal_before,
    'balanceAfter', bal_after,
    'transactionId', tx_id
  );
end;
$$;

grant execute on function public.helper_debit_application_interest(uuid, uuid, int) to authenticated;


create or replace function public.request_has_exclusive_lock(
  p_request_id uuid,
  p_helper_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.applications a
    where a.request_id = p_request_id
      and a.is_exclusive = true
      and a.status in ('pending', 'viewed', 'accepted')
      and a.helper_id <> coalesce(p_helper_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
$$;

grant execute on function public.request_has_exclusive_lock(uuid, uuid) to authenticated;


create or replace function public.sync_request_exclusive_helper_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  req_id uuid := coalesce(NEW.request_id, OLD.request_id);
  lock_helper uuid;
begin
  select a.helper_id into lock_helper
  from public.applications a
  where a.request_id = req_id
    and a.is_exclusive = true
    and a.status in ('pending', 'viewed', 'accepted')
  order by a.created_at desc
  limit 1;

  update public.requests
  set exclusive_helper_id = lock_helper
  where id = req_id;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_sync_request_exclusive_helper on public.applications;
create trigger trg_sync_request_exclusive_helper
  after insert or update of is_exclusive, status or delete
  on public.applications
  for each row
  execute function public.sync_request_exclusive_helper_id();

-- Idempotency: displace +2 and VIP reject refund
create unique index if not exists credit_transactions_vip_partial_refund_uidx
  on public.credit_transactions (helper_id, request_id, type)
  where type = 'VIP_EXCLUSIVE_PARTIAL_REFUND' and request_id is not null;

create unique index if not exists credit_transactions_vip_rejected_refund_uidx
  on public.credit_transactions (helper_id, application_id, type)
  where type = 'VIP_APPLICATION_REJECTED_REFUND' and application_id is not null;


create or replace function public.process_vip_exclusive_partial_refunds(
  p_request_id uuid,
  p_vip_helper_id uuid,
  p_vip_application_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  norm record;
  refund_amount int := 2;
  w public.credit_wallets;
  bal_before int;
  bal_after int;
  total_refunded int := 0;
  helpers_refunded int := 0;
begin
  if p_request_id is null or p_vip_helper_id is null then
    return jsonb_build_object('refundedHelpers', 0, 'totalRefunded', 0, 'skipped', true);
  end if;

  for norm in
    select a.id as application_id, a.helper_id
    from public.applications a
    where a.request_id = p_request_id
      and a.helper_id <> p_vip_helper_id
      and coalesce(a.is_exclusive, false) = false
      and a.status in ('pending', 'viewed', 'accepted')
      and a.id is distinct from p_vip_application_id
      and exists (
        select 1
        from public.credit_transactions ct
        where ct.helper_id = a.helper_id
          and ct.type = 'APPLICATION_INTEREST'
          and (
            ct.request_id = p_request_id
            or ct.related_opportunity_id = p_request_id
          )
      )
      and not exists (
        select 1
        from public.credit_transactions ct
        where ct.helper_id = a.helper_id
          and ct.type = 'VIP_EXCLUSIVE_PARTIAL_REFUND'
          and (
            ct.request_id = p_request_id
            or ct.related_opportunity_id = p_request_id
          )
      )
    order by a.helper_id asc
  loop
    insert into public.credit_wallets (helper_id)
    values (norm.helper_id)
    on conflict (helper_id) do nothing;

    select * into w
    from public.credit_wallets
    where helper_id = norm.helper_id
    for update;

    if not found then
      continue;
    end if;

    -- Re-check refund idempotency after wallet lock
    if exists (
      select 1
      from public.credit_transactions ct
      where ct.helper_id = norm.helper_id
        and ct.type = 'VIP_EXCLUSIVE_PARTIAL_REFUND'
        and (
          ct.request_id = p_request_id
          or ct.related_opportunity_id = p_request_id
        )
    ) then
      continue;
    end if;

    bal_before := w.balance;
    bal_after := bal_before + refund_amount;

    update public.credit_wallets
    set
      balance = bal_after,
      total_spent = greatest(0, total_spent - refund_amount),
      updated_at = now()
    where helper_id = norm.helper_id;

    begin
      insert into public.credit_transactions (
        helper_id, type, amount, balance_before, balance_after,
        related_opportunity_id, request_id, application_id, description, metadata
      ) values (
        norm.helper_id, 'VIP_EXCLUSIVE_PARTIAL_REFUND', refund_amount, bal_before, bal_after,
        p_request_id, p_request_id, norm.application_id,
        'Reembolso parcial por exclusividade VIP',
        jsonb_build_object(
          'vip_application_id', p_vip_application_id,
          'vip_helper_id', p_vip_helper_id,
          'refund_reason', 'vip_exclusive_displacement',
          'refund_amount_lc', refund_amount
        )
      );
    exception
      when unique_violation then
        update public.credit_wallets
        set
          balance = bal_before,
          total_spent = total_spent + refund_amount,
          updated_at = now()
        where helper_id = norm.helper_id;
        continue;
    end;

    insert into public.notifications (
      user_id, type, title, description, action_url, read
    ) values (
      norm.helper_id, 'payment', 'Reembolso parcial recebido',
      'Sua candidatura foi substituída por uma candidatura VIP exclusiva. Devolvemos 2 LinkCredits para sua carteira.',
      '/helper/credits', false
    );

    begin
      perform private.enqueue_push(
        norm.helper_id,
        'Reembolso parcial recebido',
        'Sua candidatura foi substituída por uma candidatura VIP exclusiva. Devolvemos 2 LinkCredits para sua carteira.',
        '/helper/credits'
      );
    exception
      when undefined_function or invalid_schema_name then
        null;
    end;

    total_refunded := total_refunded + refund_amount;
    helpers_refunded := helpers_refunded + 1;
  end loop;

  return jsonb_build_object(
    'refundedHelpers', helpers_refunded,
    'totalRefunded', total_refunded
  );
end;
$$;

-- ---------------------------------------------------------------------------

create or replace function public.process_vip_application_rejected_refund(
  p_application_id uuid,
  p_helper_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  debit_amount int := 0;
  refund_amount int := 0;
  w public.credit_wallets;
  bal_before int;
  bal_after int;
  tx_description text := 'Candidatura VIP recusada. 50% dos LinkCredits foram reembolsados.';
begin
  if p_application_id is null or p_helper_id is null or p_request_id is null then
    return jsonb_build_object('skipped', true, 'reason', 'missing_params');
  end if;

  if exists (
    select 1
    from public.credit_transactions ct
    where ct.helper_id = p_helper_id
      and ct.type = 'VIP_APPLICATION_REJECTED_REFUND'
      and ct.application_id = p_application_id
  ) then
    return jsonb_build_object(
      'alreadyRefunded', true,
      'refundAmount', 0,
      'applicationId', p_application_id
    );
  end if;

  select abs(ct.amount)::int into debit_amount
  from public.credit_transactions ct
  where ct.helper_id = p_helper_id
    and ct.type = 'APPLICATION_INTEREST'
    and ct.amount < 0
    and (
      ct.application_id = p_application_id
      or ct.request_id = p_request_id
      or ct.related_opportunity_id = p_request_id
    )
  order by
    case when ct.application_id = p_application_id then 0 else 1 end,
    ct.created_at desc
  limit 1;

  if debit_amount is null or debit_amount <= 0 then
    return jsonb_build_object(
      'skipped', true,
      'reason', 'no_debit_found',
      'applicationId', p_application_id
    );
  end if;

  refund_amount := ceil(debit_amount::numeric / 2)::int;

  if refund_amount <= 0 then
    return jsonb_build_object(
      'skipped', true,
      'reason', 'zero_refund',
      'debitAmount', debit_amount,
      'applicationId', p_application_id
    );
  end if;

  insert into public.credit_wallets (helper_id)
  values (p_helper_id)
  on conflict (helper_id) do nothing;

  select * into w
  from public.credit_wallets
  where helper_id = p_helper_id
  for update;

  if not found then
    return jsonb_build_object('skipped', true, 'reason', 'wallet_missing');
  end if;

  -- Re-check after wallet lock
  if exists (
    select 1
    from public.credit_transactions ct
    where ct.helper_id = p_helper_id
      and ct.type = 'VIP_APPLICATION_REJECTED_REFUND'
      and ct.application_id = p_application_id
  ) then
    return jsonb_build_object(
      'alreadyRefunded', true,
      'refundAmount', 0,
      'applicationId', p_application_id
    );
  end if;

  bal_before := w.balance;
  bal_after := bal_before + refund_amount;

  update public.credit_wallets
  set
    balance = bal_after,
    total_spent = greatest(0, total_spent - refund_amount),
    updated_at = now()
  where helper_id = p_helper_id;

  begin
    insert into public.credit_transactions (
      helper_id, type, amount, balance_before, balance_after,
      related_opportunity_id, request_id, application_id, description, metadata
    ) values (
      p_helper_id, 'VIP_APPLICATION_REJECTED_REFUND', refund_amount, bal_before, bal_after,
      p_request_id, p_request_id, p_application_id, tx_description,
      jsonb_build_object(
        'refund_reason', 'vip_application_rejected',
        'refund_rule', 'ceil_vip_charge_div_2',
        'original_debit_lc', debit_amount,
        'refund_amount_lc', refund_amount,
        'application_id', p_application_id
      )
    );
  exception
    when unique_violation then
      update public.credit_wallets
      set
        balance = bal_before,
        total_spent = total_spent + refund_amount,
        updated_at = now()
      where helper_id = p_helper_id;
      return jsonb_build_object(
        'alreadyRefunded', true,
        'refundAmount', 0,
        'applicationId', p_application_id
      );
  end;

  return jsonb_build_object(
    'refunded', true,
    'refundAmount', refund_amount,
    'debitAmount', debit_amount,
    'balanceBefore', bal_before,
    'balanceAfter', bal_after,
    'applicationId', p_application_id
  );
end;
$$;

grant execute on function public.process_vip_application_rejected_refund(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------

create or replace function public.client_reject_application(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  app public.applications;
  lock_helper uuid;
  action_path text;
  notif_title text := 'Candidatura VIP recusada';
  notif_body text := 'O cliente recusou sua candidatura. 50% dos seus LinkCredits foram devolvidos.';
  refund_result jsonb := '{}'::jsonb;
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into app
  from public.applications
  where id = p_application_id
  for update;

  if app.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if app.client_id <> caller then
    raise exception 'NOT_ALLOWED';
  end if;

  if app.status = 'rejected' then
    if coalesce(app.is_exclusive, false) then
      refund_result := public.process_vip_application_rejected_refund(
        app.id, app.helper_id, app.request_id
      );
    end if;

    return jsonb_build_object(
      'applicationId', app.id,
      'requestId', app.request_id,
      'status', app.status,
      'alreadyRejected', true,
      'isExclusive', coalesce(app.is_exclusive, false),
      'refund', refund_result
    );
  end if;

  if app.status not in ('pending', 'viewed') then
    raise exception 'INVALID_STATUS';
  end if;

  update public.applications
  set status = 'rejected', updated_at = now()
  where id = p_application_id;

  if coalesce(app.is_exclusive, false) then
    select a.helper_id into lock_helper
    from public.applications a
    where a.request_id = app.request_id
      and a.is_exclusive = true
      and a.status in ('pending', 'viewed', 'accepted')
    order by a.created_at desc
    limit 1;

    update public.requests
    set
      exclusive_helper_id = lock_helper,
      updated_at = now()
    where id = app.request_id;

    refund_result := public.process_vip_application_rejected_refund(
      app.id, app.helper_id, app.request_id
    );

    action_path := '/helper/dashboard?request=' || app.request_id::text;

    if not exists (
      select 1
      from public.notifications n
      where n.user_id = app.helper_id
        and n.type = 'application'
        and n.title = notif_title
        and n.description = notif_body
        and n.action_url = action_path
        and n.created_at > now() - interval '24 hours'
    ) then
      insert into public.notifications (user_id, type, title, description, action_url, read)
      values (app.helper_id, 'application', notif_title, notif_body, action_path, false);

      begin
        perform private.enqueue_push(
          app.helper_id, notif_title, notif_body, action_path
        );
      exception
        when undefined_function or invalid_schema_name then
          null;
      end;
    end if;
  end if;

  return jsonb_build_object(
    'applicationId', app.id,
    'requestId', app.request_id,
    'status', 'rejected',
    'isExclusive', coalesce(app.is_exclusive, false),
    'exclusiveHelperResynced', coalesce(app.is_exclusive, false),
    'refund', refund_result
  );
end;
$$;

grant execute on function public.client_reject_application(uuid) to authenticated;

-- ---------------------------------------------------------------------------

-- helper_submit_application — única assinatura autoritativa
-- ---------------------------------------------------------------------------
drop function if exists public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean);

create or replace function public.helper_submit_application(
  p_request_id uuid,
  p_helper_id uuid,
  p_client_id uuid,
  p_message text default null,
  p_proposed_amount numeric default null,
  p_interest_amount int default null,
  p_is_exclusive boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  app_id uuid;
  conv_id uuid;
  req_title text;
  helper_name text;
  proposal_part text;
  active_count int := 0;
  unlock_id uuid;
  vip_refund_result jsonb := '{}'::jsonb;
  has_unlock_fn boolean := false;
  authoritative_charge int;
  quote jsonb;
  snap_total int;
  snap_interest int;
  snap_service int;
  snap_distance_cost int;
  snap_distance_km numeric;
  snap_version uuid;
  snap_mode text;
  req public.requests;
  debit_result jsonb;
begin
  select exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'upsert_pending_opportunity_unlock'
  ) into has_unlock_fn;

  if caller is null or caller <> p_helper_id then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_helper_id = p_client_id then
    raise exception 'SELF_REQUEST';
  end if;

  -- Authoritative quote BEFORE any locks/side effects (policy/location/pricing abort here)
  quote := public.helper_compute_lead_quote(p_request_id, p_helper_id);
  snap_total := (quote->>'totalLc')::int;
  snap_interest := (quote->>'interestLc')::int;
  snap_service := (quote->>'serviceCostLc')::int;
  snap_distance_cost := (quote->>'distanceCostLc')::int;
  snap_distance_km := (quote->>'distanceKm')::numeric;
  snap_version := (quote->>'pricingVersionId')::uuid;
  snap_mode := quote->>'serviceMode';

  if coalesce(p_is_exclusive, false) then
    authoritative_charge := snap_total + 4;
    if p_interest_amount is not null and p_interest_amount <> authoritative_charge then
      raise exception 'INTEREST_AMOUNT_MISMATCH';
    end if;
  else
    authoritative_charge := 4;
    if p_interest_amount is not null and p_interest_amount <> 4 then
      raise exception 'INTEREST_AMOUNT_MISMATCH';
    end if;
  end if;

  -- LOCK 1: request row (serializes VIP lock + application insert race)
  select * into req
  from public.requests
  where id = p_request_id
  for update;

  if req.id is null
     or req.client_id is distinct from p_client_id
     or req.status is distinct from 'open' then
    raise exception 'REQUEST_NOT_OPEN';
  end if;

  if req.expires_at is not null and req.expires_at <= now() then
    raise exception 'REQUEST_EXPIRED';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_helper_id and p.role = 'helper'
  ) then
    raise exception 'HELPER_ONLY';
  end if;

  -- Re-check after request lock (idempotent retry)
  select id into app_id
  from public.applications
  where request_id = p_request_id
    and helper_id = p_helper_id
    and status <> 'cancelled'
  limit 1;

  if app_id is not null then
    conv_id := public.ensure_conversation(p_request_id, p_client_id, p_helper_id, false);
    if has_unlock_fn then
      unlock_id := public.upsert_pending_opportunity_unlock(
        p_request_id, p_helper_id, authoritative_charge, app_id
      );
    end if;
    return jsonb_build_object(
      'alreadyExists', true,
      'applicationId', app_id,
      'conversationId', conv_id,
      'created', false,
      'unlockId', unlock_id,
      'interestCharged', authoritative_charge
    );
  end if;

  if exists (
    select 1
    from public.applications
    where request_id = p_request_id
      and is_exclusive = true
      and status in ('pending', 'viewed', 'accepted')
  ) then
    raise exception 'EXCLUSIVE_APPLICATION_LOCKED';
  end if;

  select count(*)::int into active_count
  from public.applications
  where request_id = p_request_id
    and status in ('pending', 'viewed', 'accepted');

  -- Cap 3 only for normal candidaturas; VIP bypasses
  if not coalesce(p_is_exclusive, false) and active_count >= 3 then
    raise exception 'APPLICATION_LIMIT_REACHED';
  end if;

  -- LOCK 2: acting helper wallet (inside debit) + re-check APPLICATION_INTEREST
  debit_result := public.helper_debit_application_interest(
    p_helper_id,
    p_request_id,
    authoritative_charge
  );

  begin
    insert into public.applications (
      request_id, helper_id, client_id, message, proposed_amount, is_exclusive, status,
      lead_pricing_version_id, lead_interest_lc, lead_service_cost_lc, lead_distance_km,
      lead_distance_cost_lc, lead_total_lc, lead_debit_lc, lead_service_mode, lead_priced_at
    ) values (
      p_request_id,
      p_helper_id,
      p_client_id,
      p_message,
      p_proposed_amount,
      coalesce(p_is_exclusive, false),
      'pending',
      snap_version,
      snap_interest,
      snap_service,
      snap_distance_km,
      snap_distance_cost,
      snap_total,
      authoritative_charge,
      snap_mode,
      now()
    )
    returning id into app_id;
  exception
    when unique_violation then
      -- Same helper active app, or second concurrent VIP (exclusive uidx).
      select id into app_id
      from public.applications
      where request_id = p_request_id
        and helper_id = p_helper_id
        and status <> 'cancelled'
      limit 1;
      if app_id is null then
        -- Lost VIP race: debit/application work aborts with the exception → full rollback
        raise exception 'EXCLUSIVE_APPLICATION_LOCKED';
      end if;
      conv_id := public.ensure_conversation(p_request_id, p_client_id, p_helper_id, false);
      if has_unlock_fn then
        unlock_id := public.upsert_pending_opportunity_unlock(
          p_request_id, p_helper_id, authoritative_charge, app_id
        );
      end if;
      return jsonb_build_object(
        'alreadyExists', true,
        'applicationId', app_id,
        'conversationId', conv_id,
        'created', false,
        'unlockId', unlock_id,
        'interestCharged', authoritative_charge,
        'debit', debit_result
      );
  end;

  if has_unlock_fn then
    unlock_id := public.upsert_pending_opportunity_unlock(
      p_request_id, p_helper_id, authoritative_charge, app_id
    );
  end if;

  conv_id := public.ensure_conversation(p_request_id, p_client_id, p_helper_id, false);

  if coalesce(p_is_exclusive, false) then
    update public.requests
    set exclusive_helper_id = p_helper_id
    where id = p_request_id;

    -- LOCK 3: displaced helper wallets ASC inside process_vip_exclusive_partial_refunds
    vip_refund_result := public.process_vip_exclusive_partial_refunds(
      p_request_id,
      p_helper_id,
      app_id
    );
  end if;

  select title into req_title from public.requests where id = p_request_id;
  select name into helper_name from public.profiles where id = p_helper_id;

  proposal_part := case
    when p_proposed_amount is not null then
      ' sent a proposal of CAD $' || round(p_proposed_amount)::text || ' for "' || coalesce(req_title, 'Request') || '".'
    else
      ' applied to "' || coalesce(req_title, 'Request') || '".'
  end;

  insert into public.notifications (
    user_id, type, title, description, action_url, read
  ) values (
    p_client_id,
    'application',
    'New application',
    coalesce(helper_name, 'A helper') || proposal_part,
    '/client/dashboard',
    false
  );

  return jsonb_build_object(
    'alreadyExists', false,
    'applicationId', app_id,
    'conversationId', conv_id,
    'created', true,
    'isExclusive', coalesce(p_is_exclusive, false),
    'interestCharged', authoritative_charge,
    'leadTotalLc', snap_total,
    'leadQuote', quote,
    'vipPartialRefunds', vip_refund_result,
    'unlockId', unlock_id,
    'debit', debit_result
  );
end;
$$;

grant execute on function public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean) to authenticated;

-- ---------------------------------------------------------------------------

-- Hire protections (P4.0.2a) — replace 0034 bodies for staging overlay only
-- ---------------------------------------------------------------------------
create or replace function public.charge_helper_on_client_hire(
  p_application_id uuid,
  p_amount int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  app public.applications;
  req public.requests;
  expected int;
begin
  if caller is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into app from public.applications where id = p_application_id;
  if app.id is null then raise exception 'NOT_FOUND'; end if;
  select * into req from public.requests where id = app.request_id;
  if req.client_id <> caller then raise exception 'NOT_ALLOWED'; end if;

  if coalesce(app.is_exclusive, false) then
    if p_amount is distinct from 0 then
      raise exception 'VIP_HIRE_MUST_BE_ZERO';
    end if;
    return jsonb_build_object('success', true, 'amount', 0, 'skipped', true, 'reason', 'vip_hire_zero');
  end if;

  if app.lead_total_lc is null then
    raise exception 'LEAD_SNAPSHOT_MISSING';
  end if;
  expected := greatest(0, app.lead_total_lc - 4);
  if p_amount is distinct from expected then
    raise exception 'HIRE_CHARGE_MISMATCH';
  end if;

  return public.helper_debit_application_selected(app.helper_id, app.request_id, app.id, p_amount);
end;
$$;

create or replace function public.client_accept_proposal(
  p_application_id uuid,
  p_charge_amount int default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  app public.applications;
  req public.requests;
  conv_id uuid;
  accepted_amt numeric;
  value_hint text;
  scheduled_at timestamptz;
  client_name text;
  client_avatar text;
  expected_charge int;
  effective_charge int;
  has_vip_lock boolean := false;
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into app from public.applications where id = p_application_id for update;
  if app.id is null then
    raise exception 'NOT_FOUND';
  end if;

  select * into req from public.requests where id = app.request_id for update;
  if req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if req.client_id <> caller then
    raise exception 'NOT_ALLOWED';
  end if;

  if app.request_id <> req.id or app.client_id <> req.client_id then
    raise exception 'APPLICATION_MISMATCH';
  end if;

  if app.status in ('cancelled', 'rejected') then
    raise exception 'APPLICATION_NOT_ACTIVE';
  end if;

  select exists (
    select 1
    from public.applications a
    where a.request_id = req.id
      and a.is_exclusive = true
      and a.status in ('pending', 'viewed', 'accepted')
  ) into has_vip_lock;

  if coalesce(app.is_exclusive, false) then
    if not has_vip_lock then
      raise exception 'VIP_HIRE_LOCK_MISSING';
    end if;
    if req.exclusive_helper_id is distinct from app.helper_id then
      raise exception 'VIP_HIRE_LOCK_MISMATCH';
    end if;
    if p_charge_amount is not null and p_charge_amount <> 0 then
      raise exception 'VIP_HIRE_MUST_BE_ZERO';
    end if;
    effective_charge := 0;
  else
    if has_vip_lock or req.exclusive_helper_id is not null then
      raise exception 'VIP_LOCK_ACTIVE_NORMAL_HIRE_FORBIDDEN';
    end if;

    if app.lead_total_lc is null then
      raise exception 'LEAD_SNAPSHOT_MISSING';
    end if;
    expected_charge := greatest(0, app.lead_total_lc - 4);
    if expected_charge = 0 then
      if p_charge_amount is not null and p_charge_amount <> 0 then
        raise exception 'HIRE_CHARGE_MISMATCH';
      end if;
      effective_charge := 0;
    else
      if p_charge_amount is distinct from expected_charge then
        raise exception 'HIRE_CHARGE_MISMATCH';
      end if;
      effective_charge := expected_charge;
    end if;
  end if;

  if effective_charge > 0 and app.status <> 'accepted' then
    perform public.helper_debit_application_selected(
      app.helper_id,
      app.request_id,
      app.id,
      effective_charge
    );
  end if;

  if app.status <> 'accepted' then
    update public.applications set status = 'accepted', updated_at = now() where id = app.id;

    update public.requests set status = 'in_progress', updated_at = now() where id = req.id;

    accepted_amt := app.proposed_amount;
    if accepted_amt is not null then
      value_hint := 'CAD $' || round(accepted_amt)::text;
      update public.requests
      set accepted_amount = accepted_amt,
          budget = value_hint,
          updated_at = now()
      where id = req.id;
    end if;

    update public.applications
    set status = 'rejected', updated_at = now()
    where request_id = app.request_id
      and id <> app.id
      and status in ('pending', 'viewed');

    if not exists (
      select 1 from public.upcoming_jobs
      where request_id = app.request_id and helper_id = app.helper_id
    ) then
      select coalesce(p.name, 'Client'), p.avatar_url
      into client_name, client_avatar
      from public.profiles p
      where p.id = req.client_id;

      scheduled_at := now() + interval '48 hours';

      insert into public.upcoming_jobs (
        request_id, helper_id, client_name, client_avatar, title, category,
        description, location, value_hint, urgency, scheduled_at, workflow_status
      ) values (
        app.request_id, app.helper_id, client_name, client_avatar, req.title, req.category,
        req.description, req.location, coalesce(value_hint, req.budget),
        coalesce(req.urgency, 'normal'), scheduled_at, 'scheduled'
      );
    end if;
  end if;

  conv_id := public.ensure_conversation(
    app.request_id,
    app.client_id,
    app.helper_id,
    true
  );

  begin
    insert into public.notifications (user_id, type, title, description, action_url, read)
    values (
      app.helper_id,
      'application',
      'Official hire',
      case
        when accepted_amt is not null then
          format('Your proposal of CAD $%s was accepted for "%s". Chat is now open.', round(accepted_amt), req.title)
        else
          format('The client officially hired you for "%s". Chat is now open.', req.title)
      end,
      '/messages?c=' || conv_id::text,
      false
    );
  exception when others then
    null;
  end;

  begin
    insert into public.notifications (user_id, type, title, description, action_url, read)
    values (
      app.client_id,
      'application',
      'Helper hired',
      format('You can now chat with your helper about "%s".', req.title),
      '/messages?c=' || conv_id::text,
      false
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'conversationId', conv_id,
    'requestId', app.request_id,
    'applicationId', app.id,
    'helperId', app.helper_id,
    'requestStatus', 'in_progress',
    'applicationStatus', 'accepted',
    'chargeAmount', effective_charge,
    'isExclusive', coalesce(app.is_exclusive, false)
  );
end;
$$;

revoke all on function public.process_vip_exclusive_partial_refunds(uuid, uuid, uuid) from public;
grant execute on function public.process_vip_exclusive_partial_refunds(uuid, uuid, uuid) to authenticated;

revoke all on function public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean) from public;

revoke all on function public.charge_helper_on_client_hire(uuid, int) from public;
grant execute on function public.charge_helper_on_client_hire(uuid, int) to authenticated;

revoke all on function public.client_accept_proposal(uuid, int) from public;
grant execute on function public.client_accept_proposal(uuid, int) to authenticated;

revoke all on function public.helper_debit_application_interest(uuid, uuid, int) from public;
revoke all on function public.request_has_exclusive_lock(uuid, uuid) from public;
revoke all on function public.client_reject_application(uuid) from public;
revoke all on function public.process_vip_application_rejected_refund(uuid, uuid, uuid) from public;

