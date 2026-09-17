-- Migration: 20270914020000_fix_generate_verification_id_permissions.sql
-- Description: Fix permission denied for function generate_verification_id for DEO, Public, and all authenticated roles

-- 1. Ensure public.generate_verification_id exists, has SECURITY DEFINER, and generates compliant verification IDs
CREATE OR REPLACE FUNCTION public.generate_verification_id(_kind text, _year int)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _n int;
  _clean_kind text;
  _clean_year int;
BEGIN
  _clean_kind := UPPER(COALESCE(NULLIF(TRIM(_kind), ''), 'CERT'));
  _clean_year := COALESCE(_year, EXTRACT(YEAR FROM CURRENT_DATE)::int);
  _n := floor(random() * 90000 + 10000)::int;
  RETURN _clean_kind || '-' || _clean_year::text || '-' || lpad(_n::text, 5, '0');
END;
$$;

-- 2. Explicitly grant EXECUTE permissions to authenticated, anon, public, and service_role
GRANT EXECUTE ON FUNCTION public.generate_verification_id(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_verification_id(text, int) TO anon;
GRANT EXECUTE ON FUNCTION public.generate_verification_id(text, int) TO public;
GRANT EXECUTE ON FUNCTION public.generate_verification_id(text, int) TO service_role;

-- Support overload with integer type alias if referenced as integer in callers
GRANT EXECUTE ON FUNCTION public.generate_verification_id(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_verification_id(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.generate_verification_id(text, integer) TO public;
GRANT EXECUTE ON FUNCTION public.generate_verification_id(text, integer) TO service_role;

-- 3. Also grant and synchronize on app_private if the schema exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'app_private') THEN
    CREATE OR REPLACE FUNCTION app_private.generate_verification_id(_kind text, _year int)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $fn$
    BEGIN
      RETURN public.generate_verification_id(_kind, _year);
    END;
    $fn$;

    GRANT EXECUTE ON FUNCTION app_private.generate_verification_id(text, int) TO authenticated;
    GRANT EXECUTE ON FUNCTION app_private.generate_verification_id(text, int) TO anon;
    GRANT EXECUTE ON FUNCTION app_private.generate_verification_id(text, int) TO public;
    GRANT EXECUTE ON FUNCTION app_private.generate_verification_id(text, int) TO service_role;
  END IF;
END $$;
