-- =============================================================================
-- LinkHelp — fix INDIRECT trigger missing RETURN (candidatura)
--
-- PREREQUISITE:
--   Run audit_indirect_trigger_cascade.sql sections 2 and 3.
--   Copy trigger_function + trigger_name from the first CULPRIT row.
--
-- IDENTIFIED PATTERN (repo vs production):
--   • Repo: ZERO triggers on push_notification_queue (0040 uses Dashboard webhook)
--   • Production: manual AFTER INSERT trigger on push_notification_queue
--     (pg_net http_post or supabase_functions.http_request) WITHOUT "RETURN NEW"
--   • Fires when: push_on_application_inserted → enqueue_push → INSERT queue
--
-- TWO VALID FIXES (pick ONE after audit):
--   FIX-A  Add RETURN NEW to the culprit function (section below)
--   FIX-B  Drop SQL trigger on queue; keep Dashboard webhook only (0040 architecture)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FIX-B (recommended for LinkHelp 0040 architecture)
-- Drops ALL custom SQL triggers on push_notification_queue.
-- Push delivery must use Dashboard webhook: push_notification_queue INSERT → send-push
-- Verify webhook exists: Dashboard → Database → Webhooks
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select t.tgname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace cn on cn.oid = c.relnamespace
    where not t.tgisinternal
      and cn.nspname = 'public'
      and c.relname = 'push_notification_queue'
  loop
    execute format(
      'drop trigger if exists %I on public.push_notification_queue',
      r.tgname
    );
    raise notice 'Dropped trigger % on public.push_notification_queue', r.tgname;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- FIX-A (use ONLY if you must keep SQL trigger instead of Dashboard webhook)
-- Replace CULPRIT_FUNCTION_NAME with name from audit section 3.
-- Uncomment the block that matches the function body you see in pg_get_functiondef.
-- ---------------------------------------------------------------------------

-- A1) pg_net pattern (perform net.http_post ... missing return new)
/*
create or replace function public.CULPRIT_FUNCTION_NAME()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
begin
  perform net.http_post(
    url := 'https://mttjbaiiaeiqqmnwnzwr.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'push_notification_queue',
      'schema', 'public',
      'record', to_jsonb(new)
    )
  );

  return new;
end;
$$;
*/

-- A2) supabase_functions.http_request pattern (missing return new)
/*
create or replace function public.CULPRIT_FUNCTION_NAME()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform supabase_functions.http_request(
    'https://mttjbaiiaeiqqmnwnzwr.supabase.co/functions/v1/send-push',
    'POST',
    '{"Content-Type":"application/json"}',
    jsonb_build_object(
      'type', 'INSERT',
      'table', 'push_notification_queue',
      'schema', 'public',
      'record', to_jsonb(new)
    )::text,
    '5000'
  );

  return new;
end;
$$;
*/

-- A3) Generic empty-body wrapper (only perform call, forgot return)
/*
create or replace function public.CULPRIT_FUNCTION_NAME()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- paste existing PERFORM / INSERT logic from pg_get_functiondef here
  return new;
end;
$$;
*/

notify pgrst, 'reload schema';
