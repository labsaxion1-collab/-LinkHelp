-- Lock profile.role after signup; allow one-time OAuth role confirmation via RPC.

create or replace function public.profiles_immutable_role()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.role is distinct from new.role then
    if coalesce(current_setting('linkhelp.allow_role_change', true), '') = '1' then
      return new;
    end if;
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_immutable_role on public.profiles;
create trigger profiles_immutable_role
  before update on public.profiles
  for each row
  execute function public.profiles_immutable_role();

create or replace function public.confirm_initial_profile_role(p_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  u auth.users;
  row public.profiles;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  v_role := lower(trim(coalesce(p_role, '')));
  if v_role not in ('client', 'helper') then
    raise exception 'INVALID_ROLE';
  end if;

  select * into u from auth.users where id = auth.uid();
  if u.id is null then
    raise exception 'AUTH_USER_NOT_FOUND';
  end if;

  if coalesce(u.raw_user_meta_data->>'user_type', '') in ('client', 'helper') then
    raise exception 'ROLE_ALREADY_SET';
  end if;

  perform set_config('linkhelp.allow_role_change', '1', true);

  update public.profiles
  set
    role = v_role,
    accepted_terms = true,
    accepted_terms_at = coalesce(accepted_terms_at, now()),
    helper_terms_accepted = (v_role = 'helper'),
    helper_terms_accepted_at = case when v_role = 'helper' then now() else helper_terms_accepted_at end
  where id = auth.uid()
  returning * into row;

  if row.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  return row;
end;
$$;

grant execute on function public.confirm_initial_profile_role(text) to authenticated;
