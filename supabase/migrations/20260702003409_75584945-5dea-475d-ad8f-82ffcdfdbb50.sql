
-- Move approve/reject/verify SECURITY DEFINER logic to app_private, expose INVOKER wrappers in public

CREATE OR REPLACE FUNCTION app_private.approve_certificate(_kind text, _cert_id uuid, _memo_no text, _issue_date date)
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
REVOKE ALL ON FUNCTION app_private.approve_certificate(text,uuid,text,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.approve_certificate(text,uuid,text,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_certificate(_kind text, _cert_id uuid, _memo_no text, _issue_date date)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public, app_private AS $$
  SELECT app_private.approve_certificate(_kind, _cert_id, _memo_no, _issue_date);
$$;
REVOKE ALL ON FUNCTION public.approve_certificate(text,uuid,text,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_certificate(text,uuid,text,date) TO authenticated;

CREATE OR REPLACE FUNCTION app_private.reject_certificate(_kind text, _cert_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE uid uuid := auth.uid(); email text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (has_role(uid,'admin'::app_role) OR has_role(uid,'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  SELECT u.email INTO email FROM auth.users u WHERE u.id = uid;
  IF lower(_kind) = 'warish' THEN
    UPDATE public.warish_certificates SET status='Rejected', rejected_by=uid,
       rejected_reason=NULLIF(_reason,''), rejection_timestamp=now() WHERE id=_cert_id;
  ELSIF lower(_kind) = 'dependent' THEN
    UPDATE public.dependent_certificates SET status='Rejected', rejected_by=uid,
       rejected_reason=NULLIF(_reason,''), rejection_timestamp=now() WHERE id=_cert_id;
  ELSE RAISE EXCEPTION 'invalid kind %', _kind; END IF;
  INSERT INTO public.audit_log(actor_id, actor_email, action, target_table, target_id, metadata)
    VALUES (uid, email, 'reject',
      CASE lower(_kind) WHEN 'warish' THEN 'warish_certificates' ELSE 'dependent_certificates' END,
      _cert_id, jsonb_build_object('reason',_reason));
END $$;
REVOKE ALL ON FUNCTION app_private.reject_certificate(text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.reject_certificate(text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_certificate(_kind text, _cert_id uuid, _reason text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public, app_private AS $$
  SELECT app_private.reject_certificate(_kind, _cert_id, _reason);
$$;
REVOKE ALL ON FUNCTION public.reject_certificate(text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_certificate(text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION app_private.public_verify(_verification_id text, _ip_hash text)
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
REVOKE ALL ON FUNCTION app_private.public_verify(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.public_verify(text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_verify(_verification_id text, _ip_hash text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public, app_private AS $$
  SELECT app_private.public_verify(_verification_id, _ip_hash);
$$;
REVOKE ALL ON FUNCTION public.public_verify(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_verify(text,text) TO anon, authenticated;

-- verification_lookups needs a policy (RLS enabled but no policy) — deny all via no-op policy
DROP POLICY IF EXISTS verification_lookups_no_access ON public.verification_lookups;
CREATE POLICY verification_lookups_no_access ON public.verification_lookups FOR SELECT TO authenticated USING (false);
