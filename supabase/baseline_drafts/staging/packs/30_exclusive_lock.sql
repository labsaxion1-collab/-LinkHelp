-- =============================================================================
-- P4.0.5 staging overlay — 30_exclusive_lock.sql
-- Origem: apply_helper_exclusive_application_fix.sql (schema + debit + lock)
-- NÃO redefine helper_submit_application (pack 50 é autoritativo).
-- Sem backfill UPDATE de requests (banco vazio).
--
-- LOCK ORDER (deadlock avoidance — same for Normal and VIP):
--   1) public.requests row (acquired in helper_submit_application, pack 50)
--   2) public.credit_wallets row of the acting helper (SELECT … FOR UPDATE here)
--   3) public.credit_wallets of displaced normals (pack 50), ordered by helper_id ASC
-- Never take global advisory locks. Never lock wallets before the request row
-- when both are needed.
-- =============================================================================

alter table public.applications
  add column if not exists is_exclusive boolean not null default false;

alter table public.applications
  add column if not exists proposed_amount numeric;

alter table public.requests
  add column if not exists exclusive_helper_id uuid references public.profiles(id) on delete set null;

create index if not exists requests_exclusive_helper_idx
  on public.requests (exclusive_helper_id)
  where exclusive_helper_id is not null;

alter table public.credit_transactions
  add column if not exists request_id uuid references public.requests(id) on delete set null;

alter table public.credit_transactions
  add column if not exists application_id uuid references public.applications(id) on delete set null;

alter table public.credit_transactions
  add column if not exists balance_before int;

alter table public.credit_transactions
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.credit_transactions drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions add constraint credit_transactions_type_check check (
  type in (
    'CREDIT_PURCHASE', 'FREE_BONUS', 'OPPORTUNITY_UNLOCK', 'REFUND', 'ADMIN_ADJUSTMENT',
    'APPLICATION_INTEREST', 'APPLICATION_SELECTED', 'VIP_EXCLUSIVE_PARTIAL_REFUND',
    'VIP_APPLICATION_REJECTED_REFUND'
  )
);

create index if not exists applications_request_active_idx
  on public.applications (request_id, status);

create index if not exists applications_request_exclusive_idx
  on public.applications (request_id)
  where is_exclusive = true and status in ('pending', 'viewed', 'accepted');

-- No máximo um VIP ativo por chamado (lock servidor)
create unique index if not exists applications_one_active_exclusive_uidx
  on public.applications (request_id)
  where is_exclusive = true and status in ('pending', 'viewed', 'accepted');

create index if not exists credit_transactions_request_idx
  on public.credit_transactions (request_id)
  where request_id is not null;

create unique index if not exists credit_transactions_helper_request_interest_uidx
  on public.credit_transactions (helper_id, related_opportunity_id, type)
  where type = 'APPLICATION_INTEREST' and related_opportunity_id is not null;

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
  charged_amount int;
begin
  if caller is null or caller <> p_helper_id then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_amount < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  -- Ensure row exists, then take the authoritative wallet lock BEFORE financial checks.
  perform public.ensure_helper_credit_wallet(p_helper_id);

  select * into w
  from public.credit_wallets
  where helper_id = p_helper_id
  for update;

  if w.helper_id is null then
    raise exception 'WALLET_MISSING';
  end if;

  -- Re-check idempotency after acquiring the wallet lock (retry-safe).
  select ct.id, abs(ct.amount)::int
    into tx_id, charged_amount
  from public.credit_transactions ct
  where ct.helper_id = p_helper_id
    and ct.type = 'APPLICATION_INTEREST'
    and (
      ct.related_opportunity_id = p_request_id
      or ct.request_id = p_request_id
    )
  order by ct.created_at asc
  limit 1;

  if tx_id is not null then
    return jsonb_build_object(
      'alreadyCharged', true,
      'amount', coalesce(charged_amount, p_amount),
      'transactionId', tx_id
    );
  end if;

  bal_before := w.balance;
  if bal_before < p_amount then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;
  bal_after := bal_before - p_amount;

  update public.credit_wallets
  set
    balance = bal_after,
    total_spent = total_spent + p_amount,
    updated_at = now()
  where helper_id = p_helper_id;

  begin
    insert into public.credit_transactions (
      helper_id, type, amount, balance_before, balance_after,
      related_opportunity_id, request_id, description
    ) values (
      p_helper_id, 'APPLICATION_INTEREST', -p_amount, bal_before, bal_after,
      p_request_id, p_request_id, 'Interesse em oportunidade'
    )
    returning id into tx_id;
  exception
    when unique_violation then
      -- Index-backed last line of defense; wallet UPDATE rolls back with the statement
      -- only if we re-raise. Prefer idempotent return after re-read.
      select ct.id, abs(ct.amount)::int
        into tx_id, charged_amount
      from public.credit_transactions ct
      where ct.helper_id = p_helper_id
        and ct.type = 'APPLICATION_INTEREST'
        and (
          ct.related_opportunity_id = p_request_id
          or ct.request_id = p_request_id
        )
      order by ct.created_at asc
      limit 1;

      if tx_id is null then
        raise;
      end if;

      -- Reverse this session's wallet mutation; winner already owns the ledger row.
      update public.credit_wallets
      set
        balance = bal_before,
        total_spent = greatest(0, total_spent - p_amount),
        updated_at = now()
      where helper_id = p_helper_id;

      return jsonb_build_object(
        'alreadyCharged', true,
        'amount', coalesce(charged_amount, p_amount),
        'transactionId', tx_id
      );
  end;

  return jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'balanceBefore', bal_before,
    'balanceAfter', bal_after,
    'transactionId', tx_id
  );
end;
$$;

grant execute on function public.helper_debit_application_interest(uuid, uuid, int) to authenticated;

create or replace function public.request_has_exclusive_lock(
  p_request_id uuid,
  p_helper_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    where a.request_id = p_request_id
      and a.is_exclusive = true
      and a.status in ('pending', 'viewed', 'accepted')
      and a.helper_id <> coalesce(p_helper_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
$$;

grant execute on function public.request_has_exclusive_lock(uuid, uuid) to authenticated;

create or replace function public.sync_request_exclusive_helper_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  req_id uuid := coalesce(NEW.request_id, OLD.request_id);
  lock_helper uuid;
begin
  select a.helper_id into lock_helper
  from public.applications a
  where a.request_id = req_id
    and a.is_exclusive = true
    and a.status in ('pending', 'viewed', 'accepted')
  order by a.created_at desc
  limit 1;

  update public.requests
  set exclusive_helper_id = lock_helper
  where id = req_id;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_sync_request_exclusive_helper on public.applications;
create trigger trg_sync_request_exclusive_helper
  after insert or update of is_exclusive, status or delete
  on public.applications
  for each row
  execute function public.sync_request_exclusive_helper_id();
