CREATE OR REPLACE FUNCTION public.find_citizen_duplicates(
  _kind public.cert_kind,
  _mobile text,
  _email text DEFAULT NULL
)
RETURNS TABLE(id uuid, kind text, applicant_name text, village text, status text, memo_no text, created_at timestamptz, source text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
  _registered_mobile text;
  _registered_email text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _kind NOT IN ('warish'::public.cert_kind, 'dependent'::public.cert_kind) THEN
    RAISE EXCEPTION 'Unsupported application type';
  END IF;
  IF _mobile IS NULL OR _mobile !~ '^[0-9]{10}$' THEN
    RAISE EXCEPTION 'A valid 10-digit mobile number is required';
  END IF;

  SELECT mobile, email INTO _registered_mobile, _registered_email
  FROM public.citizen_profiles WHERE user_id = _uid;

  IF _registered_mobile IS DISTINCT FROM _mobile AND
     (NULLIF(lower(trim(_email)), '') IS NULL OR _registered_email IS DISTINCT FROM lower(trim(_email))) THEN
    RAISE EXCEPTION 'The contact details must match your registered account';
  END IF;

  IF _kind = 'warish'::public.cert_kind THEN
    RETURN QUERY
      SELECT w.id, 'warish'::text, w.applicant_name, w.village, w.status, w.memo_no, w.created_at, w.source
      FROM public.warish_certificates w
      WHERE w.citizen_user_id = _uid
        AND w.archived_at IS NULL
        AND (w.contact_mobile = _mobile OR (NULLIF(trim(_email), '') IS NOT NULL AND lower(w.contact_email) = lower(trim(_email))))
      ORDER BY w.created_at DESC;
  ELSE
    RETURN QUERY
      SELECT d.id, 'dependent'::text, d.applicant_name, d.village, d.status, d.memo_no, d.created_at, d.source
      FROM public.dependent_certificates d
      WHERE d.citizen_user_id = _uid
        AND d.archived_at IS NULL
        AND (d.contact_mobile = _mobile OR (NULLIF(trim(_email), '') IS NOT NULL AND lower(d.contact_email) = lower(trim(_email))))
      ORDER BY d.created_at DESC;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.find_citizen_duplicates(public.cert_kind, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_citizen_duplicates(public.cert_kind, text, text) TO authenticated;