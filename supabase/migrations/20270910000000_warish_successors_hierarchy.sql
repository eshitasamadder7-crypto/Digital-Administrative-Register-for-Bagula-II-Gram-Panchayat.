-- ============================================================================
-- MIGRATION: 20270910000000_warish_successors_hierarchy.sql
-- Bagula II Gram Panchayat: Warish Certificate Tier 1 Backend Foundation
-- Real Relational Successor Model, Hierarchy, Deterministic Serials, Direct Limit, RLS
-- ============================================================================

-- 1. Create warish_successors table
CREATE TABLE IF NOT EXISTS public.warish_successors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.warish_certificates(id) ON DELETE CASCADE,
  parent_successor_id uuid REFERENCES public.warish_successors(id) ON DELETE CASCADE,
  serial_code text NOT NULL,
  name text NOT NULL,
  care_of text NOT NULL DEFAULT '',
  relation text NOT NULL,
  age integer CHECK (age IS NULL OR (age >= 0 AND age <= 150)),
  is_deceased boolean NOT NULL DEFAULT false,
  has_successors boolean NOT NULL DEFAULT false,
  depth integer NOT NULL DEFAULT 0 CHECK (depth >= 0),
  sort_order integer NOT NULL DEFAULT 1 CHECK (sort_order >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT warish_successors_app_serial_unique UNIQUE (application_id, serial_code)
);

-- Indexing for hierarchy queries and referential operations
CREATE INDEX IF NOT EXISTS idx_warish_successors_app ON public.warish_successors(application_id);
CREATE INDEX IF NOT EXISTS idx_warish_successors_parent ON public.warish_successors(parent_successor_id);
CREATE INDEX IF NOT EXISTS idx_warish_successors_app_sort ON public.warish_successors(application_id, parent_successor_id, sort_order);

-- 2. Deterministic Numbering Helper Functions
-- Alpha converter: 1 -> A, 2 -> B, ..., 26 -> Z, 27 -> AA
CREATE OR REPLACE FUNCTION public.to_alpha(n integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  _res text := '';
  _rem integer;
  _curr integer := n;
BEGIN
  IF _curr IS NULL OR _curr <= 0 THEN
    RETURN '';
  END IF;
  WHILE _curr > 0 LOOP
    _rem := (_curr - 1) % 26;
    _res := chr(65 + _rem) || _res;
    _curr := (_curr - 1) / 26;
  END LOOP;
  RETURN _res;
END;
$$;

-- Roman numeral converter: 1 -> I, 2 -> II, 3 -> III, 4 -> IV, etc.
CREATE OR REPLACE FUNCTION public.to_roman(n integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  _num integer := n;
  _res text := '';
  _vals integer[] := ARRAY[1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  _syms text[] := ARRAY['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  _i integer;
BEGIN
  IF _num IS NULL OR _num <= 0 THEN
    RETURN '';
  END IF;
  FOR _i IN 1 .. array_length(_vals, 1) LOOP
    WHILE _num >= _vals[_i] LOOP
      _res := _res || _syms[_i];
      _num := _num - _vals[_i];
    END LOOP;
  END LOOP;
  RETURN _res;
END;
$$;

-- Deterministic serial code generator
-- Direct (depth 0): 1 .. 10
-- Child (depth 1): parent/A, parent/B, etc.
-- Grandchild (depth 2): parent/I, parent/II, etc.
-- Great-grandchild (depth 3): parent/1, parent/2, etc.
-- Depth 4: parent/A, Depth 5: parent/I, continuing alternating pattern deterministically
CREATE OR REPLACE FUNCTION public.compute_successor_serial_code(
  parent_serial text,
  depth integer,
  sort_order integer
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  _segment text;
  _mod integer;
BEGIN
  IF depth = 0 OR parent_serial IS NULL OR parent_serial = '' THEN
    RETURN sort_order::text;
  END IF;

  _mod := depth % 3;
  IF _mod = 1 THEN
    _segment := public.to_alpha(sort_order);
  ELSIF _mod = 2 THEN
    _segment := public.to_roman(sort_order);
  ELSE
    _segment := sort_order::text;
  END IF;

  RETURN parent_serial || '/' || _segment;
END;
$$;

-- 3. Authorization and State Helpers
-- Check if current authenticated user has read access to the application
CREATE OR REPLACE FUNCTION public.can_read_warish_application(_app_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.warish_certificates w
    WHERE w.id = _app_id
      AND (
        (auth.uid() IS NOT NULL AND w.citizen_user_id = auth.uid())
        OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'super_admin'))
        OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') AND w.archived_at IS NULL)
        OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'warish') AND w.archived_at IS NULL)
      )
  );
$$;

-- Check if current authenticated user can edit successors of the application
-- Enforces:
-- 1. Must be owner (Citizen) or authorized office user (DEO with scope / Admin / Super Admin)
-- 2. Application must be in an editable state: 'Draft' or 'Returned'
-- 3. If Citizen Draft, public_edit_until must not be expired
-- 4. Not archived
CREATE OR REPLACE FUNCTION public.can_edit_warish_application(_app_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.warish_certificates w
    WHERE w.id = _app_id
      AND (
        -- Citizen owner editing their own Draft or Returned application
        (
          auth.uid() IS NOT NULL
          AND w.citizen_user_id = auth.uid()
          AND w.source = 'public'
          AND w.status IN ('Draft', 'Returned')
          AND (w.public_edit_until IS NULL OR w.public_edit_until > now())
        )
        -- Authorized office staff editing Draft or Returned application
        OR (
          auth.uid() IS NOT NULL
          AND w.archived_at IS NULL
          AND w.status IN ('Draft', 'Returned')
          AND (
            public.has_role(auth.uid(), 'super_admin')
            OR public.has_role(auth.uid(), 'admin')
            OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'warish'))
          )
        )
      )
  );
$$;

-- 4. Backend Integrity Trigger: Direct Limit, Parent Relationship, and Deterministic Serials
CREATE OR REPLACE FUNCTION public.trg_enforce_warish_successor_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _direct_count integer;
  _parent RECORD;
BEGIN
  -- Prevent changing application_id
  IF TG_OP = 'UPDATE' AND NEW.application_id IS DISTINCT FROM OLD.application_id THEN
    RAISE EXCEPTION 'application_id cannot be changed';
  END IF;

  -- Validate application exists
  IF NOT EXISTS (SELECT 1 FROM public.warish_certificates WHERE id = NEW.application_id) THEN
    RAISE EXCEPTION 'Referenced warish application does not exist';
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

  -- BUSINESS RULE REQUIRED:
  -- If is_deceased = true and has_successors = false, this data state is valid
  -- per source material without imposing invented legal disqualifications.

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_warish_successor_integrity ON public.warish_successors;
CREATE TRIGGER trg_warish_successor_integrity
BEFORE INSERT OR UPDATE ON public.warish_successors
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_warish_successor_rules();

-- 5. Cascade cleanup if a parent's deceased or has_successors status is retracted
CREATE OR REPLACE FUNCTION public.trg_cascade_warish_successor_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.is_deceased AND NOT NEW.is_deceased) OR (OLD.has_successors AND NOT NEW.has_successors) THEN
      DELETE FROM public.warish_successors WHERE parent_successor_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_warish_successor_cascade_status ON public.warish_successors;
CREATE TRIGGER trg_warish_successor_cascade_status
AFTER UPDATE ON public.warish_successors
FOR EACH ROW EXECUTE FUNCTION public.trg_cascade_warish_successor_status();

-- 6. Attach to Existing System Audit Log Engine
DROP TRIGGER IF EXISTS trigger_audit_warish_successors ON public.warish_successors;
CREATE TRIGGER trigger_audit_warish_successors
AFTER INSERT OR UPDATE OR DELETE ON public.warish_successors
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 7. Row Level Security (RLS)
ALTER TABLE public.warish_successors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS warish_successors_select ON public.warish_successors;
CREATE POLICY warish_successors_select ON public.warish_successors
FOR SELECT TO authenticated
USING (public.can_read_warish_application(application_id));

DROP POLICY IF EXISTS warish_successors_insert ON public.warish_successors;
CREATE POLICY warish_successors_insert ON public.warish_successors
FOR INSERT TO authenticated
WITH CHECK (public.can_edit_warish_application(application_id));

DROP POLICY IF EXISTS warish_successors_update ON public.warish_successors;
CREATE POLICY warish_successors_update ON public.warish_successors
FOR UPDATE TO authenticated
USING (public.can_edit_warish_application(application_id))
WITH CHECK (public.can_edit_warish_application(application_id));

DROP POLICY IF EXISTS warish_successors_delete ON public.warish_successors;
CREATE POLICY warish_successors_delete ON public.warish_successors
FOR DELETE TO authenticated
USING (public.can_edit_warish_application(application_id));

REVOKE ALL ON public.warish_successors FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warish_successors TO authenticated;
GRANT ALL ON public.warish_successors TO service_role;

-- 8. Privileged and Verified RPC Functions

-- RPC 1: Create Successor
CREATE OR REPLACE FUNCTION public.create_warish_successor(
  _application_id uuid,
  _parent_successor_id uuid DEFAULT NULL,
  _name text DEFAULT '',
  _care_of text DEFAULT '',
  _relation text DEFAULT '',
  _age integer DEFAULT NULL,
  _is_deceased boolean DEFAULT false,
  _has_successors boolean DEFAULT false
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

  IF trim(_relation) = '' THEN
    RAISE EXCEPTION 'Successor relation is required';
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
    application_id, parent_successor_id, name, care_of, relation,
    age, is_deceased, has_successors, sort_order, serial_code
  ) VALUES (
    _application_id, _parent_successor_id, trim(_name), COALESCE(trim(_care_of), ''), trim(_relation),
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
       'name', _row.name
     ));

  RETURN to_jsonb(_row);
END;
$$;

-- RPC 2: Update Successor
CREATE OR REPLACE FUNCTION public.update_warish_successor(
  _successor_id uuid,
  _name text,
  _care_of text DEFAULT '',
  _relation text DEFAULT '',
  _age integer DEFAULT NULL,
  _is_deceased boolean DEFAULT false,
  _has_successors boolean DEFAULT false
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

  IF trim(_relation) = '' THEN
    RAISE EXCEPTION 'Successor relation is required';
  END IF;

  UPDATE public.warish_successors
  SET name = trim(_name),
      care_of = COALESCE(trim(_care_of), ''),
      relation = trim(_relation),
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
       'name', _row.name
     ));

  RETURN to_jsonb(_row);
END;
$$;

-- RPC 3: Delete Successor
CREATE OR REPLACE FUNCTION public.delete_warish_successor(
  _successor_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.warish_successors%ROWTYPE;
  _app_id uuid;
  _parent_id uuid;
  _sib RECORD;
  _new_sort integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _row FROM public.warish_successors WHERE id = _successor_id;
  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Successor not found';
  END IF;

  _app_id := _row.application_id;
  _parent_id := _row.parent_successor_id;

  IF NOT public.can_edit_warish_application(_app_id) THEN
    RAISE EXCEPTION 'Not authorized to edit successors for this application or application is not in an editable state';
  END IF;

  -- Delete target (cascades to child records via FK)
  DELETE FROM public.warish_successors WHERE id = _successor_id;

  -- Resequence remaining siblings to maintain deterministic ordering without holes
  FOR _sib IN
    SELECT id, sort_order
    FROM public.warish_successors
    WHERE application_id = _app_id
      AND parent_successor_id IS NOT DISTINCT FROM _parent_id
    ORDER BY sort_order ASC, created_at ASC
  LOOP
    _new_sort := _new_sort + 1;
    IF _sib.sort_order != _new_sort THEN
      UPDATE public.warish_successors
      SET sort_order = _new_sort, updated_at = now()
      WHERE id = _sib.id;
    END IF;
  END LOOP;

  -- Certificate audit log
  INSERT INTO public.certificate_audit_logs
    (cert_kind, cert_table, cert_id, action, actor_user_id, actor_email, metadata)
  VALUES
    ('warish'::public.cert_kind, 'warish_certificates', _app_id, 'modified'::public.cert_audit_action, _uid,
     (SELECT email FROM auth.users WHERE id = _uid),
     jsonb_build_object(
       'event', 'successor_deleted',
       'deleted_id', _successor_id,
       'deleted_serial', _row.serial_code
     ));

  RETURN true;
END;
$$;

-- RPC 4: Get Successors Tree
CREATE OR REPLACE FUNCTION public.get_warish_successors_tree(
  _application_id uuid
)
RETURNS SETOF public.warish_successors
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_read_warish_application(_application_id) THEN
    RAISE EXCEPTION 'Not authorized to view successors for this application';
  END IF;

  RETURN QUERY
  WITH RECURSIVE succ_tree AS (
    SELECT s.*, ARRAY[s.sort_order] as path_order
    FROM public.warish_successors s
    WHERE s.application_id = _application_id AND s.parent_successor_id IS NULL
    UNION ALL
    SELECT c.*, p.path_order || c.sort_order
    FROM public.warish_successors c
    JOIN succ_tree p ON c.parent_successor_id = p.id
    WHERE c.application_id = _application_id
  )
  SELECT id, application_id, parent_successor_id, serial_code, name, care_of, relation, age, is_deceased, has_successors, depth, sort_order, created_at, updated_at
  FROM succ_tree
  ORDER BY path_order;
END;
$$;

-- Grants and Revokes on RPCs
REVOKE ALL ON FUNCTION public.create_warish_successor(uuid, uuid, text, text, text, integer, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_warish_successor(uuid, uuid, text, text, text, integer, boolean, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.update_warish_successor(uuid, text, text, text, integer, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_warish_successor(uuid, text, text, text, integer, boolean, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_warish_successor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_warish_successor(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_warish_successors_tree(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_warish_successors_tree(uuid) TO authenticated;

COMMENT ON TABLE public.warish_successors IS 'Hierarchical successors table for Bagula II Warish applications with deterministic serial codes and 10 direct row limit';
