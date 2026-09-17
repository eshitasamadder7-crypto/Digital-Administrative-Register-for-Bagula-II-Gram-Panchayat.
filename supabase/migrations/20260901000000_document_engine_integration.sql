-- Phase 2 Milestone 2: Document Engine Integration

-- 1. Create requirement stage enum
DO $$ BEGIN CREATE TYPE public.document_requirement_stage AS ENUM ('PRE_SUBMISSION', 'PRE_APPROVAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Ensure application tables have document_mode
ALTER TABLE public.warish_certificates ADD COLUMN IF NOT EXISTS document_mode VARCHAR NOT NULL DEFAULT 'LEGACY';
ALTER TABLE public.dependent_certificates ADD COLUMN IF NOT EXISTS document_mode VARCHAR NOT NULL DEFAULT 'LEGACY';

-- Update existing drafts to 'LEGACY' explicitly just in case
UPDATE public.warish_certificates SET document_mode = 'LEGACY' WHERE document_mode IS NULL;
UPDATE public.dependent_certificates SET document_mode = 'LEGACY' WHERE document_mode IS NULL;

-- 3. Create triggers to enforce DOCUMENT_ENGINE on new records
CREATE OR REPLACE FUNCTION public.enforce_new_application_document_mode()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Force any newly inserted application to use the new engine, blocking client tampering.
  NEW.document_mode := 'DOCUMENT_ENGINE';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_warish_doc_mode ON public.warish_certificates;
CREATE TRIGGER trg_enforce_warish_doc_mode
  BEFORE INSERT ON public.warish_certificates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_new_application_document_mode();

DROP TRIGGER IF EXISTS trg_enforce_dependent_doc_mode ON public.dependent_certificates;
CREATE TRIGGER trg_enforce_dependent_doc_mode
  BEFORE INSERT ON public.dependent_certificates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_new_application_document_mode();

-- 4. Create Master Document Requirements table
CREATE TABLE IF NOT EXISTS public.master_document_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cert_kind public.cert_kind NOT NULL,
    document_type_id UUID REFERENCES public.master_document_types(id) ON DELETE CASCADE,
    requirement_stage public.document_requirement_stage NOT NULL,
    is_mandatory BOOLEAN DEFAULT true,
    max_files INT DEFAULT 1,
    allowed_extensions TEXT[] DEFAULT '{.pdf,.jpg,.jpeg,.png}',
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cert_kind, document_type_id, requirement_stage)
);
GRANT SELECT ON public.master_document_requirements TO authenticated;
GRANT ALL ON public.master_document_requirements TO service_role;

-- 5. Extend documents_engine table
ALTER TABLE public.documents_engine
  ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES public.master_document_requirements(id),
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_docs_engine_app ON public.documents_engine(application_id);
CREATE INDEX IF NOT EXISTS idx_docs_engine_owner ON public.documents_engine(owner_id);
CREATE INDEX IF NOT EXISTS idx_docs_engine_req ON public.documents_engine(requirement_id);
CREATE INDEX IF NOT EXISTS idx_docs_engine_type ON public.documents_engine(document_type_id);
CREATE INDEX IF NOT EXISTS idx_docs_engine_active ON public.documents_engine(is_active);
CREATE INDEX IF NOT EXISTS idx_master_docs_req_kind ON public.master_document_requirements(cert_kind);


-- 6. Storage Policies: Revoke citizens' ability to freely update/delete files via Storage API
DROP POLICY IF EXISTS citizen_docs_self_update ON storage.objects;
DROP POLICY IF EXISTS citizen_docs_self_delete ON storage.objects;

-- We don't drop citizen_docs_self_insert or citizen_docs_self_select, as they still need to upload objects.
-- However, once uploaded, they can only link/delete via our secure backend RPCs.

-- 7. Document Management RPCs

-- 7a. link_document_to_application
CREATE OR REPLACE FUNCTION public.link_document_to_application(
  _kind public.cert_kind,
  _app_id uuid,
  _req_id uuid,
  _storage_path text,
  _file_size_bytes bigint,
  _mime_type text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _st text;
  _owner uuid;
  _doc_type_id uuid;
  _active_req boolean;
  _max_files int;
  _current_files int;
  _allowed_exts text[];
  _file_ext text;
  _valid_ext boolean;
  _new_doc_id uuid;
  _obj_owner uuid;
  _doc_mode text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- 1. Check Application Ownership and State
  IF _kind = 'warish' THEN
    SELECT status, created_by, document_mode INTO _st, _owner, _doc_mode FROM public.warish_certificates WHERE id = _app_id FOR UPDATE;
  ELSIF _kind = 'dependent' THEN
    SELECT status, created_by, document_mode INTO _st, _owner, _doc_mode FROM public.dependent_certificates WHERE id = _app_id FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Unsupported certificate kind';
  END IF;

  IF _owner IS NULL OR _owner <> _uid THEN RAISE EXCEPTION 'Application not found or access denied'; END IF;
  IF _doc_mode <> 'DOCUMENT_ENGINE' THEN RAISE EXCEPTION 'Application is not using the new document engine'; END IF;
  IF _st NOT IN ('Draft', 'Returned') THEN RAISE EXCEPTION 'Documents can only be linked when application is in Draft or Returned state'; END IF;

  -- 2. Validate Requirement
  SELECT document_type_id, is_active, max_files, allowed_extensions
  INTO _doc_type_id, _active_req, _max_files, _allowed_exts
  FROM public.master_document_requirements
  WHERE id = _req_id AND cert_kind = _kind;

  IF _doc_type_id IS NULL THEN RAISE EXCEPTION 'Invalid requirement ID'; END IF;
  IF NOT _active_req THEN RAISE EXCEPTION 'Document requirement is inactive'; END IF;

  -- 3. Enforce Max Files (concurrent safe because of FOR UPDATE lock on application)
  SELECT COUNT(*) INTO _current_files FROM public.documents_engine
  WHERE application_id = _app_id AND requirement_id = _req_id AND is_active = true;

  IF _current_files >= _max_files THEN RAISE EXCEPTION 'Maximum files reached for this requirement'; END IF;

  -- 4. Validate File Extension (basic string check against path)
  _file_ext := lower(substring(_storage_path from '\.[^.]+$'));
  SELECT _file_ext = ANY(_allowed_exts) INTO _valid_ext;
  IF NOT _valid_ext THEN RAISE EXCEPTION 'File extension % is not allowed', _file_ext; END IF;

  -- 5. Validate Physical Storage Object & Ownership
  -- Must strictly belong to the user's namespace in citizen-documents
  SELECT owner INTO _obj_owner FROM storage.objects
  WHERE bucket_id = 'citizen-documents'
    AND name = _storage_path
    AND owner = _uid
    AND (storage.foldername(name))[1] = _uid::text;

  IF _obj_owner IS NULL THEN RAISE EXCEPTION 'Storage object does not exist or access denied'; END IF;

  -- 6. Insert Document Record
  INSERT INTO public.documents_engine (
    document_type_id, owner_id, application_id, file_path,
    requirement_id, uploaded_by, file_size_bytes, mime_type,
    is_active, verification_status
  ) VALUES (
    _doc_type_id, _uid, _app_id, _storage_path,
    _req_id, _uid, _file_size_bytes, _mime_type,
    true, 'pending'
  ) RETURNING id INTO _new_doc_id;

  RETURN _new_doc_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.link_document_to_application TO authenticated;


-- 7b. replace_application_document
CREATE OR REPLACE FUNCTION public.replace_application_document(
  _kind public.cert_kind,
  _app_id uuid,
  _old_doc_id uuid,
  _new_storage_path text,
  _new_file_size bigint,
  _new_mime text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _st text;
  _owner uuid;
  _req_id uuid;
  _old_is_active boolean;
  _new_doc_id uuid;
  _doc_mode text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF _kind = 'warish' THEN
    SELECT status, created_by, document_mode INTO _st, _owner, _doc_mode FROM public.warish_certificates WHERE id = _app_id FOR UPDATE;
  ELSIF _kind = 'dependent' THEN
    SELECT status, created_by, document_mode INTO _st, _owner, _doc_mode FROM public.dependent_certificates WHERE id = _app_id FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Unsupported certificate kind';
  END IF;

  IF _owner IS NULL OR _owner <> _uid THEN RAISE EXCEPTION 'Application not found or access denied'; END IF;
  IF _doc_mode <> 'DOCUMENT_ENGINE' THEN RAISE EXCEPTION 'Application is not using the new document engine'; END IF;
  IF _st NOT IN ('Draft', 'Returned') THEN RAISE EXCEPTION 'Documents can only be replaced when application is in Draft or Returned state'; END IF;

  -- Find the old document
  SELECT requirement_id, is_active INTO _req_id, _old_is_active
  FROM public.documents_engine
  WHERE id = _old_doc_id AND application_id = _app_id AND owner_id = _uid;

  IF _req_id IS NULL THEN RAISE EXCEPTION 'Old document not found'; END IF;
  IF NOT _old_is_active THEN RAISE EXCEPTION 'Old document is already inactive'; END IF;

  -- Deactivate old document
  UPDATE public.documents_engine SET is_active = false, updated_at = NOW() WHERE id = _old_doc_id;

  -- Link new document (the link function will handle max files, extension, and existence checks)
  _new_doc_id := public.link_document_to_application(_kind, _app_id, _req_id, _new_storage_path, _new_file_size, _new_mime);

  RETURN _new_doc_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.replace_application_document TO authenticated;


-- 7c. verify_application_document
CREATE OR REPLACE FUNCTION public.verify_application_document(
  _doc_id uuid,
  _status public.verification_status,
  _notes text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_active boolean;
  _app_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (has_role(_uid, 'admin') OR has_role(_uid, 'deo') OR has_role(_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _status NOT IN ('verified', 'rejected', 'pending') THEN
    RAISE EXCEPTION 'Invalid verification status';
  END IF;

  SELECT is_active, application_id INTO _is_active, _app_id FROM public.documents_engine WHERE id = _doc_id;
  IF _is_active IS NULL THEN RAISE EXCEPTION 'Document not found'; END IF;
  IF NOT _is_active THEN RAISE EXCEPTION 'Cannot verify an inactive document version'; END IF;

  UPDATE public.documents_engine
  SET verification_status = _status,
      updated_at = NOW()
  WHERE id = _doc_id;

END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_application_document TO authenticated;

-- 7d. delete_unlinked_document (to allow citizens to cleanup abandoned uploads from storage directly)
CREATE OR REPLACE FUNCTION public.delete_unlinked_document(
  _storage_path text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _linked_count int;
  _obj_owner uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Verify ownership
  SELECT owner INTO _obj_owner FROM storage.objects
  WHERE bucket_id = 'citizen-documents'
    AND name = _storage_path
    AND owner = _uid
    AND (storage.foldername(name))[1] = _uid::text;

  IF _obj_owner IS NULL THEN RAISE EXCEPTION 'Storage object does not exist or access denied'; END IF;

  -- Check if it is currently actively linked
  SELECT COUNT(*) INTO _linked_count FROM public.documents_engine
  WHERE file_path = _storage_path AND is_active = true;

  IF _linked_count > 0 THEN RAISE EXCEPTION 'Cannot delete a document that is actively linked to an application'; END IF;

  -- Delete from storage.objects
  DELETE FROM storage.objects
  WHERE bucket_id = 'citizen-documents' AND name = _storage_path AND owner = _uid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_unlinked_document TO authenticated;


-- 8. Workflow Transitions & Snapshotting

-- We need to drop the old functions so we can recreate them with the new logic
DROP FUNCTION IF EXISTS public.submit_application(cert_kind, uuid);
DROP FUNCTION IF EXISTS public.approve_certificate_v2(cert_kind, uuid, integer, integer, date);

-- 8a. Modified submit_application
CREATE OR REPLACE FUNCTION public.submit_application(_kind cert_kind, _cert_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _st text;
  _owner uuid;
  _rc int;
  _table text;
  _resub boolean;
  _doc_mode text;
  _snapshot jsonb;
  _missing_mandatories text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT has_role(_uid,'deo') THEN RAISE EXCEPTION 'Only a DEO can submit applications'; END IF;

  IF _kind = 'warish' THEN
    SELECT status, created_by, return_count, document_mode INTO _st,_owner,_rc,_doc_mode FROM public.warish_certificates WHERE id=_cert_id;
    _table := 'warish_certificates';
  ELSIF _kind = 'dependent' THEN
    SELECT status, created_by, return_count, document_mode INTO _st,_owner,_rc,_doc_mode FROM public.dependent_certificates WHERE id=_cert_id;
    _table := 'dependent_certificates';
  ELSE RAISE EXCEPTION 'Unsupported kind'; END IF;

  IF _owner IS NULL OR _owner <> _uid THEN RAISE EXCEPTION 'You can only submit your own applications'; END IF;
  IF _st NOT IN ('Draft','Returned') THEN RAISE EXCEPTION 'Only drafts or returned applications can be submitted'; END IF;
  _resub := (_st = 'Returned');

  -- If using DOCUMENT_ENGINE, enforce PRE_SUBMISSION rules and take snapshot
  IF _doc_mode = 'DOCUMENT_ENGINE' THEN
    -- Verify presence of active mandatory PRE_SUBMISSION documents
    SELECT string_agg(t.type_name, ', ') INTO _missing_mandatories
    FROM public.master_document_requirements r
    JOIN public.master_document_types t ON r.document_type_id = t.id
    WHERE r.cert_kind = _kind
      AND r.requirement_stage = 'PRE_SUBMISSION'
      AND r.is_active = true
      AND r.is_mandatory = true
      AND NOT EXISTS (
        SELECT 1 FROM public.documents_engine e
        WHERE e.application_id = _cert_id
          AND e.requirement_id = r.id
          AND e.is_active = true
      );

    IF _missing_mandatories IS NOT NULL THEN
      RAISE EXCEPTION 'Missing mandatory PRE_SUBMISSION documents: %', _missing_mandatories;
    END IF;

    -- Take snapshot of all active requirements for this certificate kind
    SELECT jsonb_agg(
      jsonb_build_object(
        'requirement_id', r.id,
        'document_type_id', r.document_type_id,
        'label', t.type_name,
        'stage', r.requirement_stage,
        'is_mandatory', r.is_mandatory,
        'max_files', r.max_files,
        'allowed_extensions', r.allowed_extensions
      )
    ) INTO _snapshot
    FROM public.master_document_requirements r
    JOIN public.master_document_types t ON r.document_type_id = t.id
    WHERE r.cert_kind = _kind AND r.is_active = true;

    IF _snapshot IS NULL THEN _snapshot := '[]'::jsonb; END IF;
  END IF;

  IF _kind = 'warish' THEN
    UPDATE public.warish_certificates SET status='Pending Signature & Memo Registration',
      submitted_at=now(), rejection_reason=NULL, rejected_at=NULL, rejected_by=NULL,
      verification_status='pending', updated_at=now(),
      data = CASE WHEN _doc_mode = 'DOCUMENT_ENGINE' THEN jsonb_set(data, '{document_snapshot}', _snapshot) ELSE data END
      WHERE id=_cert_id;
  ELSE
    UPDATE public.dependent_certificates SET status='Pending Signature & Memo Registration',
      submitted_at=now(), rejection_reason=NULL, rejected_at=NULL, rejected_by=NULL,
      verification_status='pending', updated_at=now(),
      data = CASE WHEN _doc_mode = 'DOCUMENT_ENGINE' THEN jsonb_set(data, '{document_snapshot}', _snapshot) ELSE data END
      WHERE id=_cert_id;
  END IF;

  INSERT INTO public.certificate_audit_logs (cert_kind, cert_table, cert_id, action, actor_user_id, actor_email, metadata)
  VALUES (_kind, _table, _cert_id, 'modified', _uid, (SELECT email FROM auth.users WHERE id=_uid),
          jsonb_build_object('event', CASE WHEN _resub THEN 'resubmitted' ELSE 'submitted' END, 'return_count', _rc));

  RETURN jsonb_build_object('status','Pending Signature & Memo Registration','resubmitted',_resub);
END; $$;
GRANT EXECUTE ON FUNCTION public.submit_application(cert_kind, uuid) TO authenticated, service_role;


-- 8b. Modified approve_certificate_v2
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
  _doc_mode text;
  _snapshot jsonb;
  _missing text;
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

  IF _kind = 'warish' THEN
    SELECT document_mode, data->'document_snapshot' INTO _doc_mode, _snapshot FROM public.warish_certificates WHERE id = _cert_id;
  ELSE
    SELECT document_mode, data->'document_snapshot' INTO _doc_mode, _snapshot FROM public.dependent_certificates WHERE id = _cert_id;
  END IF;

  -- If using DOCUMENT_ENGINE, enforce PRE_APPROVAL rules based on snapshot
  IF _doc_mode = 'DOCUMENT_ENGINE' THEN
    IF _snapshot IS NOT NULL AND jsonb_array_length(_snapshot) > 0 THEN
      -- Loop through the snapshot to check PRE_APPROVAL mandatories
      FOR _missing IN
        SELECT elem->>'label'
        FROM jsonb_array_elements(_snapshot) AS elem
        WHERE elem->>'stage' = 'PRE_APPROVAL' AND (elem->>'is_mandatory')::boolean = true
          AND NOT EXISTS (
            SELECT 1 FROM public.documents_engine e
            WHERE e.application_id = _cert_id
              AND e.requirement_id = (elem->>'requirement_id')::uuid
              AND e.is_active = true
              AND e.verification_status = 'verified'
          )
      LOOP
        RAISE EXCEPTION 'Missing or unverified mandatory PRE_APPROVAL document: %', _missing;
      END LOOP;

      -- Ensure NO active document (mandatory or optional) is rejected
      IF EXISTS (
        SELECT 1 FROM public.documents_engine e
        WHERE e.application_id = _cert_id
          AND e.is_active = true
          AND e.verification_status = 'rejected'
      ) THEN
        RAISE EXCEPTION 'Cannot approve application with rejected documents';
      END IF;
    END IF;
  END IF;

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
  EXECUTE format($f$
    SELECT verification_id FROM %I WHERE memo_no = $1 OR memo_serial = $2 AND EXTRACT(YEAR FROM issue_date) = $3
  $f$, _table) INTO _existing_vid USING _memo, _serial, _memo_year;

  IF _existing_vid IS NOT NULL THEN RAISE EXCEPTION 'Memo number already exists'; END IF;

  _vid := _kind || '-' || replace(_cert_id::text, '-', '') || '-' || extract(epoch from now())::int::text;

  EXECUTE format($f$
    UPDATE %I SET
      status='Approved',
      memo_serial=$1, memo_no=$2, issue_date=$3, verification_id=$4,
      verification_status='verified'::verification_status, updated_at=now()
    WHERE id=$5
  $f$, _table) USING _serial, _memo, _issue_date, _vid, _cert_id;

  INSERT INTO public.certificate_audit_logs (cert_kind, cert_table, cert_id, action, actor_user_id, actor_email)
  VALUES (_kind, _table, _cert_id, 'approved', _uid, (SELECT email FROM auth.users WHERE id=_uid));

  RETURN jsonb_build_object('status','Approved','memo_no',_memo,'verification_id',_vid);
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_certificate_v2(cert_kind, uuid, integer, integer, date) TO authenticated;


-- 9. Protect document_mode from UPDATE tampering
CREATE OR REPLACE FUNCTION public.prevent_document_mode_tampering()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.document_mode IS DISTINCT FROM OLD.document_mode THEN
    -- If it's a legacy record and we are upgrading it internally, that might be allowed later,
    -- but a citizen/client cannot arbitrarily flip it back to LEGACY.
    -- For total safety in this milestone, block ALL mode changes after creation.
    RAISE EXCEPTION 'Modification of document_mode is strictly prohibited';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_warish_mode_tampering ON public.warish_certificates;
CREATE TRIGGER trg_prevent_warish_mode_tampering
  BEFORE UPDATE ON public.warish_certificates
  FOR EACH ROW EXECUTE FUNCTION public.prevent_document_mode_tampering();

DROP TRIGGER IF EXISTS trg_prevent_dependent_mode_tampering ON public.dependent_certificates;
CREATE TRIGGER trg_prevent_dependent_mode_tampering
  BEFORE UPDATE ON public.dependent_certificates
  FOR EACH ROW EXECUTE FUNCTION public.prevent_document_mode_tampering();
