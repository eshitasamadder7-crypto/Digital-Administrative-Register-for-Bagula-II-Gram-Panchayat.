-- ============================================================================
-- MIGRATION: 20270910000001_warish_master_data_dropdowns.sql
-- Bagula II Gram Panchayat: Warish Application Mandatory Master-Data Dropdowns
-- Enforce controlled dropdowns for Village, Post Office, and Relation
-- Backend trigger validation and referential integrity enforcement
-- ============================================================================

-- 1. Ensure master_relations has RLS enabled with read policies
ALTER TABLE public.master_relations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "master_relations_read_all" ON public.master_relations;
  CREATE POLICY "master_relations_read_all" ON public.master_relations FOR SELECT TO anon, authenticated USING (true);

  DROP POLICY IF EXISTS "master_relations_super_admin_write" ON public.master_relations;
  CREATE POLICY "master_relations_super_admin_write" ON public.master_relations
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.master_relations TO anon, authenticated;
GRANT ALL ON public.master_relations TO service_role;

-- 2. Seed authoritative master_relations
INSERT INTO public.master_relations (relation_name, is_active) VALUES
  ('Son', true),
  ('Daughter', true),
  ('Wife', true),
  ('Husband', true),
  ('Father', true),
  ('Mother', true),
  ('Brother', true),
  ('Sister', true),
  ('Grandson', true),
  ('Granddaughter', true),
  ('Great-Grandson', true),
  ('Great-Granddaughter', true),
  ('Great-Great-Grandson', true),
  ('Great-Great-Granddaughter', true),
  ('Daughter-in-law', true),
  ('Nephew', true),
  ('Niece', true),
  ('Other Legal Heir', true)
ON CONFLICT (relation_name) DO UPDATE
  SET is_active = true, updated_at = now();

-- Also ensure public.master_data has matching category = 'relation'
INSERT INTO public.master_data (category, code, label, label_bn, sort_order, is_active) VALUES
  ('relation', 'son', 'Son', 'পুত্র', 1, true),
  ('relation', 'daughter', 'Daughter', 'কন্যা', 2, true),
  ('relation', 'wife', 'Wife', 'স্ত্রী', 3, true),
  ('relation', 'husband', 'Husband', 'স্বামী', 4, true),
  ('relation', 'father', 'Father', 'পিতা', 5, true),
  ('relation', 'mother', 'Mother', 'মাতা', 6, true),
  ('relation', 'brother', 'Brother', 'ভাই / ভ্রাতা', 7, true),
  ('relation', 'sister', 'Sister', 'বোন / ভগিনী', 8, true),
  ('relation', 'grandson', 'Grandson', 'পৌত্র (নাতি)', 9, true),
  ('relation', 'granddaughter', 'Granddaughter', 'পৌত্রী (নাতনি)', 10, true),
  ('relation', 'great_grandson', 'Great-Grandson', 'প্রপৌত্র', 11, true),
  ('relation', 'great_granddaughter', 'Great-Granddaughter', 'প্রপৌত্রী', 12, true),
  ('relation', 'great_great_grandson', 'Great-Great-Grandson', 'প্র-প্রপৌত্র', 13, true),
  ('relation', 'great_great_granddaughter', 'Great-Great-Granddaughter', 'প্র-প্রপৌত্রী', 14, true),
  ('relation', 'daughter_in_law', 'Daughter-in-law', 'পুত্রবধূ', 15, true),
  ('relation', 'nephew', 'Nephew', 'ভাগ্নে / ভাইপো', 16, true),
  ('relation', 'niece', 'Niece', 'ভাগ্নী / ভাইঝি', 17, true),
  ('relation', 'other_legal_heir', 'Other Legal Heir', 'অন্যান্য ওয়ারিশ', 18, true)
ON CONFLICT (category, code) DO UPDATE
  SET label = EXCLUDED.label, label_bn = EXCLUDED.label_bn, sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();

-- 3. Add relation_id column to public.warish_successors
ALTER TABLE public.warish_successors
  ADD COLUMN IF NOT EXISTS relation_id uuid REFERENCES public.master_relations(id);

CREATE INDEX IF NOT EXISTS idx_warish_successors_relation_id ON public.warish_successors(relation_id);

-- Backfill relation_id for existing rows based on relation name matching
UPDATE public.warish_successors ws
SET relation_id = mr.id
FROM public.master_relations mr
WHERE ws.relation_id IS NULL
  AND LOWER(ws.relation) = LOWER(mr.relation_name);

-- 4. Update trg_enforce_warish_successor_rules trigger function to strictly validate relation & relation_id
CREATE OR REPLACE FUNCTION public.trg_enforce_warish_successor_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _direct_count integer;
  _parent RECORD;
  _matched_rel_id uuid;
  _matched_rel_name text;
BEGIN
  -- Immutable checks
  IF TG_OP = 'UPDATE' AND NEW.application_id IS DISTINCT FROM OLD.application_id THEN
    RAISE EXCEPTION 'application_id cannot be changed';
  END IF;

  -- Validate application exists
  IF NOT EXISTS (SELECT 1 FROM public.warish_certificates WHERE id = NEW.application_id) THEN
    RAISE EXCEPTION 'Referenced warish application does not exist';
  END IF;

  -- RELATION VALIDATION & RESOLUTION
  IF NEW.relation_id IS NOT NULL THEN
    SELECT id, relation_name INTO _matched_rel_id, _matched_rel_name
    FROM public.master_relations
    WHERE id = NEW.relation_id AND is_active = true;

    IF _matched_rel_id IS NULL THEN
      RAISE EXCEPTION 'Invalid relation_id: Relation does not exist or is inactive in master data';
    END IF;

    -- Ensure relation text stays aligned with authoritative relation_name
    NEW.relation := _matched_rel_name;
  ELSE
    -- Resolve by relation name
    IF NEW.relation IS NULL OR trim(NEW.relation) = '' THEN
      RAISE EXCEPTION 'Successor relation is required and must be selected from master data';
    END IF;

    SELECT id, relation_name INTO _matched_rel_id, _matched_rel_name
    FROM public.master_relations
    WHERE LOWER(relation_name) = LOWER(trim(NEW.relation)) AND is_active = true;

    IF _matched_rel_id IS NULL THEN
      RAISE EXCEPTION 'Invalid relation: "%" is not a recognized active relation in Bagula II master data', NEW.relation;
    END IF;

    NEW.relation_id := _matched_rel_id;
    NEW.relation := _matched_rel_name;
  END IF;

  IF NEW.parent_successor_id IS NULL THEN
    -- Direct successor
    NEW.depth := 0;

    -- Enforce maximum 10 direct successors
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.parent_successor_id IS NOT NULL) THEN
      SELECT count(*) INTO _direct_count
      FROM public.warish_successors
      WHERE application_id = NEW.application_id
        AND parent_successor_id IS NULL
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

      IF _direct_count >= 10 THEN
        RAISE EXCEPTION 'Maximum 10 direct successors allowed per application (official schedule limit)';
      END IF;
    END IF;

    -- Derive serial code deterministically server-side
    NEW.serial_code := NEW.sort_order::text;
  ELSE
    -- Child successor
    SELECT id, application_id, serial_code, depth, is_deceased, has_successors
    INTO _parent
    FROM public.warish_successors
    WHERE id = NEW.parent_successor_id;

    IF _parent.id IS NULL THEN
      RAISE EXCEPTION 'Parent successor does not exist';
    END IF;

    IF _parent.application_id != NEW.application_id THEN
      RAISE EXCEPTION 'Parent successor belongs to a different application';
    END IF;

    -- Deceased check: Parent must be deceased and marked as having legal successors
    IF NOT _parent.is_deceased THEN
      RAISE EXCEPTION 'Cannot add child successors to a living successor';
    END IF;

    IF NOT _parent.has_successors THEN
      RAISE EXCEPTION 'Parent successor is not marked as having legal successors';
    END IF;

    NEW.depth := _parent.depth + 1;
    NEW.serial_code := public.compute_successor_serial_code(_parent.serial_code, NEW.depth, NEW.sort_order);
  END IF;

  -- Validation: Living successor cannot be marked as having deceased sub-successors registered
  IF NOT NEW.is_deceased AND NEW.has_successors THEN
    RAISE EXCEPTION 'A living successor cannot have legal sub-successors registered';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 5. Update RPC functions to accept and persist _relation_id
CREATE OR REPLACE FUNCTION public.create_warish_successor(
  _application_id uuid,
  _parent_successor_id uuid DEFAULT NULL,
  _name text DEFAULT '',
  _care_of text DEFAULT '',
  _relation text DEFAULT '',
  _age integer DEFAULT NULL,
  _is_deceased boolean DEFAULT false,
  _has_successors boolean DEFAULT false,
  _relation_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.warish_successors%ROWTYPE;
  _sort_order integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_edit_warish_application(_application_id) THEN
    RAISE EXCEPTION 'Not authorized to edit successors for this application or application is not in an editable state';
  END IF;

  IF trim(_name) = '' THEN
    RAISE EXCEPTION 'Successor name is required';
  END IF;

  IF trim(_relation) = '' AND _relation_id IS NULL THEN
    RAISE EXCEPTION 'Successor relation is required from master data';
  END IF;

  IF _parent_successor_id IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO _sort_order
    FROM public.warish_successors
    WHERE application_id = _application_id AND parent_successor_id IS NULL;

    IF _sort_order > 10 THEN
      RAISE EXCEPTION 'Maximum 10 direct successors allowed per application (official schedule limit)';
    END IF;
  ELSE
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO _sort_order
    FROM public.warish_successors
    WHERE application_id = _application_id AND parent_successor_id = _parent_successor_id;
  END IF;

  INSERT INTO public.warish_successors (
    application_id, parent_successor_id, name, care_of, relation, relation_id,
    age, is_deceased, has_successors, sort_order, serial_code
  ) VALUES (
    _application_id, _parent_successor_id, trim(_name), COALESCE(trim(_care_of), ''), trim(_relation), _relation_id,
    _age, COALESCE(_is_deceased, false), COALESCE(_has_successors, false), _sort_order, 'PENDING'
  ) RETURNING * INTO _row;

  -- Certificate audit log
  INSERT INTO public.certificate_audit_logs
    (cert_kind, cert_table, cert_id, action, actor_user_id, actor_email, metadata)
  VALUES
    ('warish'::public.cert_kind, 'warish_certificates', _application_id, 'modified'::public.cert_audit_action, _uid,
     (SELECT email FROM auth.users WHERE id = _uid),
     jsonb_build_object(
       'event', 'successor_created',
       'successor_id', _row.id,
       'serial_code', _row.serial_code,
       'name', _row.name,
       'relation', _row.relation,
       'relation_id', _row.relation_id
     ));

  RETURN to_jsonb(_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_warish_successor(
  _successor_id uuid,
  _name text,
  _care_of text DEFAULT '',
  _relation text DEFAULT '',
  _age integer DEFAULT NULL,
  _is_deceased boolean DEFAULT false,
  _has_successors boolean DEFAULT false,
  _relation_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.warish_successors%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _row FROM public.warish_successors WHERE id = _successor_id;
  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Successor not found';
  END IF;

  IF NOT public.can_edit_warish_application(_row.application_id) THEN
    RAISE EXCEPTION 'Not authorized to edit successors for this application or application is not in an editable state';
  END IF;

  IF trim(_name) = '' THEN
    RAISE EXCEPTION 'Successor name is required';
  END IF;

  IF trim(_relation) = '' AND _relation_id IS NULL THEN
    RAISE EXCEPTION 'Successor relation is required from master data';
  END IF;

  UPDATE public.warish_successors
  SET name = trim(_name),
      care_of = COALESCE(trim(_care_of), ''),
      relation = CASE WHEN trim(_relation) != '' THEN trim(_relation) ELSE relation END,
      relation_id = COALESCE(_relation_id, relation_id),
      age = _age,
      is_deceased = COALESCE(_is_deceased, false),
      has_successors = COALESCE(_has_successors, false),
      updated_at = now()
  WHERE id = _successor_id
  RETURNING * INTO _row;

  -- Certificate audit log
  INSERT INTO public.certificate_audit_logs
    (cert_kind, cert_table, cert_id, action, actor_user_id, actor_email, metadata)
  VALUES
    ('warish'::public.cert_kind, 'warish_certificates', _row.application_id, 'modified'::public.cert_audit_action, _uid,
     (SELECT email FROM auth.users WHERE id = _uid),
     jsonb_build_object(
       'event', 'successor_updated',
       'successor_id', _row.id,
       'serial_code', _row.serial_code,
       'name', _row.name,
       'relation', _row.relation,
       'relation_id', _row.relation_id
     ));

  RETURN to_jsonb(_row);
END;
$$;

-- 6. Comprehensive Geography & Relation Validation Trigger for Warish Certificates
CREATE OR REPLACE FUNCTION public.tg_validate_certificate_geography()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_village text;
  v_post_office text;
  v_village_id text;
  v_post_office_id text;
  v_applicant_rel text;
  v_applicant_rel_id text;
  v_valid_geo boolean := false;
  v_valid_rel boolean := false;
BEGIN
  -- Extract values from JSONB payload
  v_village := NEW.data->>'village';
  v_post_office := NEW.data->>'postOffice';
  v_village_id := NEW.data->>'village_id';
  v_post_office_id := NEW.data->>'post_office_id';
  v_applicant_rel := NEW.data->>'applicantRelation';
  v_applicant_rel_id := NEW.data->>'applicant_relation_id';

  -- If neither village nor post office are present or changed during an update, allow (historical drafts)
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.data->>'village' IS NOT DISTINCT FROM v_village)
       AND (OLD.data->>'postOffice' IS NOT DISTINCT FROM v_post_office)
       AND (OLD.data->>'village_id' IS NOT DISTINCT FROM v_village_id)
       AND (OLD.data->>'post_office_id' IS NOT DISTINCT FROM v_post_office_id)
       AND (OLD.data->>'applicantRelation' IS NOT DISTINCT FROM v_applicant_rel) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- "Other" is a manual override allowed for external applicants
  IF v_village = 'Other' OR v_post_office = 'Other' THEN
    RETURN NEW;
  END IF;

  -- 1. Strict Geography Validation (Village + Post Office)
  IF (v_village IS NOT NULL AND v_village != '') OR (v_village_id IS NOT NULL AND v_village_id != '') THEN
    IF (v_post_office IS NULL OR v_post_office = '') AND (v_post_office_id IS NULL OR v_post_office_id = '') THEN
      RAISE EXCEPTION 'Post Office must be selected from the valid post offices for Village "%"', COALESCE(v_village, v_village_id);
    END IF;

    -- Validate by IDs if present
    IF v_village_id IS NOT NULL AND v_village_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       AND v_post_office_id IS NOT NULL AND v_post_office_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.master_village_post_offices vpo
        JOIN public.master_villages v ON v.id = vpo.village_id
        JOIN public.master_post_offices po ON po.id = vpo.post_office_id
        WHERE v.id = v_village_id::uuid
          AND po.id = v_post_office_id::uuid
          AND v.is_active = true
          AND po.is_active = true
          AND vpo.is_active = true
      ) INTO v_valid_geo;
    ELSE
      -- Validate by authoritative names
      SELECT EXISTS (
        SELECT 1
        FROM public.master_village_post_offices vpo
        JOIN public.master_villages v ON v.id = vpo.village_id
        JOIN public.master_post_offices po ON po.id = vpo.post_office_id
        WHERE LOWER(v.name) = LOWER(v_village)
          AND LOWER(po.name) = LOWER(v_post_office)
          AND v.is_active = true
          AND po.is_active = true
          AND vpo.is_active = true
      ) INTO v_valid_geo;
    END IF;

    IF NOT v_valid_geo THEN
      RAISE EXCEPTION 'Invalid Geography Relationship: Post Office "%" does not belong to Village "%" in Bagula II GP master data',
        COALESCE(v_post_office, v_post_office_id), COALESCE(v_village, v_village_id);
    END IF;
  END IF;

  -- 2. Strict Applicant Relation Validation (if specified)
  IF (v_applicant_rel IS NOT NULL AND v_applicant_rel != '') OR (v_applicant_rel_id IS NOT NULL AND v_applicant_rel_id != '') THEN
    IF v_applicant_rel_id IS NOT NULL AND v_applicant_rel_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.master_relations
        WHERE id = v_applicant_rel_id::uuid AND is_active = true
      ) INTO v_valid_rel;
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM public.master_relations
        WHERE LOWER(relation_name) = LOWER(trim(v_applicant_rel)) AND is_active = true
      ) INTO v_valid_rel;
    END IF;

    IF NOT v_valid_rel THEN
      RAISE EXCEPTION 'Invalid Applicant Relation: "%" is not a recognized active relation in Bagula II GP master data',
        COALESCE(v_applicant_rel, v_applicant_rel_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_warish_geography ON public.warish_certificates;
CREATE TRIGGER trg_validate_warish_geography
  BEFORE INSERT OR UPDATE ON public.warish_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_validate_certificate_geography();

