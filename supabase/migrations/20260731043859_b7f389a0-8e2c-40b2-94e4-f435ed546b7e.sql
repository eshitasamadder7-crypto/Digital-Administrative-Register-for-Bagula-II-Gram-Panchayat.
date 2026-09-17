-- 1) Owner-scope the DEO role on certificate tables
DROP POLICY IF EXISTS warish_admin_all ON public.warish_certificates;
DROP POLICY IF EXISTS dependent_admin_all ON public.dependent_certificates;

CREATE POLICY warish_admin_all ON public.warish_certificates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY warish_deo_select ON public.warish_certificates
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'deo') AND created_by = auth.uid());

CREATE POLICY warish_deo_insert ON public.warish_certificates
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'deo') AND created_by = auth.uid());

CREATE POLICY warish_deo_update ON public.warish_certificates
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'deo') AND created_by = auth.uid())
  WITH CHECK (has_role(auth.uid(),'deo') AND created_by = auth.uid());

CREATE POLICY dependent_admin_all ON public.dependent_certificates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY dependent_deo_select ON public.dependent_certificates
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'deo') AND created_by = auth.uid());

CREATE POLICY dependent_deo_insert ON public.dependent_certificates
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'deo') AND created_by = auth.uid());

CREATE POLICY dependent_deo_update ON public.dependent_certificates
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'deo') AND created_by = auth.uid())
  WITH CHECK (has_role(auth.uid(),'deo') AND created_by = auth.uid());

REVOKE DELETE ON public.warish_certificates FROM authenticated;
REVOKE DELETE ON public.dependent_certificates FROM authenticated;

-- 2) verification_lookups: explicit default-deny, service role only
REVOKE ALL ON public.verification_lookups FROM anon, authenticated;
GRANT ALL ON public.verification_lookups TO service_role;
DROP POLICY IF EXISTS verification_lookups_no_access ON public.verification_lookups;
CREATE POLICY verification_lookups_no_access ON public.verification_lookups
  FOR SELECT TO authenticated USING (false);

-- 3) Enforce Aadhaar last-4 in the advanced public verification
CREATE OR REPLACE FUNCTION public.public_verify_advanced(_memo_no text, _issue_date date, _aadhaar_last4 text, _ip_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _recent int;
  _row record;
BEGIN
  IF _ip_hash IS NULL OR length(_ip_hash) < 8 THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;

  IF _aadhaar_last4 IS NULL OR _aadhaar_last4 !~ '^[0-9]{4}$' THEN
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
     AND (w.data->>'applicantAadhaarLast4') = _aadhaar_last4
   LIMIT 1;

  IF _row IS NULL THEN
    SELECT 'dependent'::text AS kind, d.verification_id, d.memo_no, d.issue_date, d.status,
           d.archived_at, NULL::text AS applicant_name, NULL::text AS deceased_name, d.data
      INTO _row
      FROM public.dependent_certificates d
     WHERE d.memo_no = _memo_no AND d.issue_date = _issue_date AND d.status = 'Approved' AND d.archived_at IS NULL
       AND (d.data->>'applicantAadhaarLast4') = _aadhaar_last4
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
END; $function$;

-- 4) Scrub any full Aadhaar digits already stored on dependent records
UPDATE public.dependent_certificates d
SET data = jsonb_set(
      d.data,
      '{dependents}',
      (
        SELECT COALESCE(jsonb_agg(
          (dep - 'aadhaar') ||
          jsonb_build_object('aadhaarLast4',
            CASE WHEN dep->>'aadhaar' IS NULL OR dep->>'aadhaar' = '' THEN NULL
                 ELSE right(dep->>'aadhaar', 4) END)
        ), '[]'::jsonb)
        FROM jsonb_array_elements(d.data->'dependents') dep
      )
    )
WHERE jsonb_typeof(d.data->'dependents') = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(d.data->'dependents') dep
    WHERE dep ? 'aadhaar'
  );

-- 5) Lock down SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_verification_id(text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.bootstrap_admin_role() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.approve_certificate_v2(cert_kind, uuid, integer, integer, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_certificate_v2(cert_kind, uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.restore_certificate(cert_kind, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.permanently_delete_rejected(cert_kind, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.archive_certificate(cert_kind, uuid, text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.archive_expired_rejections() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_verification_id(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_certificate_v2(cert_kind, uuid, integer, integer, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_certificate_v2(cert_kind, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_certificate(cert_kind, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.permanently_delete_rejected(cert_kind, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_certificate(cert_kind, uuid, text, text, text) TO authenticated;

-- Intentionally public verification endpoints
GRANT EXECUTE ON FUNCTION public.public_verify(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_verify_advanced(text, date, text, text) TO anon, authenticated;