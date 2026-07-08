-- Verify public reputation dossier RPC (read-only).
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_public_reputation_dossier'
  ) then
    raise exception 'VERIFY FAILED — function get_public_reputation_dossier missing';
  end if;
  raise notice 'VERIFY OK — get_public_reputation_dossier present';
end $$;
