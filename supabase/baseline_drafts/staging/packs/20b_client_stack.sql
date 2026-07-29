-- =============================================================================
-- P4.0.2 staging overlay — 20b_client_stack.sql
-- Origem consolidada (sem NOTIFY / sem mutações legadas):
--   apply_client_welcome_30_onboarding.sql
--   apply_client_publish_request_debit.sql
--   apply_client_stripe_credit_purchase.sql
-- NÃO executar em produção nesta etapa.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Onboarding column + ledger + signals
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists client_onboarding_completed_at timestamptz null;

create table if not exists public.client_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  amount int not null,
  balance_after int not null,
  reward_type text null,
  description text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists client_credit_ledger_client_created_idx
  on public.client_credit_ledger (client_id, created_at desc);

alter table public.client_credit_ledger enable row level security;

drop policy if exists client_credit_ledger_select_own on public.client_credit_ledger;
create policy client_credit_ledger_select_own on public.client_credit_ledger
  for select to authenticated
  using (auth.uid() = client_id);

create table if not exists public.client_onboarding_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_fingerprint text null,
  created_at timestamptz not null default now()
);

create index if not exists client_onboarding_signals_user_idx
  on public.client_onboarding_signals (user_id, created_at desc);

create index if not exists client_onboarding_signals_fingerprint_idx
  on public.client_onboarding_signals (device_fingerprint)
  where device_fingerprint is not null;

alter table public.client_onboarding_signals enable row level security;

create or replace function public.is_valid_reward_type(p_reward_type text)
returns boolean
language sql
immutable
as $$
  select p_reward_type in (
    'SIGNUP_CLIENT',
    'SIGNUP_HELPER',
    'CLIENT_WELCOME_30',
    'PROFILE_PHOTO',
    'PROFILE_DESCRIPTION',
    'PROFILE_SKILLS',
    'PHONE_VERIFIED',
    'FIRST_REQUEST_CREATED',
    'FIRST_APPLICATION_SENT',
    'FIRST_REVIEW_RECEIVED',
    'REFERRAL_COMPLETED'
  );
$$;

create or replace function public.complete_client_onboarding(
  p_client_id uuid,
  p_device_fingerprint text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  p public.profiles;
  v_amount int := 30;
  v_inserted boolean;
  v_balance int;
  v_completed_at timestamptz;
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if caller <> p_client_id then
    raise exception 'FORBIDDEN';
  end if;

  select * into p
  from public.profiles
  where id = p_client_id
  for update;

  if p.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if p.role <> 'client' then
    raise exception 'CLIENT_ONLY';
  end if;

  v_balance := coalesce(p.credits, 0);
  v_completed_at := p.client_onboarding_completed_at;

  if v_completed_at is not null then
    return jsonb_build_object(
      'granted', false,
      'reason', 'ALREADY_COMPLETED',
      'amount', 0,
      'balance_after', v_balance,
      'completed_at', v_completed_at
    );
  end if;

  if exists (
    select 1
    from public.user_bonus_rewards ubr
    where ubr.user_id = p_client_id
      and ubr.reward_type = 'CLIENT_WELCOME_30'
  ) then
    update public.profiles
    set
      client_onboarding_completed_at = coalesce(client_onboarding_completed_at, now()),
      updated_at = now()
    where id = p_client_id
    returning client_onboarding_completed_at, credits
    into v_completed_at, v_balance;

    return jsonb_build_object(
      'granted', false,
      'reason', 'ALREADY_GRANTED',
      'amount', 0,
      'balance_after', v_balance,
      'completed_at', v_completed_at
    );
  end if;

  insert into public.user_bonus_rewards (user_id, reward_type, amount)
  values (p_client_id, 'CLIENT_WELCOME_30', v_amount)
  on conflict (user_id, reward_type) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    update public.profiles
    set
      client_onboarding_completed_at = coalesce(client_onboarding_completed_at, now()),
      updated_at = now()
    where id = p_client_id
    returning client_onboarding_completed_at, credits
    into v_completed_at, v_balance;

    return jsonb_build_object(
      'granted', false,
      'reason', 'ALREADY_GRANTED',
      'amount', 0,
      'balance_after', v_balance,
      'completed_at', v_completed_at
    );
  end if;

  update public.profiles
  set
    credits = coalesce(credits, 0) + v_amount,
    client_onboarding_completed_at = now(),
    updated_at = now()
  where id = p_client_id
  returning credits, client_onboarding_completed_at
  into v_balance, v_completed_at;

  insert into public.client_credit_ledger (
    client_id, type, amount, balance_after, reward_type, description, metadata
  ) values (
    p_client_id, 'FREE_BONUS', v_amount, v_balance, 'CLIENT_WELCOME_30',
    'LinkCredits — CLIENT_WELCOME_30',
    jsonb_build_object('source', 'client_onboarding')
  );

  if nullif(trim(coalesce(p_device_fingerprint, '')), '') is not null then
    insert into public.client_onboarding_signals (user_id, device_fingerprint)
    values (p_client_id, left(trim(p_device_fingerprint), 512));
  end if;

  return jsonb_build_object(
    'granted', true,
    'reward_type', 'CLIENT_WELCOME_30',
    'amount', v_amount,
    'balance_after', v_balance,
    'completed_at', v_completed_at
  );
end;
$$;

grant execute on function public.complete_client_onboarding(uuid, text) to authenticated;

create or replace function public.grant_user_reward(
  p_user_id uuid,
  p_reward_type text,
  p_amount int default null,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_amount int;
  v_desc text;
  v_inserted boolean;
  v_balance int;
  w public.credit_wallets;
begin
  if auth.uid() is not null
    and auth.uid() <> p_user_id
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  if not public.is_valid_reward_type(p_reward_type) then
    raise exception 'INVALID_REWARD_TYPE';
  end if;

  v_amount := coalesce(p_amount, case p_reward_type
    when 'SIGNUP_CLIENT'          then 0
    when 'SIGNUP_HELPER'          then 20
    when 'CLIENT_WELCOME_30'      then 30
    when 'PROFILE_PHOTO'          then 0
    when 'PROFILE_DESCRIPTION'    then 0
    when 'PROFILE_SKILLS'         then 0
    when 'PHONE_VERIFIED'         then 0
    when 'FIRST_REQUEST_CREATED'  then 0
    when 'FIRST_APPLICATION_SENT' then 5
    when 'FIRST_REVIEW_RECEIVED'  then 3
    when 'REFERRAL_COMPLETED'     then 10
    else null
  end);

  if v_amount is null or v_amount <= 0 then
    return jsonb_build_object(
      'granted', false,
      'reward_type', p_reward_type,
      'reason', 'ZERO_AMOUNT'
    );
  end if;

  v_desc := coalesce(nullif(trim(p_description), ''), 'LinkCredits — ' || p_reward_type);

  insert into public.user_bonus_rewards (user_id, reward_type, amount)
  values (p_user_id, p_reward_type, v_amount)
  on conflict (user_id, reward_type) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    return jsonb_build_object(
      'granted', false,
      'reward_type', p_reward_type,
      'reason', 'ALREADY_GRANTED'
    );
  end if;

  select role into v_role from public.profiles where id = p_user_id;
  if v_role is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_role = 'helper' then
    insert into public.credit_wallets (helper_id)
    values (p_user_id)
    on conflict (helper_id) do nothing;

    w := public.add_credits(p_user_id, v_amount, 'FREE_BONUS', v_desc);
    v_balance := w.balance;
  else
    if p_reward_type = 'CLIENT_WELCOME_30' then
      raise exception 'USE_COMPLETE_CLIENT_ONBOARDING';
    end if;

    update public.profiles
    set credits = credits + v_amount, updated_at = now()
    where id = p_user_id
    returning credits into v_balance;
  end if;

  return jsonb_build_object(
    'granted', true,
    'reward_type', p_reward_type,
    'amount', v_amount,
    'balance_after', v_balance
  );
end;
$$;

grant execute on function public.grant_user_reward(uuid, text, int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Publish debit (1 LC)
-- ---------------------------------------------------------------------------
alter table public.client_credit_ledger
  add column if not exists request_id uuid references public.requests (id) on delete set null;

create unique index if not exists client_credit_ledger_request_publish_uidx
  on public.client_credit_ledger (request_id)
  where type = 'REQUEST_PUBLISH' and request_id is not null;

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
      client_id, category, subcategory, title, description, urgency, location,
      latitude, longitude, budget, status, address, city, region, postal_code,
      preferred_date, preferred_time_window, preferred_time, preferred_period,
      budget_type, budget_amount, currency, budget_min, budget_max, timezone, created_timezone
    ) values (
      caller,
      p_request->>'category',
      nullif(trim(p_request->>'subcategory'), ''),
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
      nullif(trim(coalesce(p_request->>'created_timezone', p_request->>'timezone')), '')
    )
    returning id into v_request_id;
  else
    insert into public.requests (
      client_id, category, subcategory, title, description, urgency, location,
      latitude, longitude, budget, status
    ) values (
      caller,
      p_request->>'category',
      nullif(trim(p_request->>'subcategory'), ''),
      p_request->>'title',
      coalesce(p_request->>'description', ''),
      coalesce(nullif(trim(p_request->>'urgency'), ''), 'normal'),
      coalesce(p_request->>'location', ''),
      case when nullif(p_request->>'latitude', '') is not null then (p_request->>'latitude')::numeric else null end,
      case when nullif(p_request->>'longitude', '') is not null then (p_request->>'longitude')::numeric else null end,
      nullif(trim(p_request->>'budget'), ''),
      'open'
    )
    returning id into v_request_id;
  end if;

  v_balance := v_balance - v_cost;

  update public.profiles
  set credits = v_balance, updated_at = now()
  where id = caller;

  insert into public.client_credit_ledger (
    client_id, type, amount, balance_after, request_id, description, metadata
  ) values (
    caller, 'REQUEST_PUBLISH', -v_cost, v_balance, v_request_id, v_desc,
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

-- ---------------------------------------------------------------------------
-- Client Stripe purchase confirm (service_role)
-- ---------------------------------------------------------------------------
create unique index if not exists client_credit_ledger_stripe_session_uidx
  on public.client_credit_ledger ((metadata->>'stripe_session_id'))
  where type = 'CREDIT_PURCHASE'
    and metadata ? 'stripe_session_id';

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
    select coalesce(pr.credits, 0)
    into v_balance
    from public.profiles pr
    where pr.id = p_user_id;

    return jsonb_build_object(
      'ok', true,
      'alreadyProcessed', true,
      'balanceAfter', coalesce(v_balance, 0)
    );
  end if;

  if v_event_id is null then
    insert into public.payment_events (
      user_id, stripe_session_id, stripe_payment_intent, package_id, price_id,
      credits, amount_cents, currency, status, raw_event
    ) values (
      p_user_id, p_stripe_session_id, p_stripe_payment_intent,
      coalesce(p_package_id, 'unknown'), p_price_id, p_credits, p_amount_cents,
      p_currency, p_status, p_raw_event
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
    select coalesce(pr.credits, 0)
    into v_balance
    from public.profiles pr
    where pr.id = p_user_id;

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
  set credits = v_balance, updated_at = now()
  where id = p_user_id;

  insert into public.client_credit_ledger (
    client_id, type, amount, balance_after, description, metadata
  ) values (
    p_user_id, 'CREDIT_PURCHASE', p_credits, v_balance, v_desc,
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
