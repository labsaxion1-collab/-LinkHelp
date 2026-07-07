-- Medalhas de gamificação são exibidas publicamente no chat e perfis.
-- Usuários autenticados podem ler snapshots de outros usuários (somente SELECT).

drop policy if exists "user_gamification_select_peers" on public.user_gamification;
create policy "user_gamification_select_peers" on public.user_gamification
  for select
  to authenticated
  using (true);
