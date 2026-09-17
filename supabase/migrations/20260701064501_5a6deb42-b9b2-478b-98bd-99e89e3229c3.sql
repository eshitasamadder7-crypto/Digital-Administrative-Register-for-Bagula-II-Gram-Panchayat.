
-- Move SECURITY DEFINER helpers out of the exposed public schema so anon/authenticated
-- roles can no longer call them directly via PostgREST. Public wrappers become
-- SECURITY INVOKER pass-throughs restricted to authenticated only.

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

-- 1) has_role: move DEFINER copy into app_private, keep public wrapper as INVOKER
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'has_role'
  ) THEN
    -- Recreate private copy from the current public definition
    CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $fn$
      SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
      );
    $fn$;

    -- Replace public wrapper with SECURITY INVOKER pass-through
    CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY INVOKER
    SET search_path = public, pg_temp
    AS $fn$
      SELECT app_private.has_role(_user_id, _role);
    $fn$;
  END IF;
END $$;

-- 2) archive_certificate: same treatment (private DEFINER already exists per prior migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'archive_certificate'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.archive_certificate(public.cert_kind, uuid, text, text, text) SECURITY INVOKER';
  END IF;
END $$;

-- Lock down EXECUTE: revoke from anon everywhere; grant only what authenticated needs
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC, anon;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'archive_certificate'
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.archive_certificate(public.cert_kind, uuid, text, text, text) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.archive_certificate(public.cert_kind, uuid, text, text, text) TO authenticated';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app_private' AND p.proname = 'archive_certificate'
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION app_private.archive_certificate(public.cert_kind, uuid, text, text, text) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION app_private.archive_certificate(public.cert_kind, uuid, text, text, text) TO authenticated';
  END IF;
END $$;
