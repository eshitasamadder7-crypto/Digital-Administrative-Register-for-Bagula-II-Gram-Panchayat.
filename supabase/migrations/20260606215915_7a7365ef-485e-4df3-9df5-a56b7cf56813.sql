
-- 1) Drop auto admin-promotion trigger + function
DROP TRIGGER IF EXISTS grant_admin_to_owner ON auth.users;
DROP TRIGGER IF EXISTS grant_admin_to_owner_on_insert ON auth.users;
DROP TRIGGER IF EXISTS grant_admin_to_owner_on_update ON auth.users;
DROP FUNCTION IF EXISTS public.tg_grant_admin_to_owner() CASCADE;

-- 2) Restrict INSERT on warish_certificates to admins
DROP POLICY IF EXISTS "authenticated insert warish" ON public.warish_certificates;
CREATE POLICY "admins insert warish"
  ON public.warish_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND auth.uid() = created_by);

-- 3) Restrict INSERT on dependent_certificates to admins
DROP POLICY IF EXISTS "authenticated insert dependent" ON public.dependent_certificates;
CREATE POLICY "admins insert dependent"
  ON public.dependent_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND auth.uid() = created_by);
