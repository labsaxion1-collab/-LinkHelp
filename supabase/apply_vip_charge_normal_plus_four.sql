-- =============================================================================
-- apply_vip_charge_normal_plus_four.sql
-- Final MVP VIP debit rule: VIP charge = normal application charge + 4 LC.
-- VIP partial refund on reject: ceil(vip_debit / 2) — whole LinkCredits.
-- Idempotent. Safe to re-run. Does NOT execute retroactive wallet fixes.
--
-- Prerequisite: apply_vip_partial_refund.sql, apply_client_reject_vip_application.sql
-- Does NOT touch Stripe, pause flow, or request_refund_batches.
-- Apply in Supabase SQL Editor AFTER verify_vip_charge_normal_plus_four.sql baseline.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: process_vip_application_rejected_refund — ceil(50%) refund
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

  -- Whole LinkCredits: ceil(vipCharge / 2)
  refund_amount := ceil(debit_amount::numeric / 2)::int;

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
      'refund_rule', 'ceil_vip_charge_div_2',
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

grant execute on function public.process_vip_application_rejected_refund(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- STEP 2: Document VIP debit expectation (frontend sends p_interest_amount)
-- helper_submit_application debits p_interest_amount atomically; no schema change
-- required when frontend sends normal+4 for exclusive applications.
-- process_vip_exclusive_partial_refunds unchanged: +2 LC per displaced normal helper.
-- ---------------------------------------------------------------------------

select 'process_vip_application_rejected_refund uses ceil refund' as check_name,
  (
    select pg_get_functiondef(p.oid) ~* 'ceil\(debit_amount'
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'process_vip_application_rejected_refund'
  ) as ok;
