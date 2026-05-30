-- FLUX Admin access — run manually in Supabase Dashboard → SQL Editor
--
-- Grants FLUX / LinkHelp admin console access by setting app_metadata.role on the
-- auth user. After running, the user must sign out and sign in again (or refresh
-- the session) so the JWT picks up the new app_metadata.
--
-- Route: /admin/dashboard (requires role = 'admin' or 'flux_admin')

UPDATE auth.users
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin')
WHERE email = 'lsmoraisnoir@outlook.com';
