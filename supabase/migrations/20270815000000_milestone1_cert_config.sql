-- MASTER DATA CONSUMER MIGRATION PHASE 2 - MILESTONE 1
-- Certificate Configuration, Safe ID Generation, Validity, and PII Verification Security

-- 1. Create Master Certificate Types table
CREATE TABLE IF NOT EXISTS public.master_certificate_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_kind text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  id_prefix text NOT NULL,
  id_format text NOT NULL,
  sequence_reset_period text NOT NULL DEFAULT 'yearly',
  validity_enabled boolean NOT NULL DEFAULT true,
  validity_duration int,
  validity_unit text CHECK (validity_unit IN ('months', 'years')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS & Grants for master_certificate_types
GRANT SELECT ON public.master_certificate_types TO anon, authenticated;
GRANT ALL ON public.master_certificate_types TO service_role;
ALTER TABLE public.master_certificate_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_cert_types_read_all" ON public.master_certificate_types
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "master_cert_types_super_admin_write" ON public.master_certificate_types
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_master_certificate_types_updated_at BEFORE UPDATE ON public.master_certificate_types
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed initial configuration to match existing hardcoded logic
INSERT INTO public.master_certificate_types
  (cert_kind, id_prefix, id_format, sequence_reset_period, validity_enabled, validity_duration, validity_unit)
VALUES
  ('warish', 'BGL-II', '{{SEQ}}/{{PREFIX}}/{{YEAR}}', 'yearly', true, 6, 'months'),
  ('dependent', 'BGL-II', '{{SEQ}}/{{PREFIX}}/{{YEAR}}', 'yearly', true, 6, 'months')
ON CONFLICT (cert_kind) DO NOTHING;


-- 2. Create Sequence Tracker
CREATE TABLE IF NOT EXISTS public.certificate_sequences (
  sequence_year int PRIMARY KEY,
  last_value int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Sequences are entirely managed within SECURITY DEFINER RPCs.
GRANT ALL ON public.certificate_sequences TO service_role;
ALTER TABLE public.certificate_sequences ENABLE ROW LEVEL SECURITY;
-- No public/authenticated policies.

CREATE TRIGGER trg_certificate_sequences_updated_at BEFORE UPDATE ON public.certificate_sequences
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Backfill sequence table with existing maximums
INSERT INTO public.certificate_sequences (sequence_year, last_value)
SELECT
  COALESCE(w.memo_year, d.memo_year) AS memo_year,
  GREATEST(COALESCE(MAX(w.memo_serial), 0), COALESCE(MAX(d.memo_serial), 0)) AS max_serial
FROM public.warish_certificates w
FULL OUTER JOIN public.dependent_certificates d ON w.memo_year = d.memo_year
WHERE COALESCE(w.memo_year, d.memo_year) IS NOT NULL
GROUP BY COALESCE(w.memo_year, d.memo_year)
ON CONFLICT (sequence_year) DO UPDATE
SET last_value = GREATEST(public.certificate_sequences.last_value, EXCLUDED.last_value);


-- 3. Add Validity and Snapshot columns to Certificate Tables
ALTER TABLE public.warish_certificates
  ADD COLUMN IF NOT EXISTS valid_from date,
  ADD COLUMN IF NOT EXISTS valid_until date,
  ADD COLUMN IF NOT EXISTS config_snapshot jsonb;

ALTER TABLE public.dependent_certificates
  ADD COLUMN IF NOT EXISTS valid_from date,
  ADD COLUMN IF NOT EXISTS valid_until date,
  ADD COLUMN IF NOT EXISTS config_snapshot jsonb;


-- 4. Rewrite ID Generation & Approval RPC
CREATE OR REPLACE FUNCTION app_private.approve_certificate_v2(
  _kind text, _cert_id uuid, _memo_serial int, _memo_year int, _issue_date date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE
  v_serial int;
  v_memo_no text;
  v_uid uuid := auth.uid();
  v_vid text;
  v_config record;
  v_valid_until date;
  v_snapshot jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _memo_year IS NULL OR _issue_date IS NULL THEN RAISE EXCEPTION 'Memo year and issue date are required'; END IF;
  IF _kind NOT IN ('warish','dependent') THEN RAISE EXCEPTION 'Invalid kind'; END IF;

  -- Load configuration
  SELECT * INTO v_config FROM public.master_certificate_types WHERE cert_kind = _kind AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active configuration not found for certificate kind: %', _kind;
  END IF;

  IF _memo_year >= 2027 THEN
    -- Atomic sequence allocation per year (shared across kinds based on existing semantics)
    -- We insert 1 if it doesn't exist, OR increment existing last_value by 1.
    INSERT INTO public.certificate_sequences (sequence_year, last_value)
    VALUES (_memo_year, 1)
    ON CONFLICT (sequence_year) DO UPDATE
    SET last_value = public.certificate_sequences.last_value + 1
    RETURNING last_value INTO v_serial;
  ELSE
    -- Legacy fallback
    IF _memo_serial IS NULL OR _memo_serial <= 0 THEN RAISE EXCEPTION 'Serial number required for legacy year'; END IF;
    v_serial := _memo_serial;
    IF _kind = 'warish' THEN
      IF EXISTS (SELECT 1 FROM public.warish_certificates WHERE memo_serial=v_serial AND memo_year=_memo_year AND id <> _cert_id) THEN
        RAISE EXCEPTION 'Duplicate memo number: %/BGL-II/%', v_serial, _memo_year USING ERRCODE = 'unique_violation'; END IF;
    ELSE
      IF EXISTS (SELECT 1 FROM public.dependent_certificates WHERE memo_serial=v_serial AND memo_year=_memo_year AND id <> _cert_id) THEN
        RAISE EXCEPTION 'Duplicate memo number: %/BGL-II/%', v_serial, _memo_year USING ERRCODE = 'unique_violation'; END IF;
    END IF;
  END IF;

  -- Generate Memo Number using config format
  -- Allowed tokens: {{PREFIX}}, {{YEAR}}, {{SEQ}}
  v_memo_no := v_config.id_format;
  v_memo_no := replace(v_memo_no, '{{PREFIX}}', v_config.id_prefix);
  v_memo_no := replace(v_memo_no, '{{YEAR}}', _memo_year::text);
  v_memo_no := replace(v_memo_no, '{{SEQ}}', v_serial::text);

  -- Ensure no unknown tokens remain
  IF v_memo_no LIKE '%{{%' THEN
    RAISE EXCEPTION 'Invalid template format in configuration: %', v_config.id_format;
  END IF;

  -- Calculate Validity
  IF v_config.validity_enabled THEN
    IF v_config.validity_unit = 'months' THEN
      v_valid_until := _issue_date + (v_config.validity_duration || ' months')::interval;
    ELSIF v_config.validity_unit = 'years' THEN
      v_valid_until := _issue_date + (v_config.validity_duration || ' years')::interval;
    ELSE
      v_valid_until := NULL;
    END IF;
  ELSE
    v_valid_until := NULL;
  END IF;

  -- Create snapshot
  v_snapshot := jsonb_build_object(
    'cert_kind', v_config.cert_kind,
    'id_prefix', v_config.id_prefix,
    'id_format', v_config.id_format,
    'sequence_reset_period', v_config.sequence_reset_period,
    'validity_enabled', v_config.validity_enabled,
    'validity_duration', v_config.validity_duration,
    'validity_unit', v_config.validity_unit
  );

  -- Update Certificate
  IF _kind = 'warish' THEN
    UPDATE public.warish_certificates SET
      memo_serial=v_serial,
      memo_year=_memo_year,
      memo_no=v_memo_no,
      cert_date=_issue_date,
      issue_date=_issue_date,
      valid_from=_issue_date,
      valid_until=v_valid_until,
      config_snapshot=v_snapshot,
      status='Approved',
      approved_by=v_uid,
      approval_timestamp=now(),
      rejected_by=null,
      rejected_reason=null,
      rejection_timestamp=null,
      rejected_at=null
    WHERE id=_cert_id RETURNING verification_id INTO v_vid;
  ELSE
    UPDATE public.dependent_certificates SET
      memo_serial=v_serial,
      memo_year=_memo_year,
      memo_no=v_memo_no,
      cert_date=_issue_date,
      issue_date=_issue_date,
      valid_from=_issue_date,
      valid_until=v_valid_until,
      config_snapshot=v_snapshot,
      status='Approved',
      approved_by=v_uid,
      approval_timestamp=now(),
      rejected_by=null,
      rejected_reason=null,
      rejection_timestamp=null,
      rejected_at=null
    WHERE id=_cert_id RETURNING verification_id INTO v_vid;
  END IF;

  -- Optional: Generate Verification ID if missing (from previous trigger logic)
  IF v_vid IS NULL THEN
    v_vid := public.generate_verification_id(_kind, _memo_year);
    IF _kind = 'warish' THEN
      UPDATE public.warish_certificates SET verification_id = v_vid WHERE id = _cert_id;
    ELSE
      UPDATE public.dependent_certificates SET verification_id = v_vid WHERE id = _cert_id;
    END IF;
  END IF;

  INSERT INTO public.certificate_audit_logs (cert_kind, cert_table, cert_id, certificate_number, action, actor_user_id, actor_email, metadata)
  VALUES (_kind::cert_kind, _kind||'_certificates', _cert_id, v_memo_no, 'approved', v_uid, (SELECT email FROM auth.users WHERE id=v_uid),
          jsonb_build_object('memo_serial',v_serial,'memo_year',_memo_year,'issue_date',_issue_date,'verification_id',v_vid));

  RETURN jsonb_build_object('memo_no', v_memo_no, 'issue_date', _issue_date, 'verification_id', v_vid);
END $$;


-- 5. Helper function to sanitize verification data
CREATE OR REPLACE FUNCTION app_private.sanitize_verification_data(_data jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_sanitized jsonb := '{}'::jsonb;
  v_heirs jsonb;
  v_dependents jsonb;
  v_safe_heir jsonb;
  v_safe_dep jsonb;
  h jsonb;
  d jsonb;
BEGIN
  IF _data IS NULL THEN RETURN NULL; END IF;

  -- Root Level Allow-List
  v_sanitized := jsonb_build_object(
    'applicantName', _data->'applicantName',
    'applicantRelation', _data->'applicantRelation',
    'applicantRelOther', _data->'applicantRelOther',
    'village', _data->'village',
    'villageManual', _data->'villageManual',
    'postOffice', _data->'postOffice',
    'poManual', _data->'poManual',
    'district', _data->'district',
    'deceasedName', _data->'deceasedName',
    'fatherPrefix', _data->'fatherPrefix',
    'fatherName', _data->'fatherName',
    'appName', _data->'appName',
    'appTitle', _data->'appTitle',
    'appRelType', _data->'appRelType',
    'appParentTitle', _data->'appParentTitle',
    'appParent', _data->'appParent',
    'empId', _data->'empId',
    'dept', _data->'dept',
    'deptManual', _data->'deptManual',
    'ps', _data->'ps',
    'block', _data->'block'
  );

  -- Sanitize Heirs Array
  IF _data ? 'heirs' AND jsonb_typeof(_data->'heirs') = 'array' THEN
    v_heirs := '[]'::jsonb;
    FOR h IN SELECT * FROM jsonb_array_elements(_data->'heirs') LOOP
      v_safe_heir := jsonb_build_object(
        'prefix', h->'prefix',
        'name', h->'name',
        'relation', h->'relation',
        'age', h->'age',
        'deceased', h->'deceased'
      );

      -- subHeirs if present
      IF h ? 'subHeirs' AND jsonb_typeof(h->'subHeirs') = 'array' THEN
         -- simplified, assuming subHeirs has same structure
         v_safe_heir := jsonb_set(v_safe_heir, '{subHeirs}', (
            SELECT jsonb_agg(jsonb_build_object(
              'prefix', sh->'prefix',
              'name', sh->'name',
              'relation', sh->'relation',
              'age', sh->'age'
            )) FROM jsonb_array_elements(h->'subHeirs') sh
         ));
      END IF;

      v_heirs := v_heirs || v_safe_heir;
    END LOOP;
    v_sanitized := jsonb_set(v_sanitized, '{heirs}', v_heirs);
  END IF;

  -- Sanitize Dependents Array
  IF _data ? 'dependents' AND jsonb_typeof(_data->'dependents') = 'array' THEN
    v_dependents := '[]'::jsonb;
    FOR d IN SELECT * FROM jsonb_array_elements(_data->'dependents') LOOP
      v_safe_dep := jsonb_build_object(
        'title', d->'title',
        'name', d->'name',
        'relation', d->'relation'
      );
      v_dependents := v_dependents || v_safe_dep;
    END LOOP;
    v_sanitized := jsonb_set(v_sanitized, '{dependents}', v_dependents);
  END IF;

  RETURN v_sanitized;
END $$;


-- 6. Rewrite Verification RPCs (PII Fix)

-- Public verify by verification_id
CREATE OR REPLACE FUNCTION app_private.public_verify(_verification_id text, _ip_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE
  rec_kind text; rec_type_label text;
  rec_vid text; rec_memo text; rec_issue date;
  rec_app text; rec_dec text; rec_status text; rec_reason text; rec_data jsonb;
  rec_valid_from date; rec_valid_until date;
  recent_count int; v_prefix text;
  v_id text := upper(trim(_verification_id));
BEGIN
  SELECT count(*) INTO recent_count FROM public.verification_lookups
    WHERE ip_hash = _ip_hash AND created_at > now() - interval '10 minutes';
  IF recent_count > 20 THEN RETURN jsonb_build_object('status','rate_limited'); END IF;

  IF v_id LIKE 'BGL-II-WAR-%' THEN
    v_prefix := 'BGL-II-WAR';
    SELECT verification_id, memo_no, issue_date, applicant_name, deceased_name, status, rejected_reason, data, valid_from, valid_until
      INTO rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason, rec_data, rec_valid_from, rec_valid_until
      FROM public.warish_certificates WHERE verification_id = v_id LIMIT 1;
    IF FOUND THEN rec_kind := 'warish'; rec_type_label := 'Warish Certificate'; END IF;
  ELSIF v_id LIKE 'BGL-II-DEP-%' THEN
    v_prefix := 'BGL-II-DEP';
    SELECT verification_id, memo_no, issue_date, applicant_name, null::text, status, rejected_reason, data, valid_from, valid_until
      INTO rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason, rec_data, rec_valid_from, rec_valid_until
      FROM public.dependent_certificates WHERE verification_id = v_id LIMIT 1;
    IF FOUND THEN rec_kind := 'dependent'; rec_type_label := 'Dependent Certificate'; END IF;
  ELSE
    INSERT INTO public.verification_lookups(ip_hash, verification_id, found) VALUES (_ip_hash, v_id, false);
    RETURN jsonb_build_object('status','not_found');
  END IF;

  INSERT INTO public.verification_lookups(ip_hash, verification_id, found) VALUES (_ip_hash, v_id, rec_kind IS NOT NULL);
  IF rec_kind IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF rec_vid IS NULL OR position(v_prefix in upper(rec_vid)) <> 1 THEN RETURN jsonb_build_object('status','inconsistent'); END IF;

  IF rec_status = 'Approved' THEN
    IF rec_kind = 'warish' THEN
      UPDATE public.warish_certificates SET verification_count = coalesce(verification_count,0)+1 WHERE verification_id = v_id;
    ELSE
      UPDATE public.dependent_certificates SET verification_count = coalesce(verification_count,0)+1 WHERE verification_id = v_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'found',
    'kind', rec_kind,
    'certificate_type', rec_type_label,
    'verification_id', rec_vid,
    'applicant_name', rec_app,
    'deceased_name', rec_dec,
    'record_status', rec_status,
    'memo_no', CASE WHEN rec_status='Approved' THEN rec_memo ELSE null END,
    'issue_date', CASE WHEN rec_status='Approved' THEN rec_issue ELSE null END,
    'valid_from', CASE WHEN rec_status='Approved' THEN rec_valid_from ELSE null END,
    'valid_until', CASE WHEN rec_status='Approved' THEN rec_valid_until ELSE null END,
    'rejected_reason', CASE WHEN rec_status='Rejected' THEN rec_reason ELSE null END,
    'record_data', CASE WHEN rec_status='Approved' THEN app_private.sanitize_verification_data(rec_data) ELSE null END,
    'issued_by', 'Bagula II Gram Panchayat',
    'server_time', now()
  );
END $$;


-- Public verify advanced (Allowing flexible combinations)
CREATE OR REPLACE FUNCTION app_private.public_verify_advanced(
  _memo_no text, _issue_date date, _person_name text, _ip_hash text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE
  rec_kind text; rec_type_label text; rec_vid text; rec_memo text; rec_issue date;
  rec_app text; rec_dec text; rec_status text; rec_reason text; rec_data jsonb;
  rec_valid_from date; rec_valid_until date;
  recent_count int; v_memo text := trim(_memo_no); v_prefix text;
BEGIN
  -- Rejection of invalid combinations
  IF (v_memo IS NULL OR v_memo = '') AND _issue_date IS NULL AND (_person_name IS NULL OR trim(_person_name) = '') THEN
    RETURN jsonb_build_object('status','not_found', 'error', 'Empty search criteria');
  END IF;
  IF (v_memo IS NULL OR v_memo = '') AND (_person_name IS NULL OR trim(_person_name) = '') THEN
    RETURN jsonb_build_object('status','not_found', 'error', 'Date-only search is not permitted');
  END IF;
  IF (v_memo IS NULL OR v_memo = '') AND _issue_date IS NULL THEN
    RETURN jsonb_build_object('status','not_found', 'error', 'Name-only search is not permitted');
  END IF;

  SELECT count(*) INTO recent_count FROM public.verification_lookups
    WHERE ip_hash = _ip_hash AND created_at > now() - interval '10 minutes';
  IF recent_count > 20 THEN RETURN jsonb_build_object('status','rate_limited'); END IF;

  -- Build dynamic search logic conceptually, but implemented directly for safety and speed
  -- Primary search on Warish
  SELECT verification_id, memo_no, issue_date, applicant_name, deceased_name, status, rejected_reason, data, valid_from, valid_until
    INTO rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason, rec_data, rec_valid_from, rec_valid_until
    FROM public.warish_certificates
   WHERE status = 'Approved'
     AND (v_memo IS NULL OR v_memo = '' OR memo_no = v_memo)
     AND (_issue_date IS NULL OR issue_date = _issue_date)
     AND (_person_name IS NULL OR trim(_person_name) = '' OR lower(deceased_name) = lower(trim(_person_name)))
   ORDER BY issue_date DESC LIMIT 1;

  IF FOUND THEN
    rec_kind := 'warish'; rec_type_label := 'Warish Certificate';
  END IF;

  -- Fallback search on Dependent (if no Warish found and no deceased name provided, or if searching by employee name)
  IF rec_kind IS NULL THEN
    SELECT verification_id, memo_no, issue_date, applicant_name, null::text, status, rejected_reason, data, valid_from, valid_until
      INTO rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason, rec_data, rec_valid_from, rec_valid_until
      FROM public.dependent_certificates
     WHERE status = 'Approved'
       AND (v_memo IS NULL OR v_memo = '' OR memo_no = v_memo)
       AND (_issue_date IS NULL OR issue_date = _issue_date)
       AND (
           _person_name IS NULL OR trim(_person_name) = ''
           OR lower(data->>'appName') = lower(trim(_person_name))
           OR lower(concat_ws(' ', data->>'appTitle', data->>'appName')) = lower(trim(_person_name))
       )
     ORDER BY issue_date DESC LIMIT 1;
    IF FOUND THEN
      rec_kind := 'dependent'; rec_type_label := 'Dependent Certificate';
    END IF;
  END IF;

  INSERT INTO public.verification_lookups(ip_hash, verification_id, found) VALUES (_ip_hash, coalesce(rec_vid, v_memo), rec_kind IS NOT NULL);
  IF rec_kind IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;

  v_prefix := CASE rec_kind WHEN 'warish' THEN 'BGL-II-WAR' ELSE 'BGL-II-DEP' END;
  IF rec_vid IS NULL OR position(v_prefix in upper(rec_vid)) <> 1 THEN RETURN jsonb_build_object('status','inconsistent'); END IF;

  IF rec_kind = 'warish' THEN
    UPDATE public.warish_certificates SET verification_count = coalesce(verification_count,0)+1 WHERE verification_id = rec_vid;
  ELSE
    UPDATE public.dependent_certificates SET verification_count = coalesce(verification_count,0)+1 WHERE verification_id = rec_vid;
  END IF;

  RETURN jsonb_build_object(
    'status','found',
    'kind',rec_kind,
    'certificate_type',rec_type_label,
    'verification_id',rec_vid,
    'applicant_name',rec_app,
    'deceased_name',rec_dec,
    'record_status',rec_status,
    'memo_no',rec_memo,
    'issue_date',rec_issue,
    'valid_from', rec_valid_from,
    'valid_until', rec_valid_until,
    'rejected_reason',CASE WHEN rec_status='Rejected' THEN rec_reason ELSE null END,
    'record_data',app_private.sanitize_verification_data(rec_data),
    'issued_by','Bagula II Gram Panchayat',
    'server_time',now()
  );
END $$;

-- Update the public wrapper (signature changed to remove aadhaar_last4 and accept _deceased_name instead)
DROP FUNCTION IF EXISTS public.public_verify_advanced(text, date, text, text);
CREATE OR REPLACE FUNCTION public.public_verify_advanced(_memo_no text, _issue_date date, _deceased_name text, _ip_hash text)
RETURNS jsonb LANGUAGE sql SET search_path = public, app_private AS $$
  SELECT app_private.public_verify_advanced(_memo_no, _issue_date, _deceased_name, _ip_hash);
$$;

REVOKE ALL ON FUNCTION app_private.public_verify_advanced(text, date, text, text) FROM public;
GRANT EXECUTE ON FUNCTION app_private.public_verify_advanced(text, date, text, text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.public_verify_advanced(text, date, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_verify_advanced(text, date, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.public_verify_advanced(
  _memo_no text, _issue_date date, _person_name text, _ip_hash text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE
  rec_kind text; rec_type_label text; rec_vid text; rec_memo text; rec_issue date;
  rec_app text; rec_dec text; rec_status text; rec_reason text; rec_data jsonb;
  rec_valid_from date; rec_valid_until date;
  recent_count int; v_memo text := trim(_memo_no); v_prefix text;
BEGIN
  -- 1. Strict Query Rejection
  IF (v_memo IS NULL OR v_memo = '') AND _issue_date IS NULL AND (_person_name IS NULL OR trim(_person_name) = '') THEN
    RETURN jsonb_build_object('status','not_found', 'error', 'Empty search criteria');
  END IF;
  IF (v_memo IS NULL OR v_memo = '') AND (_person_name IS NULL OR trim(_person_name) = '') THEN
    RETURN jsonb_build_object('status','not_found', 'error', 'Date-only search is not permitted');
  END IF;
  IF (v_memo IS NULL OR v_memo = '') AND _issue_date IS NULL THEN
    RETURN jsonb_build_object('status','not_found', 'error', 'Name-only search is not permitted');
  END IF;

  -- 2. Rate Limiting
  SELECT count(*) INTO recent_count FROM public.verification_lookups
    WHERE ip_hash = _ip_hash AND created_at > now() - interval '10 minutes';
  IF recent_count > 20 THEN RETURN jsonb_build_object('status','rate_limited'); END IF;

  -- 3. Search Warish (Match Deceased Name)
  SELECT verification_id, memo_no, issue_date, applicant_name, deceased_name, status, rejected_reason, data, valid_from, valid_until
    INTO rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason, rec_data, rec_valid_from, rec_valid_until
    FROM public.warish_certificates
   WHERE status = 'Approved'
     AND (v_memo IS NULL OR v_memo = '' OR memo_no = v_memo)
     AND (_issue_date IS NULL OR issue_date = _issue_date)
     AND (_person_name IS NULL OR trim(_person_name) = '' OR lower(deceased_name) = lower(trim(_person_name)))
   ORDER BY issue_date DESC LIMIT 1;

  IF FOUND THEN
    rec_kind := 'warish'; rec_type_label := 'Warish Certificate';
  END IF;

  -- 4. Search Dependent (Match Employee Name from JSON data)
  IF rec_kind IS NULL THEN
    SELECT verification_id, memo_no, issue_date, applicant_name, null::text, status, rejected_reason, data, valid_from, valid_until
      INTO rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason, rec_data, rec_valid_from, rec_valid_until
      FROM public.dependent_certificates
     WHERE status = 'Approved'
       AND (v_memo IS NULL OR v_memo = '' OR memo_no = v_memo)
       AND (_issue_date IS NULL OR issue_date = _issue_date)
       AND (
           _person_name IS NULL OR trim(_person_name) = ''
           OR lower(data->>'appName') = lower(trim(_person_name))
           OR lower(concat_ws(' ', data->>'appTitle', data->>'appName')) = lower(trim(_person_name))
       )
     ORDER BY issue_date DESC LIMIT 1;
    IF FOUND THEN
      rec_kind := 'dependent'; rec_type_label := 'Dependent Certificate';
    END IF;
  END IF;

  INSERT INTO public.verification_lookups(ip_hash, verification_id, found) VALUES (_ip_hash, coalesce(rec_vid, v_memo), rec_kind IS NOT NULL);
  IF rec_kind IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;

  v_prefix := CASE rec_kind WHEN 'warish' THEN 'BGL-II-WAR' ELSE 'BGL-II-DEP' END;
  IF rec_vid IS NULL OR position(v_prefix in upper(rec_vid)) <> 1 THEN RETURN jsonb_build_object('status','inconsistent'); END IF;

  IF rec_kind = 'warish' THEN
    UPDATE public.warish_certificates SET verification_count = coalesce(verification_count,0)+1 WHERE verification_id = rec_vid;
  ELSE
    UPDATE public.dependent_certificates SET verification_count = coalesce(verification_count,0)+1 WHERE verification_id = rec_vid;
  END IF;

  -- 5. Explicit Allow-List PII Return
  RETURN jsonb_build_object(
    'status','found',
    'kind',rec_kind,
    'certificate_type',rec_type_label,
    'verification_id',rec_vid,
    'applicant_name',rec_app,
    'deceased_name',rec_dec,
    'record_status',rec_status,
    'memo_no',rec_memo,
    'issue_date',rec_issue,
    'valid_from', rec_valid_from,
    'valid_until', rec_valid_until,
    'rejected_reason',CASE WHEN rec_status='Rejected' THEN rec_reason ELSE null END,
    'record_data',app_private.sanitize_verification_data(rec_data),
    'issued_by','Bagula II Gram Panchayat',
    'server_time',now()
  );
END $$;
-- 7. Unified Duplicate Detection (Warish + Dependent)
DROP FUNCTION IF EXISTS public.find_duplicate_applications(cert_kind, text, text);

CREATE OR REPLACE FUNCTION app_private.unified_find_duplicates(
  _mobile text DEFAULT NULL,
  _email text DEFAULT NULL,
  _identity_id text DEFAULT NULL,
  _person_name text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, app_private AS $$
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

  -- Determine if caller is an office role
  v_is_office := public.has_role(v_uid,'deo') OR public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin');

  -- Reject empty queries
  IF (_mobile IS NULL OR _mobile = '')
     AND (_email IS NULL OR _email = '')
     AND (_identity_id IS NULL OR _identity_id = '')
     AND (_person_name IS NULL OR _person_name = '') THEN
    RETURN v_results;
  END IF;

  -- Search Warish
  FOR v_rec IN
    SELECT id, 'warish'::text as kind, applicant_name, deceased_name, village, status, memo_no, created_at, contact_mobile, contact_email,
           data->>'applicantAadhaar' as app_aadhaar, data->>'applicantEpic' as app_epic, data->>'deceasedAadhaar' as dec_aadhaar, data->'heirs' as heirs
    FROM public.warish_certificates
    WHERE archived_at IS NULL
  LOOP
    v_score := 0;
    nested_match := false;

    -- Strong matches (root)
    IF _mobile IS NOT NULL AND _mobile <> '' AND v_rec.contact_mobile = _mobile THEN v_score := v_score + 10; END IF;
    IF _email IS NOT NULL AND _email <> '' AND lower(v_rec.contact_email) = lower(_email) THEN v_score := v_score + 10; END IF;
    IF _identity_id IS NOT NULL AND _identity_id <> '' THEN
       IF v_rec.app_aadhaar = _identity_id OR v_rec.app_epic = _identity_id OR v_rec.dec_aadhaar = _identity_id THEN v_score := v_score + 10; END IF;
    END IF;

    -- Deep Identity Search (Heirs / Subheirs)
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

    -- Weak matches (Name)
    IF _person_name IS NOT NULL AND _person_name <> '' THEN
       IF lower(v_rec.applicant_name) = lower(trim(_person_name)) OR lower(v_rec.deceased_name) = lower(trim(_person_name)) THEN v_score := v_score + 3; END IF;
       -- Deep Name Search
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
        -- Citizen view: Stripped PII
        v_results := v_results || jsonb_build_object(
          'id', v_rec.id, 'kind', v_rec.kind, 'match_strength', v_match_type,
          'applicant_name', v_rec.applicant_name, 'person_name', v_rec.deceased_name,
          'status', v_rec.status, 'created_at', v_rec.created_at
        );
      END IF;
    END IF;
  END LOOP;

  -- Search Dependent
  FOR v_rec IN
    SELECT id, 'dependent'::text as kind, applicant_name, data->>'appName' as employee_name, village, status, memo_no, created_at, contact_mobile, contact_email,
           data->>'applicantAadhaar' as app_aadhaar, data->>'applicantEpic' as app_epic, data->'dependents' as dependents
    FROM public.dependent_certificates
    WHERE archived_at IS NULL
  LOOP
    v_score := 0;
    nested_match := false;

    -- Strong matches
    IF _mobile IS NOT NULL AND _mobile <> '' AND v_rec.contact_mobile = _mobile THEN v_score := v_score + 10; END IF;
    IF _email IS NOT NULL AND _email <> '' AND lower(v_rec.contact_email) = lower(_email) THEN v_score := v_score + 10; END IF;
    IF _identity_id IS NOT NULL AND _identity_id <> '' THEN
       IF v_rec.app_aadhaar = _identity_id OR v_rec.app_epic = _identity_id THEN v_score := v_score + 10; END IF;
    END IF;

    -- Weak matches (Name)
    IF _person_name IS NOT NULL AND _person_name <> '' THEN
       IF lower(v_rec.applicant_name) = lower(trim(_person_name)) OR lower(v_rec.employee_name) = lower(trim(_person_name)) THEN v_score := v_score + 3; END IF;

       -- Deep Name Search
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
        -- Citizen view: Stripped PII
        v_results := v_results || jsonb_build_object(
          'id', v_rec.id, 'kind', v_rec.kind, 'match_strength', v_match_type,
          'applicant_name', v_rec.applicant_name, 'person_name', v_rec.employee_name,
          'status', v_rec.status, 'created_at', v_rec.created_at
        );
      END IF;
    END IF;
  END LOOP;

  -- Limit total results to prevent enumeration via broad queries
  IF jsonb_array_length(v_results) > 25 THEN
    RETURN jsonb_path_query_array(v_results, '$[0 to 24]');
  END IF;

  RETURN v_results;
END $$;

CREATE OR REPLACE FUNCTION public.unified_find_duplicates(
  _mobile text DEFAULT NULL,
  _email text DEFAULT NULL,
  _identity_id text DEFAULT NULL,
  _person_name text DEFAULT NULL
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public, app_private AS $$
  SELECT app_private.unified_find_duplicates(_mobile, _email, _identity_id, _person_name);
$$;

GRANT EXECUTE ON FUNCTION app_private.unified_find_duplicates(text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unified_find_duplicates(text, text, text, text) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION app_private.unified_find_duplicates(
  _mobile text DEFAULT NULL,
  _email text DEFAULT NULL,
  _identity_id text DEFAULT NULL,
  _person_name text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, app_private AS $$
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

  -- Determine if caller is an office role
  v_is_office := public.has_role(v_uid,'deo') OR public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin');

  -- Reject empty queries
  IF (_mobile IS NULL OR _mobile = '')
     AND (_email IS NULL OR _email = '')
     AND (_identity_id IS NULL OR _identity_id = '')
     AND (_person_name IS NULL OR _person_name = '') THEN
    RETURN v_results;
  END IF;

  -- Search Warish
  FOR v_rec IN
    SELECT id, 'warish'::text as kind, applicant_name, deceased_name, village, status, memo_no, created_at, contact_mobile, contact_email,
           data->>'applicantAadhaar' as app_aadhaar, data->>'applicantEpic' as app_epic, data->>'deceasedAadhaar' as dec_aadhaar, data->'heirs' as heirs
    FROM public.warish_certificates
    WHERE archived_at IS NULL
  LOOP
    v_score := 0;
    nested_match := false;

    -- Strong matches (root)
    IF _mobile IS NOT NULL AND _mobile <> '' AND v_rec.contact_mobile = _mobile THEN v_score := v_score + 10; END IF;
    IF _email IS NOT NULL AND _email <> '' AND lower(v_rec.contact_email) = lower(_email) THEN v_score := v_score + 10; END IF;
    IF _identity_id IS NOT NULL AND _identity_id <> '' THEN
       IF v_rec.app_aadhaar = _identity_id OR v_rec.app_epic = _identity_id OR v_rec.dec_aadhaar = _identity_id THEN v_score := v_score + 10; END IF;
    END IF;

    -- Deep Identity Search (Heirs / Subheirs)
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

    -- Weak matches (Name)
    IF _person_name IS NOT NULL AND _person_name <> '' THEN
       IF lower(v_rec.applicant_name) = lower(trim(_person_name)) OR lower(v_rec.deceased_name) = lower(trim(_person_name)) THEN v_score := v_score + 3; END IF;
       -- Deep Name Search
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
        -- Citizen view: Stripped PII
        v_results := v_results || jsonb_build_object(
          'id', v_rec.id, 'kind', v_rec.kind, 'match_strength', v_match_type,
          'applicant_name', v_rec.applicant_name, 'person_name', v_rec.deceased_name,
          'status', v_rec.status, 'created_at', v_rec.created_at
        );
      END IF;
    END IF;
  END LOOP;

  -- Search Dependent
  FOR v_rec IN
    SELECT id, 'dependent'::text as kind, applicant_name, data->>'appName' as employee_name, village, status, memo_no, created_at, contact_mobile, contact_email,
           data->>'applicantAadhaar' as app_aadhaar, data->>'applicantEpic' as app_epic, data->'dependents' as dependents
    FROM public.dependent_certificates
    WHERE archived_at IS NULL
  LOOP
    v_score := 0;
    nested_match := false;

    -- Strong matches
    IF _mobile IS NOT NULL AND _mobile <> '' AND v_rec.contact_mobile = _mobile THEN v_score := v_score + 10; END IF;
    IF _email IS NOT NULL AND _email <> '' AND lower(v_rec.contact_email) = lower(_email) THEN v_score := v_score + 10; END IF;
    IF _identity_id IS NOT NULL AND _identity_id <> '' THEN
       IF v_rec.app_aadhaar = _identity_id OR v_rec.app_epic = _identity_id THEN v_score := v_score + 10; END IF;
    END IF;

    -- Weak matches (Name)
    IF _person_name IS NOT NULL AND _person_name <> '' THEN
       IF lower(v_rec.applicant_name) = lower(trim(_person_name)) OR lower(v_rec.employee_name) = lower(trim(_person_name)) THEN v_score := v_score + 3; END IF;

       -- Deep Name Search
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
        -- Citizen view: Stripped PII
        v_results := v_results || jsonb_build_object(
          'id', v_rec.id, 'kind', v_rec.kind, 'match_strength', v_match_type,
          'applicant_name', v_rec.applicant_name, 'person_name', v_rec.employee_name,
          'status', v_rec.status, 'created_at', v_rec.created_at
        );
      END IF;
    END IF;
  END LOOP;

  -- Limit total results to prevent enumeration via broad queries
  IF jsonb_array_length(v_results) > 25 THEN
    RETURN jsonb_path_query_array(v_results, '$[0 to 24]');
  END IF;

  RETURN v_results;
END $$;
