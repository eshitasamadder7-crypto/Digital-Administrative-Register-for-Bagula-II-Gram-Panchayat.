CREATE OR REPLACE FUNCTION public.create_citizen_draft(
  _kind public.cert_kind,
  _data jsonb,
  _applicant_name text DEFAULT '',
  _deceased_name text DEFAULT '',
  _village text DEFAULT NULL,
  _contact_mobile text DEFAULT NULL,
  _contact_email text DEFAULT NULL,
  _parent_application_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _existing uuid;
  _mobile text := NULLIF(trim(_contact_mobile), '');
  _email text := NULLIF(lower(trim(_contact_email)), '');
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _kind NOT IN ('warish'::public.cert_kind, 'dependent'::public.cert_kind) THEN
    RAISE EXCEPTION 'Unsupported application type';
  END IF;
  IF _mobile IS NULL OR _mobile !~ '^[0-9]{10}$' THEN
    RAISE EXCEPTION 'A valid 10-digit mobile number is required';
  END IF;

  SELECT id INTO _existing
  FROM public.citizen_profiles
  WHERE user_id = _uid AND mobile = _mobile;
  IF _existing IS NULL THEN
    RAISE EXCEPTION 'The application mobile number must match your registered mobile number';
  END IF;

  IF _kind = 'warish'::public.cert_kind THEN
    INSERT INTO public.warish_certificates (
      deceased_name, applicant_name, village, data, created_by,
      contact_mobile, contact_email, source, citizen_user_id, public_edit_until,
      parent_application_id, status
    ) VALUES (
      COALESCE(_deceased_name, ''), COALESCE(_applicant_name, ''), _village, COALESCE(_data, '{}'::jsonb),
      _uid, _mobile, _email, 'public', _uid, now() + interval '3 days',
      _parent_application_id, 'Draft'
    ) RETURNING id INTO _id;
  ELSE
    INSERT INTO public.dependent_certificates (
      applicant_name, village, department, data, created_by,
      contact_mobile, contact_email, source, citizen_user_id, public_edit_until,
      parent_application_id, status
    ) VALUES (
      COALESCE(_applicant_name, ''), _village, NULL, COALESCE(_data, '{}'::jsonb),
      _uid, _mobile, _email, 'public', _uid, now() + interval '3 days',
      _parent_application_id, 'Draft'
    ) RETURNING id INTO _id;
  END IF;

  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_citizen_draft(
  _kind public.cert_kind,
  _cert_id uuid,
  _data jsonb,
  _applicant_name text DEFAULT '',
  _deceased_name text DEFAULT '',
  _village text DEFAULT NULL,
  _contact_mobile text DEFAULT NULL,
  _contact_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
  _status text;
  _owner uuid;
  _source text;
  _edit_until timestamptz;
  _mobile text := NULLIF(trim(_contact_mobile), '');
  _email text := NULLIF(lower(trim(_contact_email)), '');
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _mobile IS NULL OR _mobile !~ '^[0-9]{10}$' THEN
    RAISE EXCEPTION 'A valid 10-digit mobile number is required';
  END IF;

  IF _kind = 'warish'::public.cert_kind THEN
    SELECT status, citizen_user_id, source, public_edit_until
      INTO _status, _owner, _source, _edit_until
    FROM public.warish_certificates WHERE id = _cert_id;
  ELSIF _kind = 'dependent'::public.cert_kind THEN
    SELECT status, citizen_user_id, source, public_edit_until
      INTO _status, _owner, _source, _edit_until
    FROM public.dependent_certificates WHERE id = _cert_id;
  ELSE
    RAISE EXCEPTION 'Unsupported application type';
  END IF;

  IF _owner IS DISTINCT FROM _uid OR _source IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'You can only edit your own citizen application';
  END IF;
  IF _edit_until IS NULL OR _edit_until <= now() THEN
    RAISE EXCEPTION 'The three-day editing window has closed';
  END IF;
  IF _status NOT IN ('Draft', 'Returned') THEN
    RAISE EXCEPTION 'This application can no longer be edited';
  END IF;

  IF _kind = 'warish'::public.cert_kind THEN
    UPDATE public.warish_certificates
    SET applicant_name = COALESCE(_applicant_name, ''), deceased_name = COALESCE(_deceased_name, ''),
        village = _village, contact_mobile = _mobile, contact_email = _email, data = COALESCE(_data, '{}'::jsonb)
    WHERE id = _cert_id;
  ELSE
    UPDATE public.dependent_certificates
    SET applicant_name = COALESCE(_applicant_name, ''), village = _village,
        contact_mobile = _mobile, contact_email = _email, data = COALESCE(_data, '{}'::jsonb)
    WHERE id = _cert_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_citizen_application(
  _kind public.cert_kind,
  _cert_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
  _status text;
  _owner uuid;
  _source text;
  _edit_until timestamptz;
  _table text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF _kind = 'warish'::public.cert_kind THEN
    SELECT status, citizen_user_id, source, public_edit_until INTO _status, _owner, _source, _edit_until
    FROM public.warish_certificates WHERE id = _cert_id;
    _table := 'warish_certificates';
  ELSIF _kind = 'dependent'::public.cert_kind THEN
    SELECT status, citizen_user_id, source, public_edit_until INTO _status, _owner, _source, _edit_until
    FROM public.dependent_certificates WHERE id = _cert_id;
    _table := 'dependent_certificates';
  ELSE
    RAISE EXCEPTION 'Unsupported application type';
  END IF;

  IF _owner IS DISTINCT FROM _uid OR _source IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'You can only submit your own citizen application';
  END IF;
  IF _status NOT IN ('Draft', 'Returned') THEN
    RAISE EXCEPTION 'Only drafts or returned applications can be submitted';
  END IF;
  IF _status = 'Draft' AND (_edit_until IS NULL OR _edit_until <= now()) THEN
    RAISE EXCEPTION 'The three-day editing window has closed';
  END IF;

  IF _kind = 'warish'::public.cert_kind THEN
    UPDATE public.warish_certificates
    SET status = 'Pending Signature & Memo Registration', submitted_at = now(),
        rejection_reason = NULL, rejected_at = NULL, rejected_by = NULL,
        verification_status = 'pending'::public.verification_status, updated_at = now()
    WHERE id = _cert_id;
  ELSE
    UPDATE public.dependent_certificates
    SET status = 'Pending Signature & Memo Registration', submitted_at = now(),
        rejection_reason = NULL, rejected_at = NULL, rejected_by = NULL,
        verification_status = 'pending'::public.verification_status, updated_at = now()
    WHERE id = _cert_id;
  END IF;

  INSERT INTO public.certificate_audit_logs
    (cert_kind, cert_table, cert_id, action, actor_user_id, actor_email, metadata)
  VALUES
    (_kind, _table, _cert_id, 'modified', _uid,
     (SELECT email FROM auth.users WHERE id = _uid),
     jsonb_build_object('event', CASE WHEN _status = 'Returned' THEN 'resubmitted' ELSE 'submitted' END, 'source', 'public'));

  RETURN jsonb_build_object('status', 'Pending Signature & Memo Registration', 'resubmitted', _status = 'Returned');
END;
$$;

CREATE OR REPLACE FUNCTION public.job_close_expired_drafts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.warish_certificates
  SET status = 'Draft Expired', updated_at = now()
  WHERE source = 'public' AND status = 'Draft' AND public_edit_until IS NOT NULL AND public_edit_until <= now();

  UPDATE public.dependent_certificates
  SET status = 'Draft Expired', updated_at = now()
  WHERE source = 'public' AND status = 'Draft' AND public_edit_until IS NOT NULL AND public_edit_until <= now();
END;
$$;

REVOKE ALL ON FUNCTION public.create_citizen_draft(public.cert_kind, jsonb, text, text, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_citizen_draft(public.cert_kind, jsonb, text, text, text, text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.save_citizen_draft(public.cert_kind, uuid, jsonb, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_citizen_draft(public.cert_kind, uuid, jsonb, text, text, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_citizen_application(public.cert_kind, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_citizen_application(public.cert_kind, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.job_close_expired_drafts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.job_close_expired_drafts() TO service_role;

DROP POLICY IF EXISTS warish_citizen_insert ON public.warish_certificates;
DROP POLICY IF EXISTS dependent_citizen_insert ON public.dependent_certificates;
REVOKE INSERT, UPDATE ON public.warish_certificates FROM authenticated;
REVOKE INSERT, UPDATE ON public.dependent_certificates FROM authenticated;