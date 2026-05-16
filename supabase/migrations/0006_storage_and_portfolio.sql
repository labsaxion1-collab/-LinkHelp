-- LinkHelp — Storage buckets + helper_portfolio_items + policies
-- Run after 0001–0005. Creates public buckets for avatars + portfolio media.

-- ---------------------------------------------------------------------------
-- helper_portfolio_items
-- ---------------------------------------------------------------------------
create table if not exists public.helper_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  helper_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('image', 'video')),
  url text not null,
  storage_path text not null,
  title text,
  caption text,
  skill_id text,
  featured boolean not null default false,
  duration_sec double precision,
  thumb_url text,
  created_at timestamptz not null default now()
);

create index if not exists helper_portfolio_items_helper_id_idx on public.helper_portfolio_items (helper_id);
create index if not exists helper_portfolio_items_created_at_idx on public.helper_portfolio_items (created_at desc);

alter table public.helper_portfolio_items enable row level security;

-- Authenticated users can manage their own rows
drop policy if exists "portfolio_insert_own" on public.helper_portfolio_items;
create policy "portfolio_insert_own"
  on public.helper_portfolio_items
  for insert
  to authenticated
  with check (helper_id = auth.uid());

drop policy if exists "portfolio_update_own" on public.helper_portfolio_items;
create policy "portfolio_update_own"
  on public.helper_portfolio_items
  for update
  to authenticated
  using (helper_id = auth.uid())
  with check (helper_id = auth.uid());

drop policy if exists "portfolio_delete_own" on public.helper_portfolio_items;
create policy "portfolio_delete_own"
  on public.helper_portfolio_items
  for delete
  to authenticated
  using (helper_id = auth.uid());

-- Public read of metadata (files are public via Storage)
drop policy if exists "portfolio_select_public" on public.helper_portfolio_items;
create policy "portfolio_select_public"
  on public.helper_portfolio_items
  for select
  to public
  using (true);

-- ---------------------------------------------------------------------------
-- Storage buckets (public read)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp']::text[]),
  ('portfolio-images', 'portfolio-images', true, 10485760, array['image/jpeg','image/png','image/webp']::text[]),
  ('portfolio-videos', 'portfolio-videos', true, 104857600, array['video/mp4','video/quicktime','video/webm']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies: objects live under folder named with auth.uid()
-- Path format: {uid}/{filename}

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars upload own folder" on storage.objects;
create policy "avatars upload own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "portfolio_images public read" on storage.objects;
create policy "portfolio_images public read"
  on storage.objects for select
  to public
  using (bucket_id = 'portfolio-images');

drop policy if exists "portfolio_images upload own" on storage.objects;
create policy "portfolio_images upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'portfolio-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "portfolio_images update own" on storage.objects;
create policy "portfolio_images update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'portfolio-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'portfolio-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "portfolio_images delete own" on storage.objects;
create policy "portfolio_images delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'portfolio-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "portfolio_videos public read" on storage.objects;
create policy "portfolio_videos public read"
  on storage.objects for select
  to public
  using (bucket_id = 'portfolio-videos');

drop policy if exists "portfolio_videos upload own" on storage.objects;
create policy "portfolio_videos upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'portfolio-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "portfolio_videos update own" on storage.objects;
create policy "portfolio_videos update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'portfolio-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'portfolio-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "portfolio_videos delete own" on storage.objects;
create policy "portfolio_videos delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'portfolio-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
