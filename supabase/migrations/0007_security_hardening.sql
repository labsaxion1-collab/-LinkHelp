-- LinkHelp — RLS hardening (run after 0001–0006)
-- Tightens overly permissive policies; keeps helper feed + cross-party notifications working.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_auth on public.profiles;
create policy profiles_select_auth on public.profiles
  for select
  to authenticated
  using (
    auth.uid() = id
    or role = 'helper'
    or exists (
      select 1
      from public.applications a
      where (a.helper_id = auth.uid() and a.client_id = profiles.id)
         or (a.client_id = auth.uid() and a.helper_id = profiles.id)
    )
    or exists (
      select 1
      from public.conversations c
      where (c.client_id = auth.uid() and c.helper_id = profiles.id)
         or (c.helper_id = auth.uid() and c.client_id = profiles.id)
    )
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- requests (open feed + own + applied)
-- ---------------------------------------------------------------------------
drop policy if exists requests_select_auth on public.requests;
create policy requests_select_auth on public.requests
  for select
  to authenticated
  using (
    auth.uid() = client_id
    or exists (
      select 1
      from public.applications a
      where a.request_id = requests.id and a.helper_id = auth.uid()
    )
    or (
      status = 'open'
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid() and p.role = 'helper'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- notifications (private; party may notify counterparty)
-- ---------------------------------------------------------------------------
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists notifications_insert_mvp on public.notifications;
create policy notifications_insert_party on public.notifications
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1
      from public.applications a
      where (a.helper_id = auth.uid() and a.client_id = notifications.user_id)
         or (a.client_id = auth.uid() and a.helper_id = notifications.user_id)
    )
    or exists (
      select 1
      from public.conversations c
      where (c.client_id = auth.uid() and c.helper_id = notifications.user_id)
         or (c.helper_id = auth.uid() and c.client_id = notifications.user_id)
    )
  );

-- ---------------------------------------------------------------------------
-- helper_skills (authenticated read; own write)
-- ---------------------------------------------------------------------------
drop policy if exists helper_skills_select on public.helper_skills;
create policy helper_skills_select on public.helper_skills
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- upcoming_jobs (helper + owning client)
-- ---------------------------------------------------------------------------
drop policy if exists upcoming_select_helper on public.upcoming_jobs;
create policy upcoming_select_parties on public.upcoming_jobs
  for select
  to authenticated
  using (
    auth.uid() = helper_id
    or exists (
      select 1
      from public.requests r
      where r.id = upcoming_jobs.request_id and r.client_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- helper_portfolio_items (metadata: authenticated only)
-- ---------------------------------------------------------------------------
drop policy if exists "portfolio_select_public" on public.helper_portfolio_items;
create policy "portfolio_select_authenticated"
  on public.helper_portfolio_items
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- storage: portfolio buckets require auth to read objects
-- (avatars remain public for pre-login profile images)
-- ---------------------------------------------------------------------------
drop policy if exists "portfolio_images public read" on storage.objects;
create policy "portfolio_images authenticated read"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'portfolio-images');

drop policy if exists "portfolio_videos public read" on storage.objects;
create policy "portfolio_videos authenticated read"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'portfolio-videos');
