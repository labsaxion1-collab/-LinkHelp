-- Gamification Etapa 2: colunas de hero/progresso + escrita do proprio registro.

alter table public.user_gamification
  add column if not exists hero_key text,
  add column if not exists progress_percent integer default 0,
  add column if not exists points_to_next_level integer default 0,
  add column if not exists missing_requirements jsonb default '[]'::jsonb;

-- O usuario pode criar e atualizar apenas o proprio snapshot de gamificacao.
drop policy if exists "user_gamification_insert_own" on public.user_gamification;
create policy "user_gamification_insert_own" on public.user_gamification
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_gamification_update_own" on public.user_gamification;
create policy "user_gamification_update_own" on public.user_gamification
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
