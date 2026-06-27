-- =============================================================================
-- apply_client_stripe_credit_purchase.sql
-- Client Stripe LinkCredits purchase → profiles.credits + client_credit_ledger.
-- Reuses payment_events for Stripe session idempotency (same as Helper).
-- Does NOT alter credit_wallets, helper confirm_stripe_linkcredit_purchase, or VIP.
-- Prerequisite: client_credit_ledger, payment_events (apply_client_welcome_30 / 0036).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Idempotency index on client_credit_ledger (CREDIT_PURCHASE / Stripe)
-- ---------------------------------------------------------------------------
create unique index if not exists client_credit_ledger_stripe_session_uidx
  on public.client_credit_ledger ((metadata->>'stripe_session_id'))
  where type = 'CREDIT_PURCHASE'
    and metadata ? 'stripe_session_id';

-- ---------------------------------------------------------------------------
-- 2) confirm_client_stripe_linkcredit_purchase RPC
-- ---------------------------------------------------------------------------
create or replace function public.confirm_client_stripe_linkcredit_purchase(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p_user_id uuid;
  p_stripe_session_id text;
  p_stripe_payment_intent text;
  p_package_id text;
  p_price_id text;
  p_credits int;
  p_amount_cents int;
  p_currency text;
  p_status text;
  p_raw_event jsonb;
  v_event_id uuid;
  v_event_status text;
  p public.profiles;
  v_balance int;
  v_desc text;
begin
  p_user_id := nullif(btrim(payload->>'user_id'), '')::uuid;
  p_stripe_session_id := nullif(btrim(payload->>'stripe_session_id'), '');
  p_stripe_payment_intent := nullif(btrim(payload->>'stripe_payment_intent_id'), '');
  p_package_id := nullif(btrim(payload->>'package_id'), '');
  p_price_id := nullif(btrim(payload->>'price_id'), '');
  p_credits := nullif(btrim(payload->>'credits'), '')::int;
  p_amount_cents := nullif(btrim(payload->>'amount_total'), '')::int;
  p_currency := upper(coalesce(nullif(btrim(payload->>'currency'), ''), 'CAD'));
  p_status := coalesce(nullif(btrim(payload->>'status'), ''), 'paid');
  p_raw_event := coalesce(payload->'raw_event', payload->'metadata', payload);

  if p_stripe_session_id is null then
    raise exception 'STRIPE_SESSION_ID_REQUIRED';
  end if;

  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED';
  end if;

  if p_credits is null or p_credits <= 0 then
    raise exception 'INVALID_CREDITS';
  end if;

  select id, status
  into v_event_id, v_event_status
  from public.payment_events
  where stripe_session_id = p_stripe_session_id;

  if v_event_id is not null and v_event_status = 'paid' then
    select coalesce(p.credits, 0)
    into v_balance
    from public.profiles p
    where p.id = p_user_id;

    return jsonb_build_object(
      'ok', true,
      'alreadyProcessed', true,
      'balanceAfter', coalesce(v_balance, 0)
    );
  end if;

  if v_event_id is null then
    insert into public.payment_events (
      user_id,
      stripe_session_id,
      stripe_payment_intent,
      package_id,
      price_id,
      credits,
      amount_cents,
      currency,
      status,
      raw_event
    ) values (
      p_user_id,
      p_stripe_session_id,
      p_stripe_payment_intent,
      coalesce(p_package_id, 'unknown'),
      p_price_id,
      p_credits,
      p_amount_cents,
      p_currency,
      p_status,
      p_raw_event
    );
  else
    update public.payment_events
    set
      status = p_status,
      stripe_payment_intent = coalesce(p_stripe_payment_intent, stripe_payment_intent),
      raw_event = coalesce(p_raw_event, raw_event)
    where id = v_event_id;
  end if;

  if p_status is distinct from 'paid' then
    return jsonb_build_object('ok', true, 'skipped', true, 'status', p_status);
  end if;

  if exists (
    select 1
    from public.client_credit_ledger
    where type = 'CREDIT_PURCHASE'
      and metadata->>'stripe_session_id' = p_stripe_session_id
  ) then
    select coalesce(p.credits, 0)
    into v_balance
    from public.profiles p
    where p.id = p_user_id;

    return jsonb_build_object(
      'ok', true,
      'alreadyCredited', true,
      'balanceAfter', coalesce(v_balance, 0)
    );
  end if;

  select * into p
  from public.profiles
  where id = p_user_id
  for update;

  if p.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if p.role <> 'client' then
    raise exception 'CLIENT_ONLY';
  end if;

  v_balance := coalesce(p.credits, 0) + p_credits;
  v_desc := 'Compra de LinkCredits via Stripe · ' || coalesce(p_package_id, 'unknown');

  update public.profiles
  set
    credits = v_balance,
    updated_at = now()
  where id = p_user_id;

  insert into public.client_credit_ledger (
    client_id,
    type,
    amount,
    balance_after,
    description,
    metadata
  )
  values (
    p_user_id,
    'CREDIT_PURCHASE',
    p_credits,
    v_balance,
    v_desc,
    jsonb_build_object(
      'stripe_session_id', p_stripe_session_id,
      'stripe_payment_intent_id', p_stripe_payment_intent,
      'package_id', p_package_id,
      'price_id', p_price_id,
      'currency', p_currency,
      'amount_total', p_amount_cents,
      'source', 'stripe',
      'purchase_audience', 'client'
    )
  );

  return jsonb_build_object(
    'ok', true,
    'credits', p_credits,
    'balanceAfter', v_balance
  );
end;
$$;

revoke all on function public.confirm_client_stripe_linkcredit_purchase(jsonb) from public;
grant execute on function public.confirm_client_stripe_linkcredit_purchase(jsonb) to service_role;

notify pgrst, 'reload schema';
