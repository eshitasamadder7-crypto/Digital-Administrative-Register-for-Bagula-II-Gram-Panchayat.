-- Migration: 20270916020000_fix_draft_permissions_and_rpc.sql
-- Description: Grant table INSERT privileges to authenticated role on certificate tables,
-- relax mobile constraints for initial drafts, and provide resilient SECURITY DEFINER draft RPCs.

-- 1. Table-level DCL grants for authenticated users
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.warish_certificates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependent_certificates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkage_certificates TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 2. Resilient unified draft creation RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_certificate_draft(
  _kind public.cert_kind,
  _data jsonb DEFAULT '{}'::jsonb,
  _applicant_name text DEFAULT '',
  _deceased_name text DEFAULT '',
  _village text DEFAULT NULL,
  _department text DEFAULT NULL,
  _contact_mobile text DEFAULT NULL,
  _contact_email text DEFAULT NULL,
  _parent_application_id uuid DEFAULT NULL,
  _citizen boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _is_staff boolean := false;
  _mobile text := NULLIF(trim(_contact_mobile), '');
  _email text := NULLIF(lower(trim(_contact_email)), '');
  _v_id text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _kind NOT IN ('warish'::public.cert_kind, 'dependent'::public.cert_kind, 'linkage'::public.cert_kind) THEN
    RAISE EXCEPTION 'Unsupported application type: %', _kind;
  END IF;

  -- Check if caller has staff role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role IN ('super_admin', 'admin', 'deo')
  ) INTO _is_staff;

  -- Generate unique verification ID
  _v_id := UPPER(SUBSTRING(_kind::text, 1, 3)) || '-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::text, 6, '0');

  IF _kind = 'warish'::public.cert_kind THEN
    INSERT INTO public.warish_certificates (
      verification_id, deceased_name, applicant_name, village, data, created_by,
      contact_mobile, contact_email, source, citizen_user_id, public_edit_until,
      parent_application_id, status
    ) VALUES (
      _v_id, COALESCE(_deceased_name, ''), COALESCE(_applicant_name, ''), _village, COALESCE(_data, '{}'::jsonb),
      _uid, _mobile, _email,
      CASE WHEN _citizen THEN 'public' ELSE 'deo' END,
      CASE WHEN _citizen THEN _uid ELSE NULL END,
      CASE WHEN _citizen THEN now() + interval '3 days' ELSE NULL END,
      _parent_application_id, 'Draft'
    ) RETURNING id INTO _id;

  ELSIF _kind = 'dependent'::public.cert_kind THEN
    INSERT INTO public.dependent_certificates (
      verification_id, applicant_name, village, department, data, created_by,
      contact_mobile, contact_email, source, citizen_user_id, public_edit_until,
      parent_application_id, status
    ) VALUES (
      _v_id, COALESCE(_applicant_name, ''), _village, _department, COALESCE(_data, '{}'::jsonb),
      _uid, _mobile, _email,
      CASE WHEN _citizen THEN 'public' ELSE 'deo' END,
      CASE WHEN _citizen THEN _uid ELSE NULL END,
      CASE WHEN _citizen THEN now() + interval '3 days' ELSE NULL END,
      _parent_application_id, 'Draft'
    ) RETURNING id INTO _id;

  ELSIF _kind = 'linkage'::public.cert_kind THEN
    INSERT INTO public.linkage_certificates (
      applicant_name, village, data, created_by,
      contact_mobile, contact_email, source, citizen_user_id, public_edit_until,
      status, document_mode
    ) VALUES (
      COALESCE(_applicant_name, ''), COALESCE(_village, 'Bagula'), COALESCE(_data, '{}'::jsonb),
      _uid, _mobile, _email,
      CASE WHEN _citizen THEN 'public' ELSE 'deo' END,
      CASE WHEN _citizen THEN _uid ELSE NULL END,
      CASE WHEN _citizen THEN now() + interval '3 days' ELSE NULL END,
      'Draft', 'DOCUMENT_ENGINE'
    ) RETURNING id INTO _id;
  END IF;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_certificate_draft(public.cert_kind, jsonb, text, text, text, text, text, text, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_certificate_draft(public.cert_kind, jsonb, text, text, text, text, text, text, uuid, boolean) TO authenticated;

-- 3. Update existing create_citizen_draft to be resilient for new drafts (relax strict pre-mobile check)
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
  _mobile text := NULLIF(trim(_contact_mobile), '');
  _email text := NULLIF(lower(trim(_contact_email)), '');
  _v_id text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _kind NOT IN ('warish'::public.cert_kind, 'dependent'::public.cert_kind, 'linkage'::public.cert_kind) THEN
    RAISE EXCEPTION 'Unsupported application type: %', _kind;
  END IF;

  -- Generate verification ID
  _v_id := UPPER(SUBSTRING(_kind::text, 1, 3)) || '-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::text, 6, '0');

  IF _kind = 'warish'::public.cert_kind THEN
    INSERT INTO public.warish_certificates (
      verification_id, deceased_name, applicant_name, village, data, created_by,
      contact_mobile, contact_email, source, citizen_user_id, public_edit_until,
      parent_application_id, status
    ) VALUES (
      _v_id, COALESCE(_deceased_name, ''), COALESCE(_applicant_name, ''), _village, COALESCE(_data, '{}'::jsonb),
      _uid, _mobile, _email, 'public', _uid, now() + interval '3 days',
      _parent_application_id, 'Draft'
    ) RETURNING id INTO _id;

  ELSIF _kind = 'dependent'::public.cert_kind THEN
    INSERT INTO public.dependent_certificates (
      verification_id, applicant_name, village, department, data, created_by,
      contact_mobile, contact_email, source, citizen_user_id, public_edit_until,
      parent_application_id, status
    ) VALUES (
      _v_id, COALESCE(_applicant_name, ''), _village, NULL, COALESCE(_data, '{}'::jsonb),
      _uid, _mobile, _email, 'public', _uid, now() + interval '3 days',
      _parent_application_id, 'Draft'
    ) RETURNING id INTO _id;

  ELSIF _kind = 'linkage'::public.cert_kind THEN
    INSERT INTO public.linkage_certificates (
      applicant_name, village, data, created_by,
      contact_mobile, contact_email, source, citizen_user_id, public_edit_until,
      status, document_mode
    ) VALUES (
      COALESCE(_applicant_name, ''), COALESCE(_village, 'Bagula'), COALESCE(_data, '{}'::jsonb),
      _uid, _mobile, _email, 'public', _uid, now() + interval '3 days',
      'Draft', 'DOCUMENT_ENGINE'
    ) RETURNING id INTO _id;
  END IF;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_citizen_draft(public.cert_kind, jsonb, text, text, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_citizen_draft(public.cert_kind, jsonb, text, text, text, text, text, uuid) TO authenticated;

-- 4. Update save_citizen_draft so drafts can be auto-saved while filling in details
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

  IF _kind = 'warish'::public.cert_kind THEN
    SELECT status, citizen_user_id, source, public_edit_until
      INTO _status, _owner, _source, _edit_until
    FROM public.warish_certificates WHERE id = _cert_id;
  ELSIF _kind = 'dependent'::public.cert_kind THEN
    SELECT status, citizen_user_id, source, public_edit_until
      INTO _status, _owner, _source, _edit_until
    FROM public.dependent_certificates WHERE id = _cert_id;
  ELSIF _kind = 'linkage'::public.cert_kind THEN
    SELECT status, citizen_user_id, source, public_edit_until
      INTO _status, _owner, _source, _edit_until
    FROM public.linkage_certificates WHERE id = _cert_id;
  ELSE
    RAISE EXCEPTION 'Unsupported application type: %', _kind;
  END IF;

  IF _owner IS DISTINCT FROM _uid AND _source IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'You can only edit your own citizen application';
  END IF;
  IF _edit_until IS NOT NULL AND _edit_until <= now() THEN
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
  ELSIF _kind = 'dependent'::public.cert_kind THEN
    UPDATE public.dependent_certificates
    SET applicant_name = COALESCE(_applicant_name, ''), village = _village,
        contact_mobile = _mobile, contact_email = _email, data = COALESCE(_data, '{}'::jsonb)
    WHERE id = _cert_id;
  ELSIF _kind = 'linkage'::public.cert_kind THEN
    UPDATE public.linkage_certificates
    SET applicant_name = COALESCE(_applicant_name, ''), village = COALESCE(_village, 'Bagula'),
        contact_mobile = _mobile, contact_email = _email, data = COALESCE(_data, '{}'::jsonb)
    WHERE id = _cert_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.save_citizen_draft(public.cert_kind, uuid, jsonb, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_citizen_draft(public.cert_kind, uuid, jsonb, text, text, text, text, text) TO authenticated;
