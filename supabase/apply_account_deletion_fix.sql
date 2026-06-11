-- Account deletion / re-onboarding fix
-- When a user deletes their account we set profiles.deleted_at.
-- On next login they must pick Client/Helper again via confirm_initial_profile_role,
-- which clears deleted_at and reactivates the profile.

alter table public.profiles
  add column if not exists deleted_at timestamptz null;

comment on column public.profiles.deleted_at
  is 'Set when user deletes account. Cleared on re-onboarding after role selection.';

create or replace function public.confirm_initial_profile_role(p_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  row    public.profiles;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  v_role := lower(trim(coalesce(p_role, '')));
  if v_role not in ('client', 'helper') then
    raise exception 'INVALID_ROLE';
  end if;

  perform set_config('linkhelp.allow_role_change', '1', true);

  insert into public.profiles (
    id,
    role,
    accepted_terms,
    accepted_terms_at,
    helper_terms_accepted,
    helper_terms_accepted_at,
    deleted_at,
    created_at,
    updated_at
  )
  values (
    auth.uid(),
    v_role,
    true,
    now(),
    (v_role = 'helper'),
    case when v_role = 'helper' then now() else null end,
    null,
    now(),
    now()
  )
  on conflict (id) do update
    set
      role                     = excluded.role,
      accepted_terms           = true,
      accepted_terms_at        = coalesce(public.profiles.accepted_terms_at, now()),
      helper_terms_accepted    = (excluded.role = 'helper'),
      helper_terms_accepted_at = case
        when excluded.role = 'helper'
          then coalesce(public.profiles.helper_terms_accepted_at, now())
        else null
      end,
      deleted_at               = null,
      updated_at               = now()
  returning * into row;

  if row.id is null then
    raise exception 'UPSERT_FAILED';
  end if;

  return row;
end;
$$;

grant execute on function public.confirm_initial_profile_role(text) to authenticated;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'deleted_at';
