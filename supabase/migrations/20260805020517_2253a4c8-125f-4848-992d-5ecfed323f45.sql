
-- 1. Columns
ALTER TABLE public.warish_certificates
  ADD COLUMN IF NOT EXISTS contact_mobile text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS return_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'office',
  ADD COLUMN IF NOT EXISTS citizen_user_id uuid,
  ADD COLUMN IF NOT EXISTS public_edit_until timestamptz,
  ADD COLUMN IF NOT EXISTS office_copy_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_application_id uuid;

ALTER TABLE public.dependent_certificates
  ADD COLUMN IF NOT EXISTS contact_mobile text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS return_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'office',
  ADD COLUMN IF NOT EXISTS citizen_user_id uuid,
  ADD COLUMN IF NOT EXISTS public_edit_until timestamptz,
  ADD COLUMN IF NOT EXISTS office_copy_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_application_id uuid;

CREATE INDEX IF NOT EXISTS warish_contact_mobile_idx ON public.warish_certificates (contact_mobile);
CREATE INDEX IF NOT EXISTS dependent_contact_mobile_idx ON public.dependent_certificates (contact_mobile);

-- 2. RLS rework
DROP POLICY IF EXISTS warish_admin_all ON public.warish_certificates;
DROP POLICY IF EXISTS dependent_admin_all ON public.dependent_certificates;
DROP POLICY IF EXISTS warish_deo_update ON public.warish_certificates;
DROP POLICY IF EXISTS dependent_deo_update ON public.dependent_certificates;

CREATE POLICY warish_admin_select ON public.warish_certificates FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY warish_admin_update ON public.warish_certificates FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY dependent_admin_select ON public.dependent_certificates FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY dependent_admin_update ON public.dependent_certificates FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- DEO may only edit their own not-yet-locked applications
CREATE POLICY warish_deo_update ON public.warish_certificates FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'deo') AND created_by = auth.uid() AND status IN ('Draft','Returned'))
  WITH CHECK (has_role(auth.uid(),'deo') AND created_by = auth.uid());
CREATE POLICY dependent_deo_update ON public.dependent_certificates FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'deo') AND created_by = auth.uid() AND status IN ('Draft','Returned'))
  WITH CHECK (has_role(auth.uid(),'deo') AND created_by = auth.uid());

-- Citizens: read own, edit only inside the public window
CREATE POLICY warish_citizen_select ON public.warish_certificates FOR SELECT TO authenticated
  USING (citizen_user_id = auth.uid());
CREATE POLICY warish_citizen_update ON public.warish_certificates FOR UPDATE TO authenticated
  USING (citizen_user_id = auth.uid() AND source = 'public' AND public_edit_until IS NOT NULL AND public_edit_until > now())
  WITH CHECK (citizen_user_id = auth.uid() AND source = 'public');
CREATE POLICY dependent_citizen_select ON public.dependent_certificates FOR SELECT TO authenticated
  USING (citizen_user_id = auth.uid());
CREATE POLICY dependent_citizen_update ON public.dependent_certificates FOR UPDATE TO authenticated
  USING (citizen_user_id = auth.uid() AND source = 'public' AND public_edit_until IS NOT NULL AND public_edit_until > now())
  WITH CHECK (citizen_user_id = auth.uid() AND source = 'public');

-- 3. Submit / resubmit
CREATE OR REPLACE FUNCTION public.submit_application(_kind cert_kind, _cert_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _st text; _owner uuid; _rc int; _table text; _resub boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT has_role(_uid,'deo') THEN RAISE EXCEPTION 'Only a DEO can submit applications'; END IF;
  IF _kind = 'warish' THEN
    SELECT status, created_by, return_count INTO _st,_owner,_rc FROM public.warish_certificates WHERE id=_cert_id;
    _table := 'warish_certificates';
  ELSIF _kind = 'dependent' THEN
    SELECT status, created_by, return_count INTO _st,_owner,_rc FROM public.dependent_certificates WHERE id=_cert_id;
    _table := 'dependent_certificates';
  ELSE RAISE EXCEPTION 'Unsupported kind'; END IF;
  IF _owner IS NULL OR _owner <> _uid THEN RAISE EXCEPTION 'You can only submit your own applications'; END IF;
  IF _st NOT IN ('Draft','Returned') THEN RAISE EXCEPTION 'Only drafts or returned applications can be submitted'; END IF;
  _resub := (_st = 'Returned');

  IF _kind = 'warish' THEN
    UPDATE public.warish_certificates SET status='Pending Signature & Memo Registration',
      submitted_at=now(), rejection_reason=NULL, rejected_at=NULL, rejected_by=NULL,
      verification_status='pending', updated_at=now() WHERE id=_cert_id;
  ELSE
    UPDATE public.dependent_certificates SET status='Pending Signature & Memo Registration',
      submitted_at=now(), rejection_reason=NULL, rejected_at=NULL, rejected_by=NULL,
      verification_status='pending', updated_at=now() WHERE id=_cert_id;
  END IF;

  INSERT INTO public.certificate_audit_logs (cert_kind, cert_table, cert_id, action, actor_user_id, actor_email, metadata)
  VALUES (_kind, _table, _cert_id, 'modified', _uid, (SELECT email FROM auth.users WHERE id=_uid),
          jsonb_build_object('event', CASE WHEN _resub THEN 'resubmitted' ELSE 'submitted' END, 'return_count', _rc));

  RETURN jsonb_build_object('status','Pending Signature & Memo Registration','resubmitted',_resub);
END; $$;

-- 4. Return (distinct from reject), auto-reject on 5th
CREATE OR REPLACE FUNCTION public.return_application(_kind cert_kind, _cert_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _rc int; _table text; _auto boolean := false; _final text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (has_role(_uid,'admin') OR has_role(_uid,'super_admin')) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN RAISE EXCEPTION 'A return remark is required'; END IF;

  IF _kind='warish' THEN
    SELECT return_count INTO _rc FROM public.warish_certificates WHERE id=_cert_id; _table:='warish_certificates';
  ELSIF _kind='dependent' THEN
    SELECT return_count INTO _rc FROM public.dependent_certificates WHERE id=_cert_id; _table:='dependent_certificates';
  ELSE RAISE EXCEPTION 'Unsupported kind'; END IF;
  IF _rc IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;

  _rc := _rc + 1;
  IF _rc >= 5 THEN _auto := true; _final := 'Rejected'; ELSE _final := 'Returned'; END IF;

  IF _kind='warish' THEN
    UPDATE public.warish_certificates SET status=_final, return_count=_rc, last_returned_at=now(),
      rejection_reason = CASE WHEN _auto THEN 'Automatically rejected after 5 returns. Last remark: '||_reason ELSE _reason END,
      rejected_at = CASE WHEN _auto THEN now() ELSE NULL END,
      rejected_by = CASE WHEN _auto THEN _uid ELSE NULL END,
      verification_status = CASE WHEN _auto THEN 'rejected'::verification_status ELSE 'pending'::verification_status END,
      updated_at=now() WHERE id=_cert_id;
  ELSE
    UPDATE public.dependent_certificates SET status=_final, return_count=_rc, last_returned_at=now(),
      rejection_reason = CASE WHEN _auto THEN 'Automatically rejected after 5 returns. Last remark: '||_reason ELSE _reason END,
      rejected_at = CASE WHEN _auto THEN now() ELSE NULL END,
      rejected_by = CASE WHEN _auto THEN _uid ELSE NULL END,
      verification_status = CASE WHEN _auto THEN 'rejected'::verification_status ELSE 'pending'::verification_status END,
      updated_at=now() WHERE id=_cert_id;
  END IF;

  INSERT INTO public.certificate_audit_logs (cert_kind, cert_table, cert_id, action, actor_user_id, actor_email, reason, metadata)
  VALUES (_kind, _table, _cert_id, CASE WHEN _auto THEN 'rejected' ELSE 'modified' END, _uid,
          (SELECT email FROM auth.users WHERE id=_uid), _reason,
          jsonb_build_object('event', CASE WHEN _auto THEN 'auto_rejected' ELSE 'returned' END, 'return_count', _rc));

  RETURN jsonb_build_object('status',_final,'return_count',_rc,'auto_rejected',_auto);
END; $$;

-- 5. Duplicate detection
CREATE OR REPLACE FUNCTION public.find_duplicate_applications(_kind cert_kind, _mobile text, _email text DEFAULT NULL)
RETURNS TABLE(id uuid, kind text, applicant_name text, village text, status text, memo_no text,
              created_at timestamptz, submitted_at timestamptz, return_count integer, source text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (has_role(_uid,'deo') OR has_role(_uid,'admin') OR has_role(_uid,'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _mobile IS NULL OR _mobile !~ '^[0-9]{10}$' THEN RAISE EXCEPTION 'A valid 10-digit mobile number is required'; END IF;

  IF _kind = 'warish' THEN
    RETURN QUERY SELECT w.id,'warish'::text,w.applicant_name,w.village,w.status,w.memo_no,w.created_at,w.submitted_at,w.return_count,w.source
      FROM public.warish_certificates w
      WHERE w.archived_at IS NULL AND (w.contact_mobile = _mobile OR (_email IS NOT NULL AND _email <> '' AND lower(w.contact_email) = lower(_email)))
      ORDER BY w.created_at DESC LIMIT 25;
  ELSE
    RETURN QUERY SELECT d.id,'dependent'::text,d.applicant_name,d.village,d.status,d.memo_no,d.created_at,d.submitted_at,d.return_count,d.source
      FROM public.dependent_certificates d
      WHERE d.archived_at IS NULL AND (d.contact_mobile = _mobile OR (_email IS NOT NULL AND _email <> '' AND lower(d.contact_email) = lower(_email)))
      ORDER BY d.created_at DESC LIMIT 25;
  END IF;
END; $$;

-- 6. Timeline
CREATE OR REPLACE FUNCTION public.application_timeline(_kind cert_kind, _cert_id uuid)
RETURNS TABLE(action text, event text, actor_email text, reason text, created_at timestamptz, metadata jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _owner uuid; _citizen uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _kind='warish' THEN SELECT created_by, citizen_user_id INTO _owner,_citizen FROM public.warish_certificates WHERE id=_cert_id;
  ELSE SELECT created_by, citizen_user_id INTO _owner,_citizen FROM public.dependent_certificates WHERE id=_cert_id; END IF;

  IF NOT (has_role(_uid,'admin') OR has_role(_uid,'super_admin') OR _uid = _owner OR _uid = _citizen) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
    SELECT l.action::text,
           COALESCE(l.metadata->>'event', l.action::text),
           CASE WHEN has_role(_uid,'admin') OR has_role(_uid,'super_admin') OR _uid = _owner THEN l.actor_email ELSE NULL END,
           l.reason, l.created_at, l.metadata
      FROM public.certificate_audit_logs l
     WHERE l.cert_id = _cert_id AND l.cert_kind = _kind
     ORDER BY l.created_at ASC;
END; $$;

-- 7. Public draft window helpers
CREATE OR REPLACE FUNCTION public.open_office_working_copy(_kind cert_kind, _cert_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT has_role(_uid,'deo') THEN RAISE EXCEPTION 'Only a DEO can open an office working copy'; END IF;
  IF _kind='warish' THEN
    UPDATE public.warish_certificates SET office_copy_opened_at = COALESCE(office_copy_opened_at, now()),
      created_by = COALESCE(created_by,_uid), updated_at=now() WHERE id=_cert_id AND source='public';
  ELSE
    UPDATE public.dependent_certificates SET office_copy_opened_at = COALESCE(office_copy_opened_at, now()),
      created_by = COALESCE(created_by,_uid), updated_at=now() WHERE id=_cert_id AND source='public';
  END IF;
END; $$;

-- 8. Privileges: authenticated only, callers re-check role internally
REVOKE ALL ON FUNCTION public.submit_application(cert_kind, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.return_application(cert_kind, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_duplicate_applications(cert_kind, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.application_timeline(cert_kind, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.open_office_working_copy(cert_kind, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_application(cert_kind, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.return_application(cert_kind, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_duplicate_applications(cert_kind, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.application_timeline(cert_kind, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.open_office_working_copy(cert_kind, uuid) TO authenticated, service_role;
