
-- 1. Extend certificate tables with memo serial/year + recycle bin fields
ALTER TABLE public.warish_certificates
  ADD COLUMN IF NOT EXISTS memo_serial int,
  ADD COLUMN IF NOT EXISTS memo_year int,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS restored_at timestamptz;

ALTER TABLE public.dependent_certificates
  ADD COLUMN IF NOT EXISTS memo_serial int,
  ADD COLUMN IF NOT EXISTS memo_year int,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS restored_at timestamptz;

-- Backfill memo_year from cert_date for existing approved rows
UPDATE public.warish_certificates
  SET memo_year = EXTRACT(YEAR FROM cert_date)::int
  WHERE memo_year IS NULL AND cert_date IS NOT NULL;
UPDATE public.dependent_certificates
  SET memo_year = EXTRACT(YEAR FROM cert_date)::int
  WHERE memo_year IS NULL AND cert_date IS NOT NULL;

-- Unique per (memo_serial, memo_year) — prevents duplicate memos
CREATE UNIQUE INDEX IF NOT EXISTS uq_warish_memo_serial_year
  ON public.warish_certificates (memo_serial, memo_year)
  WHERE memo_serial IS NOT NULL AND memo_year IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dependent_memo_serial_year
  ON public.dependent_certificates (memo_serial, memo_year)
  WHERE memo_serial IS NOT NULL AND memo_year IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_warish_rejected_at ON public.warish_certificates (status, rejected_at);
CREATE INDEX IF NOT EXISTS idx_dependent_rejected_at ON public.dependent_certificates (status, rejected_at);

-- 2. APPROVE v2 RPC (legacy manual + digital auto)
CREATE OR REPLACE FUNCTION app_private.approve_certificate_v2(
  _kind text,
  _cert_id uuid,
  _memo_serial int,          -- required for legacy (year <= 2026); ignored for digital
  _memo_year int,            -- required
  _issue_date date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  v_serial int;
  v_memo_no text;
  v_uid uuid := auth.uid();
  v_email text;
  v_vid text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _memo_year IS NULL OR _issue_date IS NULL THEN
    RAISE EXCEPTION 'Memo year and issue date are required';
  END IF;
  IF _kind NOT IN ('warish','dependent') THEN
    RAISE EXCEPTION 'Invalid kind';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  -- Determine serial
  IF _memo_year >= 2027 THEN
    -- Digital mode: auto-assign next serial per year+kind under advisory lock
    PERFORM pg_advisory_xact_lock(hashtext('memo_serial:'||_kind||':'||_memo_year));
    IF _kind = 'warish' THEN
      SELECT COALESCE(MAX(memo_serial),0)+1 INTO v_serial
        FROM public.warish_certificates
        WHERE memo_year = _memo_year;
    ELSE
      SELECT COALESCE(MAX(memo_serial),0)+1 INTO v_serial
        FROM public.dependent_certificates
        WHERE memo_year = _memo_year;
    END IF;
  ELSE
    -- Legacy mode: admin supplies serial
    IF _memo_serial IS NULL OR _memo_serial <= 0 THEN
      RAISE EXCEPTION 'Serial number required for legacy year';
    END IF;
    v_serial := _memo_serial;
    -- Duplicate check
    IF _kind = 'warish' THEN
      IF EXISTS (SELECT 1 FROM public.warish_certificates
                 WHERE memo_serial = v_serial AND memo_year = _memo_year AND id <> _cert_id) THEN
        RAISE EXCEPTION 'Duplicate memo number: %/BGL-II/%', v_serial, _memo_year USING ERRCODE = 'unique_violation';
      END IF;
    ELSE
      IF EXISTS (SELECT 1 FROM public.dependent_certificates
                 WHERE memo_serial = v_serial AND memo_year = _memo_year AND id <> _cert_id) THEN
        RAISE EXCEPTION 'Duplicate memo number: %/BGL-II/%', v_serial, _memo_year USING ERRCODE = 'unique_violation';
      END IF;
    END IF;
  END IF;

  v_memo_no := v_serial::text || '/BGL-II/' || _memo_year::text;

  IF _kind = 'warish' THEN
    UPDATE public.warish_certificates SET
      memo_serial = v_serial,
      memo_year = _memo_year,
      memo_no = v_memo_no,
      cert_date = _issue_date,
      issue_date = _issue_date,
      status = 'Approved',
      approved_by = v_uid,
      approval_timestamp = now(),
      rejected_by = NULL, rejected_reason = NULL, rejection_timestamp = NULL, rejected_at = NULL
    WHERE id = _cert_id
    RETURNING verification_id INTO v_vid;
  ELSE
    UPDATE public.dependent_certificates SET
      memo_serial = v_serial,
      memo_year = _memo_year,
      memo_no = v_memo_no,
      cert_date = _issue_date,
      issue_date = _issue_date,
      status = 'Approved',
      approved_by = v_uid,
      approval_timestamp = now(),
      rejected_by = NULL, rejected_reason = NULL, rejection_timestamp = NULL, rejected_at = NULL
    WHERE id = _cert_id
    RETURNING verification_id INTO v_vid;
  END IF;

  INSERT INTO public.audit_log(actor_id, actor_email, action, target_table, target_id, verification_id, metadata)
    VALUES (v_uid, v_email, 'approve', _kind||'_certificates', _cert_id, v_vid,
            jsonb_build_object('memo_no', v_memo_no, 'issue_date', _issue_date));

  RETURN jsonb_build_object('memo_no', v_memo_no, 'issue_date', _issue_date, 'verification_id', v_vid);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_certificate_v2(_kind text, _cert_id uuid, _memo_serial int, _memo_year int, _issue_date date)
RETURNS jsonb LANGUAGE sql SET search_path = public, app_private AS $$
  SELECT app_private.approve_certificate_v2(_kind, _cert_id, _memo_serial, _memo_year, _issue_date);
$$;

REVOKE ALL ON FUNCTION app_private.approve_certificate_v2(text,uuid,int,int,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_certificate_v2(text,uuid,int,int,date) TO authenticated;

-- 3. REJECT v2 (adds rejected_at)
CREATE OR REPLACE FUNCTION app_private.reject_certificate_v2(_kind text, _cert_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE v_uid uuid := auth.uid(); v_email text; v_vid text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF _kind = 'warish' THEN
    UPDATE public.warish_certificates SET
      status='Rejected', rejected_by=v_uid, rejected_reason=_reason,
      rejection_timestamp=now(), rejected_at=now()
    WHERE id=_cert_id RETURNING verification_id INTO v_vid;
  ELSIF _kind = 'dependent' THEN
    UPDATE public.dependent_certificates SET
      status='Rejected', rejected_by=v_uid, rejected_reason=_reason,
      rejection_timestamp=now(), rejected_at=now()
    WHERE id=_cert_id RETURNING verification_id INTO v_vid;
  ELSE RAISE EXCEPTION 'Invalid kind'; END IF;

  INSERT INTO public.audit_log(actor_id, actor_email, action, target_table, target_id, verification_id, metadata)
    VALUES (v_uid, v_email, 'reject', _kind||'_certificates', _cert_id, v_vid,
            jsonb_build_object('reason', _reason));
END; $$;

CREATE OR REPLACE FUNCTION public.reject_certificate_v2(_kind text, _cert_id uuid, _reason text)
RETURNS void LANGUAGE sql SET search_path = public, app_private AS $$
  SELECT app_private.reject_certificate_v2(_kind, _cert_id, _reason);
$$;
REVOKE ALL ON FUNCTION app_private.reject_certificate_v2(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_certificate_v2(text,uuid,text) TO authenticated;

-- 4. RESTORE
CREATE OR REPLACE FUNCTION app_private.restore_certificate(_kind text, _cert_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE v_uid uuid := auth.uid(); v_email text; v_vid text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF _kind = 'warish' THEN
    UPDATE public.warish_certificates SET
      status='Pending Signature & Memo Registration',
      rejected_by=NULL, rejected_reason=NULL, rejection_timestamp=NULL,
      rejected_at=NULL, restored_at=now()
    WHERE id=_cert_id AND status IN ('Rejected','Archived')
    RETURNING verification_id INTO v_vid;
  ELSIF _kind = 'dependent' THEN
    UPDATE public.dependent_certificates SET
      status='Pending Signature & Memo Registration',
      rejected_by=NULL, rejected_reason=NULL, rejection_timestamp=NULL,
      rejected_at=NULL, restored_at=now()
    WHERE id=_cert_id AND status IN ('Rejected','Archived')
    RETURNING verification_id INTO v_vid;
  ELSE RAISE EXCEPTION 'Invalid kind'; END IF;

  INSERT INTO public.audit_log(actor_id, actor_email, action, target_table, target_id, verification_id, metadata)
    VALUES (v_uid, v_email, 'restore', _kind||'_certificates', _cert_id, v_vid, '{}'::jsonb);
END; $$;
CREATE OR REPLACE FUNCTION public.restore_certificate(_kind text, _cert_id uuid)
RETURNS void LANGUAGE sql SET search_path = public, app_private AS $$
  SELECT app_private.restore_certificate(_kind, _cert_id);
$$;
REVOKE ALL ON FUNCTION app_private.restore_certificate(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_certificate(text,uuid) TO authenticated;

-- 5. PERMANENT DELETE (only rejected/archived)
CREATE OR REPLACE FUNCTION app_private.permanently_delete_rejected(_kind text, _cert_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE v_uid uuid := auth.uid(); v_email text; v_vid text; v_status text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(v_uid,'super_admin') THEN
    RAISE EXCEPTION 'Only super admins may permanently delete';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF _kind = 'warish' THEN
    SELECT status, verification_id INTO v_status, v_vid FROM public.warish_certificates WHERE id = _cert_id;
    IF v_status NOT IN ('Rejected','Archived') THEN
      RAISE EXCEPTION 'Only rejected or archived records can be permanently deleted';
    END IF;
    INSERT INTO public.audit_log(actor_id, actor_email, action, target_table, target_id, verification_id, metadata)
      VALUES (v_uid, v_email, 'permanent_delete', 'warish_certificates', _cert_id, v_vid, '{}'::jsonb);
    DELETE FROM public.warish_certificates WHERE id = _cert_id;
  ELSIF _kind = 'dependent' THEN
    SELECT status, verification_id INTO v_status, v_vid FROM public.dependent_certificates WHERE id = _cert_id;
    IF v_status NOT IN ('Rejected','Archived') THEN
      RAISE EXCEPTION 'Only rejected or archived records can be permanently deleted';
    END IF;
    INSERT INTO public.audit_log(actor_id, actor_email, action, target_table, target_id, verification_id, metadata)
      VALUES (v_uid, v_email, 'permanent_delete', 'dependent_certificates', _cert_id, v_vid, '{}'::jsonb);
    DELETE FROM public.dependent_certificates WHERE id = _cert_id;
  ELSE RAISE EXCEPTION 'Invalid kind'; END IF;
END; $$;
CREATE OR REPLACE FUNCTION public.permanently_delete_rejected(_kind text, _cert_id uuid)
RETURNS void LANGUAGE sql SET search_path = public, app_private AS $$
  SELECT app_private.permanently_delete_rejected(_kind, _cert_id);
$$;
REVOKE ALL ON FUNCTION app_private.permanently_delete_rejected(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.permanently_delete_rejected(text,uuid) TO authenticated;

-- 6. ARCHIVE EXPIRED REJECTIONS (opportunistic, called from client + cron-ready)
CREATE OR REPLACE FUNCTION app_private.archive_expired_rejections()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE n1 int; n2 int;
BEGIN
  UPDATE public.warish_certificates SET status='Archived'
    WHERE status='Rejected' AND rejected_at IS NOT NULL AND rejected_at < now() - interval '30 days';
  GET DIAGNOSTICS n1 = ROW_COUNT;
  UPDATE public.dependent_certificates SET status='Archived'
    WHERE status='Rejected' AND rejected_at IS NOT NULL AND rejected_at < now() - interval '30 days';
  GET DIAGNOSTICS n2 = ROW_COUNT;
  RETURN n1 + n2;
END; $$;
CREATE OR REPLACE FUNCTION public.archive_expired_rejections()
RETURNS int LANGUAGE sql SET search_path = public, app_private AS $$
  SELECT app_private.archive_expired_rejections();
$$;
REVOKE ALL ON FUNCTION app_private.archive_expired_rejections() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_expired_rejections() TO authenticated;

-- 7. PUBLIC ADVANCED VERIFY (memo_no + issue_date + aadhaar last 4)
CREATE OR REPLACE FUNCTION app_private.public_verify_advanced(
  _memo_no text, _issue_date date, _aadhaar_last4 text, _ip_hash text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE v_row record; v_kind text; v_count int;
BEGIN
  -- rate limit
  SELECT COUNT(*) INTO v_count FROM public.verification_lookups
    WHERE ip_hash = _ip_hash AND ts > now() - interval '10 minutes';
  IF v_count >= 10 THEN
    RETURN jsonb_build_object('status','rate_limited');
  END IF;

  SELECT 'warish' AS k, verification_id, status, memo_no, issue_date, applicant_name,
         deceased_name, rejected_reason, data
    INTO v_row
    FROM public.warish_certificates
    WHERE memo_no = _memo_no AND issue_date = _issue_date
      AND (_aadhaar_last4 IS NULL OR (data->>'applicantAadhaarLast4') = _aadhaar_last4)
    LIMIT 1;

  IF v_row IS NULL THEN
    SELECT 'dependent' AS k, verification_id, status, memo_no, issue_date, applicant_name,
           NULL::text AS deceased_name, rejected_reason, data
      INTO v_row
      FROM public.dependent_certificates
      WHERE memo_no = _memo_no AND issue_date = _issue_date
        AND (_aadhaar_last4 IS NULL OR (data->>'applicantAadhaarLast4') = _aadhaar_last4)
      LIMIT 1;
  END IF;

  INSERT INTO public.verification_lookups(ip_hash, verification_id, ts)
    VALUES (_ip_hash, COALESCE(v_row.verification_id,'ADV-'||_memo_no), now());

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;

  RETURN jsonb_build_object(
    'status','found',
    'kind', v_row.k,
    'verification_id', v_row.verification_id,
    'record_status', v_row.status,
    'memo_no', v_row.memo_no,
    'issue_date', v_row.issue_date,
    'applicant_name', v_row.applicant_name,
    'deceased_name', v_row.deceased_name,
    'rejected_reason', v_row.rejected_reason
  );
END; $$;
CREATE OR REPLACE FUNCTION public.public_verify_advanced(_memo_no text, _issue_date date, _aadhaar_last4 text, _ip_hash text)
RETURNS jsonb LANGUAGE sql SET search_path = public, app_private AS $$
  SELECT app_private.public_verify_advanced(_memo_no, _issue_date, _aadhaar_last4, _ip_hash);
$$;
REVOKE ALL ON FUNCTION app_private.public_verify_advanced(text,date,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_verify_advanced(text,date,text,text) TO anon, authenticated;
