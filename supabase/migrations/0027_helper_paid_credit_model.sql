-- Helper-paid opportunity credits: interest + selection debits, market analytics scaffold

alter table public.credit_transactions
  add column if not exists request_id uuid references public.requests(id) on delete set null,
  add column if not exists application_id uuid references public.applications(id) on delete set null,
  add column if not exists balance_before int;

create index if not exists credit_transactions_request_idx on public.credit_transactions (request_id) where request_id is not null;
create index if not exists credit_transactions_helper_request_type_idx
  on public.credit_transactions (helper_id, request_id, type)
  where request_id is not null;

create table if not exists public.request_market_metrics (
  request_id uuid primary key references public.requests(id) on delete cascade,
  acceptance_rate numeric(5,4) not null default 0.5,
  not_interested_rate numeric(5,4) not null default 0,
  average_price_cad numeric(12,2),
  average_distance_km numeric(8,2),
  average_response_hours numeric(8,2),
  interest_count int not null default 0,
  not_interested_count int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.credit_transactions drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions add constraint credit_transactions_type_check check (
  type in (
    'CREDIT_PURCHASE', 'FREE_BONUS', 'OPPORTUNITY_UNLOCK', 'REFUND', 'ADMIN_ADJUSTMENT',
    'APPLICATION_INTEREST', 'APPLICATION_SELECTED'
  )
);

create or replace function public.estimate_request_credit_price(req public.requests)
returns int
language plpgsql
immutable
as $$
declare
  v numeric := 0;
begin
  if req.budget_type = 'negotiable' or req.budget is null or trim(req.budget) = '' then
    v := 0;
  elsif req.budget_max is not null and req.budget_max > 0 then
    v := req.budget_max;
  elsif req.budget_min is not null and req.budget_min > 0 then
    v := req.budget_min;
  else
    v := 0;
  end if;
  if v <= 50 then return 2;
  if v <= 100 then return 4;
  if v <= 250 then return 6;
  if v <= 500 then return 10;
  if v <= 1000 then return 16;
  return 24;
end;
$$;

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
  if caller is null or caller <> p_helper_id then raise exception 'NOT_ALLOWED'; end if;
  if p_amount < 0 then raise exception 'INVALID_AMOUNT'; end if;

  select id into tx_id from public.credit_transactions
  where helper_id = p_helper_id and request_id = p_request_id and type = 'APPLICATION_INTEREST'
  limit 1;
  if tx_id is not null then
    return jsonb_build_object('alreadyCharged', true, 'amount', p_amount);
  end if;

  w := public.ensure_helper_credit_wallet(p_helper_id);
  bal_before := w.balance;
  if bal_before < p_amount then raise exception 'INSUFFICIENT_CREDITS'; end if;
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

create or replace function public.helper_debit_application_selected(
  p_helper_id uuid,
  p_request_id uuid,
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
  w public.credit_wallets;
  bal_before int;
  bal_after int;
  tx_id uuid;
  req_client uuid;
begin
  if caller is null then raise exception 'AUTH_REQUIRED'; end if;
  if caller <> p_helper_id then
    select client_id into req_client from public.requests where id = p_request_id;
    if req_client is null or req_client <> caller then raise exception 'NOT_ALLOWED'; end if;
  end if;
  if p_amount < 2 or p_amount > 30 then raise exception 'INVALID_AMOUNT'; end if;

  select id into tx_id from public.credit_transactions
  where helper_id = p_helper_id and request_id = p_request_id and type = 'APPLICATION_SELECTED'
  limit 1;
  if tx_id is not null then
    return jsonb_build_object('alreadyCharged', true, 'amount', p_amount);
  end if;

  w := public.ensure_helper_credit_wallet(p_helper_id);
  bal_before := w.balance;
  if bal_before < p_amount then raise exception 'INSUFFICIENT_CREDITS'; end if;
  bal_after := bal_before - p_amount;

  update public.credit_wallets
  set balance = bal_after, total_spent = total_spent + p_amount
  where helper_id = p_helper_id;

  insert into public.credit_transactions (
    helper_id, type, amount, balance_before, balance_after, related_opportunity_id, request_id, application_id, description
  ) values (
    p_helper_id, 'APPLICATION_SELECTED', -p_amount, bal_before, bal_after, p_request_id, p_request_id, p_application_id,
    'Contratação confirmada pelo cliente'
  );

  return jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'balanceBefore', bal_before,
    'balanceAfter', bal_after
  );
end;
$$;

update public.credit_packages set active = false where id in ('starter', 'plus', 'pro', 'business');

insert into public.credit_packages (id, name, credits, price_cad, active, highlight_label)
values
  ('starter', 'Starter', 35, 14.99, true, null),
  ('popular', 'Popular', 80, 29.99, true, 'Mais popular'),
  ('pro', 'Pro', 180, 59.99, true, null),
  ('power', 'Power', 400, 119.99, true, 'Melhor valor')
on conflict (id) do update set
  name = excluded.name,
  credits = excluded.credits,
  price_cad = excluded.price_cad,
  active = excluded.active,
  highlight_label = excluded.highlight_label;

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
begin
  if caller is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into app from public.applications where id = p_application_id;
  if app.id is null then raise exception 'NOT_FOUND'; end if;
  select * into req from public.requests where id = app.request_id;
  if req.client_id <> caller then raise exception 'NOT_ALLOWED'; end if;

  return public.helper_debit_application_selected(app.helper_id, app.request_id, app.id, p_amount);
end;
$$;

grant execute on function public.helper_debit_application_interest(uuid, uuid, int) to authenticated;
grant execute on function public.helper_debit_application_selected(uuid, uuid, uuid, int) to authenticated;
grant execute on function public.charge_helper_on_client_hire(uuid, int) to authenticated;
