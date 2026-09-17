
-- ============================================================
-- Phase 2A: Certificate archive, audit, and backup foundation
-- ============================================================

-- Private schema for security-definer helpers (reuse if exists)
CREATE SCHEMA IF NOT EXISTS app_private;

-- ---------- Enums ----------
DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cert_audit_action AS ENUM (
    'created', 'approved', 'rejected', 'downloaded',
    'modified', 'archived', 'restored', 'verified', 'revoked'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cert_kind AS ENUM ('warish', 'dependent', 'birth', 'death');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.backup_kind AS ENUM ('daily', 'weekly', 'monthly', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.backup_status AS ENUM ('running', 'success', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Per-year sequence helper ----------
CREATE OR REPLACE FUNCTION app_private.next_cert_number(_kind public.cert_kind)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  _year int := extract(year from now())::int;
  _prefix text := upper(_kind::text);
  _n int;
BEGIN
  INSERT INTO app_private.cert_counters(kind, year, last_value)
  VALUES (_kind, _year, 1)
  ON CONFLICT (kind, year)
    DO UPDATE SET last_value = app_private.cert_counters.last_value + 1
  RETURNING last_value INTO _n;
  RETURN format('%s-%s-%s', _prefix, _year, lpad(_n::text, 5, '0'));
END $$;

CREATE TABLE IF NOT EXISTS app_private.cert_counters (
  kind public.cert_kind NOT NULL,
  year int NOT NULL,
  last_value int NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, year)
);

-- ---------- Extend existing tables ----------
ALTER TABLE public.warish_certificates
  ADD COLUMN IF NOT EXISTS certificate_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS issue_date date,
  ADD COLUMN IF NOT EXISTS applicant_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS verification_status public.verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archive_reason text;

ALTER TABLE public.dependent_certificates
  ADD COLUMN IF NOT EXISTS certificate_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS issue_date date,
  ADD COLUMN IF NOT EXISTS applicant_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS verification_status public.verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archive_reason text;

-- Default the new cert numbers and issue_date on insert
CREATE OR REPLACE FUNCTION app_private.tg_warish_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
BEGIN
  IF NEW.certificate_number IS NULL THEN
    NEW.certificate_number := app_private.next_cert_number('warish');
  END IF;
  IF NEW.issue_date IS NULL THEN
    NEW.issue_date := current_date;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION app_private.tg_dependent_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
BEGIN
  IF NEW.certificate_number IS NULL THEN
    NEW.certificate_number := app_private.next_cert_number('dependent');
  END IF;
  IF NEW.issue_date IS NULL THEN
    NEW.issue_date := current_date;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS warish_defaults ON public.warish_certificates;
CREATE TRIGGER warish_defaults
  BEFORE INSERT ON public.warish_certificates
  FOR EACH ROW EXECUTE FUNCTION app_private.tg_warish_defaults();

DROP TRIGGER IF EXISTS dependent_defaults ON public.dependent_certificates;
CREATE TRIGGER dependent_defaults
  BEFORE INSERT ON public.dependent_certificates
  FOR EACH ROW EXECUTE FUNCTION app_private.tg_dependent_defaults();

-- ---------- Birth and Death tracking tables ----------
CREATE TABLE IF NOT EXISTS public.birth_certificate_records (
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
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at timestamptz,
  archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archive_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.birth_certificate_records TO authenticated;
GRANT ALL ON public.birth_certificate_records TO service_role;
ALTER TABLE public.birth_certificate_records ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.death_certificate_records (
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
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at timestamptz,
  archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archive_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.death_certificate_records TO authenticated;
GRANT ALL ON public.death_certificate_records TO service_role;
ALTER TABLE public.death_certificate_records ENABLE ROW LEVEL SECURITY;

-- Auto cert number for birth/death
CREATE OR REPLACE FUNCTION app_private.tg_birth_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, app_private AS $$
BEGIN
  IF NEW.certificate_number IS NULL THEN
    NEW.certificate_number := app_private.next_cert_number('birth');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION app_private.tg_death_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, app_private AS $$
BEGIN
  IF NEW.certificate_number IS NULL THEN
    NEW.certificate_number := app_private.next_cert_number('death');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER birth_defaults BEFORE INSERT ON public.birth_certificate_records
  FOR EACH ROW EXECUTE FUNCTION app_private.tg_birth_defaults();
CREATE TRIGGER death_defaults BEFORE INSERT ON public.death_certificate_records
  FOR EACH ROW EXECUTE FUNCTION app_private.tg_death_defaults();

CREATE TRIGGER birth_set_updated_at BEFORE UPDATE ON public.birth_certificate_records
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER death_set_updated_at BEFORE UPDATE ON public.death_certificate_records
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- Certificate audit log (immutable) ----------
CREATE TABLE IF NOT EXISTS public.certificate_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_kind public.cert_kind NOT NULL,
  cert_table text NOT NULL,
  cert_id uuid NOT NULL,
  certificate_number text,
  action public.cert_audit_action NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  reason text,
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cert_audit_cert ON public.certificate_audit_logs(cert_kind, cert_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cert_audit_actor ON public.certificate_audit_logs(actor_user_id, created_at DESC);

GRANT SELECT, INSERT ON public.certificate_audit_logs TO authenticated;
GRANT ALL ON public.certificate_audit_logs TO service_role;
ALTER TABLE public.certificate_audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------- Backup + restore job metadata ----------
CREATE TABLE IF NOT EXISTS public.backup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.backup_kind NOT NULL,
  status public.backup_status NOT NULL DEFAULT 'running',
  storage_path text,
  size_bytes bigint,
  table_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  retention_until timestamptz NOT NULL,
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.backup_jobs TO authenticated;
GRANT ALL ON public.backup_jobs TO service_role;
ALTER TABLE public.backup_jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.restore_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_job_id uuid REFERENCES public.backup_jobs(id) ON DELETE SET NULL,
  status public.backup_status NOT NULL DEFAULT 'running',
  reason text NOT NULL,
  triggered_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  triggered_by_email text,
  ip_address text,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.restore_jobs TO authenticated;
GRANT ALL ON public.restore_jobs TO service_role;
ALTER TABLE public.restore_jobs ENABLE ROW LEVEL SECURITY;

-- ---------- RLS: hide archived rows from non-super-admins ----------
-- Drop & recreate generic SELECT policies so we can layer the archive filter.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('warish_certificates','dependent_certificates')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Warish: admins read non-archived; super-admins read all; insert/update by admins
CREATE POLICY warish_read_admin ON public.warish_certificates
  FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(),'admin') AND archived_at IS NULL)
    OR public.has_role(auth.uid(),'super_admin')
  );
CREATE POLICY warish_insert_admin ON public.warish_certificates
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY warish_update_admin ON public.warish_certificates
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
-- NO delete policy: hard deletes blocked. Archive via app_private.archive_certificate.

CREATE POLICY dependent_read_admin ON public.dependent_certificates
  FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(),'admin') AND archived_at IS NULL)
    OR public.has_role(auth.uid(),'super_admin')
  );
CREATE POLICY dependent_insert_admin ON public.dependent_certificates
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY dependent_update_admin ON public.dependent_certificates
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Birth records
CREATE POLICY birth_read_admin ON public.birth_certificate_records
  FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(),'admin') AND archived_at IS NULL)
    OR public.has_role(auth.uid(),'super_admin')
  );
CREATE POLICY birth_insert_admin ON public.birth_certificate_records
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY birth_update_admin ON public.birth_certificate_records
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Death records
CREATE POLICY death_read_admin ON public.death_certificate_records
  FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(),'admin') AND archived_at IS NULL)
    OR public.has_role(auth.uid(),'super_admin')
  );
CREATE POLICY death_insert_admin ON public.death_certificate_records
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY death_update_admin ON public.death_certificate_records
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Certificate audit log policies
CREATE POLICY cert_audit_read_admin ON public.certificate_audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY cert_audit_insert_admin ON public.certificate_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  );
-- No update/delete: immutable

-- Backup / restore policies: super admin only
CREATE POLICY backup_super_select ON public.backup_jobs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY backup_super_write ON public.backup_jobs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY backup_super_update ON public.backup_jobs
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY restore_super_select ON public.restore_jobs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY restore_super_write ON public.restore_jobs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin') AND triggered_by = auth.uid());
CREATE POLICY restore_super_update ON public.restore_jobs
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ---------- Archive (soft-delete) function ----------
-- Enforces: super_admin only, age >= 1 year, reason required, audit log written.
CREATE OR REPLACE FUNCTION app_private.archive_certificate(
  _kind public.cert_kind,
  _cert_id uuid,
  _reason text,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  _actor uuid := auth.uid();
  _actor_email text;
  _issue date;
  _cert_no text;
  _table text;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  IF NOT public.has_role(_actor, 'super_admin') THEN
    RAISE EXCEPTION 'only super admins may archive certificates';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 8 THEN
    RAISE EXCEPTION 'a reason of at least 8 characters is required';
  END IF;

  SELECT email INTO _actor_email FROM auth.users WHERE id = _actor;

  _table := CASE _kind
    WHEN 'warish' THEN 'warish_certificates'
    WHEN 'dependent' THEN 'dependent_certificates'
    WHEN 'birth' THEN 'birth_certificate_records'
    WHEN 'death' THEN 'death_certificate_records'
  END;

  EXECUTE format(
    'SELECT issue_date, certificate_number FROM public.%I WHERE id = $1 AND archived_at IS NULL',
    _table
  ) INTO _issue, _cert_no USING _cert_id;

  IF _cert_no IS NULL AND _issue IS NULL THEN
    RAISE EXCEPTION 'certificate not found or already archived';
  END IF;

  IF _issue IS NULL OR _issue > (current_date - INTERVAL '1 year') THEN
    RAISE EXCEPTION 'certificates may not be archived until one year after issue';
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET archived_at = now(), archived_by = $1, archive_reason = $2 WHERE id = $3',
    _table
  ) USING _actor, _reason, _cert_id;

  INSERT INTO public.certificate_audit_logs(
    cert_kind, cert_table, cert_id, certificate_number, action,
    actor_user_id, actor_email, reason, ip_address, user_agent
  ) VALUES (
    _kind, _table, _cert_id, _cert_no, 'archived',
    _actor, _actor_email, _reason, _ip, _user_agent
  );
END $$;

GRANT EXECUTE ON FUNCTION app_private.archive_certificate(public.cert_kind, uuid, text, text, text) TO authenticated;

-- Convenience public wrapper (search_path locked) so PostgREST can call it.
CREATE OR REPLACE FUNCTION public.archive_certificate(
  _kind public.cert_kind,
  _cert_id uuid,
  _reason text,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
  SELECT app_private.archive_certificate(_kind, _cert_id, _reason, _ip, _user_agent);
$$;
GRANT EXECUTE ON FUNCTION public.archive_certificate(public.cert_kind, uuid, text, text, text) TO authenticated;

-- ---------- Updated-at trigger for backup_jobs (uses existing helper) ----------
CREATE TRIGGER backup_jobs_set_updated_at BEFORE UPDATE ON public.backup_jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
