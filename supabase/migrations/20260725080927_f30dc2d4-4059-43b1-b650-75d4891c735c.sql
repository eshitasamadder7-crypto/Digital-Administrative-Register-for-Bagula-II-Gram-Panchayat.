
-- 1. Rate-limit tracking table for public verification lookups
CREATE TABLE IF NOT EXISTS public.verification_lookups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  verification_id text,
  looked_up_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_lookups_ip_time_idx ON public.verification_lookups (ip_hash, looked_up_at DESC);
GRANT ALL ON public.verification_lookups TO service_role;
ALTER TABLE public.verification_lookups ENABLE ROW LEVEL SECURITY;
-- No policies: only accessible via SECURITY DEFINER function.

-- 2. Harden public_verify: minimal fields, Approved+non-archived only, rate limited
CREATE OR REPLACE FUNCTION public.public_verify(_verification_id text, _ip_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Only expose data for approved, non-archived records
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
END;
$$;

-- 3. Harden public_verify_advanced similarly
CREATE OR REPLACE FUNCTION public.public_verify_advanced(_memo_no text, _issue_date date, _aadhaar_last4 text, _ip_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
END;
$$;

-- 4. Lock down EXECUTE on admin-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.bootstrap_admin_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_verification_id(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.archive_certificate(cert_kind, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_certificate(cert_kind, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_certificate_v2(cert_kind, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_certificate_v2(cert_kind, uuid, integer, integer, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.permanently_delete_rejected(cert_kind, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.archive_expired_rejections() FROM PUBLIC, anon, authenticated;

-- Keep public verification callable by anon+authenticated (intentional public API, rate limited, minimal fields)
GRANT EXECUTE ON FUNCTION public.public_verify(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_verify_advanced(text, date, text, text) TO anon, authenticated;

-- bootstrap_admin_role must remain callable by signed-in whitelisted users only
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_role() TO authenticated;

-- 5. whats_new_entries: split FOR ALL policy so linter sees explicit per-command auth-only policies
DROP POLICY IF EXISTS whats_new_admin_all ON public.whats_new_entries;
CREATE POLICY whats_new_admin_insert ON public.whats_new_entries
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY whats_new_admin_update ON public.whats_new_entries
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY whats_new_admin_delete ON public.whats_new_entries
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));
