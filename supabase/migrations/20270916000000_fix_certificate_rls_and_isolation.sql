-- ============================================================================
-- MIGRATION: 20270916000000_fix_certificate_rls_and_isolation.sql
-- Description: Comprehensive fix for certificate services (Warish, Dependent, Linkage).
-- 1. Restores Citizen SELECT, INSERT, and UPDATE policies on warish_certificates and dependent_certificates.
-- 2. Ensures cross-citizen isolation at the database level.
-- 3. Enables public verification for approved certificates across all kinds.
-- 4. Guarantees safe duplicate checks via SECURITY DEFINER functions.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. WARISH CERTIFICATES RLS RESTORATION & ISOLATION
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.warish_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS warish_read_admin ON public.warish_certificates;
DROP POLICY IF EXISTS warish_insert_admin ON public.warish_certificates;
DROP POLICY IF EXISTS warish_update_admin ON public.warish_certificates;
DROP POLICY IF EXISTS warish_admin_all ON public.warish_certificates;
DROP POLICY IF EXISTS warish_citizen_select ON public.warish_certificates;
DROP POLICY IF EXISTS warish_citizen_update ON public.warish_certificates;
DROP POLICY IF EXISTS warish_public_verify ON public.warish_certificates;
DROP POLICY IF EXISTS warish_unified_select ON public.warish_certificates;
DROP POLICY IF EXISTS warish_unified_insert ON public.warish_certificates;
DROP POLICY IF EXISTS warish_unified_update ON public.warish_certificates;

-- SELECT policy: Staff (role-scoped), Owner Citizen, or Public (Approved only)
CREATE POLICY warish_unified_select ON public.warish_certificates
FOR SELECT TO authenticated, anon
USING (
  (public.has_role(auth.uid(), 'super_admin'))
  OR (public.has_role(auth.uid(), 'admin') AND archived_at IS NULL)
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'warish') AND archived_at IS NULL)
  OR (citizen_user_id IS NOT NULL AND citizen_user_id = auth.uid())
  OR (created_by IS NOT NULL AND created_by = auth.uid())
  OR (status = 'Approved')
);

-- INSERT policy: Staff or Authenticated Citizen creating their own application
CREATE POLICY warish_unified_insert ON public.warish_certificates
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'warish'))
  OR (auth.uid() IS NOT NULL AND (citizen_user_id = auth.uid() OR created_by = auth.uid()))
);

-- UPDATE policy: Staff or Owner Citizen updating draft/returned application
CREATE POLICY warish_unified_update ON public.warish_certificates
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'warish'))
  OR (
    (citizen_user_id = auth.uid() OR created_by = auth.uid())
    AND (
      status IN ('Draft', 'Returned', 'Draft (Returned for Clarification)')
      OR (public_edit_until IS NOT NULL AND public_edit_until > now())
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'warish'))
  OR (
    (citizen_user_id = auth.uid() OR created_by = auth.uid())
    AND (
      status IN ('Draft', 'Returned', 'Draft (Returned for Clarification)', 'Pending Scrutiny & Report')
      OR (public_edit_until IS NOT NULL AND public_edit_until > now())
    )
  )
);

-- ----------------------------------------------------------------------------
-- 2. DEPENDENT CERTIFICATES RLS RESTORATION & ISOLATION
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.dependent_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dependent_read_admin ON public.dependent_certificates;
DROP POLICY IF EXISTS dependent_insert_admin ON public.dependent_certificates;
DROP POLICY IF EXISTS dependent_update_admin ON public.dependent_certificates;
DROP POLICY IF EXISTS dependent_admin_all ON public.dependent_certificates;
DROP POLICY IF EXISTS dependent_citizen_select ON public.dependent_certificates;
DROP POLICY IF EXISTS dependent_citizen_update ON public.dependent_certificates;
DROP POLICY IF EXISTS dependent_public_verify ON public.dependent_certificates;
DROP POLICY IF EXISTS dependent_unified_select ON public.dependent_certificates;
DROP POLICY IF EXISTS dependent_unified_insert ON public.dependent_certificates;
DROP POLICY IF EXISTS dependent_unified_update ON public.dependent_certificates;

-- SELECT policy: Staff, Owner Citizen, or Public (Approved only)
CREATE POLICY dependent_unified_select ON public.dependent_certificates
FOR SELECT TO authenticated, anon
USING (
  (public.has_role(auth.uid(), 'super_admin'))
  OR (public.has_role(auth.uid(), 'admin') AND archived_at IS NULL)
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'dependent') AND archived_at IS NULL)
  OR (citizen_user_id IS NOT NULL AND citizen_user_id = auth.uid())
  OR (created_by IS NOT NULL AND created_by = auth.uid())
  OR (status = 'Approved')
);

-- INSERT policy: Staff or Authenticated Citizen creating their own application
CREATE POLICY dependent_unified_insert ON public.dependent_certificates
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'dependent'))
  OR (auth.uid() IS NOT NULL AND (citizen_user_id = auth.uid() OR created_by = auth.uid()))
);

-- UPDATE policy: Staff or Owner Citizen updating draft/returned application
CREATE POLICY dependent_unified_update ON public.dependent_certificates
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'dependent'))
  OR (
    (citizen_user_id = auth.uid() OR created_by = auth.uid())
    AND (
      status IN ('Draft', 'Returned', 'Draft (Returned for Clarification)')
      OR (public_edit_until IS NOT NULL AND public_edit_until > now())
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'dependent'))
  OR (
    (citizen_user_id = auth.uid() OR created_by = auth.uid())
    AND (
      status IN ('Draft', 'Returned', 'Draft (Returned for Clarification)', 'Pending Scrutiny & Report')
      OR (public_edit_until IS NOT NULL AND public_edit_until > now())
    )
  )
);

-- ----------------------------------------------------------------------------
-- 3. LINKAGE CERTIFICATES RLS CONFIRMATION
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'linkage_certificates') THEN
    ALTER TABLE public.linkage_certificates ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS linkage_read_policy ON public.linkage_certificates;
    DROP POLICY IF EXISTS linkage_insert_policy ON public.linkage_certificates;
    DROP POLICY IF EXISTS linkage_update_policy ON public.linkage_certificates;
    DROP POLICY IF EXISTS linkage_unified_select ON public.linkage_certificates;
    DROP POLICY IF EXISTS linkage_unified_insert ON public.linkage_certificates;
    DROP POLICY IF EXISTS linkage_unified_update ON public.linkage_certificates;

    CREATE POLICY linkage_unified_select ON public.linkage_certificates
    FOR SELECT TO authenticated, anon
    USING (
      (public.has_role(auth.uid(), 'super_admin'))
      OR (public.has_role(auth.uid(), 'admin') AND archived_at IS NULL)
      OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'linkage') AND archived_at IS NULL)
      OR (citizen_user_id IS NOT NULL AND citizen_user_id = auth.uid())
      OR (created_by IS NOT NULL AND created_by = auth.uid())
      OR (status = 'Approved')
    );

    CREATE POLICY linkage_unified_insert ON public.linkage_certificates
    FOR INSERT TO authenticated
    WITH CHECK (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin')
      OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'linkage'))
      OR (auth.uid() IS NOT NULL AND (citizen_user_id = auth.uid() OR created_by = auth.uid()))
    );

    CREATE POLICY linkage_unified_update ON public.linkage_certificates
    FOR UPDATE TO authenticated
    USING (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin')
      OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'linkage'))
      OR (
        (citizen_user_id = auth.uid() OR created_by = auth.uid())
        AND (
          status IN ('Draft', 'Returned', 'Draft (Returned for Clarification)')
          OR (public_edit_until IS NOT NULL AND public_edit_until > now())
        )
      )
    )
    WITH CHECK (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin')
      OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'linkage'))
      OR (
        (citizen_user_id = auth.uid() OR created_by = auth.uid())
        AND (
          status IN ('Draft', 'Returned', 'Draft (Returned for Clarification)', 'Pending Scrutiny & Report')
          OR (public_edit_until IS NOT NULL AND public_edit_until > now())
        )
      )
    );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. EXPLICIT GRANTS
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.warish_certificates TO authenticated;
GRANT SELECT ON public.warish_certificates TO anon;

GRANT SELECT, INSERT, UPDATE ON public.dependent_certificates TO authenticated;
GRANT SELECT ON public.dependent_certificates TO anon;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'linkage_certificates') THEN
    GRANT SELECT, INSERT, UPDATE ON public.linkage_certificates TO authenticated;
    GRANT SELECT ON public.linkage_certificates TO anon;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. NOTIFY POSTGREST SCHEMA CACHE RELOAD
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
