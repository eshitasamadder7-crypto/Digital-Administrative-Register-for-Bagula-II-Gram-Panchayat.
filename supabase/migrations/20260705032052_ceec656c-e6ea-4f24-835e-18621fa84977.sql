
CREATE OR REPLACE FUNCTION app_private.public_verify(_verification_id text, _ip_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'app_private'
AS $function$
DECLARE
  rec_kind text; rec_type_label text;
  rec_vid text; rec_memo text; rec_issue date;
  rec_app text; rec_dec text; rec_status text; rec_reason text;
  recent_count int;
  v_prefix text;
  v_id text := upper(trim(_verification_id));
BEGIN
  SELECT count(*) INTO recent_count FROM public.verification_lookups
    WHERE ip_hash = _ip_hash AND created_at > now() - interval '10 minutes';
  IF recent_count > 20 THEN RETURN jsonb_build_object('status','rate_limited'); END IF;

  -- Route strictly by prefix
  IF v_id LIKE 'BGL-II-WAR-%' THEN
    v_prefix := 'BGL-II-WAR';
    SELECT verification_id, memo_no, issue_date, applicant_name, deceased_name, status, rejected_reason
      INTO rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason
      FROM public.warish_certificates WHERE verification_id = v_id LIMIT 1;
    IF FOUND THEN rec_kind := 'warish'; rec_type_label := 'Warish (Legal Heir) Certificate'; END IF;
  ELSIF v_id LIKE 'BGL-II-DEP-%' THEN
    v_prefix := 'BGL-II-DEP';
    SELECT verification_id, memo_no, issue_date, applicant_name, NULL::text, status, rejected_reason
      INTO rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason
      FROM public.dependent_certificates WHERE verification_id = v_id LIMIT 1;
    IF FOUND THEN rec_kind := 'dependent'; rec_type_label := 'Dependent Certificate'; END IF;
  ELSE
    INSERT INTO public.verification_lookups(ip_hash, verification_id, found)
      VALUES (_ip_hash, v_id, false);
    RETURN jsonb_build_object('status','not_found');
  END IF;

  INSERT INTO public.verification_lookups(ip_hash, verification_id, found)
    VALUES (_ip_hash, v_id, rec_kind IS NOT NULL);

  IF rec_kind IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;

  -- Cross-check: the row's own verification_id must share the requested prefix
  IF rec_vid IS NULL OR position(v_prefix in upper(rec_vid)) <> 1 THEN
    RETURN jsonb_build_object('status','inconsistent');
  END IF;

  IF rec_status = 'Approved' THEN
    IF rec_kind = 'warish' THEN
      UPDATE public.warish_certificates SET verification_count = COALESCE(verification_count,0) + 1
        WHERE verification_id = v_id;
    ELSE
      UPDATE public.dependent_certificates SET verification_count = COALESCE(verification_count,0) + 1
        WHERE verification_id = v_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status','found',
    'kind', rec_kind,
    'certificate_type', rec_type_label,
    'verification_id', rec_vid,
    'applicant_name', rec_app,
    'deceased_name', rec_dec,
    'record_status', rec_status,
    'memo_no', CASE WHEN rec_status = 'Approved' THEN rec_memo ELSE NULL END,
    'issue_date', CASE WHEN rec_status = 'Approved' THEN rec_issue ELSE NULL END,
    'rejected_reason', CASE WHEN rec_status = 'Rejected' THEN rec_reason ELSE NULL END,
    'issued_by', 'Bagula II Gram Panchayat',
    'server_time', now()
  );
END $function$;

CREATE OR REPLACE FUNCTION app_private.public_verify_advanced(_memo_no text, _issue_date date, _aadhaar_last4 text, _ip_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'app_private'
AS $function$
DECLARE
  rec_kind text; rec_type_label text;
  rec_vid text; rec_memo text; rec_issue date;
  rec_app text; rec_dec text; rec_status text; rec_reason text;
  recent_count int;
  v_memo text := trim(_memo_no);
  v_prefix text;
BEGIN
  SELECT count(*) INTO recent_count FROM public.verification_lookups
    WHERE ip_hash = _ip_hash AND created_at > now() - interval '10 minutes';
  IF recent_count > 20 THEN RETURN jsonb_build_object('status','rate_limited'); END IF;

  -- Warish first
  SELECT verification_id, memo_no, issue_date, applicant_name, deceased_name, status, rejected_reason
    INTO rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason
    FROM public.warish_certificates
    WHERE memo_no = v_memo AND issue_date = _issue_date
      AND status = 'Approved'
    LIMIT 1;
  IF FOUND THEN rec_kind := 'warish'; rec_type_label := 'Warish (Legal Heir) Certificate'; END IF;

  IF rec_kind IS NULL THEN
    SELECT verification_id, memo_no, issue_date, applicant_name, NULL::text, status, rejected_reason
      INTO rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason
      FROM public.dependent_certificates
      WHERE memo_no = v_memo AND issue_date = _issue_date
        AND status = 'Approved'
      LIMIT 1;
    IF FOUND THEN rec_kind := 'dependent'; rec_type_label := 'Dependent Certificate'; END IF;
  END IF;

  INSERT INTO public.verification_lookups(ip_hash, verification_id, found)
    VALUES (_ip_hash, COALESCE(rec_vid, v_memo), rec_kind IS NOT NULL);

  IF rec_kind IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;

  v_prefix := CASE rec_kind WHEN 'warish' THEN 'BGL-II-WAR' ELSE 'BGL-II-DEP' END;
  IF rec_vid IS NULL OR position(v_prefix in upper(rec_vid)) <> 1 THEN
    RETURN jsonb_build_object('status','inconsistent');
  END IF;

  IF rec_kind = 'warish' THEN
    UPDATE public.warish_certificates SET verification_count = COALESCE(verification_count,0) + 1
      WHERE verification_id = rec_vid;
  ELSE
    UPDATE public.dependent_certificates SET verification_count = COALESCE(verification_count,0) + 1
      WHERE verification_id = rec_vid;
  END IF;

  RETURN jsonb_build_object(
    'status','found',
    'kind', rec_kind,
    'certificate_type', rec_type_label,
    'verification_id', rec_vid,
    'applicant_name', rec_app,
    'deceased_name', rec_dec,
    'record_status', rec_status,
    'memo_no', rec_memo,
    'issue_date', rec_issue,
    'rejected_reason', CASE WHEN rec_status = 'Rejected' THEN rec_reason ELSE NULL END,
    'issued_by', 'Bagula II Gram Panchayat',
    'server_time', now()
  );
END $function$;
