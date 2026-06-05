-- Idempotent credit backend fix for Supabase Production.
-- Run in SQL Editor after apply_helper_application_flow.sql when you see:
--   credit_wallets RLS on upsert
--   opportunity_unlocks / credit_packages / credit_transactions not in schema cache
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

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
  type text not null,
  amount int not null,
  balance_after int not null check (balance_after >= 0),
  related_opportunity_id uuid references public.requests (id) on delete set null,
  related_payment_id text,
  description text,
  created_at timestamptz not null default now()
);

alter table public.credit_transactions
  add column if not exists balance_before int,
  add column if not exists request_id uuid references public.requests (id) on delete set null,
  add column if not exists application_id uuid references public.applications (id) on delete set null;

alter table public.credit_transactions drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions add constraint credit_transactions_type_check check (
  type in (
    'CREDIT_PURCHASE', 'FREE_BONUS', 'OPPORTUNITY_UNLOCK', 'REFUND', 'ADMIN_ADJUSTMENT',
    'APPLICATION_INTEREST', 'APPLICATION_SELECTED'
  )
);

create table if not exists public.opportunity_unlocks (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.requests (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  credits_spent int not null check (credits_spent > 0),
  status text not null default 'unlocked' check (status in ('unlocked', 'refunded', 'cancelled')),
  unlocked_at timestamptz not null default now(),
  refund_eligible boolean not null default true,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (opportunity_id, helper_id)
);

create table if not exists public.credit_packages (
  id text primary key,
  name text not null,
  credits int not null check (credits > 0),
  price_cad numeric(10, 2) not null check (price_cad > 0),
  active boolean not null default true,
  highlight_label text,
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

create index if not exists credit_transactions_helper_created_idx
  on public.credit_transactions (helper_id, created_at desc);
create index if not exists opportunity_unlocks_helper_created_idx
  on public.opportunity_unlocks (helper_id, created_at desc);

drop trigger if exists credit_wallets_set_updated_at on public.credit_wallets;
create trigger credit_wallets_set_updated_at
  before update on public.credit_wallets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: helpers read own data; writes only via SECURITY DEFINER RPCs
-- ---------------------------------------------------------------------------

alter table public.credit_wallets enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.opportunity_unlocks enable row level security;
alter table public.credit_packages enable row level security;

drop policy if exists credit_wallets_select_own on public.credit_wallets;
create policy credit_wallets_select_own on public.credit_wallets
  for select to authenticated
  using (auth.uid() = helper_id);

drop policy if exists credit_transactions_select_own on public.credit_transactions;
create policy credit_transactions_select_own on public.credit_transactions
  for select to authenticated
  using (auth.uid() = helper_id);

drop policy if exists opportunity_unlocks_select_own on public.opportunity_unlocks;
create policy opportunity_unlocks_select_own on public.opportunity_unlocks
  for select to authenticated
  using (auth.uid() = helper_id);

drop policy if exists opportunity_unlocks_select_related on public.opportunity_unlocks;
create policy opportunity_unlocks_select_related on public.opportunity_unlocks
  for select to authenticated
  using (
    auth.uid() = helper_id
    or exists (
      select 1 from public.requests r
      where r.id = opportunity_unlocks.opportunity_id and r.client_id = auth.uid()
    )
  );

drop policy if exists credit_packages_select_active on public.credit_packages;
create policy credit_packages_select_active on public.credit_packages
  for select to authenticated
  using (active = true);

grant select on public.credit_wallets to authenticated;
grant select on public.credit_transactions to authenticated;
grant select on public.opportunity_unlocks to authenticated;
grant select on public.credit_packages to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: wallet bootstrap (no client INSERT — avoids RLS upsert errors)
-- ---------------------------------------------------------------------------

create or replace function public.get_wallet_balance(p_helper_id uuid)
returns int
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  bal int;
begin
  if auth.uid() is not null
    and auth.uid() <> p_helper_id
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  select balance into bal from public.credit_wallets where helper_id = p_helper_id;
  return coalesce(bal, 0);
end;
$$;

grant execute on function public.get_wallet_balance(uuid) to authenticated;

create or replace function public.ensure_helper_credit_wallet(p_helper_id uuid)
returns public.credit_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.credit_wallets;
  p public.profiles;
  bonus_amount int := 20;
  bal_before int;
  bal_after int;
begin
  if auth.uid() is not null
    and auth.uid() <> p_helper_id
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  select * into p from public.profiles where id = p_helper_id;
  if p.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if p.role is distinct from 'helper' then
    raise exception 'HELPER_ONLY';
  end if;

  insert into public.credit_wallets (helper_id)
  values (p_helper_id)
  on conflict (helper_id) do nothing;

  select * into w from public.credit_wallets where helper_id = p_helper_id for update;
  if w.id is null then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.credit_transactions
    where helper_id = p_helper_id and type in ('FREE_BONUS', 'CREDIT_PURCHASE')
  ) and w.balance = 0 then
    bal_before := w.balance;
    bal_after := bal_before + bonus_amount;

    update public.credit_wallets
    set balance = bal_after, total_bonus = total_bonus + bonus_amount
    where helper_id = p_helper_id;

    insert into public.credit_transactions (
      helper_id, type, amount, balance_before, balance_after, description
    ) values (
      p_helper_id, 'FREE_BONUS', bonus_amount, bal_before, bal_after, 'Créditos iniciais de boas-vindas'
    );

    select * into w from public.credit_wallets where helper_id = p_helper_id;
  end if;

  return w;
end;
$$;

grant execute on function public.ensure_helper_credit_wallet(uuid) to authenticated;

notify pgrst, 'reload schema';
