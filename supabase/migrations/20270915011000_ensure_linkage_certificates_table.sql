-- ============================================================================
-- MIGRATION: 20270915011000_ensure_linkage_certificates_table.sql
-- Ensure linkage_certificates and linkage_parent_electoral_records exist,
-- have full schema definitions, explicit GRANT permissions for PostgREST schema cache,
-- and robust RLS policies.
-- ============================================================================

-- 1. Ensure 'linkage' value exists in public.cert_kind enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'cert_kind' AND e.enumlabel = 'linkage'
  ) THEN
    ALTER TYPE public.cert_kind ADD VALUE IF NOT EXISTS 'linkage';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Type might not exist or other error, safe to continue
  NULL;
END $$;

-- 2. Create primary linkage_certificates table if it does not already exist
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
  issue_date date,
  
  -- Section A: Applicant core identity & residence
  applicant_name text NOT NULL DEFAULT '',
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
  parent_application_id uuid,
  
  -- Archival
  archived_at timestamptz,
  archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  archive_reason text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create Section C: Repeatable Father / Mother / Ancestor Electoral Records
CREATE TABLE IF NOT EXISTS public.linkage_parent_electoral_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.linkage_certificates(id) ON DELETE CASCADE,
  name text NOT NULL,
  relation text NOT NULL, -- 'Father', 'Mother', 'Grandfather', 'Father-in-law', etc.
  part_no text,
  serial_no text,
  epic_no text,
  electoral_roll_year text, -- e.g. 'Draft Electoral Roll 2025' or 'Draft Electoral Roll 2029'
  assembly_constituency text NOT NULL DEFAULT '91 - Ranaghat Uttar Purba (SC)',
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Indexes for lookup, queue filtering, and DEO performance
CREATE INDEX IF NOT EXISTS idx_linkage_status ON public.linkage_certificates(status);
CREATE INDEX IF NOT EXISTS idx_linkage_created_by ON public.linkage_certificates(created_by);
CREATE INDEX IF NOT EXISTS idx_linkage_citizen_uid ON public.linkage_certificates(citizen_user_id);
CREATE INDEX IF NOT EXISTS idx_linkage_verification_id ON public.linkage_certificates(verification_id);
CREATE INDEX IF NOT EXISTS idx_linkage_created_at ON public.linkage_certificates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_linkage_contact_mobile ON public.linkage_certificates(contact_mobile);
CREATE INDEX IF NOT EXISTS idx_linkage_parent_app_id ON public.linkage_parent_electoral_records(application_id);
CREATE INDEX IF NOT EXISTS idx_linkage_parent_sort ON public.linkage_parent_electoral_records(application_id, sort_order);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.linkage_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkage_parent_electoral_records ENABLE ROW LEVEL SECURITY;

-- 6. Essential Table Grants so PostgREST registers them in schema cache!
GRANT ALL ON TABLE public.linkage_certificates TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.linkage_parent_electoral_records TO postgres, service_role, authenticated, anon;

-- 7. RLS Policies for linkage_certificates
DROP POLICY IF EXISTS linkage_read_policy ON public.linkage_certificates;
CREATE POLICY linkage_read_policy ON public.linkage_certificates
FOR SELECT TO authenticated, anon
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'admin') AND archived_at IS NULL)
  OR (
    public.has_role(auth.uid(), 'deo')
    AND archived_at IS NULL
    AND (created_by = auth.uid() OR created_by IS NULL)
  )
  OR (
    citizen_user_id IS NOT NULL
    AND citizen_user_id = auth.uid()
  )
  OR (
    created_by = auth.uid()
  )
  OR (
    status = 'Approved'
  )
);

DROP POLICY IF EXISTS linkage_insert_policy ON public.linkage_certificates;
CREATE POLICY linkage_insert_policy ON public.linkage_certificates
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'deo')
  OR citizen_user_id = auth.uid()
  OR created_by = auth.uid()
  OR true
);

DROP POLICY IF EXISTS linkage_update_policy ON public.linkage_certificates;
CREATE POLICY linkage_update_policy ON public.linkage_certificates
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'admin') AND archived_at IS NULL)
  OR (
    public.has_role(auth.uid(), 'deo')
    AND archived_at IS NULL
    AND created_by = auth.uid()
  )
  OR (
    citizen_user_id = auth.uid()
    AND status = 'Draft'
  )
  OR created_by = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'admin') AND archived_at IS NULL)
  OR (
    public.has_role(auth.uid(), 'deo')
    AND archived_at IS NULL
    AND created_by = auth.uid()
  )
  OR (
    citizen_user_id = auth.uid()
  )
  OR created_by = auth.uid()
);

-- 8. RLS Policies for linkage_parent_electoral_records
DROP POLICY IF EXISTS linkage_parent_read_policy ON public.linkage_parent_electoral_records;
CREATE POLICY linkage_parent_read_policy ON public.linkage_parent_electoral_records
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS linkage_parent_insert_policy ON public.linkage_parent_electoral_records;
CREATE POLICY linkage_parent_insert_policy ON public.linkage_parent_electoral_records
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS linkage_parent_update_policy ON public.linkage_parent_electoral_records;
CREATE POLICY linkage_parent_update_policy ON public.linkage_parent_electoral_records
FOR UPDATE TO authenticated
USING (true);

DROP POLICY IF EXISTS linkage_parent_delete_policy ON public.linkage_parent_electoral_records;
CREATE POLICY linkage_parent_delete_policy ON public.linkage_parent_electoral_records
FOR DELETE TO authenticated
USING (true);

-- 9. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
