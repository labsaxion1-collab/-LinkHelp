-- Onboarding LinkCredits: signup bonuses, one-time action rewards, safe grant RPC.

create table if not exists public.user_bonus_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_type text not null,
  amount int not null check (amount > 0),
  created_at timestamptz not null default now(),
  constraint user_bonus_rewards_user_type_unique unique (user_id, reward_type)
);

create index if not exists user_bonus_rewards_user_created_idx
  on public.user_bonus_rewards (user_id, created_at desc);

alter table public.user_bonus_rewards enable row level security;

drop policy if exists user_bonus_rewards_select_own on public.user_bonus_rewards;
create policy user_bonus_rewards_select_own on public.user_bonus_rewards
  for select to authenticated
  using (auth.uid() = user_id);

-- Allowed reward types (extend for promos / missions / referral later).
create or replace function public.is_valid_reward_type(p_reward_type text)
returns boolean
language sql
immutable
as $$
  select p_reward_type in (
    'SIGNUP_CLIENT',
    'SIGNUP_HELPER',
    'PROFILE_PHOTO',
    'PROFILE_DESCRIPTION',
    'PROFILE_SKILLS',
    'PHONE_VERIFIED',
    'FIRST_REQUEST_CREATED',
    'FIRST_APPLICATION_SENT',
    'FIRST_REVIEW_RECEIVED',
    'REFERRAL_COMPLETED'
  );
$$;

create or replace function public.grant_user_reward(
  p_user_id uuid,
  p_reward_type text,
  p_amount int default null,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_amount int;
  v_desc text;
  v_inserted boolean;
  v_balance int;
  w public.credit_wallets;
begin
  if auth.uid() is not null
    and auth.uid() <> p_user_id
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  if not public.is_valid_reward_type(p_reward_type) then
    raise exception 'INVALID_REWARD_TYPE';
  end if;

  v_amount := coalesce(p_amount, case p_reward_type
    when 'SIGNUP_CLIENT' then 12000
    when 'SIGNUP_HELPER' then 25000
    when 'PROFILE_PHOTO' then 2000
    when 'PROFILE_DESCRIPTION' then 1000
    when 'PROFILE_SKILLS' then 2000
    when 'PHONE_VERIFIED' then 3000
    when 'FIRST_REQUEST_CREATED' then 5000
    when 'FIRST_APPLICATION_SENT' then 5000
    when 'FIRST_REVIEW_RECEIVED' then 3000
    when 'REFERRAL_COMPLETED' then 10000
    else null
  end);

  if v_amount is null or v_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  v_desc := coalesce(nullif(trim(p_description), ''), 'LinkCredits — ' || p_reward_type);

  insert into public.user_bonus_rewards (user_id, reward_type, amount)
  values (p_user_id, p_reward_type, v_amount)
  on conflict (user_id, reward_type) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted, false) then
    return jsonb_build_object(
      'granted', false,
      'reward_type', p_reward_type,
      'reason', 'ALREADY_GRANTED'
    );
  end if;

  select role into v_role from public.profiles where id = p_user_id;
  if v_role is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_role = 'helper' then
    insert into public.credit_wallets (helper_id)
    values (p_user_id)
    on conflict (helper_id) do nothing;

    w := public.add_credits(p_user_id, v_amount, 'FREE_BONUS', v_desc);
    v_balance := w.balance;
  else
    update public.profiles
    set credits = credits + v_amount, updated_at = now()
    where id = p_user_id
    returning credits into v_balance;
  end if;

  return jsonb_build_object(
    'granted', true,
    'reward_type', p_reward_type,
    'amount', v_amount,
    'balance_after', v_balance
  );
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
  grant_result jsonb;
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
    select 1 from public.user_bonus_rewards
    where user_id = p_helper_id and reward_type = 'SIGNUP_HELPER'
  ) then
    grant_result := public.grant_user_reward(
      p_helper_id,
      'SIGNUP_HELPER',
      25000,
      'Bônus de boas-vindas — helper'
    );
  end if;

  select * into w from public.credit_wallets where helper_id = p_helper_id;
  return w;
end;
$$;

create or replace function public.ensure_client_signup_credits(p_client_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
  grant_result jsonb;
  bal int;
begin
  if auth.uid() is not null
    and auth.uid() <> p_client_id
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'FORBIDDEN';
  end if;

  select * into p from public.profiles where id = p_client_id;
  if p.id is null or p.role <> 'client' then
    return coalesce(p.credits, 0);
  end if;

  if not exists (
    select 1 from public.user_bonus_rewards
    where user_id = p_client_id and reward_type = 'SIGNUP_CLIENT'
  ) then
    grant_result := public.grant_user_reward(
      p_client_id,
      'SIGNUP_CLIENT',
      12000,
      'Bônus de boas-vindas — cliente'
    );
  end if;

  select credits into bal from public.profiles where id = p_client_id;
  return coalesce(bal, 0);
end;
$$;

-- First request / application / review (server-side, idempotent via user_bonus_rewards).
create or replace function public.linkhelp_grant_first_request_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*)::int from public.requests where client_id = new.client_id) = 1 then
    perform public.grant_user_reward(
      new.client_id,
      'FIRST_REQUEST_CREATED',
      null,
      'Primeiro pedido criado'
    );
  end if;
  return new;
end;
$$;

create or replace function public.linkhelp_grant_first_application_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*)::int from public.applications where helper_id = new.helper_id) = 1 then
    perform public.grant_user_reward(
      new.helper_id,
      'FIRST_APPLICATION_SENT',
      null,
      'Primeira candidatura enviada'
    );
  end if;
  return new;
end;
$$;

create or replace function public.linkhelp_grant_first_review_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*)::int from public.reviews where target_user_id = new.target_user_id) = 1 then
    perform public.grant_user_reward(
      new.target_user_id,
      'FIRST_REVIEW_RECEIVED',
      null,
      'Primeira avaliação recebida'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists requests_first_reward on public.requests;
create trigger requests_first_reward
  after insert on public.requests
  for each row
  execute function public.linkhelp_grant_first_request_reward();

drop trigger if exists applications_first_reward on public.applications;
create trigger applications_first_reward
  after insert on public.applications
  for each row
  execute function public.linkhelp_grant_first_application_reward();

drop trigger if exists reviews_first_reward on public.reviews;
create trigger reviews_first_reward
  after insert on public.reviews
  for each row
  execute function public.linkhelp_grant_first_review_reward();

-- Bootstrap client signup credits on profile creation.
create or replace function public.linkhelp_profiles_signup_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'client' then
    perform public.ensure_client_signup_credits(new.id);
  elsif new.role = 'helper' then
    perform public.ensure_helper_credit_wallet(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_signup_credits on public.profiles;
create trigger profiles_signup_credits
  after insert on public.profiles
  for each row
  execute function public.linkhelp_profiles_signup_credits();

-- Patch auth signup handler to grant client bonus (helper already via ensure_helper_credit_wallet).
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
  else
    perform public.ensure_client_signup_credits(new.id);
  end if;

  return new;
end;
$$;

grant execute on function public.grant_user_reward(uuid, text, int, text) to authenticated;
grant execute on function public.ensure_client_signup_credits(uuid) to authenticated;
