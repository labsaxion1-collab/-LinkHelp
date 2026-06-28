-- =============================================================================
-- apply_client_reject_vip_application.sql
-- Client rejects an application.
-- VIP/exclusive reject: unlock request, 50% LC refund to helper, notify + push.
-- Normal reject: status update only.
-- Safe to re-run (idempotent definitions).
-- Prerequisite: apply_helper_exclusive_application_fix.sql (exclusive columns).
-- Does NOT alter VIP_EXCLUSIVE_PARTIAL_REFUND (displaced helpers) or Stripe.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: credit_transactions — new type + idempotency index
-- ---------------------------------------------------------------------------
alter table public.credit_transactions
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.credit_transactions
  add column if not exists request_id uuid references public.requests(id) on delete set null;

alter table public.credit_transactions
  add column if not exists application_id uuid references public.applications(id) on delete set null;

alter table public.credit_transactions
  add column if not exists balance_before int;

alter table public.credit_transactions drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions add constraint credit_transactions_type_check check (
  type in (
    'CREDIT_PURCHASE', 'FREE_BONUS', 'OPPORTUNITY_UNLOCK', 'REFUND', 'ADMIN_ADJUSTMENT',
    'APPLICATION_INTEREST', 'APPLICATION_SELECTED', 'VIP_EXCLUSIVE_PARTIAL_REFUND',
    'VIP_APPLICATION_REJECTED_REFUND'
  )
);

create unique index if not exists credit_transactions_vip_rejected_refund_uidx
  on public.credit_transactions (helper_id, application_id, type)
  where type = 'VIP_APPLICATION_REJECTED_REFUND' and application_id is not null;

-- ---------------------------------------------------------------------------
-- STEP 2: process_vip_application_rejected_refund
-- Credits 50% of the VIP APPLICATION_INTEREST debit back to the helper.
-- Idempotent via unique index + early exists check.
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

  refund_amount := debit_amount / 2;

  if refund_amount <= 0 then
    return jsonb_build_object(
      'skipped', true,
      'reason', 'zero_refund',
      'debitAmount', debit_amount,
      'applicationId', p_application_id
    );
  end if;

  select * into w
  from public.credit_wallets
  where helper_id = p_helper_id;

  if not found then
    insert into public.credit_wallets (helper_id)
    values (p_helper_id)
    on conflict (helper_id) do nothing;

    select * into w
    from public.credit_wallets
    where helper_id = p_helper_id;

    if not found then
      return jsonb_build_object('skipped', true, 'reason', 'wallet_missing');
    end if;
  end if;

  bal_before := w.balance;
  bal_after := bal_before + refund_amount;

  update public.credit_wallets
  set
    balance = bal_after,
    total_spent = greatest(0, total_spent - refund_amount),
    updated_at = now()
  where helper_id = p_helper_id;

  insert into public.credit_transactions (
    helper_id,
    type,
    amount,
    balance_before,
    balance_after,
    related_opportunity_id,
    request_id,
    application_id,
    description,
    metadata
  ) values (
    p_helper_id,
    'VIP_APPLICATION_REJECTED_REFUND',
    refund_amount,
    bal_before,
    bal_after,
    p_request_id,
    p_request_id,
    p_application_id,
    tx_description,
    jsonb_build_object(
      'refund_reason', 'vip_application_rejected',
      'refund_percent', 50,
      'original_debit_lc', debit_amount,
      'refund_amount_lc', refund_amount,
      'application_id', p_application_id
    )
  );

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

-- ---------------------------------------------------------------------------
-- STEP 3: client_reject_application
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
        app.id,
        app.helper_id,
        app.request_id
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
      app.id,
      app.helper_id,
      app.request_id
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
          app.helper_id,
          notif_title,
          notif_body,
          action_path
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

grant execute on function public.process_vip_application_rejected_refund(uuid, uuid, uuid) to authenticated;
grant execute on function public.client_reject_application(uuid) to authenticated;

notify pgrst, 'reload schema';
