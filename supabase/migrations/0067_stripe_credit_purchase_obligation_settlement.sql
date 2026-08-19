-- Secure Stripe LinkCredit confirmation + automatic credit_obligations settlement.
-- Authoritative catalog is hardcoded here (not public.credit_packages).
-- Lock order:
--   client: payment_events → profiles → credit_obligations (created_at, id)
--   helper: payment_events → credit_wallets → credit_obligations (created_at, id)
-- Never lock request rows. Never lock obligations before the buyer balance row.

-- ---------------------------------------------------------------------------
-- 1) payment_events: event id + audience
-- ---------------------------------------------------------------------------
alter table public.payment_events
  add column if not exists stripe_event_id text;

alter table public.payment_events
  add column if not exists purchase_audience text;

comment on column public.payment_events.stripe_event_id is
  'Stripe Event id (evt_...). Unique when present; used for webhook idempotency.';
comment on column public.payment_events.purchase_audience is
  'helper | client. Must match the confirming RPC.';

create unique index if not exists payment_events_stripe_event_id_uidx
  on public.payment_events (stripe_event_id)
  where stripe_event_id is not null;

-- ---------------------------------------------------------------------------
-- 2) credit_obligation_settlements
-- ---------------------------------------------------------------------------
create table if not exists public.credit_obligation_settlements (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references public.credit_obligations (id) on delete restrict,
  payment_event_id uuid not null references public.payment_events (id) on delete restrict,
  owner_user_id uuid not null references public.profiles (id) on delete restrict,
  amount int not null,
  created_at timestamptz not null default now(),
  idempotency_key text not null
);

comment on table public.credit_obligation_settlements is
  'Audit rows for LC applied from a Stripe purchase onto an open credit_obligation. Writes only via SECURITY DEFINER RPCs.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligation_settlements_amount_pos_check'
      and conrelid = 'public.credit_obligation_settlements'::regclass
  ) then
    alter table public.credit_obligation_settlements
      add constraint credit_obligation_settlements_amount_pos_check
      check (amount > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'credit_obligation_settlements_idempotency_nonempty_check'
      and conrelid = 'public.credit_obligation_settlements'::regclass
  ) then
    alter table public.credit_obligation_settlements
      add constraint credit_obligation_settlements_idempotency_nonempty_check
      check (length(btrim(idempotency_key)) > 0);
  end if;
end $$;

create unique index if not exists credit_obligation_settlements_idempotency_key_uidx
  on public.credit_obligation_settlements (idempotency_key);

create unique index if not exists credit_obligation_settlements_event_obligation_uidx
  on public.credit_obligation_settlements (payment_event_id, obligation_id);

create index if not exists credit_obligation_settlements_obligation_id_idx
  on public.credit_obligation_settlements (obligation_id);

create index if not exists credit_obligation_settlements_payment_event_id_idx
  on public.credit_obligation_settlements (payment_event_id);

create index if not exists credit_obligation_settlements_owner_user_id_idx
  on public.credit_obligation_settlements (owner_user_id);

alter table public.credit_obligation_settlements enable row level security;

drop policy if exists credit_obligation_settlements_select_own on public.credit_obligation_settlements;
create policy credit_obligation_settlements_select_own on public.credit_obligation_settlements
  for select to authenticated
  using ((select auth.uid()) = owner_user_id);

revoke all on table public.credit_obligation_settlements from public;
revoke all on table public.credit_obligation_settlements from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.credit_obligation_settlements
  from public;
revoke insert, update, delete, truncate, references, trigger
  on table public.credit_obligation_settlements
  from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.credit_obligation_settlements
  from authenticated;
grant select on table public.credit_obligation_settlements to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Ledger type + unique CREDIT_PURCHASE per Stripe session
-- ---------------------------------------------------------------------------
alter table public.credit_transactions drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions add constraint credit_transactions_type_check check (
  type in (
    'CREDIT_PURCHASE', 'FREE_BONUS', 'OPPORTUNITY_UNLOCK', 'REFUND', 'ADMIN_ADJUSTMENT',
    'APPLICATION_INTEREST', 'APPLICATION_SELECTED', 'VIP_EXCLUSIVE_PARTIAL_REFUND',
    'VIP_APPLICATION_REJECTED_REFUND', 'REQUEST_CANCEL_HELPER_COMPENSATION',
    'OBLIGATION_SETTLEMENT'
  )
);

create unique index if not exists credit_transactions_stripe_session_purchase_uidx
  on public.credit_transactions ((metadata->>'stripe_session_id'))
  where type = 'CREDIT_PURCHASE'
    and metadata ? 'stripe_session_id';

create unique index if not exists credit_transactions_purchase_related_payment_uidx
  on public.credit_transactions (related_payment_id)
  where type = 'CREDIT_PURCHASE'
    and related_payment_id is not null;

create unique index if not exists client_credit_ledger_stripe_session_uidx
  on public.client_credit_ledger ((metadata->>'stripe_session_id'))
  where type = 'CREDIT_PURCHASE'
    and metadata ? 'stripe_session_id';

-- ---------------------------------------------------------------------------
-- 4) Authoritative package quote (not credit_packages)
-- ---------------------------------------------------------------------------
create or replace function public.stripe_linkcredit_package_quote(p_package_id text)
returns table (package_id text, credits int, amount_cents int)
language sql
immutable
security invoker
set search_path = ''
as $$
  select x.package_id, x.credits, x.amount_cents
  from (
    values
      ('starter'::text, 35, 1499),
      ('popular'::text, 80, 2999),
      ('pro'::text, 180, 5999),
      ('power'::text, 400, 11999)
  ) as x(package_id, credits, amount_cents)
  where x.package_id = p_package_id;
$$;

revoke all on function public.stripe_linkcredit_package_quote(text) from public;
revoke all on function public.stripe_linkcredit_package_quote(text) from anon;
revoke all on function public.stripe_linkcredit_package_quote(text) from authenticated;
revoke all on function public.stripe_linkcredit_package_quote(text) from service_role;

-- ---------------------------------------------------------------------------
-- 5) Settlement helper (caller already holds buyer balance lock)
-- ---------------------------------------------------------------------------
create or replace function public.apply_credit_obligation_settlements_from_purchase(
  p_owner_user_id uuid,
  p_payment_event_id uuid,
  p_available_lc int
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.credit_obligations;
  v_remaining int := greatest(coalesce(p_available_lc, 0), 0);
  v_apply int;
  v_settled int := 0;
  v_paid int;
  v_outstanding int;
begin
  if p_owner_user_id is null or p_payment_event_id is null then
    raise exception 'INVALID_SETTLEMENT_INPUT';
  end if;

  if v_remaining <= 0 then
    return 0;
  end if;

  for o in
    select *
    from public.credit_obligations
    where owner_user_id = p_owner_user_id
      and status = 'open'
      and amount_outstanding > 0
    order by created_at asc, id asc
    for update
  loop
    exit when v_remaining <= 0;

    v_apply := least(v_remaining, o.amount_outstanding);
    if v_apply <= 0 then
      continue;
    end if;

    v_paid := o.amount_paid + v_apply;
    v_outstanding := o.amount_original - v_paid;

    update public.credit_obligations
    set
      amount_paid = v_paid,
      amount_outstanding = v_outstanding,
      status = case when v_outstanding = 0 then 'settled' else 'open' end,
      settled_at = case when v_outstanding = 0 then now() else settled_at end,
      updated_at = now()
    where id = o.id;

    insert into public.credit_obligation_settlements (
      obligation_id,
      payment_event_id,
      owner_user_id,
      amount,
      idempotency_key
    ) values (
      o.id,
      p_payment_event_id,
      p_owner_user_id,
      v_apply,
      'stripe_purchase_settle:' || p_payment_event_id::text || ':' || o.id::text
    );

    v_remaining := v_remaining - v_apply;
    v_settled := v_settled + v_apply;
  end loop;

  return v_settled;
end;
$$;

revoke all on function public.apply_credit_obligation_settlements_from_purchase(uuid, uuid, int) from public;
revoke all on function public.apply_credit_obligation_settlements_from_purchase(uuid, uuid, int) from anon;
revoke all on function public.apply_credit_obligation_settlements_from_purchase(uuid, uuid, int) from authenticated;
revoke all on function public.apply_credit_obligation_settlements_from_purchase(uuid, uuid, int) from service_role;

-- ---------------------------------------------------------------------------
-- 6) Shared purchase apply (locked, atomic)
-- ---------------------------------------------------------------------------
create or replace function public.confirm_stripe_linkcredit_purchase_apply(
  payload jsonb,
  p_expected_audience text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p_user_id uuid;
  p_stripe_session_id text;
  p_stripe_payment_intent text;
  p_stripe_event_id text;
  p_package_id text;
  p_currency text;
  p_status text;
  p_payment_status text;
  p_audience text;
  p_amount_cents int;
  p_claimed_credits int;
  p_raw_event jsonb;
  pkg record;
  v_pe public.payment_events;
  v_helper_wallet public.credit_wallets;
  p public.profiles;
  v_gross int;
  v_settled int := 0;
  v_net int;
  v_before int;
  v_after_purchase int;
  v_final int;
  v_purchase_complete boolean := false;
  v_meta jsonb;
begin
  if p_expected_audience is distinct from 'helper'
     and p_expected_audience is distinct from 'client' then
    raise exception 'AUDIENCE_INVALID';
  end if;

  p_user_id := nullif(btrim(payload->>'user_id'), '')::uuid;
  p_stripe_session_id := nullif(btrim(payload->>'stripe_session_id'), '');
  p_stripe_payment_intent := nullif(btrim(payload->>'stripe_payment_intent_id'), '');
  p_stripe_event_id := nullif(btrim(payload->>'stripe_event_id'), '');
  p_package_id := nullif(btrim(payload->>'package_id'), '');
  p_currency := upper(coalesce(nullif(btrim(payload->>'currency'), ''), ''));
  p_status := lower(coalesce(nullif(btrim(payload->>'status'), ''), ''));
  p_payment_status := lower(coalesce(nullif(btrim(payload->>'payment_status'), ''), p_status));
  p_audience := lower(coalesce(
    nullif(btrim(payload->>'purchase_audience'), ''),
    nullif(btrim(payload->>'audience'), '')
  ));
  p_amount_cents := nullif(btrim(payload->>'amount_total'), '')::int;
  p_claimed_credits := nullif(btrim(payload->>'credits'), '')::int;
  p_raw_event := coalesce(payload->'raw_event', payload);

  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED';
  end if;
  if p_stripe_session_id is null then
    raise exception 'STRIPE_SESSION_ID_REQUIRED';
  end if;
  if p_stripe_event_id is null then
    raise exception 'STRIPE_EVENT_ID_REQUIRED';
  end if;
  if p_package_id is null then
    raise exception 'PACKAGE_NOT_FOUND';
  end if;
  if p_audience is distinct from p_expected_audience then
    raise exception 'AUDIENCE_INVALID';
  end if;
  if p_payment_status is distinct from 'paid' or p_status is distinct from 'paid' then
    raise exception 'PAYMENT_NOT_PAID';
  end if;
  if p_currency is distinct from 'CAD' then
    raise exception 'CURRENCY_INVALID';
  end if;
  if p_amount_cents is null then
    raise exception 'AMOUNT_REQUIRED';
  end if;

  select q.package_id, q.credits, q.amount_cents
  into pkg
  from public.stripe_linkcredit_package_quote(p_package_id) as q;

  if pkg.package_id is null then
    raise exception 'PACKAGE_NOT_FOUND';
  end if;

  if p_amount_cents is distinct from pkg.amount_cents then
    raise exception 'AMOUNT_MISMATCH';
  end if;

  if p_claimed_credits is not null and p_claimed_credits is distinct from pkg.credits then
    raise exception 'CREDITS_MISMATCH';
  end if;

  v_gross := pkg.credits;

  -- LOCK 1: payment event / session
  begin
    insert into public.payment_events (
      user_id,
      stripe_session_id,
      stripe_payment_intent,
      stripe_event_id,
      package_id,
      price_id,
      credits,
      amount_cents,
      currency,
      status,
      purchase_audience,
      raw_event
    ) values (
      p_user_id,
      p_stripe_session_id,
      p_stripe_payment_intent,
      p_stripe_event_id,
      pkg.package_id,
      nullif(btrim(payload->>'price_id'), ''),
      v_gross,
      pkg.amount_cents,
      'CAD',
      'pending',
      p_expected_audience,
      p_raw_event
    )
    returning * into v_pe;
  exception
    when unique_violation then
      select *
      into v_pe
      from public.payment_events
      where stripe_session_id = p_stripe_session_id
         or stripe_event_id = p_stripe_event_id
      for update;

      if v_pe.id is null then
        raise;
      end if;
  end;

  perform 1
  from public.payment_events
  where id = v_pe.id
  for update;

  select *
  into v_pe
  from public.payment_events
  where id = v_pe.id
  for update;

  if v_pe.user_id is distinct from p_user_id then
    raise exception 'SESSION_USER_MISMATCH';
  end if;

  if v_pe.purchase_audience is not null
     and v_pe.purchase_audience is distinct from p_expected_audience then
    raise exception 'AUDIENCE_INVALID';
  end if;

  if p_expected_audience = 'helper' then
    select exists (
      select 1
      from public.credit_transactions ct
      where ct.type = 'CREDIT_PURCHASE'
        and (
          ct.related_payment_id = p_stripe_session_id
          or ct.metadata->>'stripe_session_id' = p_stripe_session_id
        )
    ) into v_purchase_complete;
  else
    select exists (
      select 1
      from public.client_credit_ledger l
      where l.type = 'CREDIT_PURCHASE'
        and l.metadata->>'stripe_session_id' = p_stripe_session_id
    ) into v_purchase_complete;
  end if;

  if v_pe.status = 'paid' and v_purchase_complete then
    if p_expected_audience = 'helper' then
      select coalesce(cw.balance, 0)
      into v_final
      from public.credit_wallets cw
      where cw.helper_id = p_user_id;
    else
      select coalesce(pr.credits, 0)
      into v_final
      from public.profiles pr
      where pr.id = p_user_id;
    end if;

    return jsonb_build_object(
      'ok', true,
      'alreadyProcessed', true,
      'already_processed', true,
      'credits', v_gross,
      'gross_lc', v_gross,
      'balanceAfter', coalesce(v_final, 0)
    );
  end if;

  if p_expected_audience = 'helper' then
    select *
    into p
    from public.profiles
    where id = p_user_id;

    if p.id is null or p.role is distinct from 'helper' then
      raise exception 'HELPER_ONLY';
    end if;

    if to_regprocedure('public.ensure_helper_credit_wallet(uuid)') is not null then
      perform public.ensure_helper_credit_wallet(p_user_id);
    else
      insert into public.credit_wallets (helper_id)
      values (p_user_id)
      on conflict (helper_id) do nothing;
    end if;

    -- LOCK 2: helper wallet
    select *
    into v_helper_wallet
    from public.credit_wallets
    where helper_id = p_user_id
    for update;

    if v_helper_wallet.helper_id is null then
      raise exception 'WALLET_NOT_FOUND';
    end if;

    v_before := coalesce(v_helper_wallet.balance, 0);
  else
    -- LOCK 2: client profile
    select *
    into p
    from public.profiles
    where id = p_user_id
    for update;

    if p.id is null then
      raise exception 'PROFILE_NOT_FOUND';
    end if;

    if p.role is distinct from 'client' then
      raise exception 'CLIENT_ONLY';
    end if;

    v_before := coalesce(p.credits, 0);
  end if;

  -- LOCK 3: open obligations oldest-first (inside settlement helper)
  v_settled := public.apply_credit_obligation_settlements_from_purchase(
    p_user_id,
    v_pe.id,
    v_gross
  );
  v_net := v_gross - v_settled;
  v_after_purchase := v_before + v_gross;
  v_final := v_before + v_net;

  v_meta := jsonb_build_object(
    'gross_lc', v_gross,
    'settled_lc', v_settled,
    'net_lc', v_net,
    'stripe_session_id', p_stripe_session_id,
    'stripe_event_id', p_stripe_event_id,
    'stripe_payment_intent_id', p_stripe_payment_intent,
    'package_id', pkg.package_id,
    'amount_cents', pkg.amount_cents,
    'currency', 'CAD',
    'source', 'stripe',
    'purchase_audience', p_expected_audience
  );

  if p_expected_audience = 'helper' then
    update public.credit_wallets
    set
      balance = v_final,
      total_purchased = total_purchased + v_gross,
      total_spent = total_spent + v_settled,
      updated_at = now()
    where helper_id = p_user_id;

    insert into public.credit_transactions (
      helper_id,
      type,
      amount,
      balance_after,
      related_payment_id,
      description,
      metadata
    ) values (
      p_user_id,
      'CREDIT_PURCHASE',
      v_gross,
      v_after_purchase,
      p_stripe_session_id,
      'LinkCredits purchase via Stripe',
      v_meta
    );

    if v_settled > 0 then
      insert into public.credit_transactions (
        helper_id,
        type,
        amount,
        balance_after,
        related_payment_id,
        description,
        metadata
      ) values (
        p_user_id,
        'OBLIGATION_SETTLEMENT',
        -v_settled,
        v_final,
        p_stripe_session_id,
        'Credit obligation settlement via Stripe purchase',
        v_meta
      );
    end if;
  else
    update public.profiles
    set
      credits = v_final,
      updated_at = now()
    where id = p_user_id;

    insert into public.client_credit_ledger (
      client_id,
      type,
      amount,
      balance_after,
      description,
      metadata
    ) values (
      p_user_id,
      'CREDIT_PURCHASE',
      v_gross,
      v_after_purchase,
      'LinkCredits purchase via Stripe',
      v_meta
    );

    if v_settled > 0 then
      insert into public.client_credit_ledger (
        client_id,
        type,
        amount,
        balance_after,
        description,
        metadata
      ) values (
        p_user_id,
        'OBLIGATION_SETTLEMENT',
        -v_settled,
        v_final,
        'Credit obligation settlement via Stripe purchase',
        v_meta
      );
    end if;
  end if;

  update public.payment_events
  set
    status = 'paid',
    credits = v_gross,
    amount_cents = pkg.amount_cents,
    currency = 'CAD',
    purchase_audience = p_expected_audience,
    stripe_payment_intent = coalesce(p_stripe_payment_intent, stripe_payment_intent),
    stripe_event_id = coalesce(stripe_event_id, p_stripe_event_id),
    raw_event = coalesce(p_raw_event, raw_event)
  where id = v_pe.id;

  return jsonb_build_object(
    'ok', true,
    'alreadyProcessed', false,
    'already_processed', false,
    'credits', v_gross,
    'gross_lc', v_gross,
    'settled_lc', v_settled,
    'net_lc', v_net,
    'balanceAfter', v_final
  );
end;
$$;

revoke all on function public.confirm_stripe_linkcredit_purchase_apply(jsonb, text) from public;
revoke all on function public.confirm_stripe_linkcredit_purchase_apply(jsonb, text) from anon;
revoke all on function public.confirm_stripe_linkcredit_purchase_apply(jsonb, text) from authenticated;
revoke all on function public.confirm_stripe_linkcredit_purchase_apply(jsonb, text) from service_role;

-- ---------------------------------------------------------------------------
-- 7) Public RPCs (service_role only)
-- ---------------------------------------------------------------------------
create or replace function public.confirm_stripe_linkcredit_purchase(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.confirm_stripe_linkcredit_purchase_apply(payload, 'helper');
end;
$$;

create or replace function public.confirm_client_stripe_linkcredit_purchase(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.confirm_stripe_linkcredit_purchase_apply(payload, 'client');
end;
$$;

revoke all on function public.confirm_stripe_linkcredit_purchase(jsonb) from public;
revoke all on function public.confirm_stripe_linkcredit_purchase(jsonb) from anon;
revoke all on function public.confirm_stripe_linkcredit_purchase(jsonb) from authenticated;
grant execute on function public.confirm_stripe_linkcredit_purchase(jsonb) to service_role;

revoke all on function public.confirm_client_stripe_linkcredit_purchase(jsonb) from public;
revoke all on function public.confirm_client_stripe_linkcredit_purchase(jsonb) from anon;
revoke all on function public.confirm_client_stripe_linkcredit_purchase(jsonb) from authenticated;
grant execute on function public.confirm_client_stripe_linkcredit_purchase(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 8) Disable legacy confirm_credit_purchase
-- ---------------------------------------------------------------------------
create or replace function public.confirm_credit_purchase(
  p_helper_id uuid,
  p_package_id text,
  p_payment_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'LEGACY_CREDIT_PURCHASE_DISABLED';
end;
$$;

revoke all on function public.confirm_credit_purchase(uuid, text, text) from public;
revoke all on function public.confirm_credit_purchase(uuid, text, text) from anon;
revoke all on function public.confirm_credit_purchase(uuid, text, text) from authenticated;
revoke all on function public.confirm_credit_purchase(uuid, text, text) from service_role;

notify pgrst, 'reload schema';
