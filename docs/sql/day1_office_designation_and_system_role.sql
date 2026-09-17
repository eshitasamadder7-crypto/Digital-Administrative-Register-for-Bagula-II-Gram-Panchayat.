-- Day 1 Office Portal refactor: separate Designation (display) from
-- System Role (permissions). Apply this file manually via psql or the
-- Supabase SQL editor — no destructive changes.
--
--   psql "$DATABASE_URL" -f docs/sql/day1_office_designation_and_system_role.sql
--
-- After applying, the legacy warish/dependent flows remain untouched;
-- new admin_profiles columns (designation, system_role, office_id) become
-- available to the Office Portal UI.

-- 1. Designation enum (display metadata, never used for permission checks)
DO $$ BEGIN
  CREATE TYPE public.office_designation AS ENUM (
    'secretary',
    'deo',
    'pradhan',
    'upa_pradhan',
    'member',
    'clerk',
    'accountant',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. System role enum (permissions in future refactors)
DO $$ BEGIN
  CREATE TYPE public.office_system_role AS ENUM (
    'office_user',
    'office_manager',
    'approving_authority',
    'read_only'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Additive columns on admin_profiles
ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS designation public.office_designation,
  ADD COLUMN IF NOT EXISTS system_role public.office_system_role,
  ADD COLUMN IF NOT EXISTS office_id text;

CREATE INDEX IF NOT EXISTS admin_profiles_system_role_idx
  ON public.admin_profiles (system_role);
CREATE INDEX IF NOT EXISTS admin_profiles_designation_idx
  ON public.admin_profiles (designation);

-- 4. Backfill from existing user_roles (non-destructive)
UPDATE public.admin_profiles p
SET system_role = 'approving_authority'
FROM public.user_roles r
WHERE r.user_id = p.user_id AND r.role = 'super_admin' AND p.system_role IS NULL;

UPDATE public.admin_profiles p
SET system_role = 'office_manager'
FROM public.user_roles r
WHERE r.user_id = p.user_id AND r.role = 'admin' AND p.system_role IS NULL;

UPDATE public.admin_profiles p
SET system_role = 'office_user',
    designation = COALESCE(p.designation, 'deo')
FROM public.user_roles r
WHERE r.user_id = p.user_id AND r.role = 'deo' AND p.system_role IS NULL;
