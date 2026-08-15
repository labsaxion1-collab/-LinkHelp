-- =============================================================================
-- Staging ONLY — bootstrap do primeiro Superadministrador de teste
-- Projeto linked obrigatório: kqwlgpnmjpohzjsrnnih (Supabase Staging)
-- NÃO executar em Production (mttjbaiiaeiqqmnwnzwr).
-- NÃO usar contas oficiais (leandro@linkhelp.app / vinicius@linkhelp.app).
-- NÃO alterar fluxteste01@gmail.com.
-- =============================================================================
-- Pré-requisitos:
--   1) auth.users já existe com e-mail verificado (primeiro login Google no FLUX staging)
--   2) supabase linked = kqwlgpnmjpohzjsrnnih
-- Uso:
--   npx supabase db query --linked -f docs/staging-bootstrap-first-superadmin.sql
-- =============================================================================

do $$
declare
  v_email text := lower(trim('sousaleomoraiscanada@gmail.com'));
  v_count int;
  v_user_id uuid;
  v_confirmed timestamptz;
  v_audit_id uuid;
begin
  if current_database() is null then
    raise exception 'BOOTSTRAP_ABORTED: no database context';
  end if;

  select count(*)::int into v_count
  from auth.users u
  where lower(trim(coalesce(u.email, ''))) = v_email;

  if v_count = 0 then
    raise exception 'BOOTSTRAP_ABORTED: no auth.users for % — complete Google login on staging first', v_email;
  end if;

  if v_count > 1 then
    raise exception 'BOOTSTRAP_ABORTED: ambiguous auth.users match (%) for %', v_count, v_email;
  end if;

  select u.id, u.email_confirmed_at
  into v_user_id, v_confirmed
  from auth.users u
  where lower(trim(coalesce(u.email, ''))) = v_email;

  if v_confirmed is null then
    raise exception 'BOOTSTRAP_ABORTED: email not verified for %', v_email;
  end if;

  -- JWT claim (gate FLUX) — merge role=admin into app_metadata
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where id = v_user_id;

  -- Active super_admin (grants admins.manage)
  insert into public.admin_user_roles (
    user_id, role_id, status, granted_by, granted_at, created_at, updated_at
  ) values (
    v_user_id, 'super_admin', 'active', null, now(), now(), now()
  )
  on conflict (user_id, role_id) do update
  set status = 'active',
      updated_at = now();

  -- Audit (actor = same bootstrap user; no profiles/wallets/credits touched)
  v_audit_id := public.admin_write_audit_log(
    v_user_id,
    'admin.bootstrap.super_admin',
    'admin_user',
    v_user_id::text,
    null,
    jsonb_build_object(
      'email', v_email,
      'roleId', 'super_admin',
      'status', 'active',
      'appMetadataRole', 'admin',
      'source', 'staging-bootstrap-first-superadmin.sql'
    ),
    'Staging bootstrap — first test Superadministrador',
    null,
    jsonb_build_object('environment', 'staging')
  );

  raise notice 'BOOTSTRAP_OK user=% audit=%', v_user_id, v_audit_id;
end $$;
