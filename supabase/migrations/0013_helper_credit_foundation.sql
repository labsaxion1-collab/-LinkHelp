-- Phase 1: credit ledger primitives, helper wallet bootstrap, safe RPC surface.

create or replace function public.register_credit_transaction(
  p_helper_id uuid,
  p_type text,
  p_amount int,
  p_balance_after int,
  p_related_opportunity_id uuid default null,
  p_related_payment_id text default null,
  p_description text default null
)
returns public.credit_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  tx public.credit_transactions;
begin
  if p_type not in ('CREDIT_PURCHASE','FREE_BONUS','OPPORTUNITY_UNLOCK','REFUND','ADMIN_ADJUSTMENT') then
    raise exception 'INVALID_TRANSACTION_TYPE';
  end if;
  if p_balance_after < 0 then
    raise exception 'NEGATIVE_BALANCE';
  end if;

  insert into public.credit_transactions (
    helper_id, type, amount, balance_after, related_opportunity_id, related_payment_id, description
  ) values (
    p_helper_id, p_type, p_amount, p_balance_after, p_related_opportunity_id, p_related_payment_id, p_description
  )
  returning * into tx;

  return tx;
end;
$$;

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

create or replace function public.add_credits(
  p_helper_id uuid,
  p_amount int,
  p_type text,
  p_description text default null,
  p_related_payment_id text default null
)
returns public.credit_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.credit_wallets;
  new_balance int;
begin
  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  insert into public.credit_wallets (helper_id)
  values (p_helper_id)
  on conflict (helper_id) do nothing;

  select * into w from public.credit_wallets where helper_id = p_helper_id for update;
  if w.id is null then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  new_balance := w.balance + p_amount;

  update public.credit_wallets
  set
    balance = new_balance,
    total_bonus = total_bonus + case when p_type = 'FREE_BONUS' then p_amount else 0 end,
    total_purchased = total_purchased + case when p_type = 'CREDIT_PURCHASE' then p_amount else 0 end
  where helper_id = p_helper_id;

  perform public.register_credit_transaction(
    p_helper_id, p_type, p_amount, new_balance, null, p_related_payment_id, p_description
  );

  select * into w from public.credit_wallets where helper_id = p_helper_id;
  return w;
end;
$$;

create or replace function public.spend_credits(
  p_helper_id uuid,
  p_amount int,
  p_type text,
  p_description text default null,
  p_related_opportunity_id uuid default null
)
returns public.credit_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.credit_wallets;
  new_balance int;
begin
  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select * into w from public.credit_wallets where helper_id = p_helper_id for update;
  if w.id is null or w.balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  new_balance := w.balance - p_amount;

  update public.credit_wallets
  set balance = new_balance, total_spent = total_spent + p_amount
  where helper_id = p_helper_id;

  perform public.register_credit_transaction(
    p_helper_id, p_type, -p_amount, new_balance, p_related_opportunity_id, null, p_description
  );

  select * into w from public.credit_wallets where helper_id = p_helper_id;
  return w;
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
  if auth.uid() is not null
    and auth.uid() <> p_helper_id
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  select * into p from public.profiles where id = p_helper_id;
  if p.id is null or p.role <> 'helper' then
    raise exception 'HELPER_ONLY';
  end if;

  insert into public.credit_wallets (helper_id)
  values (p_helper_id)
  on conflict (helper_id) do nothing;

  if not exists (
    select 1 from public.credit_transactions
    where helper_id = p_helper_id and type = 'FREE_BONUS'
  ) then
    w := public.add_credits(p_helper_id, 10, 'FREE_BONUS', 'Bonus inicial de helper');
  else
    select * into w from public.credit_wallets where helper_id = p_helper_id;
  end if;

  return w;
end;
$$;

create or replace function public.linkhelp_profiles_ensure_helper_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'helper' then
    perform public.ensure_helper_credit_wallet(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_helper_wallet on public.profiles;
create trigger profiles_ensure_helper_wallet
  after insert or update of role on public.profiles
  for each row
  when (new.role = 'helper')
  execute function public.linkhelp_profiles_ensure_helper_wallet();

-- Bootstrap wallet when auth user is created as helper.
create or replace function public.linkhelp_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
  avatar text;
  v_region text;
  v_accepted_terms boolean;
  v_accepted_terms_at timestamptz;
  v_helper_terms boolean;
  v_helper_terms_at timestamptz;
  v_provider text;
begin
  r := coalesce(new.raw_user_meta_data->>'user_type', 'client');
  if r not in ('client', 'helper') then
    r := 'client';
  end if;

  avatar := nullif(trim(coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    ''
  )), '');

  v_region := nullif(trim(coalesce(
    new.raw_user_meta_data->>'region',
    new.raw_user_meta_data->>'province',
    ''
  )), '');

  v_provider := coalesce(new.raw_app_meta_data->>'provider', '');

  v_accepted_terms := coalesce((new.raw_user_meta_data->>'accepted_terms')::boolean, false)
    or (v_provider = 'google');

  if v_accepted_terms then
    v_accepted_terms_at := coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'accepted_terms_at', '')), '')::timestamptz,
      now()
    );
  else
    v_accepted_terms_at := null;
  end if;

  v_helper_terms := coalesce((new.raw_user_meta_data->>'helper_terms_accepted')::boolean, false);
  if v_helper_terms then
    v_helper_terms_at := coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'helper_terms_accepted_at', '')), '')::timestamptz,
      now()
    );
  else
    v_helper_terms_at := null;
  end if;

  insert into public.profiles (
    id, name, email, avatar_url, role, credits, city, region, country, phone,
    accepted_terms, accepted_terms_at, helper_terms_accepted, helper_terms_accepted_at
  )
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), ''),
    new.email,
    avatar,
    r,
    0,
    nullif(trim(coalesce(new.raw_user_meta_data->>'city', '')), ''),
    v_region,
    nullif(trim(coalesce(new.raw_user_meta_data->>'country', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
    v_accepted_terms,
    v_accepted_terms_at,
    v_helper_terms,
    v_helper_terms_at
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    city = coalesce(public.profiles.city, excluded.city),
    region = coalesce(public.profiles.region, excluded.region),
    country = coalesce(public.profiles.country, excluded.country),
    phone = coalesce(public.profiles.phone, excluded.phone),
    accepted_terms = public.profiles.accepted_terms or excluded.accepted_terms,
    accepted_terms_at = coalesce(public.profiles.accepted_terms_at, excluded.accepted_terms_at),
    helper_terms_accepted = public.profiles.helper_terms_accepted or excluded.helper_terms_accepted,
    helper_terms_accepted_at = coalesce(public.profiles.helper_terms_accepted_at, excluded.helper_terms_accepted_at),
    updated_at = now();

  if r = 'helper' then
    perform public.ensure_helper_credit_wallet(new.id);
  end if;

  return new;
end;
$$;

grant execute on function public.ensure_helper_credit_wallet(uuid) to authenticated;
grant execute on function public.get_wallet_balance(uuid) to authenticated;
