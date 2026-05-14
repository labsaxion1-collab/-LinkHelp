-- Ensure helpers can insert their own profile row (covers DBs where only 0001 was applied).

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);
