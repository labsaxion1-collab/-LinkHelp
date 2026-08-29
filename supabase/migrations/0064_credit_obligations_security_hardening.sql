-- Harden credit_obligations privileges and switch the read helper to SECURITY INVOKER.
-- Privileges/RLS only — no row writes, no cancel/settlement RPCs, no data mutation.

-- ---------------------------------------------------------------------------
-- 1) Table privileges: authenticated SELECT only; no client writes
-- ---------------------------------------------------------------------------
-- Default grants on a postgres-owned table can leave INSERT/UPDATE/DELETE on
-- authenticated even after GRANT SELECT. Future SECURITY DEFINER RPCs owned by
-- postgres (or running as service_role) keep table access independently of
-- authenticated write privileges and do not need client DML.

revoke all on table public.credit_obligations from public;
revoke all on table public.credit_obligations from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.credit_obligations
  from public;

revoke insert, update, delete, truncate, references, trigger
  on table public.credit_obligations
  from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.credit_obligations
  from authenticated;

grant select on table public.credit_obligations to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Read helper: SECURITY INVOKER so RLS is a second cross-user barrier
-- ---------------------------------------------------------------------------
create or replace function public.has_active_credit_obligation(p_owner_user_id uuid)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if p_owner_user_id is null then
    return false;
  end if;

  if caller is not null and caller is distinct from p_owner_user_id then
    raise exception 'NOT_ALLOWED';
  end if;

  return exists (
    select 1
    from public.credit_obligations as o
    where o.owner_user_id = p_owner_user_id
      and o.status = 'open'
      and o.amount_outstanding > 0
  );
end;
$$;

revoke all on function public.has_active_credit_obligation(uuid) from public;
revoke all on function public.has_active_credit_obligation(uuid) from anon;
grant execute on function public.has_active_credit_obligation(uuid) to authenticated;
grant execute on function public.has_active_credit_obligation(uuid) to service_role;
