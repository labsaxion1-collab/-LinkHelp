-- Gamificação Etapa 3: reclamações confirmadas contra usuários.

create table if not exists public.user_complaints (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_type text not null check (reported_user_type in ('client', 'helper')),
  reason text,
  status text not null default 'open' check (status in ('open', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

create index if not exists user_complaints_reported_user_id_idx
  on public.user_complaints (reported_user_id);

create index if not exists user_complaints_reporter_id_idx
  on public.user_complaints (reporter_id);

create index if not exists user_complaints_status_idx
  on public.user_complaints (status);

alter table public.user_complaints enable row level security;

drop policy if exists user_complaints_insert_own on public.user_complaints;
create policy user_complaints_insert_own on public.user_complaints
  for insert to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists user_complaints_select_parties on public.user_complaints;
create policy user_complaints_select_parties on public.user_complaints
  for select to authenticated
  using (auth.uid() = reporter_id or auth.uid() = reported_user_id);
