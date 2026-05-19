-- LinkHelp helper credit marketplace.
-- Apply in Supabase only when ready to activate monetization in production.

create table if not exists public.credit_wallets (
  id uuid primary key default gen_random_uuid(),
  helper_id uuid not null unique references public.profiles (id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  total_purchased int not null default 0 check (total_purchased >= 0),
  total_bonus int not null default 0 check (total_bonus >= 0),
  total_spent int not null default 0 check (total_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  helper_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('CREDIT_PURCHASE','FREE_BONUS','OPPORTUNITY_UNLOCK','REFUND','ADMIN_ADJUSTMENT')),
  amount int not null,
  balance_after int not null check (balance_after >= 0),
  related_opportunity_id uuid null references public.requests (id) on delete set null,
  related_payment_id text null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunity_unlocks (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.requests (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  credits_spent int not null check (credits_spent > 0),
  status text not null default 'unlocked' check (status in ('unlocked','refunded','cancelled')),
  unlocked_at timestamptz not null default now(),
  refund_eligible boolean not null default true,
  refunded_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (opportunity_id, helper_id)
);

create table if not exists public.credit_packages (
  id text primary key,
  name text not null,
  credits int not null check (credits > 0),
  price_cad numeric(10,2) not null check (price_cad > 0),
  active boolean not null default true,
  highlight_label text null,
  created_at timestamptz not null default now()
);

insert into public.credit_packages (id, name, credits, price_cad, active, highlight_label)
values
  ('starter', 'Starter', 20, 15, true, null),
  ('plus', 'Plus', 50, 35, true, 'Popular'),
  ('pro', 'Pro', 120, 70, true, 'Melhor valor'),
  ('business', 'Business', 250, 130, true, 'Business')
on conflict (id) do update set
  name = excluded.name,
  credits = excluded.credits,
  price_cad = excluded.price_cad,
  active = excluded.active,
  highlight_label = excluded.highlight_label;

create index if not exists credit_transactions_helper_created_idx on public.credit_transactions (helper_id, created_at desc);
create index if not exists opportunity_unlocks_helper_created_idx on public.opportunity_unlocks (helper_id, created_at desc);
create index if not exists opportunity_unlocks_opportunity_idx on public.opportunity_unlocks (opportunity_id);
create unique index if not exists conversations_request_helper_idx on public.conversations (request_id, helper_id);

drop trigger if exists credit_wallets_set_updated_at on public.credit_wallets;
create trigger credit_wallets_set_updated_at
  before update on public.credit_wallets
  for each row execute function public.set_updated_at();

alter table public.credit_wallets enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.opportunity_unlocks enable row level security;
alter table public.credit_packages enable row level security;

drop policy if exists credit_wallets_select_own on public.credit_wallets;
create policy credit_wallets_select_own on public.credit_wallets
  for select to authenticated using (auth.uid() = helper_id);

drop policy if exists credit_transactions_select_own on public.credit_transactions;
create policy credit_transactions_select_own on public.credit_transactions
  for select to authenticated using (auth.uid() = helper_id);

drop policy if exists opportunity_unlocks_select_related on public.opportunity_unlocks;
create policy opportunity_unlocks_select_related on public.opportunity_unlocks
  for select to authenticated using (
    auth.uid() = helper_id or exists (
      select 1 from public.requests r
      where r.id = opportunity_unlocks.opportunity_id and r.client_id = auth.uid()
    )
  );

drop policy if exists credit_packages_select_active on public.credit_packages;
create policy credit_packages_select_active on public.credit_packages
  for select to authenticated using (active = true);

create or replace function public.estimate_request_credit_price(p_request public.requests)
returns int
language plpgsql
stable
as $$
declare
  n text;
  max_budget numeric := 0;
  base_price int := 5;
begin
  if p_request.budget is not null then
    for n in select (m)[1] from regexp_matches(p_request.budget, '(\d+(?:\.\d+)?)', 'g') as m loop
      max_budget := greatest(max_budget, n::numeric);
    end loop;
  end if;

  if p_request.category = 'cleaning' then base_price := 3; end if;
  if p_request.category in ('moving','assembly','renovation','outdoor','automotive') then base_price := 5; end if;
  if max_budget >= 700 then return 12; end if;
  if p_request.urgency = 'high' or max_budget >= 300 then return 8; end if;
  return base_price;
end;
$$;

create or replace function public.ensure_helper_credit_wallet(p_helper_id uuid)
returns public.credit_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.credit_wallets;
  p public.profiles;
begin
  select * into p from public.profiles where id = p_helper_id;
  if p.id is null or p.role <> 'helper' then raise exception 'HELPER_ONLY'; end if;

  insert into public.credit_wallets (helper_id, balance, total_bonus)
  values (p_helper_id, 10, 10)
  on conflict (helper_id) do nothing;

  select * into w from public.credit_wallets where helper_id = p_helper_id for update;

  if not exists (
    select 1 from public.credit_transactions
    where helper_id = p_helper_id and type = 'FREE_BONUS'
  ) then
    insert into public.credit_transactions (helper_id, type, amount, balance_after, description)
    values (p_helper_id, 'FREE_BONUS', 10, w.balance, 'Bonus inicial de helper');
  end if;

  return w;
end;
$$;

create or replace function public.unlock_opportunity_with_credits(p_opportunity_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  helper uuid := auth.uid();
  req public.requests;
  prof public.profiles;
  w public.credit_wallets;
  existing public.opportunity_unlocks;
  cost int;
  new_balance int;
begin
  if helper is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into prof from public.profiles where id = helper;
  if prof.id is null or prof.role <> 'helper' then raise exception 'HELPER_ONLY'; end if;

  select * into req from public.requests where id = p_opportunity_id and status = 'open';
  if req.id is null then raise exception 'OPPORTUNITY_UNAVAILABLE'; end if;

  select * into existing from public.opportunity_unlocks
  where opportunity_id = p_opportunity_id and helper_id = helper;
  if existing.id is not null then
    return jsonb_build_object('alreadyUnlocked', true, 'creditsSpent', existing.credits_spent);
  end if;

  w := public.ensure_helper_credit_wallet(helper);
  cost := public.estimate_request_credit_price(req);
  if w.balance < cost then raise exception 'INSUFFICIENT_CREDITS'; end if;
  new_balance := w.balance - cost;

  update public.credit_wallets
  set balance = new_balance, total_spent = total_spent + cost
  where helper_id = helper;

  insert into public.opportunity_unlocks (opportunity_id, helper_id, credits_spent, status, refund_eligible)
  values (p_opportunity_id, helper, cost, 'unlocked', true);

  insert into public.credit_transactions (helper_id, type, amount, balance_after, related_opportunity_id, description)
  values (helper, 'OPPORTUNITY_UNLOCK', -cost, new_balance, p_opportunity_id, 'Desbloqueio de oportunidade');

  insert into public.conversations (request_id, client_id, helper_id, contact_unlocked)
  values (p_opportunity_id, req.client_id, helper, true)
  on conflict do nothing;

  insert into public.applications (request_id, helper_id, client_id, status, message)
  values (p_opportunity_id, helper, req.client_id, 'pending', null)
  on conflict do nothing;

  insert into public.notifications (user_id, type, title, description, action_url, read)
  values (req.client_id, 'application', 'Nova proposta', 'Um helper desbloqueou sua oportunidade e pode conversar pelo app.', '/client/dashboard', false);

  return jsonb_build_object('alreadyUnlocked', false, 'creditsSpent', cost, 'balanceAfter', new_balance);
end;
$$;

create or replace function public.refund_opportunity_unlock(p_unlock_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  helper uuid := auth.uid();
  u public.opportunity_unlocks;
  refund_amount int;
  new_balance int;
begin
  select * into u from public.opportunity_unlocks where id = p_unlock_id and helper_id = helper for update;
  if u.id is null then raise exception 'REFUND_NOT_AVAILABLE'; end if;
  if u.status = 'refunded' or u.refunded_at is not null then raise exception 'REFUND_ALREADY_PROCESSED'; end if;
  if u.refund_eligible is false or u.unlocked_at > now() - interval '48 hours' then raise exception 'REFUND_NOT_AVAILABLE'; end if;

  refund_amount := floor(u.credits_spent * 0.5);
  update public.credit_wallets
  set balance = balance + refund_amount
  where helper_id = helper
  returning balance into new_balance;

  update public.opportunity_unlocks
  set status = 'refunded', refunded_at = now()
  where id = p_unlock_id;

  insert into public.credit_transactions (helper_id, type, amount, balance_after, related_opportunity_id, description)
  values (helper, 'REFUND', refund_amount, new_balance, u.opportunity_id, 'Reembolso parcial por falta de resposta em 48h');

  return jsonb_build_object('refunded', refund_amount, 'balanceAfter', new_balance);
end;
$$;

create or replace function public.admin_adjust_helper_credits(p_helper_id uuid, p_amount int, p_description text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.credit_wallets;
  new_balance int;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'ADMIN_ONLY';
  end if;
  w := public.ensure_helper_credit_wallet(p_helper_id);
  if w.balance + p_amount < 0 then raise exception 'NEGATIVE_BALANCE'; end if;
  new_balance := w.balance + p_amount;
  update public.credit_wallets set balance = new_balance where helper_id = p_helper_id;
  insert into public.credit_transactions (helper_id, type, amount, balance_after, description)
  values (p_helper_id, 'ADMIN_ADJUSTMENT', p_amount, new_balance, coalesce(p_description, 'Ajuste administrativo'));
  return jsonb_build_object('balanceAfter', new_balance);
end;
$$;

create or replace function public.confirm_credit_purchase(p_helper_id uuid, p_package_id text, p_payment_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pkg public.credit_packages;
  w public.credit_wallets;
  new_balance int;
begin
  if exists (
    select 1 from public.credit_transactions
    where related_payment_id = p_payment_id and type = 'CREDIT_PURCHASE'
  ) then
    return jsonb_build_object('alreadyConfirmed', true);
  end if;

  select * into pkg from public.credit_packages where id = p_package_id and active = true;
  if pkg.id is null then raise exception 'PACKAGE_NOT_FOUND'; end if;

  w := public.ensure_helper_credit_wallet(p_helper_id);
  new_balance := w.balance + pkg.credits;

  update public.credit_wallets
  set balance = new_balance, total_purchased = total_purchased + pkg.credits
  where helper_id = p_helper_id;

  insert into public.credit_transactions (
    helper_id, type, amount, balance_after, related_payment_id, description
  ) values (
    p_helper_id,
    'CREDIT_PURCHASE',
    pkg.credits,
    new_balance,
    p_payment_id,
    'Compra de pacote ' || pkg.name
  );

  return jsonb_build_object('credits', pkg.credits, 'balanceAfter', new_balance);
end;
$$;
