-- Ensure helper_debit_application_interest exists for Me candidatar / interest debit RPC.
-- PostgREST expects named args: p_helper_id, p_request_id, p_amount.

alter table public.credit_transactions
  add column if not exists request_id uuid references public.requests(id) on delete set null,
  add column if not exists application_id uuid references public.applications(id) on delete set null,
  add column if not exists balance_before int;

alter table public.credit_transactions drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions add constraint credit_transactions_type_check check (
  type in (
    'CREDIT_PURCHASE', 'FREE_BONUS', 'OPPORTUNITY_UNLOCK', 'REFUND', 'ADMIN_ADJUSTMENT',
    'APPLICATION_INTEREST', 'APPLICATION_SELECTED'
  )
);

create or replace function public.helper_debit_application_interest(
  p_helper_id uuid,
  p_request_id uuid,
  p_amount int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  w public.credit_wallets;
  bal_before int;
  bal_after int;
  tx_id uuid;
begin
  if caller is null or caller <> p_helper_id then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_amount < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select id into tx_id
  from public.credit_transactions
  where helper_id = p_helper_id
    and request_id = p_request_id
    and type = 'APPLICATION_INTEREST'
  limit 1;

  if tx_id is not null then
    return jsonb_build_object('alreadyCharged', true, 'amount', p_amount);
  end if;

  w := public.ensure_helper_credit_wallet(p_helper_id);
  bal_before := w.balance;
  if bal_before < p_amount then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;
  bal_after := bal_before - p_amount;

  update public.credit_wallets
  set balance = bal_after, total_spent = total_spent + p_amount
  where helper_id = p_helper_id;

  insert into public.credit_transactions (
    helper_id, type, amount, balance_before, balance_after, related_opportunity_id, request_id, description
  ) values (
    p_helper_id, 'APPLICATION_INTEREST', -p_amount, bal_before, bal_after, p_request_id, p_request_id,
    'Interesse em oportunidade'
  );

  return jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'balanceBefore', bal_before,
    'balanceAfter', bal_after
  );
end;
$$;

grant execute on function public.helper_debit_application_interest(uuid, uuid, int) to authenticated;

notify pgrst, 'reload schema';
