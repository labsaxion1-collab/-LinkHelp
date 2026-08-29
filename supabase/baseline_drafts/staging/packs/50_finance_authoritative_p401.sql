-- =============================================================================
-- P4.0.5 staging overlay — 50_finance_authoritative_p401.sql
-- Finanças Normal/VIP + integração com compute/snapshot do pack 40.
--
-- Normal apply = 4 LC + snapshot server.
-- VIP apply = snapshot.total + 4; pricing/location/policy errors abort before side effects.
-- Hire Normal = snapshot.total − 4; Hire VIP = 0.
-- Reject VIP = ceil(ledger debit / 2).
--
-- Concurrency (P4.0.5): quote → lock request → re-check → debit (wallet FOR UPDATE)
-- → insert application → VIP lock/displace. See pack 30 LOCK ORDER.
-- NÃO executar em produção nesta etapa.
-- =============================================================================

-- Idempotency: displace +2 and VIP reject refund
create unique index if not exists credit_transactions_vip_partial_refund_uidx
  on public.credit_transactions (helper_id, request_id, type)
  where type = 'VIP_EXCLUSIVE_PARTIAL_REFUND' and request_id is not null;

create unique index if not exists credit_transactions_vip_rejected_refund_uidx
  on public.credit_transactions (helper_id, application_id, type)
  where type = 'VIP_APPLICATION_REJECTED_REFUND' and application_id is not null;

-- Legacy stub signatures removed — compute lives in pack 40
drop function if exists public.helper_compute_lead_estimated_total_lc(uuid, numeric);

-- ---------------------------------------------------------------------------
-- Displace normals +2 LC (once)
-- ---------------------------------------------------------------------------
create or replace function public.process_vip_exclusive_partial_refunds(
  p_request_id uuid,
  p_vip_helper_id uuid,
  p_vip_application_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
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
-- VIP reject refund — ceil(debit / 2)
-- ---------------------------------------------------------------------------
create or replace function public.process_vip_application_rejected_refund(
  p_application_id uuid,
  p_helper_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
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
-- client_reject_application — unlock + ceil refund for VIP
-- ---------------------------------------------------------------------------
create or replace function public.client_reject_application(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
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
drop function if exists public.helper_submit_application(uuid, uuid, uuid, text, numeric, int);
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
set search_path = public
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
set search_path = public
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
set search_path = public
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

grant execute on function public.charge_helper_on_client_hire(uuid, int) to authenticated;
grant execute on function public.client_accept_proposal(uuid, int) to authenticated;
