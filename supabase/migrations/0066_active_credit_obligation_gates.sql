-- Gate client publish and helper candidatura when owner has open credit_obligations.
-- Uses credit_obligations_open_owner_idx (0063). Does not alter has_active_credit_obligation (0064).
-- Lock order (deadlock-safe with 0065 client_cancel_request):
--   client_publish_request: profiles → obligation check → request insert
--   client_cancel_request:  profiles → request → applications → helper wallets
--   helper_submit_application: request → helper wallet → obligation check → debit
-- Future HIRE_ARREARS settlement should follow: request/application → wallet → obligation.

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


  if exists (
    select 1
    from public.credit_obligations as o
    where o.owner_user_id = caller
      and o.status = 'open'
      and o.amount_outstanding > 0
  ) then
    raise exception 'ACTIVE_CREDIT_OBLIGATION';
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
  w_helper_wallet public.credit_wallets;
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

  if not exists (
    select 1 from public.profiles p
    where p.id = p_helper_id and p.role = 'helper'
  ) then
    raise exception 'HELPER_ONLY';
  end if;

  -- Read-only quote for early policy/pricing abort (no locks, no debits)
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

  -- LOCK 1: request row (before wallet — compatible with 0065 cancel: request → wallets)
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

  -- Revalidate quote/charge after request lock (authoritative financial snapshot)
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

  -- LOCK 2: helper wallet (after request; before obligation gate and debit)
  perform public.ensure_helper_credit_wallet(p_helper_id);

  select * into w_helper_wallet
  from public.credit_wallets
  where helper_id = p_helper_id
  for update;

  if w_helper_wallet.helper_id is null then
    raise exception 'WALLET_MISSING';
  end if;

  if exists (
    select 1
    from public.credit_obligations as o
    where o.owner_user_id = p_helper_id
      and o.status = 'open'
      and o.amount_outstanding > 0
  ) then
    raise exception 'ACTIVE_CREDIT_OBLIGATION';
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

  -- Debit (helper_debit_application_interest re-locks wallet in same txn — safe/no-op wait)
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

revoke all on function public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean) from public;
revoke all on function public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean) from anon;
revoke all on function public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean) from authenticated;
grant execute on function public.helper_submit_application(uuid, uuid, uuid, text, numeric, int, boolean) to authenticated;
