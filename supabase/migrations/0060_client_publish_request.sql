-- Restore secure client request publishing (1 LC debit + REQUEST_PUBLISH ledger).
-- Core only: no cancel/debt/refund/chat-pricing/scheduled expiry job in this migration.
-- Idempotency: frontend does not yet send an idempotency key; double-click can publish twice.
--   Mitigation today: FOR UPDATE on profiles serializes balance checks; ledger uidx prevents
--   duplicate REQUEST_PUBLISH rows for the same request_id (not duplicate requests).

-- ---------------------------------------------------------------------------
-- 1) Schema additions (nullable / optional fields for current + simplified flow)
-- ---------------------------------------------------------------------------
alter table public.requests
  add column if not exists service_mode text,
  add column if not exists expires_at timestamptz;

alter table public.requests
  drop constraint if exists requests_service_mode_check;

alter table public.requests
  add constraint requests_service_mode_check
  check (service_mode is null or service_mode in ('remote', 'in_person'));

comment on column public.requests.service_mode is
  'Optional modality: remote or in_person. Validated in client_publish_request when present.';

comment on column public.requests.expires_at is
  'Open-request expiry timestamp. Set to now() + 7 days on publish; no auto-delete in 0060.';

alter table public.client_credit_ledger
  add column if not exists request_id uuid references public.requests (id) on delete set null;

comment on column public.client_credit_ledger.request_id is
  'Optional link to requests.id for publish/debit audit rows (e.g. REQUEST_PUBLISH).';

create unique index if not exists client_credit_ledger_request_publish_uidx
  on public.client_credit_ledger (request_id)
  where type = 'REQUEST_PUBLISH' and request_id is not null;

create index if not exists requests_expires_at_idx
  on public.requests (expires_at)
  where expires_at is not null;

-- ---------------------------------------------------------------------------
-- 2) public.client_publish_request(p_request jsonb, p_extended boolean default true)
-- ---------------------------------------------------------------------------
create or replace function public.client_publish_request(
  p_request jsonb,
  p_extended boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  p public.profiles;
  v_cost int := 1;
  v_balance int;
  v_request_id uuid;
  v_desc text := 'Publicação de chamado';
  v_category text;
  v_title text;
  v_service_mode text;
  v_payload_client_id uuid;
  v_payload_user_id uuid;
  v_expires_at timestamptz := now() + interval '7 days';
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_request is null or p_request = '{}'::jsonb then
    raise exception 'INVALID_REQUEST_PAYLOAD';
  end if;

  if nullif(trim(p_request->>'client_id'), '') is not null then
    begin
      v_payload_client_id := (p_request->>'client_id')::uuid;
    exception
      when invalid_text_representation then
        raise exception 'INVALID_REQUEST_PAYLOAD';
    end;
    if v_payload_client_id is distinct from caller then
      raise exception 'INVALID_REQUEST_PAYLOAD';
    end if;
  end if;

  if nullif(trim(p_request->>'user_id'), '') is not null then
    begin
      v_payload_user_id := (p_request->>'user_id')::uuid;
    exception
      when invalid_text_representation then
        raise exception 'INVALID_REQUEST_PAYLOAD';
    end;
    if v_payload_user_id is distinct from caller then
      raise exception 'INVALID_REQUEST_PAYLOAD';
    end if;
  end if;

  select * into p
  from public.profiles
  where id = caller
  for update;

  if p.id is null then
    raise exception 'INVALID_REQUEST_PAYLOAD';
  end if;

  if p.role is distinct from 'client' then
    raise exception 'CLIENT_ONLY';
  end if;

  v_balance := coalesce(p.credits, 0);

  if v_balance < v_cost then
    raise exception 'INSUFFICIENT_CLIENT_CREDITS';
  end if;

  v_category := nullif(trim(p_request->>'category'), '');
  v_title := nullif(trim(p_request->>'title'), '');

  if v_category is null then
    raise exception 'INVALID_REQUEST_PAYLOAD';
  end if;

  if v_title is null then
    raise exception 'INVALID_REQUEST_PAYLOAD';
  end if;

  v_service_mode := nullif(lower(trim(p_request->>'service_mode')), '');

  if v_service_mode is not null and v_service_mode not in ('remote', 'in_person') then
    raise exception 'INVALID_REQUEST_PAYLOAD';
  end if;

  if v_service_mode = 'in_person'
     and nullif(trim(coalesce(p_request->>'address', '')), '') is null then
    raise exception 'INVALID_REQUEST_PAYLOAD';
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
      created_timezone,
      service_mode,
      expires_at
    )
    values (
      caller,
      v_category,
      nullif(trim(p_request->>'subcategory'), ''),
      v_title,
      coalesce(nullif(trim(p_request->>'description'), ''), ''),
      coalesce(nullif(trim(p_request->>'urgency'), ''), 'normal'),
      coalesce(nullif(trim(p_request->>'location'), ''), ''),
      case
        when nullif(p_request->>'latitude', '') is not null then (p_request->>'latitude')::double precision
        else null
      end,
      case
        when nullif(p_request->>'longitude', '') is not null then (p_request->>'longitude')::double precision
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
      nullif(trim(coalesce(p_request->>'created_timezone', p_request->>'timezone')), ''),
      v_service_mode,
      v_expires_at
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
      status,
      service_mode,
      expires_at
    )
    values (
      caller,
      v_category,
      nullif(trim(p_request->>'subcategory'), ''),
      v_title,
      coalesce(nullif(trim(p_request->>'description'), ''), ''),
      coalesce(nullif(trim(p_request->>'urgency'), ''), 'normal'),
      coalesce(nullif(trim(p_request->>'location'), ''), ''),
      case
        when nullif(p_request->>'latitude', '') is not null then (p_request->>'latitude')::double precision
        else null
      end,
      case
        when nullif(p_request->>'longitude', '') is not null then (p_request->>'longitude')::double precision
        else null
      end,
      nullif(trim(p_request->>'budget'), ''),
      'open',
      v_service_mode,
      v_expires_at
    )
    returning id into v_request_id;
  end if;

  v_balance := v_balance - v_cost;

  if v_balance < 0 then
    raise exception 'INSUFFICIENT_CLIENT_CREDITS';
  end if;

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
    jsonb_build_object('request_id', v_request_id, 'service_mode', v_service_mode)
  );

  return jsonb_build_object(
    'request_id', v_request_id,
    'balance_after', v_balance
  );
end;
$$;

revoke all on function public.client_publish_request(jsonb, boolean) from public;
revoke all on function public.client_publish_request(jsonb, boolean) from anon;
revoke all on function public.client_publish_request(jsonb, boolean) from authenticated;
grant execute on function public.client_publish_request(jsonb, boolean) to authenticated;
