-- ==============================================================================
-- Migration: 20270916010000_secure_business_rules_and_master_data_rpc.sql
-- Description: Implement secure backend-authoritative persistence for business_rules
--              and Master Data. Fix RLS violations, add atomic audit logging,
--              and provide SECURITY DEFINER RPCs for administrative configuration.
-- ==============================================================================

-- 1. Ensure public.business_rules exists and has RLS enabled
CREATE TABLE IF NOT EXISTS public.business_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key VARCHAR(100) NOT NULL UNIQUE,
  rule_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.business_rules ENABLE ROW LEVEL SECURITY;

-- 2. Drop any legacy or conflicting policies on business_rules
DROP POLICY IF EXISTS "business_rules_read_all" ON public.business_rules;
DROP POLICY IF EXISTS "business_rules_admin_write" ON public.business_rules;
DROP POLICY IF EXISTS "business_rules_super_admin_all" ON public.business_rules;
DROP POLICY IF EXISTS "business_rules_super_admin_write" ON public.business_rules;
DROP POLICY IF EXISTS "allow_all_read" ON public.business_rules;

-- 3. Policy: Public & Authenticated Read Access
-- All portal users (citizens submitting forms, DEOs verifying, admins managing)
-- must be able to read active workflow rules, quotas, and validation criteria.
CREATE POLICY "business_rules_read_all"
ON public.business_rules
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. Policy: Narrow Administrative Write Access
-- Only authorized Super Admins or Admins can INSERT, UPDATE, or DELETE business rules.
-- Citizens and ordinary DEOs are strictly blocked by RLS.
CREATE POLICY "business_rules_admin_write"
ON public.business_rules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
  )
);

GRANT SELECT ON public.business_rules TO anon, authenticated;
GRANT ALL ON public.business_rules TO authenticated, service_role;

-- 5. RPC: save_business_rule (Backend-Authoritative, SECURITY DEFINER)
-- Atomically validates role, validates inputs, upserts the rule, writes audit log.
CREATE OR REPLACE FUNCTION public.save_business_rule(
  _rule_key TEXT,
  _rule_value JSONB,
  _description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid UUID := auth.uid();
  _email TEXT;
  _row public.business_rules%ROWTYPE;
  _cleaned_key TEXT;
BEGIN
  -- 1. Derive auth.uid() and fail closed if unauthenticated
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: You must be logged in to modify system business rules.';
  END IF;

  -- 2. Verify Super Admin or Admin authorization server-side
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _uid
        AND role IN ('super_admin', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Permission Denied: Only authorized Super Admins or Admins can modify system configuration.';
  END IF;

  -- 3. Validate arguments
  _cleaned_key := lower(trim(_rule_key));
  IF _cleaned_key IS NULL OR length(_cleaned_key) < 2 THEN
    RAISE EXCEPTION 'Invalid rule_key: Must be a non-empty string.';
  END IF;

  IF _rule_value IS NULL OR jsonb_typeof(_rule_value) != 'object' THEN
    RAISE EXCEPTION 'Invalid rule_value: Must be a valid JSON object.';
  END IF;

  -- Derive actor email
  SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;

  -- 4. INSERT or UPDATE business_rules atomically
  INSERT INTO public.business_rules (
    rule_key,
    rule_value,
    description,
    updated_at
  ) VALUES (
    _cleaned_key,
    _rule_value,
    COALESCE(_description, 'System configuration rule: ' || _cleaned_key),
    NOW()
  )
  ON CONFLICT (rule_key) DO UPDATE SET
    rule_value = EXCLUDED.rule_value,
    description = COALESCE(EXCLUDED.description, public.business_rules.description),
    updated_at = NOW()
  RETURNING * INTO _row;

  -- 5. Write audit record atomically
  INSERT INTO public.activity_logs (
    actor_user_id,
    actor_email,
    action_type,
    target_table,
    target_id,
    metadata
  ) VALUES (
    _uid,
    _email,
    'business_rules.update',
    'business_rules',
    _cleaned_key,
    jsonb_build_object(
      'rule_key', _cleaned_key,
      'description', _row.description,
      'updated_at', _row.updated_at
    )
  );

  -- 6. Return safe JSON response
  RETURN jsonb_build_object(
    'success', true,
    'id', _row.id,
    'rule_key', _row.rule_key,
    'updated_at', _row.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_business_rule(TEXT, JSONB, TEXT) TO authenticated, service_role;

-- 6. RPC: get_business_rule
CREATE OR REPLACE FUNCTION public.get_business_rule(_rule_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _row public.business_rules%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM public.business_rules
  WHERE rule_key = lower(trim(_rule_key))
  LIMIT 1;

  IF _row.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', _row.id,
    'rule_key', _row.rule_key,
    'rule_value', _row.rule_value,
    'description', _row.description,
    'updated_at', _row.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_rule(TEXT) TO anon, authenticated, service_role;

-- 7. Secure Master Data Write Access for other administrative registries
-- Ensure master_data table allows both super_admin and admin
DROP POLICY IF EXISTS "master_data_super_admin_write" ON public.master_data;
DROP POLICY IF EXISTS "master_data_admin_write" ON public.master_data;

CREATE POLICY "master_data_admin_write"
ON public.master_data
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
  )
);

-- RPC for master_data items
CREATE OR REPLACE FUNCTION public.save_master_data_item(
  _category TEXT,
  _code TEXT,
  _label TEXT,
  _label_bn TEXT DEFAULT NULL,
  _parent_code TEXT DEFAULT NULL,
  _sort_order INT DEFAULT 0,
  _is_active BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid UUID := auth.uid();
  _email TEXT;
  _row public.master_data%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _uid
        AND role IN ('super_admin', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Permission Denied: Only authorized Super Admins or Admins can modify master data.';
  END IF;

  SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;

  INSERT INTO public.master_data (
    category,
    code,
    label,
    label_bn,
    parent_code,
    sort_order,
    is_active,
    updated_at
  ) VALUES (
    _category,
    _code,
    _label,
    _label_bn,
    _parent_code,
    _sort_order,
    _is_active,
    NOW()
  )
  ON CONFLICT (category, code) DO UPDATE SET
    label = EXCLUDED.label,
    label_bn = EXCLUDED.label_bn,
    parent_code = EXCLUDED.parent_code,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
  RETURNING * INTO _row;

  INSERT INTO public.activity_logs (
    actor_user_id,
    actor_email,
    action_type,
    target_table,
    target_id,
    metadata
  ) VALUES (
    _uid,
    _email,
    'master_data.save',
    'master_data',
    _category || ':' || _code,
    jsonb_build_object('label', _label, 'is_active', _is_active)
  );

  RETURN jsonb_build_object('success', true, 'id', _row.id, 'category', _row.category, 'code', _row.code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_master_data_item(TEXT, TEXT, TEXT, TEXT, TEXT, INT, BOOLEAN) TO authenticated, service_role;
