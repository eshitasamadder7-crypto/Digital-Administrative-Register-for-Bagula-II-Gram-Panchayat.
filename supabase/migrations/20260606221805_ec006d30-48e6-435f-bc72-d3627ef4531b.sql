CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO service_role;

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "users view own roles" ON public.user_roles;

CREATE POLICY "admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "users view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins delete dependent" ON public.dependent_certificates;
DROP POLICY IF EXISTS "admins insert dependent" ON public.dependent_certificates;
DROP POLICY IF EXISTS "admins read dependent" ON public.dependent_certificates;
DROP POLICY IF EXISTS "admins update dependent" ON public.dependent_certificates;

CREATE POLICY "admins delete dependent"
ON public.dependent_certificates
FOR DELETE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins insert dependent"
ON public.dependent_certificates
FOR INSERT
TO authenticated
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role) AND auth.uid() = created_by);

CREATE POLICY "admins read dependent"
ON public.dependent_certificates
FOR SELECT
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins update dependent"
ON public.dependent_certificates
FOR UPDATE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins delete warish" ON public.warish_certificates;
DROP POLICY IF EXISTS "admins insert warish" ON public.warish_certificates;
DROP POLICY IF EXISTS "admins read warish" ON public.warish_certificates;
DROP POLICY IF EXISTS "admins update warish" ON public.warish_certificates;

CREATE POLICY "admins delete warish"
ON public.warish_certificates
FOR DELETE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins insert warish"
ON public.warish_certificates
FOR INSERT
TO authenticated
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role) AND auth.uid() = created_by);

CREATE POLICY "admins read warish"
ON public.warish_certificates
FOR SELECT
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins update warish"
ON public.warish_certificates
FOR UPDATE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins delete entries" ON public.whats_new_entries;
DROP POLICY IF EXISTS "admins insert entries" ON public.whats_new_entries;
DROP POLICY IF EXISTS "admins read all entries" ON public.whats_new_entries;
DROP POLICY IF EXISTS "admins update entries" ON public.whats_new_entries;

CREATE POLICY "admins delete entries"
ON public.whats_new_entries
FOR DELETE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins insert entries"
ON public.whats_new_entries
FOR INSERT
TO authenticated
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins read all entries"
ON public.whats_new_entries
FOR SELECT
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins update entries"
ON public.whats_new_entries
FOR UPDATE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

DROP FUNCTION IF EXISTS public.is_allowed_admin_email(text);
DROP FUNCTION IF EXISTS public.ensure_admin_role_for_allowed_email();