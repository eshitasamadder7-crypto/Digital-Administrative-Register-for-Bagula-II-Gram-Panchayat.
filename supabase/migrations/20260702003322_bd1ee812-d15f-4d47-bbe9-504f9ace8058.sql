
-- 1. Add new columns
ALTER TABLE public.warish_certificates
  ADD COLUMN IF NOT EXISTS verification_id text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Pending Signature & Memo Registration',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_reason text,
  ADD COLUMN IF NOT EXISTS rejection_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS verification_count int NOT NULL DEFAULT 0;

ALTER TABLE public.dependent_certificates
  ADD COLUMN IF NOT EXISTS verification_id text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Pending Signature & Memo Registration',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_reason text,
  ADD COLUMN IF NOT EXISTS rejection_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS verification_count int NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.warish_certificates
    ADD CONSTRAINT warish_status_check CHECK (status IN
      ('Pending Signature & Memo Registration','Approved','Rejected','Cancelled','Superseded','Archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.dependent_certificates
    ADD CONSTRAINT dependent_status_check CHECK (status IN
      ('Pending Signature & Memo Registration','Approved','Rejected','Cancelled','Superseded','Archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.warish_certificates ALTER COLUMN memo_no DROP NOT NULL;
ALTER TABLE public.warish_certificates ALTER COLUMN cert_date DROP NOT NULL;
ALTER TABLE public.dependent_certificates ALTER COLUMN memo_no DROP NOT NULL;
ALTER TABLE public.dependent_certificates ALTER COLUMN cert_date DROP NOT NULL;

UPDATE public.warish_certificates SET status='Approved',
  approval_timestamp = COALESCE(approval_timestamp, created_at)
 WHERE status='Pending Signature & Memo Registration' AND memo_no IS NOT NULL;
UPDATE public.dependent_certificates SET status='Approved',
  approval_timestamp = COALESCE(approval_timestamp, created_at)
 WHERE status='Pending Signature & Memo Registration' AND memo_no IS NOT NULL;

CREATE OR REPLACE FUNCTION app_private.generate_verification_id(_kind text, _year int)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE
  code text; attempt int := 0; kind_code text;
  alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  suffix text; i int;
BEGIN
  kind_code := CASE lower(_kind) WHEN 'warish' THEN 'WAR' WHEN 'dependent' THEN 'DEP' ELSE NULL END;
  IF kind_code IS NULL THEN RAISE EXCEPTION 'invalid kind %', _kind; END IF;
  LOOP
    attempt := attempt + 1;
    suffix := '';
    FOR i IN 1..6 LOOP
      suffix := suffix || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1);
    END LOOP;
    code := format('BGL-II-%s-%s-%s', kind_code, _year::text, suffix);
    IF NOT EXISTS (SELECT 1 FROM public.warish_certificates WHERE verification_id = code)
       AND NOT EXISTS (SELECT 1 FROM public.dependent_certificates WHERE verification_id = code)
    THEN RETURN code; END IF;
    IF attempt > 30 THEN RAISE EXCEPTION 'could not allocate verification id'; END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.generate_verification_id(_kind text, _year int)
RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path = public, app_private AS $$
  SELECT app_private.generate_verification_id(_kind, _year);
$$;
REVOKE ALL ON FUNCTION public.generate_verification_id(text,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_verification_id(text,int) TO authenticated;
REVOKE ALL ON FUNCTION app_private.generate_verification_id(text,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.generate_verification_id(text,int) TO authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, cert_date, created_at FROM public.warish_certificates WHERE verification_id IS NULL LOOP
    UPDATE public.warish_certificates SET verification_id =
      app_private.generate_verification_id('warish', COALESCE(EXTRACT(YEAR FROM r.cert_date)::int, EXTRACT(YEAR FROM r.created_at)::int))
      WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT id, cert_date, created_at FROM public.dependent_certificates WHERE verification_id IS NULL LOOP
    UPDATE public.dependent_certificates SET verification_id =
      app_private.generate_verification_id('dependent', COALESCE(EXTRACT(YEAR FROM r.cert_date)::int, EXTRACT(YEAR FROM r.created_at)::int))
      WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.warish_certificates ALTER COLUMN verification_id SET NOT NULL;
ALTER TABLE public.dependent_certificates ALTER COLUMN verification_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_warish_verification_id ON public.warish_certificates(verification_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dependent_verification_id ON public.dependent_certificates(verification_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_warish_memo_year
  ON public.warish_certificates(memo_no, (EXTRACT(YEAR FROM cert_date))) WHERE memo_no IS NOT NULL AND cert_date IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dependent_memo_year
  ON public.dependent_certificates(memo_no, (EXTRACT(YEAR FROM cert_date))) WHERE memo_no IS NOT NULL AND cert_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid, actor_email text,
  action text NOT NULL,
  target_table text, target_id uuid, verification_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_log_admin_read ON public.audit_log;
CREATE POLICY audit_log_admin_read ON public.audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS audit_log_admin_insert ON public.audit_log;
CREATE POLICY audit_log_admin_insert ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.verification_lookups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  verification_id text, memo_no text,
  found boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.verification_lookups TO service_role;
ALTER TABLE public.verification_lookups ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_verification_lookups_recent ON public.verification_lookups(ip_hash, created_at DESC);

CREATE OR REPLACE FUNCTION public.approve_certificate(_kind text, _cert_id uuid, _memo_no text, _issue_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE uid uuid := auth.uid(); email text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (has_role(uid,'admin'::app_role) OR has_role(uid,'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  SELECT u.email INTO email FROM auth.users u WHERE u.id = uid;
  IF lower(_kind) = 'warish' THEN
    UPDATE public.warish_certificates
       SET memo_no=_memo_no, cert_date=_issue_date, issue_date=_issue_date,
           status='Approved', approved_by=uid, approval_timestamp=now(),
           rejected_by=NULL, rejected_reason=NULL, rejection_timestamp=NULL
     WHERE id=_cert_id;
  ELSIF lower(_kind) = 'dependent' THEN
    UPDATE public.dependent_certificates
       SET memo_no=_memo_no, cert_date=_issue_date, issue_date=_issue_date,
           status='Approved', approved_by=uid, approval_timestamp=now(),
           rejected_by=NULL, rejected_reason=NULL, rejection_timestamp=NULL
     WHERE id=_cert_id;
  ELSE RAISE EXCEPTION 'invalid kind %', _kind; END IF;
  INSERT INTO public.audit_log(actor_id, actor_email, action, target_table, target_id, metadata)
    VALUES (uid, email, 'approve',
      CASE lower(_kind) WHEN 'warish' THEN 'warish_certificates' ELSE 'dependent_certificates' END,
      _cert_id, jsonb_build_object('memo_no',_memo_no,'issue_date',_issue_date));
END $$;
REVOKE ALL ON FUNCTION public.approve_certificate(text,uuid,text,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_certificate(text,uuid,text,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_certificate(_kind text, _cert_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE uid uuid := auth.uid(); email text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (has_role(uid,'admin'::app_role) OR has_role(uid,'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  SELECT u.email INTO email FROM auth.users u WHERE u.id = uid;
  IF lower(_kind) = 'warish' THEN
    UPDATE public.warish_certificates
       SET status='Rejected', rejected_by=uid, rejected_reason=NULLIF(_reason,''), rejection_timestamp=now()
     WHERE id=_cert_id;
  ELSIF lower(_kind) = 'dependent' THEN
    UPDATE public.dependent_certificates
       SET status='Rejected', rejected_by=uid, rejected_reason=NULLIF(_reason,''), rejection_timestamp=now()
     WHERE id=_cert_id;
  ELSE RAISE EXCEPTION 'invalid kind %', _kind; END IF;
  INSERT INTO public.audit_log(actor_id, actor_email, action, target_table, target_id, metadata)
    VALUES (uid, email, 'reject',
      CASE lower(_kind) WHEN 'warish' THEN 'warish_certificates' ELSE 'dependent_certificates' END,
      _cert_id, jsonb_build_object('reason',_reason));
END $$;
REVOKE ALL ON FUNCTION public.reject_certificate(text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_certificate(text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.public_verify(_verification_id text, _ip_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE rec_kind text; rec_vid text; rec_memo text; rec_issue date;
        rec_app text; rec_dec text; rec_status text; rec_reason text;
        recent_count int;
BEGIN
  SELECT count(*) INTO recent_count FROM public.verification_lookups
    WHERE ip_hash = _ip_hash AND created_at > now() - interval '10 minutes';
  IF recent_count > 20 THEN RETURN jsonb_build_object('status','rate_limited'); END IF;

  SELECT verification_id, memo_no, issue_date, applicant_name, deceased_name, status, rejected_reason
    INTO rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason
    FROM public.warish_certificates WHERE verification_id = _verification_id LIMIT 1;
  IF FOUND THEN rec_kind := 'Warish Certificate';
  ELSE
    SELECT verification_id, memo_no, issue_date, applicant_name, NULL::text, status, rejected_reason
      INTO rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason
      FROM public.dependent_certificates WHERE verification_id = _verification_id LIMIT 1;
    IF FOUND THEN rec_kind := 'Dependent Certificate'; END IF;
  END IF;

  INSERT INTO public.verification_lookups(ip_hash, verification_id, found)
    VALUES (_ip_hash, _verification_id, rec_kind IS NOT NULL);

  IF rec_kind IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;

  IF rec_status = 'Approved' THEN
    UPDATE public.warish_certificates SET verification_count = verification_count + 1 WHERE verification_id = _verification_id;
    UPDATE public.dependent_certificates SET verification_count = verification_count + 1 WHERE verification_id = _verification_id;
  END IF;

  RETURN jsonb_build_object(
    'status','found', 'kind', rec_kind,
    'verification_id', rec_vid,
    'applicant_name', rec_app,
    'deceased_name', rec_dec,
    'record_status', rec_status,
    'memo_no', CASE WHEN rec_status = 'Approved' THEN rec_memo ELSE NULL END,
    'issue_date', CASE WHEN rec_status = 'Approved' THEN rec_issue ELSE NULL END,
    'rejected_reason', CASE WHEN rec_status = 'Rejected' THEN rec_reason ELSE NULL END
  );
END $$;
REVOKE ALL ON FUNCTION public.public_verify(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_verify(text,text) TO anon, authenticated;
