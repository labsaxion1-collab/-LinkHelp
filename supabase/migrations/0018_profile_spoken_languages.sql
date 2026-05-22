-- Add helper spoken languages and keep profile recovery aligned with the app.

alter table public.profiles
add column if not exists spoken_languages text[] default array[]::text[];

create or replace function public.ensure_profile_for_current_user(
  p_role text default null,
  p_name text default null,
  p_city text default null,
  p_region text default null,
  p_country text default null,
  p_phone text default null,
  p_preferred_language text default null,
  p_spoken_languages text[] default null
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
  v_preferred text;
  v_spoken text[];
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

  v_preferred := nullif(trim(coalesce(p_preferred_language, u.raw_user_meta_data->>'preferred_language', 'pt')), '');
  v_spoken := coalesce(p_spoken_languages, case when v_preferred is null then array[]::text[] else array[v_preferred] end);

  insert into public.profiles (
    id, name, email, avatar_url, role, credits, city, region, country, phone,
    preferred_language, spoken_languages, accepted_terms, accepted_terms_at, helper_terms_accepted, helper_terms_accepted_at
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
    v_preferred,
    v_spoken,
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
    preferred_language = coalesce(excluded.preferred_language, public.profiles.preferred_language),
    spoken_languages = case
      when cardinality(excluded.spoken_languages) > 0 then excluded.spoken_languages
      else public.profiles.spoken_languages
    end,
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

grant execute on function public.ensure_profile_for_current_user(text, text, text, text, text, text, text, text[]) to authenticated;

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
  v_preferred text;
  v_spoken text[];
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

  v_preferred := nullif(trim(coalesce(new.raw_user_meta_data->>'preferred_language', 'pt')), '');

  if jsonb_typeof(new.raw_user_meta_data->'spoken_languages') = 'array' then
    select coalesce(array_agg(value), array[]::text[])
    into v_spoken
    from jsonb_array_elements_text(new.raw_user_meta_data->'spoken_languages') as lang(value)
    where nullif(trim(value), '') is not null;
  else
    v_spoken := case when v_preferred is null then array[]::text[] else array[v_preferred] end;
  end if;

  insert into public.profiles (
    id, name, email, avatar_url, role, credits, city, region, country, phone,
    preferred_language, spoken_languages, accepted_terms, accepted_terms_at, helper_terms_accepted, helper_terms_accepted_at
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
    v_preferred,
    v_spoken,
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
    spoken_languages = case
      when cardinality(excluded.spoken_languages) > 0 then excluded.spoken_languages
      else public.profiles.spoken_languages
    end,
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
