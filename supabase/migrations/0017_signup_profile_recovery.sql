-- Harden signup/profile creation and recovery for mobile and desktop.
-- Safe to run more than once in Supabase SQL Editor.

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists region text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists preferred_language text default 'pt';
alter table public.profiles add column if not exists accepted_terms boolean not null default false;
alter table public.profiles add column if not exists accepted_terms_at timestamptz;
alter table public.profiles add column if not exists helper_terms_accepted boolean not null default false;
alter table public.profiles add column if not exists helper_terms_accepted_at timestamptz;

create index if not exists profiles_region_idx on public.profiles (region);

alter table public.profiles enable row level security;

drop policy if exists profiles_select_auth on public.profiles;
create policy profiles_select_auth on public.profiles
  for select to authenticated
  using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

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
    when 'SIGNUP_CLIENT' then 0
    when 'SIGNUP_HELPER' then 12
    when 'PROFILE_PHOTO' then 2
    when 'PROFILE_DESCRIPTION' then 1
    when 'PROFILE_SKILLS' then 2
    when 'PHONE_VERIFIED' then 3
    when 'FIRST_REQUEST_CREATED' then 5
    when 'FIRST_APPLICATION_SENT' then 5
    when 'FIRST_REVIEW_RECEIVED' then 3
    when 'REFERRAL_COMPLETED' then 10
    else null
  end);

  if v_amount is null or v_amount <= 0 then
    return jsonb_build_object('granted', false, 'reward_type', p_reward_type, 'reason', 'ZERO_AMOUNT');
  end if;

  v_desc := coalesce(nullif(trim(p_description), ''), 'LinkCredits - ' || p_reward_type);

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
    perform public.grant_user_reward(
      p_helper_id,
      'SIGNUP_HELPER',
      12,
      'Bonus de boas-vindas - helper'
    );
  end if;

  select * into w from public.credit_wallets where helper_id = p_helper_id;
  return w;
end;
$$;

create or replace function public.ensure_profile_for_current_user(
  p_role text default null,
  p_name text default null,
  p_city text default null,
  p_region text default null,
  p_country text default null,
  p_phone text default null,
  p_preferred_language text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  u auth.users;
  r text;
  avatar text;
  profile_row public.profiles;
  v_accepted_terms boolean;
  v_accepted_terms_at timestamptz;
  v_helper_terms boolean;
  v_helper_terms_at timestamptz;
  v_provider text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into u from auth.users where id = auth.uid();
  if u.id is null then
    raise exception 'AUTH_USER_NOT_FOUND';
  end if;

  r := coalesce(nullif(trim(p_role), ''), u.raw_user_meta_data->>'user_type', 'client');
  if r not in ('client', 'helper') then
    r := 'client';
  end if;

  avatar := nullif(trim(coalesce(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture',
    ''
  )), '');

  v_provider := coalesce(u.raw_app_meta_data->>'provider', '');
  v_accepted_terms := coalesce(nullif(u.raw_user_meta_data->>'accepted_terms', '')::boolean, false)
    or (v_provider = 'google');

  if v_accepted_terms then
    v_accepted_terms_at := coalesce(
      nullif(trim(coalesce(u.raw_user_meta_data->>'accepted_terms_at', '')), '')::timestamptz,
      now()
    );
  else
    v_accepted_terms_at := null;
  end if;

  v_helper_terms := coalesce(nullif(u.raw_user_meta_data->>'helper_terms_accepted', '')::boolean, false);
  if v_helper_terms then
    v_helper_terms_at := coalesce(
      nullif(trim(coalesce(u.raw_user_meta_data->>'helper_terms_accepted_at', '')), '')::timestamptz,
      now()
    );
  else
    v_helper_terms_at := null;
  end if;

  insert into public.profiles (
    id, name, email, avatar_url, role, credits, city, region, country, phone,
    preferred_language, accepted_terms, accepted_terms_at, helper_terms_accepted, helper_terms_accepted_at
  )
  values (
    u.id,
    nullif(trim(coalesce(p_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')), ''),
    u.email,
    avatar,
    r,
    0,
    nullif(trim(coalesce(p_city, u.raw_user_meta_data->>'city', '')), ''),
    nullif(trim(coalesce(p_region, u.raw_user_meta_data->>'region', u.raw_user_meta_data->>'province', '')), ''),
    nullif(trim(coalesce(p_country, u.raw_user_meta_data->>'country', '')), ''),
    nullif(trim(coalesce(p_phone, u.raw_user_meta_data->>'phone', '')), ''),
    nullif(trim(coalesce(p_preferred_language, u.raw_user_meta_data->>'preferred_language', 'pt')), ''),
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
    preferred_language = coalesce(public.profiles.preferred_language, excluded.preferred_language),
    accepted_terms = public.profiles.accepted_terms or excluded.accepted_terms,
    accepted_terms_at = coalesce(public.profiles.accepted_terms_at, excluded.accepted_terms_at),
    helper_terms_accepted = public.profiles.helper_terms_accepted or excluded.helper_terms_accepted,
    helper_terms_accepted_at = coalesce(public.profiles.helper_terms_accepted_at, excluded.helper_terms_accepted_at),
    updated_at = now()
  returning * into profile_row;

  if profile_row.role = 'helper' then
    perform public.ensure_helper_credit_wallet(profile_row.id);
  end if;

  return profile_row;
end;
$$;

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
  profile_row public.profiles;
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
  v_accepted_terms := coalesce(nullif(new.raw_user_meta_data->>'accepted_terms', '')::boolean, false)
    or (v_provider = 'google');

  if v_accepted_terms then
    v_accepted_terms_at := coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'accepted_terms_at', '')), '')::timestamptz,
      now()
    );
  else
    v_accepted_terms_at := null;
  end if;

  v_helper_terms := coalesce(nullif(new.raw_user_meta_data->>'helper_terms_accepted', '')::boolean, false);
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
    preferred_language, accepted_terms, accepted_terms_at, helper_terms_accepted, helper_terms_accepted_at
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
    nullif(trim(coalesce(new.raw_user_meta_data->>'preferred_language', 'pt')), ''),
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
    preferred_language = coalesce(public.profiles.preferred_language, excluded.preferred_language),
    accepted_terms = public.profiles.accepted_terms or excluded.accepted_terms,
    accepted_terms_at = coalesce(public.profiles.accepted_terms_at, excluded.accepted_terms_at),
    helper_terms_accepted = public.profiles.helper_terms_accepted or excluded.helper_terms_accepted,
    helper_terms_accepted_at = coalesce(public.profiles.helper_terms_accepted_at, excluded.helper_terms_accepted_at),
    updated_at = now()
  returning * into profile_row;

  if profile_row.role = 'helper' then
    perform public.ensure_helper_credit_wallet(profile_row.id);
  else
    perform public.ensure_client_signup_credits(profile_row.id);
  end if;

  return new;
end;
$$;

drop trigger if exists linkhelp_on_auth_user_created on auth.users;
create trigger linkhelp_on_auth_user_created
  after insert on auth.users
  for each row execute function public.linkhelp_handle_new_user();

grant execute on function public.ensure_profile_for_current_user(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.grant_user_reward(uuid, text, int, text) to authenticated;
grant execute on function public.ensure_helper_credit_wallet(uuid) to authenticated;
