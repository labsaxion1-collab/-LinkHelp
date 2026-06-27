-- =============================================================================
-- apply_client_publish_request_debit.sql
-- Client pays 1 LC atomically when publishing a request.
-- Does NOT alter helper credit_wallets, Stripe, VIP/refund, or stash flows.
-- Prerequisite: profiles.credits, client_credit_ledger (apply_client_welcome_30_onboarding).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Ledger request_id + idempotency index
-- ---------------------------------------------------------------------------
alter table public.client_credit_ledger
  add column if not exists request_id uuid references public.requests (id) on delete set null;

comment on column public.client_credit_ledger.request_id is
  'Optional link to requests.id for publish/debit audit rows (e.g. REQUEST_PUBLISH).';

create unique index if not exists client_credit_ledger_request_publish_uidx
  on public.client_credit_ledger (request_id)
  where type = 'REQUEST_PUBLISH' and request_id is not null;

-- ---------------------------------------------------------------------------
-- 2) Ensure extended request columns exist (RPC inserts full payload)
-- ---------------------------------------------------------------------------
alter table public.requests
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists postal_code text,
  add column if not exists preferred_date date,
  add column if not exists preferred_time_window text,
  add column if not exists preferred_time text,
  add column if not exists preferred_period text,
  add column if not exists budget_type text default 'negotiable',
  add column if not exists budget_amount numeric,
  add column if not exists currency text default 'CAD',
  add column if not exists budget_min numeric,
  add column if not exists budget_max numeric,
  add column if not exists timezone text,
  add column if not exists created_timezone text;

-- ---------------------------------------------------------------------------
-- 3) client_publish_request RPC
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
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_request is null or p_request = '{}'::jsonb then
    raise exception 'INVALID_REQUEST';
  end if;

  select * into p
  from public.profiles
  where id = caller
  for update;

  if p.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if p.role <> 'client' then
    raise exception 'CLIENT_ONLY';
  end if;

  v_balance := coalesce(p.credits, 0);

  if v_balance < v_cost then
    raise exception 'INSUFFICIENT_CLIENT_CREDITS';
  end if;

  if nullif(trim(p_request->>'category'), '') is null then
    raise exception 'INVALID_REQUEST: category required';
  end if;

  if nullif(trim(p_request->>'title'), '') is null then
    raise exception 'INVALID_REQUEST: title required';
  end if;

  if coalesce(p_extended, true) then
    insert into public.requests (
      client_id,
      category,
      subcategory,
      title,
      description,
      urgency,
      location,
      latitude,
      longitude,
      budget,
      status,
      address,
      city,
      region,
      postal_code,
      preferred_date,
      preferred_time_window,
      preferred_time,
      preferred_period,
      budget_type,
      budget_amount,
      currency,
      budget_min,
      budget_max,
      timezone,
      created_timezone
    )
    values (
      caller,
      p_request->>'category',
      nullif(trim(p_request->>'subcategory'), ''),
      p_request->>'title',
      coalesce(p_request->>'description', ''),
      coalesce(nullif(trim(p_request->>'urgency'), ''), 'normal'),
      coalesce(p_request->>'location', ''),
      case
        when nullif(p_request->>'latitude', '') is not null then (p_request->>'latitude')::numeric
        else null
      end,
      case
        when nullif(p_request->>'longitude', '') is not null then (p_request->>'longitude')::numeric
        else null
      end,
      nullif(trim(p_request->>'budget'), ''),
      'open',
      nullif(trim(p_request->>'address'), ''),
      nullif(trim(p_request->>'city'), ''),
      nullif(trim(p_request->>'region'), ''),
      nullif(trim(p_request->>'postal_code'), ''),
      case
        when nullif(p_request->>'preferred_date', '') is not null then (p_request->>'preferred_date')::date
        else null
      end,
      nullif(trim(p_request->>'preferred_time_window'), ''),
      nullif(trim(p_request->>'preferred_time'), ''),
      nullif(trim(coalesce(p_request->>'preferred_period', p_request->>'preferred_time_window')), ''),
      coalesce(nullif(trim(p_request->>'budget_type'), ''), 'negotiable'),
      case
        when nullif(p_request->>'budget_amount', '') is not null then (p_request->>'budget_amount')::numeric
        else null
      end,
      coalesce(nullif(trim(p_request->>'currency'), ''), 'CAD'),
      case
        when nullif(p_request->>'budget_min', '') is not null then (p_request->>'budget_min')::numeric
        else null
      end,
      case
        when nullif(p_request->>'budget_max', '') is not null then (p_request->>'budget_max')::numeric
        else null
      end,
      nullif(trim(coalesce(p_request->>'timezone', p_request->>'created_timezone')), ''),
      nullif(trim(coalesce(p_request->>'created_timezone', p_request->>'timezone')), '')
    )
    returning id into v_request_id;
  else
    insert into public.requests (
      client_id,
      category,
      subcategory,
      title,
      description,
      urgency,
      location,
      latitude,
      longitude,
      budget,
      status
    )
    values (
      caller,
      p_request->>'category',
      nullif(trim(p_request->>'subcategory'), ''),
      p_request->>'title',
      coalesce(p_request->>'description', ''),
      coalesce(nullif(trim(p_request->>'urgency'), ''), 'normal'),
      coalesce(p_request->>'location', ''),
      case
        when nullif(p_request->>'latitude', '') is not null then (p_request->>'latitude')::numeric
        else null
      end,
      case
        when nullif(p_request->>'longitude', '') is not null then (p_request->>'longitude')::numeric
        else null
      end,
      nullif(trim(p_request->>'budget'), ''),
      'open'
    )
    returning id into v_request_id;
  end if;

  v_balance := v_balance - v_cost;

  update public.profiles
  set
    credits = v_balance,
    updated_at = now()
  where id = caller;

  insert into public.client_credit_ledger (
    client_id,
    type,
    amount,
    balance_after,
    request_id,
    description,
    metadata
  )
  values (
    caller,
    'REQUEST_PUBLISH',
    -v_cost,
    v_balance,
    v_request_id,
    v_desc,
    jsonb_build_object('request_id', v_request_id)
  );

  return jsonb_build_object(
    'request_id', v_request_id,
    'balance_after', v_balance
  );
end;
$$;

revoke all on function public.client_publish_request(jsonb, boolean) from public;
grant execute on function public.client_publish_request(jsonb, boolean) to authenticated;

notify pgrst, 'reload schema';
