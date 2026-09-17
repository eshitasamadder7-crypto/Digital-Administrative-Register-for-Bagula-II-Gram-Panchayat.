-- Migration: Secure Office User Password Reset & Session Invalidation
-- 1. Add temp_password_issued_at to admin_profiles for tracking reset window
ALTER TABLE public.admin_profiles
ADD COLUMN IF NOT EXISTS temp_password_issued_at timestamptz;

-- 2. Create session revocation function for service_role
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Invalidate any active refresh tokens and sessions for this user
  DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = target_user_id);
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
EXCEPTION WHEN OTHERS THEN
  -- Fail-safe in environments where auth schema has restricted DDL
  NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_user_sessions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_user_sessions(uuid) TO service_role;

-- 3. Update cleanup_expired_invitations to protect active office users whose passwords were reset
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only delete unactivated onboarding invitations (never logged in) that expired past 3 hours
  DELETE FROM auth.users
  WHERE id IN (
    SELECT user_id FROM public.admin_profiles
    WHERE must_change_password = true
      AND last_login_at IS NULL
      AND created_at < now() - interval '3 hours'
  );
END;
$$;
