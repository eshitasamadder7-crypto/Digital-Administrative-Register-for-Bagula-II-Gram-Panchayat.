DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;

CREATE POLICY "super admins manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "admins manage non-super roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  app_private.has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'super_admin'::app_role
)
WITH CHECK (
  app_private.has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'super_admin'::app_role
);