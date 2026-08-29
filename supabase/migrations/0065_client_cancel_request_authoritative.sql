-- Authoritative client request cancellation (7 LC fee + helper compensations).
-- Does NOT gate client_publish_request on open credit_obligations yet (future migration).
-- Human-message participation is NOT provable safely in 0001–0064; compensation uses
-- verifiable APPLICATION_INTEREST debits only (amount < 0 in credit_transactions).

-- ---------------------------------------------------------------------------
-- 1) Ledger / transaction types + idempotency indexes
-- ---------------------------------------------------------------------------
create unique index if not exists client_credit_ledger_request_cancel_fee_uidx
  on public.client_credit_ledger (request_id)
  where type = 'REQUEST_CANCEL_FEE' and request_id is not null;

alter table public.credit_transactions drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions add constraint credit_transactions_type_check check (
  type in (
    'CREDIT_PURCHASE', 'FREE_BONUS', 'OPPORTUNITY_UNLOCK', 'REFUND', 'ADMIN_ADJUSTMENT',
    'APPLICATION_INTEREST', 'APPLICATION_SELECTED', 'VIP_EXCLUSIVE_PARTIAL_REFUND',
    'VIP_APPLICATION_REJECTED_REFUND', 'REQUEST_CANCEL_HELPER_COMPENSATION'
  )
);

create unique index if not exists credit_transactions_cancel_helper_comp_uidx
  on public.credit_transactions (helper_id, application_id, type)
  where type = 'REQUEST_CANCEL_HELPER_COMPENSATION' and application_id is not null;

-- ---------------------------------------------------------------------------
-- 2) public.client_cancel_request(p_request_id uuid)
-- ---------------------------------------------------------------------------
create or replace function public.client_cancel_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  req public.requests;
  prof public.profiles;
  v_fee_lc int := 7;
  v_balance int := 0;
  v_debited_lc int := 0;
  v_debt_created_lc int := 0;
  v_idempotency_key text;
  v_normal_helpers int := 0;
  v_normal_comp_total int := 0;
  v_vip_refund_total int := 0;
  v_vip_result jsonb;
  app_row record;
  w public.credit_wallets;
  bal_before int;
  bal_after int;
  comp_amount int := 2;
  debit_found boolean;
  v_obligation_id uuid;
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_request_id is null then
    raise exception 'INVALID_REQUEST';
  end if;

  v_idempotency_key := 'request_cancel_fee:' || p_request_id::text;

  -- LOCK 1: client profile (stable order: profile before request)
  select * into prof
  from public.profiles
  where id = caller
  for update;

  if prof.id is null or prof.role is distinct from 'client' then
    raise exception 'NOT_ALLOWED';
  end if;

  -- LOCK 2: request row
  select * into req
  from public.requests
  where id = p_request_id
  for update;

  if req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if req.client_id is distinct from caller then
    raise exception 'NOT_ALLOWED';
  end if;

  if req.status in ('completed', 'expired') then
    raise exception 'REQUEST_NOT_CANCELLABLE';
  end if;

  if req.status = 'cancelled' then
    select coalesce(abs(l.amount), 0)::int into v_debited_lc
    from public.client_credit_ledger l
    where l.request_id = p_request_id
      and l.type = 'REQUEST_CANCEL_FEE'
      and l.client_id = caller
    limit 1;

    select coalesce(o.amount_outstanding, 0)::int into v_debt_created_lc
    from public.credit_obligations o
    where o.idempotency_key = v_idempotency_key
    limit 1;

    select count(*)::int into v_normal_helpers
    from public.credit_transactions ct
    where ct.request_id = p_request_id
      and ct.type = 'REQUEST_CANCEL_HELPER_COMPENSATION';

    select coalesce(sum(ct.amount), 0)::int into v_normal_comp_total
    from public.credit_transactions ct
    where ct.request_id = p_request_id
      and ct.type = 'REQUEST_CANCEL_HELPER_COMPENSATION';

    select coalesce(sum(ct.amount), 0)::int into v_vip_refund_total
    from public.credit_transactions ct
    where ct.request_id = p_request_id
      and ct.type = 'VIP_APPLICATION_REJECTED_REFUND';

    return jsonb_build_object(
      'request_id', p_request_id,
      'status', 'cancelled',
      'already_cancelled', true,
      'fee_lc', v_fee_lc,
      'debited_lc', coalesce(v_debited_lc, 0),
      'debt_created_lc', coalesce(v_debt_created_lc, 0),
      'normal_helpers_compensated', coalesce(v_normal_helpers, 0),
      'normal_compensation_total_lc', coalesce(v_normal_comp_total, 0),
      'vip_refund_lc', coalesce(v_vip_refund_total, 0),
      'balance_after', coalesce(prof.credits, 0)
    );
  end if;

  if req.status is distinct from 'open'
     and req.status is distinct from 'in_progress' then
    raise exception 'REQUEST_NOT_CANCELLABLE';
  end if;

  v_balance := coalesce(prof.credits, 0);

  -- Client cancel fee (idempotent via ledger unique index)
  if exists (
    select 1
    from public.client_credit_ledger l
    where l.request_id = p_request_id
      and l.type = 'REQUEST_CANCEL_FEE'
      and l.client_id = caller
  ) then
    select coalesce(abs(l.amount), 0)::int into v_debited_lc
    from public.client_credit_ledger l
    where l.request_id = p_request_id
      and l.type = 'REQUEST_CANCEL_FEE'
      and l.client_id = caller
    limit 1;

    select coalesce(o.amount_outstanding, 0)::int into v_debt_created_lc
    from public.credit_obligations o
    where o.idempotency_key = v_idempotency_key
    limit 1;

    v_balance := coalesce(prof.credits, 0);
  else
    v_debited_lc := least(v_balance, v_fee_lc);
    v_debt_created_lc := v_fee_lc - v_debited_lc;
    v_balance := v_balance - v_debited_lc;

    update public.profiles
    set
      credits = v_balance,
      updated_at = now()
    where id = caller;

    if v_debited_lc > 0 then
      insert into public.client_credit_ledger (
        client_id, type, amount, balance_after, request_id, description, metadata
      ) values (
        caller,
        'REQUEST_CANCEL_FEE',
        -v_debited_lc,
        v_balance,
        p_request_id,
        'Taxa de cancelamento de chamado',
        jsonb_build_object(
          'request_id', p_request_id,
          'fee_lc', v_fee_lc,
          'debited_lc', v_debited_lc,
          'debt_created_lc', v_debt_created_lc
        )
      );
    end if;

    if v_debt_created_lc > 0 then
      insert into public.credit_obligations (
        owner_user_id,
        owner_role,
        amount_original,
        amount_paid,
        amount_outstanding,
        status,
        reason,
        request_id,
        idempotency_key,
        metadata
      ) values (
        caller,
        'client',
        v_fee_lc,
        v_debited_lc,
        v_debt_created_lc,
        'open',
        'REQUEST_CANCEL_FEE',
        p_request_id,
        v_idempotency_key,
        jsonb_build_object(
          'request_id', p_request_id,
          'fee_lc', v_fee_lc,
          'debited_lc', v_debited_lc
        )
      )
      on conflict (idempotency_key) do nothing
      returning id into v_obligation_id;

      if v_obligation_id is null then
        select o.amount_outstanding into v_debt_created_lc
        from public.credit_obligations o
        where o.idempotency_key = v_idempotency_key;
      end if;
    end if;
  end if;

  -- Helper compensations (application order: helper_id ASC, id ASC)
  for app_row in
    select
      a.id as application_id,
      a.helper_id,
      coalesce(a.is_exclusive, false) as is_exclusive
    from public.applications a
    where a.request_id = p_request_id
    order by a.helper_id asc, a.id asc
  loop
    select exists (
      select 1
      from public.credit_transactions ct
      where ct.helper_id = app_row.helper_id
        and ct.type = 'APPLICATION_INTEREST'
        and ct.amount < 0
        and (
          ct.application_id = app_row.application_id
          or ct.request_id = p_request_id
          or ct.related_opportunity_id = p_request_id
        )
    ) into debit_found;

    if not debit_found then
      continue;
    end if;

    if app_row.is_exclusive then
      v_vip_result := public.process_vip_application_rejected_refund(
        app_row.application_id,
        app_row.helper_id,
        p_request_id
      );
      v_vip_refund_total := v_vip_refund_total + coalesce((v_vip_result->>'refundAmount')::int, 0);
      continue;
    end if;

    if exists (
      select 1
      from public.credit_transactions ct
      where ct.helper_id = app_row.helper_id
        and ct.type = 'VIP_EXCLUSIVE_PARTIAL_REFUND'
        and (
          ct.request_id = p_request_id
          or ct.related_opportunity_id = p_request_id
        )
    ) then
      continue;
    end if;

    if exists (
      select 1
      from public.credit_transactions ct
      where ct.helper_id = app_row.helper_id
        and ct.application_id = app_row.application_id
        and ct.type = 'REQUEST_CANCEL_HELPER_COMPENSATION'
    ) then
      continue;
    end if;

    insert into public.credit_wallets (helper_id)
    values (app_row.helper_id)
    on conflict (helper_id) do nothing;

    select * into w
    from public.credit_wallets
    where helper_id = app_row.helper_id
    for update;

    if not found then
      continue;
    end if;

    if exists (
      select 1
      from public.credit_transactions ct
      where ct.helper_id = app_row.helper_id
        and ct.application_id = app_row.application_id
        and ct.type = 'REQUEST_CANCEL_HELPER_COMPENSATION'
    ) then
      continue;
    end if;

    bal_before := w.balance;
    bal_after := bal_before + comp_amount;

    update public.credit_wallets
    set
      balance = bal_after,
      total_bonus = total_bonus + comp_amount,
      updated_at = now()
    where helper_id = app_row.helper_id;

    begin
      insert into public.credit_transactions (
        helper_id, type, amount, balance_before, balance_after,
        related_opportunity_id, request_id, application_id, description, metadata
      ) values (
        app_row.helper_id,
        'REQUEST_CANCEL_HELPER_COMPENSATION',
        comp_amount,
        bal_before,
        bal_after,
        p_request_id,
        p_request_id,
        app_row.application_id,
        'Compensação por cancelamento do chamado pelo cliente',
        jsonb_build_object(
          'request_id', p_request_id,
          'application_id', app_row.application_id,
          'compensation_lc', comp_amount,
          'reason', 'client_request_cancelled'
        )
      );
    exception
      when unique_violation then
        update public.credit_wallets
        set
          balance = bal_before,
          total_bonus = greatest(0, total_bonus - comp_amount),
          updated_at = now()
        where helper_id = app_row.helper_id;
        continue;
    end;

    v_normal_helpers := v_normal_helpers + 1;
    v_normal_comp_total := v_normal_comp_total + comp_amount;
  end loop;

  update public.applications
  set status = 'cancelled'
  where request_id = p_request_id
    and status <> 'cancelled';

  update public.requests
  set
    status = 'cancelled',
    updated_at = now()
  where id = p_request_id;

  return jsonb_build_object(
    'request_id', p_request_id,
    'status', 'cancelled',
    'fee_lc', v_fee_lc,
    'debited_lc', v_debited_lc,
    'debt_created_lc', v_debt_created_lc,
    'normal_helpers_compensated', v_normal_helpers,
    'normal_compensation_total_lc', v_normal_comp_total,
    'vip_refund_lc', v_vip_refund_total,
    'balance_after', v_balance
  );
end;
$$;

comment on function public.client_cancel_request(uuid) is
  'Client-owned cancel: 7 LC fee (partial debit + REQUEST_CANCEL_FEE obligation), helper compensations. Idempotent per request.';

revoke all on function public.client_cancel_request(uuid) from public;
revoke all on function public.client_cancel_request(uuid) from anon;
revoke all on function public.client_cancel_request(uuid) from authenticated;
grant execute on function public.client_cancel_request(uuid) to authenticated;
