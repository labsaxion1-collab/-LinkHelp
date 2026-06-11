-- FIX: "interessados" counter always shows 0
--
-- Root cause: RLS on applications only returns each helper's own rows.
-- The feed shows jobs the viewer has NOT applied to, so application count is always 0.
-- Fix: denormalize application_count onto requests, maintained by trigger.
-- Helpers read the count from the requests row (which they can already select).

-- 1. Add column
alter table public.requests
  add column if not exists application_count int not null default 0;

comment on column public.requests.application_count
  is 'Denormalized count of active (pending/viewed/accepted) applications for this request. Updated by trigger.';

-- 2. Trigger function to keep it in sync
create or replace function public.trg_sync_request_application_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  -- Determine which request_id was affected
  if tg_op = 'DELETE' then
    v_request_id := old.request_id;
  else
    v_request_id := new.request_id;
  end if;

  -- Recompute the count for that request
  update public.requests
  set
    application_count = (
      select count(*)
      from public.applications
      where request_id = v_request_id
        and status in ('pending', 'viewed', 'accepted')
    ),
    updated_at = now()
  where id = v_request_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
exception
  when others then
    -- Never fail the application insert/update due to count sync
    if tg_op = 'DELETE' then return old; end if;
    return new;
end;
$$;

-- 3. Attach trigger to applications
drop trigger if exists trg_applications_sync_count on public.applications;
create trigger trg_applications_sync_count
  after insert or update of status or delete
  on public.applications
  for each row
  execute function public.trg_sync_request_application_count();

-- 4. Backfill existing counts
update public.requests r
set application_count = (
  select count(*)
  from public.applications a
  where a.request_id = r.id
    and a.status in ('pending', 'viewed', 'accepted')
);

-- 5. Verify
select
  r.id,
  r.title,
  r.application_count,
  count(a.id) as live_count
from public.requests r
left join public.applications a
  on a.request_id = r.id
  and a.status in ('pending', 'viewed', 'accepted')
group by r.id, r.title, r.application_count
order by r.created_at desc
limit 10;
