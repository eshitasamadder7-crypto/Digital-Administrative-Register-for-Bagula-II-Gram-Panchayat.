-- ==============================================================================
-- Migration: 20270917020000_authentication_settings_and_governance.sql
-- Description: Authoritative authentication governance schema, RLS, dependency
--              constraints, and SECURITY DEFINER RPC for Bagula II Gram Panchayat.
--              Enforces Citizen OTP-first policy and blocks invalid password recovery.
-- ==============================================================================

-- 1. Create table public.authentication_settings
CREATE TABLE IF NOT EXISTS public.authentication_settings (
  id TEXT PRIMARY KEY DEFAULT 'current',
  citizen_auth_mode TEXT NOT NULL DEFAULT 'otp_and_google',
  citizen_email_otp_enabled BOOLEAN NOT NULL DEFAULT true,
  citizen_google_enabled BOOLEAN NOT NULL DEFAULT true,
  citizen_password_enabled BOOLEAN NOT NULL DEFAULT false,
  citizen_forgot_password_enabled BOOLEAN NOT NULL DEFAULT false,
  official_password_enabled BOOLEAN NOT NULL DEFAULT true,
  official_google_enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT DEFAULT 'Authoritative authentication governance policy for Bagula II Gram Panchayat',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  CONSTRAINT chk_auth_settings_id CHECK (id = 'current'),
  CONSTRAINT chk_citizen_auth_mode CHECK (citizen_auth_mode IN ('otp', 'google', 'otp_and_google', 'password')),
  CONSTRAINT chk_citizen_forgot_password_dependency CHECK (
    (citizen_password_enabled = TRUE) OR (citizen_forgot_password_enabled = FALSE)
  ),
  CONSTRAINT chk_citizen_auth_method_available CHECK (
    (citizen_email_otp_enabled = TRUE) OR (citizen_google_enabled = TRUE) OR (citizen_password_enabled = TRUE)
  )
);

-- 2. Row Level Security
ALTER TABLE public.authentication_settings ENABLE ROW LEVEL SECURITY;

-- 3. Read policy: Public & Authenticated Read Access
DROP POLICY IF EXISTS "authentication_settings_read_all" ON public.authentication_settings;
CREATE POLICY "authentication_settings_read_all"
ON public.authentication_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. Mutation policy: Super Admin Only
DROP POLICY IF EXISTS "authentication_settings_super_admin_write" ON public.authentication_settings;
CREATE POLICY "authentication_settings_super_admin_write"
ON public.authentication_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  )
  OR (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND lower(email) IN ('bagula2nogp111@gmail.com', 'nitish374482@gmail.com')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  )
  OR (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND lower(email) IN ('bagula2nogp111@gmail.com', 'nitish374482@gmail.com')
    )
  )
);

-- 5. Grants
GRANT SELECT ON public.authentication_settings TO anon, authenticated;
GRANT ALL ON public.authentication_settings TO authenticated, service_role;

-- 6. Seed initial row (safe default: Citizen OTP & Google enabled, Citizen Password & Forgot Password DISABLED)
INSERT INTO public.authentication_settings (
  id,
  citizen_auth_mode,
  citizen_email_otp_enabled,
  citizen_google_enabled,
  citizen_password_enabled,
  citizen_forgot_password_enabled,
  official_password_enabled,
  official_google_enabled,
  updated_at,
  updated_by
) VALUES (
  'current',
  'otp_and_google',
  true,
  true,
  false,
  false,
  true,
  true,
  now(),
  'system_bootstrap'
)
ON CONFLICT (id) DO UPDATE SET
  citizen_password_enabled = false,
  citizen_forgot_password_enabled = false,
  updated_at = now();

-- 7. Sync to public.business_rules table
INSERT INTO public.business_rules (
  rule_key,
  rule_value,
  description,
  updated_at
) VALUES (
  'authentication_settings',
  jsonb_build_object(
    'citizen_auth_mode', 'otp_and_google',
    'citizen_email_otp_enabled', true,
    'citizen_google_enabled', true,
    'citizen_password_enabled', false,
    'citizen_forgot_password_enabled', false,
    'official_password_enabled', true,
    'official_google_enabled', true
  ),
  'Authoritative authentication governance policy for Bagula II Gram Panchayat',
  now()
)
ON CONFLICT (rule_key) DO UPDATE SET
  rule_value = EXCLUDED.rule_value,
  updated_at = now();

-- 8. SECURITY DEFINER RPC save_authentication_settings
CREATE OR REPLACE FUNCTION public.save_authentication_settings(
  _settings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid UUID := auth.uid();
  _email TEXT;
  _row public.authentication_settings%ROWTYPE;
  _citizen_mode TEXT;
  _citizen_otp BOOLEAN;
  _citizen_google BOOLEAN;
  _citizen_pass BOOLEAN;
  _citizen_forgot BOOLEAN;
  _official_pass BOOLEAN;
  _official_google BOOLEAN;
BEGIN
  -- 1. Must be authenticated
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: You must be signed in to modify authentication policy.';
  END IF;

  -- 2. Must be Super Admin
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _uid
        AND role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = _uid
        AND lower(email) IN ('bagula2nogp111@gmail.com', 'nitish374482@gmail.com')
    )
  ) THEN
    RAISE EXCEPTION 'Permission Denied: Only authorized Super Admins can configure authentication policy.';
  END IF;

  -- 3. Parse and extract values
  _citizen_mode := COALESCE(_settings->>'citizen_auth_mode', 'otp_and_google');
  _citizen_otp := COALESCE((_settings->>'citizen_email_otp_enabled')::boolean, true);
  _citizen_google := COALESCE((_settings->>'citizen_google_enabled')::boolean, true);
  _citizen_pass := COALESCE((_settings->>'citizen_password_enabled')::boolean, false);
  _citizen_forgot := COALESCE((_settings->>'citizen_forgot_password_enabled')::boolean, false);
  _official_pass := COALESCE((_settings->>'official_password_enabled')::boolean, true);
  _official_google := COALESCE((_settings->>'official_google_enabled')::boolean, true);

  -- 4. CRITICAL DEPENDENCY ENFORCEMENT
  IF _citizen_pass IS FALSE AND _citizen_forgot IS TRUE THEN
    RAISE EXCEPTION 'Invalid configuration: Citizen forgot password cannot be enabled when Citizen password authentication is disabled.';
  END IF;

  IF _citizen_otp IS FALSE AND _citizen_google IS FALSE AND _citizen_pass IS FALSE THEN
    RAISE EXCEPTION 'Invalid configuration: At least one Citizen authentication method must remain enabled.';
  END IF;

  SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;

  -- 5. Upsert to public.authentication_settings
  INSERT INTO public.authentication_settings (
    id,
    citizen_auth_mode,
    citizen_email_otp_enabled,
    citizen_google_enabled,
    citizen_password_enabled,
    citizen_forgot_password_enabled,
    official_password_enabled,
    official_google_enabled,
    updated_at,
    updated_by
  ) VALUES (
    'current',
    _citizen_mode,
    _citizen_otp,
    _citizen_google,
    _citizen_pass,
    _citizen_forgot,
    _official_pass,
    _official_google,
    now(),
    COALESCE(_email, 'super_admin')
  )
  ON CONFLICT (id) DO UPDATE SET
    citizen_auth_mode = EXCLUDED.citizen_auth_mode,
    citizen_email_otp_enabled = EXCLUDED.citizen_email_otp_enabled,
    citizen_google_enabled = EXCLUDED.citizen_google_enabled,
    citizen_password_enabled = EXCLUDED.citizen_password_enabled,
    citizen_forgot_password_enabled = EXCLUDED.citizen_forgot_password_enabled,
    official_password_enabled = EXCLUDED.official_password_enabled,
    official_google_enabled = EXCLUDED.official_google_enabled,
    updated_at = now(),
    updated_by = COALESCE(_email, 'super_admin')
  RETURNING * INTO _row;

  -- 6. Mirror to business_rules table
  INSERT INTO public.business_rules (
    rule_key,
    rule_value,
    description,
    updated_at
  ) VALUES (
    'authentication_settings',
    to_jsonb(_row),
    'Authoritative authentication governance policy for Bagula II Gram Panchayat',
    now()
  )
  ON CONFLICT (rule_key) DO UPDATE SET
    rule_value = EXCLUDED.rule_value,
    updated_at = now();

  -- 7. Audit log
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
    'authentication_settings.update',
    'authentication_settings',
    'current',
    jsonb_build_object(
      'citizen_auth_mode', _citizen_mode,
      'citizen_email_otp_enabled', _citizen_otp,
      'citizen_google_enabled', _citizen_google,
      'citizen_password_enabled', _citizen_pass,
      'citizen_forgot_password_enabled', _citizen_forgot,
      'official_password_enabled', _official_pass,
      'official_google_enabled', _official_google
    )
  );

  RETURN to_jsonb(_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_authentication_settings(JSONB) TO authenticated, service_role;
