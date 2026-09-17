
-- Implement approve_certificate_v2, reject_certificate_v2, permanently_delete_rejected, restore_certificate, archive_certificate

CREATE OR REPLACE FUNCTION public.approve_certificate_v2(
  _kind cert_kind, _cert_id uuid, _memo_serial integer, _memo_year integer, _issue_date date
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _serial int;
  _memo text;
  _vid text;
  _existing_vid text;
  _table text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (has_role(_uid,'admin') OR has_role(_uid,'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _memo_year IS NULL OR _memo_year < 2000 OR _memo_year > 2100 THEN
    RAISE EXCEPTION 'Invalid memo year';
  END IF;
  IF _issue_date IS NULL THEN RAISE EXCEPTION 'Issue date required'; END IF;

  _table := CASE _kind WHEN 'warish' THEN 'warish_certificates' WHEN 'dependent' THEN 'dependent_certificates' ELSE NULL END;
  IF _table IS NULL THEN RAISE EXCEPTION 'Unsupported kind'; END IF;

  IF _memo_serial IS NOT NULL THEN
    _serial := _memo_serial;
  ELSE
    -- auto-assign next serial for this year across both cert tables
    EXECUTE format($f$
      SELECT COALESCE(MAX(memo_serial),0)+1 FROM (
        SELECT memo_serial FROM public.warish_certificates WHERE EXTRACT(YEAR FROM issue_date)=$1
        UNION ALL
        SELECT memo_serial FROM public.dependent_certificates WHERE EXTRACT(YEAR FROM issue_date)=$1
      ) s
    $f$) INTO _serial USING _memo_year;
  END IF;

  _memo := _serial::text || '/BGL-II/' || _memo_year::text;

  -- Duplicate check
  IF EXISTS (SELECT 1 FROM public.warish_certificates WHERE memo_no=_memo AND id<>_cert_id)
     OR EXISTS (SELECT 1 FROM public.dependent_certificates WHERE memo_no=_memo AND id<>_cert_id) THEN
    RAISE EXCEPTION 'Duplicate memo number %', _memo;
  END IF;

  IF _kind='warish' THEN
    SELECT verification_id INTO _existing_vid FROM public.warish_certificates WHERE id=_cert_id;
    IF _existing_vid IS NULL THEN _vid := generate_verification_id('warish', _memo_year); ELSE _vid := _existing_vid; END IF;
    UPDATE public.warish_certificates
      SET status='Approved', memo_no=_memo, memo_serial=_serial, issue_date=_issue_date,
          verification_id=_vid, verification_status='verified',
          rejected_at=NULL, rejected_by=NULL, rejection_reason=NULL,
          updated_at=now()
      WHERE id=_cert_id;
  ELSE
    SELECT verification_id INTO _existing_vid FROM public.dependent_certificates WHERE id=_cert_id;
    IF _existing_vid IS NULL THEN _vid := generate_verification_id('dependent', _memo_year); ELSE _vid := _existing_vid; END IF;
    UPDATE public.dependent_certificates
      SET status='Approved', memo_no=_memo, memo_serial=_serial, issue_date=_issue_date,
          verification_id=_vid, verification_status='verified',
          rejected_at=NULL, rejected_by=NULL, rejection_reason=NULL,
          updated_at=now()
      WHERE id=_cert_id;
  END IF;

  INSERT INTO public.certificate_audit_logs (cert_kind, cert_table, cert_id, certificate_number, action, actor_user_id, actor_email, metadata)
  VALUES (_kind, _table, _cert_id, _memo, 'approved', _uid, (SELECT email FROM auth.users WHERE id=_uid),
          jsonb_build_object('memo_serial',_serial,'memo_year',_memo_year,'issue_date',_issue_date,'verification_id',_vid));

  RETURN jsonb_build_object('memo_no',_memo,'verification_id',_vid,'issue_date',_issue_date);
END; $$;

CREATE OR REPLACE FUNCTION public.reject_certificate_v2(_kind cert_kind, _cert_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _table text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (has_role(_uid,'admin') OR has_role(_uid,'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _kind='warish' THEN
    UPDATE public.warish_certificates
      SET status='Rejected', rejected_at=now(), rejected_by=_uid, rejection_reason=_reason,
          verification_status='rejected', updated_at=now()
      WHERE id=_cert_id;
    _table := 'warish_certificates';
  ELSIF _kind='dependent' THEN
    UPDATE public.dependent_certificates
      SET status='Rejected', rejected_at=now(), rejected_by=_uid, rejection_reason=_reason,
          verification_status='rejected', updated_at=now()
      WHERE id=_cert_id;
    _table := 'dependent_certificates';
  ELSE RAISE EXCEPTION 'Unsupported kind';
  END IF;

  INSERT INTO public.certificate_audit_logs (cert_kind, cert_table, cert_id, action, actor_user_id, actor_email, reason)
  VALUES (_kind, _table, _cert_id, 'rejected', _uid, (SELECT email FROM auth.users WHERE id=_uid), _reason);
END; $$;

CREATE OR REPLACE FUNCTION public.permanently_delete_rejected(_kind cert_kind, _cert_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _st text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (has_role(_uid,'admin') OR has_role(_uid,'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _kind='warish' THEN
    SELECT status INTO _st FROM public.warish_certificates WHERE id=_cert_id;
    IF _st IS DISTINCT FROM 'Rejected' THEN RAISE EXCEPTION 'Only rejected records can be permanently deleted'; END IF;
    DELETE FROM public.warish_certificates WHERE id=_cert_id;
  ELSIF _kind='dependent' THEN
    SELECT status INTO _st FROM public.dependent_certificates WHERE id=_cert_id;
    IF _st IS DISTINCT FROM 'Rejected' THEN RAISE EXCEPTION 'Only rejected records can be permanently deleted'; END IF;
    DELETE FROM public.dependent_certificates WHERE id=_cert_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.restore_certificate(_kind cert_kind, _cert_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (has_role(_uid,'admin') OR has_role(_uid,'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _kind='warish' THEN
    UPDATE public.warish_certificates
      SET status='Pending Signature & Memo Registration',
          rejected_at=NULL, rejected_by=NULL, rejection_reason=NULL,
          archived_at=NULL, archived_by=NULL, archive_reason=NULL,
          verification_status='pending', updated_at=now()
      WHERE id=_cert_id;
  ELSIF _kind='dependent' THEN
    UPDATE public.dependent_certificates
      SET status='Pending Signature & Memo Registration',
          rejected_at=NULL, rejected_by=NULL, rejection_reason=NULL,
          archived_at=NULL, archived_by=NULL, archive_reason=NULL,
          verification_status='pending', updated_at=now()
      WHERE id=_cert_id;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.archive_certificate(_kind cert_kind, _cert_id uuid, _reason text, _ip text DEFAULT NULL, _user_agent text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _table text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT has_role(_uid,'super_admin') THEN RAISE EXCEPTION 'Only super admins can archive'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN RAISE EXCEPTION 'Reason required'; END IF;
  IF _kind='warish' THEN
    UPDATE public.warish_certificates SET archived_at=now(), archived_by=_uid, archive_reason=_reason, updated_at=now() WHERE id=_cert_id;
    _table := 'warish_certificates';
  ELSIF _kind='dependent' THEN
    UPDATE public.dependent_certificates SET archived_at=now(), archived_by=_uid, archive_reason=_reason, updated_at=now() WHERE id=_cert_id;
    _table := 'dependent_certificates';
  END IF;
  INSERT INTO public.certificate_audit_logs (cert_kind, cert_table, cert_id, action, actor_user_id, actor_email, reason, ip_address, user_agent)
  VALUES (_kind, _table, _cert_id, 'archived', _uid, (SELECT email FROM auth.users WHERE id=_uid), _reason, _ip, _user_agent);
END; $$;
