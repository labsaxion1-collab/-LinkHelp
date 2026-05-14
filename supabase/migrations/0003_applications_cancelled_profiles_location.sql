-- Application status: cancelled (helper withdraws)
-- Partial unique index: one *active* application per helper per request (allows re-apply after cancel)

alter table public.applications drop constraint if exists applications_request_id_helper_id_key;

create unique index if not exists applications_request_helper_active_idx
  on public.applications (request_id, helper_id)
  where status is distinct from 'cancelled';

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications
  add constraint applications_status_check
  check (status in ('pending', 'viewed', 'accepted', 'rejected', 'completed', 'cancelled'));

-- Profile location / contact (signup + settings)
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists province text;
alter table public.profiles add column if not exists country text;

-- New-user profile: persist location + phone from auth metadata (signup / OAuth)
create or replace function public.linkhelp_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
  avatar text;
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

  insert into public.profiles (id, name, email, avatar_url, role, credits, city, province, country, phone)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), ''),
    new.email,
    avatar,
    r,
    0,
    nullif(trim(coalesce(new.raw_user_meta_data->>'city', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'province', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'country', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), '')
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    city = coalesce(public.profiles.city, excluded.city),
    province = coalesce(public.profiles.province, excluded.province),
    country = coalesce(public.profiles.country, excluded.country),
    phone = coalesce(public.profiles.phone, excluded.phone),
    updated_at = now();

  return new;
end;
$$;
