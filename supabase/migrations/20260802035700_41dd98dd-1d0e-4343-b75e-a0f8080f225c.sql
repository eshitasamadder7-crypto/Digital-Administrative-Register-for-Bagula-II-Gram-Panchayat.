CREATE TYPE public.citizen_health_status AS ENUM ('good','watch','restricted','suspended');
CREATE TYPE public.citizen_notification_kind AS ENUM ('application_returned','certificate_ready','profile_incomplete','account_warning','office_notice','security_alert','general');

CREATE SEQUENCE IF NOT EXISTS public.citizen_id_seq START 1;

CREATE OR REPLACE FUNCTION public.next_citizen_id()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'BGL2-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.citizen_id_seq')::text, 6, '0');
$$;

CREATE TABLE public.citizen_profiles (
  user_id uuid PRIMARY KEY,
  citizen_id text NOT NULL UNIQUE DEFAULT public.next_citizen_id(),
  prefix text,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  guardian_name text,
  mother_name text,
  date_of_birth date,
  gender text,
  marital_status text,
  occupation text,
  village text,
  post_office text,
  gram_panchayat text NOT NULL DEFAULT 'Bagula 2 No. Gram Panchayat',
  block text NOT NULL DEFAULT 'Hanskhali',
  police_station text NOT NULL DEFAULT 'Hanskhali P.S.',
  district text NOT NULL DEFAULT 'Nadia',
  state text NOT NULL DEFAULT 'West Bengal',
  pin_code text,
  mobile text,
  alternate_mobile text,
  email text,
  email_verified boolean NOT NULL DEFAULT false,
  epic_no text,
  pan_no text,
  aadhaar_last4 text,
  photo_path text,
  epic_doc_path text,
  pan_doc_path text,
  aadhaar_doc_path text,
  preferred_language text NOT NULL DEFAULT 'en',
  profile_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT citizen_aadhaar_last4_chk CHECK (aadhaar_last4 IS NULL OR aadhaar_last4 ~ '^[0-9]{4}$')
);

GRANT SELECT, INSERT, UPDATE ON public.citizen_profiles TO authenticated;
GRANT ALL ON public.citizen_profiles TO service_role;
ALTER TABLE public.citizen_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY citizen_profiles_self_select ON public.citizen_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY citizen_profiles_self_update ON public.citizen_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY citizen_profiles_admin_select ON public.citizen_profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY citizen_profiles_admin_update ON public.citizen_profiles
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE TRIGGER citizen_profiles_updated_at BEFORE UPDATE ON public.citizen_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_citizen_profiles_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id
     AND NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    NEW.citizen_id := OLD.citizen_id;
    NEW.user_id := OLD.user_id;
    NEW.email_verified := OLD.email_verified;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER citizen_profiles_guard BEFORE UPDATE ON public.citizen_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_citizen_profiles_guard();

CREATE TABLE public.citizen_account_health (
  user_id uuid PRIMARY KEY,
  health public.citizen_health_status NOT NULL DEFAULT 'good',
  trust_score integer NOT NULL DEFAULT 50,
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT citizen_trust_score_chk CHECK (trust_score BETWEEN 0 AND 100)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.citizen_account_health TO authenticated;
GRANT ALL ON public.citizen_account_health TO service_role;
ALTER TABLE public.citizen_account_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY citizen_health_self_select ON public.citizen_account_health
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY citizen_health_admin_all ON public.citizen_account_health
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE TRIGGER citizen_health_updated_at BEFORE UPDATE ON public.citizen_account_health
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.citizen_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind public.citizen_notification_kind NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  action_label text,
  action_href text,
  requires_action boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.citizen_notifications TO authenticated;
GRANT ALL ON public.citizen_notifications TO service_role;
ALTER TABLE public.citizen_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY citizen_notifications_self_select ON public.citizen_notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY citizen_notifications_self_update ON public.citizen_notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY citizen_notifications_admin_all ON public.citizen_notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE INDEX citizen_notifications_user_idx ON public.citizen_notifications(user_id, created_at DESC);

CREATE TRIGGER citizen_notifications_updated_at BEFORE UPDATE ON public.citizen_notifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.citizen_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  citizen_id text,
  action_type text NOT NULL,
  target_table text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.citizen_activity_logs TO authenticated;
GRANT ALL ON public.citizen_activity_logs TO service_role;
ALTER TABLE public.citizen_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY citizen_activity_self_select ON public.citizen_activity_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY citizen_activity_self_insert ON public.citizen_activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY citizen_activity_admin_select ON public.citizen_activity_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE INDEX citizen_activity_user_idx ON public.citizen_activity_logs(user_id, created_at DESC);

CREATE TABLE public.citizen_login_identifiers (
  identifier text PRIMARY KEY,
  user_id uuid NOT NULL,
  auth_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.citizen_login_identifiers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.citizen_login_identifiers FROM anon, authenticated;
GRANT ALL ON public.citizen_login_identifiers TO service_role;

CREATE OR REPLACE FUNCTION public.citizen_profile_is_complete(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.citizen_profiles p
    WHERE p.user_id = _user_id
      AND p.photo_path IS NOT NULL
      AND p.epic_no IS NOT NULL
      AND p.village IS NOT NULL
      AND p.mobile IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.citizen_profile_is_complete(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.citizen_profile_is_complete(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.next_citizen_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_citizen_id() TO service_role;
GRANT USAGE ON SEQUENCE public.citizen_id_seq TO service_role;