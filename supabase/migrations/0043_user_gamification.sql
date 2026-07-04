-- Gamification MVP (Etapa 1): snapshot de score/nivel por usuario e papel.
-- Referencia: LinkHelp_Gamificacao_Completa_v2 (score 0-1000, niveis por score + requisitos).

create table if not exists public.user_gamification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_type text not null check (user_type in ('client', 'helper')),
  score_1000 numeric default 0,
  level_key text default 'novo',
  total_completed integer default 0,
  avg_rating numeric default 0,
  response_rate numeric default 0,
  cancel_count integer default 0,
  complaint_count integer default 0,
  profile_pct integer default 0,
  applications_count integer default 0,
  published_orders_count integer default 0,
  hire_rate numeric default 0,
  updated_at timestamptz default now(),
  unique (user_id, user_type)
);

create index if not exists user_gamification_user_id_idx
  on public.user_gamification (user_id);

create index if not exists user_gamification_user_type_idx
  on public.user_gamification (user_type);

alter table public.user_gamification enable row level security;

drop policy if exists "user_gamification_select_own" on public.user_gamification;
create policy "user_gamification_select_own" on public.user_gamification
  for select using (auth.uid() = user_id);
