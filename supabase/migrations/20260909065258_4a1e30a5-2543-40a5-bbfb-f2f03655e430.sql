CREATE OR REPLACE FUNCTION public.open_office_working_copy(_kind cert_kind, _cert_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT has_role(_uid,'deo') THEN RAISE EXCEPTION 'Only a DEO can open an office working copy'; END IF;
  IF NOT public.has_service_scope(_uid, _kind::text) THEN
    RAISE EXCEPTION 'This certificate type is outside your assigned service scope';
  END IF;
  IF _kind='warish' THEN
    UPDATE public.warish_certificates SET office_copy_opened_at = COALESCE(office_copy_opened_at, now()),
      created_by = COALESCE(created_by,_uid), updated_at=now() WHERE id=_cert_id AND source='public';
  ELSE
    UPDATE public.dependent_certificates SET office_copy_opened_at = COALESCE(office_copy_opened_at, now()),
      created_by = COALESCE(created_by,_uid), updated_at=now() WHERE id=_cert_id AND source='public';
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION app_private.unified_find_duplicates(_mobile text DEFAULT NULL::text, _email text DEFAULT NULL::text, _identity_id text DEFAULT NULL::text, _person_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'app_private'
AS $function$
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
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_is_office := public.has_role(v_uid,'deo') OR public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin') OR public.has_role(v_uid,'monitoring_authority');

  IF (_mobile IS NULL OR _mobile = '')
     AND (_email IS NULL OR _email = '')
     AND (_identity_id IS NULL OR _identity_id = '')
     AND (_person_name IS NULL OR _person_name = '') THEN
    RETURN v_results;
  END IF;

  FOR v_rec IN
    SELECT id, 'warish'::text as kind, applicant_name, deceased_name, village, status, memo_no, created_at, contact_mobile, contact_email,
           data->>'applicantAadhaar' as app_aadhaar, data->>'applicantEpic' as app_epic, data->>'deceasedAadhaar' as dec_aadhaar, data->'heirs' as heirs
    FROM public.warish_certificates
    WHERE archived_at IS NULL
      AND (v_is_office OR citizen_user_id = v_uid)
      AND (NOT v_is_office OR NOT public.has_role(v_uid,'deo')
           OR public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')
           OR public.has_service_scope(v_uid,'warish'))
  LOOP
    v_score := 0;
    nested_match := false;

    IF _mobile IS NOT NULL AND _mobile <> '' AND v_rec.contact_mobile = _mobile THEN v_score := v_score + 10; END IF;
    IF _email IS NOT NULL AND _email <> '' AND lower(v_rec.contact_email) = lower(_email) THEN v_score := v_score + 10; END IF;
    IF _identity_id IS NOT NULL AND _identity_id <> '' THEN
       IF v_rec.app_aadhaar = _identity_id OR v_rec.app_epic = _identity_id OR v_rec.dec_aadhaar = _identity_id THEN v_score := v_score + 10; END IF;
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
      IF v_score >= 10 THEN v_match_type := 'DEFINITIVE DUPLICATE'; ELSE v_match_type := 'POSSIBLE MATCH'; END IF;

      IF v_is_office THEN
        v_results := v_results || jsonb_build_object(
          'id', v_rec.id, 'kind', v_rec.kind, 'match_strength', v_match_type,
          'applicant_name', v_rec.applicant_name, 'person_name', v_rec.deceased_name,
          'village', v_rec.village, 'status', v_rec.status, 'memo_no', v_rec.memo_no, 'created_at', v_rec.created_at,
          'contact_mobile', v_rec.contact_mobile, 'contact_email', v_rec.contact_email
        );
      ELSE
        v_results := v_results || jsonb_build_object(
          'id', v_rec.id, 'kind', v_rec.kind, 'match_strength', v_match_type,
          'applicant_name', v_rec.applicant_name, 'person_name', v_rec.deceased_name,
          'status', v_rec.status, 'created_at', v_rec.created_at
        );
      END IF;
    END IF;
  END LOOP;

  FOR v_rec IN
    SELECT id, 'dependent'::text as kind, applicant_name, data->>'appName' as employee_name, village, status, memo_no, created_at, contact_mobile, contact_email,
           data->>'applicantAadhaar' as app_aadhaar, data->>'applicantEpic' as app_epic, data->'dependents' as dependents
    FROM public.dependent_certificates
    WHERE archived_at IS NULL
      AND (v_is_office OR citizen_user_id = v_uid)
      AND (NOT v_is_office OR NOT public.has_role(v_uid,'deo')
           OR public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')
           OR public.has_service_scope(v_uid,'dependent'))
  LOOP
    v_score := 0;
    nested_match := false;

    IF _mobile IS NOT NULL AND _mobile <> '' AND v_rec.contact_mobile = _mobile THEN v_score := v_score + 10; END IF;
    IF _email IS NOT NULL AND _email <> '' AND lower(v_rec.contact_email) = lower(_email) THEN v_score := v_score + 10; END IF;
    IF _identity_id IS NOT NULL AND _identity_id <> '' THEN
       IF v_rec.app_aadhaar = _identity_id OR v_rec.app_epic = _identity_id THEN v_score := v_score + 10; END IF;
    END IF;

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
      IF v_score >= 10 THEN v_match_type := 'DEFINITIVE DUPLICATE'; ELSE v_match_type := 'POSSIBLE MATCH'; END IF;

      IF v_is_office THEN
        v_results := v_results || jsonb_build_object(
          'id', v_rec.id, 'kind', v_rec.kind, 'match_strength', v_match_type,
          'applicant_name', v_rec.applicant_name, 'person_name', v_rec.employee_name,
          'village', v_rec.village, 'status', v_rec.status, 'memo_no', v_rec.memo_no, 'created_at', v_rec.created_at,
          'contact_mobile', v_rec.contact_mobile, 'contact_email', v_rec.contact_email
        );
      ELSE
        v_results := v_results || jsonb_build_object(
          'id', v_rec.id, 'kind', v_rec.kind, 'match_strength', v_match_type,
          'applicant_name', v_rec.applicant_name, 'person_name', v_rec.employee_name,
          'status', v_rec.status, 'created_at', v_rec.created_at
        );
      END IF;
    END IF;
  END LOOP;

  IF jsonb_array_length(v_results) > 25 THEN
    RETURN jsonb_path_query_array(v_results, '$[0 to 24]');
  END IF;

  RETURN v_results;
END $function$;