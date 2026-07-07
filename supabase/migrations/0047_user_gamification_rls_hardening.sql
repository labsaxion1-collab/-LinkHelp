-- Gamificação Etapa 4: endurecer RLS em user_gamification.
-- Usuário autenticado pode apenas SELECT do próprio registro.
-- INSERT/UPDATE/DELETE ficam restritos ao service role (API routes / backend).

drop policy if exists "user_gamification_insert_own" on public.user_gamification;
drop policy if exists "user_gamification_update_own" on public.user_gamification;

-- Nomes alternativos (caso criados manualmente ou em docs)
drop policy if exists "user can insert own gamification" on public.user_gamification;
drop policy if exists "user can update own gamification" on public.user_gamification;
drop policy if exists "user can delete own gamification" on public.user_gamification;

drop policy if exists "user_gamification_select_own" on public.user_gamification;
create policy "user_gamification_select_own" on public.user_gamification
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Sem policies de INSERT, UPDATE ou DELETE para authenticated/anon.
-- O service role (supabaseAdmin nas API routes) bypassa RLS e continua gravando.
