-- =============================================================================
-- Push Notification Queue + Triggers
-- Architecture: triggers INSERT into push_notification_queue → Supabase
-- Database Webhook calls send-push edge function automatically.
--
-- NO ALTER DATABASE SET required.
-- NO secrets in SQL.
-- NO pg_net calls from triggers.
--
-- After applying this migration, configure ONE Supabase Database Webhook:
--   Dashboard → Database → Webhooks → Create new webhook
--     Table:  push_notification_queue  |  Event: INSERT
--     URL:    https://mttjbaiiaeiqqmnwnzwr.supabase.co/functions/v1/send-push
--     Header: Authorization: Bearer <your service_role key>
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS private;

-- ---------------------------------------------------------------------------
-- Queue table: triggers write here, webhook reads the INSERT event
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_notification_queue (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL,
  title        text        NOT NULL,
  body         text        NOT NULL DEFAULT '',
  url          text        NOT NULL DEFAULT '/',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Only service_role (edge function) can read the queue; triggers bypass RLS
ALTER TABLE public.push_notification_queue ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup: entries older than 7 days are removed (requires pg_cron, optional)
-- COMMENT ON TABLE public.push_notification_queue IS 'TTL: 7 days';

-- ---------------------------------------------------------------------------
-- Helper: enqueue a push notification (called by all trigger functions)
-- SECURITY DEFINER → runs as postgres, bypasses RLS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.enqueue_push(
  p_user_id uuid,
  p_title   text,
  p_body    text,
  p_url     text DEFAULT '/'
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.push_notification_queue (user_id, title, body, url)
  VALUES (p_user_id, p_title, p_body, p_url);
$$;

-- ---------------------------------------------------------------------------
-- Trigger 1: application INSERT → notify client
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.trg_push_on_application_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_helper_name text;
BEGIN
  SELECT name INTO v_helper_name FROM profiles WHERE id = NEW.helper_id;

  PERFORM private.enqueue_push(
    NEW.client_id,
    'Nova candidatura recebida',
    coalesce(v_helper_name, 'Um helper') || ' se candidatou ao seu pedido.',
    '/client/dashboard'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_on_application_inserted ON applications;
CREATE TRIGGER push_on_application_inserted
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION private.trg_push_on_application_inserted();

-- ---------------------------------------------------------------------------
-- Trigger 2: application UPDATE status → 'accepted' → notify helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.trg_push_on_application_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM private.enqueue_push(
    NEW.helper_id,
    'Proposta aceita',
    'Sua candidatura foi aceita. Veja os detalhes do job.',
    '/helper/jobs'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_on_application_accepted ON applications;
CREATE TRIGGER push_on_application_accepted
  AFTER UPDATE ON applications
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION private.trg_push_on_application_accepted();

-- ---------------------------------------------------------------------------
-- Trigger 3: message INSERT → notify the other conversation participant
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.trg_push_on_message_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv         record;
  v_recipient_id uuid;
  v_sender_name  text;
  v_preview      text;
BEGIN
  SELECT client_id, helper_id
  INTO   v_conv
  FROM   conversations
  WHERE  id = NEW.conversation_id;

  IF NEW.sender_id = v_conv.client_id THEN
    v_recipient_id := v_conv.helper_id;
  ELSE
    v_recipient_id := v_conv.client_id;
  END IF;

  SELECT name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;

  v_preview := left(NEW.content, 100);
  IF length(NEW.content) > 100 THEN v_preview := v_preview || '…'; END IF;

  PERFORM private.enqueue_push(
    v_recipient_id,
    coalesce(v_sender_name, 'Nova mensagem'),
    v_preview,
    '/messages'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_on_message_inserted ON messages;
CREATE TRIGGER push_on_message_inserted
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION private.trg_push_on_message_inserted();
