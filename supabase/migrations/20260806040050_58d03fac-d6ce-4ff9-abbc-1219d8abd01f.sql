-- 1. New read-only office role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'monitoring_authority';

-- 2. Master Data Center
CREATE TABLE IF NOT EXISTS public.master_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  code text NOT NULL,
  label text NOT NULL,
  label_bn text,
  parent_code text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, code)
);

GRANT SELECT ON public.master_data TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_data TO authenticated;
GRANT ALL ON public.master_data TO service_role;

ALTER TABLE public.master_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master_data_read_all" ON public.master_data;
CREATE POLICY "master_data_read_all" ON public.master_data
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "master_data_super_admin_write" ON public.master_data;
CREATE POLICY "master_data_super_admin_write" ON public.master_data
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP TRIGGER IF EXISTS master_data_updated_at ON public.master_data;
CREATE TRIGGER master_data_updated_at BEFORE UPDATE ON public.master_data
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS master_data_category_idx ON public.master_data (category, sort_order);

-- 3. Employee fields on admin_profiles
CREATE SEQUENCE IF NOT EXISTS public.employee_id_seq START 1;

ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS designation_code text,
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{"email":true,"in_app":true,"returned":true,"issued":true,"notices":true,"system":true}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS admin_profiles_employee_id_key
  ON public.admin_profiles (employee_id) WHERE employee_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tg_admin_profiles_employee_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.employee_id IS NULL THEN
    NEW.employee_id := 'EMP-' || lpad(nextval('public.employee_id_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS admin_profiles_employee_id ON public.admin_profiles;
CREATE TRIGGER admin_profiles_employee_id BEFORE INSERT ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_admin_profiles_employee_id();

UPDATE public.admin_profiles
SET employee_id = 'EMP-' || lpad(nextval('public.employee_id_seq')::text, 4, '0')
WHERE employee_id IS NULL;

-- guard: officers must not self-edit employee_id / designation_code
CREATE OR REPLACE FUNCTION public.tg_admin_profiles_guard_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = NEW.user_id
     AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    NEW.status       := OLD.status;
    NEW.system_role  := OLD.system_role;
    NEW.designation  := OLD.designation;
    NEW.designation_code := OLD.designation_code;
    NEW.employee_id  := OLD.employee_id;
    NEW.office_id    := OLD.office_id;
    NEW.email        := OLD.email;
    NEW.archived_at  := OLD.archived_at;
    NEW.created_by   := OLD.created_by;
    NEW.user_id      := OLD.user_id;
    NEW.allowed_login_method := OLD.allowed_login_method;
  END IF;
  RETURN NEW;
END; $$;

-- 4. Office notification centre
DO $$ BEGIN
  CREATE TYPE public.office_notification_kind AS ENUM
    ('application_returned','certificate_issued','new_notice','system_alert','public_draft','general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.office_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind public.office_notification_kind NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  action_label text,
  action_href text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.office_notifications TO authenticated;
GRANT ALL ON public.office_notifications TO service_role;

ALTER TABLE public.office_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "office_notif_own_select" ON public.office_notifications;
CREATE POLICY "office_notif_own_select" ON public.office_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "office_notif_own_update" ON public.office_notifications;
CREATE POLICY "office_notif_own_update" ON public.office_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS office_notifications_updated_at ON public.office_notifications;
CREATE TRIGGER office_notifications_updated_at BEFORE UPDATE ON public.office_notifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS office_notifications_user_idx
  ON public.office_notifications (user_id, created_at DESC);

-- server-side notification writer (no client INSERT grant)
CREATE OR REPLACE FUNCTION public.notify_office_user(
  _user_id uuid, _kind public.office_notification_kind, _title text,
  _body text DEFAULT NULL, _action_label text DEFAULT NULL, _action_href text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (has_role(_uid,'admin') OR has_role(_uid,'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _title IS NULL OR length(trim(_title)) = 0 THEN RAISE EXCEPTION 'Title required'; END IF;
  INSERT INTO public.office_notifications (user_id, kind, title, body, action_label, action_href)
  VALUES (_user_id, _kind, left(_title, 200), left(coalesce(_body,''), 2000), _action_label, _action_href);
END; $$;

REVOKE ALL ON FUNCTION public.notify_office_user(uuid, public.office_notification_kind, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_office_user(uuid, public.office_notification_kind, text, text, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.tg_admin_profiles_employee_id() FROM PUBLIC, anon, authenticated;