-- =============================================================================
-- LinkHelp — production schema (fresh Supabase project or after reset).
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run.
--
-- Removes legacy LinkHelp objects if present, then creates:
-- profiles, requests, applications, conversations, messages, notifications,
-- reviews, helper_skills, upcoming_jobs (+ auth trigger, RLS, indexes, realtime).
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Legacy cleanup
-- Do NOT use "DROP TRIGGER ... ON public.<table>" when the table may not exist
-- (PostgreSQL errors: relation does not exist). CASCADE on DROP TABLE removes triggers.
-- ---------------------------------------------------------------------------
drop trigger if exists linkhelp_on_auth_user_created on auth.users;

drop table if exists public.credit_transactions cascade;
drop table if exists public.credits cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop table if exists public.applications cascade;
drop table if exists public.upcoming_jobs cascade;
drop table if exists public.notifications cascade;
drop table if exists public.reviews cascade;
drop table if exists public.helper_skills cascade;
drop table if exists public.requests cascade;
drop table if exists public.profiles cascade;
drop table if exists public.users cascade;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (id = auth.users.id)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  avatar_url text,
  email text,
  role text not null check (role in ('client', 'helper')),
  rating numeric(3,2),
  credits int not null default 0,
  bio text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_city_idx on public.profiles (city);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- requests
-- ---------------------------------------------------------------------------
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  subcategory text,
  urgency text not null default 'normal' check (urgency in ('normal', 'high')),
  budget text,
  location text not null,
  latitude double precision,
  longitude double precision,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requests_client_id_idx on public.requests (client_id);
create index if not exists requests_status_idx on public.requests (status);
create index if not exists requests_created_at_idx on public.requests (created_at desc);

create trigger requests_set_updated_at
  before update on public.requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'viewed', 'accepted', 'rejected', 'completed')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, helper_id)
);

create index if not exists applications_helper_id_idx on public.applications (helper_id);
create index if not exists applications_request_id_idx on public.applications (request_id);
create index if not exists applications_client_id_idx on public.applications (client_id);

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  contact_unlocked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (request_id, helper_id)
);

create index if not exists conversations_helper_id_idx on public.conversations (helper_id);
create index if not exists conversations_client_id_idx on public.conversations (client_id);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  description text not null,
  read boolean not null default false,
  action_url text,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  target_user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists reviews_target_idx on public.reviews (target_user_id);
create index if not exists reviews_request_idx on public.reviews (request_id);

-- ---------------------------------------------------------------------------
-- helper_skills
-- ---------------------------------------------------------------------------
create table public.helper_skills (
  id uuid primary key default gen_random_uuid(),
  helper_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  subcategory text,
  created_at timestamptz not null default now()
);

create unique index if not exists helper_skills_helper_cat_sub_idx
  on public.helper_skills (helper_id, lower(category), coalesce(lower(subcategory), ''));

create index if not exists helper_skills_helper_id_idx on public.helper_skills (helper_id);

-- ---------------------------------------------------------------------------
-- upcoming_jobs (scheduling — used by app after accept)
-- ---------------------------------------------------------------------------
create table public.upcoming_jobs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  client_name text not null,
  client_avatar text,
  title text not null,
  category text not null,
  description text not null,
  location text not null,
  value_hint text,
  urgency text not null default 'normal',
  scheduled_at timestamptz not null,
  workflow_status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create index if not exists upcoming_jobs_helper_idx on public.upcoming_jobs (helper_id);

-- ---------------------------------------------------------------------------
-- Auth: create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.linkhelp_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
begin
  r := coalesce(new.raw_user_meta_data->>'user_type', 'client');
  if r not in ('client', 'helper') then
    r := 'client';
  end if;

  insert into public.profiles (id, name, email, avatar_url, role, credits, city)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), ''),
    new.email,
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    r,
    0,
    nullif(trim(coalesce(new.raw_user_meta_data->>'city', '')), '')
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name),
    updated_at = now();

  return new;
end;
$$;

create trigger linkhelp_on_auth_user_created
  after insert on auth.users
  for each row execute function public.linkhelp_handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.applications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;
alter table public.helper_skills enable row level security;
alter table public.upcoming_jobs enable row level security;

-- profiles
drop policy if exists profiles_select_auth on public.profiles;
create policy profiles_select_auth on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id);

-- requests
drop policy if exists requests_select_auth on public.requests;
create policy requests_select_auth on public.requests for select to authenticated using (true);
drop policy if exists requests_insert_own on public.requests;
create policy requests_insert_own on public.requests for insert to authenticated with check (auth.uid() = client_id);
drop policy if exists requests_update_own on public.requests;
create policy requests_update_own on public.requests for update to authenticated using (auth.uid() = client_id);

-- applications
drop policy if exists applications_select_related on public.applications;
create policy applications_select_related on public.applications for select to authenticated using (
  auth.uid() = helper_id or auth.uid() = client_id
);
drop policy if exists applications_insert_helper on public.applications;
create policy applications_insert_helper on public.applications for insert to authenticated with check (
  auth.uid() = helper_id
  and exists (
    select 1 from public.requests r
    where r.id = request_id and r.client_id = client_id and r.client_id <> helper_id
  )
);
drop policy if exists applications_update_parties on public.applications;
create policy applications_update_parties on public.applications for update to authenticated using (
  auth.uid() = helper_id or auth.uid() = client_id
);

-- conversations
drop policy if exists conversations_select_parties on public.conversations;
create policy conversations_select_parties on public.conversations for select to authenticated using (
  auth.uid() = client_id or auth.uid() = helper_id
);
drop policy if exists conversations_insert_parties on public.conversations;
create policy conversations_insert_parties on public.conversations for insert to authenticated with check (
  auth.uid() = client_id or auth.uid() = helper_id
);
drop policy if exists conversations_update_parties on public.conversations;
create policy conversations_update_parties on public.conversations for update to authenticated using (
  auth.uid() = client_id or auth.uid() = helper_id
);

-- messages
drop policy if exists messages_select_thread on public.messages;
create policy messages_select_thread on public.messages for select to authenticated using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (auth.uid() = c.client_id or auth.uid() = c.helper_id)
  )
);
drop policy if exists messages_insert_participant on public.messages;
create policy messages_insert_participant on public.messages for insert to authenticated with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (auth.uid() = c.client_id or auth.uid() = c.helper_id)
  )
);
drop policy if exists messages_update_participants on public.messages;
create policy messages_update_participants on public.messages for update to authenticated using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (auth.uid() = c.client_id or auth.uid() = c.helper_id)
  )
) with check (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (auth.uid() = c.client_id or auth.uid() = c.helper_id)
  )
);

-- notifications
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select using (auth.uid() = user_id);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update using (auth.uid() = user_id);
drop policy if exists notifications_insert_mvp on public.notifications;
create policy notifications_insert_mvp on public.notifications for insert to authenticated with check (true);

-- reviews
drop policy if exists reviews_select_related on public.reviews;
create policy reviews_select_related on public.reviews for select to authenticated using (
  auth.uid() = reviewer_id or auth.uid() = target_user_id
  or exists (select 1 from public.requests r where r.id = request_id and r.client_id = auth.uid())
);
drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews for insert to authenticated with check (auth.uid() = reviewer_id);

-- helper_skills
drop policy if exists helper_skills_select on public.helper_skills;
create policy helper_skills_select on public.helper_skills for select to authenticated using (true);
drop policy if exists helper_skills_insert_own on public.helper_skills;
create policy helper_skills_insert_own on public.helper_skills for insert to authenticated with check (auth.uid() = helper_id);
drop policy if exists helper_skills_update_own on public.helper_skills;
create policy helper_skills_update_own on public.helper_skills for update to authenticated using (auth.uid() = helper_id) with check (auth.uid() = helper_id);
drop policy if exists helper_skills_delete_own on public.helper_skills;
create policy helper_skills_delete_own on public.helper_skills for delete to authenticated using (auth.uid() = helper_id);

-- upcoming_jobs
drop policy if exists upcoming_select_helper on public.upcoming_jobs;
create policy upcoming_select_helper on public.upcoming_jobs for select to authenticated using (auth.uid() = helper_id);
drop policy if exists upcoming_insert_client on public.upcoming_jobs;
create policy upcoming_insert_client on public.upcoming_jobs for insert to authenticated with check (
  exists (select 1 from public.requests r where r.id = request_id and r.client_id = auth.uid())
);
drop policy if exists upcoming_update_helper on public.upcoming_jobs;
create policy upcoming_update_helper on public.upcoming_jobs for update to authenticated using (auth.uid() = helper_id);

-- ---------------------------------------------------------------------------
-- Realtime publication (ignore duplicate_object)
-- ---------------------------------------------------------------------------
do $$ begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.applications; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.requests; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.conversations; exception when duplicate_object then null; end $$;
