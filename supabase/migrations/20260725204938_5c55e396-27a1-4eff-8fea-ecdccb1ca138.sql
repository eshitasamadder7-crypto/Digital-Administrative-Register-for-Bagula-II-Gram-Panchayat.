-- Compact bootstrap: recreate schema needed by the app so TypeScript types populate.

-- ============ Enums ============
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('super_admin','admin','deo','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.app_permission AS ENUM ('notices','representatives','staff','homepage_content','redirects','warish_certs','dependent_certs','birth_certs','admins','activity_logs','backups'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.app_action AS ENUM ('view','create','edit','delete'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.verification_status AS ENUM ('pending','verified','rejected','revoked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.cert_kind AS ENUM ('warish','dependent','birth','death'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.cert_audit_action AS ENUM ('created','approved','rejected','downloaded','modified','archived','restored','verified','revoked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.backup_kind AS ENUM ('daily','weekly','monthly','manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.backup_status AS ENUM ('running','success','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.office_designation AS ENUM ('secretary','deo','pradhan','upa_pradhan','member','clerk','accountant','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.office_system_role AS ENUM ('office_user','office_manager','approving_authority','read_only'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.whats_new_expiry_mode AS ENUM ('never','date','datetime','manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ Shared trigger fn ============
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ user_roles ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE POLICY user_roles_self_select ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY user_roles_super_admin_all ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ admin_profiles ============
CREATE TABLE public.admin_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  designation public.office_designation,
  system_role public.office_system_role,
  office_id text,
  last_login_at timestamptz,
  last_login_ip text,
  created_by uuid,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_profiles TO authenticated;
GRANT ALL ON public.admin_profiles TO service_role;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER admin_profiles_updated_at BEFORE UPDATE ON public.admin_profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX admin_profiles_archived_idx ON public.admin_profiles (archived_at);

CREATE POLICY admin_profiles_self_select ON public.admin_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY admin_profiles_self_update ON public.admin_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY admin_profiles_super_admin_all ON public.admin_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ admin_permissions ============
CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission public.app_permission NOT NULL,
  action public.app_action NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission, action)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissions TO authenticated;
GRANT ALL ON public.admin_permissions TO service_role;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_permissions_self_select ON public.admin_permissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY admin_permissions_super_admin_all ON public.admin_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ activity_logs ============
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  action_type text NOT NULL,
  target_table text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_logs_self_insert ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_user_id);
CREATE POLICY activity_logs_admin_read ON public.activity_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

-- ============ whats_new_entries ============
CREATE TABLE public.whats_new_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_on date NOT NULL DEFAULT current_date,
  content text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  is_pinned boolean NOT NULL DEFAULT false,
  expiry_mode public.whats_new_expiry_mode NOT NULL DEFAULT 'never',
  expires_at timestamptz,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whats_new_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whats_new_entries TO authenticated;
GRANT ALL ON public.whats_new_entries TO service_role;
ALTER TABLE public.whats_new_entries ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER whats_new_entries_updated_at BEFORE UPDATE ON public.whats_new_entries FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX whats_new_entries_pinned_idx ON public.whats_new_entries (is_pinned DESC, posted_on DESC);

CREATE POLICY whats_new_public_read ON public.whats_new_entries FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY whats_new_admin_insert ON public.whats_new_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY whats_new_admin_update ON public.whats_new_entries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY whats_new_admin_delete ON public.whats_new_entries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- ============ warish_certificates ============
CREATE TABLE public.warish_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_no text,
  cert_date date,
  deceased_name text,
  applicant_name text,
  village text,
  department text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'Pending Signature & Memo Registration',
  certificate_number text UNIQUE,
  verification_id text UNIQUE,
  issue_date date,
  memo_serial int,
  applicant_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_storage_path text,
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  archived_at timestamptz,
  archived_by uuid,
  archive_reason text,
  rejected_at timestamptz,
  rejected_by uuid,
  rejection_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warish_certificates TO authenticated;
GRANT ALL ON public.warish_certificates TO service_role;
ALTER TABLE public.warish_certificates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER warish_updated_at BEFORE UPDATE ON public.warish_certificates FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY warish_admin_all ON public.warish_certificates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'deo'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'deo'));

-- ============ dependent_certificates ============
CREATE TABLE public.dependent_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_no text,
  cert_date date,
  applicant_name text,
  village text,
  department text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'Pending Signature & Memo Registration',
  certificate_number text UNIQUE,
  verification_id text UNIQUE,
  issue_date date,
  memo_serial int,
  applicant_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_storage_path text,
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  archived_at timestamptz,
  archived_by uuid,
  archive_reason text,
  rejected_at timestamptz,
  rejected_by uuid,
  rejection_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependent_certificates TO authenticated;
GRANT ALL ON public.dependent_certificates TO service_role;
ALTER TABLE public.dependent_certificates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER dependent_updated_at BEFORE UPDATE ON public.dependent_certificates FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY dependent_admin_all ON public.dependent_certificates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'deo'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'deo'));

-- ============ birth_certificate_records ============
CREATE TABLE public.birth_certificate_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number text UNIQUE,
  issue_date date NOT NULL DEFAULT current_date,
  applicant_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  child_name text,
  father_name text,
  mother_name text,
  date_of_birth date,
  place_of_birth text,
  external_reference text,
  pdf_storage_path text,
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid,
  archived_at timestamptz,
  archived_by uuid,
  archive_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.birth_certificate_records TO authenticated;
GRANT ALL ON public.birth_certificate_records TO service_role;
ALTER TABLE public.birth_certificate_records ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER birth_updated_at BEFORE UPDATE ON public.birth_certificate_records FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY birth_admin_all ON public.birth_certificate_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- ============ death_certificate_records ============
CREATE TABLE public.death_certificate_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number text UNIQUE,
  issue_date date NOT NULL DEFAULT current_date,
  applicant_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  deceased_name text,
  father_or_husband_name text,
  date_of_death date,
  place_of_death text,
  external_reference text,
  pdf_storage_path text,
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid,
  archived_at timestamptz,
  archived_by uuid,
  archive_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.death_certificate_records TO authenticated;
GRANT ALL ON public.death_certificate_records TO service_role;
ALTER TABLE public.death_certificate_records ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER death_updated_at BEFORE UPDATE ON public.death_certificate_records FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY death_admin_all ON public.death_certificate_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- ============ certificate_audit_logs ============
CREATE TABLE public.certificate_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_kind public.cert_kind NOT NULL,
  cert_table text NOT NULL,
  cert_id uuid NOT NULL,
  certificate_number text,
  action public.cert_audit_action NOT NULL,
  actor_user_id uuid,
  actor_email text,
  reason text,
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.certificate_audit_logs TO authenticated;
GRANT ALL ON public.certificate_audit_logs TO service_role;
ALTER TABLE public.certificate_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY cert_audit_admin_read ON public.certificate_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY cert_audit_self_insert ON public.certificate_audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- ============ backup_jobs ============
CREATE TABLE public.backup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.backup_kind NOT NULL,
  status public.backup_status NOT NULL DEFAULT 'running',
  storage_path text,
  size_bytes bigint,
  table_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  retention_until timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  triggered_by uuid,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.backup_jobs TO authenticated;
GRANT ALL ON public.backup_jobs TO service_role;
ALTER TABLE public.backup_jobs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER backup_jobs_updated_at BEFORE UPDATE ON public.backup_jobs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE POLICY backup_jobs_super_all ON public.backup_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ verification_lookups (rate-limit tracking) ============
CREATE TABLE public.verification_lookups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  verification_id text,
  looked_up_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_lookups_ip_time_idx ON public.verification_lookups (ip_hash, looked_up_at DESC);
GRANT ALL ON public.verification_lookups TO service_role;
ALTER TABLE public.verification_lookups ENABLE ROW LEVEL SECURITY;
-- No policies: only accessed via SECURITY DEFINER functions.

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.generate_verification_id(_kind text, _year int)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n int;
BEGIN
  _n := floor(random()*99999)::int;
  RETURN upper(_kind) || '-' || _year::text || '-' || lpad(_n::text,5,'0');
END; $$;

CREATE OR REPLACE FUNCTION public.public_verify(_verification_id text, _ip_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _recent int;
  _row record;
BEGIN
  IF _ip_hash IS NULL OR length(_ip_hash) < 8 THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;

  SELECT count(*) INTO _recent
  FROM public.verification_lookups
  WHERE ip_hash = _ip_hash AND looked_up_at > now() - interval '10 minutes';
  IF _recent >= 20 THEN
    RETURN jsonb_build_object('status','rate_limited');
  END IF;

  INSERT INTO public.verification_lookups (ip_hash, verification_id) VALUES (_ip_hash, _verification_id);

  SELECT 'warish'::text AS kind, w.verification_id, w.memo_no, w.issue_date, w.status,
         w.verification_status, w.archived_at, w.applicant_name, w.deceased_name, w.data
    INTO _row
    FROM public.warish_certificates w
   WHERE w.verification_id = _verification_id
   LIMIT 1;

  IF _row IS NULL THEN
    SELECT 'dependent'::text AS kind, d.verification_id, d.memo_no, d.issue_date, d.status,
           d.verification_status, d.archived_at, NULL::text AS applicant_name, NULL::text AS deceased_name, d.data
      INTO _row
      FROM public.dependent_certificates d
     WHERE d.verification_id = _verification_id
     LIMIT 1;
  END IF;

  IF _row IS NULL THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;

  IF _row.archived_at IS NOT NULL OR _row.status IS DISTINCT FROM 'Approved' THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;

  RETURN jsonb_build_object(
    'status','found',
    'kind', _row.kind,
    'certificate_type', CASE _row.kind WHEN 'warish' THEN 'Warish Certificate' ELSE 'Dependent Certificate' END,
    'verification_id', _row.verification_id,
    'applicant_name', _row.applicant_name,
    'deceased_name', _row.deceased_name,
    'record_status', 'Approved',
    'memo_no', _row.memo_no,
    'issue_date', _row.issue_date,
    'record_data', _row.data,
    'issued_by', 'Bagula II Gram Panchayat',
    'server_time', now()
  );
END; $$;

CREATE OR REPLACE FUNCTION public.public_verify_advanced(_memo_no text, _issue_date date, _aadhaar_last4 text, _ip_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _recent int;
  _row record;
BEGIN
  IF _ip_hash IS NULL OR length(_ip_hash) < 8 THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;

  SELECT count(*) INTO _recent
  FROM public.verification_lookups
  WHERE ip_hash = _ip_hash AND looked_up_at > now() - interval '10 minutes';
  IF _recent >= 20 THEN
    RETURN jsonb_build_object('status','rate_limited');
  END IF;

  INSERT INTO public.verification_lookups (ip_hash, verification_id) VALUES (_ip_hash, _memo_no);

  SELECT 'warish'::text AS kind, w.verification_id, w.memo_no, w.issue_date, w.status,
         w.archived_at, w.applicant_name, w.deceased_name, w.data
    INTO _row
    FROM public.warish_certificates w
   WHERE w.memo_no = _memo_no AND w.issue_date = _issue_date AND w.status = 'Approved' AND w.archived_at IS NULL
   LIMIT 1;

  IF _row IS NULL THEN
    SELECT 'dependent'::text AS kind, d.verification_id, d.memo_no, d.issue_date, d.status,
           d.archived_at, NULL::text AS applicant_name, NULL::text AS deceased_name, d.data
      INTO _row
      FROM public.dependent_certificates d
     WHERE d.memo_no = _memo_no AND d.issue_date = _issue_date AND d.status = 'Approved' AND d.archived_at IS NULL
     LIMIT 1;
  END IF;

  IF _row IS NULL THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;

  RETURN jsonb_build_object(
    'status','found',
    'kind', _row.kind,
    'certificate_type', CASE _row.kind WHEN 'warish' THEN 'Warish Certificate' ELSE 'Dependent Certificate' END,
    'verification_id', _row.verification_id,
    'applicant_name', _row.applicant_name,
    'deceased_name', _row.deceased_name,
    'record_status', 'Approved',
    'memo_no', _row.memo_no,
    'issue_date', _row.issue_date,
    'record_data', _row.data,
    'issued_by', 'Bagula II Gram Panchayat',
    'server_time', now()
  );
END; $$;

CREATE OR REPLACE FUNCTION public.archive_certificate(_kind public.cert_kind, _cert_id uuid, _reason text, _ip text DEFAULT NULL, _user_agent text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'archive_certificate not yet implemented'; END; $$;

CREATE OR REPLACE FUNCTION public.restore_certificate(_kind public.cert_kind, _cert_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'restore_certificate not yet implemented'; END; $$;

CREATE OR REPLACE FUNCTION public.permanently_delete_rejected(_kind public.cert_kind, _cert_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'permanently_delete_rejected not yet implemented'; END; $$;

CREATE OR REPLACE FUNCTION public.archive_expired_rejections()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN; END; $$;

CREATE OR REPLACE FUNCTION public.approve_certificate_v2(_kind public.cert_kind, _cert_id uuid, _memo_serial int, _memo_year int, _issue_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'approve_certificate_v2 not yet implemented'; END; $$;

CREATE OR REPLACE FUNCTION public.reject_certificate_v2(_kind public.cert_kind, _cert_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'reject_certificate_v2 not yet implemented'; END; $$;

CREATE OR REPLACE FUNCTION public.bootstrap_admin_role()
RETURNS TABLE(assigned_role app_role, was_created boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _role app_role;
  _existing app_role;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;
  _role := CASE _email
    WHEN 'bagula2nogp111@gmail.com'   THEN 'super_admin'::app_role
    WHEN 'nitush6488@gmail.com'       THEN 'admin'::app_role
    WHEN 'nitush8343980898@gmail.com' THEN 'deo'::app_role
    ELSE NULL
  END;
  IF _role IS NULL THEN RAISE EXCEPTION 'Email % is not in the bootstrap whitelist', _email; END IF;
  SELECT role INTO _existing FROM public.user_roles WHERE user_id = _uid
    ORDER BY CASE role WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 WHEN 'deo' THEN 3 ELSE 4 END
    LIMIT 1;
  IF _existing IS NOT NULL THEN
    RETURN QUERY SELECT _existing, false;
    RETURN;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role);
  INSERT INTO public.admin_profiles (user_id, email, status)
  VALUES (_uid, _email, 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN QUERY SELECT _role, true;
END; $$;

-- Lock down admin-only functions; keep public verification callable
REVOKE ALL ON FUNCTION public.bootstrap_admin_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_verification_id(text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.archive_certificate(cert_kind, uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_certificate(cert_kind, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_certificate_v2(cert_kind, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_certificate_v2(cert_kind, uuid, integer, integer, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.permanently_delete_rejected(cert_kind, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.archive_expired_rejections() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.generate_verification_id(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_certificate(cert_kind, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_certificate(cert_kind, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_certificate_v2(cert_kind, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_certificate_v2(cert_kind, uuid, integer, integer, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.permanently_delete_rejected(cert_kind, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_expired_rejections() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_verify(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_verify_advanced(text, date, text, text) TO anon, authenticated;