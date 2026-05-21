-- Allow helpers to apply to open requests without being blocked by preview/feed RLS.
-- The client id still has to match the request owner, and helpers cannot apply to
-- their own request.

drop policy if exists requests_select_auth on public.requests;
create policy requests_select_auth on public.requests
  for select
  to authenticated
  using (
    auth.uid() = client_id
    or status = 'open'
    or exists (
      select 1
      from public.applications a
      where a.request_id = requests.id and a.helper_id = auth.uid()
    )
  );

drop policy if exists applications_insert_helper on public.applications;
create policy applications_insert_helper on public.applications
  for insert
  to authenticated
  with check (
    auth.uid() = helper_id
    and client_id <> helper_id
    and exists (
      select 1
      from public.requests r
      where r.id = request_id
        and r.client_id = client_id
        and r.status = 'open'
    )
  );
