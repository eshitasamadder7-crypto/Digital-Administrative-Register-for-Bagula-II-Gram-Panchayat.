CREATE OR REPLACE FUNCTION app_private.unified_find_duplicates(
  _mobile text DEFAULT NULL,
  _email text DEFAULT NULL,
  _identity_id text DEFAULT NULL,
  _person_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, app_private
AS $$
DECLARE
  v_results jsonb := '[]'::jsonb;
  v_rec record;
  v_score int;
  v_match_type text;
  v_uid uuid := auth.uid();
  v_is_office boolean;
  h jsonb;
  sh jsonb;
  d jsonb;
  nested_match boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_is_office := public.has_role(v_uid, 'deo')
    OR public.has_role(v_uid, 'admin')
    OR public.has_role(v_uid, 'super_admin')
    OR public.has_role(v_uid, 'monitoring_authority');

  IF (_mobile IS NULL OR _mobile = '')
     AND (_email IS NULL OR _email = '')
     AND (_identity_id IS NULL OR _identity_id = '')
     AND (_person_name IS NULL OR _person_name = '') THEN
    RETURN v_results;
  END IF;

  FOR v_rec IN
    SELECT id, 'warish'::text AS kind, applicant_name, deceased_name, village, status, memo_no, created_at,
           contact_mobile, contact_email, data->>'applicantAadhaar' AS app_aadhaar,
           data->>'applicantEpic' AS app_epic, data->>'deceasedAadhaar' AS dec_aadhaar,
           data->'heirs' AS heirs
      FROM public.warish_certificates
     WHERE archived_at IS NULL
       AND (v_is_office OR citizen_user_id = v_uid)
       AND (NOT v_is_office OR NOT public.has_role(v_uid, 'deo')
            OR public.has_role(v_uid, 'admin')
            OR public.has_role(v_uid, 'super_admin')
            OR public.has_service_scope(v_uid, 'warish'))
  LOOP
    v_score := 0;
    nested_match := false;

    IF _mobile IS NOT NULL AND _mobile <> '' AND v_rec.contact_mobile = _mobile THEN v_score := v_score + 10; END IF;
    IF _email IS NOT NULL AND _email <> '' AND lower(v_rec.contact_email) = lower(_email) THEN v_score := v_score + 10; END IF;
    IF _identity_id IS NOT NULL AND _identity_id <> ''
       AND (v_rec.app_aadhaar = _identity_id OR v_rec.app_epic = _identity_id OR v_rec.dec_aadhaar = _identity_id) THEN
      v_score := v_score + 10;
    END IF;

    IF _identity_id IS NOT NULL AND _identity_id <> '' AND v_rec.heirs IS NOT NULL AND jsonb_typeof(v_rec.heirs) = 'array' THEN
      FOR h IN SELECT * FROM jsonb_array_elements(v_rec.heirs) LOOP
        IF h->>'aadhaar' = _identity_id OR h->>'epic' = _identity_id THEN v_score := v_score + 10; END IF;
        IF h ? 'subHeirs' AND jsonb_typeof(h->'subHeirs') = 'array' THEN
          FOR sh IN SELECT * FROM jsonb_array_elements(h->'subHeirs') LOOP
            IF sh->>'aadhaar' = _identity_id OR sh->>'epic' = _identity_id THEN v_score := v_score + 10; END IF;
          END LOOP;
        END IF;
      END LOOP;
    END IF;

    IF _person_name IS NOT NULL AND _person_name <> '' THEN
      IF lower(v_rec.applicant_name) = lower(trim(_person_name)) OR lower(v_rec.deceased_name) = lower(trim(_person_name)) THEN v_score := v_score + 3; END IF;
      IF v_rec.heirs IS NOT NULL AND jsonb_typeof(v_rec.heirs) = 'array' THEN
        FOR h IN SELECT * FROM jsonb_array_elements(v_rec.heirs) LOOP
          IF lower(h->>'name') = lower(trim(_person_name)) THEN nested_match := true; END IF;
          IF h ? 'subHeirs' AND jsonb_typeof(h->'subHeirs') = 'array' THEN
            FOR sh IN SELECT * FROM jsonb_array_elements(h->'subHeirs') LOOP
              IF lower(sh->>'name') = lower(trim(_person_name)) THEN nested_match := true; END IF;
            END LOOP;
          END IF;
        END LOOP;
      END IF;
      IF nested_match THEN v_score := v_score + 3; END IF;
    END IF;

    IF v_score > 0 THEN
      v_match_type := CASE WHEN v_score >= 10 THEN 'DEFINITIVE DUPLICATE' ELSE 'POSSIBLE MATCH' END;
      v_results := v_results || jsonb_build_object(
        'id', v_rec.id, 'kind', v_rec.kind, 'match_strength', v_match_type,
        'applicant_name', v_rec.applicant_name, 'person_name', v_rec.deceased_name,
        'village', v_rec.village, 'status', v_rec.status, 'memo_no', v_rec.memo_no,
        'created_at', v_rec.created_at,
        'contact_mobile', CASE WHEN v_is_office THEN v_rec.contact_mobile ELSE NULL END,
        'contact_email', CASE WHEN v_is_office THEN v_rec.contact_email ELSE NULL END
      );
    END IF;
  END LOOP;

  FOR v_rec IN
    SELECT id, 'dependent'::text AS kind, applicant_name, data->>'appName' AS employee_name,
           village, status, memo_no, created_at, contact_mobile, contact_email,
           data->>'applicantAadhaar' AS app_aadhaar, data->>'applicantEpic' AS app_epic,
           data->'dependents' AS dependents
      FROM public.dependent_certificates
     WHERE archived_at IS NULL
       AND (v_is_office OR citizen_user_id = v_uid)
       AND (NOT v_is_office OR NOT public.has_role(v_uid, 'deo')
            OR public.has_role(v_uid, 'admin')
            OR public.has_role(v_uid, 'super_admin')
            OR public.has_service_scope(v_uid, 'dependent'))
  LOOP
    v_score := 0;
    nested_match := false;

    IF _mobile IS NOT NULL AND _mobile <> '' AND v_rec.contact_mobile = _mobile THEN v_score := v_score + 10; END IF;
    IF _email IS NOT NULL AND _email <> '' AND lower(v_rec.contact_email) = lower(_email) THEN v_score := v_score + 10; END IF;
    IF _identity_id IS NOT NULL AND _identity_id <> ''
       AND (v_rec.app_aadhaar = _identity_id OR v_rec.app_epic = _identity_id) THEN v_score := v_score + 10; END IF;

    IF _person_name IS NOT NULL AND _person_name <> '' THEN
      IF lower(v_rec.applicant_name) = lower(trim(_person_name)) OR lower(v_rec.employee_name) = lower(trim(_person_name)) THEN v_score := v_score + 3; END IF;
      IF v_rec.dependents IS NOT NULL AND jsonb_typeof(v_rec.dependents) = 'array' THEN
        FOR d IN SELECT * FROM jsonb_array_elements(v_rec.dependents) LOOP
          IF lower(d->>'name') = lower(trim(_person_name)) THEN nested_match := true; END IF;
        END LOOP;
      END IF;
      IF nested_match THEN v_score := v_score + 3; END IF;
    END IF;

    IF v_score > 0 THEN
      v_match_type := CASE WHEN v_score >= 10 THEN 'DEFINITIVE DUPLICATE' ELSE 'POSSIBLE MATCH' END;
      v_results := v_results || jsonb_build_object(
        'id', v_rec.id, 'kind', v_rec.kind, 'match_strength', v_match_type,
        'applicant_name', v_rec.applicant_name, 'person_name', v_rec.employee_name,
        'village', v_rec.village, 'status', v_rec.status, 'memo_no', v_rec.memo_no,
        'created_at', v_rec.created_at,
        'contact_mobile', CASE WHEN v_is_office THEN v_rec.contact_mobile ELSE NULL END,
        'contact_email', CASE WHEN v_is_office THEN v_rec.contact_email ELSE NULL END
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(v_results) > 25 THEN
    RETURN jsonb_path_query_array(v_results, '$[0 to 24]');
  END IF;

  RETURN v_results;
END;
$$;

CREATE OR REPLACE FUNCTION public.unified_find_duplicates(
  _mobile text DEFAULT NULL,
  _email text DEFAULT NULL,
  _identity_id text DEFAULT NULL,
  _person_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private
AS $$
  SELECT app_private.unified_find_duplicates(_mobile, _email, _identity_id, _person_name);
$$;

REVOKE EXECUTE ON FUNCTION app_private.unified_find_duplicates(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.unified_find_duplicates(text, text, text, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.unified_find_duplicates(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unified_find_duplicates(text, text, text, text) TO authenticated, service_role;