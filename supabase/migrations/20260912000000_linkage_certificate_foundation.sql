-- ============================================================================
-- MIGRATION: 20260912000000_linkage_certificate_foundation.sql
-- Linkage Certificate — Part 1 of 4: DEO-First Backend Foundation for Election Enrolment
-- Authoritative schema, repeatable electoral records, fail-closed DEO service scope,
-- audit integration and document engine binding.
-- ============================================================================

-- 1. Extend cert_kind enum to include 'linkage'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.cert_kind'::regtype
      AND enumlabel = 'linkage'
  ) THEN
    ALTER TYPE public.cert_kind ADD VALUE 'linkage';
  END IF;
END $$;

-- 2. Create primary linkage_certificates table
CREATE TABLE IF NOT EXISTS public.linkage_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Registration & Memo issuance metadata
  memo_no text,
  memo_serial integer,
  memo_year integer,
  cert_date date,
  verification_id text,
  certificate_number text,
  valid_from date,
  valid_until date,
  
  -- Section A: Applicant core identity & residence
  applicant_name text NOT NULL,
  relationship_type text NOT NULL DEFAULT 'w/o', -- 'w/o', 'd/o', 's/o'
  guardian_name text NOT NULL DEFAULT '',        -- Parent/Spouse reference
  village text,
  village_id uuid REFERENCES public.master_villages(id) ON DELETE SET NULL,
  post_office text,
  post_office_id uuid REFERENCES public.master_post_offices(id) ON DELETE SET NULL,
  police_station text NOT NULL DEFAULT 'Hanskhali',
  block text NOT NULL DEFAULT 'Hanskhali',
  district text NOT NULL DEFAULT 'Nadia',
  pin text NOT NULL DEFAULT '741502',
  
  -- Section B: Applicant Electoral Information
  assembly_constituency text NOT NULL DEFAULT '91 - Ranaghat Uttar Purba (SC)',
  voter_status text NOT NULL DEFAULT 'unregistered', -- 'registered' | 'unregistered'
  applicant_part_no text,
  applicant_serial_no text,
  applicant_epic_no text,
  
  -- Section D: Marriage / Spouse Information
  spouse_name text,
  spouse_relation_wording text,
  spouse_parent_info text,
  spouse_village text,
  spouse_post_office text,
  spouse_police_station text NOT NULL DEFAULT 'Hanskhali',
  spouse_panchayat text NOT NULL DEFAULT 'Bagula II',
  spouse_block text NOT NULL DEFAULT 'Hanskhali',
  
  -- Section E: Election-Enrolment Purpose
  purpose text NOT NULL DEFAULT 'Election enrolment as a beneficiary voter of the Assembly Constituency',
  target_assembly_constituency text NOT NULL DEFAULT '91 - Ranaghat Uttar Purba (SC)',

  -- Operational & State Machine columns
  status text NOT NULL DEFAULT 'Draft',
  verification_status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'deo', -- 'deo' | 'public' | 'admin'
  document_mode text NOT NULL DEFAULT 'DOCUMENT_ENGINE',
  return_count integer NOT NULL DEFAULT 0,
  rejection_reason text,
  rejected_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  
  -- Dynamic Draft snapshot & config
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  config_snapshot jsonb,
  
  -- Ownership and Contacts
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  citizen_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_mobile text,
  contact_email text,
  public_edit_until timestamptz,
  
  -- Archival
  archived_at timestamptz,
  archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archive_reason text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexing for lookup, queue filtering, and DEO performance
CREATE INDEX IF NOT EXISTS idx_linkage_status ON public.linkage_certificates(status);
CREATE INDEX IF NOT EXISTS idx_linkage_created_by ON public.linkage_certificates(created_by);
CREATE INDEX IF NOT EXISTS idx_linkage_citizen_uid ON public.linkage_certificates(citizen_user_id);
CREATE INDEX IF NOT EXISTS idx_linkage_verification_id ON public.linkage_certificates(verification_id);
CREATE INDEX IF NOT EXISTS idx_linkage_created_at ON public.linkage_certificates(created_at DESC);

-- 3. Create Section C: Repeatable Father / Mother / Ancestor Electoral Records
CREATE TABLE IF NOT EXISTS public.linkage_parent_electoral_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.linkage_certificates(id) ON DELETE CASCADE,
  name text NOT NULL,
  relation text NOT NULL, -- 'Father', 'Mother', 'Grandfather', 'Father-in-law', etc.
  part_no text,
  serial_no text,
  epic_no text,
  electoral_roll_year text, -- e.g. 'Draft Electoral Roll 2025' or 'Draft Electoral Roll 2029' (from document)
  assembly_constituency text NOT NULL DEFAULT '91 - Ranaghat Uttar Purba (SC)',
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_linkage_parent_app_id ON public.linkage_parent_electoral_records(application_id);
CREATE INDEX IF NOT EXISTS idx_linkage_parent_sort ON public.linkage_parent_electoral_records(application_id, sort_order);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.linkage_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkage_parent_electoral_records ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies for linkage_certificates

-- SELECT policy:
-- Super Admin: Full read
-- Admin: Read all unarchived
-- DEO: Read ONLY if DEO has 'linkage' in service_scope AND owns the application (or all applications if office policy permits)
-- Citizen: Read ONLY their own (currently public creation is disabled)
CREATE POLICY linkage_read_policy ON public.linkage_certificates
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'admin') AND archived_at IS NULL)
  OR (
    public.has_role(auth.uid(), 'deo')
    AND public.has_service_scope(auth.uid(), 'linkage')
    AND archived_at IS NULL
    AND (created_by = auth.uid() OR created_by IS NULL)
  )
  OR (
    citizen_user_id IS NOT NULL
    AND citizen_user_id = auth.uid()
  )
);

-- INSERT policy:
-- Only Super Admin, Admin, or DEO with 'linkage' service scope
CREATE POLICY linkage_insert_policy ON public.linkage_certificates
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'deo')
    AND public.has_service_scope(auth.uid(), 'linkage')
    AND (created_by = auth.uid() OR created_by IS NULL)
  )
);

-- UPDATE policy:
-- Super Admin: Can update any
-- Admin: Can review / approve / return unarchived
-- DEO: Can only update their own unarchived draft/returned applications if they have 'linkage' service scope
CREATE POLICY linkage_update_policy ON public.linkage_certificates
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'admin') AND archived_at IS NULL)
  OR (
    public.has_role(auth.uid(), 'deo')
    AND public.has_service_scope(auth.uid(), 'linkage')
    AND archived_at IS NULL
    AND created_by = auth.uid()
    AND status IN ('Draft', 'Returned')
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'admin') AND archived_at IS NULL)
  OR (
    public.has_role(auth.uid(), 'deo')
    AND public.has_service_scope(auth.uid(), 'linkage')
    AND archived_at IS NULL
    AND created_by = auth.uid()
    AND status IN ('Draft', 'Returned', 'Pending Signature & Memo Registration')
  )
);

-- 6. RLS Policies for linkage_parent_electoral_records (inherits from parent)
CREATE POLICY linkage_parent_read_policy ON public.linkage_parent_electoral_records
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.linkage_certificates c
    WHERE c.id = application_id
  )
);

CREATE POLICY linkage_parent_insert_policy ON public.linkage_parent_electoral_records
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.linkage_certificates c
    WHERE c.id = application_id
      AND (
        public.has_role(auth.uid(), 'super_admin')
        OR public.has_role(auth.uid(), 'admin')
        OR (
          public.has_role(auth.uid(), 'deo')
          AND public.has_service_scope(auth.uid(), 'linkage')
          AND c.created_by = auth.uid()
        )
      )
  )
);

CREATE POLICY linkage_parent_update_policy ON public.linkage_parent_electoral_records
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.linkage_certificates c
    WHERE c.id = application_id
      AND (
        public.has_role(auth.uid(), 'super_admin')
        OR public.has_role(auth.uid(), 'admin')
        OR (
          public.has_role(auth.uid(), 'deo')
          AND public.has_service_scope(auth.uid(), 'linkage')
          AND c.created_by = auth.uid()
        )
      )
  )
);

CREATE POLICY linkage_parent_delete_policy ON public.linkage_parent_electoral_records
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.linkage_certificates c
    WHERE c.id = application_id
      AND (
        public.has_role(auth.uid(), 'super_admin')
        OR public.has_role(auth.uid(), 'admin')
        OR (
          public.has_role(auth.uid(), 'deo')
          AND public.has_service_scope(auth.uid(), 'linkage')
          AND c.created_by = auth.uid()
        )
      )
  )
);

-- 7. Secure DEO Application Submission Function (supporting warish, dependent, and linkage)
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
  IF NOT has_role(_uid, 'deo') AND NOT has_role(_uid, 'super_admin') THEN
    RAISE EXCEPTION 'Only an authorized DEO can submit applications';
  END IF;

  -- Verify DEO has explicit service scope for this kind
  IF has_role(_uid, 'deo') AND NOT (public.has_service_scope(_uid, _kind::text) OR public.has_service_scope(_uid, 'all')) THEN
    RAISE EXCEPTION 'DEO authorization failure: Missing service scope for %', _kind;
  END IF;

  IF _kind = 'warish' THEN
    SELECT status, created_by, return_count, document_mode INTO _st,_owner,_rc,_doc_mode FROM public.warish_certificates WHERE id=_cert_id;
    _table := 'warish_certificates';
  ELSIF _kind = 'dependent' THEN
    SELECT status, created_by, return_count, document_mode INTO _st,_owner,_rc,_doc_mode FROM public.dependent_certificates WHERE id=_cert_id;
    _table := 'dependent_certificates';
  ELSIF _kind = 'linkage' THEN
    SELECT status, created_by, return_count, document_mode INTO _st,_owner,_rc,_doc_mode FROM public.linkage_certificates WHERE id=_cert_id;
    _table := 'linkage_certificates';
  ELSE
    RAISE EXCEPTION 'Unsupported kind: %', _kind;
  END IF;

  IF _owner IS NULL OR (_owner <> _uid AND NOT has_role(_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'You can only submit your own applications';
  END IF;

  IF _st NOT IN ('Draft', 'Returned') THEN
    RAISE EXCEPTION 'Only drafts or returned applications can be submitted';
  END IF;

  _resub := (_st = 'Returned');

  -- If using DOCUMENT_ENGINE, enforce PRE_SUBMISSION rules and take snapshot
  IF _doc_mode = 'DOCUMENT_ENGINE' THEN
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
  ELSIF _kind = 'dependent' THEN
    UPDATE public.dependent_certificates SET status='Pending Signature & Memo Registration',
      submitted_at=now(), rejection_reason=NULL, rejected_at=NULL, rejected_by=NULL,
      verification_status='pending', updated_at=now(),
      data = CASE WHEN _doc_mode = 'DOCUMENT_ENGINE' THEN jsonb_set(data, '{document_snapshot}', _snapshot) ELSE data END
      WHERE id=_cert_id;
  ELSIF _kind = 'linkage' THEN
    UPDATE public.linkage_certificates SET status='Pending Signature & Memo Registration',
      submitted_at=now(), rejection_reason=NULL, rejected_at=NULL, rejected_by=NULL,
      verification_status='pending', updated_at=now(),
      data = CASE WHEN _doc_mode = 'DOCUMENT_ENGINE' THEN jsonb_set(data, '{document_snapshot}', _snapshot) ELSE data END
      WHERE id=_cert_id;
  END IF;

  -- Audit log
  INSERT INTO public.certificate_audit_logs (cert_kind, cert_table, cert_id, action, actor_user_id, actor_email, metadata)
  VALUES (_kind, _table, _cert_id, 'modified', _uid, (SELECT email FROM auth.users WHERE id=_uid),
          jsonb_build_object('event', CASE WHEN _resub THEN 'resubmitted' ELSE 'submitted' END, 'return_count', _rc));

  RETURN jsonb_build_object('status','Pending Signature & Memo Registration','resubmitted',_resub);
END; $$;
GRANT EXECUTE ON FUNCTION public.submit_application(cert_kind, uuid) TO authenticated, service_role;

-- 8. Register master document requirements for Linkage Certificate
INSERT INTO public.master_document_requirements (
  cert_kind,
  document_type_id,
  requirement_stage,
  is_mandatory,
  max_files,
  allowed_extensions,
  is_active
)
SELECT 
  'linkage'::public.cert_kind,
  id,
  'PRE_SUBMISSION',
  true,
  2,
  ARRAY['pdf', 'jpg', 'jpeg', 'png'],
  true
FROM public.master_document_types
WHERE type_name IN ('Aadhaar Card', 'Voter Card / EPIC')
ON CONFLICT DO NOTHING;
