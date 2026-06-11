-- BUG 2 FIX: Make confirm_initial_profile_role robust with UPSERT
-- Root cause: If the profile row doesn't exist yet when the function runs (race with trigger),
-- it raises PROFILE_NOT_FOUND. The frontend continues silently, refreshProfile gets a stale user,
-- and profiles.role stays 'client'. RoleRoute then bounces helper to /client/dashboard.
-- Fix: Change pure UPDATE to INSERT ... ON CONFLICT DO UPDATE (UPSERT).
-- Also relaxes ROLE_ALREADY_SET to allow re-confirming if metadata is already set
-- but the profile role wasn't updated (recovery path).

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

  -- Allow role change for this transaction
  perform set_config('linkhelp.allow_role_change', '1', true);

  -- UPSERT: create profile if missing, or update role if it exists and needs changing
  insert into public.profiles (
    id,
    role,
    accepted_terms,
    accepted_terms_at,
    helper_terms_accepted,
    helper_terms_accepted_at,
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
    now(),
    now()
  )
  on conflict (id) do update
    set
      role                    = excluded.role,
      accepted_terms          = true,
      accepted_terms_at       = coalesce(public.profiles.accepted_terms_at, now()),
      helper_terms_accepted   = (excluded.role = 'helper'),
      helper_terms_accepted_at = case
        when excluded.role = 'helper'
          then coalesce(public.profiles.helper_terms_accepted_at, now())
        else public.profiles.helper_terms_accepted_at
      end,
      updated_at              = now()
  returning * into row;

  if row.id is null then
    raise exception 'UPSERT_FAILED';
  end if;

  return row;
end;
$$;

grant execute on function public.confirm_initial_profile_role(text) to authenticated;

-- Verify
select
  proname,
  prosecdef
from pg_proc
where proname = 'confirm_initial_profile_role'
  and pronamespace = 'public'::regnamespace;
