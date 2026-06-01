-- RUN THIS IN SUPABASE SQL EDITOR
--
-- Installs payment_events + confirm_stripe_linkcredit_purchase for Stripe webhooks.
-- Safe to run multiple times (IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS).
-- Requires existing tables: public.credit_wallets, public.credit_transactions.
-- Does NOT use credit_packages.
--
-- Success: notice "confirm_stripe_linkcredit_purchase installed successfully"
-- Verify:  select proname, pg_get_function_identity_arguments(oid) from pg_proc where proname = 'confirm_stripe_linkcredit_purchase';

-- ---------------------------------------------------------------------------
-- payment_events
-- ---------------------------------------------------------------------------
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_session_id text not null,
  stripe_payment_intent text,
  package_id text not null,
  price_id text,
  credits int not null,
  amount_cents int,
  currency text not null default 'CAD',
  status text not null default 'pending',
  raw_event jsonb,
  created_at timestamptz not null default now(),
  constraint payment_events_stripe_session_id_key unique (stripe_session_id)
);

create index if not exists payment_events_user_id_idx
  on public.payment_events (user_id, created_at desc);

alter table public.payment_events enable row level security;

drop policy if exists payment_events_select_own on public.payment_events;
create policy payment_events_select_own on public.payment_events
  for select to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- RPC: idempotent Stripe purchase → wallet credit (PostgREST jsonb payload)
-- ---------------------------------------------------------------------------
drop function if exists public.confirm_stripe_linkcredit_purchase(
  uuid, text, text, text, text, integer, integer, text, text, jsonb
);

create or replace function public.confirm_stripe_linkcredit_purchase(payload jsonb)
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
  v_balance int;
  new_balance int;
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
    return jsonb_build_object('ok', true, 'alreadyProcessed', true);
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
    from public.credit_transactions
    where related_payment_id = p_stripe_session_id
      and type = 'CREDIT_PURCHASE'
  ) then
    return jsonb_build_object('ok', true, 'alreadyCredited', true);
  end if;

  if to_regprocedure('public.ensure_helper_credit_wallet(uuid)') is not null then
    perform public.ensure_helper_credit_wallet(p_user_id);
  else
    insert into public.credit_wallets (helper_id)
    values (p_user_id)
    on conflict (helper_id) do nothing;
  end if;

  select balance
  into v_balance
  from public.credit_wallets
  where helper_id = p_user_id
  for update;

  if v_balance is null then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  new_balance := v_balance + p_credits;

  update public.credit_wallets
  set
    balance = new_balance,
    total_purchased = total_purchased + p_credits,
    updated_at = now()
  where helper_id = p_user_id;

  insert into public.credit_transactions (
    helper_id,
    type,
    amount,
    balance_after,
    related_payment_id,
    description
  ) values (
    p_user_id,
    'CREDIT_PURCHASE',
    p_credits,
    new_balance,
    p_stripe_session_id,
    'LinkCredits purchase via Stripe · ' || coalesce(p_package_id, 'unknown')
  );

  return jsonb_build_object(
    'ok', true,
    'credits', p_credits,
    'balanceAfter', new_balance
  );
end;
$$;

revoke all on function public.confirm_stripe_linkcredit_purchase(jsonb) from public;

grant execute on function public.confirm_stripe_linkcredit_purchase(jsonb) to service_role;

-- Refresh PostgREST schema cache so /rest/v1/rpc/confirm_stripe_linkcredit_purchase resolves
notify pgrst, 'reload schema';

do $$
begin
  if to_regprocedure('public.confirm_stripe_linkcredit_purchase(jsonb)') is null then
    raise exception 'confirm_stripe_linkcredit_purchase was not created';
  end if;

  raise notice 'confirm_stripe_linkcredit_purchase(jsonb) installed successfully';
end $$;
