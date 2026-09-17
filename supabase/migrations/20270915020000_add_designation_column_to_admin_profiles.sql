-- ============================================================================
-- MIGRATION: 20270915020000_add_designation_column_to_admin_profiles.sql
-- Fix: Add 'designation' column to public.admin_profiles (alongside designation_code),
-- populate values, add automatic bidirectional synchronization, and notify PostgREST
-- to refresh the schema cache.
-- ============================================================================

-- 1. Ensure designation and designation_code columns exist on admin_profiles
ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS designation_code text;

-- 2. Backfill existing values between designation and designation_code
UPDATE public.admin_profiles
SET designation = designation_code
WHERE designation IS NULL AND designation_code IS NOT NULL;

UPDATE public.admin_profiles
SET designation_code = designation
WHERE designation_code IS NULL AND designation IS NOT NULL;

-- 3. Trigger to keep designation and designation_code synchronized on write
CREATE OR REPLACE FUNCTION public.tg_sync_admin_profiles_designation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.designation IS NOT NULL AND (NEW.designation_code IS NULL OR NEW.designation_code = '') THEN
    NEW.designation_code := NEW.designation;
  ELSIF NEW.designation_code IS NOT NULL AND (NEW.designation IS NULL OR NEW.designation = '') THEN
    NEW.designation := NEW.designation_code;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.designation IS DISTINCT FROM OLD.designation THEN
      NEW.designation_code := NEW.designation;
    ELSIF NEW.designation_code IS DISTINCT FROM OLD.designation_code THEN
      NEW.designation := NEW.designation_code;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_profiles_designation ON public.admin_profiles;
CREATE TRIGGER trg_sync_admin_profiles_designation
BEFORE INSERT OR UPDATE ON public.admin_profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_admin_profiles_designation();

-- 4. Re-grant full table permissions to ensure PostgREST exposes all columns
GRANT ALL ON TABLE public.admin_profiles TO postgres, service_role, authenticated;

-- 5. Invalidate and reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
